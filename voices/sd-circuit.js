// SD — Snare Drum, component-level (schematic p.9 "SNARE DRUM").
//
// Stage 1, drum: trigger node TS (Q45/Q46 switch), both bridged-T
//   resonators of IC14 and the SNAPPY divider VR9/R199.
//   low:  + <- R189 100k || C57 .0068u, R190 680 to gnd;
//         C58/C59 .027u (C58 .056u revised), R196 680, R197 820k
//   high: + <- R191 8.2k (10k revised), R192 220 to gnd; C60/C61 .0068u
//         (C61 .015u revised), R195 2.2k, R198 1M
// Stage 2, snappy: VR9 wiper -> R186 33k -> Q47 emitter follower (collector
//   via R187 330 to the R193 100 / C55 47u supply) charging C51 .47u, then
//   R184 15k / C52 .1u / R185 15k / C53 .001u into D54 and the collector of
//   Q48, which amplifies the white-noise bus (C56 .022u in, R194 2.2M bias,
//   R188 100 || C54 .0027u emitter). The gated noise goes through the C66/C67
//   .0018u, R201 22k, R202 47k Sallen-Key high-pass around follower Q49
//   (R203 22k to -15 V).
// Stage 3, mixer: O1 -> C63 .047u -> VR8 (TONE, 100k B) <- C65 .047u <- R200
//   47k <- O2; wiper -> R204 100k; Q49 -> C69 .01u -> R205 27k; both into
//   IC13a with R210 470k, C70 220p and VR7 (LEVEL, 100k A) + C68 33u.
// The stage-1 -> stage-2 cut is the VR9 wiper, passed as its Thevenin
// equivalent (TS is driven from 100 R during the hit).
import { CircuitVoice, Pot, aTaper } from './circuit-voice.js';

// The schematic's "PORTION CHANGED" box (p.9): later boards use C58 .056u,
// C61 .015u, R191 10k and R200 shorted. The manual's voice-check table
// (238 / 476 Hz) was measured on the original values; the revision moves
// the drum to about 175 / 335 Hz.
export const SD_PARTS = {
  original: { c58: 0.027e-6, c61: 0.0068e-6, r191: 8.2e3, r200: 47e3 },
  revised: { c58: 0.056e-6, c61: 0.015e-6, r191: 10e3, r200: 1 },
};
export let SD_REVISION = 'revised';

export const meta = { id: 'sd', name: 'Snare Drum (circuit)', short: 'SD' };

