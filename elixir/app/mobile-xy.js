// ---- the x/y page: two pads, each moving any two parameters. Each axis is picked in two short lists: first where it
// lives (a drum, perform, fx, mix or master), then the parameter there (a drum's every parameter, grouped as on the
// voice, or that page's faders), so neither list is long. The picks are kept in this browser ----
const XY_IN = 16; // (the CSS's 16px)
// the places and their parameters: { name, groups: [[heading, [axis…]]] }, an axis { label, min, max, get, set }
const XY_PLACES = (() => {
  const nice = (t) => t.toLowerCase().replace(/_/g, ' ');
  const drums = XN.map((name, v) => ({ name, groups: VOICE_PAGES[v].groups.filter((g) => g.params.length).map((g) => [nice(g.name.replace(/ \(.*\)/, '')),
    g.params.map(([text, pn]) => { const par = PAR[pn]; return { label: nice(text), min: 0, max: spec(par).max, get: () => values[par], set: (x) => setValue(par, x), par }; })]) }));
  // a page's faders, by their row
  const faders = (rows) => rows.map(([heading, box]) => [heading, mFaders.filter((f) => f.key.startsWith(box + ':')).map((f) => ({ label: f.label, min: f.min, max: f.hiOf(), get: f.get, set: (x) => f.put(x), fd: f }))]);
  return [...drums,
    { name: 'beat', groups: faders([['beat', 'm-beat-faders'], ['density', 'm-dens-faders']]) },
    { name: 'perf', groups: faders([['perf', 'm-perf-src']]) },
    { name: 'fx', groups: faders([['echo', 'm-fx-echo'], ['reverb', 'm-fx-ring']]) },
    { name: 'mix', groups: faders([['echo send', 'm-mix-echo'], ['verb send', 'm-mix-ring'], ['pan', 'm-mix-pan'], ['level', 'm-mix-vol']]) },
    { name: 'master', groups: faders([['sidechain', 'm-duck'], ['distortion', 'm-dist'], ['compressor', 'm-comp']]) }];
})();
// two pads, one above the other, each with its own x and y picks: [pad][axis] = [place, group, item]
const XY_KEY = 'elixir808-xy';
let mXY = (() => { try { return JSON.parse(localStorage.getItem(XY_KEY)); } catch (e) { return null; } })();
if (!Array.isArray(mXY) || !Array.isArray(mXY[0]) || !Array.isArray(mXY[0][0])) mXY = [mXY && Array.isArray(mXY[0]) ? mXY : [[0, 0, 0], [0, 1, 1]], [[0, 5, 0], [0, 5, 1]]];
if (!mXY[1]) mXY[1] = [[0, 5, 0], [0, 5, 1]];
const xyAxis = (n, k) => { const [pl, g, i] = mXY[n][k], P = XY_PLACES[pl] || XY_PLACES[0], G = P.groups[g] || P.groups[0]; return { place: P.name, ...(G[1][i] || G[1][0]) }; };
function xyPick() { try { localStorage.setItem(XY_KEY, JSON.stringify(mXY)); } catch (e) {} mDrawAll(); }
[0, 1].forEach((n) => {
  const box = document.createElement('div'); box.className = 'm-xybox';
  box.innerHTML = ['x', 'y'].map((ax) => `<div class="m-xyrow"><span>${ax}</span><select aria-label="pad ${n + 1} ${ax === 'x' ? 'across' : 'up'}: where"></select><select aria-label="pad ${n + 1} ${ax === 'x' ? 'across' : 'up'}: parameter"></select></div>`).join('');
  const sels = [...box.querySelectorAll('select')]; // place, parameter for x, then for y
  const lists = () => [0, 1].forEach((k) => {
    const place = sels[k * 2], par = sels[k * 2 + 1];
    place.innerHTML = ''; XY_PLACES.forEach((P, i) => place.append(new Option(P.name, i)));
    place.value = mXY[n][k][0];
    par.innerHTML = '';
    (XY_PLACES[mXY[n][k][0]] || XY_PLACES[0]).groups.forEach(([heading, axes], g) => {
      const og = document.createElement('optgroup'); og.label = heading;
      axes.forEach((A, i) => og.append(new Option(A.label, `${g}:${i}`)));
      par.append(og);
    });
    par.value = `${mXY[n][k][1]}:${mXY[n][k][2]}`;
  });
  [0, 1].forEach((k) => {
    sels[k * 2].addEventListener('change', (e) => { mXY[n][k] = [Number(e.target.value), 0, 0]; lists(); xyPick(); });
    sels[k * 2 + 1].addEventListener('change', (e) => { const [g, i] = e.target.value.split(':').map(Number); mXY[n][k] = [mXY[n][k][0], g, i]; xyPick(); });
  });
  const pad = document.createElement('div');
  pad.className = 'm-xy'; pad.setAttribute('role', 'group');
  pad.innerHTML = `<b class="m-xy-t"></b><span class="m-xy-x"></span><span class="m-xy-y"></span><i></i><output></output>`;
  const out = pad.querySelector('output');
  const fr = (A) => (A.get() - A.min) / ((A.max - A.min) || 1);
  const show = (v) => (Number.isInteger(v) ? v : v.toFixed(2));
  const draw = () => {
    const X = xyAxis(n, 0), Y = xyAxis(n, 1);
    pad.querySelector('.m-xy-t').textContent = X.place === Y.place ? X.place : `${X.place} / ${Y.place}`;
    pad.querySelector('.m-xy-x').textContent = `${X.label} →`; pad.querySelector('.m-xy-y').textContent = `↑ ${Y.label}`;
    pad.setAttribute('aria-label', `pad ${n + 1}: ${X.place} ${X.label} across, ${Y.place} ${Y.label} up`);
    pad.style.setProperty('--x', fr(X)); pad.style.setProperty('--y', fr(Y));
    out.textContent = `${X.label} ${show(X.get())}\n${Y.label} ${show(Y.get())}`;
  };
  const at = (e) => {
    const r = pad.getBoundingClientRect(), X = xyAxis(n, 0), Y = xyAxis(n, 1);
    const val = (A, f) => A.min + Math.round(Math.max(0, Math.min(1, f)) * (A.max - A.min));
    const x = val(X, (e.clientX - r.left - XY_IN) / (r.width - 2 * XY_IN)), y = val(Y, (r.bottom - XY_IN - e.clientY) / (r.height - 2 * XY_IN));
    if (x !== X.get()) X.set(x);
    if (y !== Y.get()) Y.set(y);
    mDrawAll(); setDirty(true); // (the faders show the same parameters)
  };
  let held = false;
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); held = true; pad.classList.add('held'); at(e); });
  pad.addEventListener('pointermove', (e) => { if (held) at(e); });
  const end = () => { held = false; pad.classList.remove('held'); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  box.append(pad); $('m-xy-card').append(box); mDraws.push(draw);
  lists();
});

