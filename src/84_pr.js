/* ================================================================ personal records
   A lift record is a Special line like "Deadlift 210 kg" or, for a set, "Deadlift 190 kg x4".
   Only records with a body weight (that day, else the nearest within 7 days) take part.
   "PR "     heavier than every earlier record of that lift; on the same weight the lower body weight wins.
   "Rep-PR " not heavier, but more reps than every earlier record at that weight or heavier;
             on the same reps the lower body weight wins. A line without reps counts as 1 rep; "80 kg 3x8"
             (sets x reps) counts as 8 reps.
   Only lifts count: the four main lifts and every lift that was tagged PR or Rep-PR at least once (a lift added
   with + PR becomes known with its first PR). Other lines with a weight ("Bought dumbbells 20 kg") are never records. */
const LIFTS = ['Bench', 'Squat', 'Deadlift', 'OHP'];
const PR_TAGE = 7;
const REKORD = /^((?:Rep-)?PR\s+)?([A-Za-zÀ-ſ][A-Za-zÀ-ſ \-]*?)\s+(\d+(?:[.,]\d+)?)\s*kg(?:\s*[x×]\s*(\d+))?\b(.*)$/;
const SAETZE = /^\s*\d+\s*[x×]\s*(\d+)\b/;
let PR_STAND = 0, LIFT_CACHE = null;   /* PR_STAND: raised by touch(), so the known lifts are counted again after a change */
function liftNamen(){
  if (LIFT_CACHE && LIFT_CACHE.data === DATA && LIFT_CACHE.stand === PR_STAND) return LIFT_CACHE.set;
  const set = new Set(LIFTS.map(l => l.toLowerCase()));
  if (DATA) for (const k in DATA.days) zeilenVon(DATA.days[k].special).forEach(z => { const m = REKORD.exec(String(z).trim()); if (m && m[1]) set.add(m[2].trim().toLowerCase()); });
  LIFT_CACHE = { data: DATA, stand: PR_STAND, set };
  return set;
}
/* auch: a lift to accept even if it is not known yet (the lift added right now with + PR) */
function rekordVon(zeile, auch){
  const m = REKORD.exec(String(zeile).trim());
  if (!m) return null;
  const lift = m[2].trim(), lk = lift.toLowerCase();
  if (!(auch && String(auch).toLowerCase() === lk) && !liftNamen().has(lk)) return null;
  const art = m[1] ? (/^Rep/.test(m[1]) ? 'rep' : 'pr') : '', s = !m[4] && SAETZE.exec(m[5]);
  return { art, pr: !!art, lift, kg: parseFloat(m[3].replace(',', '.')), reps: m[4] ? parseInt(m[4], 10) : (s ? parseInt(s[1], 10) : 1), rest: m[5] };
}
/* a line with its PR tag set, removed or changed; the rest of the line stays exactly as it was typed */
function prMarke(zeile, art){ return (art === 'pr' ? 'PR ' : art === 'rep' ? 'Rep-PR ' : '') + String(zeile).trim().replace(/^(?:Rep-)?PR\s+/, ''); }
function rekordText(r, art){
  return (art === 'pr' ? 'PR ' : art === 'rep' ? 'Rep-PR ' : '') + r.lift + ' ' + String(Math.round(r.kg * 100) / 100) + ' kg' + (r.reps > 1 ? ' x' + r.reps : '') + (r.rest || '');
}
/* body weight for a day: its own, else the nearest logged one within PR_TAGE days */
function kgBei(iso, ausser){
  for (let d = 0; d <= PR_TAGE; d++) for (const s of [-1, 1]){
    if (!d && s > 0) continue;
    const q = ISO(add(P(iso), s * d)), r = DATA.days[q];
    if (q !== ausser && r && r.kg != null && r.kg !== '' && isFinite(r.kg)) return { kg: Number(r.kg), iso: q };
  }
  return null;
}
function liftsBekannt(){
  const o = {}; LIFTS.forEach(l => { o[l.toLowerCase()] = l; });
  for (const k in DATA.days) zeilenVon(DATA.days[k].special).forEach(z => { const r = rekordVon(z); if (r && !o[r.lift.toLowerCase()]) o[r.lift.toLowerCase()] = r.lift; });
  return Object.keys(o).map(k => o[k]);
}
/* the rule: r = { kg, reps, bw } against the earlier records of the same lift */
function prArt(r, frueher){
  let top = null;
  frueher.forEach(f => { if (!top || f.kg > top.kg || (f.kg === top.kg && f.bw < top.bw)) top = f; });
  if (!top || r.kg > top.kg || (r.kg === top.kg && r.bw < top.bw)) return { art: 'pr', ref: top };
  let rep = null;
  frueher.filter(f => f.kg >= r.kg).forEach(f => { if (!rep || f.reps > rep.reps || (f.reps === rep.reps && f.bw < rep.bw)) rep = f; });
  if (r.reps > 1 && (r.reps > rep.reps || (r.reps === rep.reps && r.bw < rep.bw))) return { art: 'rep', ref: rep };
  return { art: '', ref: top, rep };
}
/* every record of a lift before a day that has a body weight */
function rekordeVor(lift, iso){
  const out = [];
  Object.keys(DATA.days).filter(k => k < iso).sort().forEach(k => {
    zeilenVon(DATA.days[k].special).forEach(z => {
      const r = rekordVon(z, lift); if (!r || r.lift.toLowerCase() !== lift.toLowerCase()) return;
      const b = kgBei(k); if (b) out.push({ kg: r.kg, reps: r.reps, bw: b.kg });
    });
  });
  return out;
}
/* judges a new record on a day, against the earlier days and the lines already in today's Special; bw is the weight on the form, if any */
function prUrteil(iso, lift, kg, reps, bw, heute){
  const b = bw ? { kg: bw, iso } : kgBei(iso, iso);
  if (!b) return { art: '', warum: 'no body weight within ' + PR_TAGE + ' days, so it is kept as a Special' };
  const frueher = rekordeVor(lift, iso);
  zeilenVon(heute).forEach(z => { const r = rekordVon(z, lift); if (r && r.lift.toLowerCase() === lift.toLowerCase()) frueher.push({ kg: r.kg, reps: r.reps, bw: b.kg }); });
  const u = prArt({ kg, reps, bw: b.kg }, frueher), satz = f => f.kg + ' kg' + (f.reps > 1 ? ' x' + f.reps : '') + ' at ' + n1(f.bw) + ' kg';
  if (u.art === 'pr') return { art: 'pr', warum: 'PR!' + (u.ref ? ' Best was ' + satz(u.ref) : ' First record of this lift') };
  if (u.art === 'rep') return { art: 'rep', warum: 'Rep-PR! Best at this weight or heavier was ' + satz(u.ref) };
  return { art: '', warum: 'no PR: best is ' + satz(u.ref) + (u.rep && u.rep !== u.ref ? ', most reps at this weight or heavier ' + satz(u.rep) : '') };
}
/* goes through every record in date order and works out where "PR " / "Rep-PR " belongs by the rule above.
   Nothing is changed here: the result lists every line that would change, prAnwenden() writes it. */
function prPruefen(){
  const aenderungen = [], hist = {};
  Object.keys(DATA.days).sort().forEach(k => {
    const r0 = DATA.days[k]; if (!r0.special) return;
    const b = kgBei(k), alt = zeilenVon(r0.special), zeilen = [];
    const neu = alt.map(z => {
      const r = rekordVon(z); if (!r) return z;
      const key = r.lift.toLowerCase(), h = hist[key] = hist[key] || [];
      let art = '';
      if (b){ const x = { kg: r.kg, reps: r.reps, bw: b.kg }; art = prArt(x, h).art; h.push(x); }
      const nz = prMarke(z, art);
      if (nz !== String(z).trim()) zeilen.push({ vorher: String(z).trim(), nachher: nz });
      return nz;
    });
    if (zeilen.length) aenderungen.push({ iso: k, special: neu.join('\n'), zeilen });
  });
  return aenderungen;
}
function prAnwenden(aenderungen){ aenderungen.forEach(a => { DATA.days[a.iso].special = a.special; }); return aenderungen.length; }
function istPrTag(r){ return zeilenVon(r.special).some(z => { const x = rekordVon(z); return x && x.pr; }); }
