// ---- presets: save, and a list to load or delete (kept in this browser, as on the desktop) ----
// while playing, a preset waits for the next bar to come in: until it's heard, the one playing stays marked and the
// new one's row flashes
let mPending = null, mPlayingPreset = null;
const mLoad = (k) => {
  if (!mPending) mPlayingPreset = kitList[Number($('kit').value)];
  loadPreset(k); mPending = playing ? k : null; mDrawPresets();
};
// the tempo box: ticked, loading a preset brings its saved tempo; unticked, the tempo stays (the desktop's bpm box,
// remembered in this browser)
$('m-pbpm').checked = presetBpm.checked;
$('m-pbpm').addEventListener('change', () => { presetBpm.checked = $('m-pbpm').checked; presetBpm.dispatchEvent(new Event('change')); });
// favourites: a star on any preset, mine or built in, keeps it in a group at the top of the list. Kept in this browser
// by name (a saved one also carries fav, so an export keeps it)
const FAV_KEY = 'elixir808-favs';
const mFavs = new Set((() => { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; } })());
for (const k of kitList) if (k.saved && k.fav) mFavs.add(k.name);
const mFavStore = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...mFavs])); } catch (e) {} };
function mDrawPresets() {
  mOverDraw();
  const list = $('m-plist'), cur = mPending ? mPlayingPreset : kitList[Number($('kit').value)];
  list.innerHTML = '';
  const group = (t) => { const li = document.createElement('li'); li.className = 'm-pgroup'; li.textContent = t; list.append(li); };
  const row = (k) => {
    const li = document.createElement('li'); li.classList.toggle('cur', k === cur); li.classList.toggle('pending', k === mPending);
    li.innerHTML = '<button class="m-pload" type="button"><b></b><small></small></button>';
    li.querySelector('b').textContent = k.name; li.querySelector('small').textContent = k.song ? `${k.song.tempo} bpm` : '';
    li.querySelector('.m-pload').addEventListener('click', async () => { await startAudio(); mLoad(k); });
    const fav = mFavs.has(k.name), star = document.createElement('button');
    star.className = 'm-pfav'; star.type = 'button'; star.textContent = fav ? '★' : '☆';
    star.setAttribute('aria-pressed', fav); star.setAttribute('aria-label', `Favourite ${k.name}`);
    star.addEventListener('click', () => {
      if (mFavs.has(k.name)) mFavs.delete(k.name); else mFavs.add(k.name);
      if (k.saved) { k.fav = mFavs.has(k.name); storePresets(); }
      mFavStore(); mDrawPresets();
    });
    li.append(star);
    // (a built-in one has a gap where a saved one's delete is, so every row's name lines up)
    if (!k.saved) { const gap = document.createElement('span'); gap.className = 'm-pdel'; li.append(gap); }
    if (k.saved) {
      const d = document.createElement('button'); d.className = 'm-pdel'; d.type = 'button'; d.textContent = '✕';
      d.setAttribute('aria-label', `Delete ${k.name}`);
      d.addEventListener('click', () => {
        if (!confirm(`Delete ${k.name}?`)) return;
        const wasCur = k === kitList[Number($('kit').value)], keep = kitList[Number($('kit').value)];
        kitList.splice(kitList.indexOf(k), 1); storePresets(); fillKits();
        mFavs.delete(k.name); mFavStore();
        $('kit').value = wasCur ? 0 : kitList.indexOf(keep);
        mDrawPresets();
      });
      li.append(d);
    }
    list.append(li);
  };
  // a search: every preset whose name has it, in one list (enter loads the first)
  const q = $('m-psearch').value.trim().toLowerCase();
  if (q) {
    const found = kitList.filter((k) => (k.saved || k.builtin) && k.name.toLowerCase().includes(q));
    group(found.length ? `found ${found.length}` : 'none found'); found.forEach(row);
    return;
  }
  // favourites first (each shows only there), then mine, then built in
  const favs = kitList.filter((k) => mFavs.has(k.name) && (k.saved || k.builtin));
  if (favs.length) { group('favourites'); favs.forEach(row); }
  const mine = kitList.filter((k) => k.saved && !mFavs.has(k.name));
  // (an empty group is one line, its heading and why, so it doesn't push the list down)
  if (mine.length) { group('mine'); mine.slice().reverse().forEach(row); }
  else group(favs.some((k) => k.saved) ? 'mine: all starred' : 'mine: none yet, save makes one');
  group('built in');
  kitList.filter((k) => k.builtin && !mFavs.has(k.name)).forEach(row);
}
$('m-psave').addEventListener('click', () => {
  $('kit-save').click();
  const k = kitList[kitList.length - 1];
  $('m-pnote').textContent = `Saved as ${k.name}.`;
  mDrawPresets();
});
// save over: the current sound and song replace the loaded preset's, name and star kept (to match levels across
// presets). A built-in one's new version is kept in this browser over the factory one (and goes out with an export
// of favourites); Init kit can't be overwritten
const EDIT_KEY = 'elixir808-factory-edits';
const mEdits = (() => { try { return JSON.parse(localStorage.getItem(EDIT_KEY)) || {}; } catch (e) { return {}; } })();
kitList.forEach((k, i) => { if (k.builtin && mEdits[k.name]) { const q = toCurrent(mEdits[k.name]); if (q) kitList[i] = { ...fromStored(q, { builtin: true }), edited: true }; } });
const mOverTarget = () => { const k = mPending ? null : kitList[Number($('kit').value)]; return k && (k.saved || k.builtin) && k.kit !== factoryInit ? k : null; };
function mOverDraw() {
  const k = mOverTarget();
  $('m-pover').disabled = !k; $('m-pover').textContent = k ? `save over ${k.name}` : 'save over';
}
$('m-pover').addEventListener('click', () => {
  const k = mOverTarget();
  if (!k || !confirm(`Save the current sound over ${k.name}?`)) return;
  Object.assign(k, { kit: Uint8Array.from(values), xm: { amt: xm.amt.slice(), target: xm.target.slice() }, fx: mix.fx.slice(), fx3: fx3Snapshot(), dpos: delayPos, song: songSnapshot() });
  if (k.saved) storePresets();
  else { k.edited = true; mEdits[k.name] = presetData(k); try { localStorage.setItem(EDIT_KEY, JSON.stringify(mEdits)); } catch (e) {} }
  initValues.set(values); buildKnobs(); setDirty(false);
  $('m-pnote').textContent = `Saved over ${k.name}.`;
  mDrawPresets();
});

