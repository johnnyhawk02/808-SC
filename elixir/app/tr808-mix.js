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
    strip.append(name);
    const knob = (label, k, min, max, show) => mFader(strip, label, { knob: true, min, max, get: () => t8m[id][k], show, dflt: T8M_0[k],
      set: (v) => { t8m[id][k] = v; t8mSave(); t8mSend(id); } });
    knob('echo', 'echo', 0, 100, (v) => (v ? String(v) : 'off'));
    knob('verb', 'verb', 0, 100, (v) => (v ? String(v) : 'off'));
    knob('pan', 'pan', 0, 127, (v) => (v === 63 ? 'C' : v < 63 ? `L${63 - v}` : `R${v - 63}`));
    mFader(strip, 'level', { min: 0, max: 127, get: () => t8m[id].vol, show: String, dflt: 127,
      set: (v) => { t8m[id].vol = v; t8mSave(); t8mSend(id); } });
    box.append(strip);
  }
}
