// OH — Open Hi-Hat and CH — Closed Hi-Hat (manual p.6, schematic p.13
// "OPEN HIHAT" / "CLS'D HIHAT", Q21-Q31)
//
// Both hats take the high band of the six-oscillator metal source (the
// ~7.1 kHz bridged-T half of IC3, the same one the cymbal uses).
//   OH: swing VCA Q27, envelope from C62 (.47u) with VR3 (OH DECAY) via Q24,
//       then the Q26 Sallen-Key high-pass (C66/C68 .0015u, R147 2.7k,
//       R146 68k -> ~7.8 kHz, Q ~2.5) and C80/R160 into buffer IC7.
//   CH: swing VCA Q30 with a short fixed envelope, then the Q31 high-pass
//       (C72/C73 .001u, same resistors -> ~11.7 kHz, Q ~2.5) into IC7.
// Choke: when CH is triggered while OH is ringing, Q23 is switched on through
// R173 and dumps the OH envelope ("the decay time of the OH circuit terminates").
//
// Manual check values: OH 3.5 / 7 Vpp, decay 90 / 450 / 600 ms;
//                      CH 3 / 6 Vpp, decay 50 ms.
import { Voice, BridgedT, Biquad, OnePole, RCEnv, swingVCA, map3, rail, decayCoef } from '../dsp/core.js';

const HI = BridgedT.fromParts(560, 82e3, 0.0033e-6, 0.0033e-6);
const skHP = (R1, R2, C) => ({
  f: 1 / (2 * Math.PI * Math.sqrt(R1 * R2) * C),
  q: 0.5 * Math.sqrt(R2 / R1),
});

// The two hats share the metal source and IC3; each has its own band-pass
// state here because the band-pass sits before the split in the circuit and
// is linear, so a per-voice copy is equivalent.
class Hat extends Voice {
  constructor(sr, metal, spec, hp) {
    super(sr, spec);
    this.metal = metal;
    this.bp = new BridgedT(sr); this.bp.set(HI.f, HI.q);
    this.env = new RCEnv(sr);
    this.hp = new Biquad(sr, 'hp', hp.f, Math.min(hp.q, 2.5));
    this.cpl = new OnePole(sr, 1 / (2 * Math.PI * 39e3 * 470e-12), 'hp');
  }
  render(out, n) {
    const lvl = this.p.level, s = this.metal.sum;
    for (let i = 0; i < n; i++) {
      const v = swingVCA(this.env.tick(), this.bp.tick(s[i]), 250);
      out[i] += rail(this.cpl.tick(this.hp.tick(v)) * 2.2) * lvl;
    }
  }
}

export class OH extends Hat {
  constructor(sr, metal) {
    super(sr, metal, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'decay', name: 'Decay', def: 0.5 },
    ], skHP(2.7e3, 68e3, 1.5e-9));
    this.vppNormal = 3.5; this.vppAccent = 7;
    this.onParam();
  }
  onParam() { this.t10 = map3(this.p.decay, 0.09, 0.45, 0.6); this.env.setDecay(this.t10); }
  trigger(accent = 0) { this.env.setDecay(this.t10); this.env.fire(this.vpp(accent) / 2); }
  choke() { this.env.coef = decayCoef(0.004, this.sr); } // Q23 dumps C62
}
OH.meta = { id: 'oh', name: 'Open Hi-Hat', short: 'OH' };

export class CH extends Hat {
  constructor(sr, metal) {
    super(sr, metal, [{ id: 'level', name: 'Level', def: 0.8 }], skHP(2.7e3, 68e3, 1e-9));
    this.vppNormal = 3; this.vppAccent = 6;
    this.env.setDecay(0.05);
  }
  trigger(accent = 0) { this.env.fire(this.vpp(accent) / 2); }
}
CH.meta = { id: 'ch', name: 'Closed Hi-Hat', short: 'CH' };
