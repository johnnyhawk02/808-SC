// ---- the 808 page: the TR-808 voices (the bench's own code, bundled as TR808 by tr808-bundle.mjs) on Elixir's tracks ----
// Each of the seven tracks plays one of the sixteen 808 voices (no LXR voices: the LXR-02 engine is only the effects and
// the mix now), which takes the track's place in the engine's output (app/player.js: hit, render808), so the sequencer, accents, mixer, sends, sidechain and recorder
// work on it as on any voice. Each 808 voice plays as the circuit simulation or as cached hits, with its own knobs; the
// cache button renders a voice's hits at its current knobs in a worker, as on the bench, kept in this browser
// (IndexedDB tr808-cache, the bench's own, so caches made on either show up in both); revert brings the shipped ones back.
// The setup (which voice on which track, models, knobs) is kept in this browser, not in the presets.
const T8_IDS = TR808.VOICES.map(([id]) => id);
const T8_NAME = Object.fromEntries(TR808.VOICES.map(([id, name]) => [id, name.toLowerCase()]));
const T8_SPEC = new TR808.Kit(44100, { circuits: false }).spec(); // (no circuits: just the knob lists)
const T8_PARAMS = Object.fromEntries(T8_SPEC.map((v) => [v.id, v.params]));
const T8_LIVE = ['level', 'snap']; // knobs cached plays live; the cache button bakes the rest in
const T8_TRACKS = ['dr1', 'dr2', 'dr3', 'sn', 'cy', 'cl', 'op'];
const T8_KIT = ['bd', 'lt', 'ht', 'sd', 'cy', 'ch', 'oh'];
const T8_KEY = 'elixir808-tr808';
// the cache button records this many hits a voice, plain and accented each, played in random order, never the same one
// twice running (the shipped cache has 16)
const T8_HITS = 4;
// shipped cached hits: the bench's cache/ folder, beside this app's folder
const T8_CACHE_URL = new URL('../cache/', location.href);

const t8 = { map: T8_KIT.slice(), models: Object.fromEntries(T8_IDS.map((id) => [id, 'cached'])),
  values: Object.fromEntries(T8_SPEC.map((v) => [v.id, { ...v.values }])), track: 0 };
try {
  const s = JSON.parse(localStorage.getItem(T8_KEY));
  if (s) {
    if (Array.isArray(s.map) && s.map.length === 7) t8.map = s.map.map((id, t) => (T8_IDS.includes(id) ? id : T8_KIT[t]));
    for (const id of T8_IDS) {
      if (s.models?.[id] === 'circuit' || s.models?.[id] === 'cached') t8.models[id] = s.models[id];
      for (const p of T8_PARAMS[id]) if (typeof s.values?.[id]?.[p.id] === 'number') t8.values[id][p.id] = s.values[id][p.id];
    }
    if (s.track >= 0 && s.track < 7) t8.track = s.track;
  }
} catch (e) {}
const t8Save = () => { try { localStorage.setItem(T8_KEY, JSON.stringify(t8)); } catch (e) {} };

// ---- to the audio thread (send() queues until the audio starts) ----
const t8SendMap = () => send({ type: 'map808', map: t8.map.slice() });
for (const id of T8_IDS) {
  for (const p of T8_PARAMS[id]) send({ type: 'set808', id, param: p.id, value: t8.values[id][p.id] });
}
t8SendMap();

// cached hits: the shipped ones (fetched the first time a voice plays cached) or the ones made here
const t8Custom = {}, t8Jobs = {}, t8Sent = new Set(), t8Loading = {};
let t8Index = null;
async function t8LoadCached(id) {
  if (!t8Sent.has(id)) {
    t8Loading[id] ??= (async () => {
      await t8CustomReady;
      if (t8Custom[id]) { send({ type: 'cache808', id, info: t8Custom[id].info, pcm: t8Custom[id].pcm.slice(0) }); t8Sent.add(id); return; }
      t8Index ??= fetch(new URL('index.json', T8_CACHE_URL)).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
      const info = (await t8Index)[id];
      const buf = await (await fetch(new URL(`${id}.wav`, T8_CACHE_URL))).arrayBuffer();
      const pcm = TR808.readWav(buf).buffer;
      if (t8Custom[id]) return; // a cache press finished meanwhile and sent its own
      send({ type: 'cache808', id, info, pcm });
      t8Sent.add(id);
    })().catch((err) => { console.warn('808 cache load failed', id, err); delete t8Loading[id]; t8Missing.add(id); t8Draw(); });
    await t8Loading[id];
  }
}
const t8Missing = new Set(); // shipped hits that couldn't be fetched: cached falls back to the synth model
function t8SetModel(id, m) {
  t8.models[id] = m; t8Save();
  send({ type: 'model808', id, model: m });
  if (m === 'cached') t8LoadCached(id);
  t8Draw();
}

