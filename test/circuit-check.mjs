// Quick render of one circuit voice: Vpp, peaks, decay, CPU.
//   node test/circuit-check.mjs sd [param=value ...]
import { Kit } from '../dsp/kit.js';
const SR = 48000;
const id = process.argv[2];
const sets = process.argv.slice(3).map((s) => s.split('='));
function run(accent) {
  const kit = new Kit(SR); kit.solo = id; kit.master = 1; kit.setModel(id, 'circuit');
  kit.set(id, 'level', 1); for (const [k, v] of sets) kit.set(id, k, +v);
  const n = SR * 1.5, out = new Float32Array(n);
  const t0 = performance.now(); kit.trigger(id, accent, 0); kit.render(out, n);
  const ms = performance.now() - t0;
  const v = kit.voices[id]; const g = kit.VOLT ?? 1 / 24;
  for (let i = 0; i < n; i++) out[i] /= g;
  return [out, ms];
}
export function stats(x) {
  let lo = 0, hi = 0; for (const s of x) { lo = Math.min(lo, s); hi = Math.max(hi, s); }
  const w = 96; let pk = [], peak = 0;
  for (let i = 0; i < x.length; i += w) { let m = 0; for (let j = i; j < i + w; j++) m = Math.max(m, Math.abs(x[j] || 0)); pk.push(m); peak = Math.max(peak, m); }
  let last = 0; pk.forEach((m, i) => { if (m >= peak / 10) last = i; });
  return { vpp: hi - lo, decay: (last + 1) * w / SR * 1000 };
}
function peaks(x, count = 3) {
  const seg = x.subarray(0, SR * 0.25), res = [];
  for (let f = 30; f <= 12000; f *= 1.01) {
    const k = 2 * Math.cos(2 * Math.PI * f / SR); let s1 = 0, s2 = 0;
    for (let i = 0; i < seg.length; i++) { const s0 = seg[i] + k * s1 - s2; s2 = s1; s1 = s0; }
    res.push([f, s1 * s1 + s2 * s2 - k * s1 * s2]);
  }
  const loc = res.filter((r, i) => i > 0 && i < res.length - 1 && r[1] > res[i - 1][1] && r[1] >= res[i + 1][1]);
  return loc.sort((a, b) => b[1] - a[1]).slice(0, count).map((r) => Math.round(r[0]));
}
if (process.argv[1].endsWith('circuit-check.mjs')) {
  for (const acc of [0, 1]) {
    const [x, ms] = run(acc); const s = stats(x);
    let bad = x.some((v) => !Number.isFinite(v));
    console.log(id, acc ? 'accent' : 'normal', 'Vpp', s.vpp.toFixed(2), 'decay', s.decay.toFixed(0), 'ms  peaks', peaks(x).join('/'), ' cpu', (ms / 15).toFixed(1) + '%', bad ? 'NaN!' : '');
  }
}
