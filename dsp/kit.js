// The kit: owns the shared metal oscillators, all 16 voices, a sample-
// accurate trigger queue and the master bus. Host-agnostic (worklet,
// ScriptProcessor or Node).
import { DRIVE, driveGain, driveComp, railClip } from './core.js';
import { MetalBank } from './metal.js';
import { KNOB_TRIM } from './knob-trim.js';
import { CALIBRATION, LEVEL } from './calibration.js';
import { SampleVoice } from './sampler.js';
import { BD } from '../voices/bd.js';
import { MetalCircuit } from './metal-circuit.js';
import { NoiseBus } from './noise.js';
import { CIRCUITS } from '../voices/circuits.js';
import { CachedVoice } from './cache.js';
import { SD } from '../voices/sd.js';
import { LT, MT, HT, LC, MC, HC } from '../voices/tom.js';
import { RS } from '../voices/rs.js';
import { CL } from '../voices/cl.js';
import { CP } from '../voices/cp.js';
import { MA } from '../voices/ma.js';
import { CB } from '../voices/cb.js';
import { CY } from '../voices/cy.js';
import { OH, CH } from '../voices/hats.js';
import { makeSc, ScMetalBus } from '../voices/sc/sc-voices.js';

// Panel order. Volts -> digital: 12 V peak is about -6 dBFS.
export const VOICES = [
  ['bd', 'Bass Drum', BD], ['sd', 'Snare Drum', SD],
  ['lt', 'Low Tom', LT], ['mt', 'Mid Tom', MT], ['ht', 'Hi Tom', HT],
  ['lc', 'Low Conga', LC], ['mc', 'Mid Conga', MC], ['hc', 'Hi Conga', HC],
  ['rs', 'Rim Shot', RS], ['cl', 'Claves', CL],
  ['cp', 'Hand Clap', CP], ['ma', 'Maracas', MA],
  ['cb', 'Cowbell', CB], ['cy', 'Cymbal', CY],
  ['oh', 'Open Hi-Hat', OH], ['ch', 'Closed Hi-Hat', CH],
];
export const VOLT_SCALE = 1 / 24;
// Knob every voice gets from the kit, on top of its own (same in all three
// versions), neutral at its default:
//   ACCENT: how much of the accent level this voice takes (1 = stock; the
//           circuit models see it as a lower accent bus voltage)
// DRIVE (dsp/core.js) is a voice knob: the circuit models clip in their own
// output op-amp (baked in by the Cache button); the synth and the
// recordings go through the same op-amp law in _voiceOut below.
export const COMMON = [
  { id: 'accent', name: 'Accent', def: 1, kit: true },
];
const NOISE_IDS = ['sd', 'lt', 'mt', 'ht', 'cp', 'ma'];
const METAL_IDS = ['cb', 'cy', 'oh', 'ch'];
// CH renders before OH so the circuit OH can read CH's envelope (choke)
const ORDER = VOICES.map(([id]) => id).filter((id) => id !== 'oh').concat('oh');

