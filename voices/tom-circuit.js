// LT MT HT LC MC HC — toms and congas, component-level (schematic p.9/p.10).
//
// One circuit per drum; the TOM/CONGA switch changes parts, as on the
// instrument. Stage 1 (resonator):
//   trigger node TT (Q50/Q51 switch, R215 4.7k to gnd) -> C73 -> Y
//   (D56 clamps Y to gnd) -> R226 -> X (+ of IC15a), R225 X->gnd.
//   Bridged-T: C76 (-)->Mt, C78 Mt->out, R228 820k (-)->out; Mt -> R231 1k ->
//   VR11 (TUNING, 500 R B) wiper, and Mt -> D80/D81 (antiparallel) -> VR11
//   end: the diodes start conducting on big swings and pull the pitch up
//   at the start of a loud hit.
//   IC15b inverts the output (R229/R227 33k) and R230 820k feeds it back
//   into Mt, which lengthens the decay.
// Stage 2 (output + tom noise): out -> R233 100k -> C81 -> IC13b mixer
//   (R235 470k, C83 .001u, VR10 LEVEL 100k A + C82 33u). Toms only: the pink
//   noise bus through R216 15k / R217 3.3k and C71 into Q52, whose bias is the
//   envelope TT -> R219 4.7k -> D55 -> C72 -> R218 2.2M; Q52's collector
//   (R221 4.7k load) -> C74 -> R223/R222 22k, C75 -> R232 100k joins the drum.
// The congas use the same board with the noise path switched out.
//
// The conga switch changes the bridged-T capacitors, adds a shunt resistor
// at the (+) input (R224 1.5k / R253 2.2k / R280 1.5k) and cuts the noise.
// MT: C86 .0027u, R255 22k, R254 6.8k; C90/C92 (+C89/C91 for MT), R257,
// R259 820k; noise C85/C84/C87/C88, Q55, R261 100k. HT: C99, R282 22k,
// R281 5.6k; C103/C105 (+C104), R284, R286 820k; noise via Q58, R288 100k.
import { CircuitVoice, aTaper } from './circuit-voice.js';

const PARTS = {
  lt: { cIn: 0.0068e-6, rIn: 22e3, rX: 4.7e3, c1: 0.056e-6, c2: 0.012e-6 + 0.047e-6, rf: 820e3, rs: 1e3, rfb: 820e3, cOut: 0.047e-6,
        noise: { c72: 0.039e-6, c71: 0.047e-6, r216: 15e3, r217: 3.3e3, r218: 2.2e6, r220: 33e3, r221: 4.7e3, c74: 0.047e-6, r223: 22e3, r222: 22e3, c75: 0.018e-6 } },
  lc: { cIn: 0.0068e-6, rIn: 22e3, rX: (4.7e3 * 1.5e3) / 6.2e3, c1: 0.056e-6, c2: 0.012e-6, rf: 820e3, rs: 1e3, rfb: 820e3, cOut: 0.047e-6 },
  mt: { cIn: 0.0027e-6, rIn: 22e3, rX: 6.8e3, c1: 0.027e-6 + 0.0082e-6, c2: 0.012e-6 + 0.027e-6, rf: 820e3, rs: 1e3, rfb: 820e3, cOut: 0.039e-6,
        noise: { c72: 0.033e-6, c71: 0.047e-6, r216: 15e3, r217: 3.3e3, r218: 2.2e6, r220: 33e3, r221: 4.7e3, c74: 0.033e-6, r223: 22e3, r222: 22e3, c75: 0.015e-6 } },
  mc: { cIn: 0.0027e-6, rIn: 22e3, rX: (6.8e3 * 2.2e3) / 9e3, c1: 0.027e-6, c2: 0.012e-6, rf: 820e3, rs: 1e3, rfb: 820e3, cOut: 0.039e-6 },
  ht: { cIn: 0.0027e-6, rIn: 22e3, rX: 5.6e3, c1: 0.027e-6, c2: 0.0056e-6 + 0.022e-6, rf: 820e3, rs: 1e3, rfb: 820e3, cOut: 0.033e-6,
        noise: { c72: 0.033e-6, c71: 0.047e-6, r216: 15e3, r217: 3.3e3, r218: 2.2e6, r220: 33e3, r221: 4.7e3, c74: 0.027e-6, r223: 22e3, r222: 22e3, c75: 0.01e-6 } },
  hc: { cIn: 0.0027e-6, rIn: 22e3, rX: (5.6e3 * 1.5e3) / 7.1e3, c1: 0.027e-6, c2: 0.0056e-6, rf: 820e3, rs: 1e3, rfb: 820e3, cOut: 0.033e-6 },
};

