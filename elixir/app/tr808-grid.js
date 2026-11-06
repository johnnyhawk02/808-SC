// ---- the grid page: a lane for each of the sixteen 808 sounds, sixteen steps, and 808 pattern presets over it ----
// A tap steps a cell through off, on, accent, off. The lanes play instead of the tracks' pattern (app/player.js:
// lanes808), each sound on its own track for the mixer (BUS808 there). "generator" hands back to the beat page's
// generated pattern on the tracks (one 808 sound a track, t8.map); the grid shows it in the sounds' lanes, and the
// first edit copies it into the lanes. The lanes are kept in this browser.
// Presets: each lane's 16 steps as a string, '.' off, 'x' on, 'X' accent, plus the tempo
const G8_PRESETS = [
  { name: 'trap', bpm: 140, l: { bd: 'X......x..X.....', sd: '........X.......', cp: '........X.......', ch: 'x.x.xxx.x.x.xxxx' } },
  { name: 'miami', bpm: 130, l: { bd: 'X..x..X...X..x..', sd: '....X.......X...', cp: '....x.......x...', ch: 'x.xxx.xxx.xxx.xx' } },
  { name: 'breaks', bpm: 128, l: { bd: 'X.x.......x.....', sd: '....X..x.x..X...', ch: 'x.x.x.x.x.x.x...', oh: '..............X.' } },
  { name: 'toms', bpm: 116, l: { bd: 'X.......X.......', lt: '......x.....x.x.', mt: '.....x.....x....', ht: '..x.......x.....', sd: '....X.......X...', cb: 'x..x..x...x.....', ch: 'x.x.x.x.x.x.x.x.' } },
  { name: 'congas', bpm: 112, l: { bd: 'X.......X.......', lc: '...x..x....x..x.', mc: '.x.......x......', hc: 'x.....x.x...x...', rs: '....x.......x...', cl: 'x..x..x...x.x...', ma: 'x.xxx.xxx.xxx.xx' } },
  { name: 'cowbell', bpm: 120, l: { bd: 'X...X...X...X...', cp: '....X.......X...', cb: 'x..x..x...x..x..', ch: '..x...x...x...x.', cy: 'X...............' } },
  { name: 'empty', bpm: null, l: {} },
];
const G8_IDS = T8_ORDER;
const G8_KEY = 'elixir808-lanes';
const g8Empty = () => Object.fromEntries(G8_IDS.map((id) => [id, { on: new Array(16).fill(0), acc: new Array(16).fill(0) }]));
const g8 = { mode: 'lanes', lanes: null, preset: null, sel: 'bd' };
try {
  const s = JSON.parse(localStorage.getItem(G8_KEY));
  if (s && s.lanes) {
    g8.lanes = g8Empty();
    for (const id of G8_IDS) for (let i = 0; i < 16; i++) { g8.lanes[id].on[i] = s.lanes[id]?.on?.[i] ? 1 : 0; g8.lanes[id].acc[i] = s.lanes[id]?.acc?.[i] ? 1 : 0; }
    g8.mode = s.mode === 'gen' ? 'gen' : 'lanes'; g8.preset = s.preset ?? null; if (T8_ORDER.includes(s.sel)) g8.sel = s.sel;
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
// to the audio thread, and the sounds the lanes play load their cached hits
function g8Send() {
  send({ type: 'lanes808', lanes: g8.mode === 'lanes' ? g8.lanes : null });
  if (g8.mode === 'lanes') for (const id of G8_IDS) if (g8.lanes[id].on.some(Boolean) && t8.models[id] === 'cached') t8LoadCached(id);
  g8Save();
}
// first edit: what plays becomes the lanes
function g8Take() {
  if (g8.mode === 'lanes') return;
  g8.lanes = g8FromTracks(); g8.mode = 'lanes'; g8.preset = null;
}
const g8Cells = {}, g8Labs = {};
{
  const box = $('m-grid');
  for (const id of G8_IDS) {
    const lab = document.createElement('button');
    lab.type = 'button'; lab.className = 'm-g8-lab'; lab.textContent = id; lab.title = `${T8_NAME[id]}: tap to hear it`;
    lab.addEventListener('click', () => { t8Audition(id); g8Select(id); });
    box.append(lab); g8Labs[id] = lab;
    g8Cells[id] = [];
    for (let s = 0; s < 16; s++) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'm-g8-cell' + (s % 4 === 0 ? ' beat' : '');
      c.addEventListener('click', () => {
        g8Take();
        const L = g8.lanes[id];
        // off -> on -> accent -> off
        if (!L.on[s]) { L.on[s] = 1; L.acc[s] = 0; g8Select(id); } else if (!L.acc[s]) L.acc[s] = 1; else { L.on[s] = 0; L.acc[s] = 0; }
        g8Send(); g8Draw();
      });
      box.append(c); g8Cells[id].push(c);
    }
  }
  G8_PRESETS.forEach((pr) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'm-toggle'; b.textContent = pr.name;
    b.addEventListener('click', () => g8Load(pr));
    $('m-g8-presets').append(b);
  });
  $('m-g8-gen').addEventListener('click', () => { g8.mode = 'gen'; setSource('perform'); generate(); sendSeq(); g8Send(); g8Draw(); });
}
// the side panel: the controls of the sound last put on a lane (or whose name was tapped)
for (const id of T8_ORDER) t8Card(id, $('m-g8-side'));
function g8Select(id) { g8.sel = id; g8Save(); g8Draw(); }
function g8Load(pr) {
  g8.lanes = g8Empty();
  for (const id in pr.l) for (let s = 0; s < 16; s++) {
    const ch = pr.l[id][s] || '.';
    g8.lanes[id].on[s] = ch === '.' ? 0 : 1; g8.lanes[id].acc[s] = ch === 'X' ? 1 : 0;
  }
  g8.mode = 'lanes'; g8.preset = pr.name;
  if (pr.bpm) { setPerf('tempo', pr.bpm); drawPerf(); sendSeq(); }
  g8Send(); mDrawAll(); g8Draw();
}
let g8Now = -1;
function g8Draw() {
  const L = g8Shown(), lanes = g8.mode === 'lanes';
  [...$('m-g8-side').children].forEach((c, i) => { c.hidden = T8_ORDER[i] !== g8.sel; });
  for (const id of G8_IDS) {
    g8Labs[id].classList.toggle('used', L[id].on.some(Boolean)); g8Labs[id].classList.toggle('sel', id === g8.sel);
    g8Cells[id].forEach((c, s) => {
      const on = !!L[id].on[s], acc = on && !!L[id].acc[s];
      c.classList.toggle('on', on); c.classList.toggle('acc', acc); c.classList.toggle('now', s === g8Now);
      c.setAttribute('aria-label', `${T8_NAME[id]} step ${s + 1}${on ? acc ? ', accent' : ', on' : ''}`);
    });
  }
  [...$('m-g8-presets').children].forEach((b) => b.setAttribute('aria-pressed', lanes && b.textContent === g8.preset));
  $('m-g8-gen').setAttribute('aria-pressed', !lanes);
  $('m-g8-what').textContent = lanes ? g8.preset || 'your pattern' : 'generator';
}
// the playhead, and redraws when the generator changes the pattern
const g8Mark = markStep;
markStep = (s) => { g8Mark(s); g8Now = s; if ($('m').dataset.page === 'grid' || !mWide.matches) g8Draw(); };
const g8Gen = generate;
generate = function () { const r = g8Gen.apply(this, arguments); if (g8.mode === 'gen') g8Draw(); return r; };
perfDraws.push(g8Draw);
M_PAGE_NAMES.grid = 'grid';
// first run: the first preset (its tempo too)
if (!g8.lanes) g8Load(G8_PRESETS[0]); else g8Send();
g8Draw();