export class Kit {
  // opts.circuits = false skips building the circuit models (UI-only copies)
  constructor(sr, opts = {}) {
    this.sr = sr;
    this.metal = new MetalBank(sr);
    this.voices = {};
    for (const [id, , C] of VOICES) {
      const v = (this.voices[id] = new C(sr, this.metal));
      const c = CALIBRATION[id];
      if (c) { v.trimN = c[0]; v.trimA = c[1]; }
      v.levelPts = LEVEL[id];
      v.knobTrim = KNOB_TRIM[id];
    }
    // Every voice exists twice: the behavioural model above and the
    // component-level circuit simulation. `model[id]` picks which one plays.
    this.behavioural = { ...this.voices };
    // ...and as recordings of a real TR-808 (dsp/sampler.js), once loaded
    this.sampled = {};
    for (const [id] of VOICES) {
      const v = (this.sampled[id] = new SampleVoice(sr, id, this.voices[id].params));
      v.levelPts = LEVEL[id];
    }
    this.shared = { noise: new NoiseBus(sr), metal: new MetalCircuit(sr) };
    this.circuit = {};
    if (opts.circuits !== false) for (const id in CIRCUITS) this.circuit[id] = new CIRCUITS[id](sr, this.shared);
    if (this.circuit.oh && this.circuit.ch) this.circuit.oh.chokeFrom = this.circuit.ch;
    // third model: hits pre-rendered by the circuit (dsp/cache.js), loaded
    // per voice with loadCache()
    this.cached = {};
    for (const [id] of VOICES) this.cached[id] = new CachedVoice(sr, this.behavioural[id].params);
    // fourth model: SC, the simplified circuit voices (voices/sc/), on the same knobs
    this.scBus = new ScMetalBus(sr);
    this.sc = {};
    for (const [id] of VOICES) {
      const v = (this.sc[id] = makeSc(id, sr, this.behavioural[id].params, this.scBus));
      v.levelPts = LEVEL[id];
    }
    this.model = {};
    for (const [id] of VOICES) this.setModel(id, 'circuit');
    this.master = 0.8;
    this.frame = 0;      // running sample counter
    this.queue = [];     // {frame, id, accent}
    this.mix = new Float32Array(128);
    this.solo = null;    // render a single voice (tests)
    this.split = null;   // per-voice outputs, see _renderChunk
    this.fx = {};        // per voice: kit-level knobs (COMMON) + drive buffer
    for (const [id] of VOICES) this.fx[id] = { accent: 1, buf: new Float32Array(128) };
  }
  spec() {
    return VOICES.map(([id, name]) => ({
      // DRIVE last, after the kit's ACCENT
      id, name, params: [...this.voices[id].params.filter((p) => p.id !== 'drive'), ...COMMON, DRIVE],
      values: { ...this.voices[id].p, accent: this.fx[id].accent },
    }));
  }
  set(id, param, value) {
    const fx = this.fx[id];
    if (fx && param === 'accent') { fx.accent = Math.max(0, Math.min(1, value)); return; }
    this.behavioural[id]?.set(param, value);
    this.sampled[id]?.set(param, value);
    this.circuit[id]?.set(param, value);
    this.cached[id]?.set(param, value);
    this.sc[id]?.set(param, value);
  }
  // model: 'circuit' | 'cached' | 'sc' | 'behavioural' | 'sample'
  setModel(id, model) {
    const m = model === 'sample' ? 'sample' : model === 'sc' ? 'sc'
      : model === 'cached' && this.cached[id]?.loaded ? 'cached'
      : model === 'behavioural' || model === 'cached' || !this.circuit[id] ? 'behavioural' : 'circuit';
    this.model[id] = m;
    this.voices[id] = m === 'sample' ? this.sampled[id] : this[m][id];
  }
  // a voice's synthetic design, where it has more than one (the snare: 1 algorithmic, 2 circuit-layout)
  setScDesign(id, n) { this.sc[id]?.setDesign?.(n); }
  loadCache(id, info, int16) { this.cached[id].load(info, int16); }
  // one recording: key is the knob positions from the file name ('5050', '')
  loadSample(id, key, wav) { this.sampled[id]?.add(key, wav); }
  setAllModels(model) { for (const [id] of VOICES) this.setModel(id, model); }
  setBdModel(model) { this.setModel('bd', model); } // older hosts
  // when = absolute frame, or undefined for "now"
  trigger(id, accent = 0, when) {
    this.queue.push({ frame: when ?? this.frame, id, accent });
    this.queue.sort((a, b) => a.frame - b.frame);
  }
  _fire(id, accent) {
    const v = this.voices[id];
    if (!v) return;
    if (id === 'ch') {
      // behavioural OH is choked directly; the circuit OH is choked by the
      // circuit CH's C63 envelope, or, if CH plays behavioural, by a pulse
      this.behavioural.oh?.choke?.();
      this.sampled.oh?.choke?.();
      this.cached.oh?.choke();
      this.sc.oh?.choke();
      if (this.model.ch !== 'circuit') this.circuit.oh?.choke?.();
    }
    v.trigger(accent * (this.fx[id]?.accent ?? 1));
  }
  // one voice model into mix. DRIVE: the circuit models (and their cached
  // hits) clip in their own output op-amp; the synth and the recordings
  // get the same op-amp law here.
  _voiceOut(id, v, mix, n) {
    const d = v.p?.drive ?? 0;
    if (!(d > 0) || v.ownsDrive) { v.render(mix, n); return; }
    const fx = this.fx[id];
    if (fx.buf.length < n) fx.buf = new Float32Array(n);
    const b = fx.buf; b.fill(0, 0, n);
    v.render(b, n);
    const k = driveGain(d), m = driveComp(k);
    for (let i = 0; i < n; i++) mix[i] += railClip(k * b[i]) * m;
  }
  _usesCircuit(ids) { return ids.some((id) => this.model[id] === 'circuit' || this.circuit[id]?.awake); }
  // Render n frames of mono, digital scale, into dst (overwrites).
  render(dst, n) {
    let done = 0;
    while (done < n) {
      // split the block at the next queued trigger for sample accuracy
      while (this.queue.length && this.queue[0].frame <= this.frame) {
        const e = this.queue.shift();
        this._fire(e.id, e.accent);
      }
      let len = n - done;
      if (this.queue.length) len = Math.max(1, Math.min(len, this.queue[0].frame - this.frame));
      this._renderChunk(dst, done, len);
      done += len; this.frame += len;
    }
  }
  _renderChunk(dst, off, n) {
    if (this.mix.length < n) this.mix = new Float32Array(n);
    const mix = this.mix; mix.fill(0, 0, n);
    this.metal.render(n);
    this.scBus.begin(); // (the SC cymbal and hats render it when they first need it)
    const sh = this.shared;
    if (this._usesCircuit(NOISE_IDS)) sh.noise.render(n);
    sh.metal.active = () => this._usesCircuit(METAL_IDS);
    sh.metal.render(n);
    const ids = this.solo ? [this.solo] : ORDER;
    // split (optional, { id: Float32Array }): those voices render into their own buffer, not the mix (Elixir 808)
    const sp = this.split, to = sp ? (id) => (sp[id] ? (off ? sp[id].subarray(off, off + n) : sp[id]) : mix) : () => mix;
    for (const id of ids) this._voiceOut(id, this.voices[id], to(id), n);
    // the models that aren't selected finish any tail they were playing
    if (!this.solo) for (const [id] of VOICES) for (const m of ['behavioural', 'circuit', 'cached', 'sampled', 'sc']) {
      const other = this[m][id];
      if (!other || other === this.voices[id]) continue;
      if (m === 'behavioural' || (other.awake ?? true)) this._voiceOut(id, other, to(id), n);
    }
    const g = this.master * VOLT_SCALE;
    for (let i = 0; i < n; i++) {
      const x = mix[i] * g;
      dst[off + i] = x > 1 || x < -1 ? Math.tanh(x) : x; // master soft limit
    }
  }
}
