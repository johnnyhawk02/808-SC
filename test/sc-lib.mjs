// Shared bits for the SC model's checks (test/sc-calibrate.mjs, test/sc-check.mjs).
import { readFileSync, existsSync } from 'node:fs';
import { Kit } from '../dsp/kit.js';
import { readWav } from '../dsp/cache.js';
import { render, SR } from './match-lib.mjs';
export { SR };

// The circuit's render of one knob case, from test/.cache/ (node test/ref-render.mjs <id>), or rendered now.
export function circuitRender(id, cs) {
  const f = new URL(`./.cache/${id}-${cs.name}.f32`, import.meta.url);
  if (existsSync(f)) { const b = readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); }
  return render(id, 'circuit', cs);
}
export const scRender = (id, cs) => render(id, 'sc', cs);
// the cached model, with the shipped hits (cache/)
const index = JSON.parse(readFileSync(new URL('../cache/index.json', import.meta.url), 'utf8'));
export function cachedRender(id, cs) {
  const kit = new Kit(SR, { circuits: false });
  const b = readFileSync(new URL(`../cache/${id}.wav`, import.meta.url));
  kit.loadCache(id, index[id], readWav(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
  return render(id, 'cached', cs, { kit });
}
// RMS over [0, secs)
export function rms(x, secs = 0.3) {
  const n = Math.min(x.length, Math.round(secs * SR)); let s = 0;
  for (let i = 0; i < n; i++) s += x[i] * x[i];
  return Math.sqrt(s / n);
}
export const db = (a, b) => 20 * Math.log10((a + 1e-12) / (b + 1e-12));
