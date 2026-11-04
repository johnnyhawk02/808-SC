// RS — Rim Shot (manual p.6 "RS/CL", schematic p.9 "RIM SHOT / CLAVES",
// IC20 / IC21 / Q59-Q62)
//
// Circuit: two bridged-T resonators are triggered together:
//   IC21: C115/C116 .0047u, R315 5.6k, R316 1M -> ~452 Hz (the "L" tone)
//   IC20 in RS mode (SW11, R313 disconnected, just a buffer-ish network) -> ~1.67 kHz ("H")
// Both feed the base of Q62, a swing-type VCA (Fig. 12) whose collector
// envelope comes from R107/C24 (.47u) charged by the trigger via Q60/D61.
// The VCA chops the sum and adds the bright, woody harmonics of the rim shot.
//
// Manual check values: H 0.6 ms (1667 Hz), L 2.2 ms (455 Hz);
// 3 Vpp normal / 10 Vpp accent; decay 10 ms.
import { Voice, BridgedT, Pulse, RCEnv, OnePole, swingVCA, qFromDecay, rail } from '../dsp/core.js';

export const meta = { id: 'rs', name: 'Rim Shot', short: 'RS' };

export class RS extends Voice {
  constructor(sr) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }]);
    this.vppNormal = 3; this.vppAccent = 10;
    this.hi = new BridgedT(sr); this.hi.set(1667, qFromDecay(1667, 0.03));
    this.lo = new BridgedT(sr); this.lo.set(455, BridgedT.fromParts(5.6e3, 1e6, 0.0047e-6, 0.0047e-6).q);
    this.pHi = new Pulse(sr); this.pLo = new Pulse(sr);
    // C24 .47u discharging through ~10k (R108 + Q62 base path)
    this.env = new RCEnv(sr); this.env.setTau(0.47e-6 * 10e3);
    this.dc = new OnePole(sr, 120, 'hp');
  }
  trigger(accent = 0) {
    const a = this.vpp(accent) / 2;
    this.pHi.fire(this.hi.pulseHeight(1, 0.25e-3), 0.25e-3);
    this.pLo.fire(this.lo.pulseHeight(1, 0.25e-3), 0.25e-3);
    this.env.fire(a * 2.2);
  }
  render(out, n) {
    const lvl = this.p.level;
    for (let i = 0; i < n; i++) {
      const s = this.hi.tick(this.pHi.tick()) + 0.8 * this.lo.tick(this.pLo.tick());
      const y = swingVCA(this.env.tick(), s, 25);
      out[i] += rail(this.dc.tick(y)) * lvl;
    }
  }
}
