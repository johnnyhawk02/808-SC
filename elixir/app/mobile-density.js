// ---- density: a fader a track on the beat page (drum 1, 2, 3, snare, cymbal, closed hat, open hat), 0 to 200%.
// Under 100% it thins that track's hits, the off-beats going first and the downbeats last; over 100% it adds hits on
// the empty steps, eighths first, until at 200% every step plays. Which hits go or come is fixed per step (not rolled
// each time), so moving the fader back and forth is repeatable. It changes what's sent to the player, not the pattern
// itself, and presets keep it (song.dens) ----
perf.dens = new Array(7).fill(100);
// (a step's fixed number 0..1: drawn from its track, step and page)
const densHash = (t, s, p) => { let h = (t * 374761393 + s * 668265263 + p * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// how readily a hit goes (higher goes first): mostly chance, the off-beats more so, downbeats least
const densDrop = (t, s, p) => densHash(t, s, p) * 0.7 + (s % 4 === 0 ? 0 : s % 2 === 0 ? 0.15 : 0.3);
// how readily an empty step fills (lower comes first): mostly chance, eighths before sixteenths
const densAdd = (t, s, p) => densHash(t + 11, s, p) * 0.7 + (s % 2 ? 0.3 : 0);
function densApply(P, p) {
  const d = perf.dens;
  for (let t = 0; t < 7; t++) {
    const k = d[t] / 100; if (k === 1) continue;
    for (let s = 0; s < 16; s++) {
      if (P.on[t][s]) { if (k < 1 && densDrop(t, s, p) >= k) P.on[t][s] = 0; }
      else if (k > 1 && densAdd(t, s, p) < k - 1) { P.on[t][s] = 1; P.acc[t][s] = 0; P.bar[t][s] = 0; }
    }
  }
  return P;
}
// (the message to the player, thinned or filled; the pattern the steps show is left as it is)
const densSend = send;
send = function (m) {
  if (m && m.type === 'seq' && m.pattern && perf.dens.some((v) => v !== 100)) {
    const P = m.pattern;
    if (P.pages) P.pages = P.pages.map((pg, i) => densApply(pg, i)); else densApply(P, 0);
  }
  densSend(m);
};
// the faders, under the beat page's (dr1 .. op), double-click to 100%
const DENS_N = ['dr1', 'dr2', 'dr3', 'sn', 'cy', 'cl', 'op'];
DENS_N.forEach((n, t) => mFader($('m-dens-faders'), n, { min: 0, max: 200, step: 5, get: () => perf.dens[t], dflt: 100,
  set: (v) => { perf.dens[t] = v; sendSeq(); setDirty(true); }, show: (v) => `${v}%` }));
// each track's light: a thin line under its name that lights on every hit of that track (the sequencer's and the pads'),
// at the same moment as the sound (the output latency), and fades
const densLeds = mFaders.slice(-DENS_N.length).map((fd) => {
  const led = document.createElement('i'); led.className = 'm-dens-led'; led.setAttribute('aria-hidden', 'true');
  fd.el.append(led); return led; // (under the name)
});
const densOnEvent = onEvent;
onEvent = function (ev) {
  if (ev.type === 'step' && ev.hits && playing) {
    const lat = ctx && ctx.outputLatency ? ctx.outputLatency * 1000 : 0;
    const lit = [...new Set(ev.hits)].filter((t) => t >= 0 && t < densLeds.length);
    setTimeout(() => lit.forEach((t) => { const l = densLeds[t]; l.classList.remove('on'); void l.offsetWidth; l.classList.add('on'); clearTimeout(l._t); l._t = setTimeout(() => l.classList.remove('on'), 110); }), lat);
  }
  densOnEvent(ev);
};
// presets keep the densities; one saved without them plays at 100%
const densSnap = songSnapshot, densUse = useSong;
songSnapshot = function () { return { ...densSnap(), dens: perf.dens.slice() }; };
useSong = function (g, keepTempo) {
  perf.dens = Array.isArray(g.dens) && g.dens.length === 7 ? g.dens.map((v) => Math.max(0, Math.min(200, Number(v) || 0))) : new Array(7).fill(100);
  densUse(g, keepTempo);
  sendSeq(); mDrawAll();
};
