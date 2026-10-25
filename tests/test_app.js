/* Interface and logic tests for RISE (training log), driven through the DOM only (the app runs inside one closure).
   The clock is frozen at 14.10.2026 10:00 local time so the figures do not depend on the day the tests run.
   The browser reports reduced motion, so figures and lines are drawn at once (animations: tests/test_ui.js in Chromium).
   Usage: node tests/test_app.js [path to a real data .json for an extra smoke run]                        */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf8');
const FIXTURE = fs.readFileSync(path.join(__dirname, 'fixture.json'), 'utf8');
const FIXED = new Date(2026, 9, 14, 10, 0, 0).getTime();

let ok = 0, bad = 0;
const check = (cond, msg) => { if (cond) ok++; else { bad++; console.log('FAIL  ' + msg); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function boot(o){
  o = o || {};
  const errors = [], blobs = [], names = [], sw = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) errors.push(e.message); });
  const dom = new JSDOM(HTML, {
    url: 'https://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w){
      const D = w.Date;
      /* the frozen clock; a test can move it on with env.w.__now (a new day) */
      class FakeDate extends D { constructor(...a){ if (a.length) super(...a); else super(w.__now || FIXED); } static now(){ return w.__now || FIXED; } }
      w.Date = FakeDate;
      /* Save to folder: o.ordner is the app folder the folder picker returns, o.oeffne the file the open picker returns */
      if (o.ordner){
        w.showDirectoryPicker = async () => o.ordner;
        w.showOpenFilePicker = async () => [o.oeffne];
        w.showSaveFilePicker = async x => fakeFile(x.suggestedName);
      }
      /* a computer with file pickers: open and save go through handles on a small in-memory disk (env.w.__disk) */
      if (o.disk){
        w.__disk = Object.assign({}, o.disk);
        const mk = n => ({ name: n, kind: 'file', getFile: async () => ({ name: n, text: async () => w.__disk[n] || '' }),
          createWritable: async () => { let s = ''; return { write: async b => { s += typeof b === 'string' ? b : await readBlobIn(w, b); }, close: async () => { w.__disk[n] = s; } }; },
          queryPermission: async () => 'granted', requestPermission: async () => 'granted' });
        w.showOpenFilePicker = async () => [mk(Object.keys(o.disk)[0])];
        w.showSaveFilePicker = async x => mk(x.suggestedName);
      }
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
      /* canvas: a context that accepts every call, so background, logo and PDF preview can draw */
      const ctx = new Proxy({}, { get: (t, k) => k === 'canvas' ? {} : (k in t ? t[k] : (k === 'measureText' ? () => ({ width: 10 }) :
        (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop(){} }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = () => ctx;
      w.URL.createObjectURL = b => { blobs.push(b); return 'blob:test/' + blobs.length; };
      w.URL.revokeObjectURL = () => {};
      w.open = () => null;
      w.scrollTo = () => {};
      w.HTMLAnchorElement.prototype.click = function(){ if (this.download) names.push(this.download); };
      /* the offline cache: registrations of sw.js are recorded (jsdom cannot run it) */
      Object.defineProperty(w.navigator, 'serviceWorker', { configurable: true,
        value: { controller: null, register: u => { sw.push(u); return Promise.resolve({}); }, addEventListener(){} } });
      /* what this browser kept from an earlier visit (the draft) */
      for (const k in (o.storage || {})) w.localStorage.setItem(k, o.storage[k]);
    }
  });
  return { dom, w: dom.window, d: dom.window.document, errors, blobs, names, sw };
}
/* a small in-memory file system for Save to folder: files hold text, folders hold names → handles */
const nichtDa = () => Object.assign(new Error('not found'), { name: 'NotFoundError' });
function fakeFile(n, t){ const f = { kind: 'file', name: n, _t: t || '', getFile: async () => ({ name: n, text: async () => f._t }),
  createWritable: async () => { let s = ''; return { write: async b => { s += String(b); }, close: async () => { f._t = s; } }; },
  queryPermission: async () => 'granted', requestPermission: async () => 'granted' }; return f; }
function fakeDir(n){ const kids = new Map(); const d = { kind: 'directory', name: n, kids, gone: false,
  queryPermission: async () => 'granted', requestPermission: async () => 'granted', isSameEntry: async o => o === d,
  getFileHandle: async (x, o) => { if (d.gone) throw nichtDa(); let f = kids.get(x); if (!f){ if (!(o && o.create)) throw nichtDa(); f = fakeFile(x); kids.set(x, f); } return f; },
  getDirectoryHandle: async (x, o) => { let f = kids.get(x); if (!f){ if (!(o && o.create)) throw nichtDa(); f = fakeDir(x); kids.set(x, f); } return f; },
  removeEntry: async x => { if (!kids.delete(x)) throw nichtDa(); },
  values: () => { const it = kids.values(); return { next: async () => { if (d.gone) throw nichtDa(); return it.next(); }, [Symbol.asyncIterator](){ return this; } }; } }; return d; }
function readBlobIn(w, b){ return new Promise((res, rej) => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsText(b); }); }
/* jsdom's Blob has no text()/arrayBuffer(): read it with the window's FileReader */
const readBlob = (env, b, bin) => new Promise((res, rej) => { const fr = new env.w.FileReader();
  fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); bin ? fr.readAsBinaryString(b) : fr.readAsText(b); });

