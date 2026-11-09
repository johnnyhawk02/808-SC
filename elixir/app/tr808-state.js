// ---- everything the 808 sound is, for presets and Reset sound: every sound's knobs, its mix strip (level, pan, sends)
// and the grid's eight patterns. A preset saves it all (e808); Reset sound (options) puts the sound back to a plain 808 and
// leaves the patterns alone ----
const t8Snapshot = () => ({ values: structuredClone(t8.values), vmix: structuredClone(t8m),
  pats: structuredClone(g8.pats), lens: g8.lens.slice(), cur: g8.cur });
const t8Defaults = (id) => Object.fromEntries(T8_PARAMS[id].map((p) => [p.id, p.def]));
// one sound's knobs: set (not counted as an edit), then its cached hits made to match. Knobs that bake into the hits back
// at their defaults: the shipped hits; otherwise its own hits if made at these knobs, or new ones (the circuit plays
// until they're ready)
async function t8UseKnobs(id, vals) {
  const baked = T8_PARAMS[id].filter((p) => !T8_LIVE.includes(p.id));
  const want = Object.fromEntries(T8_PARAMS[id].map((p) => [p.id, typeof vals?.[p.id] === 'number' ? vals[p.id] : p.def]));
  const atDef = baked.every((p) => want[p.id] === p.def), same = (k) => k && baked.every((p) => k[p.id] === want[p.id]);
  g8Quiet++;
  try {
    if (g8Auto?.id === id) g8Auto = null;
    // a sound on SC plays every knob live: just the knobs
    if (t8.models[id] === 'sc') { for (const p of T8_PARAMS[id]) t8SetKnob(id, p.id, want[p.id]); return; }
    // (hits being made at other knobs are dropped)
    const job = t8Jobs[id];
    if (job && !job.error && !same(job.knobs)) { job.w?.terminate(); delete t8Jobs[id]; }
    if (atDef) {
      if (t8Custom[id]) await t8Revert(id);
      if (t8.models[id] !== 'cached') t8SetModel(id, 'cached');
    } else if (same(t8Custom[id]?.info?.knobs)) {
      if (!t8Jobs[id] && t8.models[id] !== 'cached') t8SetModel(id, 'cached');
    } else if (!t8Jobs[id]) {
      for (const p of baked) t8SetKnob(id, p.id, want[p.id]);
      if (t8.models[id] === 'cached') t8SetModel(id, 'circuit');
      t8MakeCache(id);
    }
    for (const p of T8_PARAMS[id]) t8SetKnob(id, p.id, want[p.id]);
  } finally { g8Quiet--; }
}
function t8UseMix(vm) {
  for (const id of T8_ORDER) { t8m[id] = { ...T8M_0 }; for (const k in T8M_0) if (typeof vm?.[id]?.[k] === 'number') t8m[id][k] = vm[id][k]; t8mSend(id); }
  t8mSave();
}
function t8UsePats(e) {
  if (!Array.isArray(e.pats)) return;
  if (g8.rec >= 0) g8RecStop();
  for (let i = 0; i < G8_N; i++) { g8.pats[i] = e.pats[i] ? g8Clean(e.pats[i]) : g8Empty(); g8.lens[i] = Math.max(1, Math.min(4, e.lens?.[i] | 0 || 1)); }
  g8.cur = e.cur >= 0 && e.cur < G8_N ? e.cur : 0; g8.mode = 'lanes'; g8.page = 0;
  g8Send(); g8Draw();
}
// a preset's 808 part (from loadPreset)
async function t8UseAll(e) {
  t8UseMix(e.vmix); t8UsePats(e);
  await Promise.all(T8_ORDER.map((id) => t8UseKnobs(id, e.values?.[id])));
  t8Save(); mDrawAll(); t8Draw(); g8Draw();
}
// Reset sound: every sound at its default knobs (drive off), its mix strip flat (level full, centre, no sends), the
// effects back to their defaults and off (no echo or reverb sends, no distortion), the compressor and the kick's
// sidechain duck off. The patterns and the tempo stay
async function t8ResetSound() {
  if (!confirm('Reset the sound to a plain 808? Every sound\'s knobs, levels, pans and sends, and the effects, go back to their defaults; the patterns stay.')) return;
  t8UseMix({});
  Object.assign(fx3, structuredClone(FX3_0)); mix.fx.fill(0); mix.ring.fill(0); mix.dist.fill(0);
  Object.assign(master, MASTER0, { comp: false, duckOn: false }); buildMaster();
  syncMixer(); sendMix();
  await Promise.all(T8_ORDER.map((id) => t8UseKnobs(id, t8Defaults(id))));
  t8Save(); mDrawAll(); t8Draw(); g8Draw(); setDirty(true);
}

// after a reload: a sound left mid-edit gets cached now, and a cached sound whose knobs don't match its hits gets new ones
t8CustomReady.then(() => {
  let a = null;
  try { a = JSON.parse(localStorage.getItem(G8_AUTO_KEY)); localStorage.removeItem(G8_AUTO_KEY); } catch (e) {}
  for (const id of T8_IDS) {
    if (t8.models[id] === 'sc') continue;
    if (a?.id === id) { if (t8.models[id] === 'circuit') t8UseKnobs(id, { ...t8.values[id] }); continue; }
    if (t8.models[id] === 'cached') t8UseKnobs(id, { ...t8.values[id] });
  }
  t8Draw();
});
