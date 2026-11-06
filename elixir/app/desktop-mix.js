// ---- the mixer on the laptop: a channel strip a drum (its echo and reverb send knobs over its level fader), with a
// level meter beside each fader, fed by the same peaks as the full desktop mixer's meters (lvms in app/mixer.js) ----
const mLvm = [...$('m-mix-vol').children].map((vf) => {
  const m = document.createElement('u'); m.className = 'm-lvm'; m.setAttribute('aria-hidden', 'true');
  m.innerHTML = '<span class="m-lvm-on"></span><span class="m-lvm-pk"></span>'; vf.querySelector('.m-vtrack').append(m); return m;
});
const mLvmDraw = lvmDraw;
lvmDraw = function (m) {
  mLvmDraw(m);
  const el = mLvm[lvms.indexOf(m)]; if (!el) return;
  el.style.setProperty('--m', ((Math.max(LVM_FLOOR, m.db) - LVM_FLOOR) / -LVM_FLOOR).toFixed(3));
  el.style.setProperty('--h', ((Math.max(LVM_FLOOR, m.hold) - LVM_FLOOR) / -LVM_FLOOR).toFixed(3));
};


// ---- crossfeed on its own page (laptop): the matrix moves from the fx page to the crossfeed page while the screen is
// wide, and back for the phone layout ----
const mXfPlace = () => (mWide.matches ? $('m-xf-card') : document.querySelector('[data-m-panel="fx"] .m-fx-card')).append(document.querySelector('.m-xrow'));
mXfPlace(); mWide.addEventListener('change', mXfPlace);

// every slider's name fitted to its column (shortened as the perf knobs' are), on the laptop, as the pages come into view
// or change size
{
  const fit = () => { if (!mWide.matches) return; for (const fd of mFaders) { if (!fd.el.offsetParent || fd.el.closest('#m-faders')) continue; fd.el.dataset.full ||= fd.label; mFitLabel(fd.el); } };
  const ro = new ResizeObserver(fit);
  document.querySelectorAll('[data-m-panel]').forEach((p) => ro.observe(p));
  if (document.fonts) document.fonts.ready.then(fit);
}
