// ---- the beat page: everything that makes the pattern, three by three: genre, beat, energy / fills, rush, velocity /
// groove, its depth, accent. Genre steps through the built-in styles (not user); a preset in the user style shows it
// with the slider at the bottom ----
const mGenres = STYLES.map((st, i) => (st.user ? -1 : i)).filter((i) => i >= 0);
mFader($('m-beat-faders'), 'tempo', { ...pf('tempo'), show: () => `${perf.tempo}\nbpm`, travel: 2 });
mFader($('m-beat-faders'), 'genre', { min: 0, max: mGenres.length - 1, get: () => Math.max(0, mGenres.indexOf(styleIdx)),
  set: (v) => {
    setStyle(mGenres[v]); perf.beat = Math.min(perf.beat, STYLES[styleIdx].grooves.length - 1);
    if (view === 'steps') setTab('perform'); else generate();
    sendSeq(); setDirty(true); drawPerf();
  }, show: () => STYLES[styleIdx].name.replace(' ', '\n'), dflt: 0 });
// beat runs over the current style's grooves; its readout is the groove, then where it is in the list
mFader($('m-beat-faders'), 'beat', { ...pf('beat'), max: () => STYLES[styleIdx].grooves.length - 1 || 1, show: () => perfText('beat').replace(' · ', '\n') });
mFader($('m-beat-faders'), 'energy', { ...pf('energy'), show: () => perfText('energy').replace(' · ', '\n') });
mFader($('m-beat-faders'), 'fills', { ...pf('fills'), show: () => perfText('fills').replace(' · ', '\n') });
mFader($('m-beat-faders'), 'rush', pf('rush'));
// the voice the rush hands its hits to and rolls on (the snare unless changed)
const RUSH_V = ['drum 1', 'drum 2', 'drum 3', 'snare', 'cymbal', 'cl hat', 'op hat'];
mFader($('m-beat-faders'), 'rush on', { min: 0, max: 6, get: () => perf.rushT, set: (v) => { setPerf('rushT', v); setDirty(true); }, show: (v) => RUSH_V[v].replace(' ', '\n'), dflt: 3 });
mFader($('m-beat-faders'), 'velocity', { ...pf('vel'), show: (v) => `${v}` });
mFader($('m-beat-faders'), 'groove', { ...pf('groove'), show: () => perfText('groove').replace(' ', '\n') });
mFader($('m-beat-faders'), 'depth', { ...pf('depth'), show: (v) => `${v}%` });
mFader($('m-beat-faders'), 'accent', { ...pf('accent'), show: (v) => `+${v} dB` });
// ---- the perf page's own controls: tempo, the sidechain, the sound macros and crossfeed. They live in a hidden box;
// the page shows twelve assignable slots (below, after the x/y page's lists), these seven by default ----
mFader($('m-perf-src'), 'tempo', { ...pf('tempo'), show: () => `${perf.tempo}\nbpm`, travel: 2 });
// the drum 1 sidechain duck: above 0 it switches the sidechain on
const setDuck = (v) => {
  master.duck = v / 100;
  if (v > 0 && !master.duckOn) $('duck-on').click(); else sendMix();
};
const duckFader = { min: 0, max: 100, get: () => (master.duckOn ? Math.round(master.duck * 100) : 0), set: setDuck, show: (v) => (v ? v + '%' : 'off'), dflt: Math.round(MASTER0.duck * 100) };
mFader($('m-perf-src'), 'sidechain', duckFader);
// the sound macros, as on the desktop's pattern card: 100 (pitch 24) is the middle, the sound as it is
for (const [m, label] of [['pitch', 'pitch'], ['decay', 'decay'], ['filter', 'filter'], ['fm', 'fm']]) {
  const pitch = m === 'pitch';
  // pitch is free: hundredths of a semitone, over twice the track's height
  mFader($('m-perf-src'), label, { min: 0, max: pitch ? 48 : 200, step: pitch ? 0.01 : 1, travel: pitch ? 2 : 1, get: () => macro[m], set: (v) => { setMacro(m, v); drawMacros(); },
    show: (v) => (pitch ? (Math.abs(v - 24) < 0.005 ? '0 st' : (v > 24 ? '+' : '−') + Math.abs(v - 24).toFixed(2) + '\nst') : (v === 100 ? '0%' : (v > 100 ? '+' : '−') + Math.abs(v - 100) + '%')),
    dflt: MACRO0[m] });
}
const mDrawMacros = drawMacros;
drawMacros = function () { mDrawMacros(); mDrawAll(); };
// crossfeed depth: how much of the crossfeed patchbay is heard (the desktop's depth control); presets keep it
const mXDepth = (v) => { $('xdepth').value = v; $('xdepth').dispatchEvent(new Event('input')); };
mFader($('m-perf-src'), 'crossfeed', { min: 0, max: 100, get: () => Number($('xdepth').value), set: mXDepth, show: (v) => (v ? v + '%' : 'off'), dflt: 100 });

