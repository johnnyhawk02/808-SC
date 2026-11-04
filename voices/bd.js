// BD — Bass Drum (manual p.5, schematic p.9 "BASS DRUM", IC12 / Q39-Q44)
//
// Circuit: a multi-feedback bridged-T network around 1/2 IC12 rings at
// ~56 Hz. VR6 (DECAY) sets the feedback and therefore Q / ring time.
// The trick that makes the 808 kick punchy: when the trigger arrives,
// Q41-Q43 short R165, halving the network's time constant, so for the
// first 4 ms (= 1/2 x 1/2 of the 16-18 ms period) it rings at twice the
// frequency. Then Q42 turns back on and C39/R161 deliver a small
// re-trigger pulse and the network continues at its own frequency.
// TONE (VR5 + C45) is a low-pass on the output that also sets how much of
// the trigger click gets through.
//
// Manual check values: 18 ms (56 Hz); 3.5 Vpp normal / 10 Vpp accent;
// decay 50 / 300 / 800 ms (short / mid / long).
import { Voice, BridgedT, Pulse, OnePole, map3, qFromDecay, rail } from '../dsp/core.js';

export const meta = { id: 'bd', name: 'Bass Drum', short: 'BD' };

export class BD extends Voice {
  constructor(sr) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'tone', name: 'Tone', def: 0.5 },
      { id: 'decay', name: 'Decay', def: 0.5 },
    ]);
    this.vppNormal = 3.5; this.vppAccent = 10;
    this.f0 = 56;
    this.res = new BridgedT(sr);
    this.pulse = new Pulse(sr);
    this.tone = new OnePole(sr, 1000, 'lp');
    this.click = new OnePole(sr, 400, 'hp');
    this.t = 1e9; // samples since trigger
    this.retrig = false;
    this.amp = 0;
    this.onParam();
  }
  onParam() {
    const t10 = map3(this.p.decay, 0.05, 0.3, 0.8);
    this.q = qFromDecay(this.f0, t10);
    // VR5: about 180 Hz (dark, round) to 3 kHz (clicky).
    this.tone.set(180 * Math.pow(3000 / 180, this.p.tone));
  }
  trigger(accent = 0) {
    this.amp = this.vpp(accent) / 2;
    this.t = 0;
    this.retrig = false;
    // Q43 shorts R165: time constant halved -> 2 x f for 4 ms.
    this.res.set(this.f0 * 2, this.q);
    this.pulse.fire(this.res.pulseHeight(this.amp * 1.3, 1e-3), 1e-3);
    this.trigV = this.amp;
  }
  render(out, n) {
    const sr = this.sr, fourMs = 0.004 * sr, lvl = this.p.level;
    for (let i = 0; i < n; i++) {
      if (this.t === Math.round(fourMs)) {
        // Back to the inherent frequency; C39 via R161 re-triggers.
        this.res.set(this.f0, this.q);
        this.pulse.fire(this.res.pulseHeight(this.amp * 0.5, 1e-3), 1e-3);
      }
      const x = this.pulse.tick();
      let y = rail(this.res.tick(x));
      // trigger feed-through (C40/R163 into IC12) gives the beater click
      const clk = this.t < sr * 0.0015 ? this.trigV * 0.6 : 0;
      y += this.click.tick(clk) * this.p.tone;
      out[i] += this.tone.tick(y) * lvl;
      this.t++;
    }
  }
}
