// The SC (simplified circuit) model of each of the 16 voices: the voices in this folder, which come from
// synthetic-808 v0.2.1, wrapped in this repo's voice API (set / trigger / render, in volts) so the kit can play them
// next to the circuit and cached models.
//
// Each wrapper takes the same knob list as the voice's other models and maps it onto the SC voice's panel values
// (0..1, centred = as built) so that a knob does the same job in every model:
//   Level   this repo's LEVEL pot law (dsp/calibration.js), times a gain that matches the circuit's loudness
//           (SC_GAIN, voices/sc/sc-calibration.js, written by test/sc-calibrate.mjs)
//   Accent  0..1 here is velocity 1..2 for the SC voice (the SC voices were edited to take it continuously)
//   Pitch   +-12 semitones: a frequency multiplier on the voice's resonators (or its six metal oscillators)
//   Decay   x1/3..x3 where the SC voice has the same span; the toms take the circuit's measured ring-time ratio;
//           the cymbal's decay is the same pot (470k + 2M) in both models
//   extras  Click, Attack, Wires, Snap dec, Noise, Ring, Detune, Spread, Tone, Spacing, Snap: onto the SC voice's
//           control for the same part
// The toms and congas, rim shot, claves, cowbell, cymbal and hats run at twice the sample rate with a half-band
// decimator; the bass drum, snare, clap and maracas run at the output rate (as in synthetic-808).
// The cymbal and hats read the six square-wave oscillators of voices/sc/metal.js: one shared bank (ScMetalBus) at the
// stock tuning, or a private one when the voice's Pitch or Spread is off centre. The cowbell has its own bank (it
// only uses the bank's cowbell pair, retuned by Pitch and Detune).
import { Voice, clamp, lerp, map3, pitchMul, decayMul, spreadExp } from '../../dsp/core.js';
import { tomDecay } from '../tom-circuit.js';
import { HalfbandDecimator } from './dsp.js';
import { Metal, CB_HZ } from './metal.js';
import { Bass808 } from './bass-808.js';
import { Snare808 } from './snare-808.js';
import { Tom808 } from './tom-808.js';
import { Rim808 } from './rim-808.js';
import { Clap808, CLAP_808 } from './clap-808.js';
import { Cowbell808 } from './cowbell-808.js';
import { Cymbal808 } from './cymbal-808.js';
import { Hats808 } from './hats-808.js';
import { SC_GAIN, SC_TRIM } from './sc-calibration.js';

const LN2 = Math.log(2), LN3 = Math.log(3);
// a frequency multiplier as an SC knob that spans x1/s .. xs around 0.5
const spanKnob = (m, s) => 0.5 + Math.log(m) / (2 * Math.log(s));
const METAL_KNOBS = { duty: 0.5, volt: 0.5, cbPw: 0.5, cbTune: 0.5, cbO1: 0.5, cbO2: 0.5, cbFromHats: false, spread: 0.5 };
const QUIET = 1e-7; // SC output below this counts as silence
const SLEEP = 0.25; // s of silence before a voice stops being ticked

// Six metal oscillators at twice the output rate, rendered once a block for every voice that reads them.
export class ScMetalBus {
  constructor(sr, pitch = 1, spread = 0.5) {
    this.metal = new Metal(sr * 2, 2);
    this.knobs = { ...METAL_KNOBS };
    this.retune(pitch, spread);
    this.raw = new Float64Array(0); this.hi = new Float64Array(0); this.lo = new Float64Array(0);
    this.cb1 = new Float64Array(0); this.cb2 = new Float64Array(0);
    this.fresh = false;
  }
  retune(pitch, spread) { this.metal.pitch = pitch; this.knobs.spread = spread; }
  begin() { this.fresh = false; } // a new block: render again on the next get()
  get(n2) {
    if (this.fresh && this.raw.length >= n2) return this;
    if (this.raw.length < n2) for (const k of ['raw', 'hi', 'lo', 'cb1', 'cb2']) this[k] = new Float64Array(n2);
    const m = this.metal, k = this.knobs;
    for (let i = 0; i < n2; i++) {
      const o = m.tick(k);
      this.raw[i] = o.raw; this.hi[i] = o.hi; this.lo[i] = o.lo; this.cb1[i] = o.cb1; this.cb2[i] = o.cb2;
    }
    this.fresh = true;
    return this;
  }
}

