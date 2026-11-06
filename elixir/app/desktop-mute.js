// ---- mutes (laptop), beside the knobs: a column a drum (drum 1, 2, 3, snare, cymbal, hihat: the hat's closed and open
// together), each a level meter over its mute button (keys z x c v b n), then its echo send and reverb send as number
// boxes, each with its own mute (keys a s d f g h and q w e r t y). A muted send sends nothing, its amount kept. They work on the notes, not the sound: a muted
// drum's steps aren't sent to the player, so it stops being hit while anything already sounding (a decay, an echo) rings
// on. Like density, they change what's sent, not the pattern; presets keep them (song.mute) ----
let mMute = new Array(6).fill(false);
// (the pattern's tracks each drum mutes: the hihat is its closed and open tracks)
const MUTE_TRACKS = [[0], [1], [2], [3], [4], [5, 6]];
const mMuteSend = send;
send = function (m) {
  if (m && m.type === 'seq' && m.pattern && mMute.some(Boolean)) {
    const P = m.pattern, cut = (pg) => { mMute.forEach((on, d) => { if (on) for (const t of MUTE_TRACKS[d]) pg.on[t] = pg.on[t].map(() => 0); }); return pg; };
    if (P.pages) P.pages = P.pages.map(cut); else cut(P);
  }
  mMuteSend(m);
};
// the sends' mutes: the mixer's amounts stay as they are; what goes to the player is 0 while muted
const mSendMute = { fx: new Array(6).fill(false), ring: new Array(6).fill(false) };
const SEND_KEYS = { fx: ['a', 's', 'd', 'f', 'g', 'h'], ring: ['q', 'w', 'e', 'r', 't', 'y'] };
send = ((inner) => function (m) {
  if (m && m.type === 'mix' && (mSendMute.fx.some(Boolean) || mSendMute.ring.some(Boolean))) {
    m = { ...m, fx: m.fx.map((v, n) => (mSendMute.fx[n] ? 0 : v)), sendR: m.sendR.map((v, n) => (mSendMute.ring[n] ? 0 : v)) };
  }
  inner(m);
})(send);
function mSendToggle(k, n) { mSendMute[k][n] = !mSendMute[k][n]; mMuteDraw(); sendMix(); setDirty(true); }
const MUTE_N = ['dr1', 'dr2', 'dr3', 'sn', 'cy', 'hh'], MUTE_KEYS = ['z', 'x', 'c', 'v', 'b', 'n'];
const mMuteCols = MUTE_N.map((n, d) => {
  const col = document.createElement('div'); col.className = 'm-mute-col';
  // top to bottom: the reverb send, the echo send (each a number box with its mute), the drum's level fader with its
  // level meter beside it, its mute, its key
  const sends = {};
  for (const k of ['ring', 'fx']) {
    mFader(col, `${n} ${k === 'fx' ? 'echo' : 'verb'}`, { min: 0, max: 100, get: () => mix[k][d], dflt: 0, num: true,
      show: String, set: (v) => { mix[k][d] = v; if (k === 'fx') fxButtons[d](); sendMix(); setDirty(true); } });
    const box = col.lastElementChild, sm = document.createElement('button');
    sm.type = 'button'; sm.className = 'm-toggle m-send-mute'; sm.setAttribute('aria-pressed', 'false');
    sm.addEventListener('click', () => mSendMute_toggle(k, d)); col.append(sm);
    sends[k] = { box, sm };
  }
  // the level: a fader like the mixer's, its meter beside the track (the same peaks as the mixer's)
  const vol = PAR.VOL1 + d;
  mFader(col, 'lvl', { min: 0, max: 127, get: () => values[vol], dflt: () => initValues[vol], knob: false,
    show: String, set: (v) => { setValue(vol, v, true); setDirty(true); } });
  const lvlEl = col.lastElementChild, meter = document.createElement('u');
  meter.className = 'm-mute-meter'; meter.setAttribute('aria-hidden', 'true'); meter.innerHTML = '<span class="m-lvm-on"></span><span class="m-lvm-pk"></span>';
  lvlEl.querySelector('.m-vtrack').append(meter);
  lvlEl.classList.add('m-mute-level');
  const b = document.createElement('button'); b.type = 'button'; b.className = 'm-toggle'; b.textContent = n;
  b.addEventListener('click', () => mMuteToggle(d)); col.append(b);
  $('m-mute-rows').append(col);
  return { col, b, meter, sends };
});
function mSendMute_toggle(k, d) { mSendToggle(k, d); }
function mMuteToggle(d) { mMute[d] = !mMute[d]; mMuteDraw(); sendSeq(); setDirty(true); }
function mMuteDraw() {
  mMuteCols.forEach(({ col, b, sends }, d) => {
    b.setAttribute('aria-pressed', mMute[d]); b.setAttribute('aria-label', `mute ${XN[d]}`); col.classList.toggle('quiet', mMute[d]);
    for (const k of ['fx', 'ring']) {
      const on = mSendMute[k][d]; sends[k].sm.setAttribute('aria-pressed', on); sends[k].box.classList.toggle('muted', on);
      sends[k].sm.setAttribute('aria-label', `mute ${XN[d]} ${k === 'fx' ? 'echo' : 'reverb'} send`);
    }
  });
}
// the meters: the same peaks as the mixer's (lvms in app/mixer.js, one a drum)
const mMuteLvm = lvmDraw;
lvmDraw = function (m) {
  mMuteLvm(m);
  const c = mMuteCols[lvms.indexOf(m)]; if (!c) return;
  c.meter.style.setProperty('--m', ((Math.max(LVM_FLOOR, m.db) - LVM_FLOOR) / -LVM_FLOOR).toFixed(3));
  c.meter.style.setProperty('--h', ((Math.max(LVM_FLOOR, m.hold) - LVM_FLOOR) / -LVM_FLOOR).toFixed(3));
};
$('m-mute-clear').addEventListener('click', () => { mMute.fill(false); mSendMute.fx.fill(false); mSendMute.ring.fill(false); mMuteDraw(); sendSeq(); sendMix(); setDirty(true); });
const mMuteSnap = songSnapshot, mMuteUse = useSong;
songSnapshot = function () { return { ...mMuteSnap(), mute: mMute.slice(), sendMute: { fx: mSendMute.fx.slice(), ring: mSendMute.ring.slice() } }; };
useSong = function (g, keepTempo) {
  mMute = Array.from({ length: 6 }, (_, d) => !!(g.mute && g.mute[d]));
  for (const k of ['fx', 'ring']) mSendMute[k] = Array.from({ length: 6 }, (_, d) => !!(g.sendMute && g.sendMute[k] && g.sendMute[k][d]));
  mMuteUse(g, keepTempo); mMuteDraw(); sendSeq(); sendMix();
};
mMuteDraw();
