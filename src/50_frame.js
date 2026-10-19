/* ================================================================ toast */
let toastT = null;
function toast(msg, fehler){
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('fehler', !!fehler); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), fehler ? 5200 : 3400);
}

/* ================================================================ background */
function plate(g, cx, cy, R, alpha, dicht){
  g.strokeStyle = 'rgba(175,198,220,' + alpha + ')'; g.lineWidth = .7;
  const ringe = dicht;
  for (let j = 0; j < ringe; j++){
    const t = j / ringe, rho = R * (.16 + .84 * Math.pow(t, .85));
    const amp = R * .006 * Math.sin(j * .7);
    g.beginPath();
    for (let i = 0; i <= 360; i++){
      const a = i / 360 * Math.PI * 2, r = rho + amp * Math.sin(12 * a + j * .3);
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  g.strokeStyle = 'rgba(175,198,220,' + (alpha * 1.4) + ')';
  for (let i = 0; i < 180; i++){
    const a = i / 180 * Math.PI * 2, r1 = R * .58, r2 = R * (i % 5 === 0 ? .66 : .62);
    g.beginPath(); g.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); g.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)); g.stroke();
  }
}
function knurl(g, w, h, winkel, abstand, alpha, phase){
  g.save();
  g.strokeStyle = 'rgba(175,198,220,' + alpha + ')'; g.lineWidth = .6;
  const band = Math.max(w, h) * .15, cx = w * .5, cy = h * .5;
  g.translate(cx, cy); g.rotate(-.42);
  g.beginPath(); g.rect(-w, -band / 2, w * 2, band); g.clip();
  [winkel, -winkel].forEach(wk => {
    const dx = Math.tan(wk) * band;
    for (let x = -w * 1.4 + phase; x < w * 1.4; x += abstand){ g.beginPath(); g.moveTo(x - dx, -band / 2); g.lineTo(x + dx, band / 2); g.stroke(); }
  });
  g.restore();
}
function zeichneHintergrund(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2), schmal = window.innerWidth < 700;
  [['fx-a', (g, w, h) => {
      const R = Math.min(w, h) * .5;
      plate(g, w * .84, h * .2, R, .055, schmal ? 26 : 40);
      plate(g, w * .06, h * .92, R * .62, .06, schmal ? 18 : 28);
      knurl(g, w, h, .55, 9, .03, 0);
    }],
   ['fx-b', (g, w, h) => {
      const R = Math.min(w, h) * .5;
      plate(g, w * .84, h * .2, R * .985, .04, schmal ? 10 : 16);
      knurl(g, w, h, .5, 9.4, .025, 3);
    }]].forEach(([id, fn]) => {
    const c = document.getElementById(id); if (!c || !c.getContext) return;
    const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const g = c.getContext('2d'); if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    try { fn(g, w, h); } catch (e){ /* decoration only */ }
  });
}
(function parallaxe(){
  const fein = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (!fein || !BEWEGUNG) return;
  const a = $('#fx-a'), b = $('#fx-b'), licht = $('#licht');
  let zx = 0, zy = 0, x = 0, y = 0, laeuft = false;
  function schritt(){
    x += (zx - x) * .06; y += (zy - y) * .06;
    a.style.transform = 'translate3d(' + (-x * 14).toFixed(2) + 'px,' + (-y * 10).toFixed(2) + 'px,0)';
    b.style.transform = 'translate3d(' + (-x * 30).toFixed(2) + 'px,' + (-y * 20).toFixed(2) + 'px,0)';
    if (Math.abs(zx - x) > .001 || Math.abs(zy - y) > .001) requestAnimationFrame(schritt); else laeuft = false;
  }
  window.addEventListener('pointermove', e => {
    zx = e.clientX / window.innerWidth - .5; zy = e.clientY / window.innerHeight - .5;
    licht.style.setProperty('--lx', e.clientX + 'px'); licht.style.setProperty('--ly', e.clientY + 'px');
    if (!laeuft){ laeuft = true; requestAnimationFrame(schritt); }
  }, { passive: true });
})();
let hgT = null;
window.addEventListener('resize', () => { clearTimeout(hgT); hgT = setTimeout(zeichneHintergrund, 180); });

