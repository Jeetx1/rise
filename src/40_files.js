/* ================================================================ files */
const DRAFT_KEY = 'trainingLog.draft.v1';
let draftTimer = null;
function draftLesen(){ try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY)); return d && d.data && d.data.days ? d : null; } catch (e){ return null; } }
function draftSchreiben(){
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: new Date().toISOString(), name: FILE.name, data: DATA })); } catch (e){} }, 700);
}
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
  FILE = { name: r.from === 'json' ? got.name : '', handle: r.from === 'json' ? got.handle : null, folder: got.handle || null };
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

/* the daily backup: the first save of each day drops a dated copy into a folder you picked once */
let backupOrdner = null, backupGefragt = false;
const backupMoeglich = () => FSA && typeof window.showDirectoryPicker === 'function';
async function backupWaehlen(){
  if (!backupMoeglich()){ toast('This browser cannot write into a folder. Backups need Chrome or Edge on a computer.', true); return false; }
  try {
    const ordner = await window.showDirectoryPicker({ mode: 'readwrite', id: 'trainingslog-backup' });
    backupOrdner = ordner; await idbSchreiben('backupOrdner', ordner);
    return true;
  } catch (e){ if (e && e.name !== 'AbortError') toast('No backup folder set: ' + e.message, true); return false; }
}
async function sicherung(inhalt){
  if (!backupMoeglich()) return null;
  if (!backupOrdner) backupOrdner = await idbLesen('backupOrdner');
  if (!backupOrdner) return { keinOrdner: true };
  try {
    if (!(await schreibrecht(backupOrdner))) return { fehler: 'Backup skipped: no access to the backup folder.' };
    const name = TODAY + '_RISE BACKUP.json';
    try { await backupOrdner.getFileHandle(name); return { schon: true, name }; }
    catch (e){ if (e && e.name !== 'NotFoundError') throw e; }
    const fh = await backupOrdner.getFileHandle(name, { create: true });
    await schreibeHandle(fh, inhalt);
    return { ok: true, name };
  } catch (e){ return { fehler: 'Backup failed: ' + (e && e.message || e) }; }
}
function backupFrage(inhalt, gespeichertIn){
  if (backupGefragt) return toast('Saved to ' + gespeichertIn);
  backupGefragt = true;
  const body = h('div', {}, [
    h('p', { class: 'lead' }, ['Saved to ' + gespeichertIn + '. Want a daily backup on top?']),
    h('p', { class: 'hinweis', style: { margin: 0 } }, ['Pick a folder once (OneDrive works well). The first save of each day then leaves a copy there, named like ' + TODAY + '_RISE BACKUP.json. Later saves that day only update your data file.']),
    h('div', { class: 'aktion' }, [
      h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => d.zu() }, ['Not now']),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => {
        d.zu();
        if (!(await backupWaehlen())) return;
        const bk = await sicherung(inhalt);
        if (bk && bk.ok) toast('Backups go to \u201c' + backupOrdner.name + '\u201d. Today\u2019s copy is there.');
        else if (bk && bk.fehler) toast(bk.fehler, true);
      } }, ['Choose folder'])
    ])
  ]);
  const d = dialog('Daily backup', 'One copy per day, in a folder of your choice', body);
}
async function backupMenue(){
  if (!backupMoeglich()) return toast('Backups need Chrome or Edge on a computer.', true);
  const vorher = backupOrdner || await idbLesen('backupOrdner');
  if (!(await backupWaehlen())) return;
  toast('Backups now go to \u201c' + backupOrdner.name + '\u201d' + (vorher && vorher.name !== backupOrdner.name ? ' (was \u201c' + vorher.name + '\u201d)' : '') + '.');
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
  S.dirty = false; draftWeg(); malSpeichern(); malDateiname();
  document.dispatchEvent(new CustomEvent('dl:saved'));
  if (S.tab === 'entry') malStand();
}
/* Save: straight back into the file you opened. Only a file that has never been saved asks where to go. */
async function speichern(){
  if (!DATA) return;
  if (F && F.changed){ formSchreiben(); if (S.tab === 'entry') render(); }
  const t = dateiText(); if (!t) return;
  if (FSA){
    try {
      let hd = FILE.handle && neuerName(FILE.name) ? FILE.handle : null;
      if (!hd){
        const opts = { suggestedName: dataName(), types: [{ description: 'RISE data', accept: { 'application/json': ['.json'] } }], id: 'trainingslog' };
        if (FILE.folder) opts.startIn = FILE.folder;
        hd = await window.showSaveFilePicker(opts);
      }
      if (!(await schreibrecht(hd))){ DATA.saved = t.before; toast('Saving needs write access to the file.', true); return; }
      await schreibeHandle(hd, t.text);
      FILE.handle = hd; FILE.folder = hd; FILE.name = hd.name; idbSchreiben('letzteDatei', hd);
      gespeichert();
      const bk = await sicherung(t.text);
      if (bk && bk.ok) toast('Saved to ' + hd.name + '. Today\u2019s backup: ' + bk.name);
      else if (bk && bk.fehler) toast('Saved to ' + hd.name + '. ' + bk.fehler, true);
      else if (bk && bk.keinOrdner) backupFrage(t.text, hd.name);
      else toast('Saved to ' + hd.name);
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
function touch(){ S.dirty = true; malSpeichern(); draftSchreiben(); malWoche(); if (S.tab === 'entry') malStand(); }
function malSpeichern(){
  const b = $('#speichern'); if (!b) return;
  b.classList.toggle('is-dirty', S.dirty);
  $('.btn__label', b).textContent = S.dirty ? 'Save' : 'Saved';
  b.title = S.dirty ? (FILE.handle ? 'Unsaved changes. Writes straight back to ' + FILE.name + '.' : 'Unsaved changes.') : (DATA && DATA.saved ? 'Last saved ' + DATA.saved.slice(0, 16).replace('T', ' ') : 'Nothing changed yet');
}
function malDateiname(){ $('#dateiname').textContent = FILE.name || 'not saved yet'; }

