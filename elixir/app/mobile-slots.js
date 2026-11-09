// ---- the perf page's twelve slots, knobs four across and three down: each can do anything on the x/y lists, and MIDI CCs
// (1..12 unless changed in the user settings; any channel) move knobs 1..12. The ASSIGN box (in the randomise column) turns on assign mode, where tapping a fader opens a chooser of where (a drum, beat, perf, fx, mix, master) and then what,
// grouped as on that page. The picks are kept in this browser, as [place, group, name], so they survive list changes ----
// (the picks are kept under a new key when the defaults are remade, so everyone gets the new ones; the old key is cleared)
const SLOT_KEY = 'elixir808-perfmap3';
try { localStorage.removeItem('elixir808-perfmap'); localStorage.removeItem('elixir808-perfmap2'); } catch (e) {}
// the defaults, four a row: the perform controls and energy, then the best of the beat page
// (Elixir 808: no LXR sound macros, so the beat page and the two sends fill their places)
const SLOT0 = [['perf', 'perf', 'tempo'], ['perf', 'perf', 'sidechain'], ['beat', 'beat', 'energy'], ['beat', 'beat', 'velocity'],
  ['beat', 'beat', 'groove'], ['beat', 'beat', 'accent'], ['fx', 'echo', 'send'], ['fx', 'reverb', 'send'],
  ['beat', 'beat', 'genre'], ['beat', 'beat', 'beat'], ['beat', 'beat', 'fills'], ['beat', 'beat', 'depth']];
let mSlots = (() => { try { const v = JSON.parse(localStorage.getItem(SLOT_KEY)); return Array.isArray(v) && v.length >= 7 ? v : null; } catch (e) { return null; } })() || SLOT0.map((x) => x.slice());
while (mSlots.length < SLOT0.length) mSlots.push(SLOT0[mSlots.length].slice());
mSlots.length = SLOT0.length; // (picks kept from when there were twenty-four: the first twelve)
const slotAxis = ([pl, g, n]) => { const P = XY_PLACES.find((x) => x.name === pl), G = P && P.groups.find((x) => x[0] === g); return G && G[1].find((a) => a.label === n); };
const mSlotEls = [];
function mSlot(i) {
  const box = $('m-faders'), old = mSlotEls[i];
  if (old) { const k = mFaders.findIndex((f) => f.el === old.el); if (k >= 0) { mDraws.splice(mDraws.indexOf(old.draw), 1); mFaders.splice(k, 1); } old.el.remove(); }
  const A = slotAxis(mSlots[i]) || slotAxis(SLOT0[i]), fd = A.fd;
  // a page's fader keeps its own steps, readout and reset; a drum's parameter is whole steps 0..its top
  // (its full name: a drum's setting starts with the drum, dr1 decay; a label that only makes sense on its own page takes
  // its group's name, echo send, dist mix; the perf and beat faders are the whole kit's, so they keep their own)
  const [pl, g] = mSlots[i], dr = XN.indexOf(pl), grp = { distortion: 'dist', compressor: 'comp', sidechain: 'side' }[g] || g.split(' ')[0];
  const label = dr >= 0 ? `${['dr1', 'dr2', 'dr3', 'sn', 'cy', 'hh'][dr]} ${A.label}` : ['fx', 'mix', 'master'].includes(pl) && !A.label.includes(' ') ? `${grp} ${A.label}` : A.label;
  const draw = mFader(box, label, fd ? { min: fd.min, max: () => fd.hiOf(), step: fd.step, get: fd.get, set: (v) => { fd.put(v); mDrawAll(); }, show: fd.show, dflt: fd.dflt, knob: true }
    : { min: A.min, max: A.max, get: A.get, set: (v) => { A.set(v); mDrawAll(); setDirty(true); }, show: String, dflt: () => initValues[A.par], knob: true });
  const el = mFaders[mFaders.length - 1].el;
  el.dataset.slot = i; mFaders[mFaders.length - 1].key = `m-faders:slot${i}`;
  el.dataset.full = label; mFitLabel(el);
  box.insertBefore(el, (mSlotEls[i + 1] && mSlotEls[i + 1].el) || null);
  mSlotEls[i] = { el, draw }; draw();
}
// a slot's name on one line: as it is if it fits, else its words shortened (a known short form, else the vowels after the
// first letter dropped), longest word first, the drum or group in front kept; then middle words dropped; past that, an
// ellipsis (the css)
const M_SHORT = { decay: 'dcy', filter: 'flt', reso: 'res', slope: 'slp', freq: 'frq', pitch: 'ptch', amount: 'amt', attack: 'atk',
  release: 'rel', threshold: 'thr', volume: 'vol', level: 'lvl', sample: 'smp', rate: 'rt', drive: 'drv', offset: 'ofs', retrigger: 'rtrg',
  feedback: 'fbk', width: 'wdth', sidechain: 'sdch', crossfeed: 'xfd', velocity: 'vel', repeat: 'rpt', noise: 'nse', coarse: 'crs',
  transient: 'trn', makeup: 'mkup', ratio: 'rto', space: 'spc', closed: 'cl', open: 'op', wave: 'wv', mod: 'md', osc1: 'o1', osc2: 'o2', gain: 'gn' };
