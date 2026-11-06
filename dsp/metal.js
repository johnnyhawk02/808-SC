// The six free-running Schmitt-trigger square oscillators on the voicing
// board (HD14584 / IC1, schematic p.13). CB uses two of them; CY, OH and CH
// use the sum of all six. They run continuously, so the phase relationship
// differs on every hit, exactly like the hardware.
import { SchmittOsc } from './core.js';

// Period of an RC Schmitt oscillator is roughly K*R*C. K is calibrated so the
// cowbell pair lands on the manual's trimmed values (1.85 ms / 1.25 ms).
const K = 0.4835;
const rc = (R, C) => 1 / (K * R * C);

export const METAL_OSC = [
  { id: 'C1', f: rc(560e3, 0.018e-6) },  // ~205 Hz  (R40 560k, C1 .018)
  { id: 'C3', f: rc(680e3, 0.01e-6) },   // ~304 Hz  (R42 680k, C3 .01)
  { id: 'C2', f: rc(560e3, 0.01e-6) },   // ~369 Hz  (R41 560k, C2 .01)
  { id: 'C4', f: rc(220e3, 0.018e-6) },  // ~522 Hz  (R43 220k, C4 .018)
  { id: 'CB1', f: 1 / 1.85e-3 },         // 540 Hz   (TM1 trimmed, TP6)
  { id: 'CB2', f: 1 / 1.25e-3 },         // 800 Hz   (TM2 trimmed, TP7)
];

export class MetalBank {
  constructor(sr) {
    this.sr = sr;
    this.osc = METAL_OSC.map((o, i) => new SchmittOsc(sr, o.f, (i * 0.37) % 1));
    this.sum = new Float32Array(0);
    this.cbLo = new Float32Array(0);
    this.cbHi = new Float32Array(0);
  }
  // Retune every oscillator by a factor (a private bank for a voice whose
  // PITCH knob is off centre; the shared bank stays at the stock tuning).
  setPitch(m) { METAL_OSC.forEach((o, i) => this.osc[i].setFreq(o.f * m)); }
  // Render one block: the 6-oscillator mix (each through 120k into a 1k node)
  // plus the two cowbell oscillators individually.
  render(n) {
    if (this.sum.length < n) {
      this.sum = new Float32Array(n); this.cbLo = new Float32Array(n); this.cbHi = new Float32Array(n);
    }
    const o = this.osc;
    for (let i = 0; i < n; i++) {
      const a = o[0].tick(), b = o[1].tick(), c = o[2].tick(), d = o[3].tick();
      const e = o[4].tick(), f = o[5].tick();
      this.cbLo[i] = e; this.cbHi[i] = f;
      this.sum[i] = (a + b + c + d + e + f) / 6;
    }
  }
}
