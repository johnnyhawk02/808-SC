// ---- the reverb's impulse responses: the IR picker on the fx page, the built-in IRs (two made here, ten recorded rooms
// from the OpenAIR library in irs/, see irs/README.md) and your own, loaded from a file and kept in this browser.
// Each is decoded at the engine's rate, cut to the length knob and split into the convolution's parts (IrVerb.prepare),
// then sent to the player ----
const IR_LIST = [['plate', 'plate'], ['gated', 'gated 80s'], ['wood-shop', 'wood shop'], ['living-room', 'living room'],
  ['small-church', 'small church'], ['rail-tunnel', 'rail tunnel'], ['empty-bedroom', 'empty bedroom'], ['club-hall', 'club hall'],
  ['inside-piano', 'inside piano'], ['car-park', 'car park'], ['midiverb-ii', 'midiverb ii'], ['cathedral', 'cathedral']];
const IR_DB = 'elixir808-irs';
// (var: sendMix can run before this file has)
var irSt = null;
// two made here: a plate (dense, bright, 2.4 s) and the 80s gated snare reverb (a burst of reverb cut off at 280 ms)
function irSynth(kind) {
  const fs = LXR.REAL_FS, n = Math.round((kind === 'plate' ? 2.4 : 0.32) * fs), ch = [new Float32Array(n), new Float32Array(n)];
  let seed = kind === 'plate' ? 7 : 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 1073741823.5 - 1);
  ch.forEach((y) => {
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / fs, x = rnd();
      if (kind === 'plate') {
        // decays 60 dB in 2.4 s, getting darker as it goes
        const a = Math.max(0.08, Math.exp(-t * 1.6)); lp += a * (x - lp);
        y[i] = (0.35 * x * Math.exp(-t * 40) + lp) * Math.exp(-6.9 * t / 2.4) * Math.min(1, i / 40);
      } else {
        lp += 0.45 * (x - lp);
        y[i] = lp * Math.min(1, t / 0.004) * (1 - 0.35 * t / 0.28) * (t > 0.28 ? Math.max(0, 1 - (t - 0.28) / 0.02) : 1);
      }
    }
  });
  return ch;
}
function irDb() {
  return new Promise((ok, no) => { const r = indexedDB.open(IR_DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('irs'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
}
async function irDbDo(mode, fn) {
  const db = await irDb();
  return new Promise((ok, no) => { const tx = db.transaction('irs', mode), r = fn(tx.objectStore('irs')); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => no(tx.error); });
}
async function irDecode(buf) {
  const a = await new OfflineAudioContext(2, 1, LXR.REAL_FS).decodeAudioData(buf);
  return [a.getChannelData(0), a.numberOfChannels > 1 ? a.getChannelData(1) : a.getChannelData(0)];
}
// the IR by name: made here, fetched from irs/ or (user:...) read from this browser
async function irRaw(name) {
  if (irSt.raw[name]) return irSt.raw[name];
  let ch;
  if (name === 'plate' || name === 'gated') ch = irSynth(name);
  else if (name.startsWith('user:')) { const d = await irDbDo('readonly', (s) => s.get(name)); if (!d) throw new Error('no such IR'); ch = await irDecode(d.slice(0)); }
  else { const r = await fetch(`irs/${name}.wav`); if (!r.ok) throw new Error(r.status); ch = await irDecode(await r.arrayBuffer()); }
  return (irSt.raw[name] = ch);
}
// called by sendMix with the IR and the length knob: (re)builds and sends when either changed
function irWant(name, len) {
  if (!irSt) return;
  const key = `${name}|${len}`;
  if (key === irSt.want) return;
  irSt.want = key;
  clearTimeout(irSt.t);
  irSt.t = setTimeout(async () => {
    let ch;
    try { ch = await irRaw(name); } catch (e) {
      console.warn('reverb IR', name, e);
      if (name !== 'plate') { fx3.ir = 'plate'; irDraw(); sendMix(); }
      return;
    }
    if (irSt.want !== key) return;
    send({ type: 'verbIr', h: IrVerb.prepare(ch[0], ch[1], 0.1 + 0.9 * len / 127) });
  }, irSt.raw[name] ? 60 : 0);
}
function irDraw() {
  const sel = $('m-ir');
  if (![...sel.options].some((o) => o.value === fx3.ir)) sel.append(new Option(fx3.ir.replace(/^user:/, ''), fx3.ir));
  sel.value = fx3.ir;
  $('m-ir-del').hidden = !fx3.ir.startsWith('user:');
}
async function irFill() {
  const sel = $('m-ir'); sel.innerHTML = '';
  const b = document.createElement('optgroup'); b.label = 'built in';
  for (const [k, l] of IR_LIST) b.append(new Option(l, k));
  sel.append(b);
  let mine = [];
  try { mine = (await irDbDo('readonly', (s) => s.getAllKeys())) || []; } catch (e) { /* (no IndexedDB: no saved IRs) */ }
  if (mine.length) {
    const u = document.createElement('optgroup'); u.label = 'yours';
    for (const k of mine.sort()) u.append(new Option(k.replace(/^user:/, ''), k));
    sel.append(u);
  }
  irDraw();
}
irSt = { want: null, raw: {}, t: 0 };
mDraws.push(irDraw);
$('m-ir').addEventListener('change', () => { fx3.ir = $('m-ir').value; irDraw(); sendMix(); setDirty(true); });
$('m-ir-load').addEventListener('click', () => $('m-ir-file').click());
// your own: any audio file the browser can read (wav, aiff, mp3...), up to 5 s used; kept by its file name
$('m-ir-file').addEventListener('change', async () => {
  const f = $('m-ir-file').files[0]; $('m-ir-file').value = '';
  if (!f) return;
  const name = 'user:' + f.name.replace(/\.[^.]+$/, '').slice(0, 40), buf = await f.arrayBuffer();
  try { irSt.raw[name] = await irDecode(buf.slice(0)); } catch (e) { alert(`Couldn't read ${f.name} as audio.`); return; }
  try { await irDbDo('readwrite', (s) => s.put(buf, name)); } catch (e) { /* (kept for this visit only) */ }
  irSt.want = null; fx3.ir = name; await irFill(); sendMix(); setDirty(true);
});
$('m-ir-del').addEventListener('click', async () => {
  const name = fx3.ir; if (!name.startsWith('user:') || !confirm(`Remove ${name.slice(5)} from your IRs?`)) return;
  try { await irDbDo('readwrite', (s) => s.delete(name)); } catch (e) { /* */ }
  delete irSt.raw[name]; fx3.ir = 'plate'; await irFill(); sendMix(); setDirty(true);
});
irFill().then(sendMix);
