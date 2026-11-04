// LT/MT/HT — Toms and LC/MC/HC — Congas (manual p.6, schematic p.9,
// IC15/IC17/IC18 with SW8/SW9/SW10)
//
// The three tom/conga generators are the same circuit: a multi-feedback
// bridged-T network. The panel switch swaps one capacitor (frequency)
// and a resistor (level) to turn a tom into a conga. Across one leg of
// the network sits a pair of diodes (D80/D81 for LT/LC): while the
// oscillation is large right after the trigger they conduct, shrinking the
// time constant, so the drum starts sharp and its pitch sags as it decays.
// Toms (not congas) also get a burst of pink noise, low-passed by the
// R222/C75-style RC (LT ~400 Hz, MT ~480 Hz, HT ~720 Hz), with a slightly
// longer decay "to provide artificial reverberation".
//
// Manual check values (low / mid / high tuning, decay, Vpp normal/accent):
//   LT  80 /  90 / 100 Hz, 200 ms, 3.5 / 12      LC 165 / 185 / 220 Hz, 180 ms, 3.5 / 12
//   MT 120 / 135 / 160 Hz, 130 ms, 3   / 11      MC 250 / 280 / 310 Hz, 100 ms, 3   / 10
//   HT 165 / 185 / 220 Hz, 100 ms, 3.5 / 12      HC 370 / 400 / 455 Hz,  80 ms, 3.5 / 12
import { Voice, BridgedT, Pulse, OnePole, RCEnv, PinkNoise, map3, qFromDecay, rail } from '../dsp/core.js';

const TABLE = {
  lt: { name: 'Low Tom',    f: [80, 90, 100],   t10: 0.2,  vpp: [3.5, 12], noise: 400 },
  mt: { name: 'Mid Tom',    f: [120, 135, 160], t10: 0.13, vpp: [3, 11],   noise: 480 },
  ht: { name: 'Hi Tom',     f: [165, 185, 220], t10: 0.1,  vpp: [3.5, 12], noise: 720 },
  lc: { name: 'Low Conga',  f: [165, 185, 220], t10: 0.18, vpp: [3.5, 12] },
  mc: { name: 'Mid Conga',  f: [250, 280, 310], t10: 0.1,  vpp: [3, 10] },
  hc: { name: 'Hi Conga',   f: [370, 400, 455], t10: 0.08, vpp: [3.5, 12] },
};

// How far the diode pair pushes the pitch up per volt of ringing amplitude.
const DIODE_BEND = 0.06;

class TomConga extends Voice {
  constructor(sr, key) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'tuning', name: 'Tuning', def: 0.5 },
    ]);
    const c = (this.cfg = TABLE[key]);
    this.vppNormal = c.vpp[0]; this.vppAccent = c.vpp[1];
    this.res = new BridgedT(sr);
    this.pulse = new Pulse(sr);
    this.env = 0; this.envCoef = 0;
    if (c.noise) {
      this.pink = new PinkNoise(key.charCodeAt(0) * 97);
      this.nLp = new OnePole(sr, c.noise, 'lp');
      this.nEnv = new RCEnv(sr); this.nEnv.setDecay(c.t10 * 1.4);
    }
    this.onParam();
  }
  onParam() {
    const [lo, mid, hi] = this.cfg.f;
    this.f0 = map3(this.p.tuning, lo, mid, hi);
    this.q = qFromDecay(this.f0, this.cfg.t10);
    this.envCoef = Math.exp((-Math.PI * this.f0) / (this.q * this.sr));
  }
  trigger(accent = 0) {
    const a = this.vpp(accent) / 2;
    this.env = a; // tracks the ringing amplitude (volts) for the diode model
    this.res.set(this.f0 * (1 + DIODE_BEND * a), this.q);
    this.pulse.fire(this.res.pulseHeight(a, 1e-3), 1e-3);
    if (this.nEnv) this.nEnv.fire(a * 0.25);
  }
  render(out, n) {
    const lvl = this.p.level;
    for (let i = 0; i < n; i++) {
      // diodes conduct harder at large amplitude -> higher frequency
      if ((i & 15) === 0) this.res.set(this.f0 * (1 + DIODE_BEND * this.env), this.q);
      this.env *= this.envCoef;
      let y = this.res.tick(this.pulse.tick());
      if (this.nEnv) y += this.nLp.tick(this.pink.tick()) * this.nEnv.tick() * 2;
      out[i] += rail(y) * lvl;
    }
  }
}

const make = (key) => {
  const C = class extends TomConga { constructor(sr) { super(sr, key); } };
  C.meta = { id: key, name: TABLE[key].name, short: key.toUpperCase() };
  return C;
};
export const LT = make('lt'), MT = make('mt'), HT = make('ht');
export const LC = make('lc'), MC = make('mc'), HC = make('hc');
