// The third version of every voice: recordings of a real TR-808.
//
// Michael Fischer's TR-808 sample set (1994, serial no. 103852): each sound
// recorded dry from its own individual output, LEVEL full, every other knob
// at 0 / 2.5 / 5 / 7.5 / 10 of its 11 panel marks (see cache/808/TR808.TXT and
// cache/808/SOURCE.md). A hit plays the recording nearest the current knob
// settings. The set has no accented hits, so accent scales the level by the
// circuit model's accent/normal ratio; output is scaled to volts so the
// default-knob hit matches the circuit model's level.
//
// The extra knobs: PITCH resamples the recording (so a higher pitch is also
// shorter, like a tape speed-up); DECAY, on voices whose panel had no decay
// knob, can only shorten: below centre an extra exponential fade brings the
// recording's own decay time down by the knob's factor, above centre the
// recording plays as it is.
import { Voice, clamp, decayCoef, pitchMul, decayMul, LN10 } from './core.js';
import { SAMPLE_CAL } from './calibration.js';

const POS = { '00': 0, 25: 0.25, 50: 0.5, 75: 0.75, 10: 1 };
const P5 = ['00', '25', '50', '75', '10'];
// knobs in filename order (TONE / TUNING before DECAY / SNAPPY)
export const SAMPLE_KNOBS = {
  bd: ['tone', 'decay'], sd: ['tone', 'snappy'], cy: ['tone', 'decay'],
  lt: ['tuning'], mt: ['tuning'], ht: ['tuning'], lc: ['tuning'], mc: ['tuning'], hc: ['tuning'],
  oh: ['decay'], rs: [], cl: [], cp: [], ma: [], cb: [], ch: [],
};
// every file of the set: [voice id, key, path relative to the page]
export function sampleFiles() {
  const out = [];
  for (const [id, knobs] of Object.entries(SAMPLE_KNOBS)) {
    const U = id.toUpperCase();
    const keys = knobs.length === 0 ? [''] : knobs.length === 1 ? P5 : P5.flatMap((a) => P5.map((b) => a + b));
    for (const k of keys) out.push([id, k, `cache/808/${U}/${U}${k}.WAV`]);
  }
  return out;
}

export class SampleVoice extends Voice {
  constructor(sr, id, params) {
    super(sr, params.map((p) => ({ ...p })));
    this.id = id; this.knobs = SAMPLE_KNOBS[id];
    this.bank = {};   // key -> { sr, data }
    this.cur = null; this.pos = 0; this.step = 1; this.gain = 0; this.fade = 1; this.fadeK = 1;
    this.env = 1; this.dK = 1;
    this.isSample = true;
  }
  add(key, s) {
    // the recording's own decay: last point above 1/10 of its peak
    const x = s.data; let pk = 0, last = 0;
    for (let i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i]));
    for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk * 0.1) last = i;
    s.t10 = Math.max(0.005, last / s.sr);
    this.bank[key] = s;
  }
  get loaded() { return Object.keys(this.bank).length > 0; }
  get awake() { return !!this.cur; }
  pick() {
    let best = null, bd = 1e9;
    for (const key in this.bank) {
      let d = 0;
      this.knobs.forEach((k, i) => { d += Math.abs(POS[key.slice(2 * i, 2 * i + 2)] - clamp(this.p[k], 0, 1)); });
      if (d < bd) { bd = d; best = key; }
    }
    return best;
  }
  trigger(accent = 0) {
    const key = this.pick();
    if (key == null) return;
    const c = SAMPLE_CAL[this.id] ?? [1, 1];
    const m = pitchMul(this.p.pitch);
    this.cur = this.bank[key]; this.pos = 0; this.step = (this.cur.sr / this.sr) * m;
    // DECAY below centre: fade so the decay time becomes d x the recording's
    // (after the pitch change); exp(-t/tau) on top of exp(-t/tau0) gives tau0*d
    const d = this.knobs.includes('decay') ? 1 : Math.min(1, decayMul(this.p.decay));
    const tau0 = (this.cur.t10 ?? 0.1) / m / LN10;
    this.dK = d < 1 ? decayCoef((tau0 * d) / (1 - d), this.sr) : 1; this.env = 1;
    this.gain = c[0] * (1 + (c[1] - 1) * clamp(accent, 0, 1));
    this.fade = 1; this.fadeK = 1;
  }
  choke() { this.fadeK = decayCoef(0.004, this.sr); } // OH cut by CH, like Q23
  render(out, n) {
    const s = this.cur; if (!s) return;
    const x = s.data, len = x.length - 1, g = this.gain * this.levelGain();
    for (let i = 0; i < n; i++) {
      const p = this.pos, k = p | 0;
      if (k >= len) { this.cur = null; return; }
      const f = p - k;
      out[i] += (x[k] + (x[k + 1] - x[k]) * f) * g * this.fade * this.env;
      this.fade *= this.fadeK; this.env *= this.dK;
      this.pos = p + this.step;
    }
  }
}
