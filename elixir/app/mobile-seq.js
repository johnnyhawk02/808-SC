// ---- step sequencers: holding a fader opens one for it: 2 to 64 steps (shown sixteen at a time, a page each), each an offset from the fader's setting (up or
// down, up to depth of its range) that it takes while playing (the step is the bar's 16th counted from the start,
// wrapped at the length, so short ones run against the bar), jumping to it or, with slew, gliding to it over up to a
// whole step; each step lasts a 16th note up to 8 bars. The fader still moves its setting meanwhile, and stopping
// (or switching the sequencer off) puts the setting back.
// Draw the steps with a finger (drag across to paint), randomise them, or switch it off; a fader with one running is
// marked. Presets keep them ----
const mSeqSteps = Array.from({ length: 16 }, (_, i) => { const c = document.createElement('i'); c.dataset.i = i; $('m-seq-steps').append(c); return c; });
let mSeqF = null;
// up to four pages of sixteen; the page shown (the sixteen cells are its steps), and its buttons in the heading (the
// pages past the length faint; the one playing marked)
const SEQ_MAX = 64;
let mSeqPage = 0;
const mSeqPageBtns = [0, 1, 2, 3].map((p) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'm-toggle'; b.textContent = p + 1; b.setAttribute('aria-label', `steps ${p * 16 + 1} to ${p * 16 + 16}`);
  // (on a sequencer with nothing in it yet, a page button also sets the length: 16, 32, 48 or 64 steps)
  b.addEventListener('click', () => { const q = mSeqQ(); if (q.vals.every((v) => !v)) q.len = (p + 1) * 16; mSeqPage = p; mSeqDraw(); }); $('m-seq-pages').append(b); return b;
});
// (sequences kept with sixteen steps get the rest, at rest)
const mSeqPad = (vals) => { const v = vals.slice(0, SEQ_MAX); while (v.length < SEQ_MAX) v.push(0); return v; };
// speed: how long each step lasts, in 16ths: a 16th note (1) up to 8 bars (128); counted from the bar's 16ths, so every
// speed stays in time with the beat
const SEQ_STEPS = [1, 2, 4, 8, 16, 32, 64, 128];
const stepName = (v) => (v < 16 ? `1/${16 / v}` : v === 16 ? '1 bar' : `${v / 16} bars`);
// a step's offset, -1..1 of depth, in twentieths
const mSeqOff = (x) => Math.round(Math.max(-1, Math.min(1, x)) * 20) / 20;
const newSeq = () => ({ on: true, len: 16, slew: 0, step: 1, depth: 50, vals: new Array(SEQ_MAX).fill(0) });
// the value heard: the setting moved by the current offset
function mSeqApply(f) {
  const q = f.seq;
  if (f.base === null) f.base = f.get();
  f.put(f.base + f.off * (q ? q.depth / 100 : 0) * (f.hiOf() - f.min));
}
// back to the setting, the sequencer let go
function mSeqRelease(f) {
  if (f.base === null) return;
  const b = f.base; f.glide = null; f.off = 0; f.base = null; f.put(b);
}
// a control without a sequencer shows a draft, switched off and kept apart from it, so opening one (or, on the laptop,
// just touching the control) costs nothing; it becomes the control's own, switched on, once a step is painted or it's
// randomised or switched on
let mSeqDraft = null;
const mSeqQ = () => mSeqF.seq || mSeqDraft;
function mSeqCommit() { if (!mSeqF.seq) { mSeqF.seq = mSeqDraft; mSeqDraft = null; } mSeqF.seq.on = true; }
function mSeqOpen(fd) {
  mSeqDraft = fd.seq ? null : { ...newSeq(), on: false };
  mSeqF = fd; mSeqPage = 0; $('m-seq-name').textContent = fd.label;
  $('m-seq').hidden = false; mSeqDraw();
}
function mSeqDraw() {
  const fd = mSeqF, q = mSeqQ();
  if (mSeqPage * 16 >= q.len) mSeqPage = Math.ceil(q.len / 16) - 1;
  mSeqSteps.forEach((c, j) => {
    const i = mSeqPage * 16 + j;
    c.style.setProperty('--up', Math.max(0, q.vals[i])); c.style.setProperty('--dn', Math.max(0, -q.vals[i]));
    c.classList.toggle('off', i >= q.len);
  });
  mSeqPageBtns.forEach((b, p) => { b.setAttribute('aria-pressed', p === mSeqPage); b.classList.toggle('off', p * 16 >= q.len); });
  $('m-seq-depth').style.setProperty('--w', q.depth / 100); $('m-seq-depth-out').textContent = `±${q.depth}%`;
  $('m-seq-len').style.setProperty('--w', q.len / SEQ_MAX); $('m-seq-len-out').textContent = `${q.len} steps`;
  $('m-seq-slew').style.setProperty('--w', q.slew / 100); $('m-seq-slew-out').textContent = q.slew ? `${q.slew}%` : 'off';
  $('m-seq-speed').style.setProperty('--w', (SEQ_STEPS.indexOf(q.step) + 1) / SEQ_STEPS.length); $('m-seq-speed-out').textContent = stepName(q.step);
  $('m-seq-on').setAttribute('aria-pressed', q.on); $('m-seq-on').textContent = q.on ? 'on' : 'off';
  mSeqMarks();
}
const mSeqMarks = () => mFaders.forEach((f) => f.el.classList.toggle('seq', !!(f.seq && f.seq.on)));
// presets keep them: song.seqs, by fader (its box and label); a preset without one clears it
const mSnapSong = songSnapshot, mUseSong = useSong;
songSnapshot = function () {
  const seqs = {};
  // (with the settings, not the values heard, saved)
  const held = mFaders.filter((f) => f.base !== null).map((f) => [f, f.get()]);
  for (const [f] of held) f.put(f.base);
  for (const f of mFaders) if (f.seq) seqs[f.key] = { on: f.seq.on, len: f.seq.len, slew: f.seq.slew, step: f.seq.step, depth: f.seq.depth, rel: true, vals: f.seq.vals.slice() };
  const song = { ...mSnapSong(), seqs, xdepth: Number($('xdepth').value) };
  for (const [f, v] of held) f.put(v);
  return song;
};
useSong = function (g, keepTempo) {
  mUseSong(g, keepTempo);
  mXDepth(typeof g.xdepth === 'number' ? g.xdepth : 100);
  for (const f of mFaders) {
    const q = g.seqs && g.seqs[f.key];
    f.base = null; f.off = 0; f.glide = null;
    // (sequences saved before they were offsets held values: they become offsets from the middle of the range)
    const hi = f.hiOf(), vals = q ? (q.rel ? q.vals.slice() : q.vals.map((v) => mSeqOff(((v - f.min) / (hi - f.min || 1)) * 2 - 1))) : null;
    f.seq = q ? { on: !!q.on, len: Math.max(2, Math.min(SEQ_MAX, q.len)), slew: q.slew || 0, step: SEQ_STEPS.includes(q.step) ? q.step : 1, depth: typeof q.depth === 'number' ? q.depth : 50, vals: mSeqPad(vals) } : null;
  }
  if (mSeqF) { if (!mSeqF.seq) mSeqDraft = { ...newSeq(), on: false }; mSeqDraw(); }
  mSeqMarks();
};
// painting: a step takes the offset at the finger's height (the middle is none); dragging across paints the steps it passes
{
  const box = $('m-seq-steps');
  let painting = false;
  const paint = (e) => {
    // (eight across in two rows on the phone, sixteen in one on the laptop)
    const r = box.getBoundingClientRect(), cols = getComputedStyle(box).gridTemplateColumns.split(' ').length, rows = 16 / cols;
    const col = Math.max(0, Math.min(cols - 1, Math.floor((e.clientX - r.left) / r.width * cols)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor((e.clientY - r.top) / r.height * rows)));
    const c = mSeqSteps[row * cols + col], cr = c.getBoundingClientRect();
    if (c.classList.contains('off')) return;
    if (!mSeqF.seq || !mSeqF.seq.on) mSeqCommit();
    const o = mSeqF.seq.vals[mSeqPage * 16 + row * cols + col] = mSeqOff(1 - 2 * (e.clientY - cr.top) / cr.height);
    $('m-seq-val').textContent = `${o > 0 ? '+' : o < 0 ? '−' : ''}${Math.round(Math.abs(o) * mSeqF.seq.depth)}%`;
    mSeqDraw();
  };
  box.addEventListener('pointerdown', (e) => { box.setPointerCapture(e.pointerId); painting = true; paint(e); });
  box.addEventListener('pointermove', (e) => { if (painting) paint(e); });
  const stop = () => { painting = false; };
  box.addEventListener('pointerup', stop); box.addEventListener('pointercancel', stop);
}
// the length (2 at the left to 64 at the right) and the slew (off to a whole step): horizontal bars
function mSeqBar(bar, setFrac) {
  const at = (e) => { const r = bar.getBoundingClientRect(); setFrac(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); mSeqDraw(); };
  let held = false;
  bar.addEventListener('pointerdown', (e) => { bar.setPointerCapture(e.pointerId); held = true; at(e); });
  bar.addEventListener('pointermove', (e) => { if (held) at(e); });
  bar.addEventListener('pointerup', () => { held = false; }); bar.addEventListener('pointercancel', () => { held = false; });
}
// (each bar's setting from 0..1 of its width; MIDI CC 21 to 24 set them too, on the sequencer shown: app/mobile-slots.js)
const SEQ_BARS = [(x) => { mSeqQ().len = 2 + Math.round(x * (SEQ_MAX - 2)); }, (x) => { mSeqQ().slew = Math.round(x * 20) * 5; },
  (x) => { mSeqQ().step = SEQ_STEPS[Math.min(SEQ_STEPS.length - 1, Math.floor(x * SEQ_STEPS.length))]; },
  (x) => { mSeqQ().depth = Math.round(x * 20) * 5; if (mSeqF.base !== null) mSeqApply(mSeqF); }];
