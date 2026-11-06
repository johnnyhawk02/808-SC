// ---- record: free length, no count-in; starts now (and starts playback), the second press stops and saves. Rec loop
// records exactly LOOP_BARS bars (4 unless changed: hold it) from the start of the next bar (from bar 1 if stopped), cut to loop seamlessly, and
// downloads it by itself; pressing it again while it runs stops it early ----
// (the loop's length: hold the loop button to change it; kept in this browser)
const LOOP_KEY = 'elixir808-loopbars';
let LOOP_BARS = (() => { try { const v = Number(localStorage.getItem(LOOP_KEY)); return LENS.includes(v) && v ? v : 4; } catch (e) { return 4; } })();
let mTimer = 0, mRecKind = null;
// (on the laptop there's no loop button: rec records whichever is chosen by holding or right-clicking it, free or a
// loop of so many bars; kept in this browser)
const REC_MODE_KEY = 'elixir808-recmode';
let mRecMode = (() => { try { return localStorage.getItem(REC_MODE_KEY) === 'loop' ? 'loop' : 'free'; } catch (e) { return 'free'; } })();
function mRecUi() {
  const on = recState !== 'off';
  if (!on) mRecKind = null;
  for (const [b, k] of [[mRec, 'free'], [$('m-loop'), 'loop']]) { const mine = on && mRecKind === k; b.setAttribute('aria-pressed', mine); b.classList.toggle('on', mine); b.disabled = on && !mine; }
  if (mWide.matches) { mRec.disabled = false; mRec.setAttribute('aria-pressed', on); mRec.classList.toggle('on', on); }
  clearInterval(mTimer);
  if (on && mRecKind === 'free') {
    const tick = () => { const t = Math.max(0, (performance.now() - recT0) / 1000); $('m-rec-t').textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
    tick(); mTimer = setInterval(tick, 250);
  } else $('m-rec-t').textContent = 'rec';
  $('m-loop-t').textContent = on && mRecKind === 'loop' ? (recState === 'on' ? `${Math.min(recBars + 1, LOOP_BARS)}/${LOOP_BARS}` : 'wait') : `loop ${LOOP_BARS}`;
  // (the laptop's rec says what it will record, or the loop's progress)
  if (mWide.matches && (on ? mRecKind === 'loop' : mRecMode === 'loop')) $('m-rec-t').textContent = $('m-loop-t').textContent;
}
const mRecStop = () => { const m = { type: 'recStop' }; if (node) node.port.postMessage(m); else if (fallback) fallback.msg(m); };
mRec.addEventListener('click', async () => {
  if (recState === 'off' && mWide.matches && mRecMode === 'loop') return mLoopGo();
  if (recState === 'off') {
    recSet.len = 0; recSet.count = false; mRecKind = 'free'; // the recorder's own settings stay at 44.1k 16-bit, not normalised
    await recStart();
    if (!playing) $('play').click();
  } else { if (mRecKind === 'free') $('m-rec-t').textContent = 'saving'; mRecStop(); }
  mRecUi();
});
// holding the loop button opens its length chooser (and that press doesn't also start a loop)
{
  let hold = 0, held = false;
  $('m-loop').addEventListener('pointerdown', () => { held = false; clearTimeout(hold); hold = setTimeout(() => { if (recState !== 'off') return; held = true; mLoopPick(); }, 500); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('m-loop').addEventListener(ev, () => clearTimeout(hold));
  $('m-loop').addEventListener('click', (e) => { if (held) { held = false; e.stopImmediatePropagation(); } }, { capture: true });
}
// on the laptop, holding rec or right-clicking it opens the same chooser, with free recording first
{
  let hold = 0, held = false;
  mRec.addEventListener('pointerdown', (e) => { held = false; clearTimeout(hold); if (!mWide.matches || e.button !== 0) return; hold = setTimeout(() => { if (recState !== 'off') return; held = true; mLoopPick(); }, 500); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) mRec.addEventListener(ev, () => clearTimeout(hold));
  mRec.addEventListener('click', (e) => { if (held) { held = false; e.stopImmediatePropagation(); } }, { capture: true });
  mRec.addEventListener('contextmenu', (e) => { if (mWide.matches && recState === 'off') { e.preventDefault(); mLoopPick(); } });
}
function mLoopPick() {
  const box = $('m-loop-lens'), wide = mWide.matches; box.innerHTML = '';
  $('m-looplen-title').textContent = wide ? 'record' : 'loop length';
  const pick = (n) => {
    if (wide) mRecMode = n ? 'loop' : 'free';
    if (n) { LOOP_BARS = n; try { localStorage.setItem(LOOP_KEY, String(n)); } catch (e) {} }
    try { localStorage.setItem(REC_MODE_KEY, mRecMode); } catch (e) {}
    $('m-looplen').hidden = true; mRecUi();
  };
  for (const n of [...(wide ? [0] : []), ...LENS.filter((b) => b)]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.textContent = n ? `loop ${n} bar${n > 1 ? 's' : ''}` : 'free';
    b.setAttribute('aria-pressed', wide ? (n ? mRecMode === 'loop' && n === LOOP_BARS : mRecMode === 'free') : n === LOOP_BARS);
    b.addEventListener('click', () => pick(n));
    box.append(b);
  }
  $('m-looplen').hidden = false;
}
mCloser('m-looplen');
mRecUi();
async function mLoopGo() {
  if (recState === 'off') {
    recSet.len = LENS.indexOf(LOOP_BARS); recSet.count = false; mRecKind = 'loop';
    await recStart(); // (a loop starts the transport itself)
  } else mRecStop();
  mRecUi();
}
$('m-loop').addEventListener('click', mLoopGo);
const mRecEvent = recEvent;
recEvent = function (ev) { mRecEvent(ev); if (ev.type === 'rec') mRecUi(); };

// a finished take downloads straight away, with nothing else shown
const mAddTake = addTake;
addTake = function (t) {
  mAddTake(t);
  mRecUi();
  mDownload(t);
};
function mDownload(t) {
  const a = document.createElement('a'), url = URL.createObjectURL(t.blob);
  a.href = url; a.download = t.name; a.style.display = 'none';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// phones get the share sheet (Save to Files, AirDrop, apps); elsewhere it downloads
// (true once it's shared or downloaded, false if the share sheet was cancelled)
async function mOffer(t, type) {
  const file = new File([t.blob], t.name, { type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t.name }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  mDownload(t);
  return true;
}

