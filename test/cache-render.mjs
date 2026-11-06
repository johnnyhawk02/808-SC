// Renders the cached circuit hits (see dsp/cache.js) into cache/.
//   node test/cache-render.mjs            every voice, 4 processes
//   node test/cache-render.mjs bd sd      just these (index.json is updated)
// Each voice: dsp/cache-build.js at the default knob settings (the same code
// the bench's Cache button runs in the browser).
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { VOICES } from '../dsp/kit.js';
import { writeWav } from '../dsp/cache.js';
import { buildCache, OUT_SR } from '../dsp/cache-build.js';

const dir = new URL('../cache/', import.meta.url);
const args = process.argv.slice(2);

if (args[0] !== '--one') {
  const ids = args.length ? args : VOICES.map(([id]) => id);
  let running = 0, i = 0;
  const next = () => {
    if (i >= ids.length && running === 0) return writeIndex(ids);
    while (running < 4 && i < ids.length) {
      const id = ids[i++]; running++;
      const p = spawn(process.execPath, [new URL(import.meta.url).pathname, '--one', id], { stdio: 'inherit' });
      p.on('exit', (code) => { if (code) console.log(id, 'failed'); running--; next(); });
    }
  };
  next();
} else renderVoice(args[1]);

function writeIndex(ids) {
  const f = new URL('index.json', dir);
  const index = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  for (const id of ids) {
    const part = new URL(`${id}.json`, dir);
    if (!existsSync(part)) continue;
    index[id] = JSON.parse(readFileSync(part, 'utf8')); rmSync(part);
  }
  const sorted = Object.fromEntries(VOICES.map(([id]) => id).filter((id) => index[id]).map((id) => [id, index[id]]));
  writeFileSync(f, JSON.stringify(sorted));
  let bytes = 0; for (const id in sorted) bytes += 44 + 2 * sorted[id].normal.concat(sorted[id].accent, sorted[id].dryNormal ?? [], sorted[id].dryAccent ?? []).reduce((a, r) => a + r[1], 0);
  console.log(`index: ${Object.keys(sorted).length} voices, ${(bytes / 1e6).toFixed(1)} MB of WAV`);
}

function renderVoice(id) {
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const { info, pcm } = buildCache(id);
  delete info.knobs; // defaults: the player falls back to them
  writeFileSync(new URL(`${id}.wav`, dir), writeWav(pcm, OUT_SR));
  writeFileSync(new URL(`${id}.json`, dir), JSON.stringify(info));
  console.log(id, `${(pcm.length / OUT_SR).toFixed(1)} s audio, ${(pcm.length * 2 / 1e6).toFixed(2)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