class ScVoice extends Voice {
  // spec: the voice's knob list (the same as its other models'); os: 1 or 2
  constructor(sr, id, spec, os) {
    super(sr, spec.map((q) => ({ ...q })));
    this.id = id; this.os = os;
    this.dec = os === 2 ? new HalfbandDecimator() : null;
    this.awake = false; this.idle = 0; this.g = 1;
    const G = SC_GAIN[id] ?? [1, 1];
    this.gN = G[0]; this.gA = G[1];
    this.knobTrim = SC_TRIM[id]; // (Voice.knobGain)
  }
  trigger(accent = 0) {
    const a = clamp(accent, 0, 1);
    this.g = lerp(this.gN, this.gA, a);
    this.awake = true; this.idle = 0;
    this.fire(1 + a);
  }
  // per block, before the samples: read the knobs
  prepare() {}
  render(out, n) {
    if (!this.awake) return;
    this.prepare(n);
    const lvl = this.levelGain() * this.g, quiet = this.sr * SLEEP;
    for (let i = 0; i < n; i++) {
      const y = this.os === 2 ? this.dec.push(this.tick(2 * i), this.tick(2 * i + 1)) : this.tick(i);
      out[i] += y * lvl;
      if (Math.abs(y) < QUIET) { if (++this.idle > quiet) { this.awake = false; break; } } else this.idle = 0;
    }
  }
}

export class BDsc extends ScVoice {
  constructor(sr, spec) { super(sr, 'bd', spec, 1); this.v = new Bass808(sr); this.v.lvl = 1; }
  fire(vel) { this.v.pitch = pitchMul(this.p.pitch); this.v.trigger(vel); }
  tick() { const p = this.p; return this.v.tick(0.5, p.tone, p.decay, 0.5, 1, p.click, p.attack); }
}

export class SDsc extends ScVoice {
  constructor(sr, spec) { super(sr, 'sd', spec, 1); this.v = new Snare808(sr); }
  fire(vel) { this.prepare(); this.v.pitch = pitchMul(this.p.pitch); this.v.trigger(vel); }
  prepare() { const p = this.p; this.v.prepare({ tone: p.tone, snappy: p.snappy, decay: p.decay, ndec: p.snapdec, wires: p.wires }); }
  tick() { return this.v.tick(0.5, 0.5); }
}

const TOM_SLOT = { lt: 0, mt: 1, ht: 2, lc: 0, mc: 1, hc: 2 };
export class TomSc extends ScVoice {
  constructor(sr, spec, id) {
    super(sr, id, spec, 2);
    this.isTom = id[1] === 't';
    this.v = new Tom808(TOM_SLOT[id], sr * 2, 0x1111 * (TOM_SLOT[id] + 1) + (this.isTom ? 0 : 7), 2);
    this.k = { tune: 0.5, dec: 0.5, atk: 0.5 };
  }
  fire(vel) { this.prepare(); this.v.trigger(vel, this.isTom); }
  prepare() {
    const p = this.p, m = pitchMul(p.pitch);
    if (m !== this.v.pitch) { this.v.pitch = m; this.v._t = NaN; }
    // DECAY: the circuit's ring-time ratio (R230, measured) as the SC voice's x1/3..x3
    this.k.dec = spanKnob(tomDecay(this.id, p.decay)[0], 3);
    // NOISE: 0 .. x1 .. x3 in the circuit (R232); the SC voice's tom noise goes 0 .. x1 .. x8
    const nz = clamp(p.noise ?? 0.5, 0, 1);
    this.k.atk = nz < 0.5 ? nz : 0.5 + (nz - 0.5) * LN3 / Math.log(8);
    this.k.tune = p.tuning;
  }
  tick() { const k = this.k; return this.v.tick(k.tune, k.dec, k.atk, 0.5); }
}

export class RSsc extends ScVoice {
  constructor(sr, spec, id = 'rs') { super(sr, id, spec, 2); this.v = new Rim808(sr * 2, 2); this.rim = id === 'rs'; this.k = { tune: 0.5, dec: 0.5, osc1: 0.5, osc2: 0.5, flt: 0, res: 0.5 }; }
  fire(vel) { this.prepare(); this.v.trigger(vel, this.rim); }
  prepare() {
    const p = this.p, k = this.k;
    k.tune = spanKnob(pitchMul(p.pitch), 2); k.dec = p.decay; k.res = p.click ?? 0.5; // CLICK: the drive into the VCA
  }
  tick() { return this.v.tick(this.k); }
}
export class CLsc extends RSsc { constructor(sr, spec) { super(sr, spec, 'cl'); } }

export class CPsc extends ScVoice {
  constructor(sr, spec) { super(sr, 'cp', spec, 1); this.v = new Clap808(sr, 0x12345678); }
  fire() {
    const p = this.p;
    // PITCH: the noise band-pass; DECAY: the reverb tail; SPACING: the clap spacing; SNAP: the reverb down to none
    this.v.bp.set('bp', CLAP_808.bpF * pitchMul(p.pitch), CLAP_808.bpQ, this.sr);
    this.v.trigger({ maracas: false, offset: p.spacing, clps: 0.5, dec: 0.5, tail: p.decay, rev: 0.5 * (1 - clamp(p.snap ?? 0, 0, 1)), flt: 0.5 });
  }
  tick() { return this.v.tick(); } // (no accent in the SC clap: accent is SC_GAIN's accented gain)
}

