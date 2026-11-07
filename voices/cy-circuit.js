// CY — Cymbal, component-level (voicing board, schematic p.13 "CYMBAL").
//
// Source: the IC3 high band (~7.1 kHz) and low band (~3.4 kHz) of the
// six-oscillator metal bank (dsp/metal-circuit.js).
// Envelopes: Q6 (CY select) -> R84 10k -> Q19, an emitter follower fed from
//   R86/R85 100 R and C35 47u. Through D6, D7, D8 it charges three stores:
//   C38 1u (with R87 22k + C37 2.2u)  -> R94 39k -> high band A (Q16)
//   C40 1u -> R88 33k (C39 .47u) -> R90 33k -> high band B (Q17)
//   C41 1u, discharged by R93 470k + VR2 (DECAY, 2M B) -> follower Q20
//     -> R92 33k / R89 10k / R91 33k -> high band B (the long tail)
//     -> R105 33k (2.2u) / R104 22k -> low band (Q18)
// Swing VCAs: Q16/Q17 (bases from IC3 high through C42/C44 .022u, 2M bias,
//   100 R emitters) and Q18 (IC3 low, C46). Each collector takes its
//   envelope through D5/D11/D12; C36/C47, C43/C50 .0015u filter the nodes.
// High band A: C49 .0033u (R106 6.8k), then IC5a Sallen-Key high-pass
//   C53/C54 .001u, R108/R109 18k, gain 1 + R110/R111 (39k/22k).
// High band B: IC5b Sallen-Key high-pass C51/C52 .001u, R107/R113 18k,
//   gain 1 + R114/R115 (39k/39k).
// Low band: C48/C59 .0015u, R124 22k, R127 82k Sallen-Key high-pass around
//   Q25 (R126 22k to -15 V), C58 .01u, R123 100k / C57 .0033u, R121 10k.
// Tone: VR4 (20k B) wiper to ground between the high node (C55 .01u + R112
//   22k from IC5a) and, through R125 2.2k, the low node (R121, and IC5b via
//   C56 .01u + R120 10k). R119 22k / R129 15k sum them into C90 .01u ->
//   IC6 mixer (R128 470k, C77 220p, VR6 LEVEL 100k A + C78 33u).
// Not on the visible part of the sheet (assumed): Q18's bias and collector
// parts copy Q16's.
import { CircuitVoice, aTaper } from './circuit-voice.js';
import { voicingTrigger } from './cb-circuit.js';
import { PITCH, pitchMul, knob, spreadExp } from '../dsp/core.js';

// extra knob: SPREAD pulls the six metal oscillators together or pushes them
// apart (each timing capacitor on its own, in a private bank)
export const CY_EXTRA = [knob('spread', 'Spread')];

function vca(v, c, src, tag, sNode) {
  // swing VCA transistor: base from IC3 via .022u, 1M + 1M bias, 100 R emitter
  const B = 'B' + tag, C = 'C' + tag, E = 'E' + tag, I = 'I' + tag;
  v.feed(c, I, 1, src);
  c.C(I, B, 0.022e-6); c.Rsrc(B, 2e6, 15);
  c.NPN(B, C, E); c.R(E, 'gnd', 100);
  c.C(C, 'gnd', 0.0015e-6); c.D(sNode, C);
  c.C(sNode, 'gnd', 0.0015e-6);
}

