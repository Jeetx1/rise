#!/bin/bash
# Builds the single-file app from src/ (plain concatenation, no tooling) into docs/index.html.
# docs/ is what GitHub Pages serves (Settings > Pages > Deploy from branch: main, folder /docs).
set -e
cd "$(dirname "$0")"
mkdir -p docs
cat src/01_head.html src/02_body.html \
    src/10_helpers.js src/20_data.js src/30_state.js src/40_files.js src/50_frame.js \
    src/60_overview.js src/70_journal.js src/72_mapping.js src/80_entry.js src/82_booking.js src/84_pr.js \
    src/90_pdf.js src/99_boot.js > docs/index.html
# every script block must compile
python3 - <<'PY'
import re, subprocess, tempfile, os
s = open('docs/index.html', encoding='utf-8').read()
for i, m in enumerate(re.finditer(r'<script[^>]*>(.*?)</script>', s, re.S)):
    p = os.path.join(tempfile.gettempdir(), 'tl_chk%d.js' % i)
    open(p, 'w', encoding='utf-8').write(m.group(1))
    r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    if r.returncode: raise SystemExit('Syntax error in script block %d:\n%s' % (i, r.stderr[:600]))
print('Built docs/index.html (%d KB), all script blocks compile.' % (len(s.encode()) // 1024))
PY