class TomCircuit extends CircuitVoice {
  constructor(sr, shared, key) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'tuning', name: 'Tuning', def: 0.5 },
    ], shared);
    const P = PARTS[key];
    const a = (this.s1 = this.stage(['TT', 'Y', 'X', 'P', 'Mt', 'O1', 'N15', 'O2', 'W11', 'T11']));
    this.addTrigger(a, 'TT');
    a.R('TT', 'gnd', 4.7e3);                                  // R215
    a.C('TT', 'Y', P.cIn); a.D('gnd', 'Y');                   // C73, D56
    a.R('Y', 'X', P.rIn); a.R('X', 'gnd', P.rX);              // R226, R225 (|| R224 for LC)
    a.OpAmp('X', 'P', 'O1');
    a.C('P', 'Mt', P.c1); a.C('Mt', 'O1', P.c2); a.R('P', 'O1', P.rf);
    a.R('Mt', 'W11', P.rs);                                   // R231
    a.D('Mt', 'T11'); a.D('T11', 'Mt');                       // D80, D81
    this.vrA = a.R('T11', 'W11', 250); this.vrB = a.R('W11', 'gnd', 250); // VR11 500 R
    a.R('O1', 'N15', 33e3); a.R('N15', 'O2', 33e3); a.OpAmp('gnd', 'N15', 'O2'); // IC15b
    a.R('O2', 'Mt', P.rfb);                                   // R230
    const nodes = ['J', 'S', 'OUT', 'NV'];
    if (P.noise) nodes.push('TTc', 'E', 'G', 'H', 'B52', 'C52', 'N223', 'N75', 'P15');
    const m = (this.s2 = this.stage(nodes));
    this.link(m, 'J', 100e3, a, 'O1');                        // R233
    m.C('J', 'S', P.cOut);                                    // C81 into the mixer's (-)
    m.OpAmp('gnd', 'S', 'OUT');
    m.R('S', 'OUT', 470e3); m.C('S', 'OUT', 0.001e-6);        // R235, C83
    this.vr10 = m.R('S', 'NV', 100e3); m.C('NV', 'OUT', 33e-6); // VR10, C82
    if (P.noise) {
      const N = P.noise, pn = this.shared.noise;
      this.link(m, 'TTc', 4.7e3, a, 'TT');                    // R219 (D55 blocks the return)
      m.D('TTc', 'E'); m.C('E', 'gnd', N.c72);                // D55, C72
      m.R('E', 'G', N.r218);                                  // R218
      this.feed(m, 'H', N.r216, (i) => pn.pn[i]);             // R216 from P.N.
      m.R('H', 'gnd', N.r217); m.C('G', 'H', N.c71);          // R217, C71
      m.R('G', 'B52', N.r220);                                // R220
      this.rail(m, 'P15', 15);
      m.R('P15', 'C52', N.r221); m.NPN('B52', 'C52', 'gnd');  // R221, Q52
      m.C('C52', 'N223', N.c74); m.R('N223', 'gnd', N.r223);  // C74, R223
      m.R('N223', 'N75', N.r222); m.C('N75', 'gnd', N.c75);   // R222, C75
      m.R('N75', 'J', 100e3);                                 // R232
      m.tol = 1e-4;
    }
    this.iOut = m.idx.OUT;
    this.finish();
  }
  onParam() {
    // VR11 500 R (B): wiper-to-ground part shrinks as TUNING goes up
    const r = 500 * (1 - this.p.tuning);
    if (this.vrA) { this.vrA.g = 1 / Math.max(1, 500 - r); this.vrB.g = 1 / Math.max(1, r); this.s1.touch(); }
    if (this.vr10) { this.vr10.g = 1 / Math.max(1, 100e3 * aTaper(this.p.level)); this.s2.touch(); }
  }
  output() { return this.s2.v[this.iOut]; }
}

export class LTCircuit extends TomCircuit { constructor(sr, sh) { super(sr, sh, 'lt'); } }
export class MTCircuit extends TomCircuit { constructor(sr, sh) { super(sr, sh, 'mt'); } }
export class HTCircuit extends TomCircuit { constructor(sr, sh) { super(sr, sh, 'ht'); } }
export class LCCircuit extends TomCircuit { constructor(sr, sh) { super(sr, sh, 'lc'); } }
export class MCCircuit extends TomCircuit { constructor(sr, sh) { super(sr, sh, 'mc'); } }
export class HCCircuit extends TomCircuit { constructor(sr, sh) { super(sr, sh, 'hc'); } }