// ---- the cache button (as the bench's): IndexedDB tr808-cache, store hits, one entry per voice ----
const T8_DB = 'tr808-cache', T8_STORE = 'hits';
function t8Db() {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(T8_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(T8_STORE);
    r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
  });
}
async function t8DbDo(mode, fn) {
  const d = await t8Db();
  return new Promise((ok, fail) => {
    const tx = d.transaction(T8_STORE, mode), req = fn(tx.objectStore(T8_STORE));
    tx.oncomplete = () => { d.close(); ok(req?.result); }; tx.onerror = tx.onabort = () => { d.close(); fail(tx.error); };
  });
}
const t8CustomReady = (async () => {
  try {
    const keys = await t8DbDo('readonly', (st) => st.getAllKeys());
    const vals = await t8DbDo('readonly', (st) => st.getAll());
    keys.forEach((id, i) => {
      if (!T8_PARAMS[id] || !vals[i]?.info) return;
      t8Custom[id] = vals[i];
      // the knobs show what the cached hits were rendered at
      for (const [p, x] of Object.entries(vals[i].info.knobs ?? {})) t8SetKnob(id, p, x, false);
    });
  } catch (err) { console.warn('no saved 808 caches (IndexedDB unavailable)', err); }
  t8Draw();
})();
// the voices playing cached load their hits now (after any saved ones are read)
for (const id of T8_IDS) { send({ type: 'model808', id, model: t8.models[id] }); if (t8.models[id] === 'cached' && t8.map.includes(id)) t8LoadCached(id); }

function t8SetKnob(id, p, x, save = true) {
  t8.values[id][p] = x;
  send({ type: 'set808', id, param: p, value: x });
  if (save) t8Save();
}
// the worker: the engine script (it holds TR808) and the bench's cache-worker, as a classic worker from a blob
let t8WorkerUrl = null;
function t8Worker() {
  t8WorkerUrl ??= URL.createObjectURL(new Blob([document.getElementById('engine').textContent, `
self.onmessage = ({ data: { id, values, variants } }) => {
  try {
    let last = 0;
    const { info, pcm } = TR808.buildCache(id, values, (done, total) => {
      const now = Date.now();
      if (now - last > 150 || done === total) { last = now; self.postMessage({ t: 'progress', id, done, total }); }
    }, variants);
    self.postMessage({ t: 'done', id, info, pcm: pcm.buffer }, [pcm.buffer]);
  } catch (err) { self.postMessage({ t: 'error', id, message: String(err && err.message || err) }); }
};`], { type: 'text/javascript' }));
  return new Worker(t8WorkerUrl);
}
// one worker per voice being cached, so several voices render on several cores
function t8MakeCache(id) {
  if (t8Jobs[id] && !t8Jobs[id].error) return;
  const j = (t8Jobs[id] = { done: 0, total: 0 }); t8Draw();
  const w = t8Worker();
  const fail = (msg) => {
    w.terminate(); j.error = msg; t8Draw();
    setTimeout(() => { if (t8Jobs[id] === j) { delete t8Jobs[id]; t8Draw(); } }, 6000);
  };
  w.onerror = (e) => { e.preventDefault?.(); fail(e.message || 'worker failed'); };
  w.onmessage = async ({ data: m }) => {
    if (m.t === 'progress') { j.done = m.done; j.total = m.total; t8Draw(); return; }
    if (m.t === 'error') { fail(m.message); return; }
    w.terminate(); delete t8Jobs[id];
    const entry = { info: m.info, pcm: m.pcm, date: Date.now() };
    t8Custom[id] = entry; t8Missing.delete(id);
    t8DbDo('readwrite', (st) => st.put(entry, id)).catch((err) => console.warn('could not save 808 cache', err));
    await t8Loading[id]; // a shipped load in flight must not land after ours
    t8Sent.delete(id); delete t8Loading[id];
    t8SetModel(id, 'cached');
  };
  w.postMessage({ id, values: { ...t8.values[id] }, variants: T8_HITS });
}
async function t8Revert(id) {
  if (!t8Custom[id]) return;
  delete t8Custom[id];
  t8DbDo('readwrite', (st) => st.delete(id)).catch((err) => console.warn('could not delete 808 cache', err));
  await t8Loading[id];
  t8Sent.delete(id); delete t8Loading[id];
  for (const p of T8_PARAMS[id]) if (!T8_LIVE.includes(p.id)) t8SetKnob(id, p.id, p.def);
  if (t8.models[id] === 'cached') t8LoadCached(id);
  mDrawAll(); t8Draw();
}