export class CYCircuit extends CircuitVoice {
  constructor(sr, shared) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'tone', name: 'Tone', def: 0.5 },
      { id: 'decay', name: 'Decay', def: 0.5 },
      PITCH, ...CY_EXTRA,
    ], shared);
    this.sleepAfter = 0.3;
    // ---- envelopes
    const e = (this.s1 = this.stage(['T6', 'B19', 'C19', 'VC', 'X19', 'E1', 'N37', 'E2', 'N88', 'B20', 'P15', 'E20', 'N89', 'N105']));
    this.addTrigger(e, 'T6');
    e.R('T6', 'gnd', 22e3); e.R('T6', 'B19', 10e3);                  // R83, R84
    e.Rsrc('VC', 100, 15); e.C('VC', 'gnd', 47e-6); e.R('VC', 'C19', 100); // R86, C35, R85
    e.NPN('B19', 'C19', 'X19');                                     // Q19
    e.D('X19', 'E1'); e.C('E1', 'gnd', 1e-6);                        // D6, C38
    e.R('E1', 'N37', 22e3); e.C('N37', 'gnd', 2.2e-6);               // R87, C37
    e.D('X19', 'E2'); e.C('E2', 'gnd', 1e-6);                        // D7, C40
    e.R('E2', 'N88', 33e3); e.C('N88', 'gnd', 0.47e-6);              // R88, C39
    e.D('X19', 'B20'); e.C('B20', 'gnd', 1e-6);                      // D8, C41
    this.vr2 = e.R('B20', 'gnd', 1.47e6);                            // R93 + VR2
    this.rail(e, 'P15', 15);
    e.NPN('B20', 'P15', 'E20');                                     // Q20
    e.R('E20', 'N89', 33e3); e.R('N89', 'gnd', 10e3);                // R92, R89
    e.R('E20', 'N105', 33e3); e.C('N105', 'gnd', 2.2e-6);            // R105, 2.2u
    // ---- high band A: Q16 + IC5a
    const mc = () => this.mc;
    const h1 = (this.s2 = this.stage(['I16', 'B16', 'C16', 'E16', 'S16', 'N49', 'N53', 'P5', 'M5', 'O5']));
    vca(this, h1, (i) => mc().hi[i], '16', 'S16');
    this.link(h1, 'S16', 39e3, e, 'E1'); this.link(e, 'E1', 39e3, h1, 'S16');      // R94
    h1.C('S16', 'N49', 0.0033e-6); h1.R('N49', 'gnd', 6.8e3);        // C49, R106
    h1.C('N49', 'N53', 0.001e-6); h1.C('N53', 'P5', 0.001e-6);       // C53, C54
    h1.R('P5', 'gnd', 18e3); h1.R('N53', 'O5', 18e3);                // R109, R108
    h1.OpAmp('P5', 'M5', 'O5'); h1.R('M5', 'gnd', 22e3); h1.R('M5', 'O5', 39e3); // R111, R110
    // ---- high band B: Q17 + IC5b
    const h2 = (this.s3 = this.stage(['I17', 'B17', 'C17', 'E17', 'S17', 'N51', 'P5b', 'M5b', 'O5b']));
    vca(this, h2, (i) => mc().hi[i], '17', 'S17');
    this.link(h2, 'S17', 33e3, e, 'N88'); this.link(e, 'N88', 33e3, h2, 'S17');    // R90
    this.link(h2, 'S17', 33e3, e, 'N89'); this.link(e, 'N89', 33e3, h2, 'S17');    // R91
    h2.C('S17', 'N51', 0.001e-6); h2.C('N51', 'P5b', 0.001e-6);      // C51, C52
    h2.R('P5b', 'gnd', 18e3); h2.R('N51', 'O5b', 18e3);              // R113, R107
    h2.OpAmp('P5b', 'M5b', 'O5b'); h2.R('M5b', 'gnd', 39e3); h2.R('M5b', 'O5b', 39e3); // R115, R114
    // ---- low band: Q18 + Q25
    const lo = (this.s4 = this.stage(['I18', 'B18', 'C18', 'E18', 'S18', 'N48', 'B25', 'E25', 'P15']));
    vca(this, lo, (i) => mc().lo[i], '18', 'S18');
    this.link(lo, 'S18', 22e3, e, 'N105'); this.link(e, 'N105', 22e3, lo, 'S18');  // R104
    lo.C('S18', 'N48', 0.0015e-6); lo.C('N48', 'B25', 0.0015e-6);    // C48, C59
    lo.R('N48', 'E25', 22e3); lo.R('B25', 'gnd', 82e3);              // R124, R127
    this.rail(lo, 'P15', 15);
    lo.NPN('B25', 'P15', 'E25'); lo.Rsrc('E25', 22e3, -15);          // Q25, R126
    // ---- tone + mixer
    const m = (this.s5 = this.stage(['I55', 'N55', 'TH', 'J', 'I56', 'N56', 'L', 'I58', 'N58', 'N57', 'S', 'OUT', 'NV']));
    this.link(m, 'I55', 1, h1, 'O5'); m.C('I55', 'N55', 0.01e-6); m.R('N55', 'TH', 22e3);   // C55, R112
    this.link(m, 'I56', 1, h2, 'O5b'); m.C('I56', 'N56', 0.01e-6); m.R('N56', 'L', 10e3);   // C56, R120
    this.link(m, 'I58', 1, lo, 'E25'); m.C('I58', 'N58', 0.01e-6); m.R('N58', 'N57', 100e3); // C58, R123
    m.C('N57', 'gnd', 0.0033e-6); m.R('N57', 'L', 10e3);                                    // C57, R121
    this.vr4a = m.R('TH', 'gnd', 10e3); this.vr4b = m.R('L', 'gnd', 12.2e3);               // VR4 (+R125)
    m.R('TH', 'J', 22e3); m.R('L', 'J', 15e3);                                              // R119, R129
    m.C('J', 'S', 0.01e-6);                                                                 // C90
    m.OpAmp('gnd', 'S', 'OUT');
    this.part(m, m.R('S', 'OUT', 470e3), 'fbR'); this.part(m, m.C('S', 'OUT', 220e-12), 'fbC'); // R128, C77
    this.vr6 = m.R('S', 'NV', 100e3); this.part(m, m.C('NV', 'OUT', 33e-6), 'fbC');          // VR6, C78
    this.iOut = m.idx.OUT;
    for (const st of [h1, h2, lo]) st.tol = 1e-4;
    this.finish(3000, 0.3);
  }
  triggerVolts(accent) { return voicingTrigger(accent); }
  onParam() {
    this.pitchMetal(pitchMul(this.p.pitch), true, spreadExp(this.p.spread)); // private six-oscillator bank, retuned
    if (!this.vr6) return;
    this.vr2.g = 1 / (470e3 + 2e6 * this.p.decay);
    // VR4 20k (B), wiper grounded: TONE up = less of the low node shunted
    const t = this.p.tone;
    this.vr4a.g = 1 / Math.max(1, 20e3 * t); this.vr4b.g = 1 / (20e3 * (1 - t) + 2.2e3);
    this.vr6.g = 1 / Math.max(1, 100e3 * aTaper(this.p.level) * this.dk);
    this.s1.touch(); this.s5.touch();
  }
  output() { return this.s5.v[this.iOut]; }
}
