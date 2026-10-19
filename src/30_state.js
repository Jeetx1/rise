/* ================================================================ state */
const S = { tab: 'overview', year: '', month: 0, mode: 'ytd', dirty: false, tag: null, focus: 'part', q: '', pr: false, sp: false, offen: null, firstPaint: {} };
function yearsWithData(){ const s = {}; for (const k in DATA.days) s[k.slice(0, 4)] = 1; s[TODAY.slice(0, 4)] = 1; return Object.keys(s).sort(); }
function lastDataDay(year){ let best = null; for (const k in DATA.days) if (k.slice(0, 4) === year && (!best || k > best)) best = k; return best; }
function initState(){
  const ys = yearsWithData(), nowY = TODAY.slice(0, 4);
  S.year = lastDataDay(nowY) ? nowY : (ys.filter(y => lastDataDay(y)).pop() || nowY);
  const ld = lastDataDay(S.year);
  S.month = ld ? parseInt(ld.slice(5, 7), 10) - 1 : new Date().getMonth();
  S.tag = TODAY;
  S.q = ''; S.dirty = false;
}

/* scope = what the period controls point at */
function scope(){
  const y = parseInt(S.year, 10);
  const from = S.mode === 'ytd' ? new Date(Date.UTC(y, 0, 1)) : new Date(Date.UTC(y, S.month, 1));
  const to = new Date(Date.UTC(y, S.month + 1, 0));
  return { from, to };
}
function scopeOf(year, m0, m1){ return { from: new Date(Date.UTC(+year, m0, 1)), to: new Date(Date.UTC(+year, m1 + 1, 0)) }; }
function daysIn(sc){
  const a = ISO(sc.from), b = ISO(sc.to), out = [];
  for (const k in DATA.days) if (k >= a && k <= b) out.push([k, DATA.days[k]]);
  return out.sort((x, y) => x[0] < y[0] ? -1 : 1);
}
function inScope(iso){ const s = scope(); return iso >= ISO(s.from) && iso <= ISO(s.to); }
function scopeLabel(long){
  const y = S.year;
  if (S.mode === 'ytd') return S.month === 0 ? (long ? MONTHS[0] : MSHORT[0]) + ' ' + y : (long ? 'January' : 'Jan') + ' \u2013 ' + (long ? MONTHS[S.month] : MSHORT[S.month]) + ' ' + y;
  return (long ? MONTHS[S.month] : MSHORT[S.month]) + ' ' + y;
}
/* the aggregate everything on the overview and in the PDF reads from */
function agg(sc){
  const d = daysIn(sc), a = { gym: 0, cardio: 0, stretch: 0, special: 0, journal: 0, logged: d.length, weights: [], split: {}, part: {}, unmapped: {},
    week: {}, dow: [0,0,0,0,0,0,0], month: {}, sessions: [], notes: [], days: d, sc: sc };
  d.forEach(([iso, v]) => {
    if (v.gym){
      a.gym++;
      const wk = ISO(monday(P(iso))); a.week[wk] = (a.week[wk] || 0) + 1;
      a.dow[dow(P(iso))]++;
      a.month[iso.slice(0, 7)] = (a.month[iso.slice(0, 7)] || 0) + 1;
      const lab = (v.training || '').trim();
      a.sessions.push({ iso, label: lab, kg: v.kg });
      if (lab){
        a.split[lab] = (a.split[lab] || 0) + 1;
        const ps = partsOf(lab);
        if (ps && ps.length) ps.forEach(x => { a.part[x] = (a.part[x] || 0) + 1; });
        else a.unmapped[lab] = (a.unmapped[lab] || 0) + 1;
      }
    }
    if (v.special){ a.special++; a.notes.push({ iso, txt: v.special }); }
    if (v.cardio) a.cardio++;
    if (v.stretch) a.stretch++;
    if (v.journal) a.journal++;
    if (v.kg !== null && v.kg !== undefined && v.kg !== '') a.weights.push({ iso, kg: Number(v.kg), src: v.kgSrc });
  });
  const last = d.length ? d[d.length - 1][0] : null;
  const fromIso = ISO(sc.from), toIso = ISO(sc.to);
  const end = last ? P(last) : (toIso > TODAY && fromIso <= TODAY ? P(TODAY) : sc.to);
  a.lastDay = last;
  a.spanDays = Math.max(1, Math.round((end - sc.from) / DAY) + 1);
  const cols = [];
  for (let w = monday(sc.from); w <= monday(end); w = add(w, 7)) cols.push({ iso: ISO(w), d: w, v: a.week[ISO(w)] || 0 });
  a.weeks = cols;
  a.hit = cols.filter(c => c.v >= C.weeklyTarget).length;
  a.perWeek = a.gym / a.spanDays * 7;
  return a;
}
function ranked(obj){ return Object.keys(obj).map(k => ({ k, v: obj[k] })).sort((x, y) => y.v - x.v || (x.k < y.k ? -1 : 1)); }

