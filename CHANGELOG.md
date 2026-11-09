# Changelog

808-SC starts from 808 Circuit's history (johnnyhawk02/808-circuit, up to "Plugin: re-sign the macOS bundles so
Ableton loads them").

## 0.7.3

- The page's top edge runs unbroken under the closed tabs and meets the picked tab's sides (no gap); closed tabs are drawn in a lighter ink instead of faded as a whole.

## 0.7.2

- On a sound's card the model keys sit on the same line as its name, to the right of it (BD [circuit | cached | synthetic]).

## 0.7.1

- The model choice is a row of three joined keys (circuit, cached, synthetic) instead of the slide switch, on top and on each sound's card; the one playing is lit in the spot colour, none on top while the sounds play different models.

## 0.7.0

- The pages (grid, generator, fx, mix, mstr, prst) are folder tabs on the laptop layout: rounded tabs over a framed page, the picked tab open into it with a strip of the spot colour along its top.

## 0.6.2

- The grid's notes and accents stay in the ink; the spot colour is only for buttons, the page tab, play and the model switches.

## 0.6.1

- The spot colour is a hot red (#fb2504) by default; "spot back to default" returns to it.

## 0.6.0

- The default background is a pale pink (#f0dede) with near-black ink, instead of hot pink.
- Spot colour: options › spot colour (settings on the narrow layout) picks one colour for what is on or lit: pressed buttons, the page tab, play, the grid's notes and accents, the model switches' thumbs. Kept in this browser; "spot back to ink" undoes it.

## 0.5.0

- Background colour: options › background colour (settings on the narrow layout) picks any colour for the panel, kept in this browser. The ink follows it (dark on a light colour, light on a dark one), the glows take its hue, and the logo stays ink: multiply on a light colour, inverted in screen on a dark one. "Background back to pink" undoes it.

## 0.4.0

- The model choice is a 3-way slide switch (circuit, cached, synthetic), on top for every sound and on each sound's card; click a word to pick it, or the slide to move it one along. The cards say synthetic too, not sc.
- One name throughout: 808 SC (page titles, the app's title, the landscape note, the help, recordings' file names, the installed app). The footer's source link points to this repo.
- The help is rewritten for the pages the app has now (grid, generator, fx, mix, mstr, prst), with a section on the three models and the CPU readout.
- The generator's density faders and the master's sidechain use the 808 sound names (bd, lt, ht, sd, cy, ch, oh) instead of the old drum numbers.
- The version reads v0.4.0 everywhere (app, help, bench). The bench's intro describes SC.
- Narrow layout: the generator tab says gen so the tab bar no longer overlaps.

## 0.3.3

- The Cloudflare Pages workflow no longer runs on push, only by hand; 808sc.pages.dev is deployed with wrangler for now.

## 0.3.2

- The app shows the 808 logo in place of the title text, printed in multiply so it reads as ink on the panel.

## 0.3.1 (2026-11-09)

- A Cloudflare Pages deploy with wrangler (`.github/workflows/cloudflare.yml`, project 808sc, https://808sc.pages.dev/)
  on every push to main, once the CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets are set. Both deploys
  collect the site with `.github/scripts/site.sh`.

## 0.3.0 (2026-11-09)

- A CPU readout beside the switch on top: how much of the real-time budget the sound takes (render time over the
  audio's own time, every half second; underlined from 80%). Not in the plugin, whose sound runs in C++.

## 0.2.0 (2026-11-09)

- A switch on top of the app, **circuit / cached / synthetic**, sets every sound's model at once (synthetic is SC).
  It lights when every sound plays that model; each sound can still be set on its own.

## 0.1.0 (2026-11-09)

- Every voice has a third model, **SC** (simplified circuit), next to Circuit and Cached: the voices of
  synthetic-808 v0.2.1 (`voices/sc/`), on the same knobs, levels matched to the circuit.
- The app's voice controls and the bench's cards have an SC button (the bench also has "All SC"). Cached stays the
  default.
- `test/sc-calibrate.mjs` sets the SC levels; `test/sc-check.mjs` checks all three models at default knobs and at
  each knob's ends.
- The version is 808-SC's own (`dsp/version.js`), shown on the app and the bench.
- No custom domain: the CNAME file is gone, so this repo's Pages deploy doesn't claim 808 Circuit's address.
