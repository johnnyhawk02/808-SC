// OH / CH — hi-hats, component-level (voicing board, schematic p.13).
//
// Both take the IC3 high band (~7.1 kHz) of the metal bank.
// OH: Q7 (OH select) -> R135 10k -> Q24 (R131 22k + R180 10k load the
//   select line; their junction drives Q21), which charges
//   C62 .47u from the R136 100 R / C61 47u supply through R137 470 R. C62
//   leaks through R139 1M and is dumped through R134 100k by Q22 (decay) or
//   Q23 (choke, driven from the CH envelope through R173 330k).
//   C62 -> R140 33k -> follower Q29 (R143 33k) -> R144 33k -> the Q27 swing
//   VCA node (C64 .0015u, D13, Q27 with C67 .022u from IC3, 1M+1M bias,
//   R145 100 R, C65 .0015u). Then C66/C68 .0015u, R147 2.7k, R146 68k
//   Sallen-Key high-pass around Q26 (R156 22k to -15 V), C80 470p, R160
//   39k into IC7a (R159 470k, C79 220p, VR7 LEVEL 100k A + C81 33u).
// OH decay: Q21 holds C60 10u empty during the hit; afterwards it charges
//   from +15 V through VR3 (DECAY, 2M B) + R132 100k and turns Q22 on through
//   R133 10k, which then empties C62.
// CH: Q8 (CH select) -> R141 33k -> Q28 (collector from the same supply via
//   R138 470 R) charging C63 .47u; C63 -> R142 33k -> the Q30 VCA node (C69,
//   D14, Q30, C70); C72/C73 .001u, R153 2.7k, R155 68k high-pass around Q31
//   (R154 22k to -15 V); C74 470p, R162 33k into IC7b (R161 470k, C82 220p,
//   VR8 + C83 33u). C63 also drives the OH choke (R173 330k -> Q23).
import { CircuitVoice, aTaper } from './circuit-voice.js';
import { voicingTrigger } from './cb-circuit.js';

function swingHat(v, c, tag) {
  // IC3 high -> .022u -> VCA transistor (1M + 1M bias, 100 R emitter)
  v.feed(c, 'IH', 1, (i) => v.mc.hi[i]);
  c.C('IH', 'BQ', 0.022e-6); c.Rsrc('BQ', 2e6, 15);
  c.NPN('BQ', 'CQ', 'EQ'); c.R('EQ', 'gnd', 100);
  c.C('CQ', 'gnd', 0.0015e-6); c.D('Y', 'CQ'); c.C('Y', 'gnd', 0.0015e-6);
}
function hatMixer(v, m, rin, cin) {
  m.C('IE', 'NC', cin); m.R('NC', 'S', rin);
  m.OpAmp('gnd', 'S', 'OUT');
  m.R('S', 'OUT', 470e3); m.C('S', 'OUT', 220e-12);
  v.vrL = m.R('S', 'NV', 100e3); m.C('NV', 'OUT', 33e-6);
  v.iOut = m.idx.OUT; v.mix = m;
}

