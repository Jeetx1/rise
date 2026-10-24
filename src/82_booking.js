/* ================================================================ the booking moment */
const SPRUECHE = {
  gym: [
    ['Gains booked.', 'Debit muscles, credit couch.'],
    ['Posted to the ledger of gains.', 'No variance to report.'],
    ['Reconciled.', 'Effort in, results pending.'],
    ['Audit trail updated.', 'The iron remembers.'],
    ['Logged.', 'Your future self says thanks.'],
    ['Session capitalised.', 'Depreciates only if you skip the next one.'],
    ['Entry approved.', 'Signed off by the bench committee.'],
    ['Booked and balanced.', 'Like a good trial balance.'],
    ['Reps accrued.', 'Recognised in full, no deferral.'],
    ['Dumbbell cleared.', 'Material, and fairly presented.']
  ],
  ruhe: [
    ['Rest day booked.', 'Recovery is a line item too.'],
    ['Couch session logged.', 'Gains accrue while you sleep.'],
    ['Logged.', 'Even the iron needs a weekend.'],
    ['Rest recorded.', 'Muscles grow on the sofa, officially.'],
    ['Journal posted.', 'Nothing lifted, everything noted.']
  ],
  leer: [['Day cleared.', 'A blank page, freshly reversed.']]
};
let letzterSpruch = '';
function spruchWahl(art){
  const l = SPRUECHE[art]; let s;
  for (let i = 0; i < 5; i++){ s = l[Math.floor(Math.random() * l.length)]; if (s[0] + s[1] !== letzterSpruch) break; }
  letzterSpruch = s[0] + s[1]; return s;
}
function baueSiegel(art){
  const s = $('#siegel'); if (!s) return;
  let p = ''; for (let j = 0; j < 6; j++) p += '<path d="' + rosette(100, 100, 70 + j * 3.6, 3, 36, j * .5) + '"/>';
  const ink = 'style="fill:var(--seal-ink)"', mark = 'style="fill:var(--seal-mark)"';
  const mond = '<path d="M112 70a26 26 0 1 0 12 40 21 21 0 1 1-12-40z" ' + ink + '/><text x="122" y="78" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="700" ' + mark + '>z</text><text x="131" y="68" font-family="-apple-system,Segoe UI,sans-serif" font-size="10" font-weight="700" ' + mark + '>z</text>';
  s.innerHTML = '<defs><linearGradient id="sf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--seal-ring-1)"/><stop offset=".5" style="stop-color:var(--seal-ring-2)"/><stop offset="1" style="stop-color:var(--seal-ring-1)"/></linearGradient></defs>' +
    '<circle cx="100" cy="100" r="96" style="fill:var(--seal-bg)"/>' +
    '<g class="ring" fill="none" stroke="url(#sf)" stroke-width="1">' + p + '</g>' +
    '<circle cx="100" cy="100" r="60" style="fill:var(--seal-face);stroke:var(--seal-ring-1)" stroke-width="1.5"/>' +
    (art === 'ruhe' ? '<g class="hantel">' + mond + '</g>' : (art === 'leer' ? '' : '<g class="hantel">' + hantelPfade(100, 92, 1.12, 'var(--seal-ink)', 'var(--seal-mark)').replace(/fill="(var\([^"]+\))"/g, 'style="fill:$1"') + '</g>')) +
    '<text x="100" y="' + (art === 'leer' ? 105 : 134) + '" text-anchor="middle" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="700" ' + ink + ' letter-spacing="2.5">' +
    (art === 'ruhe' ? 'RESTED' : (art === 'leer' ? 'CLEARED' : 'LOGGED')) + '</text>';
}
function feiern(art, zusatz){
  const s = $('#siegel'), sp = $('#spruch');
  const [a, b] = zusatz || spruchWahl(art);
  sp.innerHTML = esc(a) + '<small>' + esc(b) + '</small>';
  if (!BEWEGUNG || !Kit.isOn('rep')){ toast(a + ' ' + b); return; }
  baueSiegel(art);
  s.classList.remove('los'); sp.classList.remove('los'); void s.getBoundingClientRect();
  s.classList.add('los'); sp.classList.add('los');
  if (art === 'gym'){
    const cx = window.innerWidth / 2, cy = window.innerHeight * .44, farben = ['var(--spark-a)', 'var(--spark-b)', 'var(--spark-c)', 'var(--gym)', 'var(--seal-ring-2)'];
    for (let i = 0; i < 16; i++){
      const f = h('i', { class: 'funke' }), w = Math.random() * Math.PI * 2, r = 110 + Math.random() * 90;
      f.style.left = cx + 'px'; f.style.top = cy + 'px'; f.style.background = farben[i % farben.length];
      f.style.setProperty('--dx', (Math.cos(w) * r).toFixed(0) + 'px'); f.style.setProperty('--dy', (Math.sin(w) * r).toFixed(0) + 'px');
      f.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg'); f.style.animationDelay = (.12 + Math.random() * .12) + 's';
      document.body.appendChild(f); setTimeout(() => f.remove(), 1500);
    }
  }
}
function buchen(){
  if (!F || !F.changed) return;
  const res = formSchreiben();
  const art = res.leer ? 'leer' : (res.gym ? 'gym' : 'ruhe');
  let zusatz = null;
  if (art === 'gym' && res.vorher < C.weeklyTarget && res.nachher >= C.weeklyTarget)
    zusatz = ['Week target hit: ' + res.nachher + ' of ' + C.weeklyTarget + '.', 'Close the books on week ' + isoWeek(P(F.iso)) + '.'];
  const knopf = $('#logknopf'), kr = knopf ? knopf.getBoundingClientRect() : null;
  const iso = F.iso; F = null; render();
  const k = $('#formkarte'); if (k && BEWEGUNG && Kit.isOn('rep')){ k.classList.remove('gebucht'); void k.offsetWidth; k.classList.add('gebucht'); }
  feiern(art, zusatz);
  if (art === 'gym' && kr && BEWEGUNG && Kit.isOn('rep')){
    const p = h('div', { class: 'plus1' }, ['+1']); p.style.left = (kr.left + kr.width / 2) + 'px'; p.style.top = (kr.top - 6) + 'px';
    document.body.appendChild(p); setTimeout(() => p.remove(), 1300);
  }
}
['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => { if (!e.defaultPrevented) e.preventDefault(); }));


