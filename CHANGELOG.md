# Changelog

808-SC starts from 808 Circuit's history (johnnyhawk02/808-circuit, up to "Plugin: re-sign the macOS bundles so
Ableton loads them").

## 0.1.0 (2026-11-09)

- Every voice has a third model, **SC** (simplified circuit), next to Circuit and Cached: the voices of
  synthetic-808 v0.2.1 (`voices/sc/`), on the same knobs, levels matched to the circuit.
- The app's voice controls and the bench's cards have an SC button (the bench also has "All SC"). Cached stays the
  default.
- `test/sc-calibrate.mjs` sets the SC levels; `test/sc-check.mjs` checks all three models at default knobs and at
  each knob's ends.
- The version is 808-SC's own (`dsp/version.js`), shown on the app and the bench.
- No custom domain: the CNAME file is gone, so this repo's Pages deploy doesn't claim 808 Circuit's address.
