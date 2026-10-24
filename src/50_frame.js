/* ================================================================ toast: the shared component, bottom centre */
const TOAST_IC = { success: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', info: '<path d="M12 11v6M12 7.2v.1"/>', error: '<path d="M12 3.8L2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17v.1"/>' };
function toast(msg, fehler){
  const box = $('#toasts'), typ = fehler ? 'error' : (/^(Saved|Copy saved|Merged|Backups|Downloaded|Log taken|Every PR|Unsaved changes restored)/.test(msg) ? 'success' : 'info');
  const t = h('div', { class: 'toast toast--' + typ }, [
    h('span', { class: 'toast__icon', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + TOAST_IC[typ] + '</svg>' }),
    h('div', { class: 'toast__body' }, [msg])]);
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 260); }, fehler ? 5200 : 3400);
}

/* ================================================================ background: the look's own ambient element (Design Lab), nothing drawn here */
function zeichneHintergrund(){}

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

/* ================================================================ start screen */
function zeigeStart(){
  $('#shell').classList.remove('on'); $('#start').classList.add('on');
  const look = $('#startLook');
  if (look && !look._seg){ const sw = Kit.themeSwitch(); look._seg = sw; look.appendChild(sw.el); document.addEventListener('dl:theme', sw.sync); }
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
  const nav = $('#tabs');
  $$('.tab', nav).forEach(b => b.remove());
  SEITEN.forEach(s => nav.appendChild(h('button', { type: 'button', class: 'tab', 'data-tab': s.id, html: icon(s.i, 19) + '<span>' + (s.id === 'entry' ? 'Entry' : s.t) + '</span>', onclick: () => zeigeTab(s.id) })));
  nav.style.setProperty('--n', SEITEN.length);
  /* the look: top right, under the period toggle */
  if (!$('#look')){ const lb = Kit.lookButton(); lb.id = 'look'; $('#lookSlot').appendChild(lb); }
  S.tab = null;
  malDateiname(); malSpeichern(); malWoche();
  S.firstPaint = {};
  zeigeTab('overview');
  requestAnimationFrame(zeichneHintergrund);
}
function malCtl(){
  const ctl = $('#ctl'); ctl.innerHTML = '';
  const ohne = S.tab === 'mapping' || S.tab === 'entry';
  const ys = yearsWithData(), pille = sel => h('span', { class: 'select-wrap' }, [sel]);
  if (!ohne){
    if (ys.length > 1){
      const ySel = h('select', { class: 'select select--pill', 'aria-label': 'Year' });
      ys.slice().reverse().forEach(y => ySel.appendChild(h('option', { value: y, selected: y === S.year }, [y])));
      ySel.onchange = () => {
        S.year = ySel.value; const l = lastDataDay(S.year);
        S.month = l ? parseInt(l.slice(5, 7), 10) - 1 : 11;
        S.firstPaint = {}; malCtl(); render();
      };
      ctl.appendChild(pille(ySel));
    }
    const mSel = h('select', { class: 'select select--pill monat', 'aria-label': 'Month' });
    MONTHS.forEach((m, i) => {
      let has = false; const key = S.year + '-' + String(i + 1).padStart(2, '0');
      for (const k in DATA.days) if (k.slice(0, 7) === key){ has = true; break; }
      mSel.appendChild(h('option', { value: i, selected: i === S.month }, [m + (has ? '' : '  (empty)')]));
    });
    mSel.onchange = () => { S.month = parseInt(mSel.value, 10); S.firstPaint = {}; render(); };
    ctl.appendChild(pille(mSel));
    ctl.appendChild(segment([['period', 'Month'], ['ytd', 'YTD']], S.mode, m => { S.mode = m; S.firstPaint = {}; nachSchieber(render); }, 'Period or year to date'));
  }
  ctl.appendChild(h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => pdfDialog(), html: icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 15h6M9 18h4"/>', 16) + '<span class="btn__label">PDF</span>' }));
}
/* the shared segmented control: equal cells, the thumb only moves with translateX (--i of --n) */
function segment(optionen, wert, beiWahl, label){
  const s = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label || null }), thumb = h('span', { class: 'segmented__thumb' }, [h('i')]);
  s.appendChild(thumb); s.style.setProperty('--n', optionen.length);
  const setI = i => s.style.setProperty('--i', i);
  setI(Math.max(0, optionen.findIndex(o => o[0] === wert)));
  const knoepfe = optionen.map(([id, t]) => h('button', { type: 'button', role: 'radio', class: id === wert ? 'is-active' : '', 'aria-checked': id === wert ? 'true' : 'false' }, [t]));
  knoepfe.forEach((k, i) => {
    k.onclick = () => {
      if (k.classList.contains('is-active')) return;
      knoepfe.forEach(x => { x.classList.toggle('is-active', x === k); x.setAttribute('aria-checked', x === k ? 'true' : 'false'); });
      setI(i); s.dispatchEvent(new CustomEvent('dl:seg', { bubbles: true })); beiWahl(optionen[i][0]);
    };
    s.appendChild(k);
  });
  return s;
}
/* the page is drawn again after the thumb has had its moment to travel */
function nachSchieber(fn){ if (BEWEGUNG) setTimeout(fn, 190); else fn(); }
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
  const nav = $('#tabs'), ti = Math.max(0, SEITEN.findIndex(s => s.id === id));
  nav.style.setProperty('--i', ti);
  $$('.tab', nav).forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('is-active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (wechsel) nav.dispatchEvent(new CustomEvent('dl:tab', { detail: ti }));
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

/* file menu (… in the header): the shared rounded menu */
(function menu(){
  const knopf = $('#menuknopf');
  let panel = null;
  function zu(){ if (!panel) return; const p = panel; panel = null; p.classList.add('is-closing'); setTimeout(() => p.remove(), 170); knopf.setAttribute('aria-expanded', 'false'); }
  const punkt = (pfad, text, fn) => h('button', { type: 'button', class: 'menu__item', role: 'menuitem', onclick: () => { zu(); fn(); }, html: icon(pfad, 16) + '<span>' + text + '</span>' });
  knopf.addEventListener('click', e => {
    e.stopPropagation();
    if (panel) return zu();
    panel = h('div', { class: 'menu dateimenu', role: 'menu' }, [
      punkt('<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 3v5h7V3"/>', 'Save', speichern),
      punkt('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', 'Save a dated copy…', kopieSpeichern),
      FSA ? punkt('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>', 'Backup folder…', backupMenue) : null,
      punkt('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', 'Monthly report as PDF', pdfDialog),
      h('hr'),
      punkt('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', 'Open another file', oeffnenAnderes),
      h('div', { class: 'menu__build' }, ['RISE \u00b7 build ' + BUILD])
    ]);
    document.body.appendChild(panel);
    const r = knopf.getBoundingClientRect();
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.left = Math.max(8, Math.min(r.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - 8)) + 'px';
    knopf.setAttribute('aria-expanded', 'true');
    const f = panel.querySelector('.menu__item'); if (f) try { f.focus({ preventScroll: true }); } catch (er){}
  });
  document.addEventListener('pointerdown', e => { if (panel && !panel.contains(e.target) && !knopf.contains(e.target)) zu(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') zu(); });
  window.addEventListener('resize', zu);
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
function hochzaehlen(el, ziel, dez, fmt){
  if (!el) return;
  fmt = fmt || (v => dez ? v.toFixed(dez) : String(Math.round(v)));
  const fertig = () => el.dispatchEvent(new CustomEvent('dl:number', { bubbles: true }));
  if (BEWEGUNG && isFinite(ziel) && Kit.numberReveal(el, 0, ziel, fmt, fertig)) return;
  if (!BEWEGUNG || !isFinite(ziel) || Math.abs(ziel) < 1){ el.textContent = fmt(ziel); return; }
  const t0 = performance.now(), dauer = 700;
  el.textContent = fmt(0);
  const schritt = t => { const x = Math.min(1, (t - t0) / dauer), e = 1 - Math.pow(1 - x, 3); el.textContent = fmt(ziel * e); if (x < 1) requestAnimationFrame(schritt); else { el.textContent = fmt(ziel); fertig(); } };
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
  const zuBtn = h('button', { class: 'modal__close zu', type: 'button', 'aria-label': 'Close', html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' });
  const box = h('div', { class: 'modal', role: opt.danger ? 'alertdialog' : 'dialog', 'aria-modal': 'true', 'aria-label': titel }, [
    h('div', { class: 'modal__grip' }),
    h('div', { class: 'modal__head dk' }, [
      opt.danger ? h('div', { class: 'modal__icon', html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.8L2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17v.1"/></svg>' }) : null,
      h('div', {}, [h('h2', { class: 'modal__title' }, [titel]), h('p', { class: 'modal__text', hidden: sub ? null : 'hidden' }, [sub || ''])]), zuBtn]),
    h('div', { class: 'db' }, [body])
  ]);
  const hg = h('div', { class: 'overlay' }, [box]);
  $('#dlgroot').appendChild(hg);
  document.dispatchEvent(new CustomEvent('dl:overlay', { detail: { open: true } }));
  const vorher = document.activeElement;
  let offen = true;
  function zu(){
    if (!offen) return; offen = false;
    document.removeEventListener('keydown', esc); tipWeg();
    hg.classList.add('is-closing');
    document.dispatchEvent(new CustomEvent('dl:overlay', { detail: { open: false } }));
    setTimeout(() => hg.remove(), BEWEGUNG ? 260 : 0);
    if (opt.beimSchliessen) opt.beimSchliessen();
    if (vorher && vorher.focus) try { vorher.focus({ preventScroll: true }); } catch (e){}
  }
  function esc(e){ if (e.key === 'Escape') zu(); }
  zuBtn.onclick = zu;
  hg.addEventListener('click', e => { if (e.target === hg) zu(); });
  document.addEventListener('keydown', esc);
  setTimeout(() => { const f = box.querySelector(opt.fokus || '.aktion .btn:last-child') || zuBtn; try { f.focus({ preventScroll: true }); } catch (e){} }, 60);
  return { zu, box };
}
function bestaetigen(o){
  const body = h('div', {}, [
    h('p', { class: 'lead' }, [o.lead]),
    o.warn ? h('div', { class: 'gefahrnotiz' }, [o.warn]) : null,
    o.liste && o.liste.length ? h('ul', { class: 'liste' }, o.liste.map(x => h('li', {}, [x]))) : null,
    h('div', { class: 'aktion' }, [
      h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => d.zu() }, ['Cancel']),
      h('button', { class: 'btn ' + (o.gefahr ? 'btn--danger' : 'btn--primary'), type: 'button', onclick: () => { d.zu(); o.beiJa(); } }, [o.ja])
    ])
  ]);
  const d = dialog(o.titel, o.sub, body, { danger: !!o.gefahr });
}