export class OHCircuit extends CircuitVoice {
  constructor(sr, shared) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'decay', name: 'Decay', def: 0.5 },
    ], shared);
    this.sleepAfter = 0.3;
    this.chokeFrom = null; // CH circuit voice (wired by the kit)
    const e = (this.s1 = this.stage(['T7', 'N131', 'B24', 'VC', 'C24', 'E24', 'N134', 'B23', 'B22', 'N60', 'B29', 'P15', 'E29']));
    this.addTrigger(e, 'T7');
    e.R('T7', 'B24', 10e3);                                                 // R135
    e.R('T7', 'N131', 22e3); e.R('N131', 'gnd', 10e3);                      // R131, R180
    e.Rsrc('VC', 100, 15); e.C('VC', 'gnd', 47e-6); e.R('VC', 'C24', 470);   // R136, C61, R137
    e.NPN('B24', 'C24', 'E24');                                             // Q24
    e.C('E24', 'gnd', 0.47e-6); e.R('E24', 'gnd', 1e6);                      // C62, R139
    e.R('E24', 'N134', 100e3);                                              // R134
    e.NPN('B22', 'N134', 'gnd'); e.NPN('B23', 'N134', 'gnd');               // Q22, Q23
    this.chokeHold = 0;
    this.chokeFeed = this.feed(e, 'B23', 330e3, (i) => (this.chokeHold > 0 ? 6 : this.chokeFrom ? this.chokeFrom.e28[i] ?? 0 : 0)); // R173
    this.vr3 = e.Rsrc('N60', 2.1e6, 15); e.C('N60', 'gnd', 10e-6);          // R132 + VR3, C60
    e.R('N60', 'B22', 10e3);                                                // R133
    e.NPN('N131', 'N60', 'gnd');                                            // Q21 (base at R131/R180)
    e.R('E24', 'B29', 33e3);                                                // R140
    this.rail(e, 'P15', 15);
    e.NPN('B29', 'P15', 'E29'); e.R('E29', 'gnd', 33e3);                    // Q29, R143
    const h = (this.s2 = this.stage(['IH', 'BQ', 'CQ', 'EQ', 'Y', 'N66', 'B26', 'E26', 'P15']));
    swingHat(this, h);
    this.link(h, 'Y', 33e3, e, 'E29'); this.link(e, 'E29', 33e3, h, 'Y');   // R144
    h.C('Y', 'N66', 0.0015e-6); h.C('N66', 'B26', 0.0015e-6);               // C66, C68
    h.R('N66', 'E26', 2.7e3); h.R('B26', 'gnd', 68e3);                      // R147, R146
    this.rail(h, 'P15', 15);
    h.NPN('B26', 'P15', 'E26'); h.Rsrc('E26', 22e3, -15);                   // Q26, R156
    h.tol = 1e-4;
    const m = (this.s3 = this.stage(['IE', 'NC', 'S', 'OUT', 'NV']));
    this.link(m, 'IE', 1, h, 'E26');
    hatMixer(this, m, 39e3, 470e-12);                                       // C80, R160, IC7a
    this.finish(3000, 0.3);
  }
  triggerVolts(accent) { return voicingTrigger(accent); }
  // used when CH plays its behavioural model: a 10 ms pulse into R173 stands
  // in for the circuit CH's envelope
  choke() { if (this.awake) this.chokeHold = Math.round(0.01 * this.sr); }
  post(i, n) { if (this.chokeHold > 0) this.chokeHold -= n; }
  onParam() {
    if (!this.vrL) return;
    this.vr3.g = 1 / (100e3 + 2e6 * this.p.decay);
    this.vrL.g = 1 / Math.max(1, 100e3 * aTaper(this.p.level));
    this.s1.touch(); this.mix.touch();
  }
  output() { return this.mix.v[this.iOut]; }
}

export class CHCircuit extends CircuitVoice {
  constructor(sr, shared) {
    super(sr, [{ id: 'level', name: 'Level', def: 0.8 }], shared);
    this.e28 = new Float32Array(128);
    const e = (this.s1 = this.stage(['T8', 'B28', 'VC', 'C28', 'E28']));
    this.addTrigger(e, 'T8');
    e.R('T8', 'gnd', 22e3); e.R('T8', 'B28', 33e3);                         // R13, R141
    e.Rsrc('VC', 100, 15); e.C('VC', 'gnd', 47e-6); e.R('VC', 'C28', 470);   // R136, C61, R138
    e.NPN('B28', 'C28', 'E28'); e.C('E28', 'gnd', 0.47e-6);                 // Q28, C63
    e.R('E28', 'gnd', 330e3);                                               // R173 into Q23 (load)
    const h = (this.s2 = this.stage(['IH', 'BQ', 'CQ', 'EQ', 'Y', 'N72', 'B31', 'E31', 'P15']));
    swingHat(this, h);
    this.link(h, 'Y', 33e3, e, 'E28'); this.link(e, 'E28', 33e3, h, 'Y');   // R142
    h.C('Y', 'N72', 0.001e-6); h.C('N72', 'B31', 0.001e-6);                 // C72, C73
    h.R('N72', 'E31', 2.7e3); h.R('B31', 'gnd', 68e3);                      // R153, R155
    this.rail(h, 'P15', 15);
    h.NPN('B31', 'P15', 'E31'); h.Rsrc('E31', 22e3, -15);                   // Q31, R154
    h.tol = 1e-4;
    const m = (this.s3 = this.stage(['IE', 'NC', 'S', 'OUT', 'NV']));
    this.link(m, 'IE', 1, h, 'E31');
    hatMixer(this, m, 33e3, 470e-12);                                       // C74, R162, IC7b
    this.iE28 = e.idx.E28;
    this.finish(3000, 0.3);
  }
  triggerVolts(accent) { return voicingTrigger(accent); }
  // expose C63's voltage per sample for the OH choke
  preRender(n) { if (this.e28.length < n) this.e28 = new Float32Array(n); }
  post(i, n, awake) {
    const v = this.s1.v[this.iE28];
    if (awake) this.e28[i] = v; else this.e28.fill(v, 0, n);
  }
  onParam() {
    if (!this.vrL) return;
    this.vrL.g = 1 / Math.max(1, 100e3 * aTaper(this.p.level));
    this.mix.touch();
  }
  output() { return this.mix.v[this.iOut]; }
}
