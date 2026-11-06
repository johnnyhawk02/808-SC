// RS — Rim Shot, behavioural model (manual p.6 "RS/CL", schematic p.9).
//
// A cheap stand-in for the RS half of voices/rscl-circuit.js, fitted to its
// output (test/fit.mjs):
//  * two damped resonators for IC21 (~450 Hz) and IC20 in RS mode (~1.8 kHz),
//    kicked by the trigger
//  * their sum drives the Q62 swing VCA (Fig. 12) whose collector envelope is
//    C24 (.47u) charged through D61/R107 and discharging through R108: the
//    collector is chopped by the tones, giving the woody harmonics
//  * the C121/C122 Sallen-Key high-pass around Q63 (590 Hz, Q 2.9, from the
//    parts) and finally the Q74 mute, which Q61 releases ~10 ms after the hit
import { Voice, BridgedT, Pulse, Biquad, swingVCA, rail, decayCoef, lerp, clamp, PITCH, DECAY, pitchMul, decayMul, spanMul } from '../dsp/core.js';
import { RS_EXTRA } from './rscl-circuit.js';
import { busVoltage } from '../dsp/mna.js';

export const meta = { id: 'rs', name: 'Rim Shot', short: 'RS' };

// Fitted to the circuit model (node test/fit.mjs rs ...).
export const FIT = {
  fH: 1968, qH: 11.19, fL: 434.8, qL: 11.71, // resonators
  kH: 0.1047, kL: 0.09663,     // kick per volt of trigger bus
  eK: 0.4172, eTau: 0.005024, // C24 envelope: volts per bus volt, R108 x C24
  vca: 11.1,              // Q62 gain (signal -> collector pull)
  mute: 0.01161, muteTau: 0.002052, // Q74 mute: release time after the hit, fall time
  out: 0.9006,
};

export class RS extends Voice {
  constructor(sr) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }, PITCH, DECAY, ...RS_EXTRA]);
    this.vppNormal = 3; this.vppAccent = 10;
    const F = FIT;
    this.hi = new BridgedT(sr); this.lo = new BridgedT(sr);
    this.pHi = new Pulse(sr); this.pLo = new Pulse(sr);
    this.hp = new Biquad(sr, 'hp', 1 / (2 * Math.PI * 4.7e-9 * Math.sqrt(10e3 * 330e3)), 0.5 * Math.sqrt(330e3 / 10e3));
    this.e = 0; this.m = 0; this.t = 1e9;
    this.onParam();
  }
  onParam() {
    // PITCH: both resonators by m; DECAY: the C24 envelope and the Q61 mute
    // timer (C113) by d
    const F = FIT, sr = this.sr, m = pitchMul(this.p.pitch), d = decayMul(this.p.decay);
    this.hi.set(F.fH * m, F.qH); this.lo.set(F.fL * m, F.qL);
    this.eK = decayCoef(F.eTau * d, sr); this.mK = decayCoef(F.muteTau * d, sr);
    this.muteN = Math.round(F.mute * d * sr);
    this.vca = F.vca * spanMul(this.p.click, 3); // CLICK: R317, the drive into Q62
  }
  trigger(accent = 0) {
    const F = FIT, vb = busVoltage(accent) * lerp(this.trimN, this.trimA, clamp(accent, 0, 1));
    this.pHi.fire(this.hi.pulseHeight(vb * F.kH, 0.5e-3), 0.5e-3);
    this.pLo.fire(this.lo.pulseHeight(vb * F.kL, 0.5e-3), 0.5e-3);
    this.e = vb * F.eK; this.m = 1; this.t = 0;
  }
  render(out, n) {
    const F = FIT, lvl = this.levelGain() * F.out;
    for (let i = 0; i < n; i++) {
      const s = this.hi.tick(this.pHi.tick()) + this.lo.tick(this.pLo.tick());
      const y = this.hp.tick(swingVCA(this.e, s, this.vca));
      this.e *= this.eK;
      if (this.t++ > this.muteN) this.m *= this.mK;
      out[i] += rail(y * this.m) * lvl;
    }
  }
}
