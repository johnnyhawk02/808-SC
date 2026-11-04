// SD — Snare Drum (manual p.6, schematic p.9 "SNARE DRUM", IC14 / IC13 / Q45-Q49)
//
// Circuit: two bridged-T networks (both halves of IC14) ring at the
// drum's fundamental and an upper harmonic:
//   L: C58/C59 .027u, R196 680R, R197 820k  -> ~250 Hz, Q ~17
//   H: C60/C61 .0068u, R195 2.2k, R198 1M   -> ~500 Hz, Q ~11
// VR8 (TONE) sets the mix of the two. The "snappy" part is the white
// noise bus high-passed by C66/C67 (.0018u) with R201 22k / R202 47k
// (~2.7 kHz, Q ~0.7) and gated by the Q47/Q49 VCA. VR9 (SNAPPY) sets its level.
//
// Manual check values: H 2.1 ms (476 Hz), L 4.2 ms (238 Hz);
// 3 Vpp normal / 10 Vpp accent; decay 60 ms.
import { Voice, BridgedT, Pulse, Biquad, RCEnv, Noise, rail, lerp } from '../dsp/core.js';

export const meta = { id: 'sd', name: 'Snare Drum', short: 'SD' };

const L = BridgedT.fromParts(680, 820e3, 0.027e-6, 0.027e-6);
const H = BridgedT.fromParts(2.2e3, 1e6, 0.0068e-6, 0.0068e-6);

export class SD extends Voice {
  constructor(sr) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'tone', name: 'Tone', def: 0.5 },
      { id: 'snappy', name: 'Snappy', def: 0.5 },
    ]);
    this.vppNormal = 3; this.vppAccent = 10;
    // Use the manual's measured frequencies, component-derived Q.
    this.lo = new BridgedT(sr); this.lo.set(238, L.q);
    this.hi = new BridgedT(sr); this.hi.set(476, H.q);
    this.pLo = new Pulse(sr); this.pHi = new Pulse(sr);
    this.noise = new Noise(808);
    this.nHp = new Biquad(sr, 'hp', 2700, 0.73);
    this.nLp = new Biquad(sr, 'lp', 9000, 0.6);
    this.nEnv = new RCEnv(sr); this.nEnv.setDecay(0.1);
  }
  trigger(accent = 0) {
    const a = this.vpp(accent) / 2;
    this.a = a;
    this.pLo.fire(this.lo.pulseHeight(a, 1e-3), 1e-3);
    this.pHi.fire(this.hi.pulseHeight(a, 1e-3), 1e-3);
    this.nEnv.fire(a * 0.9);
  }
  render(out, n) {
    const tone = this.p.tone, snappy = this.p.snappy, lvl = this.p.level;
    const gLo = lerp(0.9, 0.35, tone), gHi = lerp(0.25, 0.8, tone);
    for (let i = 0; i < n; i++) {
      const drum = gLo * this.lo.tick(this.pLo.tick()) + gHi * this.hi.tick(this.pHi.tick());
      const nz = this.nLp.tick(this.nHp.tick(this.noise.white()));
      const e = this.nEnv.tick();
      out[i] += rail(drum + nz * e * snappy * 1.2) * lvl;
    }
  }
}
