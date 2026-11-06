// ---- the phone screen, driving the full app underneath ----
// The desktop panels stay in the page (hidden) so the engine, presets and randomisers run as they do there;
// the buttons here press theirs and the sliders write the same state. This file: pages, transport and the faders
// every page uses. Then, in build order: mobile-pages (beat, perf, master, randomisers, voice), mobile-presets,
// mobile-record, mobile-mix (fx, distortion, mix), mobile-seq (step sequencers), mobile-extras (install, next bar),
// mobile-xy, mobile-settings (the randomisers' settings), mobile-slots (perf slots and MIDI CC), mobile-setup
// (settings, behind the gear), mobile-rush (its rush graph), mobile-user (user settings), mobile-help, mobile-glass.
// iOS: play Web Audio through the ringer switch like a music app
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
const mRnd = (n) => Math.floor(Math.random() * n);

// ---- small helpers for the pop-ups and their buttons ----
// a button says something for a moment (copied, none saved yet), then its own name again
function mSay(btn, text) {
  const idle = btn.dataset.idle ??= btn.textContent;
  btn.textContent = text; clearTimeout(btn.mSayT); btn.mSayT = setTimeout(() => { btn.textContent = idle; }, 1500);
}
// text to the clipboard, the button saying so; where the clipboard is refused, a box with the text to copy by hand
async function mCopy(btn, text, said = 'copied', ask = 'Copy this:') {
  try { await navigator.clipboard.writeText(text); mSay(btn, said); } catch (e) { prompt(ask, text); }
}
// a strip of tabs over panes: data-<k> on each tab, data-<k>-pane on the pane it shows (then: after a change)
function mPaneTabs(strip, k, then) {
  strip.addEventListener('click', (e) => {
    const b = e.target.closest(`[data-${k}]`); if (!b) return;
    for (const t of strip.children) t.setAttribute('aria-selected', t === b);
    for (const p of document.querySelectorAll(`[data-${k}-pane]`)) p.hidden = p.dataset[`${k}Pane`] !== b.dataset[k];
    if (then) then();
  });
}
// a pop-up's done button (its id + '-close') hides it
const mCloser = (id, then) => $(id + '-close').addEventListener('click', () => { $(id).hidden = true; if (then) then(); });

