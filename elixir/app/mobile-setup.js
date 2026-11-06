// ---- settings (the gear by the title): a tab each. copy: the perf faders' picks (to be baked in as SLOT0), the presets
// saved here (to be built in), export presets and clear all. rush: the rush graph (mobile-rush.js) ----
// (for now the settings are behind a password, asked once a visit)
const SET_PASS = 'Password1!';
$('m-set-open').addEventListener('click', () => {
  let ok = false; try { ok = sessionStorage.getItem('elixir808-set') === '1'; } catch (e) {}
  if (!ok) {
    const pw = prompt('Settings password');
    if (pw !== SET_PASS) { if (pw !== null) alert('Wrong password.'); return; }
    try { sessionStorage.setItem('elixir808-set', '1'); } catch (e) {}
  }
  $('m-set').hidden = false; mRushDraw();
});
mCloser('m-set');
mPaneTabs($('m-set-tabs'), 'set', () => mRushDraw());
// copy presets: every preset saved here, and the built-in ones saved over, in the export file's format
$('m-set-presets').addEventListener('click', async () => {
  const b = $('m-set-presets'), list = mSetPresets(false);
  if (!list.length) { mSay(b, 'none saved yet'); return; }
  mCopy(b, `Elixir Mobile presets\n${JSON.stringify({ elixir: 1, presets: list })}`, `copied ${list.length}`, 'Copy the presets:');
});
// the presets to copy or export: every one saved here and the built-in ones saved over (export adds the starred ones)
const mSetPresets = (stars) => kitList.filter((k) => k.saved || k.edited || (stars && k.builtin && mFavs.has(k.name))).map((k) => ({ ...presetData(k), fav: mFavs.has(k.name) }));
$('m-set-export').addEventListener('click', async () => {
  const b = $('m-set-export'), list = mSetPresets(true);
  if (!list.length) { mSay(b, 'none to export'); return; }
  const blob = new Blob([JSON.stringify({ elixir: 1, presets: list }, null, 1)], { type: 'application/json' });
  if (await mOffer({ blob, name: 'elixir808-presets.json' }, 'application/json')) mSay(b, `exported ${list.length}`);
});
$('m-set-clear').addEventListener('click', () => {
  const n = kitList.filter((k) => k.saved).length;
  if (!confirm(`Delete all ${n} of your saved presets and clear every star? This can't be undone.`)) return;
  mSay($('m-set-clear'), `cleared ${mClearAll()}`);
});
$('m-set-slots').addEventListener('click', () => mCopy($('m-set-slots'), `Elixir Mobile perf faders\n${JSON.stringify(mSlots)}`, 'copied', 'Copy the perf faders:'));
