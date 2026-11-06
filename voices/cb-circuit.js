// CB — Cowbell, component-level (voicing board, schematic p.13).
//
// The two cowbell oscillators of IC1 (540 / 800 Hz, see dsp/metal-circuit.js)
// drive Q15 and Q14 through R62/R64 33k, R63/R65 2.2k and C32/C33 10u; R30 /
// R32 470k bias them on, R31/R33 100 R in the emitters, so each transistor
// switches with its square wave. The envelope: Q5 (CB select switch) ->
// R122 1k -> D2 -> C9 .47u, with R82 33k + C34 1u as a second, slower load.
// The envelope reaches each collector through R28/R29 100k and D3/D4. While
// a transistor is off, the envelope current flows on through R26/R27 10k and
// C30/C31 .0022u into IC2b, a multiple-feedback band-pass (R24 2.2k, C28 .01u,
// C29 .0033u, R25 470k). Output: C75 1u -> R116 8.2k -> VR5 (LEVEL, 5k A)
// -> C76 .022u -> IC6 buffer (R117 22k).
//
// The voicing board re-buffers the trigger bus in IC2a (voicingTrigger
// below). Assumed: a 100k leak on the Q5 collector (only for the solver).
import { CircuitVoice, aTaper } from './circuit-voice.js';
import { busVoltage } from '../dsp/mna.js';
import { PITCH, DECAY, pitchMul, decayMul } from '../dsp/core.js';

// Voicing-board trigger buffer IC2a (schematic p.13): TRIG -> R19 100k -> (+),
// TRIG -> R18 3.3k -> D1 clamp -> R20 15k -> (+), R21 3.3k to gnd; gain
// 1 + R23/R22 = 31.3. The D1 offset raises normal hits and the op-amp rail
// limits accents, so accents here are about 2x normal (as in the manual's
// table) rather than the 3x of the main trigger bus. The PNP select
// switches (Q5-Q8) drop ~0.1 V.
export function voicingTrigger(accent) {
  const bus = busVoltage(accent), Is = 2.52e-9, nvt = 1.752 * 0.02585;
  let vd = 0.6, vp = 0;
  for (let k = 0; k < 20; k++) {
    vp = (bus / 100e3 + vd / 15e3) / (1 / 100e3 + 1 / 15e3 + 1 / 3.3e3);
    const id = Math.max(1e-9, (bus - vd) / 3.3e3 - (vd - vp) / 15e3);
    vd = nvt * Math.log(1 + id / Is);
  }
  return Math.min(13.5, vp * (1 + 100 / 3.3)) - 0.1;
}

export class CBCircuit extends CircuitVoice {
  constructor(sr, shared) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }, PITCH, DECAY], shared);
    const a = (this.s1 = this.stage(['T5', 'N122', 'E9', 'N82', 'N3', 'N4', 'N62', 'B15', 'C15', 'E15',
      'N64', 'B14', 'C14', 'E14', 'K30', 'K31', 'A', 'Pm', 'O2']));
    this.addTrigger(a, 'T5');
    a.R('T5', 'gnd', 100e3);
    // DECAY scales the envelope capacitors C9 and C34; PITCH retunes a
    // private copy of the two cowbell oscillators (their C5/C6)
    a.R('T5', 'N122', 1e3); a.D('N122', 'E9'); this.part(a, a.C('E9', 'gnd', 0.47e-6), 'env'); // R122, D2, C9
    a.R('E9', 'N82', 33e3); this.part(a, a.C('N82', 'gnd', 1e-6), 'env');     // R82, C34
    a.R('E9', 'N3', 100e3); a.R('E9', 'N4', 100e3);                           // R28, R29
    // Q15 (540 Hz) and Q14 (800 Hz)
    this.feed(a, 'N62', 33e3, (i) => this.mc.v[4][i]); a.R('N62', 'gnd', 2.2e3);   // R62, R63
    a.C('N62', 'B15', 10e-6); a.Rsrc('B15', 470e3, 15);                       // C32, R30
    a.NPN('B15', 'C15', 'E15'); a.R('E15', 'gnd', 100);                       // Q15, R31
    this.feed(a, 'N64', 33e3, (i) => this.mc.v[5][i]); a.R('N64', 'gnd', 2.2e3);   // R64, R65
    a.C('N64', 'B14', 10e-6); a.Rsrc('B14', 470e3, 15);                       // C33, R32
    a.NPN('B14', 'C14', 'E14'); a.R('E14', 'gnd', 100);                       // Q14, R33
    a.D('N3', 'C15'); a.D('N4', 'C14');                                       // D3, D4
    a.R('N3', 'K30', 10e3); a.C('K30', 'A', 0.0022e-6);                       // R26, C30
    a.R('N4', 'K31', 10e3); a.C('K31', 'A', 0.0022e-6);                       // R27, C31
    a.R('A', 'gnd', 2.2e3); a.C('A', 'Pm', 0.01e-6); a.C('A', 'O2', 0.0033e-6); // R24, C28, C29
    a.R('Pm', 'O2', 470e3); a.OpAmp('gnd', 'Pm', 'O2');                       // R25, IC2b
    const m = (this.s2 = this.stage(['Oc', 'N75', 'VT', 'W5', 'BP', 'OUT']));
    this.link(m, 'Oc', 1, a, 'O2');
    m.C('Oc', 'N75', 1e-6); m.R('N75', 'VT', 8.2e3);                          // C75, R116
    this.vrT = m.R('VT', 'W5', 2.5e3); this.vrB = m.R('W5', 'gnd', 2.5e3);    // VR5 5k (A)
    m.C('W5', 'BP', 0.022e-6); m.R('BP', 'gnd', 22e3);                        // C76, R117
    m.OpAmp('BP', 'OUT', 'OUT');                                              // IC6 buffer
    this.iOut = m.idx.OUT;
    this.finish(3000, 0.25);
  }
  triggerVolts(accent) { return voicingTrigger(accent); }
  onParam() {
    this.pitchMetal(pitchMul(this.p.pitch), false); this.scale('env', decayMul(this.p.decay));
    if (!this.vrT) return;
    const r = 5e3 * aTaper(this.p.level);
    this.vrT.g = 1 / Math.max(1, 5e3 - r); this.vrB.g = 1 / Math.max(1, r); this.s2.touch();
  }
  output() { return this.s2.v[this.iOut]; }
}
