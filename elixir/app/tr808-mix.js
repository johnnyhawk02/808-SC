// ---- the mix page: a strip for each of the sixteen 808 sounds: echo send, reverb send, pan and level ----
// Each sound mixes on its own (app/player.js: vmix808), so these replace the six channels' strips (hidden). Kept in
// this browser. Pan 0..127 (63 the middle), as the channels' was; level 0..127 (127 is as loud as before).
const T8M_KEY = 'elixir808-vmix';
const T8M_0 = { echo: 0, verb: 0, pan: 63, vol: 127 };
const t8m = Object.fromEntries(T8_ORDER.map((id) => [id, { ...T8M_0 }]));
try {
  const s = JSON.parse(localStorage.getItem(T8M_KEY));
  if (s) for (const id of T8_ORDER) for (const k in T8M_0) if (typeof s[id]?.[k] === 'number') t8m[id][k] = s[id][k];
} catch (e) {}
const t8mSave = () => { try { localStorage.setItem(T8M_KEY, JSON.stringify(t8m)); } catch (e) {} };
const t8mNames = {};
const t8mSend = (id) => send({ type: 'vmix808', id, ...t8m[id] });
T8_ORDER.forEach(t8mSend);
{
  const box = $('m-808-mixer');
  for (const id of T8_ORDER) {
    const strip = document.createElement('div');
    strip.className = 'm-808-strip';
    const name = document.createElement('button');
    name.type = 'button'; name.className = 'm-808-vname'; name.textContent = id; name.title = `${T8_NAME[id]}: tap to hear it`;
    name.addEventListener('click', () => t8Audition(id));
    strip.append(name); t8mNames[id] = name; // (it lights as the sound hits, as on the grid: g8Flash)
    const knob = (label, k, min, max, show) => mFader(strip, label, { knob: true, min, max, get: () => t8m[id][k], show, dflt: T8M_0[k],
      set: (v) => { t8m[id][k] = v; t8mSave(); t8mSend(id); mDrawAll(); } });
    knob('echo', 'echo', 0, 100, (v) => (v ? String(v) : 'off'));
    knob('verb', 'verb', 0, 100, (v) => (v ? String(v) : 'off'));
    knob('pan', 'pan', 0, 127, (v) => (v === 63 ? 'C' : v < 63 ? `L${63 - v}` : `R${v - 63}`));
    mFader(strip, 'level', { knob: false, min: 0, max: 127, get: () => t8m[id].vol, show: String, dflt: 127,
      set: (v) => { t8m[id].vol = v; t8mSave(); t8mSend(id); mDrawAll(); } });
    box.append(strip);
  }
}
// the same, beside each sound's controls on the grid page: its echo and reverb sends and pan, over a tall level fader
// with its meter in it (the sound's own peak after its level and pan, from the audio thread's 'lvl' events)
const g8Meters = {};
for (const id of T8_ORDER) {
  const card = t8Cards[id].find((c) => c.closest('#m-g8-side'));
  if (!card) continue;
  const strip = document.createElement('div'); strip.className = 'm-g8-strip';
  const knob = (label, k, min, max, show) => mFader(strip, label, { knob: true, min, max, get: () => t8m[id][k], show, dflt: T8M_0[k],
    set: (v) => { t8m[id][k] = v; t8mSave(); t8mSend(id); mDrawAll(); } });
  knob('echo', 'echo', 0, 100, (v) => (v ? String(v) : 'off'));
  knob('verb', 'verb', 0, 100, (v) => (v ? String(v) : 'off'));
  knob('pan', 'pan', 0, 127, (v) => (v === 63 ? 'C' : v < 63 ? `L${63 - v}` : `R${v - 63}`));
  mFader(strip, 'level', { knob: false, min: 0, max: 127, get: () => t8m[id].vol, show: String, dflt: 127,
    set: (v) => { t8m[id].vol = v; t8mSave(); t8mSend(id); mDrawAll(); } });
  const meter = document.createElement('u'); meter.className = 'm-g8-meter'; meter.setAttribute('aria-hidden', 'true');
  strip.lastElementChild.querySelector('.m-vtrack').append(meter);
  g8Meters[id] = { el: meter, in: 0, db: -60 };
  card.append(strip);
}
// the meters: -48 dB to 0 dB up the fader, falling back at 30 dB a second
let g8MRaf = 0, g8MT = 0;
function g8MFrame(t) {
  const dt = g8MT ? Math.min(0.1, (t - g8MT) / 1000) : 0; g8MT = t;
  let live = false;
  for (const id in g8Meters) {
    const m = g8Meters[id], db = m.in > 0 ? 20 * Math.log10(m.in) : -99; m.in = 0;
    m.db = Math.max(db, m.db - 30 * dt, -48);
    m.el.style.height = `${((m.db + 48) / 48) * 100}%`;
    if (m.db > -48) live = true;
  }
  g8MRaf = live ? requestAnimationFrame(g8MFrame) : 0; if (!live) g8MT = 0;
}
const g8LvmFeed = lvmFeed;
lvmFeed = function (l, v) {
  g8LvmFeed(l);
  if (!v) return;
  for (const id in v) if (g8Meters[id] && v[id] > g8Meters[id].in) g8Meters[id].in = v[id];
  if (!g8MRaf) g8MRaf = requestAnimationFrame(g8MFrame);
};
