// ---- randomise depth: each randomise button has its own depth, 10% to 100% (kept in this browser). Clicking randomises;
// dragging up or down on the button sets the depth, shown as a bar along its foot. Below 100%, the randomise runs as
// usual and then everything it changed is taken only that far from where it was: numbers part way, a choice (a style,
// a waveform, a crossfeed target) switched with that chance. Undo still puts back the sound from before ----
const RD_KEY = 'elixir808-rdepth', RD_IDS = ['m-everything', 'm-kit', 'm-alter', 'm-pattern', 'm-xrand', 'm-fx-rand', 'm-fx-alter'];
const mRDepth = (() => { try { return JSON.parse(localStorage.getItem(RD_KEY)) || {}; } catch (e) { return {}; } })();
const mDepthOf = (id) => mRDepth[id] || 100;
const mDepthDraw = (b) => { b.style.setProperty('--rd', mDepthOf(b.id) / 100); b.classList.toggle('rd', mDepthOf(b.id) < 100); };
// the whole sound and song, as a preset keeps them (as everything's undo does)
const mRdSnap = () => ({ name: '', kit: Uint8Array.from(values), xm: { amt: xm.amt.slice(), target: xm.target.slice() }, fx: mix.fx.slice(),
  fx3: fx3Snapshot(), dpos: delayPos, song: songSnapshot(), userSamples: 0 });
// part way from a to b: numbers by d, choices with chance d (a key named for a choice, or anything not a number)
const RD_CHOICE = /^(target|type|wave|style|user|view|source|on|comp|duckOn)$/;
function mRdBlend(a, b, d, key = '') {
  if (a === b || b === undefined) return a;
  if (typeof a === 'number' && typeof b === 'number' && !RD_CHOICE.test(key)) { const v = a + (b - a) * d; return Number.isInteger(a) && Number.isInteger(b) ? Math.round(v) : v; }
  if (Array.isArray(b) && Array.isArray(a) && a.length === b.length) return b.map((x, i) => mRdBlend(a[i], x, d, key));
  if (b && a && typeof b === 'object' && typeof a === 'object' && !ArrayBuffer.isView(b)) return Object.fromEntries(Object.keys(b).map((k) => [k, mRdBlend(a[k], b[k], d, k)]));
  return Math.random() < d ? structuredClone(b) : structuredClone(a);
}
function mRdApply(was, d, sync) {
  const now = mRdSnap(), mid = mRdBlend({ ...was, kit: null }, { ...now, kit: null }, d);
  // (a drum parameter with only a few settings, a waveform or a mode, is a choice; the rest move part way)
  mid.kit = Uint8Array.from(now.kit, (v, i) => (v === was.kit[i] ? v : spec(i).max <= 15 ? (Math.random() < d ? v : was.kit[i]) : Math.round(was.kit[i] + (v - was.kit[i]) * d)));
  // (a pattern the randomise changed is made again from the dials it ends on; one it left alone keeps any hand edits)
  const newPattern = JSON.stringify(was.song.pattern) !== JSON.stringify(now.song.pattern);
  const keep = { u: undoValues, dis: $('undo').disabled, fn: mUndoFn };
  barSync = sync;
  useKit(mid); useSong(mid.song, false);
  if (newPattern) { generate(); drawGrid(); sendSeq(); }
  barSync = false;
  undoValues = keep.u; $('undo').disabled = keep.dis; mUndoFn = keep.fn; mUndo();
  mDrawAll(); setDirty(true);
}
for (const id of RD_IDS) {
  const b = $(id); mDepthDraw(b);
  // (snapshot before the button's own handlers run, then, once they have, take the change only part way)
  b.addEventListener('click', () => {
    const d = mDepthOf(id) / 100; if (d >= 1) return;
    const was = mRdSnap(), sync = b.classList.contains('pending') || ($('m-nextbar').checked && playing);
    setTimeout(() => mRdApply(was, d, sync), 80);
  }, { capture: true });
  // dragging sets the depth (and then the press neither randomises nor opens the settings)
  let drag = null;
  b.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, x: e.clientX, d: mDepthOf(id), on: false }; });
  b.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = drag.y - e.clientY, dx = e.clientX - drag.x;
    if (!drag.on && Math.abs(dy) + Math.abs(dx) < 5) return;
    if (!drag.on) { drag.on = true; b.setPointerCapture(e.pointerId); document.querySelector('.m-rand').dispatchEvent(new Event('pointercancel')); }
    mRDepth[id] = Math.max(10, Math.min(100, Math.round((drag.d + (dy + dx) / 1.5) / 10) * 10));
    try { localStorage.setItem(RD_KEY, JSON.stringify(mRDepth)); } catch (err) {}
    mDepthDraw(b); mSay(b, `${mRDepth[id]}%`);
  });
  // (marked until just after the click that follows, if one does)
  const end = () => { if (drag && drag.on) { b.dataset.dragged = '1'; setTimeout(() => delete b.dataset.dragged, 0); } drag = null; };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
}
// (the click that ends a drag is stopped before anything sees it: the randomise, next bar's flash and the settings hold)
addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('.m-rand .m-btn');
  if (b && b.dataset.dragged) { delete b.dataset.dragged; e.stopPropagation(); e.preventDefault(); }
}, { capture: true });
