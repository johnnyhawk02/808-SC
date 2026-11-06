// ---- installable: a service worker keeps the app for offline use, and the presets page offers to install it
// where the browser allows (Chrome on Android also has Install app in its menu) ----
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
let mInstallEv = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); mInstallEv = e; $('m-install').hidden = false; });
addEventListener('appinstalled', () => { mInstallEv = null; $('m-install').hidden = true; });
$('m-install').addEventListener('click', async () => {
  if (!mInstallEv) return;
  mInstallEv.prompt(); await mInstallEv.userChoice.catch(() => {});
  mInstallEv = null; $('m-install').hidden = true;
});


// ---- next bar: with the box on the perf page ticked, while playing, a randomise button's changes wait for the start
// of the next bar (the player holds them, as it does a preset's), the button flashing until then. Kept in this browser ----
const NB_KEY = 'elixir808-nextbar';
try { $('m-nextbar').checked = localStorage.getItem(NB_KEY) === '1'; } catch (e) {}
$('m-nextbar').addEventListener('change', () => { try { localStorage.setItem(NB_KEY, $('m-nextbar').checked ? '1' : '0'); } catch (e) {} });
const mBarBtns = new Set();
for (const id of ['m-everything', 'm-kit', 'm-alter', 'm-pattern', 'm-xrand', 'm-fx-rand', 'm-fx-alter']) {
  // (before the button's own handler: everything it sends, now and in its awaited steps, goes to the bar)
  $(id).addEventListener('click', () => {
    if (!$('m-nextbar').checked || !playing) return;
    barSync = true; setTimeout(() => { barSync = false; }, 0);
    mBarBtns.add($(id)); $(id).classList.add('pending');
  }, { capture: true });
}

