// ---- the mouse (laptop): right-click a fader or knob for a small menu (its step sequencer, back to its default, and on
// the perf page what it does), and double-click one to put it back to its default. The phone's long hold and double
// tap on the name still work ----
const mFdOf = (el) => mFaders.find((f) => f.el === el);
function mReset(fd) {
  if (fd.dflt === undefined) return;
  const v = fd.snap(typeof fd.dflt === 'function' ? fd.dflt() : fd.dflt);
  if (fd.base !== null) { fd.base = v; mSeqApply(fd); } else fd.put(v);
  setDirty(true);
}
const mMenuClose = () => { const m = $('m-menu'); if (m) m.remove(); };
function mMenu(e, items) {
  mMenuClose();
  const m = document.createElement('div'); m.className = 'm-menu'; m.id = 'm-menu'; m.setAttribute('role', 'menu');
  for (const [label, act] of items) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.setAttribute('role', 'menuitem'); b.textContent = label;
    b.addEventListener('click', () => { mMenuClose(); act(); }); m.append(b);
  }
  $('m').append(m);
  // (by the pointer, kept on the screen)
  const r = m.getBoundingClientRect();
  const z = mWinZoom(); // (inside the scaled window its own pixels are z screen pixels)
  m.style.left = Math.min(e.clientX, innerWidth - r.width - 8) / z + 'px'; m.style.top = Math.min(e.clientY, innerHeight - r.height - 8) / z + 'px';
  m.querySelector('button').focus();
}
$('m').addEventListener('contextmenu', (e) => {
  const el = e.target.closest('.m-vf'), fd = el && mFdOf(el); if (!fd) return;
  e.preventDefault();
  const items = [[fd.seq && fd.seq.on ? 'edit step sequencer' : 'step sequencer', () => mSeqOpen(fd)]];
  if (fd.dflt !== undefined) items.push(['reset to default', () => mReset(fd)]);
  if (el.dataset.slot) items.push(['assign…', () => mChooser(Number(el.dataset.slot))]);
  mMenu(e, items);
});
addEventListener('pointerdown', (e) => { if (!e.target.closest('#m-menu')) mMenuClose(); }, { capture: true });
$('m').addEventListener('dblclick', (e) => {
  const tr = e.target.closest('.m-vtrack'), fd = tr && mFdOf(tr.closest('.m-vf')); if (fd) mReset(fd);
});

// ---- the laptop's one options button: next bar and assign (ticked when on), then the settings, user settings, help and
// install app (whose own buttons the laptop hides) ----
$('m-opts').addEventListener('click', (e) => {
  const tick = (id) => ($(id).checked ? '■ ' : '□ ');
  const r = ($('m-opts').offsetParent ? $('m-opts') : $('m-title')).getBoundingClientRect(); // (on the laptop the logo opens it)
  mMenu({ clientX: r.left, clientY: r.bottom + 6 }, [
    [tick('m-nextbar') + 'randomise on next bar', () => $('m-nextbar').click()],
    [tick('m-assign') + 'assign knobs', () => $('m-assign').click()],
    [(g8.bdTop ? '■ ' : '□ ') + 'bass drum at the top of the grid', () => g8SetBdTop(!g8.bdTop)],
    ['reset sound (plain 808, patterns kept)', () => t8ResetSound()],
    [`cached hits per sound: ${t8Hits} (click for ${T8_HITS_OPTS[(T8_HITS_OPTS.indexOf(t8Hits) + 1) % T8_HITS_OPTS.length]})`,
      () => t8SetHits(T8_HITS_OPTS[(T8_HITS_OPTS.indexOf(t8Hits) + 1) % T8_HITS_OPTS.length])],
    ['background colour…', () => $('m-panel-pick').click()],
    ...($('m-panel-pick').value !== T8_PANEL ? [['background back to default', () => t8Panel(T8_PANEL)]] : []),
    ['spot colour…', () => $('m-spot-pick').click()],
    ...($('m-spot-pick').value !== T8_SPOT ? [['spot back to default', () => t8Spot(T8_SPOT)]] : []),
    ['settings', () => $('m-set-open').click()], ['user settings', () => $('m-user-open').click()], ['help', () => $('m-help-open').click()],
    // (install app, while the browser offers it; its button under the presets is the phone's)
    ...(mInstallEv ? [['install app', () => $('m-install').click()]] : [])]);
  // the tempo: a slider at the top of the menu (it stays open while it's dragged)
  const t = document.createElement('label'); t.className = 'm-menu-tempo';
  t.innerHTML = `<span>tempo</span><input type="range" min="${PERF_RANGE.tempo[0]}" max="${PERF_RANGE.tempo[1]}" step="1" aria-label="tempo"><output></output>`;
  const [inp, out] = [t.querySelector('input'), t.querySelector('output')];
  const show = () => { inp.value = perf.tempo; out.textContent = `${perf.tempo} bpm`; };
  inp.addEventListener('input', () => { setPerf('tempo', Number(inp.value)); setDirty(true); mDrawAll(); show(); });
  t.addEventListener('dblclick', () => { setPerf('tempo', PERF_RANGE.tempo[2]); setDirty(true); mDrawAll(); show(); });
  show(); $('m-menu').prepend(t);
});

// ---- the laptop window: a panel of fixed 16:10 proportion, laid out at 1280 x 800 and scaled as one piece to its
// size. It starts as big as the browser window allows; the triangle in its bottom right corner drags it smaller or
// larger (kept, and never past what fits), and a double click on the triangle lets it fill the window again ----
const M_WIN_W = 1280, M_WIN_MIN = 640;
let mWinW = 0; // (the width chosen with the triangle; 0: as big as fits)
try { mWinW = Number(localStorage.getItem('808sc-win')) || 0; } catch (e) {}
const mWinFit = () => Math.max(320, Math.min(innerWidth - 16, (innerHeight - 16) * 1.6));
function mWinZoom() { return parseFloat($('m').style.getPropertyValue('--z')) || 1; }
function mWinSize() {
  const on = mWide.matches && !document.documentElement.classList.contains('fit');
  document.documentElement.classList.toggle('win', on);
  if (!on) { $('m').style.removeProperty('--z'); return; }
  const fit = mWinFit(), w = Math.max(Math.min(M_WIN_MIN, fit), Math.min(mWinW || fit, fit));
  $('m').style.setProperty('--z', (w / M_WIN_W).toFixed(4));
}
{
  const grip = document.createElement('i'); grip.id = 'm-grip'; grip.title = 'drag to resize · double click to fill the window';
  $('m').append(grip);
  let on = false;
  grip.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); grip.setPointerCapture(e.pointerId); on = true; });
  grip.addEventListener('pointermove', (e) => {
    if (!on) return;
    // (the window stays centred, so its corner follows the pointer from the middle of the screen)
    const w = Math.max(2 * (e.clientX - innerWidth / 2), 3.2 * (e.clientY - innerHeight / 2));
    mWinW = w >= mWinFit() ? 0 : Math.max(M_WIN_MIN, Math.round(w)); mWinSize();
  });
  const end = () => { if (!on) return; on = false; try { localStorage.setItem('808sc-win', mWinW); } catch (e) {} };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  grip.addEventListener('dblclick', () => { mWinW = 0; mWinSize(); try { localStorage.removeItem('808sc-win'); } catch (e) {} });
  addEventListener('resize', mWinSize); mWide.addEventListener('change', mWinSize);
  mWinSize();
}