async function openJson(env, text, name){
  const { w, d } = env;
  const btn = [...d.querySelectorAll('#wahl button')].find(b => /Open your log/.test(b.textContent));
  btn.click();
  const inp = d.getElementById('dateiwahl');
  Object.defineProperty(inp, 'files', { configurable: true, value: [{ name, text: () => Promise.resolve(text) }] });
  inp.onchange();
  await sleep(30);
}
async function lastSavedJson(env){
  const b = env.blobs[env.blobs.length - 1];
  return JSON.parse(await readBlob(env, b));
}
const pageText = (env, id) => env.d.getElementById('p-' + id).textContent;
const tab = async (env, id) => { env.d.querySelector('#tabs .tab[data-tab="' + id + '"]').click(); await sleep(20); };
/* the newest toast (the shared toast component keeps up to three) */
const toastText = env => { const t = env.d.querySelectorAll('#toasts .toast'); return t.length ? t[t.length - 1].textContent : ''; };

/* figures the overview should show, computed independently from the file */
function expected(data){
  const days = Object.keys(data.days).filter(k => k.startsWith('2026-') && k <= '2026-10-31');
  const gym = days.filter(k => data.days[k].gym).length;
  return { gym };
}

(async () => {
  /* 1. start screen */
  let env = boot(); await sleep(30);
  check(env.d.getElementById('start').classList.contains('on'), 'start screen is shown');
  check(/Open your log/.test(env.d.getElementById('wahl').textContent), 'start offers Open your log');
  check(/Start an empty log/.test(env.d.getElementById('wahl').textContent), 'start offers an empty log');

  /* 2. open the fixture */
  await openJson(env, FIXTURE, 'fixture.json');
  check(env.d.getElementById('shell').classList.contains('on'), 'app shell opens after loading the JSON');
  check(env.d.getElementById('titel').textContent === 'Overview', 'opens on Overview');
  check(env.d.getElementById('dateiname').textContent === 'fixture.json', 'file name shown in the nav');
  const nav = [...env.d.querySelectorAll('#tabs .tab')].map(b => b.textContent);
  check(nav.join('|') === 'Overview|Entry|Journal|Mapping', 'page order: Overview, Entry, Journal, Mapping (got ' + nav.join('|') + ')');
  const fx = JSON.parse(FIXTURE), ex = expected(fx);
  const gross = env.d.querySelector('#p-overview .gross span');
  await sleep(900); /* count-up animation */
  check(gross && gross.textContent === String(ex.gym), 'YTD gym days = ' + ex.gym + ' (got ' + (gross && gross.textContent) + ')');
  check(/October 2026|Jan.*Oct.*2026/i.test(pageText(env, 'overview')), 'period label names Oct 2026');
  check(env.d.querySelector('#speichern').textContent === 'Saved', 'save button clean after opening');

  /* 3. every page renders without errors */
  for (const id of ['entry', 'journal', 'mapping', 'overview']){
    await tab(env, id);
    check(env.d.getElementById('p-' + id).classList.contains('on') && env.d.getElementById('p-' + id).children.length > 0, id + ' renders');
  }
  check(/Week|Weight|Body parts/i.test(pageText(env, 'overview')), 'overview has its sections');

  /* 4. month vs YTD toggle */
  const seg = [...env.d.querySelectorAll('#ctl .segmented button')];
  seg.find(b => b.textContent === 'Month').click(); await sleep(900);
  const octGym = Object.keys(fx.days).filter(k => k.startsWith('2026-10') && fx.days[k].gym).length;
  check(env.d.querySelector('#p-overview .gross span').textContent === String(octGym), 'Month mode shows October gym days = ' + octGym);

  /* 5. data entry: log a day, then save, and the day is in the file */
  await tab(env, 'entry');
  const sel = env.d.querySelector('#p-entry select.eingabe');
  check(!!sel, 'workout dropdown on Data entry');
  const opts = sel ? [...sel.querySelectorAll('option')].map(o => o.value) : [];
  check(opts[0] === '' && opts.includes('Push') && opts.includes('__neu'), 'dropdown: Rest day, workouts, New workout');
  sel.value = 'Legs'; sel.dispatchEvent(new env.w.Event('change', { bubbles: true }));
  const ta = env.d.querySelectorAll('#p-entry textarea');
  if (ta.length){ ta[ta.length - 1].value = 'Test journal line'; ta[ta.length - 1].dispatchEvent(new env.w.Event('input', { bubbles: true })); }
  const log = env.d.getElementById('logknopf');
  check(log && !log.disabled, 'Log day button active after a change');
  log.click(); await sleep(50);
  check(env.d.querySelector('#speichern').textContent === 'Save', 'save button turns to Save after logging');
  env.d.getElementById('speichern').click(); await sleep(80);
  const saved = await lastSavedJson(env);
  check(saved.days['2026-10-14'] && saved.days['2026-10-14'].gym === true && saved.days['2026-10-14'].training === 'Legs', 'logged day 14.10.2026 saved as Legs');
  check(saved.days['2026-10-14'] && /Test journal line/.test(saved.days['2026-10-14'].journal), 'journal text saved');
  check(saved.app === 'training-log' && saved.v === 4 && saved.config && saved.config.name === 'Test Person', 'file header and config kept');
  check(Object.keys(saved.days).length === Object.keys(fx.days).length + (fx.days['2026-10-14'] ? 0 : 1), 'no days lost or added on save');
  check(env.d.querySelector('#speichern').textContent === 'Saved', 'save button clean after saving');
  check(env.names[env.names.length - 1] === '2026-10-14_RISE.json', 'data file named YYYY-MM-DD_RISE.json (got ' + env.names[env.names.length - 1] + ')');

  /* 6. aliases: old split names count under the kept name */
  const tp = Object.keys(fx.days).filter(k => fx.days[k].training === 'T1 Push').length;
  check(tp > 0, 'fixture has alias rows');
  await tab(env, 'mapping');
  check(/Push/.test(pageText(env, 'mapping')), 'Mapping lists workouts');

  /* 7. monthly PDF: preview, then the file */
  const pdfBtn = [...env.d.querySelectorAll('#ctl button')].find(b => /PDF/.test(b.textContent));
  pdfBtn.click(); await sleep(20);
  const prev = [...env.d.querySelectorAll('#dlgroot button')].find(b => b.textContent === 'Preview');
  check(!!prev, 'PDF dialog has Preview');
  const nBefore = env.blobs.length;
  prev.click(); await sleep(60);
  const pdfBlob = env.blobs[nBefore];
  const pdf = pdfBlob ? await readBlob(env, pdfBlob, true) : '';
  check(pdf.startsWith('%PDF-'), 'preview builds a PDF');
  check(/\/Count 1\b/.test(pdf), 'monthly PDF is one page');
  check(/Test Person/.test(pdf), 'name on the PDF');
  check([...env.d.querySelectorAll('#dlgroot button')].some(b => b.textContent === 'Save PDF'), 'preview offers Save PDF');
  [...env.d.querySelectorAll('#dlgroot button')].find(b => b.textContent === 'Save PDF').click(); await sleep(60);
  check(/^2026-10-14_RISE REPORT [A-Z]+ 2026\.pdf$/.test(env.names[env.names.length - 1]), 'report named YYYY-MM-DD_RISE REPORT <MONTH> <YEAR>.pdf (got ' + env.names[env.names.length - 1] + ')');
  { const z = [...env.d.querySelectorAll('#dlgroot .overlay .modal__close')]; z.forEach(b => b.click()); await sleep(20); }
  env.d.getElementById('menuknopf').click(); await sleep(20);
  [...env.d.querySelectorAll('.menu__item')].find(b => /dated copy/.test(b.textContent)).click(); await sleep(60);
  check(env.names[env.names.length - 1] === '2026-10-14_RISE COPY.json', 'dated copy named YYYY-MM-DD_RISE COPY.json (got ' + env.names[env.names.length - 1] + ')');

  /* 8. reopen what was saved: same data (normalize is stable) */
  let env2 = boot(); await sleep(20);
  await openJson(env2, JSON.stringify(saved), 'again.json');
  env2.d.getElementById('speichern').click(); await sleep(50);
  /* clean file: Save still writes */
  const again = env2.blobs.length ? await lastSavedJson(env2) : null;
  check(again && JSON.stringify(again.days) === JSON.stringify(saved.days), 'open + save round trip keeps every day unchanged');

  /* 9. the old single-file Trainingslog HTML is taken over */
  const oldPath = path.join(ROOT, 'private/Trainingslog_2026-09-27.html');
  if (fs.existsSync(oldPath)){
    let env3 = boot(); await sleep(20);
    await openJson(env3, fs.readFileSync(oldPath, 'utf8'), 'Trainingslog_2026-09-27.html');
    check(env3.d.getElementById('shell').classList.contains('on'), 'old Trainingslog HTML opens');
    check(env3.d.querySelector('#speichern').textContent === 'Save', 'taken-over HTML is marked unsaved');
    env3.dom.window.close();
  }

  /* 10. a JSON without days is refused, the app stays on the start screen */
  let env4 = boot(); await sleep(20);
  await openJson(env4, '{"foo":1}', 'wrong.json');
  check(env4.d.getElementById('start').classList.contains('on'), 'JSON without days is refused');
  check(/no training days/i.test(toastText(env4)), 'refusal explains why');

  /* 11. optional: the real data file */
  const real = process.argv[2];
  if (real && fs.existsSync(real)){
    let env5 = boot(); await sleep(20);
    const txt = fs.readFileSync(real, 'utf8'), rd = JSON.parse(txt);
    await openJson(env5, txt, path.basename(real));
    for (const id of ['entry', 'journal', 'mapping', 'overview']) await tab(env5, id);
    env5.d.getElementById('speichern').click(); await sleep(80);
    const rs = await lastSavedJson(env5);
    check(JSON.stringify(rs.days) === JSON.stringify(rd.days), 'real data: every day survives open + save (' + Object.keys(rd.days).length + ' days)');
    check(JSON.stringify(rs.config) === JSON.stringify(rd.config), 'real data: config unchanged');
    env.errors.push(...env5.errors);
  }

  /* 12. PR button: needs a body weight; heavier wins, on the same weight the lower body weight; Rep-PR = more reps at that weight or heavier */
  const prData = { days: {
    '2026-10-01': { gym: true, training: 'Legs', cardio: false, stretch: false, special: 'PR Deadlift 200 kg', journal: '', kg: 70, kgSrc: 'manual' },
    '2026-09-10': { gym: true, training: 'Push', cardio: false, stretch: false, special: 'PR Bench 140 kg', journal: '', kg: null, kgSrc: null } }, config: {}, v: 4 };
  let env6 = boot(); await sleep(20);
  await openJson(env6, JSON.stringify(prData), 'pr.json');
  await tab(env6, 'entry');
  check(!!env6.d.querySelector('#p-entry .prknopf'), 'Data entry has a PR button');
  const addPr = async (lift, kg, reps) => {
    if (env6.d.querySelector('#p-entry .prreihe').hidden) env6.d.querySelector('#p-entry .prknopf').click();
    const [li, ki, ri] = env6.d.querySelectorAll('#p-entry .prreihe input');
    li.value = lift; ki.value = kg; ri.value = reps || '';
    env6.d.querySelector('#p-entry .prreihe button').click(); await sleep(10);
    return toastText(env6);
  };
  const kgFeld = env6.d.querySelector('#p-entry .kgfeld input');
  check(/no body weight/.test(await addPr('Squat', '150')), 'no body weight within 7 days: kept as Special, says why');
  kgFeld.value = '80'; kgFeld.dispatchEvent(new env6.w.Event('input', { bubbles: true }));
  check(/^Deadlift 200 kg: no PR/.test(await addPr('Deadlift', '200')), 'same weight at a higher body weight is no PR');
  check(/^Deadlift 205 kg: PR!/.test(await addPr('Deadlift', '205')), 'heavier wins even at a higher body weight');
  check(/^Deadlift 205 kg x3: Rep-PR!/.test(await addPr('Deadlift', '205', '3')), 'more reps at that weight or heavier is a Rep-PR');
  check(/^Deadlift 190 kg x2: no PR/.test(await addPr('Deadlift', '190', '2')), 'fewer reps than a heavier set is no Rep-PR');
  env6.d.getElementById('logknopf').click(); await sleep(30);
  env6.d.getElementById('speichern').click(); await sleep(60);
  const prSaved = await lastSavedJson(env6), sp14 = prSaved.days['2026-10-14'] && prSaved.days['2026-10-14'].special;
  check(sp14 === 'Squat 150 kg\nDeadlift 200 kg\nPR Deadlift 205 kg\nRep-PR Deadlift 205 kg x3\nDeadlift 190 kg x2', 'PR lines saved in Special (got ' + JSON.stringify(sp14) + ')');
  await tab(env6, 'journal');
  const jb = t => [...env6.d.querySelectorAll('#p-journal .jbar button')].find(b => b.textContent === t);
  jb('PRs').click(); await sleep(20);
  check(/3 days with a PR/.test(pageText(env6, 'journal')), 'PRs lists every day with a PR or Rep-PR, all years');
  check(env6.d.querySelectorAll('#p-journal .chip.pr.rep').length === 1, 'Rep-PR has its own chip');
  jb('Re-check PRs').click(); await sleep(20);
  const dlg6 = env6.d.getElementById('dlgroot');
  check(/Re-check PRs/.test(dlg6.textContent) && /2 lines on 2 days would change/.test(dlg6.textContent) && /“PR Bench 140 kg” → “Bench 140 kg”/.test(dlg6.textContent),
    're-check shows what would change before anything changes');
  check(/3 days with a PR/.test(pageText(env6, 'journal')), 'nothing changes until Apply');
  [...dlg6.querySelectorAll('button')].find(b => b.textContent === 'Apply').click(); await sleep(20);
  check(/2 days with a PR/.test(pageText(env6, 'journal')) && /2 days changed/.test(toastText(env6)), 're-check: bench without a body weight loses PR, squat gains it once the day has one');
  env6.d.getElementById('speichern').click(); await sleep(60);
  const prRe = await lastSavedJson(env6);
  check(prRe.days['2026-09-10'].special === 'Bench 140 kg' && prRe.days['2026-10-14'].special === 'PR Squat 150 kg\nDeadlift 200 kg\nPR Deadlift 205 kg\nRep-PR Deadlift 205 kg x3\nDeadlift 190 kg x2', 're-check result saved (got ' + JSON.stringify(prRe.days['2026-10-14'].special) + ')');

  /* 13. Journal: Special filter, all years, and it switches the PR filter off */
  jb('Special').click(); await sleep(20);
  check(/3 days with a Special, all years/.test(pageText(env6, 'journal')) && jb('PRs').getAttribute('aria-pressed') === 'false', 'Special filter lists every day with a Special and turns PRs off');
  jb('Special').click(); await sleep(20);

  /* 14. Overview: PR tile at the bottom, calendar can be hidden and shown again */
  await tab(env6, 'overview');
  const ov = env6.d.getElementById('p-overview'), last = ov.lastElementChild;
  check(last && /^PRs/.test(last.textContent) && /Current best, all years/.test(last.textContent), 'PR tile is the last tile on the overview');
  check(/Deadlift 205 kg/.test(last.textContent) && /Squat 150 kg/.test(last.textContent) && /Rep-PR/.test(last.textContent), 'PR tile lists the PRs and the best per lift');
  const kalBtn = () => [...ov.querySelectorAll('.kalkopf button')][0];
  check(!!ov.querySelector('.kal'), 'calendar shown by default');
  kalBtn().click(); await sleep(20);
  check(!env6.d.querySelector('#p-overview .kal') && kalBtn().textContent === 'Show', 'calendar can be hidden');
  kalBtn().click(); await sleep(20);
  check(!!env6.d.querySelector('#p-overview .kal'), 'calendar can be shown again');

  /* 15. Data entry: the arrows jump a whole week */
  await tab(env6, 'entry');
  env6.d.querySelector('#p-entry .tagkopf button[aria-label="Previous week"]').click(); await sleep(20);
  check(/7 October 2026/.test(env6.d.querySelector('#p-entry .tagkopf .titel').textContent), 'previous-week arrow goes from 14 to 7 October');
  env6.d.querySelector('#p-entry .tagkopf button[aria-label="Next week"]').click(); await sleep(20);
  check(/14 October 2026/.test(env6.d.querySelector('#p-entry .tagkopf .titel').textContent), 'next-week arrow goes back to 14 October');

  /* 16. PDF: PRs can be left out, separately from the Special notes */
  await tab(env6, 'overview');
  const pdfOf = async (ohnePr) => {
    [...env6.d.querySelectorAll('#ctl button')].find(b => /PDF/.test(b.textContent)).click(); await sleep(20);
    if (ohnePr) [...env6.d.querySelectorAll('#dlgroot .pille')].find(b => b.textContent === 'PRs').click();
    const n = env6.blobs.length;
    [...env6.d.querySelectorAll('#dlgroot button')].find(b => b.textContent === 'Preview').click(); await sleep(60);
    const pdf = await readBlob(env6, env6.blobs[n], true);
    [...env6.d.querySelectorAll('#dlgroot button')].find(b => b.textContent === 'Back').click();
    [...env6.d.querySelectorAll('#dlgroot button')].find(b => b.textContent === 'Cancel').click(); await sleep(20);
    return pdf;
  };
  const mitPr = await pdfOf(false), ohnePr = await pdfOf(true);
  check(/PR Deadlift 205 kg/.test(mitPr) && /Deadlift 200 kg/.test(mitPr), 'PDF shows PRs and Special notes');
  check(!/PR Deadlift 205 kg/.test(ohnePr) && /Deadlift 200 kg/.test(ohnePr), 'PDF without PRs still has the other Special notes');

  /* 17. year dropdown: newest year on top */
  await tab(env, 'overview');
  const yopts = [...env.d.querySelectorAll('#ctl select')][0];
  const yv = yopts ? [...yopts.options].map(o => o.value) : [];
  check(yv.length > 1 && yv.join() === yv.slice().sort().reverse().join(), 'year dropdown: newest on top (got ' + yv.join(',') + ')');

  /* 18. Design Lab remodel: KPI cards (value, line, delta vs the period before; weight always neutral, Change none) */
  const kpis = [...env.d.querySelectorAll('#p-overview .kpis .kpi')];
  check(kpis.map(k => k.querySelector('.kpi__label').textContent).join('|') === 'Per week|Gym rate|Weight|Change', 'four KPI cards: Per week, Gym rate, Weight, Change');
  check(kpis.every(k => k.querySelector('svg.spark')) && kpis.filter(k => (k.querySelector('.spark__line') || { getAttribute: () => '' }).getAttribute('d')).length >= 3, 'KPI cards carry their line');
  const segOv = [...env.d.querySelectorAll('#ctl .segmented button')];
  segOv.find(b => b.textContent === 'Month').click(); await sleep(400);
  const dOf = i => env.d.querySelectorAll('#p-overview .kpis .kpi')[i].querySelector('.delta');
  const sepDays = Object.keys(fx.days).filter(k => k.startsWith('2026-09')).length;
  check(sepDays === 0 || (dOf(0) && / vs Sep$/.test(dOf(0).textContent)), 'Month: Per week compared with September (' + (dOf(0) ? dOf(0).textContent : 'none') + ')');
  check(!dOf(2) || dOf(2).classList.contains('delta--flat'), 'weight delta is always neutral');
  check(!dOf(3), 'Change has no delta');
  check(!env.d.querySelector('#p-overview .delta--down'), 'no red deltas');
  segOv.find(b => b.textContent === 'YTD').click(); await sleep(400);

  /* 19. the look: never an unsaved change, travels in the file, opening a file applies it; build version in the file menu */
  env.w.Kit.set('ember', 'user'); await sleep(50);
  check(env.d.documentElement.dataset.theme === 'ember' && env.d.querySelector('#speichern').textContent === 'Saved', 'changing the look is not an unsaved change');
  env.d.getElementById('speichern').click(); await sleep(80);
  const lookSaved = await lastSavedJson(env);
  check(lookSaved.settings && lookSaved.settings.theme === 'ember', 'the look is written into the data file');
  check(JSON.stringify(lookSaved.days) === JSON.stringify(saved.days), 'saving the look changes no day');
  env.d.getElementById('menuknopf').click(); await sleep(20);
  const ver = env.d.querySelector('meta[name="build"]').getAttribute('content'), mb = env.d.querySelector('.menu__build');
  check(/^\d{4}-\d\d-\d\d\.\d+$/.test(ver) && mb && mb.textContent === 'RISE · build ' + ver, 'file menu shows the build version ' + ver);
  env.d.body.dispatchEvent(new env.w.Event('pointerdown', { bubbles: true }));
  check(!!env.d.querySelector('link[rel="manifest"]'), 'hosted: the web manifest is linked');
  check(env.sw.includes('sw.js'), 'hosted: the offline cache (sw.js) is registered');
  const swText = fs.readFileSync(path.join(ROOT, 'docs/sw.js'), 'utf8');
  check(swText.includes("const CACHE = 'rise-" + ver + "'"), 'sw.js cache carries the build version ' + ver);
  check(/k\.startsWith\('rise-'\) && k !== CACHE/.test(swText), 'sw.js clears only its own caches (the origin is shared with CICO and EVEN)');

  /* 20. body weight chart: a dot per weigh-in only while they stay readable; a year of weigh-ins = line + latest dot */
  const viele = { app: 'training-log', v: 4, config: {}, settings: { theme: 'glass' }, days: {} };
  for (let i = 0; i < 60; i++){ const t = new Date(Date.UTC(2026, 0, 3 + i * 4)); viele.days[t.toISOString().slice(0, 10)] = { gym: i % 2 === 0, training: i % 2 ? '' : 'Legs', cardio: false, stretch: false, special: '', journal: '', kg: 80 + i / 10, kgSrc: 'manual' }; }
  let env7 = boot(); await sleep(20);
  await openJson(env7, JSON.stringify(viele), 'viele.json');
  check(env7.d.documentElement.dataset.theme === 'glass' && env7.d.querySelector('#speichern').textContent === 'Saved', 'opening a file applies its look, without an unsaved change');
  check(env7.d.querySelectorAll('#p-overview circle.wpunkt').length === 1, 'YTD with 60 weigh-ins: no row of beads, only the latest dot');
  [...env7.d.querySelectorAll('#ctl .segmented button')].find(b => b.textContent === 'Month').click(); await sleep(400);
  const mo = String(Number(env7.d.querySelector('#ctl select.monat').value) + 1).padStart(2, '0');
  const moKg = Object.keys(viele.days).filter(k => k.startsWith('2026-' + mo)).length;
  check(moKg > 1 && env7.d.querySelectorAll('#p-overview circle.wpunkt').length === moKg, 'a month keeps a dot per weigh-in (' + moKg + ' in month ' + mo + ')');
  const wd = env7.d.querySelectorAll('#p-overview .kpis .kpi')[2].querySelector('.delta');
  check(wd && /^\+/.test(wd.textContent) && wd.classList.contains('delta--flat'), 'a rising weight is shown neutrally, never as better or worse (' + (wd ? wd.textContent : 'none') + ')');

  /* 21. the draft: text typed on Entry before "Log day" survives the iPhone closing the app in the background */
  const DRAFT = 'trainingLog.draft.v1';
  let env8 = boot(); await sleep(20);
  await openJson(env8, FIXTURE, 'fixture.json');
  await tab(env8, 'entry');
  const jt8 = [...env8.d.querySelectorAll('#p-entry textarea')].pop();
  jt8.value = 'Typed but not logged'; jt8.dispatchEvent(new env8.w.Event('input', { bubbles: true }));
  Object.defineProperty(env8.d, 'hidden', { configurable: true, get: () => true });
  env8.d.dispatchEvent(new env8.w.Event('visibilitychange'));
  const dr8 = env8.w.localStorage.getItem(DRAFT);
  check(!!dr8 && /Typed but not logged/.test(dr8), 'going to the background writes the draft at once, with the Entry text not logged yet');
  let env9 = boot({ storage: { [DRAFT]: dr8 || '' } }); await sleep(20);
  const rb9 = [...env9.d.querySelectorAll('#wahl button')].find(b => /Restore unsaved changes/.test(b.textContent));
  check(!!rb9 && /not yet logged/.test(rb9.textContent), 'start screen offers the draft and names the Entry day not logged yet');
  if (rb9){ rb9.click(); await sleep(30); }
  const jt9 = [...env9.d.querySelectorAll('#p-entry textarea')].pop();
  check(env9.d.getElementById('p-entry').classList.contains('on') && !!jt9 && jt9.value === 'Typed but not logged', 'restoring opens Entry with the typed text back on the form');
  check(/not logged yet/.test((env9.d.querySelector('#p-entry .buchen .st') || { textContent: '' }).textContent), 'the restored text still waits for Log day');
  check(env9.d.querySelector('#speichern').textContent === 'Save', 'Save blinks: the restored text is in no file yet');
  env9.d.getElementById('speichern').click(); await sleep(80);
  const s9 = env9.blobs.length ? await lastSavedJson(env9) : { days: {} };
  check(s9.days['2026-10-14'] && /Typed but not logged/.test(s9.days['2026-10-14'].journal), 'Save logs the restored text into the file');
  /* a browser that refuses the copy (storage full) says so instead of failing quietly */
  let env10 = boot(); await sleep(20);
  await openJson(env10, FIXTURE, 'fixture.json');
  await tab(env10, 'entry');
  env10.w.Storage.prototype.setItem = () => { throw new env10.w.DOMException('full', 'QuotaExceededError'); };
  const jt10 = [...env10.d.querySelectorAll('#p-entry textarea')].pop();
  jt10.value = 'Quota test'; jt10.dispatchEvent(new env10.w.Event('input', { bubbles: true })); await sleep(800);
  check(/refused to keep a local copy/.test(toastText(env10)), 'a full browser storage is said out loud, not swallowed');

  /* 22. a computer with file pickers: saved elsewhere (the iPhone) since it was opened → Save asks before replacing it */
  const DISK = '2026-10-14_RISE.json';
  let env11 = boot({ disk: { [DISK]: FIXTURE } }); await sleep(20);
  [...env11.d.querySelectorAll('#wahl button')].find(b => /Open your log/.test(b.textContent)).click(); await sleep(60);
  check(env11.d.getElementById('shell').classList.contains('on') && env11.d.getElementById('dateiname').textContent === DISK, 'computer: the log opens through the file picker');
  const ANDERSWO = '2026-10-14T06:00:00.000Z', diskSaved = () => JSON.parse(env11.w.__disk[DISK]).saved;
  { const o = JSON.parse(env11.w.__disk[DISK]); o.saved = ANDERSWO; env11.w.__disk[DISK] = JSON.stringify(o); }
  const dlg11 = env11.d.getElementById('dlgroot'), knopf11 = t => [...dlg11.querySelectorAll('button')].find(b => b.textContent === t);
  env11.d.getElementById('speichern').click(); await sleep(60);
  check(/Saved elsewhere since you opened it/.test(dlg11.textContent), 'saved elsewhere since it was opened: Save asks first');
  if (knopf11('Cancel')) knopf11('Cancel').click(); await sleep(30);
  check(diskSaved() === ANDERSWO, 'Cancel leaves the other version untouched');
  env11.d.getElementById('speichern').click(); await sleep(60);
  if (knopf11('Replace it')) knopf11('Replace it').click(); await sleep(60);
  check(diskSaved() !== ANDERSWO && Object.keys(JSON.parse(env11.w.__disk[DISK]).days).length === Object.keys(fx.days).length, 'Replace it writes this window’s version, every day in it');
  env11.d.getElementById('speichern').click(); await sleep(60);
  check(!knopf11('Replace it'), 'the next save goes straight in (nothing saved elsewhere since)');
  /* Open another file with unsaved changes: offers to save first, and promises nothing it cannot keep */
  await tab(env11, 'entry');
  const jt11 = [...env11.d.querySelectorAll('#p-entry textarea')].pop();
  jt11.value = 'Before another file'; jt11.dispatchEvent(new env11.w.Event('input', { bubbles: true }));
  env11.d.getElementById('menuknopf').click(); await sleep(20);
  [...env11.d.querySelectorAll('.menu__item')].find(b => /Open another file/.test(b.textContent)).click(); await sleep(20);
  check(!!knopf11('Save, then open') && !!knopf11('Open without saving') && !/restorable/.test(dlg11.textContent), 'open another file with unsaved changes offers Save, then open');
  if (knopf11('Cancel')) knopf11('Cancel').click(); await sleep(20);

  /* 23. the start screen asks before another log replaces unsaved changes on this device */
  let env12 = boot({ storage: { [DRAFT]: dr8 || '' } }); await sleep(20);
  [...env12.d.querySelectorAll('#wahl button')].find(b => /Open your log/.test(b.textContent)).click(); await sleep(20);
  check(/Drop the unsaved changes\?/.test(env12.d.getElementById('dlgroot').textContent), 'start screen: opening a log over unsaved changes asks first');
  [...env12.d.querySelectorAll('#dlgroot button')].find(b => b.textContent === 'Cancel').click(); await sleep(20);
  check(env12.d.getElementById('start').classList.contains('on') && !!env12.w.localStorage.getItem(DRAFT), 'Cancel keeps the unsaved changes');

  /* 24. Re-check PRs only sets the tag (the line stays as typed), counts "3x8" as 8 reps, and leaves lines that are no lift untouched */
  const prData2 = { v: 4, config: {}, days: {
    '2026-09-30': { gym: true, training: 'Push', cardio: false, stretch: false, special: 'Bench 100 kg x5', journal: '', kg: null, kgSrc: null },
    '2026-10-01': { gym: true, training: 'Legs', cardio: false, stretch: false, special: 'Deadlift 200,5kg felt good\nBench 100 kg 3x8\nBought new dumbbells 20 kg', journal: '', kg: 80, kgSrc: 'manual' } } };
  let env13 = boot(); await sleep(20);
  await openJson(env13, JSON.stringify(prData2), 'pr2.json');
  await tab(env13, 'journal');
  const jb13 = t => [...env13.d.querySelectorAll('#p-journal .jbar button')].find(b => b.textContent === t);
  jb13('PRs').click(); await sleep(20);
  jb13('Re-check PRs').click(); await sleep(20);
  [...env13.d.querySelectorAll('#dlgroot button')].find(b => b.textContent === 'Apply').click(); await sleep(20);
  env13.d.getElementById('speichern').click(); await sleep(60);
  const s13 = await lastSavedJson(env13);
  check(s13.days['2026-10-01'].special === 'PR Deadlift 200,5kg felt good\nRep-PR Bench 100 kg 3x8\nBought new dumbbells 20 kg', 're-check keeps each line as typed, 3x8 = 8 reps, no tag on a line that is no lift (got ' + JSON.stringify(s13.days['2026-10-01'].special) + ')');
  check(s13.days['2026-09-30'].special === 'PR Bench 100 kg x5', 'a record with a body weight within 7 days counts');

  /* 25. a typo in the weight keeps the weight logged before and says so */
  await tab(env13, 'entry');
  const kg13 = () => env13.d.querySelector('#p-entry .kgfeld input');
  kg13().value = '81'; kg13().dispatchEvent(new env13.w.Event('input', { bubbles: true })); env13.d.getElementById('logknopf').click(); await sleep(30);
  kg13().value = '8O'; kg13().dispatchEvent(new env13.w.Event('input', { bubbles: true })); env13.d.getElementById('logknopf').click(); await sleep(30);
  check(/left out/.test([...env13.d.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' ')), 'a typo in the weight is said out loud');
  env13.d.getElementById('speichern').click(); await sleep(60);
  check((await lastSavedJson(env13)).days['2026-10-14'].kg === 81, 'and the weight logged before stays');

  /* 26. an app left open over midnight moves on to the new day */
  env13.w.__now = new Date(2026, 9, 15, 8, 0, 0).getTime();
  env13.d.dispatchEvent(new env13.w.Event('visibilitychange')); await sleep(20);
  check(/15 October 2026/.test(env13.d.querySelector('#p-entry .tagkopf .titel').textContent), 'an app left open over midnight moves on to the new day');

  /* 27. Save to folder: today's file into the app folder, the files it replaces into its 02 BACKUP; the same day straight in;
         today's file that is not this window's version asks first; a moved folder is said out loud; nothing is deleted */
  const appO = fakeDir('RISE'), bkpO = fakeDir('02 BACKUP');
  appO.kids.set('02 BACKUP', bkpO);
  const gestern = fakeFile('2026-10-13_RISE.json', JSON.stringify(Object.assign(JSON.parse(FIXTURE), { saved: '2026-10-13T19:00:00.000Z' })));
  appO.kids.set(gestern.name, gestern); appO.kids.set('notes.md', fakeFile('notes.md', '# pointer'));
  const namen = dd => [...dd.kids.keys()].sort().join('|');
  let env14 = boot({ ordner: appO, oeffne: gestern }); await sleep(20);
  const knopf14 = t => [...env14.d.querySelectorAll('#dlgroot button')].find(b => b.textContent === t);
  [...env14.d.querySelectorAll('#wahl button')].find(b => /Open your log/.test(b.textContent)).click(); await sleep(60);
  check(!env14.d.getElementById('ordner').hidden, 'Save to folder button on a computer');
  env14.d.getElementById('ordner').click(); await sleep(20);
  knopf14('Choose…').click(); await sleep(60);
  check(/Backups go to “02 BACKUP”/.test(toastText(env14)), 'Save to folder: choosing the app folder finds its 02 BACKUP by itself');
  knopf14('Save now').click(); await sleep(80);
  check(namen(appO) === '02 BACKUP|2026-10-14_RISE.json|notes.md' && namen(bkpO) === '2026-10-13_RISE.json',
    'today’s file goes into the app folder, the one it replaces into 02 BACKUP, nothing else is touched (' + namen(appO) + ' / ' + namen(bkpO) + ')');
  check(Object.keys(JSON.parse(appO.kids.get('2026-10-14_RISE.json')._t).days).length === Object.keys(fx.days).length, 'every day is in today’s file');
  env14.d.getElementById('speichern').click(); await sleep(80);
  check(!knopf14('Replace it') && namen(appO) === '02 BACKUP|2026-10-14_RISE.json|notes.md', 'saving again the same day goes straight into today’s file');
  { const f = appO.kids.get('2026-10-14_RISE.json'), o = JSON.parse(f._t); o.saved = '2026-10-14T05:00:00.000Z'; f._t = JSON.stringify(o); }
  env14.d.getElementById('speichern').click(); await sleep(60);
  check(/Today’s file is already there/.test(env14.d.getElementById('dlgroot').textContent), 'today’s file that is not this window’s version: Save asks first');
  if (knopf14('Replace it')) knopf14('Replace it').click(); await sleep(80);
  check(namen(bkpO) === '2026-10-13_RISE.json|2026-10-14_RISE.json' && JSON.parse(appO.kids.get('2026-10-14_RISE.json')._t).saved !== '2026-10-14T05:00:00.000Z',
    'Replace it: the old one goes to 02 BACKUP first, nothing is deleted (' + namen(bkpO) + ')');
  appO.gone = true;
  env14.d.getElementById('speichern').click(); await sleep(60);
  check(/cannot be found any more/.test(env14.d.getElementById('toasts').textContent) && /Save to folder/.test(env14.d.getElementById('dlgroot').textContent),
    'a folder that was moved or renamed: the app says so and asks for it again');

  const errs = [...env.errors, ...env2.errors, ...env4.errors, ...env6.errors, ...env7.errors, ...env8.errors, ...env9.errors, ...env10.errors, ...env11.errors, ...env12.errors, ...env13.errors, ...env14.errors];
  check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log((bad ? 'FAILED ' : 'OK ') + ok + ' of ' + (ok + bad) + ' checks passed');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1); });
