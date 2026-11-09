// Cuts the shipped cache (cache/, 16 + 16 hits a voice, the bench's) down to one plain and one accented hit a voice
// (and the clap's dry twins) into cache1/, which is what the app ships and plays until you make your own.
// Run after test/cache-render.mjs: node test/cache-one.mjs
import fs from 'node:fs';
const src = 'cache/', dst = 'cache1/';
const index = JSON.parse(fs.readFileSync(src + 'index.json', 'utf8')), out = {};
fs.mkdirSync(dst, { recursive: true });
for (const [id, info] of Object.entries(index)) {
  const wav = fs.readFileSync(`${src}${id}.wav`), pcm = new Int16Array(wav.buffer, wav.byteOffset + 44, (wav.length - 44) >> 1);
  const parts = [], o = { ...info };
  let at = 0;
  for (const k of ['normal', 'accent', 'dryNormal', 'dryAccent']) {
    if (!info[k]) continue;
    const [s, n] = info[k][0];
    parts.push(pcm.subarray(s, s + n)); o[k] = [[at, n]]; at += n;
  }
  const b = Buffer.alloc(44 + at * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + at * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(info.sr, 24); b.writeUInt32LE(info.sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(at * 2, 40);
  let p = 44; for (const x of parts) { Buffer.from(x.buffer, x.byteOffset, x.byteLength).copy(b, p); p += x.byteLength; }
  fs.writeFileSync(`${dst}${id}.wav`, b); out[id] = o;
}
fs.writeFileSync(dst + 'index.json', JSON.stringify(out));
