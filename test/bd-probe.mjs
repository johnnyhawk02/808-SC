import { BDCircuit } from '../voices/bd-circuit.js';
const SR = 48000;
const v = new BDCircuit(SR);
v.set('level', 1);
const c = v.ckt;
console.log('DC:', Object.fromEntries(c.names.map((n, i) => [n, +c.v[i].toFixed(3)])));
const N = SR * 1.2, out = new Float32Array(N);
const probe = { N42: [], K: [], Q: [], M: [] };
v.trigger(0);
const t0 = performance.now();
let maxIt = 0, sumIt = 0;
for (let i = 0; i < N; i++) {
  const b = new Float32Array(1); v.render(b, 1); out[i] = b[0];
  maxIt = Math.max(maxIt, c.iters); sumIt += c.iters;
  for (const k in probe) probe[k].push(c.v[c.idx[k]]);
}
const ms = performance.now() - t0;
console.log(`cpu: ${(ms / 1.2 / 10).toFixed(1)}% of realtime, Newton iters avg ${(sumIt / N).toFixed(2)} max ${maxIt}`);
// zero crossings -> instantaneous periods
let last = -1; const zc = [];
for (let i = 1; i < N; i++) if (out[i - 1] < 0 && out[i] >= 0) { if (last >= 0) zc.push([(i / SR * 1000).toFixed(1), (SR / (i - last)).toFixed(1)]); last = i; }
console.log('rising zero crossings [ms, Hz]:', zc.slice(0, 8));
let lo = 0, hi = 0; for (const s of out) { lo = Math.min(lo, s); hi = Math.max(hi, s); }
console.log('Vpp', (hi - lo).toFixed(2));
const at = (arr, ms) => arr[Math.round(ms * SR / 1000)].toFixed(2);
for (const ms of [0, 0.5, 1, 2, 3.9, 4.2, 5, 10]) console.log(ms, 'ms  N42', at(probe.N42, ms), ' K', at(probe.K, ms), ' Q', at(probe.Q, ms), ' M', at(probe.M, ms));
