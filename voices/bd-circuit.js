// BD — Bass Drum, component-level version.
//
// Every part from the schematic (p.9, "BASS DRUM") between the trigger
// transistor Q40 and the BD LEVEL pot is simulated as a circuit: resistors,
// capacitors, the 1S1588-type diodes D52/D53, transistors Q41-Q43 (Ebers-Moll)
// and both halves of IC12 (finite-gain op-amps that saturate near the
// +-15 V rails). Nothing about the sound is scripted: the 4 ms
// double-frequency start, the re-trigger pulse and the decay all come out of
// the network.
//
// Simplifications:
//  * Q39/Q40 (the trigger switch) are an ideal switch that connects the
//    common-trigger bus to node T through 100 R for 1 ms. The bus voltage
//    comes from the main board's accent circuit (busVoltage in dsp/mna.js).
//  * VR4 (BD LEVEL) is a 50k load and a scale; after it C49 couples into the
//    R177 82k / R176 100k divider (x0.55). The Q44 emitter follower and C50
//    are treated as a unity-gain buffer with a ~2 Hz high-pass.
//  * Tolerances, temperature and op-amp slew/bandwidth are not modelled.
import { Circuit, busVoltage, TRIG_WIDTH } from '../dsp/mna.js';
import { Voice, OnePole, lerp, clamp, PITCH, pitchMul, knob, amtMul, spanMul } from '../dsp/core.js';

// extra knobs: CLICK is C40, the trigger's feed into IC12 (0 = none, centre
// stock, full 2x); ATTACK is C38, the Q42 mono-stable that holds the start of
// the note at the higher pitch (x1/3 .. x3 its 4 ms)
export const BD_EXTRA = [knob('click', 'Click'), knob('attack', 'Attack')];

export const meta = { id: 'bd', name: 'Bass Drum (circuit)', short: 'BD' };

const DIVIDER = 100e3 / (82e3 + 100e3); // R176 / (R177 + R176)

const NODES = ['T', 'B41', 'C41n', 'N42', 'N39', 'B43', 'X', 'P', 'Q', 'M', 'K', 'S', 'O2', 'N6', 'V3', 'Tn', 'L1'];

export class BDCircuit extends Voice {
  constructor(sr) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'tone', name: 'Tone', def: 0.5 },
      { id: 'decay', name: 'Decay', def: 0.5 },
      PITCH, ...BD_EXTRA,
    ]);
    this.vppNormal = 3.5; this.vppAccent = 10;
    this.oversample = globalThis.BD_OS ?? 1;
    const c = (this.ckt = new Circuit(NODES));
    const V15 = 15;
    // trigger switch (Q40 collector)
    this.sw = c.Rsrc('T', 100, 0); this.sw.on = false;
    // Q41: trigger detector
    c.R('T', 'B41', 8.2e3); c.R('B41', 'gnd', 2.7e3);
    c.NPN('B41', 'C41n', 'gnd');
    // Q42: 4 ms mono-stable (R156 1M, C38 .1u)
    c.Rsrc('C41n', 1e6, V15); this.c38 = c.C('C41n', 'gnd', 0.1e-6);
    c.NPN('C41n', 'N42', 'gnd');
    c.Rsrc('N42', 22e3, V15);
    // re-trigger pulse: C39 .033u, D52, R161 1M into the network
    c.C('N42', 'N39', 0.033e-6); c.D('N39', 'gnd'); c.R('N39', 'M', 1e6);
    // Q43 shorts R165 while Q42 is off
    c.R('N42', 'B43', 100e3);
    c.NPN('B43', 'K', 'gnd');
    // input coupling into IC12a (+): C40/R163, R162, D53
    this.c40 = c.C('T', 'X', 0.015e-6); c.R('T', 'X', 100e3); c.R('X', 'gnd', 4.7e3); c.D('gnd', 'X');
    // IC12a with the bridged-T network
    c.OpAmp('X', 'P', 'Q');
    c.R('P', 'Q', 1e6);                 // R167
    // C41, C42: PITCH scales both by 1/m, which moves the bridged-T's
    // f = 1/(2 pi sqrt(R1 R2 C1 C2)) by m and leaves its Q alone
    this.cT = [c.C('P', 'M', 0.015e-6), c.C('M', 'Q', 0.015e-6)];
    c.R('M', 'K', 6.8e3);               // R166
    c.R('K', 'gnd', 47e3);              // R165
    // IC12b: inverting amp whose gain VR6 sets, fed back through R170
    c.R('Q', 'S', 47e3);                // R164
    c.OpAmp('gnd', 'S', 'O2');          // (+) via R168 22k, no current
    c.R('S', 'O2', 47e3);               // R169
    this.vr6 = c.R('S', 'N6', 250e3);   // VR6 500k (B)
    c.C('N6', 'O2', 33e-6);             // C43
    c.R('M', 'O2', 470e3);              // R170
    // tone: R171, VR5 10k (C) || R172 10k, C45 .1u; level pot as load
    c.R('Q', 'V3', 220);
    this.vr5 = c.R('V3', 'Tn', 5e3);
    c.C('Tn', 'gnd', 0.1e-6);
    c.C('Tn', 'L1', 0.47e-6);           // C47
    c.R('L1', 'gnd', 50e3);             // VR4 50k (assumed value)
    this.hp = new OnePole(sr, 2, 'hp');
    this.pulseLeft = 0;
    this.idle = 1e9;
    c.setTimestep(1 / (sr * this.oversample));
    this.onParam();
    this._settle();
  }
  onParam() {
    // VR6: wiper resistance; decay grows with feedback gain (R169 || VR6)/R164.
    this.vr6.g = 1 / Math.max(50, 500e3 * clamp(this.p.decay, 0, 1));
    // VR5 (C taper) in parallel with R172: more resistance = darker.
    const vr5 = 10e3 * Math.pow(1 - clamp(this.p.tone, 0, 1), 2) + 1;
    this.vr5.g = 1 / ((vr5 * 10e3) / (vr5 + 10e3));
    for (const cap of this.cT) cap.c = 0.015e-6 / pitchMul(this.p.pitch);
    this.c40.c = Math.max(1e-12, 0.015e-6 * amtMul(this.p.click));
    this.c38.c = 0.1e-6 * spanMul(this.p.attack, 3);
    this.ckt.touch();
  }
  _settle() { this.ckt.settle(2000); }
  trigger(accent = 0) {
    this.sw.v = busVoltage(accent);
    this.sw.on = true; this.ckt.touch();
    this.pulseLeft = Math.round(TRIG_WIDTH * this.sr * this.oversample);
    this.idle = 0;
  }
  render(out, n) {
    const c = this.ckt, L1 = c.idx.L1, os = this.oversample, lvl = this.p.level;
    // Stop simulating ~3 s after the last hit: the circuit is back at rest,
    // and resumes from that state on the next trigger.
    if (this.idle > 3 * this.sr) return;
    this.idle += n;
    for (let i = 0; i < n; i++) {
      let y = 0;
      for (let k = 0; k < os; k++) {
        if (this.pulseLeft > 0 && --this.pulseLeft === 0) { this.sw.on = false; c.touch(); }
        c.step();
        y += c.v[L1];
      }
      out[i] += this.hp.tick(y / os) * lvl * DIVIDER;
    }
  }
}
