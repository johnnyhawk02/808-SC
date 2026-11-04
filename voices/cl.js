// CL — Claves (manual p.6 "RS/CL", schematic p.9, IC20 / IC19 / Q74)
//
// Circuit: in CL mode SW11 connects R313 (390k), turning IC20 into a
// multi-feedback bridged-T with very high Q (C117/C119 .0022u, R312 1k,
// R308 820k -> ~2.5 kHz). Its output goes straight to the buffer IC19; the
// RS path through IC21 is so weak it can be ignored. Because the network is
// "wired for high Q", the FET Q74 normally mutes IC19 and only opens while
// the trigger is present, so residual ringing never leaks into the mix.
//
// Manual check values: 0.4 ms (2500 Hz); 2.5 Vpp normal / 8 Vpp accent; decay 25 ms.
import { Voice, BridgedT, Pulse, qFromDecay, rail } from '../dsp/core.js';

export const meta = { id: 'cl', name: 'Claves', short: 'CL' };

export class CL extends Voice {
  constructor(sr) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }]);
    this.vppNormal = 2.5; this.vppAccent = 8;
    this.f = BridgedT.fromParts(1e3, 820e3, 0.0022e-6, 0.0022e-6).f; // ~2.53 kHz
    this.res = new BridgedT(sr); this.res.set(this.f, qFromDecay(this.f, 0.025));
    this.pulse = new Pulse(sr);
  }
  trigger(accent = 0) {
    const a = this.vpp(accent) / 2;
    this.pulse.fire(this.res.pulseHeight(a, 0.2e-3), 0.2e-3);
  }
  render(out, n) {
    const lvl = this.p.level;
    for (let i = 0; i < n; i++) out[i] += rail(this.res.tick(this.pulse.tick())) * lvl;
  }
}
