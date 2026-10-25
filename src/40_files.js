/* ================================================================ files */
const DRAFT_KEY = 'trainingLog.draft.v1';
let draftTimer = null, draftVoll = false;
function draftLesen(){ try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY)); return d && d.data && d.data.days ? d : null; } catch (e){ return null; } }
/* the draft holds the log and, while Entry has changes not logged yet, the form itself: an app the iPhone closes
   in the background loses nothing. A browser that refuses the copy (storage full) says so once. */
function draftSchreiben(sofort){
  clearTimeout(draftTimer);
  const tu = () => {
    if (!DATA || !(S.dirty || (F && F.changed))) return;
    const form = F && F.changed ? { iso: F.iso, training: F.training, cardio: F.cardio, stretch: F.stretch, special: F.special, journal: F.journal, kg: F.kg } : null;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: new Date().toISOString(), name: FILE.name, dirty: S.dirty, form, data: DATA })); draftVoll = false; }
    catch (e){ if (!draftVoll){ draftVoll = true; toast('This browser refused to keep a local copy. Save to your file regularly.', true); } }
  };
  if (sofort) tu(); else draftTimer = setTimeout(tu, 700);
}
/* going to the background (another app, the lock button) writes the draft at once, not 0.7 s later */
document.addEventListener('visibilitychange', () => { if (document.hidden) draftSchreiben(true); });
window.addEventListener('pagehide', () => draftSchreiben(true));
function draftWeg(){ clearTimeout(draftTimer); try { localStorage.removeItem(DRAFT_KEY); } catch (e){} }

function stamp(){ return TODAY; }
function dataName(){ return stamp() + '_RISE.json'; }
function copyName(){ return stamp() + '_RISE COPY.json'; }
/* a file opened under the old name (…_TRAINING LOG DATA.json) is not written back into: the picker offers the new name once */
function neuerName(n){ return /_RISE\.json$/i.test(n || ''); }

/* Reads a picked file: the .json data file, or the old Trainingslog HTML with the data inside it. */
function lesen(text, name){
  const t = String(text || '').trim();
  if (t.charAt(0) === '{'){
    let o; try { o = JSON.parse(t); } catch (e){ throw new Error('The file is not valid JSON.'); }
    if (!o.days) throw new Error('This JSON has no training days in it.');
    return { data: normalize(o), from: 'json' };
  }
  if (/<html/i.test(t)){
    const doc = new DOMParser().parseFromString(t, 'text/html');
    const p = doc.getElementById('payload');
    if (p){ let o; try { o = JSON.parse(p.textContent); } catch (e){ throw new Error('The log inside this HTML could not be read.'); } return { data: normalize(o), from: 'html' }; }
    if (doc.getElementById('appdata')) throw new Error('That is the training plan, not the log. Open the log or its data file.');
    throw new Error('No training log data found in this HTML.');
  }
  throw new Error('Pick the .json data file, or the old Trainingslog HTML.');
}
function oeffnenUeberEingabe(){
  return new Promise(res => {
    const inp = $('#dateiwahl');
    inp.value = '';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return res(null); f.text().then(t => res({ text: t, name: f.name, handle: null })); };
    inp.click();
  });
}
async function oeffnen(){
  let got = null;
  if (window.showOpenFilePicker && !TOUCH){
    try {
      const [hd] = await window.showOpenFilePicker({ multiple: false, id: 'trainingslog',
        types: [{ description: 'RISE data', accept: { 'application/json': ['.json'], 'text/html': ['.html', '.htm'] } }] });
      const f = await hd.getFile(); got = { text: await f.text(), name: f.name, handle: hd };
    } catch (e){ if (e && e.name === 'AbortError') return; got = await oeffnenUeberEingabe(); }
  } else got = await oeffnenUeberEingabe();
  if (got) laden(got);
}
function laden(got){
  let r;
  try { r = lesen(got.text, got.name); } catch (e){ toast(e.message, true); return; }
  DATA = r.data; C = DATA.config;
  /* basis: the file's own "saved" stamp when it was opened; Save compares it with the file on disk (fremdGespeichert) */
  FILE = { name: r.from === 'json' ? got.name : '', handle: r.from === 'json' ? got.handle : null, folder: got.handle || null, basis: r.from === 'json' ? (DATA.saved || null) : undefined };
  if (FILE.handle) idbSchreiben('letzteDatei', FILE.handle);
  starteApp();
  if (DATA.settings && DATA.settings.theme) Kit.set(DATA.settings.theme, 'file');
  if (r.from === 'html'){
    S.dirty = true; malSpeichern();
    setTimeout(() => toast('Log taken over from ' + got.name + '. Save once to get your data file.'), 500);
  } else if (KG_CLEANED){
    S.dirty = true; malSpeichern();
    setTimeout(() => toast(plural(KG_CLEANED, 'weight') + ' read from journal text dropped. Save to keep the clean-up.'), 500);
  } else draftWeg();
}
/* One way out for every file this tool writes: the save dialog where the browser has one (you choose folder and name),
   the share sheet on iPhone (Save to Files), a plain download as the last resort. */
