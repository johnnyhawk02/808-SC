# Changelog

808-SC starts from 808 Circuit's history (johnnyhawk02/808-circuit, up to "Plugin: re-sign the macOS bundles so
Ableton loads them").

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
