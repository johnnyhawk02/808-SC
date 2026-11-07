// ---- the fx page: the two send effects' settings on faders, a row each (the distortion is on the master page; random
// fx and alter fx are on the perf page) ----
const fxF = (box, label, A) => mFader($(box), label, { min: A.min, max: A.max, step: A.step || 1, get: A.get, set: (v) => { A.set(v); setDirty(true); }, show: A.show, dflt: A.dflt });
const fxSend = (k) => ({ ...mAllSend(k), show: (v) => mPct(v), dflt: 0 });
const fxPar = (p, dflt) => ({ min: 0, max: 127, get: () => values[p], set: (v) => setValue(p, v, true), show: String, dflt });
const fx3P = (i) => ({ min: 0, max: 127, get: () => fx3.dist.p[i], set: (v) => { fx3.dist.p[i] = v; sendMix(); }, show: String, dflt: FX3_0.dist.p[i] });
// echo: ping pong (the box by its name), send, its tempo-synced time (the nearest note length), tone, feedback and width
$('m-pp').addEventListener('change', () => { setValue(PAR.FX_DELAY_TYPE, $('m-pp').checked ? 1 : 0, true); setDirty(true); });
mDraws.push(() => { $('m-pp').checked = values[PAR.FX_DELAY_TYPE] === 1; });
fxF('m-fx-echo', 'send', fxSend('fx'));
fxF('m-fx-echo', 'time', { min: 0, max: 1000, get: echoTime, set: setEchoTime,
  show: echoTimeShow, dflt: Math.round(posOf(3 / 16) * 1000) });
fxF('m-fx-echo', 'tone', fxPar(PAR.FX_P3));
fxF('m-fx-echo', 'feedback', fxPar(PAR.FX_P4));
fxF('m-fx-echo', 'width', { min: 0, max: 200, get: () => fx3.echo.pct, set: (v) => { fx3.echo.pct = v; sendMix(); }, show: (v) => v + '%', dflt: FX3_0.echo.pct });
// fine tune: ±1% of the echo time, in hundredths of a percent (synced or free)
fxF('m-fx-echo', 'fine', { min: -100, max: 100, get: () => fx3.echo.fine || 0, set: (v) => { fx3.echo.fine = v; sendMix(); }, show: (v) => `${v > 0 ? '+' : ''}${(v / 100).toFixed(2)}%`, dflt: 0 });
// the sync box: on, the time is on the musical lengths; off, free milliseconds (the same knob)
$('m-sync').addEventListener('change', () => { fx3.echo.sync = $('m-sync').checked; sendMix(); setDirty(true); mDrawAll(); });
mDraws.push(() => { $('m-sync').checked = echoSynced(); });
// EVERYTHING: a new patch has the echo synced, with its fine tune randomised
$('m-everything').addEventListener('click', () => { fx3.echo.sync = true; fx3.echo.fine = rIn(-100, 100); sendMix(); mDrawAll(); });
// reverb (send 2, where the ring mod was; its sends are still mix.ring): the IR (picked in its header, app/irverb.js), send,
// pre-delay, length (how much of the IR), low cut, tone (a low-pass) and width
fxF('m-fx-ring', 'send', fxSend('ring'));
const verbP = (k, show) => ({ min: 0, max: 127, get: () => (fx3.verb || (fx3.verb = { ...FX3_0.verb }))[k] ?? FX3_0.verb[k], set: (v) => { fx3.verb[k] = v; sendMix(); }, show, dflt: FX3_0.verb[k] });
const hz = (f) => (f >= 1000 ? `${(f / 1000).toFixed(f < 10000 ? 1 : 0)}k` : String(Math.round(f)));
fxF('m-fx-ring', 'pre', verbP('pre', (v) => `${Math.round(v / 127 * 150)}ms`));
fxF('m-fx-ring', 'length', verbP('len', (v) => `${Math.round((0.1 + 0.9 * v / 127) * 100)}%`));
fxF('m-fx-ring', 'low cut', verbP('low', (v) => hz(20 * Math.pow(25, v / 127))));
fxF('m-fx-ring', 'tone', verbP('tone', (v) => hz(1000 * Math.pow(20, v / 127))));
fxF('m-fx-ring', 'width', verbP('width', (v) => `${Math.round(v / 64 * 100)}%`));

// ---- the master page's distortion: the whole mix through it (after the sidechain's duck), into the compressor; the
// page runs top to bottom in signal order: sidechain, distortion, compressor. Mix (0 bypasses it), type (tube,
// fold or rat), drive, color, tone, volume ----
fxF('m-dist', 'mix', { min: 0, max: 100, get: () => fx3.dist.mix || 0, set: (v) => { fx3.dist.mix = v; sendMix(); }, show: (v) => (v ? v + '%' : 'off'), dflt: 0 });
const DIST_T = LXR.DIST_NAMES.map((n) => n.toLowerCase());
fxF('m-dist', 'type', { min: 0, max: DIST_T.length - 1, get: () => fx3.dist.type, set: (v) => { fx3.dist.type = v; sendMix(); }, show: (v) => DIST_T[v], dflt: 0 });
['drive', 'color', 'tone', 'volume'].forEach((l, i) => fxF('m-dist', l, fx3P(i)));