const mShorten = (w) => M_SHORT[w] || (w.length > 3 ? w[0] + w.slice(1).replace(/[aeiou]/g, '') : w);
function mFitLabel(el) {
  const lab = el.querySelector('.m-flab'), full = el.dataset.full; if (!lab || !full) return;
  lab.textContent = full;
  // (measured as the text's own width against the fader's column, with a pixel to spare for rounding)
  // (on the laptop a knob's name sits beside its ring, in what the ring leaves)
  const tr = el.querySelector('.m-vtrack'), beside = getComputedStyle(el).display === 'grid' && el.classList.contains('m-knob') && !el.closest('.m-g8-side'); // (the drum card's dials have their names under them)
  const cs = getComputedStyle(el), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const room = el.clientWidth - pad - (beside ? tr.offsetWidth + 10 : 0) - 1, wide = () => { const r = document.createRange(); r.selectNodeContents(lab); return r.getBoundingClientRect().width > room; };
  if (room <= 0 || !wide()) return;
  const w = full.split(' '), done = new Set(w.length > 1 ? [0] : []); // (the first word, the drum or group, stays; a name of one word is shortened itself)
  while (wide()) {
    let k = -1; w.forEach((x, j) => { if (!done.has(j) && (k < 0 || x.length > w[k].length)) k = j; });
    if (k < 0) break;
    w[k] = mShorten(w[k]); done.add(k); lab.textContent = w.join(' ');
  }
  // (still too long: words after the first dropped, the last kept, so it's the drum and what it is)
  while (wide() && w.length > 2) { w.splice(1, 1); lab.textContent = w.join(' '); }
}
for (let i = 0; i < SLOT0.length; i++) mSlot(i);
// (refitted whenever the faders change size, which includes the page coming into view)
const mFitSlots = () => mSlotEls.forEach((s) => s && mFitLabel(s.el));
new ResizeObserver(mFitSlots).observe($('m-faders'));
// (and once the pixel font has loaded, since the names' widths change with it)
if (document.fonts) document.fonts.ready.then(mFitSlots);
$('m-assign').addEventListener('change', () => { $('m-faders').classList.toggle('assigning', $('m-assign').checked); });
// MIDI: twelve CCs (1..12 unless changed) set knobs 1..12 across their range, and on the laptop CC 21..24 the step sequencer's bars; nothing else listens (no other CCs, no notes); MIDI starts
// at the first touch, since the browser may ask first
onMidi = (e) => { const [st, cc, val] = e.data; if ((st & 0xf0) === 0xb0) pc4Midi(cc, val); };
// (a controller sends many CCs a second: only each fader's latest is kept, applied once a frame, and the moving
// fader skips the LCD fade so it keeps up with the knob)
const mCcNext = new Map();
let mCcFrame = 0;
// (which CC moves which fader: mCc.map, set in the user settings' midi tab, CC 13..24 unless changed; kept in this browser)
const CC_KEY = 'elixir808-midicc';
const CC_PRESETS0 = [{ name: 'cc1 to cc12', map: SLOT0.map((_, i) => i + 1) }, { name: 'cc13 to cc24', map: SLOT0.map((_, i) => i + 13) }];
const mCc = (() => { let v = {}; try { v = JSON.parse(localStorage.getItem(CC_KEY)) || {}; } catch (e) {}
  return { map: Array.isArray(v.map) && v.map.length === SLOT0.length ? v.map : CC_PRESETS0[0].map.slice(), presets: Array.isArray(v.presets) ? v.presets.filter((P) => P.map && P.map.length === SLOT0.length) : [] }; })();