['m-seq-len', 'm-seq-slew', 'm-seq-speed', 'm-seq-depth'].forEach((id, i) => mSeqBar($(id), SEQ_BARS[i]));
$('m-seq-rand').addEventListener('click', () => { mSeqCommit(); const q = mSeqF.seq; for (let i = 0; i < SEQ_MAX; i++) q.vals[i] = mSeqOff(Math.random() * 2 - 1); mSeqDraw(); });
// shapes (laptop): the steps over the sequence's length set to a ramp, a triangle, a square or a sine, from -1 to 1
const SEQ_SHAPES = { up: (x) => 2 * x - 1, down: (x) => 1 - 2 * x, tri: (x) => (x < .5 ? 4 * x - 1 : 3 - 4 * x), square: (x) => (x < .5 ? 1 : -1), sine: (x) => Math.sin(2 * Math.PI * x) };
$('m-seq-shapes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-shape]'); if (!b) return;
  mSeqCommit(); const q = mSeqF.seq, f = SEQ_SHAPES[b.dataset.shape];
  // (ramps and the triangle reach both ends; the square and sine repeat at the length)
  const ends = b.dataset.shape === 'up' || b.dataset.shape === 'down';
  for (let i = 0; i < SEQ_MAX; i++) q.vals[i] = i < q.len ? mSeqOff(f(ends ? i / (q.len - 1) : i / q.len)) : 0;
  mSeqDraw();
});
// random steps (laptop), five ways, each -1..1 over the sequence's length:
// rnd: each step anywhere; drunk: a random walk, each step a small move from the last; hold: a random value held for 2
// to 4 steps (sample and hold); sparse: mostly at rest, now and then a big jump; smooth: random points every 4 steps,
// glided between
const SEQ_RNDS = {
  rnd: (n) => Array.from({ length: n }, () => Math.random() * 2 - 1),
  drunk: (n) => { let v = Math.random() * 2 - 1; return Array.from({ length: n }, () => (v = Math.max(-1, Math.min(1, v + (Math.random() - .5) * .7)))); },
  hold: (n) => { const out = []; while (out.length < n) { const v = Math.random() * 2 - 1, k = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < k; i++) out.push(v); } return out.slice(0, n); },
  sparse: (n) => Array.from({ length: n }, () => (Math.random() < .25 ? (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .5) : 0)),
  smooth: (n) => { const pts = Array.from({ length: Math.ceil(n / 4) + 1 }, () => Math.random() * 2 - 1); return Array.from({ length: n }, (_, i) => { const a = pts[i >> 2], b = pts[(i >> 2) + 1]; return a + (b - a) * (i % 4) / 4; }); },
};
$('m-seq-rnds').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rnd]'); if (!b) return;
  mSeqCommit(); const q = mSeqF.seq, v = SEQ_RNDS[b.dataset.rnd](q.len);
  for (let i = 0; i < SEQ_MAX; i++) q.vals[i] = i < q.len ? mSeqOff(v[i]) : 0;
  mSeqDraw();
});
$('m-seq-on').addEventListener('click', () => { if (!mSeqF.seq || !mSeqF.seq.on) mSeqCommit(); else { mSeqF.seq.on = false; mSeqRelease(mSeqF); } mSeqDraw(); });
mCloser('m-seq', () => { mSeqF = null; mSeqDraft = null; });
// the glides, a frame at a time while any is moving
let mGlideOn = false;
function mGlideRun() {
  if (mGlideOn) return;
  mGlideOn = true;
  const tick = () => {
    const now = performance.now();
    let any = false;
    for (const f of mFaders) {
      const g = f.glide; if (!g) continue;
      const k = Math.min(1, (now - g.t0) / g.ms);
      f.off = g.from + (g.to - g.from) * k; mSeqApply(f);
      if (k < 1 && f.seq && f.seq.on) any = true; else f.glide = null;
    }
    if (any) requestAnimationFrame(tick); else mGlideOn = false;
  };
  requestAnimationFrame(tick);
}
$('m').addEventListener('contextmenu', (e) => e.preventDefault());
// one step of a fader's sequencer: its offset, jumped to or, with slew, glided to over that share of the step
function mSeqStep(f, i, ms) {
  const q = f.seq, k = Math.floor(i) % q.len, to = q.vals[k] || 0;
  if (q.slew) { f.glide = { from: f.off, to, t0: performance.now(), ms: q.slew / 100 * ms }; mGlideRun(); } else { f.glide = null; f.off = to; mSeqApply(f); }
  if (f === mSeqF) { mSeqSteps.forEach((c, j) => c.classList.toggle('now', mSeqPage * 16 + j === k)); mSeqPageBtns.forEach((b, p) => b.classList.toggle('now', p === k >> 4)); }
}
// stopping puts every fader back to its setting
new MutationObserver(() => {
  if ($('play').getAttribute('aria-pressed') === 'true') return;
  mFaders.forEach(mSeqRelease); mSeqSteps.forEach((c) => c.classList.remove('now'));
  mBarBtns.forEach((b) => b.classList.remove('pending')); mBarBtns.clear();
  if (mPending) { mPending = null; mDrawPresets(); }
}).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
// on each 16th (as the audio thread reaches it, ahead of the output), every running sequencer steps its fader
// following the groove (user settings, seq tab; on unless switched off, kept in this browser)
const SEQ_GROOVE_KEY = 'elixir808-seqgroove';
let mSeqGroove = (() => { try { return localStorage.getItem(SEQ_GROOVE_KEY) !== '0'; } catch (e) { return true; } })();
let mSeqLast = -2;
// the drum (groove track) a fader belongs to: a voice page's drum, a perf slot set to a drum's setting; else -1
function mSeqTrack(f) {
  const v = /^m-voice-(\d)/.exec(f.key); if (v) return Number(v[1]) - 1;
  const sl = /^m-faders:slot(\d+)/.exec(f.key); if (sl) { const d = XN.indexOf(mSlots[Number(sl[1])][0]); if (d >= 0) return d; }
  return -1;
}
const mOnEvent = onEvent;
onEvent = function (ev) {
  // the bar waiting randomises come in on: stop their buttons' flash as that bar is heard
  if (ev.type === 'step' && ev.step === 0 && mBarBtns.size) {
    const bs = [...mBarBtns]; mBarBtns.clear();
    setTimeout(() => bs.forEach((b) => b.classList.remove('pending')), ctx && ctx.outputLatency ? ctx.outputLatency * 1000 : 0);
  }
  // the bar a waiting preset comes in on: stop its flash as that bar is heard
  if (ev.type === 'step' && ev.step === 0 && mPending) {
    const p = mPending; setTimeout(() => { if (mPending === p) { mPending = null; mDrawPresets(); } }, ctx && ctx.outputLatency ? ctx.outputLatency * 1000 : 0);
  }
  if (ev.type === 'step' && playing) {
    const n = ev.bar * 16 + ev.step, stepMs = 60000 / perf.tempo / 4, fresh = n !== mSeqLast + 1;
    mSeqLast = n;
    // a step each time the count reaches the step length: on the grid; or, following the groove, each 16th as late or
    // early as the groove puts that 16th's hits on the fader's drum (all the drums' average for a fader that isn't one
    // drum's), booked a 16th ahead so an early one can still land before its grid time
    const off = mSeqGroove ? grooveMsg().off : null;
    const due = (k) => mFaders.filter((f) => f.seq && f.seq.on && k % (f.seq.step || 1) === 0);
    if (!off || fresh) for (const f of due(n)) mSeqStep(f, n / (f.seq.step || 1), stepMs * (f.seq.step || 1));
    if (off) {
      const k = n + 1, s16 = k % 16;
      for (const f of due(k)) {
        const t = mSeqTrack(f), o = t >= 0 ? off[t][s16] : off.reduce((a, r) => a + r[s16], 0) / off.length, len = f.seq.step || 1;
        // (its step and length as booked: the speed may change before it lands)
        setTimeout(() => { if (playing && f.seq && f.seq.on) mSeqStep(f, k / len, stepMs * len); }, Math.max(0, stepMs * (1 + o)));
      }
    }
  } else if (ev.type === 'step') mSeqLast = -2;
  mOnEvent(ev);
};

