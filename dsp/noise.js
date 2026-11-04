// Main-board noise generator (p.8 "NOISE GENERATOR", Q35 / IC24).
// Q35's reverse-biased junction makes the noise; a junction's avalanche noise
// can't be derived from its part values, so the source is Gaussian white noise
// set to the manual's own adjustment: TM4 is trimmed for 130 mV rms at TP4
// (the W.N. bus). The pink bus is the real IC24b filter, simulated:
// R133 22k, R132 22k, C32 .039u (feedback), C33 .018u -> unity-gain
// Sallen-Key low-pass at ~270 Hz.
import { Circuit } from './mna.js';

export class NoiseBus {
  constructor(sr, seed = 0x808) {
    this.sr = sr; this.s = seed >>> 0;
    this.wn = new Float32Array(128); this.pn = new Float32Array(128);
    const c = (this.ckt = new Circuit(['W', 'A', 'B', 'P']));
    this.src = c.Rsrc('W', 10, 0);
    c.R('W', 'A', 22e3); c.R('A', 'B', 22e3);
    c.C('A', 'P', 0.039e-6); c.C('B', 'gnd', 0.018e-6);
    c.OpAmp('B', 'P', 'P');
    c.setTimestep(1 / sr); c.settle(10);
    this.P = c.idx.P;
    this.rms = 0.13;
  }
  _u() { let s = this.s; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; this.s = s; return (s + 1) / 4294967297; }
  gauss() { return Math.sqrt(-2 * Math.log(this._u())) * Math.cos(2 * Math.PI * this._u()); }
  render(n) {
    if (this.wn.length < n) { this.wn = new Float32Array(n); this.pn = new Float32Array(n); }
    for (let i = 0; i < n; i++) {
      const w = this.gauss() * this.rms;
      this.wn[i] = w; this.src.v = w;
      this.ckt.step(4, 1e-4);
      this.pn[i] = this.ckt.v[this.P];
    }
  }
}