// ---- compressor tab ----
const mMaster = (box, label, key, lo, hi, step, show) => mFader(box, label, { min: lo, max: hi, step, get: () => master[key],
  set: (v) => { master[key] = v; sendMix(); }, show, dflt: MASTER0[key] });
mMaster($('m-comp'), 'threshold', 'thresh', -40, 0, 1, (v) => v + ' dB');
mFader($('m-comp'), 'ratio', { min: 0, max: RATIOS.length - 1, get: () => Math.max(0, RATIOS.indexOf(master.ratio)),
  set: (v) => { master.ratio = RATIOS[v]; sendMix(); }, show: (v) => RATIOS[v] + ':1', dflt: RATIOS.indexOf(MASTER0.ratio) });
mMaster($('m-comp'), 'attack', 'attack', 1, 50, 1, (v) => v + ' ms');
mMaster($('m-comp'), 'release', 'release', 20, 500, 10, (v) => v + ' ms');
mMaster($('m-comp'), 'makeup', 'makeup', 0, 12, 1, (v) => '+' + v + ' dB');
mFader($('m-duck'), 'amount', duckFader);
mMaster($('m-duck'), 'release', 'duckRelease', 30, 600, 10, (v) => v + ' ms');
// space: drum 1 also cuts the others' frequencies where it plays (a spacer, after Trackspacer), on the same switch and release
mMaster($('m-duck'), 'space', 'space', 0, 100, 5, (v) => (v ? v + '%' : 'off'));
const mCompOn = () => {
  const on = $('comp-on').getAttribute('aria-pressed') === 'true';
  $('m-comp-on').setAttribute('aria-pressed', on); $('m-comp-on').textContent = on ? 'on' : 'off';
  $('m-comp').classList.toggle('off', !on);
};
$('m-comp-on').addEventListener('click', () => $('comp-on').click());
new MutationObserver(mCompOn).observe($('comp-on'), { attributes: true, attributeFilter: ['aria-pressed'] });
// the gain reduction meter: a bar, fed by the same reading as the desktop needle
const mGrSet = grVu.set;
grVu.set = (db) => {
  mGrSet(db);
  const d = Math.max(0, Math.min(20, db || 0));
  $('m-gr').style.width = (Math.log1p(d) / Math.log1p(20) * 100).toFixed(1) + '%'; $('m-gr-out').textContent = `${d.toFixed(1)} dB`;
};
// and the sidechain's: how far drum 1 is turning the rest down, the same scale
const mDkSet = duckVu.set;
duckVu.set = (db) => {
  mDkSet(db);
  const d = Math.max(0, Math.min(20, db || 0));
  $('m-dk').style.width = (Math.log1p(d) / Math.log1p(20) * 100).toFixed(1) + '%'; $('m-dk-out').textContent = `${d.toFixed(1)} dB`;
};

