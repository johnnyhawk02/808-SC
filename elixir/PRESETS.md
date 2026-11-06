# Elixir Mobile preset format (v5)

Elixir Mobile started as a copy of Elixir and shared its preset format. It is its own app now (from 2026-10-26)
and its presets can change without regard to the full Elixir. It still reads presets exported from the full
Elixir (they are this format, minus the additions below), but a preset saved here may not load there.

Every preset with a kit is brought into the current format (`PRESET_V` in `app/presets.js`, `toCurrent`) as it's read,
whether built in, stored in this browser (rewritten in place) or imported, even when that changes how it sounds: v5
drops the distortion sends (`fx3.dsend`; the distortion is now an insert on the whole mix, `fx3.params.dist.mix`,
0 = off), gives the master its spacer (`space: 0`), and drops a song too old to have its pattern pages and rush
settings (the preset loads its sound alone). The built-in presets in `presets/*.json` are kept in the current
format (`build.mjs` refuses one in any other version).

## Getting presets in and out

- **From the full Elixir:** in its preset manager, star the presets, press *export favourites* and get
  `elixir-favourites.json` onto the phone. Then press *import presets* on the phone's presets page.
- **Backing up:** *export mine* saves every preset saved on the phone, and *import presets* reads it back.
- Presets saved here are kept under their own storage key (`elixir-mobile-presets`), apart from the full Elixir's
  (`elexir-presets-v2`, on the same site). The first time the app runs with its own key it copies the shared
  key's presets over.
- A preset whose name is already saved is skipped on import.
- **Built in:** favourites dropped into `presets/*.json` are baked into the page when it is built.

## Additions in Elixir Mobile

- `song.master.space`: the sidechain's spacer, 0..100 (missing means 0).
- `song.seqs`: the step sequencers, `{ "<box id>:<fader label>": { on, len, slew, step, depth, rel, vals } }`, where `len` is 2..16, `slew` 0..100 (how much of a step it glides over), `step`
  how long each step lasts in 16ths (1, 2, 4, 8, 16, 32, 64 or 128: a 16th note up to 8 bars; missing means 1), `depth`
  0..100 (how far a step can move the fader, as a share of its range, either way; missing means 50), `rel: true`, and
  `vals` holds sixteen offsets, -1..1 of depth, from the fader's setting (the preset saves the setting, not the value
  heard; a sequence without `rel` held values in the fader's range and loads as offsets from its middle) (e.g. `"m-beat-faders:energy"`). A preset without one for a
  fader clears it.
- `song.rushT`: the track the rush rolls on, 0..6 (drum 1, 2, 3, snare, cymbal, closed hat, open hat; missing means 3, the snare).
- `song.xdepth`: the crossfeed depth, 0..100 (missing means 100).

## The presets file

```json
{ "elixir": 1, "presets": [ <preset>, ... ] }
```

`elixir: 1` marks a presets file and isn't the preset version. Storage (`localStorage['elixir-mobile-presets']`)
holds just the array of presets.

## A preset

| Field | Type | What it is |
|---|---|---|
| `v` | `4` | the preset version |
| `name` | string | two alien words, up to 16 characters |
| `kit` | 247 integers, 0–255 | the LXR-02 sound parameters, in the firmware's parameter order (`PAR` in `lxr-ui-data.js`), as in an `.SND` file after its 8-character name |
| `xm` | `{ amt: [36], target: [6] }` | crossfeed: 6 × 6 depths (source × destination) and each destination's target |
| `fx` | `[6]`, 0–100 | each voice's echo send |
| `fx3` | `{ params: { echo, dist, ring }, ring: [6] }` | the three FX: echo `{ pct }`, distortion `{ type, p: [4], mix }` (an insert on the whole mix before the compressor; `mix` 0–100, 0 = off), ring mod `{ wave, freq }`; ring mod sends per voice, 0–100 |
| `dpos` | number, 0–1 | delay time position |
| `song` | object | see below |
| `fav` | boolean | starred in the preset manager |

`xm`, `fx`, `fx3` and `song` can be left out (a sound opened from a kit file); the sends and FX then come from
the kit's own FX settings and the pattern stays as it is.

### `song`

| Field | What it is |
|---|---|
| `style` | pattern style name: `electro`, `techno`, `broken beat`, `IDM`, `breakcore` or `user` |
| `user` | with style `user`: the user pattern itself, `{ name, on, acc, bar }` |
| `energy`, `beat`, `fills` | perform dials: 0–100, groove index 0–31 within the style, 0–100 |
| `tempo` | 40–240 bpm (a preset brings its tempo unless the full Elixir's *bpm* box is unticked) |
| `vel`, `accent` | velocity 1–127, accent 0–6 dB |
| `rush` | snare rush, 0–100 |
| `rushSet` | rush settings: `start`, `p32`, `top`, `hats`, `only`, `kicks`, `first`, `hp`, `hpTop` (Hz), `rollMs`, `hpMs` |
| `groove` | `{ type, depth }`: groove type name (`straight`, `swing 58`, `shuffle`, …) and depth 0–100 |
| `macro` | `{ fm, decay, pitch, filter }`: 0–200 with 100 neutral; pitch 0–48 with 24 neutral |
| `pattern` | the perform pattern as played: `{ on, acc, bar }`, each 7 tracks × 16 steps |
| `stepPages` | the steps grid, 1–4 pages of `{ on, acc, bar }` |
| `view`, `source` | `perform` or `steps`; what plays (`perform`, `steps`, or `off` for MIDI in) |
| `master` | `{ comp, thresh, ratio, attack, release, makeup, duck, duckRelease, duckFx, duckOn, space }` (`space`: see the additions above) |

Tracks run in the app's row order (`ROW` in `app/styles.js`: `k`, `lo`, `hi`, `s`, `cy`, `ch`, `oh`). `on` holds
the hits, `acc` the accents and `bar` the bar conditions, as `app/steps.js` reads them.

## What the phone app touches

Elixir Mobile has no editor for most of this. It changes `kit` (everything, kit + pattern, undo), `xm`, `fx`
and `dpos` (everything), `song.style`, `beat`, `energy`, `fills`, `groove` (kit + pattern and the sliders),
`song.rush`, and `song.master` (compressor tab and sidechain slider). Everything else it keeps as it
was loaded, so a full Elixir preset saved again on the phone loses nothing.
