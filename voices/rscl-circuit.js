// RS / CL — Rim Shot and Claves, component-level (schematic p.9 "RIM SHOT /
// CLAVES"). One board; SW11 picks the voice, so each voice here builds the
// board with SW11 in its own position.
//
// Stage 1: trigger node TR (Q59/Q60, R300 22k to gnd) and the resonators.
//   IC21 (RS low): TR -> C111 .01u -> (R307 100k) -> D62 -> R301 47k -> (+),
//     R302 10k; bridged-T C116/C115 .0047u, R315 5.6k, R316 1M (~450 Hz).
//   IC20a: TR -> C114 .001u -> (R306 22k) -> D64 -> R310 33k -> (+), R311 10k;
//     bridged-T C119/C117 .0022u, R312 1k, R308 820k. RS: C118 .0022u joins
//     the shunt node to the output (~1.8 kHz). CL: R313 390k from the shunt
//     node to IC20b's inverted output instead (~2.5 kHz, longer ring).
//   IC20b: inverter, R314/R309 33k.
//   Q61 mute timer: TR -> C112 .022u -> base (R304 47k to -15 V); collector
//     R305 1M || C113 .047u to gnd = gate of the Q74 mute FET.
// Stage 2 (RS only): the Q62 swing VCA (manual Fig. 12). Q62's base is
//   biased on by R321 2.2M from +15 V and takes the oscillator sum through
//   C120 10u: IC21 (R318 220k) and IC20b (R320 22k) sum at R317 10k. The
//   envelope TR -> D61 -> R107 1k -> C24 .47u -> R108 10k -> D63 feeds Q62's
//   collector, so the collector pulses up to the envelope each time the
//   signal cuts Q62 off: a chopped, harmonic-rich copy of the tones. The
//   collector goes through the C121/C122 .0047u, R322 10k, R325 330k
//   Sallen-Key high-pass around follower Q63 (R323 22k to -15 V), then R324
//   to SW11.
// Stage 3: SW11 -> C125 .01u -> R326 10k -> IC19 with R330 470k, C153 22p,
//   C126 33u + VR16 (LEVEL, 100k A). Q74 (2SK30A) shorts VR16 except while
//   Q61 holds its gate negative: that mutes the tail; R327 470k ties the gate
//   to the output.
// Not readable / assumed: R324 = 180k (picked so RS meets the manual's
// 3 / 10 Vpp; R319, its CL twin, is 220k). Q74 is a square-law FET updated
// per sample. Its pinch-off sets when the tail is muted, and with it the
// claves' decay (the CL resonator itself rings for ~200 ms): Vp = -3.5 V,
// inside the 2SK30A's -0.4..-5 V spread, meets the table's 25 ms (-1 V gave
// 42 ms). On-resistance |Vp| / (2 Idss), Idss 2 mA (Y rank) = 875 R.
import { CircuitVoice, aTaper } from './circuit-voice.js';
import { PITCH, DECAY, pitchMul, decayMul } from '../dsp/core.js';

