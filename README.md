<img src="pwa/icon-192.png" width="96" alt="">

# RISE

Gym days, body weight and a daily journal in one offline HTML app. Overview with the year in squares, the month as a
calendar, key figures, body weight, sessions per week, body parts and personal records; Entry for one day at a time;
Journal with search across all years; Mapping of workouts to body parts; a one-page monthly PDF. No libraries, no
server, no tracking. Three looks under Appearance (Glass, Ember, Prism), built on the Design Lab system.

The app holds no data: your log is a separate `.json` file you open in it. Save writes back into that file (Chrome/Edge
on a computer), hands it to the share sheet (iPhone), or downloads it.

- App: `docs/index.html`, built from `src/` (plain concatenation) by `./build.sh`, or on Windows by double-clicking
  `build.cmd`; served by GitHub Pages from `/docs` together with the manifest and home-screen icons from `pwa/`.
- Tests: `./run_tests.sh` (Node; synthetic data of a fictional "Test Person"). CI runs the interface and logic checks
  on every push and fails if `docs/index.html` is not the build of `src/`. With Playwright and Chromium installed, the
  same script also checks the three looks on phone and desktop and runs the Design Lab smoke test.
- Version: `src/01_head.html` (`<meta name="build">`); the app shows it at the bottom of the file menu (…).

## Structure

| Path | What |
|---|---|
| `src/01_head.html` | head, look before first paint, fixed app icon, build version |
| `src/02_dl_tokens.html`, `04_dl_components.html`, `06_dl_effects.html`, `09_dl_kit.html` | Design Lab kit (theme tokens, components, signature effects, theme modules + kit runtime). Copied from the kit, never edited here |
| `src/03_tokens.html`, `05_styles.html` | RISE's own colours and styles (incl. its signature effect *The rep*), tokens only |
| `src/08_body.html` | markup: start screen, shell, four pages |
| `src/10_helpers.js` … `99_boot.js` | the app: helpers, data, state, files, frame, Overview, Journal, Mapping, Entry, the booking moment, PRs, monthly PDF, boot |
| `pwa/` | manifest and home-screen icons |
| `tests/` | `test_app.js` (logic and interface, jsdom), `test_ui.js` (three looks, Chromium), `smoke.js` (Design Lab), `fixture.json` (synthetic data) |

## Your data stays out of this repository

A GitHub Pages repository is public. Everything personal is git-ignored: `private/`, every training log `.json`,
backups, reports and dated copies of the app. Before committing, the changes should list only `src/`, `pwa/`, `docs/`,
`tests/` and the files in this folder.