// ---- the mix page: each drum's echo and reverb sends, then its level, a column a drum ----
const XS = ['d1', 'd2', 'd3', 'sn', 'cy', 'hh'];
XS.forEach((short, n) => {
  // an echo send above 0 routes the drum to the echo bus (fxButtons does that, as the mixer's dial does)
  for (const [k, box] of [['fx', 'm-mix-echo'], ['ring', 'm-mix-ring']]) {
    mFader($(box), short, { min: 0, max: 100, get: () => mix[k][n], show: (v) => (v ? String(v) : 'off'), dflt: 0, knob: true,
      set: (v) => { mix[k][n] = v; if (k === 'fx') fxButtons[n](); sendMix(); setDirty(true); } });
  }
  // pan: left 63 .. centre (63, as the full mixer has it) .. right 64 (laptop; the phone's mix page has no room)
  const pan = PAR.PAN1 + n;
  mFader($('m-mix-pan'), short, { min: 0, max: 127, get: () => values[pan], dflt: () => initValues[pan], knob: true,
    show: (v) => (v === 63 ? 'C' : v < 63 ? `L${63 - v}` : `R${v - 63}`), set: (v) => { setValue(pan, v, true); setDirty(true); } });
  const vol = PAR.VOL1 + n;
  mFader($('m-mix-vol'), short, { min: 0, max: 127, get: () => values[vol], show: String, dflt: () => initValues[vol],
    set: (v) => { setValue(vol, v, true); setDirty(true); } });
});

// random fx: new sends on every drum (each effect on some of them) and new settings for the echo and reverb;
// alter fx: every send already on, and every setting, moved up to 10% of its range either way. Undo takes either back
const fxSnap = () => ({ fx: mix.fx.slice(), ring: mix.ring.slice(), fx3: structuredClone(fx3), pos: delayPos, p3: values[PAR.FX_P3], p4: values[PAR.FX_P4], pp: values[PAR.FX_DELAY_TYPE] });
function fxUse(q) {
  mix.fx.splice(0, 6, ...q.fx); mix.ring.splice(0, 6, ...q.ring);
  Object.assign(fx3.echo, q.fx3.echo); fx3.verb = { ...FX3_0.verb, ...q.fx3.verb };
  delayPos = q.pos; send({ type: 'delay', pos: delayPos });
  setValue(PAR.FX_P3, q.p3, true); setValue(PAR.FX_P4, q.p4, true); setValue(PAR.FX_DELAY_TYPE, q.pp, true);
  fxButtons.forEach((b) => b()); sendMix(); mDrawAll(); setDirty(true);
}
const rIn = (lo, hi) => lo + Math.round(Math.random() * (hi - lo));
function fxChange(fn) {
  const was = fxSnap(), q = fxSnap();
  fn(q); fxUse(q);
  undoValues = null; $('undo').disabled = true; mUndoFn = () => fxUse(was); mUndo();
}
// random fx: new sends and effect settings, by the fx randomiser's settings (EVERYTHING uses it too)
function mFxRandomise(q) {
  const F = RAND.fx;
  for (let v = 0; v < 6; v++) {
    q.fx[v] = rChance(F.echoOn) ? rRange(F.echoLo, F.echoHi) : 0;
    q.ring[v] = rChance(F.ringOn) ? rRange(F.ringLo, F.ringHi) : 0;
  }
  q.pos = randomDelayPos(); // (musical lengths, as every randomiser)
  q.pp = rChance(F.pingpong) ? 1 : 0;
  q.p3 = rRange(F.toneLo, F.toneHi); q.p4 = rChance(F.fbWild) ? rIn(70, 105) : rRange(F.fbLo, F.fbHi);
  q.fx3.echo.pct = rRange(F.widthLo, F.widthHi);
  q.fx3.verb = { pre: rIn(0, 40), len: rIn(40, 127), low: rIn(30, 90), tone: rIn(60, 120), width: rIn(50, 110) };
}
$('m-fx-rand').addEventListener('click', async () => { await startAudio(); fxChange(mFxRandomise); });
$('m-fx-alter').addEventListener('click', async () => {
  await startAudio();
  const a = RAND.alterfx.amount / 100, nudge = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v + (Math.random() * 2 - 1) * a * (hi - lo))));
  fxChange((q) => {
    for (const k of ['fx', 'ring']) q[k] = q[k].map((v) => (v ? nudge(v, 1, 100) : 0));
    q.pos = Math.max(0, Math.min(1, q.pos + (Math.random() * 2 - 1) * a / 2));
    q.p3 = nudge(q.p3, 0, 127); q.p4 = nudge(q.p4, 0, 127);
    q.fx3.echo.pct = nudge(q.fx3.echo.pct, 0, 200);
    const vb = q.fx3.verb || { ...FX3_0.verb }; q.fx3.verb = Object.fromEntries(Object.entries(vb).map(([k, v]) => [k, nudge(v, 0, 127)]));
  });
});

