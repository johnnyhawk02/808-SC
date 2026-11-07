// Builds index.html (the self-contained page) from index.src.html, the page's code in app/ and the engine modules.
//   node build.mjs [--no-kits] [--out file]
//   --no-kits leaves out the kit files in kits/ (for a public build without third-party kits)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { bundle808 } from './tr808-bundle.mjs';

const here = new URL('.', import.meta.url);
const read = (f) => readFileSync(new URL(f, here), 'utf8');

// strip ES module syntax so the three files run as one classic script (page and AudioWorklet)
const strip = (src) => src
  .replace(/^import[\s\S]*?from\s+'[^']+';\n/gm, '')
  .replace(/^export \{[^}]*\};\n/gm, '')
  .replace(/^export (const|function|class) /gm, '$1 ');

const engine = [read('lxr-tables.js'), read('lxr-ui-data.js'), read('lxr-clicks.js'), read('lxr.js')].map(strip).join('\n');
const names = ['LxrEngine', 'PAR', 'CC', 'CC2', 'BLOCK', 'REAL_FS', 'PARAM_DTYPES', 'MOD_TARGETS',
  'MOD_TARGET_VOICE_RANGES', 'VOICE_PAGES', 'INIT_KIT', 'OSC_WAVE_NAMES', 'FILTER_TYPE_NAMES',
  'LFO_WAVE_NAMES', 'LFO_SYNC_NAMES', 'MIXER_ROUTING_FX_BUS', 'FX_NAMES', 'FX_DELAY', 'FX_DISTORTION', 'FX_RING', 'FxBus', 'Rng', 'DIST_NAMES', 'RATIO_NAMES', 'DELAY_NAMES', 'EXTRA_CLICK_NAMES', 'ReverbBus'];
const bundle = `const LXR = (() => {\n${engine}\nreturn { ${names.join(', ')} };\n})();\n` + bundle808(); // + the TR-808 voices (global TR808)

// kit files (.SND) in kits/ and its subfolders are bundled into the page, hidden, as the generator's source kits
const kitDir = new URL('kits/', here);
const noKits = process.argv.includes('--no-kits');
const outArg = process.argv.indexOf('--out');
const outFile = outArg > 0 ? process.argv[outArg + 1] : null;
// (one folder per pack, e.g. kits/factory/, plus any loose .SND files)
const kits = !noKits && existsSync(kitDir) ? readdirSync(kitDir, { recursive: true }).filter((f) => /\.snd$/i.test(f)).sort()
  .map((f) => ({ file: f, data: readFileSync(new URL(f, kitDir)).toString('base64') })) : [];

// favourite presets exported from the preset manager (presets/*.json) become the built-in presets
const presetDir = new URL('presets/', here);
const presets = existsSync(presetDir) ? readdirSync(presetDir).filter((f) => /\.json$/i.test(f)).sort()
  .flatMap((f) => JSON.parse(readFileSync(new URL(f, presetDir), 'utf8')).presets || []).map((p) => ({ ...p, fav: false })) : [];
// the page reads presets in the current format only (PRESET_V in app/presets.js)
const PRESET_V = Number(/const PRESET_V = (\d+);/.exec(read('app/presets.js'))[1]);
// and they carry the snare rush and its settings, so loading one sets them (app/rush-set.js)
for (const p of presets) if (p.song && (typeof p.song.rush !== 'number' || !p.song.rushSet)) throw new Error(`presets/: ${p.name} has no song.rush and song.rushSet`);
for (const p of presets) if (p.v !== PRESET_V) throw new Error(`presets/: ${p.name} is format v${p.v || 1}, the page reads v${PRESET_V}`);

// the page's own code: app/style.css, the audio thread (app/player.js) and the app's files, run in this
// order as one classic script (each file sees the ones before it)
const APP = ['kit', 'audio', 'groove-types', 'perform-state', 'sound', 'randomise', 'scope', 'steps', 'presets', 'midi', 'preset-manager', 'recorder',
  'grooves', 'styles', 'mixer', 'fx', 'master', 'perform-knobs', 'rush-set', 'pc4', 'crossfeed', 'main',
  'mobile', 'mobile-pages', 'mobile-density', 'mobile-presets', 'mobile-record', 'mobile-mix', 'irverb', 'mobile-seq', 'mobile-extras', 'mobile-xy', 'mobile-settings', 'mobile-slots', 'mobile-setup', 'mobile-rush', 'mobile-user', 'mobile-help', 'desktop-menu', 'desktop-seq', 'desktop-mix', 'desktop-presets', 'desktop-mute', 'desktop-rdepth', 'desktop-keys', 'tr808', 'tr808-grid', 'tr808-mix', 'tr808-state', 'mobile-glass'];
const app = APP.map((f) => read(`app/${f}.js`)).join('');

const sources = { lxr: read('lxr.js'), verify: read('verify.mjs') };
const page = read('index.src.html')
  .replace('/*@CSS@*/\n', () => read('app/style.css') + read('app/mobile.css') + read('app/tr808.css'))
  .replace('/*@PLAYER@*/\n', () => read('app/player.js'))
  .replace('/*@APP@*/\n', () => app)
  .replace('/*@ENGINE@*/', () => bundle.replace(/<\/script/gi, '<\\/script'))
  .replace('/*@KITS@*/', () => `const BUNDLED_KITS = ${JSON.stringify(kits)};`)
  .replace('/*@PRESETS@*/', () => `const BUILTIN_PRESETS = ${JSON.stringify(presets).replace(/<\/script/gi, '<\\/script')};`)
  .replace('/*@SOURCES@*/', () => `const SOURCES = ${JSON.stringify(sources).replace(/<\/script/gi, '<\\/script')};`);
// the version, on the cauldron by the title and in the presets footer, so a phone shows which one it has: 1.N, N the
// number of changes merged into main (first-parent commits). The Pages deploy stamps the real one in (the text between
// the <!--v--> marks, .github/workflows/pages.yml); a build here guesses the next merge. And when it was built (UK time)
const git = (c) => { try { return execSync(c, { cwd: new URL('.', here), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return ''; } };
const merged = Number(git('git rev-list --count --first-parent origin/main') || git('git rev-list --count --first-parent HEAD')) || 0;
const ver = `<!--v-->1.${merged + 1}<!--/v-->`;
const built = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
writeFileSync(outFile || new URL('index.html', here), page.replaceAll('@VER@', () => ver).replace('@BUILT@', () => built));
console.log(`${outFile || 'index.html'}: ${(page.length / 1024).toFixed(1)} KB`);
// help.html: the same help as the app's HELP ME! pop-up (HELP in app/mobile-help.js), a section a tab, so the two agree
const HELP = new Function(`return ${/const HELP = (\[[\s\S]*?\n\]);/.exec(read('app/mobile-help.js'))[1]}`)();
if (!outFile) writeFileSync(new URL('help.html', here), read('help.src.html').replace('<!--@HELP@-->', () => HELP.map(([, title, body]) => `<h2>${title}</h2>\n  ${body}`).join('\n\n  ')));
