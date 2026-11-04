// MA — Maracas (manual p.6, schematic p.9 "HAND CLAP / MARACAS", Q65-Q68)
//
// Circuit: white noise is gated by Q65 and sent to the same output buffer
// IC19 as the clap, through the Q68 high-pass (Sallen-Key, C132/C133 .001u,
// R339 3.3k, R340 68k -> ~10.6 kHz, peaky). The envelope comes from
// Q66/Q67: C135 charges through R344 (a short attack, not an instant edge)
// and C134 sets a short decay.
//
// Manual check values: 3 Vpp normal / 5 Vpp accent; decay 25 (short) - 35 (long) ms.
import { Voice, Biquad, RCEnv, Noise, rail } from '../dsp/core.js';

export const meta = { id: 'ma', name: 'Maracas', short: 'MA' };

export class MA extends Voice {
  constructor(sr) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }]);
    this.vppNormal = 3; this.vppAccent = 5;
    this.noise = new Noise(4242);
    const f = 1 / (2 * Math.PI * Math.sqrt(3.3e3 * 68e3) * 1e-9);
    this.hp = new Biquad(sr, 'hp', Math.min(f, sr * 0.4), 1.2);
    this.hp2 = new Biquad(sr, 'hp', 5000, 0.7);
    this.env = new RCEnv(sr);
    this.env.setAttack(0.002);
    this.env.setDecay(0.022);
  }
  trigger(accent = 0) { this.env.fire(this.vpp(accent) / 2); }
  render(out, n) {
    const lvl = this.p.level;
    for (let i = 0; i < n; i++) {
      const nz = this.hp2.tick(this.hp.tick(this.noise.white()));
      out[i] += rail(nz * this.env.tick() * 0.5) * lvl;
    }
  }
}
