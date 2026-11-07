// ---- the grid page: eight patterns, a lane for each of the sixteen 808 sounds, sixteen steps ----
// A tap turns a step on (normal level) or off; cmd+tap (ctrl+tap) turns its accent on or off (on an empty step, an
// accented note). The pattern buttons over the grid pick which of the eight patterns
// plays and is edited (straight away, also while playing). The lanes play instead of the tracks' pattern
// (app/player.js: lanes808), each sound on its own track for the mixer (BUS808 there). "generator" hands back to the
// beat page's generated pattern on the tracks (one 808 sound a track, t8.map); the grid shows it in the sounds' lanes,
// and the first edit copies it into the pattern picked. The patterns are kept in this browser.
// A pattern is 1 to 4 bars (up to 64 steps); the bar buttons under the grid show one bar at a time and add or take off
// bars. The patterns start as these (each lane's first 16 steps, '.' off, 'x' on, 'X' accent); 7 and 8 start empty
const G8_SEEDS = [
  { bd: 'X......x..X.....', sd: '........X.......', cp: '........X.......', ch: 'x.x.xxx.x.x.xxxx' },
  { bd: 'X..x..X...X..x..', sd: '....X.......X...', cp: '....x.......x...', ch: 'x.xxx.xxx.xxx.xx' },
  { bd: 'X.x.......x.....', sd: '....X..x.x..X...', ch: 'x.x.x.x.x.x.x...', oh: '..............X.' },
  { bd: 'X.......X.......', lt: '......x.....x.x.', mt: '.....x.....x....', ht: '..x.......x.....', sd: '....X.......X...', cb: 'x..x..x...x.....', ch: 'x.x.x.x.x.x.x.x.' },
  { bd: 'X.......X.......', lc: '...x..x....x..x.', mc: '.x.......x......', hc: 'x.....x.x...x...', rs: '....x.......x...', cl: 'x..x..x...x.x...', ma: 'x.xxx.xxx.xxx.xx' },
  { bd: 'X...X...X...X...', cp: '....X.......X...', cb: 'x..x..x...x..x..', ch: '..x...x...x...x.', cy: 'X...............' },
  {}, {},
];
const G8_N = 8, G8_STEPS = 64; // (a pattern: 1 to 4 bars of 16 steps, g8.lens; the grid shows one bar, g8.page)
const G8_IDS = T8_ORDER;
const G8_KEY = 'elixir808-pats';
const g8Empty = () => Object.fromEntries(G8_IDS.map((id) => [id, { on: new Array(G8_STEPS).fill(0), acc: new Array(G8_STEPS).fill(0) }]));
const g8FromText = (l) => {
  const L = g8Empty();
  for (const id in l) for (let s = 0; s < 16; s++) { const ch = l[id][s] || '.'; L[id].on[s] = ch === '.' ? 0 : 1; L[id].acc[s] = ch === 'X' ? 1 : 0; }
  return L;
};
const g8Clean = (src) => {
  const L = g8Empty();
  for (const id of G8_IDS) for (let i = 0; i < G8_STEPS; i++) { L[id].on[i] = src?.[id]?.on?.[i] ? 1 : 0; L[id].acc[i] = src?.[id]?.acc?.[i] ? 1 : 0; }
  return L;
};
const g8 = { mode: 'lanes', pats: G8_SEEDS.map(g8FromText), lens: new Array(G8_N).fill(1), cur: 0, page: 0, sel: 'bd', bdTop: false };
// (the pattern picked: g8.lanes)
Object.defineProperty(g8, 'lanes', { get: () => g8.pats[g8.cur], set: (L) => { g8.pats[g8.cur] = L; }, enumerable: false });
try {
  const s = JSON.parse(localStorage.getItem(G8_KEY));
  if (s && Array.isArray(s.pats)) {
    for (let i = 0; i < G8_N; i++) if (s.pats[i]) g8.pats[i] = g8Clean(s.pats[i]);
    if (s.cur >= 0 && s.cur < G8_N) g8.cur = s.cur;
    if (Array.isArray(s.lens)) for (let i = 0; i < G8_N; i++) g8.lens[i] = Math.max(1, Math.min(4, s.lens[i] | 0 || 1));
    g8.mode = s.mode === 'gen' ? 'gen' : 'lanes'; if (T8_ORDER.includes(s.sel)) g8.sel = s.sel; g8.bdTop = s.bdTop === true;
  } else {
    // (from before the eight patterns: the one pattern becomes pattern 1)
    const o = JSON.parse(localStorage.getItem('elixir808-lanes'));
    if (o?.lanes) { g8.pats[0] = g8Clean(o.lanes); if (T8_ORDER.includes(o.sel)) g8.sel = o.sel; }
  }
} catch (e) {}
const g8Save = () => { try { localStorage.setItem(G8_KEY, JSON.stringify(g8)); } catch (e) {} };
// the generator's pattern (the tracks), in the lanes: each track's hits in its 808 sound's lane
function g8FromTracks() {
  const L = g8Empty(), P = source === 'steps' ? pages[0] : pattern.pages ? pattern.pages[0] : pattern;
  for (let t = 0; t < 7; t++) {
    const lane = L[t8.map[t]]; if (!lane) continue;
    for (let s = 0; s < 16; s++) if (P.on[t][s]) { lane.on[s] = 1; lane.acc[s] = lane.acc[s] || (P.acc[t][s] ? 1 : 0); }
  }
  return L;
}
const g8Shown = () => (g8.mode === 'lanes' ? g8.lanes : g8FromTracks());
// the bars of what plays (the generator's: one)
const g8Len = () => (g8.mode === 'lanes' ? g8.lens[g8.cur] : 1);
// to the audio thread, and the sounds the lanes play load their cached hits
function g8Send() {
  if (g8.page >= g8Len()) g8.page = g8Len() - 1;
  send({ type: 'lanes808', lanes: g8.mode === 'lanes' ? g8.lanes : null, pages: g8Len() });
  if (g8.mode === 'lanes') for (const id of G8_IDS) if (g8.lanes[id].on.some(Boolean) && t8.models[id] === 'cached') t8LoadCached(id);
  g8Save();
}
// first edit: what plays becomes the lanes
function g8Take() {
  if (g8.mode === 'lanes') return;
  g8.lanes = g8FromTracks(); g8.lens[g8.cur] = 1; g8.mode = 'lanes';
}
const g8Cells = {}, g8Labs = {}, g8LabsR = {};
{
  const box = $('m-grid');
  for (const id of G8_IDS) {
    const lab = document.createElement('button');
    lab.type = 'button'; lab.className = 'm-g8-lab'; lab.textContent = id; lab.title = `${T8_NAME[id]}: tap for its controls`;
    lab.addEventListener('click', () => g8Select(id));
    box.append(lab); g8Labs[id] = lab;
    g8Cells[id] = [];
    for (let s = 0; s < 16; s++) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'm-g8-cell' + (s % 4 === 0 ? ' beat' : '');
      c.addEventListener('click', (e) => {
        g8Take();
        const L = g8.lanes[id], k = g8.page * 16 + s;
        if (e.metaKey || e.ctrlKey) { if (!L.on[k]) { L.on[k] = 1; L.acc[k] = 1; g8Select(id); } else L.acc[k] = L.acc[k] ? 0 : 1; }
        else if (!L.on[k]) { L.on[k] = 1; L.acc[k] = 0; g8Select(id); } else { L.on[k] = 0; L.acc[k] = 0; }
        g8Send(); g8Draw();
      });
      box.append(c); g8Cells[id].push(c);
    }
  }
  // the names again on the right (after the lanes, so the beat-gap rules' child counts stay as they are)
  for (const id of G8_IDS) {
    const lab = g8Labs[id].cloneNode(true); lab.classList.add('right'); lab.addEventListener('click', () => g8Select(id));
    box.append(lab); g8LabsR[id] = lab;
  }
  for (let i = 0; i < G8_N; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'm-toggle'; b.textContent = String(i + 1); b.title = `pattern ${i + 1} (key ${i + 1})`;
    b.addEventListener('click', () => g8Pick(i));
    $('m-g8-presets').append(b);
  }
  // the bars: tap one to show it (one past the end adds it, empty); "-" takes the last one off
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'm-toggle'; b.textContent = String(i + 1);
    b.addEventListener('click', () => {
      g8Take();
      if (i >= g8.lens[g8.cur]) { const L = g8.lanes; for (const id of G8_IDS) for (let k = g8.lens[g8.cur] * 16; k < (i + 1) * 16; k++) { L[id].on[k] = 0; L[id].acc[k] = 0; } g8.lens[g8.cur] = i + 1; }
      g8.page = i; g8Send(); g8Draw();
    });
    $('m-g8-bars').append(b);
  }
  $('m-g8-less').addEventListener('click', () => { g8Take(); if (g8.lens[g8.cur] > 1) g8.lens[g8.cur]--; g8Send(); g8Draw(); });
  $('m-g8-gen').addEventListener('click', () => { g8.mode = 'gen'; setSource('perform'); generate(); sendSeq(); g8Send(); g8Draw(); });
}
// the side panel: the controls of the sound last put on a lane (or whose name was tapped)
// (over them, a button for each sound picks which one's controls show; picking doesn't play it)
const g8Picks = {};
{
  const row = document.createElement('div'); row.className = 'm-g8-picks'; row.setAttribute('aria-label', 'sound to edit');
  for (const id of T8_ORDER) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'm-toggle'; b.textContent = id; b.title = `${T8_NAME[id]}: its controls`;
    b.addEventListener('click', () => g8Select(id));
    row.append(b); g8Picks[id] = b;
  }
  $('m-g8-side').append(row);
}
for (const id of T8_ORDER) t8Card(id, $('m-g8-side'));
// Autocache: everything plays cached except the sound being edited. Picking a sound on the grid, or moving one of its
// knobs (here or on the 808 page), plays it on the circuit, so its knobs are heard as they move; moving away (another
// sound, or another page) caches it at its new knobs and plays that (if no knob moved, it just goes back to cached).
// Picking circuit by hand keeps it on the circuit.
let g8Auto = null, g8Quiet = 0; // { id, moved }
function g8Unauto() {
  const a = g8Auto; g8Auto = null;
  if (!a) return;
  if (a.moved) t8MakeCache(a.id); // (plays the circuit until its hits are ready, then cached)
  else if (t8.models[a.id] === 'circuit') g8SetModel(a.id, 'cached');
}
function g8Edit(id, moved) {
  if (g8Auto?.id !== id) {
    g8Unauto();
    if (t8.models[id] !== 'cached' && !moved) return;
    g8Auto = { id, moved: false };
  }
  if (moved) g8Auto.moved = true;
  if (t8.models[id] === 'cached') g8SetModel(id, 'circuit');
}
function g8Select(id) {
  g8Edit(id, false);
  g8.sel = id; g8Save(); g8Draw();
}
const g8SetKnob = t8SetKnob;
// (level and the clap's snap play live on the cached hits: no circuit, no new cache for those)
t8SetKnob = function (id, p, x, save = true) { if (save && !g8Quiet && !T8_LIVE.includes(p)) g8Edit(id, true); return g8SetKnob(id, p, x, save); };
const g8SetModel = t8SetModel;
t8SetModel = function (id, m) { if (m === 'circuit' && g8Auto?.id === id) g8Auto = null; return g8SetModel(id, m); };
// (revert puts the default knobs back: not an edit)
const g8Revert = t8Revert;
t8Revert = async function (id) { if (g8Auto?.id === id) g8Auto = null; g8Quiet++; try { return await g8Revert(id); } finally { g8Quiet--; } };
new MutationObserver(() => g8Unauto()).observe($('m'), { attributes: true, attributeFilter: ['data-page'] });
// the lanes' order: the kick at the bottom, the hats at the top (as a drum machine's rows run up the kit), or, in the
// options menu, the kick at the top
function g8Order() {
  G8_IDS.forEach((id, i) => {
    const row = String(g8.bdTop ? i + 1 : G8_IDS.length - i);
    g8Labs[id].style.gridRow = row; g8Labs[id].style.gridColumn = '1';
    g8LabsR[id].style.gridRow = row; g8LabsR[id].style.gridColumn = '18';
    g8Cells[id].forEach((c, s) => { c.style.gridRow = row; c.style.gridColumn = String(s + 2); });
  });
}
function g8SetBdTop(on) { g8.bdTop = on; g8Save(); g8Order(); }
function g8Pick(i) {
  g8.cur = i; g8.mode = 'lanes'; g8.page = 0;
  g8Send(); g8Draw();
}
let g8Now = -1, g8PlayPage = -1;
function g8Draw() {
  const L = g8Shown(), lanes = g8.mode === 'lanes', n = g8Len(), p0 = g8.page * 16;
  [...$('m-g8-side').querySelectorAll(':scope > .m-808-v')].forEach((c, i) => { c.hidden = T8_ORDER[i] !== g8.sel; });
  for (const id of T8_ORDER) { g8Picks[id].setAttribute('aria-pressed', id === g8.sel); g8Picks[id].classList.toggle('used', L[id].on.some(Boolean)); }
  for (const id of G8_IDS) {
    const used = L[id].on.some((v, k) => v && k < n * 16);
    for (const lab of [g8Labs[id], g8LabsR[id]]) { lab.classList.toggle('used', used); lab.classList.toggle('sel', id === g8.sel); }
    g8Cells[id].forEach((c, s) => {
      const on = !!L[id].on[p0 + s], acc = on && !!L[id].acc[p0 + s];
      c.classList.toggle('on', on); c.classList.toggle('acc', acc); c.classList.toggle('now', s === g8Now && g8PlayPage === g8.page);
      c.setAttribute('aria-label', `${T8_NAME[id]} step ${p0 + s + 1}${on ? acc ? ', accent' : ', on' : ''}`);
    });
  }
  [...$('m-g8-presets').children].forEach((b, i) => { b.setAttribute('aria-pressed', lanes && i === g8.cur); b.classList.toggle('used', G8_IDS.some((id) => g8.pats[i][id].on.some((v, k) => v && k < g8.lens[i] * 16))); });
  [...$('m-g8-bars').children].forEach((b, i) => {
    b.setAttribute('aria-pressed', i === g8.page); b.classList.toggle('in', i < n); b.classList.toggle('now', i === g8PlayPage && i < n);
    b.title = i < n ? `bar ${i + 1}: steps ${i * 16 + 1} to ${i * 16 + 16}` : `add bars up to ${i + 1} (${(i + 1) * 16} steps)`;
  });
  $('m-g8-less').disabled = n < 2;
  $('m-g8-gen').setAttribute('aria-pressed', !lanes);
  $('m-g8-what').textContent = lanes ? `pattern ${g8.cur + 1}` : 'generator';
}
// the playhead, and redraws when the generator changes the pattern
const g8Mark = markStep;
markStep = (s, bar) => { g8Mark(s); g8Now = s; g8PlayPage = s < 0 || bar === undefined ? -1 : bar % g8Len(); g8Flash(s); if ($('m').dataset.page === 'grid' || !mWide.matches) g8Draw(); };
// each sound's name, in its controls box (here and on the 808 page), lights for a moment as its step plays
function g8Flash(s) {
  if (s < 0) return;
  const L = g8Shown(), k = Math.max(0, g8PlayPage) * 16 + (s % 16);
  for (const id of G8_IDS) {
    if (!L[id].on[k]) continue;
    for (const card of t8Cards[id] || []) {
      const n = card.querySelector('.m-808-vname'); if (!n) continue;
      n.classList.add('hit'); clearTimeout(n._hit); n._hit = setTimeout(() => n.classList.remove('hit'), 60);
    }
  }
}
// (a drag that wanders off a knob mustn't start selecting the page's text; the help's text still selects)
document.addEventListener('selectstart', (e) => { const t = e.target.nodeType === 1 ? e.target : e.target.parentElement; if (!t?.closest('.m-help-text, input, textarea')) e.preventDefault(); });
const g8Gen = generate;
generate = function () { const r = g8Gen.apply(this, arguments); if (g8.mode === 'gen') g8Draw(); return r; };
perfDraws.push(g8Draw);
// Cmd+C (Ctrl+C) copies the pattern playing (or the generator's) and Cmd+V (Ctrl+V) pastes it over the pattern picked:
// copy on 1, press 3, paste. (Kept in this page only, not the system clipboard.)
let g8Clip = null;
function g8Note(t) { const w = $('m-g8-what'); w.textContent = t; clearTimeout(w._t); w._t = setTimeout(g8Draw, 1200); }
addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.target.closest?.('input, select, textarea') || $('m-menu')) return;
  const k = e.key.toLowerCase();
  if (k === 'c') { e.preventDefault(); g8Clip = g8Clean(g8Shown()); g8Clip.len = g8Len(); g8Note(`copied ${g8.mode === 'lanes' ? `pattern ${g8.cur + 1}` : 'the generator'}`); }
  else if (k === 'v' && g8Clip) { e.preventDefault(); g8.mode = 'lanes'; g8.lanes = g8Clean(g8Clip); g8.lens[g8.cur] = g8Clip.len; g8Send(); g8Draw(); g8Note(`pasted into pattern ${g8.cur + 1}`); }
});
M_PAGE_NAMES.grid = 'grid';
g8Order();
g8Send();
g8Draw();
