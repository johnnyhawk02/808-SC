// ---- the rush graph (settings › rush): how the rush changes as it rises 0..100%, a lane each for the roll's speed, the
// other drums, the kick and the high-pass, drawn from the rush settings (rushSet, app/rush-set.js; saved with each
// preset); dragging a break point changes it, as the desktop's rush settings do ----
// the lanes: each a curve over rush 0..100 (its y 0..1, bottom to top) and its break points, each moving one setting
// along x (a rush %) or, at 100%, up and down
const RG_ROLL = ['1/16', '1/32', '1/64', '1/128', '1/256'];
const rgHz = (v) => (v < 1000 ? `${v} Hz` : `${+(v / 1000).toFixed(1)} kHz`);
const RG_LANES = [
  { name: 'roll speed', ticks: RG_ROLL,
    // the roll, in log2 of hits a step: 16ths from the start, 32nds halfway to the 1/32 point, then free up to the top speed
    curves: () => [(R) => { const S = rushSet; if (R <= S.start) return null; if (R <= S.p32) return (R > (S.start + S.p32) / 2 ? 1 : 0) / 4;
      return (1 + (R - S.p32) * (S.top - 1) / (100 - S.p32)) / 4; }],
    points: [{ k: 'start', x: () => rushSet.start, y: () => 0, say: (v) => `roll starts at ${v}%` },
      { k: 'p32', x: () => rushSet.p32, y: () => 0.25, say: (v) => `free roll from ${v}%` },
      { k: 'top', x: () => 100, y: () => rushSet.top / 4, vert: (y) => Math.max(2, Math.min(4, Math.round(y * 4))), say: (v) => `top speed ${RG_ROLL[v]}` }] },
  { name: 'other drums', key: ['drums', 'hats'],
    curves: () => [(R) => 1 - Math.pow(Math.min(1, R / rushSet.only), 2.5), (R) => 1 - Math.pow(Math.min(1, R / rushSet.hats), 2.5)],
    points: [{ k: 'hats', x: () => rushSet.hats, y: () => 0, say: (v) => `hats gone by ${v}%` },
      { k: 'only', x: () => rushSet.only, y: () => 0, say: (v) => `only the roll from ${v}%` }] },
  { name: 'kick', ticks: ['none', 'first', 'all four'],
    curves: () => [(R) => (R < rushSet.kicks ? 1 : R < rushSet.first ? 0.5 : 0)],
    points: [{ k: 'kicks', x: () => rushSet.kicks, y: () => 1, say: (v) => `all four kicks until ${v}%` },
      { k: 'first', x: () => rushSet.first, y: () => 0.5, say: (v) => `first kick only until ${v}%` }] },
  { name: 'high-pass', ticks: ['30 Hz'],
    // the cutoff in log Hz, 30 Hz to 5 kHz up the lane
    curves: () => [(R) => { const S = rushSet, top = Math.log(S.hpTop / 30) / Math.log(5000 / 30); return R <= S.hp ? 0 : top * (R - S.hp) / (100 - S.hp); }],
    points: [{ k: 'hp', x: () => rushSet.hp, y: () => 0, say: (v) => `filter starts at ${v}%` },
      { k: 'hpTop', x: () => 100, y: () => Math.log(rushSet.hpTop / 30) / Math.log(5000 / 30),
        vert: (y) => Math.max(300, Math.min(5000, Math.round(30 * Math.pow(5000 / 30, y) / 50) * 50)), say: (v) => `filter top ${rgHz(v)}` }] },
];
const RG_RANGE = { start: [0, 98], p32: [1, 99], hats: [1, 100], only: [1, 100], kicks: [0, 100], first: [0, 100], hp: [0, 99] };
let rgBox = null, rgDrag = null;
// the lanes' boxes in the svg's own pixels: a column of labels at the left, the lanes stacked with a gap
function rgLayout() {
  const svg = $('m-rushg'), r = svg.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height);
  const L = 58, Rp = 14, gap = 24, top = 18, bot = 22, h = (H - top - bot - gap * (RG_LANES.length - 1)) / RG_LANES.length;
  return { W, H, L, Rp, lanes: RG_LANES.map((ln, i) => ({ ln, x0: L, x1: W - Rp, y0: top + i * (h + gap), y1: top + i * (h + gap) + h })) };
}
// (x is stretched toward the top, where the rush does its work: rush^3, so 75% is under halfway and 90..100% a quarter)
const rgX = (b, R) => b.x0 + (b.x1 - b.x0) * Math.pow(R / 100, 3), rgY = (b, y) => b.y1 - (b.y1 - b.y0) * y;
const rgR = (b, x) => 100 * Math.cbrt(Math.max(0, Math.min(1, (x - b.x0) / (b.x1 - b.x0))));
function mRushDraw() {
  const svg = $('m-rushg'); if ($('m-set').hidden || svg.closest('[hidden]')) return;
  const G = rgBox = rgLayout(); if (G.W < 50 || G.H < 50) return;
  svg.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
  let s = '';
  for (const b of G.lanes) {
    const { ln } = b;
    s += `<rect class="rg-lane" x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="${b.y1 - b.y0}"/>`;
    s += `<text class="rg-name" x="${b.x0}" y="${b.y0 - 4}">${ln.name}</text>`;
    // (on a short lane, every other tick)
    (ln.ticks || []).forEach((t, i, a) => { if (b.y1 - b.y0 < 90 && a.length > 3 && i % 2) return; const y = rgY(b, a.length === 1 ? 0 : i / (a.length - 1)); s += `<text class="rg-tick" x="${b.x0 - 6}" y="${y + 4}">${t}</text>`; });
    if (ln.key) s += `<text class="rg-tick" x="${b.x0 - 6}" y="${b.y0 + 12}">${ln.key[0]}</text><text class="rg-tick rg-dash" x="${b.x0 - 6}" y="${b.y0 + 26}">${ln.key[1]}</text>`;
    // the curves, sampled every half per cent (a step stays a step)
    ln.curves().forEach((f, c) => {
      let d = '', pen = false;
      for (let R = 0; R <= 100; R += 0.5) { const y = f(R); if (y === null) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${rgX(b, R).toFixed(1)},${rgY(b, y).toFixed(1)}`; pen = true; }
      s += `<path class="rg-curve${c ? ' rg-dash' : ''}" d="${d}"/>`;
    });
    for (const pt of ln.points) s += `<rect class="rg-pt${rgDrag && rgDrag.pt === pt ? ' on' : ''}" x="${rgX(b, pt.x()) - 8}" y="${rgY(b, pt.y()) - 8}" width="16" height="16"/>`;
  }
  // the rush now, and the 0..100% scale under the lanes
  const last = G.lanes[G.lanes.length - 1], nowX = rgX(last, perf.rush);
  s += `<line class="rg-now" x1="${nowX}" y1="${G.lanes[0].y0}" x2="${nowX}" y2="${last.y1}"/>`;
  for (const R of [0, 50, 75, 90, 100]) s += `<text class="rg-tick rg-mid" x="${rgX(last, R)}" y="${G.H - 4}">${R}%</text>`;
  svg.innerHTML = s;
}
// a drag picks the nearest point within reach (28 px), then moves it: along x for a break point, up and down for one at 100%
$('m-rushg').addEventListener('pointerdown', (e) => {
  if (!rgBox) return;
  const r = $('m-rushg').getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  let best = null, bd = 28;
  for (const b of rgBox.lanes) for (const pt of b.ln.points) { const d = Math.hypot(rgX(b, pt.x()) - px, rgY(b, pt.y()) - py); if (d < bd) { bd = d; best = { b, pt }; } }
  if (!best) return;
  rgDrag = best; $('m-rushg').setPointerCapture(e.pointerId); e.preventDefault(); rgMove(e);
});
function rgMove(e) {
  if (!rgDrag) return;
  const { b, pt } = rgDrag, r = $('m-rushg').getBoundingClientRect();
  let v;
  if (pt.vert) v = pt.vert((b.y1 - (e.clientY - r.top)) / (b.y1 - b.y0));
  else { const [lo, hi] = RG_RANGE[pt.k]; v = Math.max(lo, Math.min(hi, Math.round(rgR(b, e.clientX - r.left)))); if (rushClamp[pt.k]) v = rushClamp[pt.k](v); }
  if (v !== rushSet[pt.k]) { rushSet[pt.k] = v; saveRushSet(); sendRushSet(); setDirty(true); }
  $('m-rush-say').textContent = pt.say(v);
  mRushDraw();
}
$('m-rushg').addEventListener('pointermove', rgMove);
for (const t of ['pointerup', 'pointercancel']) $('m-rushg').addEventListener(t, () => { rgDrag = null; mRushDraw(); });
// the glides: how quickly the roll's speed and the filter follow the rush
const RG_GLIDES = [['rollMs', 'roll glide'], ['hpMs', 'filter glide']];
const rgGlideDraws = RG_GLIDES.map(([k, label]) => {
  const row = document.createElement('div'); row.className = 'm-seq-lenrow';
  row.innerHTML = `<span>${label}</span><div class="m-seq-len" role="slider" aria-label="${label}"><i></i></div><output></output>`;
  $('m-rush-glides').append(row);
  const bar = row.querySelector('.m-seq-len'), out = row.querySelector('output');
  const draw = () => { bar.style.setProperty('--w', rushSet[k] / 500); out.textContent = `${rushSet[k]} ms`; };
  const set = (e) => { const r = bar.getBoundingClientRect(); rushSet[k] = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100) * 5; draw(); saveRushSet(); sendRushSet(); setDirty(true); };
  bar.addEventListener('pointerdown', (e) => { bar.setPointerCapture(e.pointerId); set(e); });
  bar.addEventListener('pointermove', (e) => { if (bar.hasPointerCapture(e.pointerId)) set(e); });
  draw(); return draw;
});
$('m-rush-reset').addEventListener('click', () => { Object.assign(rushSet, RUSH_DFLT); saveRushSet(); sendRushSet(); setDirty(true); rgGlideDraws.forEach((d) => d()); $('m-rush-say').textContent = 'back to the defaults'; mRushDraw(); });
addEventListener('resize', mRushDraw);
// the rush-now line follows the rush (a preset, the fader, a randomiser), and a preset's settings redraw it all
setInterval(() => { if (!$('m-set').hidden && !rgDrag) { rgGlideDraws.forEach((d) => d()); mRushDraw(); } }, 250);