/* the mark: an engraved ring with a dumbbell, the same family as the booking seal */
function rosette(cx, cy, rho, amp, k, ph){
  let d = '';
  for (let i = 0; i <= 240; i++){ const a = i / 240 * Math.PI * 2, r = rho + amp * Math.sin(k * a + ph); d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2); }
  return d + 'Z';
}
function hantelPfade(cx, cy, s, farbe, bar){
  const r = (x, y, w, hh, rx, f) => '<rect x="' + (cx + x * s) + '" y="' + (cy + y * s) + '" width="' + w * s + '" height="' + hh * s + '" rx="' + rx * s + '" fill="' + f + '"/>';
  return r(-22, -2.2, 44, 4.4, 2, bar || farbe) + r(-26, -13, 7, 26, 2.4, farbe) + r(19, -13, 7, 26, 2.4, farbe) + r(-32, -9, 5.5, 18, 2.2, farbe) + r(26.5, -9, 5.5, 18, 2.2, farbe) +
    r(-35, -2.6, 3.2, 5.2, 1.2, farbe) + r(31.8, -2.6, 3.2, 5.2, 1.2, farbe);
}
let logoN = 0;
function malLogo(el){
  const gid = 'lg' + (++logoN);
  let p = ''; for (let j = 0; j < 7; j++) p += '<path d="' + rosette(50, 50, 24 + j * 3.2, 1.8, 12, j * .45) + '"/>';
  el.innerHTML = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A9CDF3"/><stop offset=".55" stop-color="#5E8FCB"/><stop offset="1" stop-color="#C9DDF5"/></linearGradient></defs>' +
    '<circle cx="50" cy="50" r="48" fill="#16202A" stroke="rgba(170,200,240,.22)" stroke-width="1"/>' +
    '<g fill="none" stroke="url(#' + gid + ')" stroke-width=".8" opacity=".9">' + p + '</g><circle cx="50" cy="50" r="20" fill="#11161B" stroke="url(#' + gid + ')" stroke-width="1"/>' +
    '<g transform="rotate(-28 50 50)">' + hantelPfade(50, 50, .52, '#D5E5F7', '#8FB6E2') + '</g>';
}

