#!/bin/bash
# Builds the single-file app from src/ (plain concatenation, no tooling) into docs/index.html,
# and copies the hosting files (manifest, icons) from pwa/ into docs/.
# docs/ is what GitHub Pages serves (Settings > Pages > Deploy from a branch: main, folder /docs).
# The same docs/index.html is the offline copy in the app folder (APPS/RISE/YYYY-MM-DD_RISE.html).
set -e
cd "$(dirname "$0")"
mkdir -p docs
cat src/01_head.html src/02_dl_tokens.html src/03_tokens.html src/04_dl_components.html src/05_styles.html src/06_dl_effects.html src/08_body.html src/09_dl_kit.html src/10_helpers.js src/20_data.js src/30_state.js src/40_files.js src/50_frame.js src/60_overview.js src/70_journal.js src/72_mapping.js src/80_entry.js src/82_booking.js src/84_pr.js src/90_pdf.js src/99_boot.js > docs/index.html
cp pwa/manifest.webmanifest pwa/icon-180.png pwa/icon-192.png pwa/icon-512.png docs/
# every script block must compile, and the page must carry its build version
node - <<'JS'
const fs = require('fs'), vm = require('vm');
const s = fs.readFileSync('docs/index.html', 'utf8');
const re = /<script[^>]*>([\s\S]*?)<\/script>/g; let m, i = 0;
while ((m = re.exec(s))){ try { new vm.Script(m[1], { filename: 'script block ' + i }); } catch (e){ console.error('Syntax error in script block ' + i + ':\n' + e.message); process.exit(1); } i++; }
const v = (s.match(/<meta name="build" content="([^"]+)">/) || [])[1];
if (!v){ console.error('No build version: add <meta name="build" content="YYYY-MM-DD.N"> to src/01_head.html.'); process.exit(1); }
console.log('Built docs/index.html (' + Math.round(Buffer.byteLength(s) / 1024) + ' KB), build ' + v + ', all ' + i + ' script blocks compile.');
JS
