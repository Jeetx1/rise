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

function boot(){
  const errors = [], blobs = [], names = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) errors.push(e.message); });
  const dom = new JSDOM(HTML, {
    url: 'https://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w){
      const D = w.Date;
      class FakeDate extends D { constructor(...a){ if (a.length) super(...a); else super(FIXED); } static now(){ return FIXED; } }
      w.Date = FakeDate;
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
    }
  });
  return { dom, w: dom.window, d: dom.window.document, errors, blobs, names };
}
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

  const errs = [...env.errors, ...env2.errors, ...env4.errors, ...env6.errors, ...env7.errors];
  check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log((bad ? 'FAILED ' : 'OK ') + ok + ' of ' + (ok + bad) + ' checks passed');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1); });