class RSCLCircuit extends CircuitVoice {
  constructor(sr, shared, mode) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }, PITCH, DECAY], shared);
    this.mode = mode;
    const a = (this.s1 = this.stage(['TR', 'N307', 'N301', 'X21', 'P21', 'M21', 'O21',
      'N306', 'N310', 'X20', 'P20', 'M20', 'O20a', 'I20b', 'O20b', 'B61', 'G61', 'M15']));
    this.addTrigger(a, 'TR');
    a.R('TR', 'gnd', 22e3);                                     // R300
    a.C('TR', 'N307', 0.01e-6); a.R('N307', 'gnd', 100e3);      // C111, R307
    a.D('N307', 'N301'); a.R('N301', 'X21', 47e3); a.R('X21', 'gnd', 10e3); // D62, R301, R302
    a.OpAmp('X21', 'P21', 'O21');
    // PITCH scales the bridged-T capacitors by 1/m (C115-C119); DECAY scales
    // the timing capacitors: C113 (Q61 mute timer) and, for RS, C24 (envelope)
    const pt = (el) => this.part(a, el, 'pitch');
    pt(a.C('P21', 'M21', 0.0047e-6)); pt(a.C('M21', 'O21', 0.0047e-6)); // C116, C115
    a.R('M21', 'gnd', 5.6e3); a.R('P21', 'O21', 1e6);           // R315, R316
    a.C('TR', 'N306', 0.001e-6); a.R('N306', 'gnd', 22e3);      // C114, R306
    a.D('N306', 'N310'); a.R('N310', 'X20', 33e3); a.R('X20', 'gnd', 10e3); // D64, R310, R311
    a.OpAmp('X20', 'P20', 'O20a');
    pt(a.C('P20', 'M20', 0.0022e-6)); pt(a.C('M20', 'O20a', 0.0022e-6)); // C119, C117
    a.R('M20', 'gnd', 1e3); a.R('P20', 'O20a', 820e3);          // R312, R308
    if (mode === 'rs') pt(a.C('M20', 'O20a', 0.0022e-6));       // SW11: C118
    else a.R('M20', 'O20b', 390e3);                             // SW11: R313
    a.R('O20a', 'I20b', 33e3); a.R('I20b', 'O20b', 33e3); a.OpAmp('gnd', 'I20b', 'O20b');
    a.C('TR', 'B61', 0.022e-6); a.Rsrc('B61', 47e3, -15);       // C112, R304
    this.rail(a, 'M15', -15);
    a.NPN('B61', 'G61', 'M15');                                 // Q61
    a.R('G61', 'gnd', 1e6); this.part(a, a.C('G61', 'gnd', 0.047e-6), 'env'); // R305, C113
    let src;
    if (mode === 'rs') {
      const b = (this.s2 = this.stage(['TRc', 'N61', 'E24', 'N108', 'K62', 'B62', 'N317', 'N322', 'B63', 'E63', 'P15']));
      this.link(b, 'TRc', 1, a, 'TR');
      b.D('TRc', 'N61'); b.R('N61', 'E24', 1e3); this.part(b, b.C('E24', 'gnd', 0.47e-6), 'env'); // D61, R107, C24
      b.R('E24', 'N108', 10e3); b.D('N108', 'K62');                            // R108, D63
      b.NPN('B62', 'K62', 'gnd');                                              // Q62
      b.Rsrc('B62', 2.2e6, 15); b.C('B62', 'N317', 10e-6);                     // R321, C120
      b.R('N317', 'gnd', 10e3);                                                // R317
      this.link(b, 'N317', 220e3, a, 'O21');                                   // R318
      this.link(b, 'N317', 22e3, a, 'O20b');                                   // R320
      b.C('K62', 'N322', 0.0047e-6); b.C('N322', 'B63', 0.0047e-6);            // C121, C122
      b.R('N322', 'E63', 10e3); b.R('B63', 'gnd', 330e3);                      // R322, R325
      this.rail(b, 'P15', 15);
      b.NPN('B63', 'P15', 'E63'); b.Rsrc('E63', 22e3, -15);                    // Q63, R323
      src = [b, 'E63', 180e3];                                                 // R324 (unreadable: 180k fits the table)
    } else src = [a, 'O20b', 220e3];                                           // R319
    const m = (this.s3 = this.stage(['K', 'N326', 'S', 'OUT', 'NV']));
    this.link(m, 'K', src[2], src[0], src[1]);
    m.C('K', 'N326', 0.01e-6); m.R('N326', 'S', 10e3);          // C125, R326
    m.OpAmp('gnd', 'S', 'OUT');
    m.R('S', 'OUT', 470e3); m.C('S', 'OUT', 22e-12);            // R330, C153
    m.C('S', 'NV', 33e-6);                                      // C126
    this.vr16 = m.R('NV', 'OUT', 100e3);                        // VR16
    this.fet = m.Dyn('NV', 'OUT');                              // Q74
    // gate: R327 470k to the output (previous sample, across a 470k)
    const iOut = m.idx.OUT;
    this.feed(a, 'G61', 470e3, () => m.v[iOut]);
    this.iG = a.idx.G61; this.iNV = m.idx.NV; this.iOut = iOut;
    this.finish();
  }
  pre() {
    // Q74: n-channel JFET, Vp = -3.5 V, Ron = 875 R at Vgs = 0
    const m = this.s3.v, vs = Math.min(m[this.iNV], m[this.iOut]);
    const vgs = this.s1.v[this.iG] - vs;
    let k = 1 - vgs / -3.5; k = k < 0 ? 0 : k > 1.5 ? 1.5 : k;
    this.fet.g = (k * k) / 875 + 1e-9;
  }
  onParam() {
    this.scale('pitch', 1 / pitchMul(this.p.pitch)); this.scale('env', decayMul(this.p.decay));
    if (this.vr16) { this.vr16.g = 1 / Math.max(1, 100e3 * aTaper(this.p.level)); this.s3.touch(); }
  }
  output() { return this.s3.v[this.iOut]; }
}

export class RSCircuit extends RSCLCircuit { constructor(sr, sh) { super(sr, sh, 'rs'); } }
export class CLCircuit extends RSCLCircuit { constructor(sr, sh) { super(sr, sh, 'cl'); } }