async function ablegen(blob, name, art){
  if (window.showSaveFilePicker && !TOUCH){
    try {
      const opts = { suggestedName: name, types: [{ description: art.desc, accept: { [art.mime]: [art.ext] } }] };
      if (FILE.folder) opts.startIn = FILE.folder; else opts.id = 'trainingslog';
      let hd;
      try { hd = await window.showSaveFilePicker(opts); }
      catch (e){ if (e && e.name === 'AbortError') throw e; delete opts.startIn; opts.id = 'trainingslog'; hd = await window.showSaveFilePicker(opts); }
      const w = await hd.createWritable(); await w.write(blob); await w.close();
      return { ok: true, name: hd.name, handle: hd };
    } catch (e){
      if (e && e.name === 'AbortError') return { ok: false, abort: true };
      if (!(e && (e.name === 'SecurityError' || e.name === 'TypeError' || e.name === 'NotAllowedError'))) return { ok: false, err: e };
    }
  }
  if (TOUCH && navigator.canShare){
    try {
      const f = new File([blob], name, { type: art.mime });
      if (navigator.canShare({ files: [f] })){ await navigator.share({ files: [f] }); return { ok: true, name, shared: true }; }
    } catch (e){ if (e && e.name === 'AbortError') return { ok: false, abort: true }; }
  }
  const u = URL.createObjectURL(blob);
  /* phones that cannot share: show the PDF in a new tab, saving works from there */
  if (TOUCH && art.ext === '.pdf'){ const w = window.open(u, '_blank'); if (w){ setTimeout(() => URL.revokeObjectURL(u), 60000); return { ok: true, name, opened: true }; } }
  const a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 800);
  return { ok: true, name, download: true };
}
/* ---------- writing back to the open file, like the accounting tool ---------- */
const FSA = !!(window.showSaveFilePicker && window.showOpenFilePicker) && !TOUCH;
function idb(){ return new Promise((ok, nein) => { const r = indexedDB.open('trainingslog', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => nein(r.error); }); }
async function idbLesen(k){ try { const db = await idb(); return await new Promise((ok, nein) => { const t = db.transaction('kv').objectStore('kv').get(k);
  t.onsuccess = () => ok(t.result); t.onerror = () => nein(t.error); }); } catch (e){ return null; } }
async function idbSchreiben(k, v){ try { const db = await idb(); await new Promise((ok, nein) => { const t = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
  t.onsuccess = () => ok(); t.onerror = () => nein(t.error); }); return true; } catch (e){ return false; } }
async function schreibrecht(hd){
  if (!hd || !hd.queryPermission) return true;
  if (await hd.queryPermission({ mode: 'readwrite' }) === 'granted') return true;
  return (await hd.requestPermission({ mode: 'readwrite' })) === 'granted';
}
async function schreibeHandle(hd, inhalt){ const w = await hd.createWritable(); await w.write(inhalt); await w.close(); }
/* Was the file saved again since this window opened it (on the iPhone, in another window)? Its own "saved" stamp is
   compared with the one this window started from, so a OneDrive sync that only touches the file date does not count.
   null: nothing to worry about (also when the file is gone or cannot be read with the access we have). */
async function fremdGespeichert(hd){
  if (FILE.basis === undefined) return null;
  let text;
  try { text = await (await hd.getFile()).text(); } catch (e){ return null; }
  try { const o = JSON.parse(text), s = o && o.saved || null; return s !== (FILE.basis || null) ? { saved: s } : null; }
  catch (e){ return { saved: null }; }
}
const wannText = s => s ? new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
/* three choices, the safe one on top: 'ersetzen' (replace it), 'neu' (save as a new file) or null (cancel) */
function dreiWege(titel, text, hinweis){
  return new Promise(ok => {
    let wahl = null;
    const body = h('div', {}, [
      h('p', { class: 'lead' }, [text]),
      hinweis ? h('p', { class: 'hinweis', style: { margin: 0 } }, [hinweis]) : null,
      h('div', { class: 'aktion drei' }, [
        h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => d.zu() }, ['Cancel']),
        h('button', { class: 'btn btn--danger', type: 'button', onclick: () => { wahl = 'ersetzen'; d.zu(); } }, ['Replace it']),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { wahl = 'neu'; d.zu(); } }, ['Save as a new file'])
      ])
    ]);
    const d = dialog(titel, 'Your changes here are not lost either way', body, { danger: true, fokus: '.aktion .btn', beimSchliessen: () => ok(wahl) });
  });
}
function konfliktFrage(name, saved){
  return dreiWege('Saved elsewhere since you opened it', name + ' was saved again' + (saved ? ' on ' + wannText(saved) : '') + ' after you opened it here, on your iPhone or in another window. Saving now would replace that version.');
}
/* Save to folder asks when the app folder holds a newer data file, or today's file that is not this window's version */
function ordnerFrage(f){
  const liste = f.files.map(x => x.name + (x.stamp ? ' (saved ' + wannText(x.stamp) + ')' : '')).join(', ');
  return f.kind === 'newer'
    ? dreiWege('Saved elsewhere since you opened it', liste + ' in \u201c' + f.folder + '\u201d was saved after the version you have here, on your iPhone or in another window.',
        'Replace it: that file goes to the backup folder and this version takes its place. Save as a new file: this version goes next to it as a copy.')
    : dreiWege('Today\u2019s file is already there', liste + ' is already in \u201c' + f.folder + '\u201d and is not the version you have here.',
        'Replace it: the old one goes to the backup folder. Save as a new file: this version goes next to it as a copy.');
}
/* the data files a save to the app folder replaces (moved to the backup folder): today's name, the old names, the
   " 1" / " (1)" an iPhone save adds, the daily backups of earlier builds. Copies stay where they are */
