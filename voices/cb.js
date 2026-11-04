// CB — Cowbell (manual p.6, schematic p.13 "COWBELL", Q14/Q15, IC2)
//
// Circuit: two of the six Schmitt-trigger square oscillators (trimmed by
// TM1/TM2 to 1.85 ms = 540 Hz and 1.25 ms = 800 Hz) each pass through their
// own transistor gate (Q15, Q14), whose collectors are fed from the shared
// envelope capacitor C9 (.47u) through D3/D4 and 470k. The two gated squares
// are summed into the band-pass IC2 (R25 470k, R24 2.2k, C29/C30 ~2 kHz).
// R82 + C34 (1u) in parallel with C9 makes a two-slope envelope: a fast
// initial drop that emphasises the attack, then a longer tail.
//
// Manual check values: H 1.25 ms (800 Hz), L 1.85 ms (540 Hz);
// 3.5 Vpp normal / 12 Vpp accent; decay 50 ms.
import { Voice, Biquad, OnePole, decayCoef, rail } from '../dsp/core.js';

export const meta = { id: 'cb', name: 'Cowbell', short: 'CB' };

export class CB extends Voice {
  constructor(sr, metal) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }]);
    this.metal = metal;
    this.vppNormal = 3.5; this.vppAccent = 12;
    // MFB band-pass IC2: f0 = sqrt((R1+R3)/(R1 R2 R3 C1 C2)) / 2pi
    const R1 = 10e3, R2 = 470e3, R3 = 2.2e3, C1 = 2.2e-9, C2 = 3.3e-9;
    const f0 = Math.sqrt((R1 + R3) / (R1 * R2 * R3 * C1 * C2)) / (2 * Math.PI);
    this.bp = new Biquad(sr, 'bp', f0, 1.2);
    this.lp = new OnePole(sr, 4500, 'lp');
    this.eFast = 0; this.eSlow = 0;
    this.kFast = decayCoef(0.012, sr); // C9 dumping into C34 via R82
    this.kSlow = decayCoef(0.08, sr);  // combined C9 + C34 tail
  }
  trigger(accent = 0) {
    const a = this.vpp(accent) / 2;
    this.eFast = a * 0.9; this.eSlow = a * 0.1;
  }
  render(out, n) {
    const lvl = this.p.level, lo = this.metal.cbLo, hi = this.metal.cbHi;
    for (let i = 0; i < n; i++) {
      this.eFast *= this.kFast; this.eSlow *= this.kSlow;
      const e = this.eFast + this.eSlow;
      // gated squares (transistor gate passes the square scaled by the envelope)
      const g = (lo[i] + hi[i]) * e;
      const y = this.bp.tick(g) * 0.6 + this.lp.tick(g) * 0.22;
      out[i] += rail(y) * lvl;
    }
  }
}