/* ================================================================ start screen */
function zeigeStart(){
  $('#shell').classList.remove('on'); $('#start').classList.add('on');
  $$('.logo').forEach(l => malLogo(l));
  const wahl = $('#wahl'); wahl.innerHTML = '';
  const ic = p => h('span', { class: 'ic', html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>' });
  const dr = draftLesen();
  if (dr){
    const when = dr.at ? deDate(P(dr.at.slice(0, 10))) + ' ' + new Date(dr.at).toTimeString().slice(0, 5) : '';
    wahl.appendChild(h('button', { type: 'button', class: 'draft', onclick: () => {
      DATA = normalize(dr.data); C = DATA.config; FILE = { name: dr.name || '', handle: null, folder: null };
      starteApp(); S.dirty = true; malSpeichern(); toast('Unsaved changes restored. Save to put them into your data file.');
    } }, [ic('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'), h('span', {}, [h('b', {}, ['Restore unsaved changes']),
      h('small', {}, ['From ' + when + (dr.name ? ', based on ' + dr.name : '') + '. They never reached a file.'])])]));
  }
  wahl.appendChild(h('button', { type: 'button', onclick: oeffnen }, [ic('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    h('span', {}, [h('b', {}, ['Open your log']), h('small', {}, ['Your .json data file. The old Trainingslog HTML works too, its data is taken over.'])])]));
  wahl.appendChild(h('button', { type: 'button', onclick: () => {
    DATA = emptyData(); C = DATA.config; FILE = { name: '', handle: null, folder: null }; starteApp(); S.dirty = true; malSpeichern();
  } }, [ic('<path d="M12 5v14M5 12h14"/>'), h('span', {}, [h('b', {}, ['Start an empty log']), h('small', {}, ['A fresh file, filled day by day under Data entry.'])])]));
  if (FSA) idbLesen('letzteDatei').then(hd => {
    if (!hd || !hd.getFile || $('#wahl [data-letzte]')) return;
    const b = h('button', { type: 'button', 'data-letzte': '1', onclick: async () => {
      try {
        if (hd.requestPermission && (await hd.requestPermission({ mode: 'readwrite' })) !== 'granted') return toast('No access to ' + hd.name + '. Open it with “Open your log”.', true);
        const f = await hd.getFile(); laden({ text: await f.text(), name: f.name, handle: hd });
      } catch (e){ toast('Could not open ' + hd.name + ': ' + (e && e.message || e), true); }
    } }, [ic('<path d="M5 12h14M13 6l6 6-6 6"/>'), h('span', {}, [h('b', {}, ['Continue with ' + hd.name]), h('small', {}, ['The file you worked in last time. Save writes straight back into it.'])])]);
    wahl.insertBefore(b, wahl.firstChild);
  });
  $('#startfuss').textContent = 'Nothing leaves this device. Saving writes a .json file wherever you choose' +
    (TOUCH ? ' (on iPhone: Save to Files in the share sheet).' : '; after that, Save writes straight back into it.') + ' You can also drop a file onto this window.';
  requestAnimationFrame(zeichneHintergrund);
}
(function startDrop(){
  const st = $('#start'); let tiefe = 0;
  st.addEventListener('dragenter', e => { e.preventDefault(); tiefe++; st.classList.add('over'); });
  st.addEventListener('dragover', e => e.preventDefault());
  st.addEventListener('dragleave', () => { if (--tiefe <= 0){ tiefe = 0; st.classList.remove('over'); } });
  st.addEventListener('drop', e => {
    e.preventDefault(); tiefe = 0; st.classList.remove('over');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
    const it = e.dataTransfer.items && e.dataTransfer.items[0];
    const hdP = it && it.getAsFileSystemHandle ? it.getAsFileSystemHandle().catch(() => null) : Promise.resolve(null);
    Promise.all([f.text(), hdP]).then(([t, hd]) => laden({ text: t, name: f.name, handle: hd && hd.kind === 'file' ? hd : null }));
  });
})();

/* ================================================================ chrome */
const SEITEN = [
  { id: 'overview', t: 'Overview', i: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' },
  { id: 'entry', t: 'Data entry', i: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>' },
  { id: 'journal', t: 'Journal', i: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>' },
  { id: 'mapping', t: 'Mapping', i: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M8.5 6.5 15.5 11M8.5 17.5l7-4.5"/>' }
];
const icon = (p, s) => '<svg width="' + (s || 19) + '" height="' + (s || 19) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';

function starteApp(){
  initState(); F = null;
  $('#start').classList.remove('on'); $('#shell').classList.add('on');
  $$('.logo').forEach(l => malLogo(l));
  const nav = $('#navliste'), tb = $('#tabbar'); nav.innerHTML = ''; tb.innerHTML = '';
  SEITEN.forEach(s => {
    nav.appendChild(h('button', { type: 'button', 'data-tab': s.id, html: icon(s.i) + '<span>' + s.t + '</span>', onclick: () => zeigeTab(s.id) }));
    tb.appendChild(h('button', { type: 'button', 'data-tab': s.id, html: icon(s.i, 21) + '<span>' + (s.id === 'entry' ? 'Entry' : s.t) + '</span>', onclick: () => zeigeTab(s.id) }));
  });
  malDateiname(); malSpeichern(); malWoche();
  S.firstPaint = {};
  zeigeTab('overview');
  requestAnimationFrame(zeichneHintergrund);
}
function malCtl(){
  const ctl = $('#ctl'); ctl.innerHTML = '';
  const ohne = S.tab === 'mapping' || S.tab === 'entry';
  const ys = yearsWithData();
  if (!ohne){
    if (ys.length > 1){
      const ySel = h('select', { class: 'wahlfeld', 'aria-label': 'Year' });
      ys.slice().reverse().forEach(y => ySel.appendChild(h('option', { value: y, selected: y === S.year }, [y])));
      ySel.onchange = () => {
        S.year = ySel.value; const l = lastDataDay(S.year);
        S.month = l ? parseInt(l.slice(5, 7), 10) - 1 : 11;
        S.firstPaint = {}; malCtl(); render();
      };
      ctl.appendChild(ySel);
    }
    const mSel = h('select', { class: 'wahlfeld monat', 'aria-label': 'Month' });
    MONTHS.forEach((m, i) => {
      let has = false; const key = S.year + '-' + String(i + 1).padStart(2, '0');
      for (const k in DATA.days) if (k.slice(0, 7) === key){ has = true; break; }
      mSel.appendChild(h('option', { value: i, selected: i === S.month }, [m + (has ? '' : '  (empty)')]));
    });
    mSel.onchange = () => { S.month = parseInt(mSel.value, 10); S.firstPaint = {}; render(); };
    ctl.appendChild(mSel);
    ctl.appendChild(h('div', { class: 'seg', role: 'group', 'aria-label': 'Period or year to date' }, [
      h('button', { type: 'button', class: S.mode === 'period' ? 'on' : '', 'aria-pressed': String(S.mode === 'period'), onclick: () => { S.mode = 'period'; S.firstPaint = {}; malCtl(); render(); } }, ['Month']),
      h('button', { type: 'button', class: S.mode === 'ytd' ? 'on' : '', 'aria-pressed': String(S.mode === 'ytd'), onclick: () => { S.mode = 'ytd'; S.firstPaint = {}; malCtl(); render(); } }, ['YTD'])
    ]));
  }
  ctl.appendChild(h('button', { type: 'button', class: 'kbtn', onclick: () => pdfDialog(), html: icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 15h6M9 18h4"/>', 17) + '<span>PDF</span>' }));
  const sm = h('button', { type: 'button', class: 'kbtn save', id: 'saveMobile', onclick: speichern, html: icon('<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 3v5h7V3M7 21v-7h10v7"/>', 17) + '<span>Saved</span>' });
  ctl.appendChild(sm);
  malSpeichern();
}
function malWoche(){
  if (!DATA) return;
  const w0 = monday(P(TODAY)); let n = 0;
  for (let i = 0; i < 7; i++){ const r = DATA.days[ISO(add(w0, i))]; if (r && r.gym) n++; }
  const t = C.weeklyTarget, pips = [];
  for (let i = 0; i < Math.max(t, n); i++) pips.push('<i class="' + (i < n ? 'on' : '') + '"></i>');
  let lw = null; for (const k in DATA.days){ const r = DATA.days[k]; if (r.kg != null && r.kg !== '' && (!lw || k > lw)) lw = k; }
  $('#woche').innerHTML = '<div class="wk"><span>This week</span><b class="' + (n >= t ? 'hit' : '') + '">' + n + '<span> / ' + t + '</span></b></div>' +
    '<div class="pips">' + pips.join('') + '</div>' +
    (lw ? '<div class="gew"><span>Weight ' + deShort(P(lw)) + '</span><b>' + n2(DATA.days[lw].kg) + ' kg</b></div>' : '');
}
function zeigeTab(id){
  if (!SEITEN.some(s => s.id === id)) id = 'overview';
  if (S.tab === 'entry' && id !== 'entry') formBuchenStill();
  const wechsel = S.tab !== id;
  S.tab = id;
  $$('.page').forEach(p => p.classList.toggle('on', p.id === 'p-' + id));
  $$('#navliste button,#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
  $('#titel').textContent = (SEITEN.find(s => s.id === id) || {}).t;
  if (wechsel) S.firstPaint[id] = false;
  malCtl(); render();
  if (wechsel) window.scrollTo(0, 0);
}
function render(){
  const id = S.tab, el = $('#p-' + id);
  const anim = BEWEGUNG && !S.firstPaint[id];
  S.firstPaint[id] = true;
  el.innerHTML = '';
  if (id === 'overview') seiteOverview(el, anim);
  else if (id === 'journal') seiteJournal(el);
  else if (id === 'mapping') seiteMapping(el);
  else seiteEntry(el);
  malWoche();
}
function goTo(tab, iso){
  if (iso){ formBuchenStill(); S.tag = iso; F = null; }
  zeigeTab(tab);
}

/* file menu */
(function menu(){
  const knopf = $('#menuknopf'), box = $('#menu');
  let panel = null;
  function zu(){ if (panel){ panel.remove(); panel = null; knopf.setAttribute('aria-expanded', 'false'); } }
  knopf.addEventListener('click', e => {
    e.stopPropagation();
    if (panel) return zu();
    panel = h('div', { class: 'panel', role: 'menu' }, [
      h('button', { type: 'button', onclick: () => { zu(); speichern(); }, html: icon('<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 3v5h7V3"/>', 16) + 'Save' }),
      h('button', { type: 'button', onclick: () => { zu(); kopieSpeichern(); }, html: icon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', 16) + 'Save a dated copy\u2026' }),
      FSA ? h('button', { type: 'button', onclick: () => { zu(); backupMenue(); }, html: icon('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>', 16) + 'Backup folder\u2026' }) : null,
      h('button', { type: 'button', onclick: () => { zu(); pdfDialog(); }, html: icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', 16) + 'Monthly report as PDF' }),
      h('hr'),
      h('button', { type: 'button', onclick: () => { zu(); oeffnenAnderes(); }, html: icon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', 16) + 'Open another file' })
    ]);
    box.appendChild(panel); knopf.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('click', e => { if (panel && !box.contains(e.target)) zu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') zu(); });
})();
function oeffnenAnderes(){
  formBuchenStill();
  if (!S.dirty) return oeffnen();
  bestaetigen({ titel: 'Open another file', lead: 'You have unsaved changes. Opening another file drops them from this window.',
    liste: ['They stay restorable from the start screen until you save something else.'], ja: 'Open anyway', gefahr: true, beiJa: oeffnen });
}
$('#speichern').addEventListener('click', speichern);
window.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); if (DATA && $('#shell').classList.contains('on')) speichern(); } });
window.addEventListener('beforeunload', e => { if (S.dirty || (F && F.changed)){ e.preventDefault(); e.returnValue = ''; } });

/* count-up for the large figures */
function hochzaehlen(el, ziel, dez){
  if (!el) return;
  const fmt = v => dez ? v.toFixed(dez) : String(Math.round(v));
  if (!BEWEGUNG || !isFinite(ziel) || Math.abs(ziel) < 1){ el.textContent = fmt(ziel); return; }
  const t0 = performance.now(), dauer = 700;
  el.textContent = fmt(0);
  const schritt = t => { const x = Math.min(1, (t - t0) / dauer), e = 1 - Math.pow(1 - x, 3); el.textContent = fmt(ziel * e); if (x < 1) requestAnimationFrame(schritt); else el.textContent = fmt(ziel); };
  requestAnimationFrame(schritt);
}

/* tooltip shared by every chart */
const TIP = $('#tip');
function tipZeigen(html, x, y){ TIP.innerHTML = html; TIP.style.left = x + 'px'; TIP.style.top = y + 'px'; TIP.classList.add('on'); }
function tipWeg(){ TIP.classList.remove('on'); }
window.addEventListener('scroll', tipWeg, { passive: true });

/* ================================================================ dialogs (only where something needs confirming) */
function dialog(titel, sub, body, opt){
  opt = opt || {};
  const hg = h('div', { class: 'hg' });
  const zuBtn = h('button', { class: 'zu', type: 'button', 'aria-label': 'Close' }, ['\u2715']);
  const box = h('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': titel }, [
    h('div', { class: 'dk' }, [h('div', {}, [h('h2', {}, [titel]), sub ? h('p', {}, [sub]) : null]), zuBtn]),
    h('div', { class: 'db' }, [body])
  ]);
  hg.appendChild(box); $('#dlgroot').appendChild(hg);
  const vorher = document.activeElement;
  function zu(){ hg.remove(); document.removeEventListener('keydown', esc); tipWeg(); if (opt.beimSchliessen) opt.beimSchliessen(); if (vorher && vorher.focus) try { vorher.focus(); } catch (e){} }
  function esc(e){ if (e.key === 'Escape') zu(); }
  zuBtn.onclick = zu;
  hg.addEventListener('click', e => { if (e.target === hg) zu(); });
  document.addEventListener('keydown', esc);
  setTimeout(() => { const f = box.querySelector(opt.fokus || '.zu'); if (f) f.focus(); }, 30);
  return { zu, box };
}
function bestaetigen(o){
  const body = h('div', {}, [
    h('p', { class: 'lead' }, [o.lead]),
    o.warn ? h('div', { class: 'gefahrnotiz' }, [o.warn]) : null,
    o.liste && o.liste.length ? h('ul', { class: 'liste' }, o.liste.map(x => h('li', {}, [x]))) : null,
    h('div', { class: 'aktion' }, [
      h('button', { class: 'btn leicht', type: 'button', onclick: () => d.zu() }, ['Cancel']),
      h('button', { class: 'btn' + (o.gefahr ? ' voll-gefahr' : ''), type: 'button', onclick: () => { d.zu(); o.beiJa(); } }, [o.ja])
    ])
  ]);
  const d = dialog(o.titel, o.sub, body);
}