export class MAsc extends ScVoice {
  constructor(sr, spec) { super(sr, 'ma', spec, 1); this.v = new Clap808(sr, 0x2468ace1); }
  fire() { const p = this.p; this.v.trigger({ maracas: true, dec: p.decay, offset: 0.5, flt: spanKnob(pitchMul(p.pitch), 2) }); }
  tick() { return this.v.tick(); }
}

const CB_GM = Math.sqrt(CB_HZ[0] * CB_HZ[1]);
export class CBsc extends ScVoice {
  constructor(sr, spec) { super(sr, 'cb', spec, 2); this.v = new Cowbell808(sr * 2, 2); this.v.lvlS = 1; this.bus = new ScMetalBus(sr); }
  fire(vel) { this.v.trigger(vel); }
  prepare(n) {
    // PITCH and DETUNE: the two cowbell oscillators (the circuit's C5/C6), as frequency multipliers
    const p = this.p, m = pitchMul(p.pitch), s = spreadExp(p.detune), k = this.bus.knobs;
    k.cbO1 = 1.5 - 1 / (m * (CB_HZ[0] / CB_GM) ** (s - 1));
    k.cbO2 = 1.5 - 1 / (m * (CB_HZ[1] / CB_GM) ** (s - 1));
    this.bus.begin(); this.b = this.bus.get(2 * n);
  }
  tick(j) { const p = this.p; return this.v.tick(this.b.cb1[j], this.b.cb2[j], 1, p.decay, p.ring); }
}

// cymbal and hats: the shared bank at stock tuning, or their own
class MetalSc extends ScVoice {
  constructor(sr, id, spec, shared) { super(sr, id, spec, 2); this.shared = shared; this.own = null; }
  bank(n) {
    const m = pitchMul(this.p.pitch), s = this.p.spread ?? 0.5;
    if (Math.abs(m - 1) < 1e-9 && Math.abs(s - 0.5) < 1e-9) { this.own = null; return this.shared.get(2 * n); }
    this.own ??= new ScMetalBus(this.sr);
    this.own.retune(m, s); this.own.begin();
    return this.own.get(2 * n);
  }
}

export class CYsc extends MetalSc {
  constructor(sr, spec, shared) { super(sr, 'cy', spec, shared); this.v = new Cymbal808(sr * 2, 2); this.v.lvlS = 1; }
  fire(vel) { this.v.trigger(vel); }
  prepare(n) { this.b = this.bank(n); }
  tick(j) { const p = this.p; return this.v.tick(this.b.hi[j], this.b.lo[j], 1, p.tone, p.decay); }
}

export class OHsc extends MetalSc {
  constructor(sr, spec, shared) { super(sr, 'oh', spec, shared); this.v = new Hats808(sr * 2, 2); }
  fire(vel) { this.v.triggerOpen(vel); }
  choke() { this.v.open.choke(); }
  prepare(n) { this.b = this.bank(n); }
  tick(j) { const p = this.p; return this.v.tick(this.b.raw[j], 0.5, p.decay, 0.5, p.tone).open; }
}

export class CHsc extends MetalSc {
  constructor(sr, spec, shared) { super(sr, 'ch', spec, shared); this.v = new Hats808(sr * 2, 2); }
  fire(vel) { this.v.triggerClosed(vel); }
  prepare(n) { this.b = this.bank(n); }
  tick(j) { const p = this.p; return this.v.tick(this.b.raw[j], p.decay, 0.5, p.tone, 0.5).closed; }
}

// id -> a new SC voice; spec: the voice's knob list; bus: the shared ScMetalBus
export function makeSc(id, sr, spec, bus) {
  switch (id) {
    case 'bd': return new BDsc(sr, spec);
    case 'sd': return new SDsc(sr, spec);
    case 'lt': case 'mt': case 'ht': case 'lc': case 'mc': case 'hc': return new TomSc(sr, spec, id);
    case 'rs': return new RSsc(sr, spec);
    case 'cl': return new CLsc(sr, spec);
    case 'cp': return new CPsc(sr, spec);
    case 'ma': return new MAsc(sr, spec);
    case 'cb': return new CBsc(sr, spec);
    case 'cy': return new CYsc(sr, spec, bus);
    case 'oh': return new OHsc(sr, spec, bus);
    case 'ch': return new CHsc(sr, spec, bus);
  }
  return null;
}
