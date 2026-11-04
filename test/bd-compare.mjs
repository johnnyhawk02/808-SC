// Component-level BD vs. the behavioural BD vs. the manual's figures.
//   node test/bd-compare.mjs
import { BDCircuit } from '../voices/bd-circuit.js';
import { BD } from '../voices/bd.js';
import { CALIBRATION } from '../dsp/calibration.js';
const SR = 48000;

function render(make, { accent = 0, decay = 0.5, tone = 0.5, secs = 1.5 } = {}) {
  const v = make(); v.set('level', 1); v.set('decay', decay); v.set('tone', tone);
  const n = Math.round(secs * SR), out = new Float32Array(n);
  v.trigger(accent); v.render(out, n); return out;
}
const vpp = (x) => { let lo = 0, hi = 0; for (const s of x) { lo = Math.min(lo, s); hi = Math.max(hi, s); } return hi - lo; };
function decay10(x) {
  const w = 96; let peak = 0; const pk = [];
  for (let i = 0; i < x.length; i += w) { let m = 0; for (let j = i; j < i + w && j < x.length; j++) m = Math.max(m, Math.abs(x[j])); pk.push(m); peak = Math.max(peak, m); }
  let last = 0; pk.forEach((m, i) => { if (m >= peak / 10) last = i; }); return (last + 1) * w / SR * 1000;
}
function pitch(x) { // Hz from rising zero crossings: [first cycle, at ~100 ms, late]
  const z = []; for (let i = 1; i < x.length; i++) if (x[i - 1] < 0 && x[i] >= 0) z.push(i);
  const f = (k) => (z[k + 1] ? SR / (z[k + 1] - z[k]) : NaN);
  const k100 = z.findIndex((i) => i > SR * 0.1);
  return [f(0), f(k100), f(Math.min(z.length - 2, k100 + 6))].map((v) => v.toFixed(1));
}
const beh = () => { const v = new BD(SR); v.trimN = CALIBRATION.bd[0]; v.trimA = CALIBRATION.bd[1]; return v; };
const ckt = () => new BDCircuit(SR);

const rows = [];
for (const [label, opts] of [['normal, decay mid', {}], ['accent, decay mid', { accent: 1 }],
  ['normal, decay min', { decay: 0 }], ['normal, decay max', { decay: 1 }]]) {
  for (const [name, make] of [['behavioural', beh], ['circuit', ckt]]) {
    const x = render(make, opts);
    rows.push({ case: label, model: name, Vpp: vpp(x).toFixed(2), decay_ms: decay10(x).toFixed(0), 'Hz start/100ms/late': pitch(x).join(' / ') });
  }
}
console.table(rows);
console.log('manual: 56 Hz, 3.5 / 10 Vpp, decay 50 / 300 / 800 ms');

// WAVs: normal, accent, decay min, decay max — each model in its own file
import { writeFileSync } from 'node:fs';
function wav(path, data) {
  const n = data.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  writeFileSync(path, buf);
}
for (const [name, make] of [['behavioural', beh], ['circuit', ckt]]) {
  const parts = [{}, { accent: 1 }, { decay: 0 }, { decay: 1, secs: 2 }].map((o) => render(make, { secs: 1.2, ...o }));
  const all = new Float32Array(parts.reduce((s, p) => s + p.length, 0)); let off = 0;
  for (const p of parts) { for (let i = 0; i < p.length; i++) all[off + i] = p[i] / 14; off += p.length; }
  wav(new URL(`../renders/bd-sweep-${name}.wav`, import.meta.url), all);
}
console.log('wrote renders/bd-sweep-behavioural.wav and renders/bd-sweep-circuit.wav (normal, accent, short decay, long decay)');