function istDatendatei(n){ return /\.json$/i.test(n) && !/COPY/i.test(n) && (/_RISE( BACKUP)?( \d+| \(\d+\))?\.json$/i.test(n) || /TRAINING LOG (DATA|BACKUP)/i.test(n)); }
function stempel(t){ try { return JSON.parse(t).saved || null; } catch (e){ return null; } }
function liestZurueck(t){ try { return Object.keys(normalizeKopie(t).days).length === Object.keys(DATA.days).length; } catch (e){ return false; } }
function normalizeKopie(t){ const merk = KG_CLEANED, d = normalize(JSON.parse(t)); KG_CLEANED = merk; return d; }

/* Save to folder (desktop): the app folder (e.g. OneDrive \u203a APPS \u203a RISE) and the backup folder (its 02 BACKUP).
   Replaces the daily backup of earlier builds: every save now moves the file it replaces into the backup folder. */
async function ordnerDialog(){
  if (!Kit.folder.can) return toast('Saving to folders needs Chrome or Edge on a computer.', true);
  const app = await Kit.folder.get(), bk = await Kit.folder.backup();
  const waehle = async (wahl, was, alt) => {
    let neu;
    try { neu = await wahl(); }
    catch (e){ if (!e || e.name !== 'AbortError') toast(e && e.message || 'This browser did not give access to that folder.', true); return; }
    const bk2 = await Kit.folder.backup();
    toast(was + ' folder: \u201c' + neu.name + '\u201d' + (alt && alt !== neu.name ? ' (was \u201c' + alt + '\u201d)' : '') + '.' +
      (was === 'App' ? (bk2 ? ' Backups go to \u201c' + bk2.name + '\u201d.' : ' It has no 02 BACKUP: choose a backup folder too.') : ''));
    d.zu(); setTimeout(ordnerDialog, BEWEGUNG ? 280 : 0);
  };
  const zeile = (titel, ordner, leer, an, fn) => h('div', { class: 'ordnerzeile' }, [
    h('div', {}, [h('small', {}, [titel]), h('b', {}, [ordner ? '\u201c' + ordner.name + '\u201d' : leer])]),
    h('button', { class: 'btn btn--secondary btn--sm', type: 'button', disabled: an ? null : true, onclick: fn }, [ordner ? 'Change\u2026' : 'Choose\u2026'])]);
  const body = h('div', {}, [
    h('p', { class: 'lead' }, ['Save writes today\u2019s file into the app folder and moves the file it replaces into the backup folder. Nothing is deleted.']),
    zeile('App folder', app, 'Not chosen yet (e.g. OneDrive \u203a APPS \u203a RISE)', true, () => waehle(Kit.folder.choose, 'App', app && app.name)),
    zeile('Backup folder', bk, app ? 'Not chosen yet (e.g. 02 BACKUP)' : 'Choose the app folder first', !!app, () => waehle(Kit.folder.chooseBackup, 'Backup', bk && bk.name)),
    h('p', { class: 'hinweis', style: { margin: '12px 0 0' } }, ['A browser only shows a folder\u2019s name, not where it is. If you move or rename a folder, the app says so and you choose it again. The github.io app and a copy opened from this computer each remember their own folders.']),
    h('div', { class: 'aktion' }, [
      app ? h('button', { class: 'btn btn--ghost', type: 'button', style: { marginRight: 'auto' }, onclick: async () => { await Kit.folder.forget(); d.zu(); toast('Folders forgotten. Save writes back into the opened file again.'); } }, ['Stop using folders']) : null,
      h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => d.zu() }, ['Close']),
      h('button', { class: 'btn btn--primary', type: 'button', disabled: app ? null : true, onclick: () => { d.zu(); speichern(); } }, ['Save now'])
    ])
  ]);
  const d = dialog('Save to folder', app ? null : 'Pick the app folder once; its 02 BACKUP is used by itself', body);
}

