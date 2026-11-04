// CP — Hand Clap (manual p.6 "CP/MA" + Fig. 13, schematic p.9, IC21-IC23 / Q69-Q73)
//
// Circuit: white noise through the band-pass IC21 feeds two VCAs in parallel:
//  * Q70 with a long, smooth envelope (C139/C143) -> the clap's "reverb" tail
//  * IC22 (BA662 OTA) driven by a sawtooth envelope -> the clap itself
// The sawtooth comes from the quad comparator IC23 (AN6912):
//  1. The trigger opens a 30 ms window (R350/C140, Fig. 13-2).
//  2. Inside the window C144 is slammed to full charge, then discharges
//     through R365/D71. When it falls below the comparator threshold it is
//     recharged again -> repeated teeth roughly every 10 ms (Fig. 13-3..5).
//  3. When the window closes (pin 1 rises), R357/C141 differentiate the edge,
//     Q73 fires once more, and C144 is left to discharge slowly: the last,
//     longest burst (Fig. 13-6).
// Q72/Q71 convert that voltage exponentially into the OTA's control current.
// The result is the classic 3 quick slaps + 1 longer one (Fig. 13-7).
//
// Manual check values: 6 Vpp normal (the accent entry reads 2 Vpp, which
// looks like a typo; accent is modelled like the other voices); decay 100 ms.
import { Voice, Biquad, RCEnv, Noise, decayCoef, rail } from '../dsp/core.js';

export const meta = { id: 'cp', name: 'Hand Clap', short: 'CP' };

const WINDOW = 0.030;     // 30 ms comparator window
const TOOTH_TAU = 0.0045; // C144 fast discharge
const THRESH = 0.1;       // recharge threshold -> ~10.4 ms teeth
const TAIL_TAU = 0.014;   // slow discharge after the window
const EXP_K = 3;          // Q72 exponential converter steepness

export class CP extends Voice {
  constructor(sr) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }]);
    this.vppNormal = 6; this.vppAccent = 10; // manual: 6 / 2 (see note)
    this.noise = new Noise(1981);
    this.bp = new Biquad(sr, 'bp', 1000, 1.6);   // IC21 band-pass
    this.verb = new RCEnv(sr); this.verb.setDecay(0.13); // Q70
    this.fast = decayCoef(TOOTH_TAU, sr);
    this.slow = decayCoef(TAIL_TAU, sr);
    this.v = 0; this.t = 1e9; this.inWindow = false;
  }
  trigger(accent = 0) {
    this.a = this.vpp(accent) / 2;
    this.v = 1; this.t = 0; this.inWindow = true;
    this.verb.fire(this.a * 0.5);
  }
  render(out, n) {
    const lvl = this.p.level, win = WINDOW * this.sr, a = this.a || 0;
    const ek = Math.exp(EXP_K) - 1;
    for (let i = 0; i < n; i++) {
      if (this.inWindow) {
        this.v *= this.fast;
        if (this.v < THRESH) this.v = 1;          // comparator recharges C144
        if (this.t >= win) { this.inWindow = false; this.v = 1; } // Q73 last kick
      } else {
        this.v *= this.slow;
      }
      this.t++;
      const saw = (Math.exp(EXP_K * this.v) - 1) / ek; // exponential converter
      const nz = this.bp.tick(this.noise.white()) * 2.4;
      out[i] += rail(nz * (saw * a + this.verb.tick())) * lvl;
    }
  }
}
