// RISE in Chromium: synthetic log via the browser draft, every look, phone + desktop, all pages, a booking, menu, look, dialog.
// node tests/test_ui.js docs/index.html [screenshot folder] [looks]   (needs Playwright with Chromium)
const { chromium } = (() => { try { return require('playwright'); } catch (e){ return require('/opt/npm-tools/node_modules/playwright'); } })();
const fs = require('fs');
const FILE = 'file://' + require('path').resolve(process.argv[2]);
const OUT = process.argv[3] || require('path').join(__dirname, 'shots', 'ui');
const THEMES = (process.argv[4] || 'prism,glass,ember').split(',');
fs.mkdirSync(OUT, { recursive: true });
function sample(){
  const days = {}, splits = ['Push', 'Pull', 'Legs', 'Upper Body', 'Full Body'];
  const t = new Date(); const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  let kg = 84.6;
  for (let k = 290; k >= 0; k--){
    const d = new Date(t.getTime() - k * 86400000); if (d.getFullYear() !== t.getFullYear()) continue;
    const gym = [0, 2, 4, 5].indexOf(d.getDay()) >= 0 && k % 11 !== 3;
    kg += (Math.sin(k / 9) * .08) - .012;
    const r = { gym, training: gym ? splits[k % 5] : '', cardio: k % 4 === 1, stretch: k % 6 === 2, special: '', journal: '', kg: k % 3 === 0 ? Math.round(kg * 100) / 100 : null };
    if (k % 2 === 0) r.journal = ['Felt strong today // slept 8h', 'Busy day at work, short session', 'Long walk by the river', 'Meal prep sunday'][k % 4];
    if (k === 40) r.special = 'PR Deadlift 180 kg';
    if (k === 12) r.special = 'Bench 100 kg x3';
    if (k === 5) r.special = 'First pull-up with 20 kg';
    days[iso(d)] = r;
  }
  return { app: 'training-log', v: 4, days, config: { weeklyTarget: 4, name: 'Test Person' } };
}
(async () => {
  const b = await chromium.launch(); const errors = [];
  async function page(vp, theme, touch){
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: !!touch, isMobile: !!touch });
    await ctx.addInitScript(([data, theme]) => { try { localStorage.setItem('trainingLog.draft.v1', JSON.stringify({ at: new Date().toISOString(), name: '2026-10-19_RISE.json', data })); if (theme) localStorage.setItem('dl.theme.training-log', theme); } catch (e){} }, [sample(), theme]);
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(theme + ' ' + vp.width + ': ' + m.text()); });   // web fonts are optional
    p.on('pageerror', e => errors.push(theme + ' ' + vp.width + ' PAGEERROR: ' + e.message));
    await p.route('**/fonts.googleapis.com/**', r => r.abort());
    await p.goto(FILE); await p.waitForTimeout(300);
    return { p, ctx };
  }
  for (const theme of THEMES){
    for (const [vp, touch, tag] of [[{ width: 390, height: 844 }, true, 'phone'], [{ width: 1360, height: 900 }, false, 'desk']]){
      const { p, ctx } = await page(vp, theme, touch);
      if (tag === 'phone') await p.screenshot({ path: OUT + '/' + theme + '-' + tag + '-start.png' });
      await p.click('#wahl button.draft'); await p.waitForTimeout(1600);
      await p.screenshot({ path: OUT + '/' + theme + '-' + tag + '-overview.png', fullPage: tag === 'desk' });
      for (const tab of ['entry', 'journal', 'mapping']){
        await p.click('.tab[data-tab="' + tab + '"]'); await p.waitForTimeout(900);
        if (tab === 'journal'){ await p.click('details.jm:last-of-type > summary'); await p.waitForTimeout(500); }
        await p.screenshot({ path: OUT + '/' + theme + '-' + tag + '-' + tab + '.png' });
      }
      if (tag === 'desk'){
        await p.click('.tab[data-tab="entry"]'); await p.waitForTimeout(600);
        await p.click('.pille'); await p.click('#logknopf'); await p.waitForTimeout(500);
        await p.screenshot({ path: OUT + '/' + theme + '-desk-logged.png' });
        await p.waitForTimeout(2600);
        await p.click('#menuknopf'); await p.waitForTimeout(300);
        await p.screenshot({ path: OUT + '/' + theme + '-desk-menu.png' });
        await p.keyboard.press('Escape');
        await p.click('#look'); await p.waitForTimeout(300);
        await p.screenshot({ path: OUT + '/' + theme + '-desk-look.png' });
        await p.keyboard.press('Escape');
        await p.click('.tab[data-tab="mapping"]'); await p.waitForTimeout(500);
        await p.click('.tag .x'); await p.waitForTimeout(500);
        await p.screenshot({ path: OUT + '/' + theme + '-desk-dialog.png' });
      }
      await ctx.close();
    }
  }
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
