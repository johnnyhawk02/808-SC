// Base class for the component-level voices.
//
// A voice is one or more circuit "stages", each solved by dsp/mna.js. Stages
// are cut only where one side drives the other from a low impedance (an
// op-amp output, an emitter follower, a stiff divider) so the cut costs
// well under 1% accuracy; it keeps each matrix small enough to run in real
// time. Where a cut has to cross a high-value resistor in both directions
// (e.g. a 1M bias feed), each side sees the other's voltage from the
// previous sample (21 us), which is far below anything audible.
//
// The instrument trigger (a PNP switch such as Q40, Q46, Q51 on the voice's
// select line) connects the common trigger bus to the voice's input node for
// 1 ms. The bus voltage comes from the main board's accent circuit
// (busVoltage in dsp/mna.js).
import { Circuit, busVoltage, TRIG_WIDTH } from '../dsp/mna.js';
import { Voice, OnePole, clamp } from '../dsp/core.js';

// Audio (A) taper: 10% of the resistance at mid rotation.
export const aTaper = (x) => { x = clamp(x, 0, 1); return (Math.exp(4.394 * x) - 1) / (Math.exp(4.394) - 1); };
// C taper (reverse log)
export const cTaper = (x) => 1 - aTaper(1 - x);

export class Pot {
  // three-terminal pot a - wiper - b, total R; position 0 = wiper at b
  constructor(c, a, w, b, R) {
    this.c = c; this.R = R;
    this.top = a ? c.R(a, w, R / 2) : null;
    this.bot = b ? c.R(w, b, R / 2) : null;
  }
  set(pos) {
    const r = clamp(pos, 0, 1) * this.R;
    if (this.top) this.top.g = 1 / Math.max(1, this.R - r);
    if (this.bot) this.bot.g = 1 / Math.max(1, r);
    this.c.touch();
  }
}
// variable resistor (pot wired as a rheostat)
export function rheo(c, a, b, R) {
  const e = c.R(a, b, R);
  e.set = (frac) => { e.g = 1 / Math.max(1, R * clamp(frac, 0, 1)); c.touch(); };
  return e;
}

export class CircuitVoice extends Voice {
  constructor(sr, spec, shared = {}) {
    super(sr, spec);
    this.shared = shared;
    this.stages = [];
    this.switches = [];
    this.idle = 1e9;        // samples since the last trigger
    this.quiet = 0;         // samples the output has been silent
    this.sleepAfter = 0.2;  // s of silence before the circuit is frozen
    this.minAwake = 0.25;   // s after a trigger before sleeping is allowed
    this.dcBlock = new OnePole(sr, 2, 'hp'); // output jack coupling
    this.isCircuit = true;
  }
  stage(nodes) {
    const c = new Circuit(nodes);
    c.setTimestep(1 / this.sr);
    c.feeds = [];
    this.stages.push(c);
    return c;
  }
  // drive node `node` of stage `c` through `ohms` from a value read each sample
  feed(c, node, ohms, get) {
    const s = c.Rsrc(node, ohms, 0); s.get = get; c.feeds.push(s); return s;
  }
  // shorthand: drive from another stage's node voltage
  link(c, node, ohms, from, fromNode) {
    const k = from.idx[fromNode];
    return this.feed(c, node, ohms, () => from.v[k]);
  }
  // supply rail as a node (for transistors whose emitter sits on a rail)
  rail(c, node, volts) { return c.Rsrc(node, 1, volts); }
  addTrigger(c, node, ohms = 100) {
    const s = c.Rsrc(node, ohms, 0); s.on = false; s.c = c; this.switches.push(s); return s;
  }
  // bus voltage seen by this voice's trigger (voicing board re-buffers it)
  triggerVolts(accent) { return busVoltage(accent); }
  // metal-board voices read the oscillators/IC3 through this.mc, so the
  // warm-up below can drive them from a private copy of the bank
  get mc() { return this._mc ?? this.shared.metal; }
  finish(steps = 3000, warmSecs = 0) {
    this.onParam?.();
    // DC operating point stage by stage (feeds follow), then let it run
    for (const c of this.stages) {
      const dt = c.dt; c.setTimestep(1e4);
      for (let i = 0; i < 30; i++) { this._feed(c, 0); c.step(300, 1e-9); }
      for (const cap of c.caps) cap.i = 0;
      c.setTimestep(dt);
    }
    for (let i = 0; i < steps; i++) this._tick(0);
    if (warmSecs > 0) {
      // run with the free-running oscillators so coupling capacitors that
      // see them all the time (C32/C33, C42...) start in their AC steady state
      const Bank = this.shared.metal.constructor, bank = new Bank(this.sr);
      this._mc = bank;
      for (let i = 0, n = Math.round(warmSecs * this.sr); i < n; i++) { bank.render(1); this._tick(0); }
      this._mc = null;
    }
    this.idle = 1e9;
  }
  _feed(c, i) { for (const s of c.feeds) s.v = s.get(i); }
  _tick(i) {
    for (const s of this.switches) if (s.on && --s.left <= 0) { s.on = false; s.c.touch(); }
    this.pre?.(i);
    for (const c of this.stages) { this._feed(c, i); c.step(); }
  }
  fire(sw, accent, width = TRIG_WIDTH) {
    sw.v = this.triggerVolts(accent); sw.on = true; sw.left = Math.max(1, Math.round(width * this.sr));
    sw.c.touch();
    this.idle = 0; this.quiet = 0;
  }
  trigger(accent = 0) { this.fire(this.switches[0], accent); }
  get awake() { return !(this.idle > this.minAwake * this.sr && this.quiet > this.sleepAfter * this.sr); }
  render(out, n) {
    this.preRender?.(n);
    if (!this.awake) { this.post?.(0, n, false); return; }
    for (let i = 0; i < n; i++) {
      this._tick(i);
      const y = this.dcBlock.tick(this.output());
      out[i] += y;
      this.post?.(i, 1, true);
      this.quiet = Math.abs(y) < 5e-3 ? this.quiet + 1 : 0; // 5 mV: ~-68 dB below a 12 V peak
      this.idle++;
    }
  }
}
