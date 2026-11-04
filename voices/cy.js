// CY — Cymbal (manual p.6, schematic p.13 "CYMBAL", IC3 / Q16-Q20 / IC5 / Q25)
//
// Circuit: all six Schmitt-trigger squares are summed and split by the two
// bridged-T band-passes of IC3:
//   high: C15/C16 .0033u, R58 560R, R59 82k  -> ~7.1 kHz, Q ~6
//   low:  C13/C14 .0068u, R56 560R, R57 82k  -> ~3.4 kHz, Q ~6
// The high band is split again into two swing-type VCAs (Fig. 12):
//   Q16 - highest band, short fixed decay
//   Q17 - slightly lower band, decay set by VR2 (CY DECAY) via Q20
// The low band goes through its own swing VCA Q18, then the Q25 high-pass
// (C48/C59 .0015u, R124 22k, R127 82k -> ~2.5 kHz).
// The high side is cleaned up by the IC5 high-passes (~8.8 kHz).
// VR4 (CY TONE) sets the level ratio between the bands.
//
// Manual check values: 3.5 Vpp normal / 7 Vpp accent; decay 350 / 800 / 1200 ms.
// (The Q17 envelope times below are longer than those figures because the
// table measures the whole voice, where the short Q16/Q18 parts set the peak.)
import { Voice, BridgedT, Biquad, RCEnv, swingVCA, map3, rail, lerp } from '../dsp/core.js';

export const meta = { id: 'cy', name: 'Cymbal', short: 'CY' };

const HI = BridgedT.fromParts(560, 82e3, 0.0033e-6, 0.0033e-6);
const LO = BridgedT.fromParts(560, 82e3, 0.0068e-6, 0.0068e-6);

export class CY extends Voice {
  constructor(sr, metal) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'tone', name: 'Tone', def: 0.5 },
      { id: 'decay', name: 'Decay', def: 0.5 },
    ]);
    this.metal = metal;
    this.vppNormal = 3.5; this.vppAccent = 7;
    this.bHi = new BridgedT(sr); this.bHi.set(HI.f, HI.q);
    this.bLo = new BridgedT(sr); this.bLo.set(LO.f, LO.q);
    this.e16 = new RCEnv(sr); this.e16.setDecay(0.08);
    this.e17 = new RCEnv(sr);
    this.e18 = new RCEnv(sr); this.e18.setDecay(0.25);
    this.hp5a = new Biquad(sr, 'hp', 8800, 0.7);
    this.hp5b = new Biquad(sr, 'hp', 8800, 0.7);
    this.hp25 = new Biquad(sr, 'hp', 1 / (2 * Math.PI * Math.sqrt(22e3 * 82e3) * 1.5e-9), 0.97);
    this.onParam();
  }
  onParam() { this.e17.setDecay(map3(this.p.decay, 0.5, 1.2, 1.8)); }
  trigger(accent = 0) {
    const a = this.vpp(accent) / 2;
    this.e16.fire(a); this.e17.fire(a); this.e18.fire(a);
  }
  render(out, n) {
    const lvl = this.p.level, s = this.metal.sum, t = this.p.tone;
    const gHi = lerp(0.5, 1.4, t), gLo = lerp(1.4, 0.4, t);
    for (let i = 0; i < n; i++) {
      const hi = this.bHi.tick(s[i]), lo = this.bLo.tick(s[i]);
      const v16 = swingVCA(this.e16.tick(), hi, 250);
      const v17 = swingVCA(this.e17.tick(), hi, 250);
      const v18 = swingVCA(this.e18.tick(), lo, 250);
      const high = this.hp5a.tick(v16) + this.hp5b.tick(v17) * 1.6;
      const low = this.hp25.tick(v18);
      out[i] += rail((high * gHi + low * gLo) * 1.3) * lvl;
    }
  }
}
