# Elixir 808

A copy of [Elixir Desktop](https://github.com/johnnyhawk02/elixir-desktop) (commit 8f45f44) that plays the TR-808 voices
from this repo instead of the LXR-02 voices. **Play it: https://johnnyhawk02.github.io/Tr808/elixir/**

- **Grid page** (opens first): a lane for each of the sixteen 808 sounds, sixteen steps; tap a step for on, accent,
  off, tap a sound's name to hear it; the kick is at the bottom (options: "bass drum at the top of the grid" flips it). Eight pattern buttons over it pick which pattern plays and is edited (they start as six 808 grooves and two empty ones, and are kept in this browser); beside it, the controls of the sound last put on a lane (or tapped); **autocache**: everything plays cached except the sound being edited, which plays the circuit (picked on the grid, or a knob moved there or on the 808 page); moving away caches it at its new knobs (4 + 4 hits) and plays that, or just goes back to cached if no knob moved; **generator** goes back to the beat page's generated
  pattern (on the seven tracks, one sound each: BD, LT, HT, SD, CY, CH, OH), shown in their lanes, and the first edit
  copies it into the lanes. The lanes are kept in this browser.
- **808 page**: all sixteen sounds at once, each with circuit/cached, its knobs and its cache button.
- **Mix page**: a strip for each of the sixteen sounds (echo send, reverb send, pan, level), mixed per sound in the
  player (`vmix808`; the echo takes them through `renderFx`'s extra input in `lxr.js`). The kick keys the sidechain and
  the rest duck. Each sound still has a track (`BUS808`) for mutes and the rush.
- Looks: 80s magenta. The version, 1.N on the cauldron (and in the presets footer), N the number of changes merged into
  main, stamped in by the Pages deploy.
- Each voice plays as the **circuit** simulation (every knob works, costs CPU) or **cached** hits (16 normal + 16
  accented hits rendered by the circuit; level, decay and the clap's snap stay live; almost no CPU), with its own knobs.
- **Cache**, on every voice, records 4 normal + 4 accented hits through the circuit at its current knobs in a worker (a
  few seconds, the cymbal longest) and plays them as cached, random robin (picked at random, never the same one twice
  running); **revert** goes back to the shipped 16 + 16 hits (`../cache/`). They're kept in
  this browser under the bench's own IndexedDB store, so a cache made on the bench shows up here and the other way round.
- No LXR-02 voices: they're silenced in the player. The voice page and crossfeed are deleted (crossfeed is off in the
  player too); the kit / alter / crossfeed randomisers and the LXR sound macros (pitch, decay, filter, fm) are gone. What's left of Elixir is the sequencer and
  pattern generator, the mixer, and its effects (echo, reverb, distortion, compressor; the echo and distortion are the
  LXR-02 firmware's FX code, which the mix still runs through).
- An 808 voice takes its track's place in the engine's output, so level, pan, sends, the drum 1 sidechain, the master
  chain, meters and the recorder work on it. Accents are the circuit's own accent.
- The 808 setup (models, knobs) and the lanes are kept in this browser, not in presets. Presets, settings and
  favourites are kept apart from Elixir Desktop's (keys start `elixir808-`); on first run its saved presets are copied
  in (only their pattern, tempo, mix and FX matter here).

The 808 code is not copied: `tr808-bundle.mjs` bundles `../dsp` and `../voices` into the page at build time
(`node elixir/build.mjs`), so it is always the bench's current code. Changes from Elixir Desktop: `app/tr808.js`,
`app/tr808.css`, `app/tr808-grid.js`, the 808 hooks in `app/player.js` (`hit`, `render808`, `lanes808`), the tab in `index.src.html`, the perf knob and
x/y defaults (`app/mobile-slots.js`, `app/mobile-xy.js`), `app/desktop-keys.js`, `build.mjs`, storage keys.

Elixir Desktop's own README follows.

---

## Elixir Desktop

A six-voice drum machine in the browser, a desktop layout grown from [Elixir Mobile](https://github.com/johnnyhawk02/elixir-mobile). **Play it: https://johnnyhawk02.github.io/elixir-desktop/**

This repo holds the app and its full source, published with GitHub Pages.

Elixir's sound engine is a JavaScript port of the drum voices and FX bus in the Erica Synths LXR-02
firmware ([erica-synths/lxr-desktop-app](https://github.com/erica-synths/lxr-desktop-app),
GPL-3.0, commit a43cd4f). Elixir is unofficial: it is not made, approved or endorsed by
Erica Synths.

- **Six voices** from the firmware: three drum/tom voices, snare/clap, cymbal and a closed/open
  hi-hat, with their oscillators, FM, transients, filters, envelopes, LFOs and velocity
  modulation, and every sound parameter on knobs.
- **Everything** builds a new sound from voices of the bundled kits (the 16 free Hrtl LXR-02 DLC
  kits, by Hrtl, distributed free by Erica Synths, credited here, plus 12 generated kits), with new
  crossfeed, delay and pattern. Any LXR kit file (`.SND`) can be opened too.
- **Perform**: energy, beat and fills dials build electro patterns while it plays; a step editor
  with accents and bar conditions sits behind it.
- **Randomise** a voice or the whole kit within drum-safe ranges (or wild).
- **Presets** keep everything (sound, pattern, tempo, mixer, FX, master) under a two-word alien
  name in the browser. The preset manager stars favourites and exports them; favourites dropped
  into `src/presets/*.json` are built into the page as built-in presets. A sound can also be
  exported as an LXR `.SND`.
- **FX bus** from the firmware: distortion (tube, fold, rat), ring mod, compressor and delay
  (normal or ping-pong). Each voice can be routed through it, and kits load their own settings.
- **Mixer** with level, pan, mute and solo, and echo, distortion and ring mod sends per voice, using the firmware's FX code; a master compressor with a drum 1 sidechain duck.
- **Crossfeed**: a 6 × 6 patchbay that feeds any voice into the FM, filter or ring modulation of
  any other, with a depth control and a randomiser.

## The engine is exact

`src/lxr.js` follows the firmware's C line by line, including its float32 rounding and ARM
integer behaviour. `src/verify.mjs` runs the same parameter edits and triggers through the
port and through the firmware's own engine code (cross-compiled for the Cortex-M7 FPU and run
under qemu) and compares every sample of all six voices and of the FX bus output. Over 700 random
scenarios (176 million samples) they are identical. The compressor calls the C library's `logf`
and `expf`, so those are ported too (glibc's and newlib's share the same algorithm). The mixer, FX sends, crossfeed and pattern generator are new and
sit outside that comparison; with crossfeed at zero the engine runs exactly as verified.

The shipped firmware is built with `-O3 -ffast-math`, which rounds slightly differently: with
the init kit the largest difference is 9 LSB (−77 dB).

Not ported: the firmware's reverb (compiled out of the firmware, `USE_REVERB 0`), user samples
and the hardware sequencer. Only the stereo outputs are modelled.

## Files

| Path | What it is |
|---|---|
| `index.html` | the whole app in one file, built by `src/build.mjs` |
| `src/lxr.js` | the engine (ES module, no dependencies) |
| `src/lxr-tables.js`, `src/lxr-ui-data.js` | wavetables, init kit, parameter and menu data from the firmware |
| `src/index.src.html` | the page's markup; `src/build.mjs` bundles it with the code in `src/app/`, the engine and kits |
| `src/app/` | the page's code: `style.css`, the audio thread (`player.js`) and the app's files, run in the order `build.mjs` lists them |
| `src/test/smoke.mjs` | loads every built-in preset, older preset shapes and saved ones, and checks the state and audio against `baseline.json` |
| `src/kits/` | the generator's source kits (`.SND`): Hrtl DLC kits and generated E01–E12 |
| `src/presets/` | built-in presets: favourites exported from the preset manager (`.json`) |
| `src/verify.mjs` | the sample-for-sample comparison |
| `ref/` | the C harness and build script for the reference |

## Build and verify

```sh
node src/build.mjs --out index.html          # rebuild the page
node src/test/smoke.mjs index.html --check src/test/baseline.json   # nothing changed (needs Playwright)

# reference (Debian/Ubuntu): qemu-user-static gcc-arm-linux-gnueabihf libc6-dev-armhf-cross
git clone https://github.com/erica-synths/lxr-desktop-app
ref/build.sh lxr-desktop-app
node src/verify.mjs ref/ref_strict 40        # 0 mismatches
```

## Licence

GPL-3.0-only, like the firmware it is derived from (see [LICENSE](LICENSE)). "Erica Synths",
"LXR" and "LXR-02" are trademarks of Erica Synths; they are used here only to say where the
engine comes from.