function dateiText(){
  const before = DATA.saved;
  try { DATA.settings = Object.assign({}, DATA.settings || {}, { theme: Kit.theme() }); } catch (e){}
  DATA.saved = new Date().toISOString();
  const text = JSON.stringify(DATA);
  try { const back = normalize(JSON.parse(text)); if (Object.keys(back.days).length !== Object.keys(DATA.days).length) throw new Error('check failed'); }
  catch (e){ DATA.saved = before; toast('Not saved: the check before writing failed. Your data in this window is unchanged.', true); return null; }
  return { text, before };
}
function gespeichert(){
  S.dirty = false; FILE.basis = DATA.saved || null; draftWeg(); malSpeichern(); malDateiname();
  document.dispatchEvent(new CustomEvent('dl:saved'));
  if (S.tab === 'entry') malStand();
}
/* Save: into the app folder once one is chosen (Save to folder), else straight back into the file you opened.
   Only a file that has never been saved asks where to go. */
async function speichern(){
  if (!DATA) return;
  if (F && F.changed){ formSchreiben(); if (S.tab === 'entry') render(); }
  const t = dateiText(); if (!t) return;
  if (FSA && Kit.folder.can && await Kit.folder.get()){
    let r;
    try {
      r = await Kit.folder.save({ name: dataName(), text: t.text, copyName: copyName(), basis: FILE.basis,
        isData: istDatendatei, stamp: stempel, check: liestZurueck, ask: ordnerFrage });
    } catch (e){ DATA.saved = t.before; toast('Not saved to the folder: ' + (e && e.message || e), true); return; }
    if (r.cancel){ DATA.saved = t.before; return; }
    if (r.missing || r.denied){
      DATA.saved = t.before;
      toast(r.missing ? '“' + r.folder + '” cannot be found any more. Moved or renamed? Choose it again.' : 'No access to “' + r.folder + '”. Choose it again.', true);
      return ordnerDialog();
    }
    FILE.handle = r.handle; FILE.folder = r.handle; FILE.name = r.name; idbSchreiben('letzteDatei', r.handle);
    gespeichert();
    toast('Saved to ' + r.folder + ': ' + r.name + (r.moved.length ? '. Moved to ' + r.backup + ': ' + r.moved.map(m => m[0]).join(', ') : '') +
      (r.noBackup ? '. Choose a backup folder to move the older files.' : ''));
    return;
  }
  if (FSA){
    try {
      let hd = FILE.handle && neuerName(FILE.name) ? FILE.handle : null, neu = false;
      if (hd){
        const f = await fremdGespeichert(hd);
        if (f){ const w = await konfliktFrage(hd.name, f.saved); if (!w){ DATA.saved = t.before; return; } if (w === 'neu'){ hd = null; neu = true; } }
      }
      if (!hd){
        /* "Save as a new file" after a conflict suggests the copy name, never the other version's name */
        const opts = { suggestedName: neu ? copyName() : dataName(), types: [{ description: 'RISE data', accept: { 'application/json': ['.json'] } }], id: 'trainingslog' };
        if (FILE.folder) opts.startIn = FILE.folder;
        hd = await window.showSaveFilePicker(opts);
      }
      if (!(await schreibrecht(hd))){ DATA.saved = t.before; toast('Saving needs write access to the file.', true); return; }
      await schreibeHandle(hd, t.text);
      FILE.handle = hd; FILE.folder = hd; FILE.name = hd.name; idbSchreiben('letzteDatei', hd);
      gespeichert();
      toast('Saved to ' + hd.name);
    } catch (e){
      DATA.saved = t.before;
      if (!(e && e.name === 'AbortError')) toast('Could not save: ' + (e && e.message || e), true);
    }
    return;
  }
  /* phone: no file access, so the share sheet (Save to Files) or a download */
  const r = await ablegen(new Blob([t.text], { type: 'application/json' }), dataName(), { desc: 'RISE data', mime: 'application/json', ext: '.json' });
  if (!r.ok){ DATA.saved = t.before; if (!r.abort) toast('Could not save: ' + (r.err && r.err.message || 'unknown error'), true); return; }
  FILE.name = r.name;
  gespeichert();
  toast(r.download ? 'Downloaded as ' + r.name : 'Handed to the share sheet as ' + r.name);
}
/* a dated copy somewhere else; your data file stays the one you work in */
async function kopieSpeichern(){
  if (!DATA) return;
  if (F && F.changed){ formSchreiben(); if (S.tab === 'entry') render(); }
  const t = dateiText(); if (!t) return;
  DATA.saved = t.before;
  const r = await ablegen(new Blob([t.text], { type: 'application/json' }), copyName(), { desc: 'RISE data', mime: 'application/json', ext: '.json' });
  if (r.ok) toast('Copy saved as ' + r.name);
  else if (!r.abort) toast('Could not save the copy: ' + (r.err && r.err.message || 'unknown error'), true);
}
function touch(){ S.dirty = true; PR_STAND++; malSpeichern(); draftSchreiben(); malWoche(); if (S.tab === 'entry') malStand(); }
function malSpeichern(){
  const b = $('#speichern'); if (!b) return;
  b.classList.toggle('is-dirty', S.dirty);
  $('.btn__label', b).textContent = S.dirty ? 'Save' : 'Saved';
  b.title = S.dirty ? (FILE.handle ? 'Unsaved changes. Writes straight back to ' + FILE.name + '.' : 'Unsaved changes.') : (DATA && DATA.saved ? 'Last saved ' + DATA.saved.slice(0, 16).replace('T', ' ') : 'Nothing changed yet');
}
function malDateiname(){ $('#dateiname').textContent = FILE.name || 'not saved yet'; }