export class SDCircuit extends CircuitVoice {
  constructor(sr, shared) {
    super(sr, [
      { id: 'level', name: 'Level', def: 0.8 },
      { id: 'tone', name: 'Tone', def: 0.5 },
      { id: 'snappy', name: 'Snappy', def: 0.5 },
    ], shared);
    // ---- stage 1: drum
    const P = SD_PARTS[SD_REVISION];
    const a = (this.s1 = this.stage(['TS', 'X1', 'P1', 'M1', 'O1', 'X2', 'P2', 'M2', 'O2']));
    this.addTrigger(a, 'TS');
    // VR9 10k + R199 1k load TS (wiper current to Q47 is negligible)
    a.R('TS', 'gnd', 11e3);
    a.R('TS', 'X1', 100e3); a.C('TS', 'X1', 0.0068e-6); a.R('X1', 'gnd', 680);
    a.OpAmp('X1', 'P1', 'O1');
    a.C('P1', 'M1', P.c58); a.C('M1', 'O1', 0.027e-6); a.R('M1', 'gnd', 680); a.R('P1', 'O1', 820e3); // C58, C59, R196, R197
    a.R('TS', 'X2', P.r191); a.R('X2', 'gnd', 220);
    a.OpAmp('X2', 'P2', 'O2');
    a.C('P2', 'M2', 0.0068e-6); a.C('M2', 'O2', P.c61); a.R('M2', 'gnd', 2.2e3); a.R('P2', 'O2', 1e6); // C60, C61, R195, R198
    // ---- stage 2: snappy envelope + noise VCA + high-pass
    const b = (this.s2 = this.stage(['B47', 'VC', 'C47', 'P15', 'E47', 'N52', 'NE', 'W', 'B48', 'E48', 'C48', 'F1', 'B49', 'E49']));
    b.tol = 1e-3; // noise-driven: 1 mV / 0.1 uA junction tolerance is inaudible
    const ts = a.idx.TS;
    this.wiper = this.feed(b, 'B47', 33e3, () => ts >= 0 ? a.v[ts] * this.k9 : 0);
    b.Rsrc('VC', 100, 15); b.C('VC', 'gnd', 47e-6);           // R193, C55
    b.R('C47', 'VC', 330); b.NPN('B47', 'C47', 'E47');       // R187, Q47
    this.rail(b, 'P15', 15);
    b.C('E47', 'gnd', 0.47e-6);                               // C51
    b.R('E47', 'N52', 15e3); b.C('N52', 'gnd', 0.1e-6);       // R184, C52
    b.R('N52', 'NE', 15e3); b.C('NE', 'gnd', 0.001e-6);       // R185, C53
    b.D('NE', 'C48');                                         // D54
    const wn = this.shared.noise;
    this.feed(b, 'W', 10, (i) => wn.wn[i]);                   // W.N. bus
    b.C('W', 'B48', 0.022e-6); b.Rsrc('B48', 2.2e6, 15);      // C56, R194
    b.NPN('B48', 'C48', 'E48');                               // Q48
    b.R('E48', 'gnd', 100); b.C('C48', 'gnd', 0.0027e-6);     // R188, C54 (collector to gnd)
    b.C('NE', 'F1', 0.0018e-6); b.C('F1', 'B49', 0.0018e-6);  // C66, C67
    b.R('B49', 'gnd', 47e3); b.R('F1', 'E49', 22e3);          // R202, R201
    b.NPN('B49', 'P15', 'E49');                               // Q49 follower
    b.Rsrc('E49', 22e3, -15);                                 // R203
    // ---- stage 3: mixer IC13a
    const m = (this.s3 = this.stage(['I1', 'A1', 'N200', 'A3', 'WT', 'I3', 'N69', 'S', 'OUT', 'NV']));
    this.link(m, 'I1', 1, a, 'O1'); m.C('I1', 'A1', 0.047e-6);           // C63
    this.link(m, 'N200', P.r200, a, 'O2'); m.C('N200', 'A3', 0.047e-6);    // R200, C65
    this.tone = new Pot(m, 'A1', 'WT', 'A3', 100e3);                     // VR8
    m.R('WT', 'S', 100e3);                                               // R204
    this.link(m, 'I3', 1, b, 'E49'); m.C('I3', 'N69', 0.01e-6); m.R('N69', 'S', 27e3); // C69, R205
    m.OpAmp('gnd', 'S', 'OUT');
    m.R('S', 'OUT', 470e3); m.C('S', 'OUT', 220e-12);                    // R210, C70
    this.vr7 = m.R('S', 'NV', 100e3); m.C('NV', 'OUT', 33e-6);           // VR7, C68
    this.iOut = m.idx.OUT;
    this.finish();
  }
  onParam() {
    // VR9 10k(B) between TS and R199 1k: wiper = TS * (1k + s*10k) / 11k,
    // seen through its Thevenin resistance plus R186 33k
    const s = this.p.snappy, lo = 1e3 + 10e3 * s, hi = 10e3 * (1 - s);
    this.k9 = lo / 11e3;
    if (this.wiper) { this.wiper.g = 1 / (33e3 + (lo * hi) / 11e3); this.s2.touch(); }
    this.tone?.set(1 - this.p.tone);
    if (this.vr7) { this.vr7.g = 1 / Math.max(1, 100e3 * aTaper(this.p.level)); this.s3.touch(); }
  }
  output() { return this.s3.v[this.iOut]; }
}
