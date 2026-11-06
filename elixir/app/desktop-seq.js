// ---- the step sequencer on the laptop: touching any fader or knob shows its sequencer in the strip under the knobs,
// headed with the control's whole name and where it is ----
// (where a control is and its whole name: the page, its row or drum, and the name its label shortens)
function mPlaceName(el, fd) {
  const panel = el.closest('[data-m-panel]'), page = panel ? M_PAGE_NAMES[panel.dataset.mPanel] : '';
  const row = el.closest('.m-fx-row'), head = row && row.querySelector(':scope > b, .m-fxhead b');
  const box = { 'm-duck': 'sidechain', 'm-dist': 'distortion', 'm-comp': 'compressor' }[el.parentElement.id];
  const where = panel && panel.dataset.mPanel === 'dice' ? `${page} · ${XN[mVoice]}` : head ? `${page} · ${head.textContent}` : box ? `${page} · ${box}` : page;
  // (the mixer's columns are named d1 .. hh; this gives the drum's name)
  const dr = ['d1', 'd2', 'd3', 'sn', 'cy', 'hh'].indexOf(fd.label);
  return [where, el.dataset.full || (dr >= 0 ? XN[dr] : fd.label)];
}
// the step sequencer's heading gets the same whole name, and the control it's editing is marked while it's open
const mSeqOpenPhone = mSeqOpen;
mSeqOpen = function (fd) {
  mSeqOpenPhone(fd);
  if (mWide.matches) { const [where, name] = mPlaceName(fd.el, fd); $('m-seq-name').textContent = `${where} · ${name}`; }
  mFaders.forEach((f) => f.el.classList.toggle('seq-edit', f === fd));
};
$('m-seq-close').addEventListener('click', () => mFaders.forEach((f) => f.el.classList.remove('seq-edit')));
// on the laptop, touching a fader or knob shows its step sequencer in the strip (a draft until a step is painted, so
// nothing runs for it)
$('m').addEventListener('pointerdown', (e) => {
  if (!mWide.matches || e.button !== 0) return;
  const tr = e.target.closest('.m-vtrack'), fd = tr && mFdOf(tr.closest('.m-vf'));
  if (fd && fd !== mSeqF && !$('m-faders').classList.contains('assigning')) mSeqOpen(fd);
});
