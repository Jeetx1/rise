# Training log

Gym days, body weight and journal in one offline HTML app. The app holds no data: your log is a separate
`.json` file you open in it, and Save writes straight back into that file (Chrome/Edge on a computer) or
hands it to the share sheet (iPhone).

- App: `docs/index.html` (built from `src/` by `./build.sh`; served by GitHub Pages from `/docs`)
- Tests: `./run_tests.sh`
- Everything else, rules and decisions: the handover file, kept privately outside this repository.

Your data never goes into this repository (`private/` and data/backup/report files are git-ignored).