// ---- randomisers ----
// undo takes back the last randomise: the sound for everything and kit (the desktop's undo), the pattern for pattern,
// the patch for crossfeed
// everything loads a new kit, which clears the desktop's undo, so it keeps its own: the whole sound and song as they
// were (as a preset would save them), put back by loading that
$('m-everything').addEventListener('click', () => {
  const was = { name: '', kit: Uint8Array.from(values), xm: { amt: xm.amt.slice(), target: xm.target.slice() }, fx: mix.fx.slice(),
    fx3: fx3Snapshot(), dpos: delayPos, song: songSnapshot(), userSamples: 0 };
  $('new-kit').click();
  mUndoFn = () => { useKit(was); useSong(was.song, false); initValues.set(was.kit); setDirty(true); };
  mUndo();
});
// kit: every drum voice from a random built-in kit; the pattern, mixer and FX stay
$('m-kit').addEventListener('click', () => { mUndoFn = null; $('rand-all').click(); });
// alter: every drum's current sound varied by 10% (the desktop's alter is 5%), which undo takes back
$('m-alter').addEventListener('click', async () => {
  mUndoFn = null; await startAudio();
  randChange(() => { for (let v = 0; v < 6; v++) { delete homes[v]; randomiseVoice(v, RAND.alter.amount / 100); delete homes[v]; } });
});
// crossfeed: a new 6 x 6 patch (the desktop's crossfeed randomiser), which undo takes back
$('m-xrand').addEventListener('click', async () => {
  await startAudio();
  const was = { amt: xm.amt.slice(), target: xm.target.slice() };
  $('xrand').click();
  undoValues = null; $('undo').disabled = true;
  mUndoFn = () => {
    xm.amt.splice(0, 36, ...was.amt); xm.target.splice(0, 6, ...was.target);
    xSelects.forEach((s, d) => { s.value = xm.target[d]; }); xcells.forEach((d) => d()); sendX(); setDirty(true);
  };
  mUndo();
});
// pattern: style, beat, energy, fills, groove and its depth rolled; the sound, tempo, rush, mixer and FX stay
const mPatGet = () => ({ style: styleIdx, beat: perf.beat, energy: perf.energy, fills: perf.fills, type: groove.type, depth: groove.depth });
function mPatSet(p) {
  setStyle(p.style);
  perf.beat = p.beat; perf.energy = p.energy; perf.fills = p.fills; groove.type = p.type; groove.depth = p.depth;
  drawUserTools();
  if (view === 'steps') setTab('perform'); else generate();
  drawGroove(); sendSeq(); setDirty(true);
}
const mRandPattern = async () => {
  await startAudio();
  const was = mPatGet();
  const P = RAND.pattern, styles = STYLES.map((st, i) => (st.user ? -1 : i)).filter((i) => i >= 0);
  const style = P.genre ? styles[mRnd(styles.length)] : styleIdx;
  mPatSet({ style, beat: mRnd(STYLES[style].grooves.length), energy: rRange(P.energyLo, P.energyHi), fills: rRange(P.fillsLo, P.fillsHi),
    type: P.groove ? GROOVE_TYPES[mRnd(GROOVE_TYPES.length)].name : groove.type, depth: P.groove ? rRange(P.depthLo, P.depthHi) : groove.depth });
  undoValues = null; $('undo').disabled = true; mUndoFn = () => mPatSet(was); mUndo();
};
$('m-pattern').addEventListener('click', mRandPattern);
document.querySelectorAll('[data-m-undo]').forEach((b) => b.addEventListener('click', () => {
  if (mUndoFn) { const fn = mUndoFn; mUndoFn = null; fn(); mUndo(); } else $('undo').click();
}));
new MutationObserver(mUndo).observe($('undo'), { attributes: true, attributeFilter: ['disabled'] });