// ---- pages: tap a tab to scroll to one (the pages don't swipe). The tab changes once, at once, not for each page passed ----
const mPages = $('m-pages');
let mCur = 'play', mSettle = 0;
// (on a laptop screen perform is always open on the left, and the buttons choose the page on the right)
const mWide = matchMedia('(min-width: 1000px)');
function mTab(t) {
  if (mWide.matches) {
    if (t === 'play') return;
    $('m').dataset.page = t;
    document.querySelectorAll('[data-m-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mTab === t));
    if (t === 'presets') mDrawPresets();
    return;
  }
  const el = document.querySelector(`[data-m-panel="${t}"]`);
  mShown(t);
  mPages.scrollTo({ left: el.offsetLeft - mPages.offsetLeft, behavior: 'instant' }); // (straight there, no slide)
}
// the tab that shows which page is in view
// the page's name, beside the title
const M_PAGE_NAMES = { play: 'perform', beat: 'beat', dice: 'voice', xy: 'x/y', fx: 'effects', xf: 'crossfeed', mix: 'mixer', comp: 'master', presets: 'presets' };
function mShown(t) {
  if (t === mCur) return;
  mCur = t;
  $('m-pagename').textContent = M_PAGE_NAMES[t] || t;
  document.querySelectorAll('[data-m-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mTab === t));
  if (t === 'presets') mDrawPresets();
}
// at rest: the page nearest the scroll position
function mSettled() {
  clearTimeout(mSettle);
  const x = mPages.scrollLeft + mPages.offsetLeft;
  const near = [...mPages.querySelectorAll('[data-m-panel]')].reduce((a, b) => (Math.abs(b.offsetLeft - x) < Math.abs(a.offsetLeft - x) ? b : a));
  mShown(near.dataset.mPanel);
}
// scrollend where the browser has it; otherwise a pause in the scrolling
mPages.addEventListener('scroll', () => { clearTimeout(mSettle); mSettle = setTimeout(mSettled, 150); }, { passive: true });
mPages.addEventListener('scrollend', mSettled);
document.querySelectorAll('[data-m-tab]').forEach((b) => b.addEventListener('click', () => mTab(b.dataset.mTab)));
if (mWide.matches) mTab('beat');

// ---- transport ----
const mPlay = $('m-play'), mRec = $('m-rec');
const mSync = () => {
  const on = $('play').getAttribute('aria-pressed') === 'true';
  mPlay.setAttribute('aria-pressed', on); mPlay.querySelector('span').textContent = on ? 'stop' : 'play';
};
new MutationObserver(mSync).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
mPlay.addEventListener('click', () => $('play').click());

// ---- sliders: vertical faders, readout on top and label under; dragging moves the value from where it is
// (a touch doesn't jump it), the whole track's height is the full range (tempo's is twice it, for finer steps), and a double tap on the label resets it;
// holding one still opens its step sequencer (below). While a sequencer runs, the fader sets its base (fd.base) and the
// sequencer moves the value around it: the fill is the value heard, the bar the base ----
const mDraws = [], mFaders = [];
// (a number box, num: true, is the same control drawn as its readout in a box, dragged like a knob; a knob, knob: true,
// is the same control drawn as a segmented ring; it drags up and down over a fixed distance, as
// the ring is too small to be the range. Any of them also turns with the mouse wheel or a two-finger trackpad scroll)
function mFader(box, label, { min, max, step = 1, get, set, show, dflt, travel = 1, knob = false, num = false }) {
  const el = document.createElement('div');
  el.className = knob ? 'm-vf m-knob' : num ? 'm-vf m-num' : 'm-vf';
  el.innerHTML = '<output></output><div class="m-vtrack" role="slider" tabindex="0"><i></i><b></b></div><span class="m-flab"></span>';
  el.querySelector('.m-flab').textContent = label;
  const tr = el.querySelector('.m-vtrack'), out = el.querySelector('output');
  tr.setAttribute('aria-label', label);
  const hiOf = () => (typeof max === 'function' ? max() : max);
  const put = (v) => {
    const hi = hiOf(); v = Math.max(min, Math.min(hi, min + Math.round((v - min) / step) * step));
    v = Math.round(v * 1e6) / 1e6; // a fractional step (pitch's hundredths) lands on its exact value
    if (v !== get()) set(v);
    draw();
  };
  const draw = () => {
    const hi = hiOf(), v = get();
    out.textContent = show(v); tr.style.setProperty('--f', (v - min) / (hi - min || 1));
    tr.classList.toggle('mod', fd.base !== null); if (fd.base !== null) tr.style.setProperty('--b', (fd.base - min) / (hi - min || 1));
    tr.setAttribute('aria-valuemin', min); tr.setAttribute('aria-valuemax', hi); tr.setAttribute('aria-valuenow', v); tr.setAttribute('aria-valuetext', show(v));
  };
  const fd = { key: `${box.id}:${label}`, label, min, hiOf, step, get, show, put, el, dflt, seq: null, base: null, off: 0 };
  const snap = (v) => Math.round(Math.max(min, Math.min(hiOf(), min + Math.round((v - min) / step) * step)) * 1e6) / 1e6;
  // a move of the fader: its base while a sequencer runs, else its value
  const move = (v) => { if (fd.base !== null) { fd.base = snap(v); mSeqApply(fd); } else put(v); };
  let drag = null, hold = 0;
  tr.addEventListener('pointerdown', (e) => {
    tr.setPointerCapture(e.pointerId); el.classList.add('held');
    drag = { y: e.clientY, v: fd.base !== null ? fd.base : get(), h: knob || num ? 160 : tr.getBoundingClientRect().height };
    clearTimeout(hold);
    hold = setTimeout(() => { if (!drag) return; const v = drag.v; end(); move(v); mSeqOpen(fd); }, 500);
  });
  tr.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (Math.abs(drag.y - e.clientY) > 6) clearTimeout(hold);
    move(drag.v + (drag.y - e.clientY) / (drag.h * travel) * (hiOf() - min));
  });
  const end = () => { clearTimeout(hold); drag = null; el.classList.remove('held'); };
  tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
  let wheel = null;
  tr.addEventListener('wheel', (e) => {
    e.preventDefault();
    // (scrolled distance kept between events, so slow trackpad scrolls still add up to steps)
    const now = fd.base !== null ? fd.base : get();
    if (!wheel || wheel.at !== now) wheel = { v: now, at: now };
    wheel.v = Math.max(min, Math.min(hiOf(), wheel.v - e.deltaY / (600 * travel) * (hiOf() - min)));
    move(wheel.v); wheel.at = fd.base !== null ? fd.base : get();
  }, { passive: false });
  tr.addEventListener('keydown', (e) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (d) { e.preventDefault(); move((fd.base !== null ? fd.base : get()) + d * step); }
  });
  let last = 0;
  el.querySelector('.m-flab').addEventListener('click', () => {
    const t = performance.now();
    if (t - last < 350 && dflt !== undefined) move(typeof dflt === 'function' ? dflt() : dflt); last = t;
  });
  fd.snap = snap;
  box.append(el); mDraws.push(draw); mFaders.push(fd);
  return draw;
}
const mDrawAll = () => mDraws.forEach((d) => d());
perfDraws.push(mDrawAll);
// a preset load rebuilds the master section; the sliders follow
// (the undo for pattern and crossfeed, which the desktop's undo doesn't cover: a function that puts them back;
// a preset load clears it, as it clears the desktop's)
let mUndoFn = null;
const mUndo = () => { document.querySelectorAll('[data-m-undo]').forEach((b) => { b.disabled = !mUndoFn && $('undo').disabled; }); };
const mBuildMaster = buildMaster;
buildMaster = function () { mBuildMaster(); mUndoFn = null; mUndo(); mDrawAll(); };

const pf = (k) => ({ min: PERF_RANGE[k][0], max: PERF_RANGE[k][1], get: () => perfGet(k), set: (v) => setPerf(k, v), show: () => perfText(k), dflt: PERF_RANGE[k][2] });
