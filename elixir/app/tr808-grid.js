// ---- the grid page: the pattern that plays, seven drums by sixteen steps, and 808 pattern presets over it ----
// A tap steps a cell through off, on, accent, off. The grid shows whatever plays: the generator's pattern (the beat
// page's genre, beat, energy...) until the first edit or preset, which copies it into the steps pattern (Elixir's
// steps tab) and plays that; "generator" hands back to the beat page. A preset sets the pattern, the 808 drum on each
// track and the tempo.
// Patterns: a track's 16 steps as a string, '.' off, 'x' on, 'X' accent; tracks dr1, dr2, dr3, sn, cy, cl (closed hat),
// op (open hat); drums: the 808 voice on each track (app/tr808.js)
const G8_PRESETS = [
  { name: 'electro', bpm: 122, drums: ['bd', 'lt', 'cp', 'sd', 'cy', 'ch', 'oh'],
    p: ['X.....x...X.....', '................', '................', '....X.......X...', '................', 'x.x.x.x.x.x.x.x.', '..............x.'] },
  { name: 'boom bap', bpm: 90, drums: ['bd', 'lt', 'rs', 'sd', 'cy', 'ch', 'oh'],
    p: ['X.........x..x..', '................', '.......x........', '....X.......X...', '................', 'x.x.x.x.x.x.x.x.', '................'] },
  { name: 'house', bpm: 124, drums: ['bd', 'lt', 'cp', 'sd', 'cy', 'ch', 'oh'],
    p: ['X...X...X...X...', '................', '....x.......x...', '................', '................', 'x...x...x...x...', '..x...x...x...x.'] },
  { name: 'trap', bpm: 140, drums: ['bd', 'lt', 'cp', 'sd', 'cy', 'ch', 'oh'],
    p: ['X......x..X.....', '................', '........X.......', '........X.......', '................', 'x.x.xxx.x.x.xxxx', '................'] },
  { name: 'miami', bpm: 130, drums: ['bd', 'lt', 'cp', 'sd', 'cy', 'ch', 'oh'],
    p: ['X..x..X...X..x..', '................', '....x.......x...', '....X.......X...', '................', 'x.xxx.xxx.xxx.xx', '................'] },
  { name: 'breaks', bpm: 128, drums: ['bd', 'lt', 'ht', 'sd', 'cy', 'ch', 'oh'],
    p: ['X.x.......x.....', '................', '................', '....X..x.x..X...', '................', 'x.x.x.x.x.x.x...', '..............X.'] },
  { name: 'toms', bpm: 116, drums: ['bd', 'lt', 'ht', 'sd', 'cb', 'ch', 'oh'],
    p: ['X.......X.......', '......x.....x.x.', '..x.......x.....', '....X.......X...', 'x..x..x...x.....', 'x.x.x.x.x.x.x.x.', '................'] },
  { name: 'congas', bpm: 112, drums: ['bd', 'lc', 'hc', 'rs', 'cl', 'ch', 'ma'],
    p: ['X.......X.......', '...x..x....x..x.', 'x.....x.x...x...', '....x.......x...', 'x..x..x...x.x...', '................', 'x.xxx.xxx.xxx.xx'] },
  { name: 'cowbell', bpm: 120, drums: ['bd', 'lt', 'cb', 'cp', 'cy', 'ch', 'oh'],
    p: ['X...X...X...X...', '................', 'x..x..x...x..x..', '....X.......X...', '................', '..x...x...x...x.', '................'] },
  { name: 'empty', bpm: null, drums: null, p: ['', '', '', '', '', '', ''] },
];
const G8_TRACK = ['dr1', 'dr2', 'dr3', 'sn', 'cy', 'cl', 'op'];
// what plays now: the steps pattern's first page, or the generator's
const g8Shown = () => (source === 'steps' ? pages[0] : pattern.pages ? pattern.pages[0] : pattern);
// first edit: what plays becomes the steps pattern, which plays from now on
function g8Take() {
  if (source === 'steps') return;
  copyInto(pages[0], g8Shown()); pageCount = 1; editPage = 0; grid = pages[0];
  setSource('steps'); drawGrid();
}
const g8Cells = [];
{
  const box = $('m-grid');
  G8_TRACK.forEach((name, t) => {
    const lab = document.createElement('span'); lab.className = 'm-g8-lab'; box.append(lab);
    g8Cells[t] = [];
    for (let s = 0; s < 16; s++) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'm-g8-cell' + (s % 4 === 0 ? ' beat' : '');
      c.addEventListener('click', () => {
        g8Take();
        const P = pages[0];
        // off -> on -> accent -> off
        if (!P.on[t][s]) { P.on[t][s] = 1; P.acc[t][s] = 0; } else if (!P.acc[t][s]) P.acc[t][s] = 1; else { P.on[t][s] = 0; P.acc[t][s] = 0; P.bar[t][s] = 0; }
        drawGrid(); sendSeq(); setDirty(true); g8Draw();
      });
      box.append(c); g8Cells[t].push(c);
    }
  });
  G8_PRESETS.forEach((pr) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'm-toggle'; b.textContent = pr.name;
    b.addEventListener('click', () => g8Load(pr));
    $('m-g8-presets').append(b);
  });
  $('m-g8-gen').addEventListener('click', () => { setSource('perform'); generate(); sendSeq(); g8Draw(); });
}
function g8Load(pr) {
  const P = pages[0];
  for (let t = 0; t < 7; t++) for (let s = 0; s < 16; s++) {
    const ch = pr.p[t][s] || '.';
    P.on[t][s] = ch === '.' ? 0 : 1; P.acc[t][s] = ch === 'X' ? 1 : 0; P.bar[t][s] = 0;
  }
  pageCount = 1; editPage = 0; grid = pages[0];
  if (source !== 'steps') setSource('steps');
  if (pr.drums) { t8.map = pr.drums.slice(); t8Save(); t8SendMap(); for (const id of t8.map) if (t8.models[id] === 'cached') t8LoadCached(id); t8Draw(); }
  if (pr.bpm) { setPerf('tempo', pr.bpm); drawPerf(); }
  g8Preset = pr.name;
  drawGrid(); sendSeq(); setDirty(true); mDrawAll(); g8Draw();
}
let g8Preset = null, g8Now = -1;
function g8Draw() {
  const P = g8Shown(), steps = source === 'steps';
  G8_TRACK.forEach((name, t) => {
    $('m-grid').children[t * 17].textContent = `${name} ${t8.map[t]}`;
    g8Cells[t].forEach((c, s) => {
      const on = !!P.on[t][s], acc = on && !!P.acc[t][s];
      c.classList.toggle('on', on); c.classList.toggle('acc', acc); c.classList.toggle('now', s === g8Now);
      c.setAttribute('aria-label', `${name} step ${s + 1}${on ? acc ? ', accent' : ', on' : ''}`);
    });
  });
  [...$('m-g8-presets').children].forEach((b) => b.setAttribute('aria-pressed', steps && b.textContent === g8Preset));
  $('m-g8-gen').setAttribute('aria-pressed', !steps);
  $('m-g8-what').textContent = steps ? g8Preset || 'your pattern' : 'generator';
}
// the playhead, and redraws when the generator or a preset load changes the pattern
const g8Mark = markStep;
markStep = (s) => { g8Mark(s); g8Now = s; if ($('m').dataset.page === 'grid' || !mWide.matches) g8Draw(); };
const g8Gen = generate;
generate = function () { const r = g8Gen.apply(this, arguments); g8Draw(); return r; };
perfDraws.push(g8Draw);
M_PAGE_NAMES.grid = 'grid';
g8Draw();