// ---- the voice page: every parameter of a drum. The top strip picks the drum, the second one of four pages, each the
// desktop's sections grouped by job: tone (oscillator, fm), shape (amp eg, the pitch envelope, the click), filter (and
// the voice's mix) and mod (lfo, velocity). A drum's page is made the first time it's shown and kept (so a fader's
// step sequencer stays with it) ----
const vpNice = (t) => t.toLowerCase().replace(/_/g, ' ');
// each fader's label on its page, by section and the desktop's name (anything not here: the name, lower case)
const VP_LABEL = {
  oscillator: { WAVEFORM: 'wave', MIX: 'noise mix' },
  fm: { FM_AMOUNT: 'fm amt', FM_FREQ: 'fm freq', WAVEFORM: 'fm wave', MODE: 'fm mode', MOD_OSC1_FREQ: 'mod1 freq', MOD_OSC2_FREQ: 'mod2 freq',
    MOD_OSC1_GAIN: 'mod1 gain', MOD_OSC2_GAIN: 'mod2 gain' },
  amp: { EG_SLOPE: 'slope', DECAY_CLOSED: 'decay cl', DECAY_OPEN: 'decay op' },
  pitch: { PITCH_DECAY: 'pitch dec', EG_SLOPE: 'pitch slope', MOD_AMOUNT: 'pitch amt' },
  click: { TRANSIENT_WAVE: 'click', TRANSIENT_VOLUME: 'click vol', TRANSIENT_FREQ: 'click freq' },
  filter: { FILTER_F: 'cutoff', FILTER_RESO: 'reso', FILTER_TYPE: 'type', FILTER_DRIVE: 'flt drive' },
  mix: { SAMPLE_RATE: 'sample rate' },
  lfo: { FREQ_LFO: 'lfo freq', SYNC_LFO: 'lfo sync', MOD_LFO: 'lfo amt', WAVE_LFO: 'lfo wave', RETRIGGER_LFO: 'retrigger', OFFSET_LFO: 'lfo offset' },
  velocity: { VEL_DEST: 'vel dest', VEL_AMT: 'vel amt', VEL_MOD_VOL: 'vel vol' },
};
const VP_PAGES = [['tone', ['oscillator', 'fm']], ['shape', ['amp', 'pitch', 'click']], ['filter', ['filter', 'mix']], ['mod', ['lfo', 'velocity']]];
// a drum's four pages: [name, [[label, parameter name], ...]]
function vpSections(v) {
  const sec = {};
  for (const g of VOICE_PAGES[v].groups) {
    const n = vpNice(g.name.replace(/ \(.*\)/, ''));
    const into = (k, ps) => { sec[k] = (sec[k] || []).concat(ps.map(([t, pn]) => [VP_LABEL[k]?.[t] ?? vpNice(t), pn])); };
    if (n === 'modulation') { into('pitch', g.params.filter(([t]) => !t.startsWith('VEL_'))); into('velocity', g.params.filter(([t]) => t.startsWith('VEL_'))); }
    else into({ 'amp eg': 'amp', 'transient sample': 'click' }[n] || n, g.params);
  }
  // (two waves on the cymbal's and hi-hat's fm: one for each mod oscillator)
  for (const ps of Object.values(sec)) { const w = ps.filter(([l]) => l === 'fm wave'); if (w.length === 2) { w[0][0] = 'mod1 wave'; w[1][0] = 'mod2 wave'; } }
  return VP_PAGES.map(([name, parts]) => ({ name, params: parts.flatMap((k) => sec[k] || []) }));
}
let mVoice = 0, mVSec = 0;
const mVBoxes = {};
XN.forEach((name, v) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'm-btn'; b.textContent = name; b.setAttribute('role', 'tab');
  b.addEventListener('click', () => { mVoice = v; mVoiceShow(); });
  $('m-voice').append(b);
});
function mVoiceBox(v, k) {
  const id = `m-voice-${v + 1}-${VP_PAGES[k][0]}`;
  if (mVBoxes[id]) return mVBoxes[id];
  const sec = vpSections(v)[k], box = document.createElement('div');
  box.className = 'm-faders m-vset'; box.id = id; $('m-vsets').append(box);
  for (const [label, pn] of sec.params) {
    const par = PAR[pn], sp = spec(par);
    mFader(box, label, { min: 0, max: sp.max, get: () => values[par], set: (x) => { setValue(par, x); setDirty(true); },
      show: (x) => String(sp.show ? sp.show(x) : x), dflt: () => initValues[par] });
  }
  return (mVBoxes[id] = box);
}
function mVoiceShow() {
  [...$('m-voice').children].forEach((b, v) => b.setAttribute('aria-selected', v === mVoice));
  const secs = vpSections(mVoice), strip = $('m-vsec'); strip.innerHTML = '';
  secs.forEach((sc, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.setAttribute('role', 'tab');
    b.textContent = sc.name; b.setAttribute('aria-selected', k === mVSec);
    b.addEventListener('click', () => { mVSec = k; mVoiceShow(); }); strip.append(b);
  });
  const cur = mVoiceBox(mVoice, mVSec);
  for (const box of Object.values(mVBoxes)) box.hidden = box !== cur;
  mDrawAll();
}
mVoiceShow();
const mPct = (v) => (v ? Math.round(v) + '%' : 'off');
// the same send on every drum (the mixer's per-drum sends, all at once); an echo send routes the drum to the echo bus
const mAllSend = (k) => ({ min: 0, max: 100, get: () => Math.max(...mix[k]), show: (v) => `send ${mPct(v)}`,
  set: (v) => { mix[k].fill(v); if (k === 'fx') fxButtons.forEach((b) => b()); sendMix(); } });

