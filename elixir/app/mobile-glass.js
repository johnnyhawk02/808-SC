// ---- the glass isn't flat: each control's ink shadow deepens a little toward the top right of the screen (--d, used
// by the CSS), worked out once from where it sits and again when the screen's size changes ----
function mDepth() {
  const m = $('m').getBoundingClientRect();
  for (const el of document.querySelectorAll('.m-vf, .m-btn, .m-toggle, .m-pload, .m-tabs button, .m-xy, .m-chead, .m-fx-row > b, .m-title, .m-trans button, .m-seq-lenrow')) {
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    // pages off to the side count by their place on their own page
    const x = (((r.left + r.width / 2 - m.left) % m.width) + m.width) % m.width / m.width, y = (r.top + r.height / 2 - m.top) / m.height;
    el.style.setProperty('--d', (1 + 0.7 * Math.max(0, Math.min(1, x)) * Math.max(0, Math.min(1, 1 - y))).toFixed(2));
  }
}
addEventListener('resize', mDepth);
requestAnimationFrame(mDepth);
mSync(); mUndo(); mCompOn(); mDrawAll();
