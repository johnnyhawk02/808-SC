// Every voice in all three models (Circuit, Cached, SC) at default knobs and with each knob at both ends:
// checks the SC model is stable (finite, no runaway) and prints each model's level against the circuit
// (RMS over the first 300 ms, dB). Cached plays the shipped hits, so it only follows Level, Decay and the clap's
// Snap; its numbers at the other knobs' ends just show how far those knobs move the circuit.
//   node test/ref-render.mjs all   (circuit renders, cached in test/.cache/)
//   node test/sc-check.mjs [ids...]
import { VOICES } from '../dsp/kit.js';
import { cases } from './match-lib.mjs';
import { circuitRender, scRender, cachedRender, rms, db, SR } from './sc-lib.mjs';

const only = process.argv.slice(2);
const TOL_DEFAULT = 1.5, TOL_KNOB = 6; // dB, SC against the circuit
let bad = 0;
const rows = [];
for (const [id] of VOICES) {
  if (only.length && !only.includes(id)) continue;
  const list = cases(id).filter((c) => !c.levelOnly);
  list.splice(2, 0, { name: 'd', accent: 0, knobs: { level: 0.8 }, secs: list[0].secs }); // the default Level (0.8)
  for (const cs of list) {
    const c = circuitRender(id, cs), s = scRender(id, cs), k = cachedRender(id, cs);
    // stability: finite, bounded, and quiet by the end of the render
    let finite = true, peak = 0;
    for (const x of s) { if (!Number.isFinite(x)) finite = false; peak = Math.max(peak, Math.abs(x)); }
    const tail = rms(s.subarray(s.length - Math.round(0.05 * SR)), 0.05);
    const stable = finite && peak < 30 && tail < Math.max(1e-3, 0.05 * rms(s));
    const dS = db(rms(s), rms(c)), dK = db(rms(k), rms(c));
    const tol = cs.name === 'n' || cs.name === 'a' || cs.name === 'd' ? TOL_DEFAULT : TOL_KNOB;
    const ok = stable && Math.abs(dS) <= tol;
    if (!ok) bad++;
    rows.push({ id, case: cs.name, 'circuit Vrms': rms(c).toFixed(3), 'SC dB': dS.toFixed(1), 'cached dB': dK.toFixed(1), 'SC peak V': peak.toFixed(2), stable: stable ? 'yes' : 'NO', check: ok ? '' : '<--' });
  }
}
console.table(rows);
console.log(bad ? `${bad} case(s) off (SC level more than ${TOL_DEFAULT} dB from the circuit at defaults, ${TOL_KNOB} dB at a knob end, or unstable)` : 'all cases ok');
process.exitCode = bad ? 1 : 0;