// presets files: the full Elixir's format, { elixir: 1, presets: [...] } (PRESETS.md); only the current
// preset version loads, and a name already saved here is skipped
async function mImport(files) {
  let n = 0, old = 0, bad = 0;
  for (const f of files) {
    try {
      for (const p of JSON.parse(await f.text()).presets || []) {
        const q = toCurrent(p); // (any preset with a kit, brought into this format)
        if (!q) { old++; continue; }
        if (kitList.some((k) => k.saved && k.name === q.name)) continue;
        kitList.push(fromStored(q, { saved: true })); n++;
        if (q.fav) { mFavs.add(q.name); mFavStore(); }
      }
    } catch (err) { bad++; }
  }
  if (n) { const v = $('kit').value; storePresets(); fillKits(); $('kit').value = v; }
  $('m-pnote').textContent = (n ? `Imported ${n}.` : 'Nothing new to import.') + (old ? ` ${old} skipped: not a preset.` : '') + (bad ? ` ${bad} file${bad > 1 ? 's' : ''} not a presets file.` : '');
  mDrawPresets();
}
$('m-pimport').addEventListener('change', async (e) => { await mImport([...e.target.files]); e.target.value = ''; });
$('m-psearch').addEventListener('input', () => { mDrawPresets(); $('m-plist').scrollTop = 0; });
$('m-psearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const b = $('m-plist').querySelector('.m-pload'); if (b) b.click(); }
  else if (e.key === 'Escape') { $('m-psearch').value = ''; mDrawPresets(); $('m-psearch').blur(); }
});
// export: every preset saved here, the built-in ones saved over and every starred one (each marked fav if starred, so an
// import stars it again), as the settings' export. It never deletes anything
$('m-pexport').addEventListener('click', async () => {
  const list = mSetPresets(true);
  if (!list.length) { $('m-pnote').textContent = 'No presets to export yet.'; return; }
  const blob = new Blob([JSON.stringify({ elixir: 1, presets: list }, null, 1)], { type: 'application/json' });
  if (await mOffer({ blob, name: 'elixir808-presets.json' }, 'application/json')) $('m-pnote').textContent = `Exported ${list.length} preset${list.length > 1 ? 's' : ''}.`;
});
// clear all (in settings): every saved preset deleted and every star cleared (the built-in ones stay)
function mClearAll() {
  const mine = kitList.filter((k) => k.saved), cur = kitList[Number($('kit').value)];
  for (const k of mine) kitList.splice(kitList.indexOf(k), 1);
  mFavs.clear(); mFavStore(); storePresets(); fillKits();
  $('kit').value = Math.max(0, kitList.indexOf(cur));
  mDrawPresets();
  return mine.length;
}

