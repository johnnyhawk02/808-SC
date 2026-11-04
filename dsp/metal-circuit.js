// Voicing-board metal source as a circuit (schematic p.13).
//
// Six HD14584 Schmitt inverters (IC1) on the 5 V line, each with a feedback
// resistor and a capacitor to ground. Each capacitor voltage is solved
// exactly between switching events (RC charge towards 0 V or 5 V), the
// switching instant is found to sub-sample accuracy and the output edge is
// band-limited (polyBLEP). Thresholds 2.8 V / 2.2 V are typical HD14584
// values at 5 V; they give a period of about 0.488*R*C, which lands the cowbell
// pair on the manual's 1.85 / 1.25 ms with TM1/TM2 at 22.4k / 42.2k.
//
//   osc  C           R                    period    freq
//   1    C1 .018u    R40 560k             4.86 ms   206 Hz
//   2    C3 .01u     R42 680k             3.28 ms   305 Hz
//   3    C2 .01u     R41 560k             2.70 ms   370 Hz
//   4    C4 .018u    R43 220k             1.91 ms   523 Hz
//   CB1  C6 .022u    R44 150k + TM1 22k   1.85 ms   540 Hz
//   CB2  C5 .018u    R45 100k + TM2 42k   1.25 ms   800 Hz
//
// Each output goes through 120k (R50, R48, R46, R39...) onto one bus, which
// feeds both halves of IC3. Each half is an inverting band-pass: input
// resistor into (-), with a bridged-T in the feedback (same topology as the
// drum resonators), simulated as circuits:
//   high band: C11 .001u + R55 22k, C15/C16 .0033u, R58 560, R59 82k (~7.1 kHz)
//              -> CY Q16/Q17, OH Q27, CH Q30
//   low band:  C10 .0033u + R52 33k, C13/C14 .0068u, R56 560, R57 82k (~3.4 kHz)
//              -> CY Q18
// R53 1k loads the bus to ground (bottom of the IC1 column, next to R35).
import { Circuit } from './mna.js';

const VDD = 5, VTH = 2.8, VTL = 2.2;
const OSC = [
  [560e3, 0.018e-6], [680e3, 0.01e-6], [560e3, 0.01e-6], [220e3, 0.018e-6],
  [150e3 + 22.4e3, 0.022e-6], [100e3 + 42.2e3, 0.018e-6],
];

// One-sample-delayed polyBLEP Schmitt RC oscillator.
class Osc {
  constructor(sr, R, C, phase) {
    this.dt = 1 / sr; this.tau = R * C;
    this.out = 1; this.vc = VTL + (VTH - VTL) * phase;
    this.held = VDD; // sample n-1 (not yet emitted)
  }
  tick() {
    let t = this.dt, before = 0, after = 0;
    while (t > 0) {
      const target = this.out ? VDD : 0, th = this.out ? VTH : VTL;
      const tc = this.tau * Math.log((this.vc - target) / (th - target));
      if (!(tc <= t)) { this.vc = target + (this.vc - target) * Math.exp(-t / this.tau); break; }
      t -= tc; this.vc = th; this.out ^= 1;
      const h = this.out ? VDD : -VDD, f = t / this.dt; // f: time since the edge, in samples
      after -= (h / 2) * (1 - f) * (1 - f);
      before += (h / 2) * f * f;
    }
    const emit = this.held + before;
    this.held = this.out * VDD + after;
    return emit;
  }
}

export class MetalCircuit {
  constructor(sr) {
    this.sr = sr;
    this.osc = OSC.map(([R, C], i) => new Osc(sr, R, C, (i * 0.37 + 0.11) % 1));
    this.v = OSC.map(() => new Float32Array(128)); // per-osc output, volts
    this.hi = new Float32Array(128); this.lo = new Float32Array(128);
    const c = (this.ckt = new Circuit(['MIX', 'N11', 'Mh', 'Ph', 'H', 'N10', 'Ml', 'Pl', 'L']));
    this.src = OSC.map(() => c.Rsrc('MIX', 120e3, 0));
    c.R('MIX', 'gnd', 1e3);                                   // R53
    // high band
    c.C('MIX', 'N11', 0.001e-6); c.R('N11', 'Ph', 22e3);      // C11, R55
    c.R('Mh', 'gnd', 560);                                    // R58
    c.C('Mh', 'Ph', 0.0033e-6); c.C('Mh', 'H', 0.0033e-6);    // C15, C16
    c.R('Ph', 'H', 82e3);                                     // R59
    c.OpAmp('gnd', 'Ph', 'H');
    // low band
    c.C('MIX', 'N10', 0.0033e-6); c.R('N10', 'Pl', 33e3);     // C10, R52
    c.R('Ml', 'gnd', 560);                                    // R56
    c.C('Ml', 'Pl', 0.0068e-6); c.C('Ml', 'L', 0.0068e-6);    // C13, C14
    c.R('Pl', 'L', 82e3);                                     // R57
    c.OpAmp('gnd', 'Pl', 'L');
    c.setTimestep(1 / sr);
    c.settle(100);
    this.iH = c.idx.H; this.iL = c.idx.L;
    this.active = () => true;
  }
  render(n) {
    if (this.hi.length < n) {
      this.v = OSC.map(() => new Float32Array(n)); this.hi = new Float32Array(n); this.lo = new Float32Array(n);
    }
    const c = this.ckt, run = this.active();
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 6; k++) { const y = this.osc[k].tick(); this.v[k][i] = y; this.src[k].v = y; }
      if (run) { c.step(8, 1e-5); this.hi[i] = c.v[this.iH]; this.lo[i] = c.v[this.iL]; }
      else { this.hi[i] = 0; this.lo[i] = 0; }
    }
  }
}