const mCcStore = () => { try { localStorage.setItem(CC_KEY, JSON.stringify(mCc)); } catch (e) {} };
pc4Midi = function (cc, val) {
  // CC 21 to 24: the length, slew, speed and depth of the step sequencer shown (laptop), whatever the knobs use
  if (cc >= 21 && cc <= 24 && mWide.matches && mSeqF) { SEQ_BARS[cc - 21](val / 127); mSeqDraw(); return; }
  let hit = false;
  mCc.map.forEach((c, i) => { if (c === cc) { mCcNext.set(i, val); hit = true; } });
  if (hit && !mCcFrame) mCcFrame = requestAnimationFrame(mCcApply);
};
function mCcApply() {
  mCcFrame = 0;
  for (const [i, val] of mCcNext) {
    const el = mSlotEls[i] && mSlotEls[i].el, fd = el && mFaders.find((f) => f.el === el); if (!fd) continue;
    const v = fd.snap(fd.min + val / 127 * (fd.hiOf() - fd.min));
    el.classList.add('cc'); clearTimeout(el._cc); el._cc = setTimeout(() => el.classList.remove('cc'), 250);
    if (fd.base !== null) { fd.base = v; mSeqApply(fd); } else fd.put(v);
  }
  mCcNext.clear();
  setDirty(true);
}
addEventListener('pointerdown', () => startMidi(), { once: true });
// in assign mode a tap on a slot opens the chooser instead of moving it (on the click, once the finger is up, so the
// tap can't land on the chooser too)
$('m-faders').addEventListener('click', (e) => {
  if (!$('m-faders').classList.contains('assigning')) return;
  const vf = e.target.closest('.m-vf[data-slot]'); if (vf) mChooser(Number(vf.dataset.slot));
});
// the chooser: where along the top, then what, in its groups
let mChSlot = 0, mChPlace = 0;
function mChooser(i) {
  mChSlot = i; mChPlace = Math.max(0, XY_PLACES.findIndex((P) => P.name === mSlots[i][0]));
  $('m-ch-title').textContent = `slot ${i + 1}: ${mSlots[i][2]}`;
  $('m-ch').hidden = false; mChDraw();
}
function mChDraw() {
  const tabs = $('m-ch-tabs'); tabs.innerHTML = '';
  XY_PLACES.forEach((P, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.textContent = P.name; b.setAttribute('aria-selected', k === mChPlace);
    b.addEventListener('click', () => { mChPlace = k; mChDraw(); }); tabs.append(b);
  });
  const list = $('m-ch-list'); list.innerHTML = '';
  const P = XY_PLACES[mChPlace], cur = mSlots[mChSlot];
  for (const [heading, axes] of P.groups) {
    const h = document.createElement('b'); h.textContent = heading; list.append(h);
    const grid = document.createElement('div');
    for (const A of axes) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.textContent = A.label;
      b.setAttribute('aria-pressed', cur[0] === P.name && cur[1] === heading && cur[2] === A.label);
      b.addEventListener('click', () => {
        mSlots[mChSlot] = [P.name, heading, A.label];
        try { localStorage.setItem(SLOT_KEY, JSON.stringify(mSlots)); } catch (e) {}
        mSlot(mChSlot); $('m-ch').hidden = true;
      });
      grid.append(b);
    }
    list.append(grid);
  }
}
mCloser('m-ch');
$('m-ch-reset').addEventListener('click', () => {
  mSlots[mChSlot] = SLOT0[mChSlot].slice();
  try { localStorage.setItem(SLOT_KEY, JSON.stringify(mSlots)); } catch (e) {}
  mSlot(mChSlot); $('m-ch').hidden = true;
});