// ---- the page ----
const t8TrackBtns = T8_TRACKS.map((name, t) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'm-btn'; b.setAttribute('role', 'tab');
  b.addEventListener('click', () => { t8.track = t; t8Save(); t8Draw(); });
  $('m-808-tracks').append(b);
  return b;
});
const t8PickBtns = T8_IDS.map((id) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'm-toggle'; b.textContent = id;
  b.title = T8_NAME[id];
  b.addEventListener('click', () => {
    t8.map[t8.track] = id; t8Save(); t8SendMap();
    if (id && t8.models[id] === 'cached') t8LoadCached(id);
    t8Draw();
  });
  $('m-808-pick').append(b);
  return b;
});
// each voice's knobs, built once, in its own box; the page shows the track's voice's box
const t8KnobBoxes = {};
for (const id of T8_IDS) {
  const box = document.createElement('div');
  box.className = 'm-808-set'; box.id = `m-808-set-${id}`; box.hidden = true;
  $('m-808-knobs').append(box);
  t8KnobBoxes[id] = box;
  for (const p of T8_PARAMS[id]) {
    mFader(box, p.name.toLowerCase(), { min: 0, max: 100, get: () => Math.round(t8.values[id][p.id] * 100), show: String, dflt: Math.round(p.def * 100),
      set: (v) => { t8SetKnob(id, p.id, v / 100); t8Draw(); } });
  }
}
document.querySelectorAll('[data-m808]').forEach((b) => b.addEventListener('click', () => {
  const id = t8.map[t8.track]; if (id) t8SetModel(id, b.dataset.m808);
}));
$('m-808-cache-go').addEventListener('click', () => { const id = t8.map[t8.track]; if (id) t8MakeCache(id); });
$('m-808-revert').addEventListener('click', () => { const id = t8.map[t8.track]; if (id) t8Revert(id); });
$('m-808-kit').addEventListener('click', () => {
  t8.map = T8_KIT.slice(); t8Save(); t8SendMap();
  for (const id of T8_KIT) if (t8.models[id] === 'cached') t8LoadCached(id);
  t8Draw();
});

const t8KnobText = (id, knobs) => T8_PARAMS[id].filter((p) => knobs?.[p.id] !== undefined).map((p) => `${p.name.toLowerCase()} ${Math.round(knobs[p.id] * 100)}`).join(' · ');
function t8Draw() {
  const id = t8.map[t8.track];
  t8TrackBtns.forEach((b, t) => { b.setAttribute('aria-selected', t === t8.track); b.textContent = `${T8_TRACKS[t]} ${t8.map[t]}`; });
  t8PickBtns.forEach((b, i) => b.setAttribute('aria-pressed', T8_IDS[i] === id));
  for (const k in t8KnobBoxes) t8KnobBoxes[k].hidden = k !== id;
  $('m-808-name').textContent = T8_NAME[id];
  document.querySelectorAll('[data-m808]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m808 === t8.models[id]));
  // the cache row, on every voice (one with only a level knob just gets new hits)
  const bake = T8_PARAMS[id].some((p) => !T8_LIVE.includes(p.id)), j = t8Jobs[id], c = t8Custom[id], st = $('m-808-status');
  $('m-808-cache-go').disabled = !!j && !j.error;
  $('m-808-revert').hidden = !c || !!j;
  if (j) st.textContent = j.error ? `failed: ${j.error}` : j.total ? `rendering ${Math.round(100 * j.done / j.total)}%…` : 'starting…';
  else if (t8Missing.has(id) && !c) st.textContent = 'shipped hits not found: cached plays the synth model';
  else if (!c) st.textContent = bake ? 'shipped hits, 16 (default knobs)' : 'shipped hits, 16';
  else {
    const k = c.info.knobs ?? {}, moved = Object.keys(k).some((p) => Math.abs((t8.values[id][p] ?? k[p]) - k[p]) > 1e-9);
    const n = c.info.normal.length;
    st.textContent = moved ? `your ${n} hits (knobs moved since)` : `your ${n} hits, random robin`;
    st.title = `cached plays your hits: ${t8KnobText(id, k)}`;
  }
}
M_PAGE_NAMES.t808 = '808';
t8Draw();
