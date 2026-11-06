// ---- user settings (the person by the title; no password): tabs. seq: whether the fader sequencers follow the groove.
// midi: which CC moves each of the twelve PERF knobs (mCc, app/mobile-slots.js), as a 4 by 3 grid like the page (tap
// a fader to type its CC), the CC presets (cc1 to cc12, cc13 to cc24, and any saved here, which the ✕ deletes), and
// save as a preset ----
$('m-user-open').addEventListener('click', () => { $('m-user').hidden = false; mCcDraw(); });
mCloser('m-user');
mPaneTabs($('m-user-tabs'), 'user');
// seq: the fader sequencers follow the groove, or not
$('m-seqgroove').checked = mSeqGroove;
$('m-seqgroove').addEventListener('change', () => { mSeqGroove = $('m-seqgroove').checked; try { localStorage.setItem(SEQ_GROOVE_KEY, mSeqGroove ? '1' : '0'); } catch (e) {} });
const ccSame = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);
function mCcDraw() {
  const box = $('m-ccpresets'); box.innerHTML = '';
  [...CC_PRESETS0, ...mCc.presets].forEach((P, i) => {
    const row = document.createElement('div'); row.className = 'm-ccp';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.textContent = P.name;
    b.setAttribute('aria-pressed', ccSame(P.map, mCc.map));
    b.addEventListener('click', () => { mCc.map = P.map.slice(); mCcStore(); mCcDraw(); });
    row.append(b);
    if (i >= CC_PRESETS0.length) {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'm-btn m-ccdel'; x.textContent = '✕'; x.setAttribute('aria-label', `Delete ${P.name}`);
      x.addEventListener('click', () => { if (!confirm(`Delete the cc preset ${P.name}?`)) return; mCc.presets.splice(i - CC_PRESETS0.length, 1); mCcStore(); mCcDraw(); });
      row.append(x);
    }
    box.append(row);
  });
  const grid = $('m-ccgrid'); grid.innerHTML = '';
  mCc.map.forEach((cc, i) => {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'm-btn m-cccell';
    const name = (mSlotEls[i] && mSlotEls[i].el.querySelector('.m-flab').textContent) || `fader ${i + 1}`;
    c.innerHTML = `<small>${name}</small>cc ${cc}`;
    c.addEventListener('click', () => {
      const v = prompt(`CC for knob ${i + 1} (${name}), 0 to 127`, cc);
      if (v === null) return;
      const n = Math.round(Number(v));
      if (!Number.isFinite(n) || n < 0 || n > 127) { alert('A CC is a number from 0 to 127.'); return; }
      mCc.map[i] = n; mCcStore(); mCcDraw();
    });
    grid.append(c);
  });
}
$('m-ccsave').addEventListener('click', () => {
  const name = (prompt('Name for this midi cc preset') || '').trim();
  if (!name) return;
  const at = mCc.presets.findIndex((P) => P.name === name);
  if (at >= 0) { if (!confirm(`Replace the cc preset ${name}?`)) return; mCc.presets[at].map = mCc.map.slice(); }
  else mCc.presets.push({ name, map: mCc.map.slice() });
  mCcStore(); mCcDraw();
});
