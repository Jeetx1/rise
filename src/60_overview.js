/* ================================================================ overview */
function seiteOverview(el, anim){
  const a = agg(scope());
  const w = a.weights, wl = w.length ? w[w.length - 1] : null, dw = w.length > 1 ? wl.kg - w[0].kg : null;
  let best = 0, lauf = 0; a.weeks.forEach(c => { lauf = c.v >= C.weeklyTarget ? lauf + 1 : 0; best = Math.max(best, lauf); });

  const gross = h('span', {}, [String(a.gym)]);
  const held = h('div', { class: 'blatt' }, [
    h('div', { class: 'held' }, [
      h('div', {}, [h('div', { class: 'periode' }, [scopeLabel(true)]),
        h('div', { class: 'gross' }, [gross, h('small', {}, [a.gym === 1 ? 'gym day' : 'gym days'])]), h('div', { class: 'streifen' })]),
      ringBox(a, anim)
    ])
  ]);
  const zahlen = h('div', { class: 'zahlen' });
  const zahl = (l, v, f) => zahlen.appendChild(h('div', {}, [h('div', { class: 'l' }, [l]), h('div', { class: 'v', html: v }), h('div', { class: 'f' }, [f])]));
  zahl('Per week', n1(a.perWeek), 'target ' + C.weeklyTarget);
  zahl('Gym rate', n1(a.gym / a.spanDays * 100) + '<small>%</small>', 'of ' + a.spanDays + ' days logged');
  zahl('Best run', best + '<small>' + (best === 1 ? 'week' : 'weeks') + '</small>', 'on target, now ' + lauf);
  zahl('Weight', wl ? n2(wl.kg) + '<small>kg</small>' : '\u2014', wl ? deDate(P(wl.iso)) : 'no weigh-in yet');
  zahl('Change', dw === null ? '\u2014' : sgn(dw) + n2(Math.abs(dw)) + '<small>kg</small>', dw === null ? 'needs two weigh-ins' : sgn(dw) + n1(Math.abs(dw / w[0].kg * 100)) + '% since ' + deShort(P(w[0].iso)));
  held.appendChild(zahlen);
  el.appendChild(held);
  if (anim) hochzaehlen(gross, a.gym, 0);

  el.appendChild(h('div', { class: 'blatt' }, [rasterBox(a, anim)]));
  el.appendChild(monatsKalender(anim));

  el.appendChild(h('div', { class: 'blatt' }, [h('div', { class: 'bk' }, [h('h2', {}, ['Body weight']), h('small', {}, [w.length ? plural(w.length, 'weigh-in') : scopeLabel()])]), gewichtChart(a, anim)]));

  const fk = h('div', { class: 'blatt' });
  fk.appendChild(h('div', { class: 'bk' }, [h('h2', {}, [S.focus === 'part' ? 'Body parts' : 'Workouts']), h('div', { class: 'mini-seg' }, [
    h('button', { type: 'button', class: S.focus === 'part' ? 'on' : '', onclick: () => { S.focus = 'part'; S.firstPaint.overview = false; render(); } }, ['Body parts']),
    h('button', { type: 'button', class: S.focus === 'split' ? 'on' : '', onclick: () => { S.focus = 'split'; S.firstPaint.overview = false; render(); } }, ['Workouts'])])]));
  fk.appendChild(balkenListe(ranked(S.focus === 'part' ? a.part : a.split), S.focus === 'part', anim));
  const un = Object.keys(a.unmapped);
  if (S.focus === 'part' && un.length) fk.appendChild(h('div', { class: 'warn' }, [h('span', {}, ['No body parts yet: ' + un.join(', ')]),
    h('button', { class: 'btn mini leicht', type: 'button', onclick: () => zeigeTab('mapping') }, ['Map them'])]));
  const wk = h('div', { class: 'blatt' }, [h('div', { class: 'bk' }, [h('h2', {}, ['Sessions per week']), h('small', {}, ['line = target of ' + C.weeklyTarget])]), wochenChart(a, anim)]);
  el.appendChild(h('div', { class: 'zwei' }, [wk, fk]));
  el.appendChild(prKachel(a));
}

/* PRs: the ones in the period, and the current best per lift over all years; a click opens the day */
function prKachel(a){
  const imZeitraum = [], best = {};
  Object.keys(DATA.days).sort().forEach(k => zeilenVon(DATA.days[k].special).forEach(z => {
    const r = rekordVon(z); if (!r || !r.pr) return;
    if (k >= ISO(a.sc.from) && k <= ISO(a.sc.to)) imZeitraum.push({ iso: k, z, r });
    if (r.art === 'pr') best[r.lift.toLowerCase()] = { iso: k, z, r };
  }));
  const karte = h('div', { class: 'blatt' }, [h('div', { class: 'bk' }, [h('h2', {}, ['PRs']), h('small', {}, [imZeitraum.length ? plural(imZeitraum.length, 'PR') + ' in ' + scopeLabel() : 'none in ' + scopeLabel()])])]);
  const zeile = e => {
    const b = kgBei(e.iso);
    return h('button', { type: 'button', class: 'przeile', onclick: () => goTo('entry', e.iso) }, [
      h('span', { class: 'chip pr' + (e.r.art === 'rep' ? ' rep' : '') }, [e.r.art === 'rep' ? 'Rep-PR' : 'PR']),
      h('b', {}, [rekordText(e.r, '')]), h('span', { class: 'mut' }, [deDate(P(e.iso)) + (b ? ' \u00b7 ' + n1(b.kg) + ' kg body weight' : '')])]);
  };
  if (imZeitraum.length){ const l = h('div', { class: 'prliste' }); imZeitraum.slice().reverse().forEach(e => l.appendChild(zeile(e))); karte.appendChild(l); }
  const bests = Object.keys(best).map(k => best[k]).sort((x, y) => x.r.lift < y.r.lift ? -1 : 1);
  if (bests.length){
    karte.appendChild(h('h3', { class: 'prtitel' }, ['Current best, all years']));
    const l = h('div', { class: 'prliste' }); bests.forEach(e => l.appendChild(zeile(e))); karte.appendChild(l);
  }
  if (!imZeitraum.length && !bests.length) karte.appendChild(h('div', { class: 'leer' }, ['No PRs yet. Add one with + PR under Data entry.']));
  return karte;
}

/* the weeks of the period as segments of one plate: green on target, blue below, grey for none */
function ringBox(a, anim){
  const n = a.weeks.length, R = 26, U = 2 * Math.PI * R, gap = n > 1 ? Math.min(3, U / n * .18) : 0;
  const s = svg('svg', { width: 72, height: 72, viewBox: '0 0 68 68', class: 'ring' + (anim ? ' ein' : ''), 'aria-hidden': 'true' });
  s.appendChild(svg('circle', { cx: 34, cy: 34, r: 32, fill: '#1A2129' }));
  if (!n) s.appendChild(svg('circle', { cx: 34, cy: 34, r: R, fill: 'none', stroke: '#2A3540', 'stroke-width': 9 }));
  a.weeks.forEach((c, i) => {
    const len = U / n - gap, col = c.v >= C.weeklyTarget ? '#9CC4F0' : (c.v ? '#3E6B9E' : '#2A3540');
    const seg = svg('circle', { class: 'seg', cx: 34, cy: 34, r: R, fill: 'none', stroke: col, 'stroke-width': 9, 'stroke-dasharray': len + ' ' + (U - len), 'stroke-dashoffset': -(i * U / n) + U / 4 });
    if (anim) seg.style.animationDelay = (i * 22) + 'ms';
    s.appendChild(seg);
  });
  s.appendChild(svg('circle', { cx: 34, cy: 34, r: 15, fill: '#11161B' }));
  s.appendChild(svg('circle', { cx: 34, cy: 34, r: 6, fill: 'none', stroke: '#C9D6E2', 'stroke-width': 2.4 }));
  return h('div', { class: 'ringbox', title: 'Each segment is a week. Light blue: ' + C.weeklyTarget + ' or more sessions.' }, [
    h('div', { class: 'rt' }, [h('b', {}, [a.hit + ' / ' + a.weeks.length]), 'weeks on target']), s]);
}

/* the year in squares; a click opens that day under Data entry */
function rasterBox(a, anim){
  const y = parseInt(S.year, 10), start = monday(new Date(Date.UTC(y, 0, 1))), end = new Date(Date.UTC(y, 11, 31));
  const box = h('div', {});
  const used = {}; a.days.forEach(([, r]) => { if (r.gym && r.training) used[canon(r.training) || r.training] = 1; });
  box.appendChild(h('div', { class: 'bk' }, [h('h2', {}, [S.year]), h('small', {}, [TOUCH ? 'tap a day to edit it' : 'click a day to edit it'])]));
  const scroll = h('div', { class: 'rscroll' });
  let wochen = 0; for (let d = start; d <= end; d = add(d, 7)) wochen++;
  const grid = h('div', { class: 'jahr' + (anim ? ' ein' : ''), style: { gridTemplateColumns: '22px repeat(' + wochen + ', minmax(11px, 1fr))' } });
  grid.appendChild(h('span', { class: 'ml' }));
  DAYNAMES.forEach((d, i) => grid.appendChild(h('span', { class: 'tl' }, [i % 2 === 0 ? d : ''])));
  const seen = {}; let col = 0, heuteCol = -1, scopeCol = -1;
  for (let d = start; d <= end; d = add(d, 7), col++){
    const so = add(d, 6); let lbl = '';
    if (so.getUTCFullYear() === y && !seen[so.getUTCMonth()]){ seen[so.getUTCMonth()] = 1; lbl = MSHORT[so.getUTCMonth()]; }
    grid.appendChild(h('span', { class: 'ml' }, [lbl]));
    for (let i = 0; i < 7; i++){
      const day = add(d, i), iso = ISO(day), rec = DATA.days[iso], drin = day.getUTCFullYear() === y;
      let cls = 'rz', farbe = null;
      if (!drin) cls += ' aus';
      else if (rec && rec.gym){ cls += ' gym'; farbe = colorOf(rec.training || 'Full Body'); }
      else if (rec && (rec.journal || rec.special || rec.kg || rec.cardio || rec.stretch)) cls += ' frei';
      if (rec && rec.kg) cls += ' kgpunkt';
      if (iso === TODAY){ cls += ' heute'; heuteCol = col; }
      if (drin && !inScope(iso)) cls += ' blass';
      if (iso === ISO(a.sc.to)) scopeCol = col;
      const z = h('div', { class: cls, 'data-iso': drin && iso <= TODAY ? iso : null });
      z.style.setProperty('--c', col);
      if (farbe) z.style.background = farbe;
      grid.appendChild(z);
    }
  }
  scroll.appendChild(grid); box.appendChild(scroll);
  grid.addEventListener('mousemove', e => {
    const z = e.target.closest && e.target.closest('.rz[data-iso]');
    if (!z){ tipWeg(); return; }
    const iso = z.getAttribute('data-iso'), r = DATA.days[iso] || {}, d = P(iso), lines = ['<b>' + DAYNAMES[dow(d)] + ' ' + deDate(d) + '</b>'];
    if (r.gym) lines.push(esc(r.training || 'Gym'));
    if (r.kg) lines.push('<span class="t2">' + n2(r.kg) + ' kg</span>');
    if (r.journal){ const f = r.journal.split(/\/\/|\n/)[0].trim(); lines.push('<span class="t2">' + esc(f.slice(0, 46)) + (f.length > 46 ? '\u2026' : '') + '</span>'); }
    if (lines.length === 1) lines.push('<span class="t2">nothing logged</span>');
    const b = z.getBoundingClientRect();
    tipZeigen(lines.join('<br>'), b.left + b.width / 2, b.top);
  });
  grid.addEventListener('mouseleave', tipWeg);
  grid.addEventListener('click', e => { const z = e.target.closest && e.target.closest('.rz[data-iso]'); if (z){ tipWeg(); goTo('entry', z.getAttribute('data-iso')); } });
  requestAnimationFrame(() => {
    const target = scopeCol >= 0 ? scopeCol : heuteCol;
    if (target > 0 && scroll.scrollWidth > scroll.clientWidth){ const cw = (scroll.scrollWidth - 22) / wochen; scroll.scrollLeft = Math.max(0, 22 + (target + 1) * cw - scroll.clientWidth + 24); }
  });
  return box;
}

function balkenListe(rows, einfarbig, anim){
  if (!rows.length) return h('div', { class: 'leer' }, ['No sessions in this period.']);
  const max = rows[0].v, box = h('div', { class: 'balken' + (anim ? ' ein' : '') });
  rows.forEach((r, i) => {
    const f = h('div', { class: 'fuell', style: { width: Math.max(3, r.v / max * 100) + '%', background: einfarbig ? null : colorOf(r.k) } });
    f.style.setProperty('--i', i);
    box.appendChild(h('div', { class: 'bz' }, [h('div', { class: 'n', title: r.k }, [einfarbig ? null : h('i', { class: 'sw', style: { background: colorOf(r.k) } }), r.k]),
      h('div', { class: 'spur' }, [f]), h('div', { class: 'c' }, [String(r.v)])]));
  });
  return box;
}
function gewichtChart(a, anim){
  const pts = a.weights, sc = a.sc, wrap = h('div', { class: 'chart' + (anim ? ' ein' : '') });
  if (!pts.length){ wrap.appendChild(h('div', { class: 'leer' }, ['No weigh-ins in this period yet.'])); return wrap; }
  const schmal = window.innerWidth < 700, W = schmal ? 420 : 900, H = schmal ? 230 : 230, L = 40, R = 12, T = 14, B = 28;
  const x0 = sc.from.getTime(), lastPt = P(pts[pts.length - 1].iso).getTime();
  const x1 = Math.min(sc.to.getTime(), Math.max(lastPt + 3 * DAY, x0 + 20 * DAY));
  let lo = Math.min.apply(null, pts.map(p => p.kg)), hi = Math.max.apply(null, pts.map(p => p.kg));
  const pad = Math.max(.6, (hi - lo) * .35); lo -= pad; hi += pad;
  const X = t => L + (t - x0) / Math.max(1, x1 - x0) * (W - L - R), Y = v => T + (hi - v) / Math.max(.001, hi - lo) * (H - T - B);
  const g = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Body weight over time' });
  g.appendChild(svg('defs', {}, [svg('linearGradient', { id: 'gewVerlauf', x1: 0, x2: 0, y1: 0, y2: 1 }, [
    svg('stop', { offset: '0%', 'stop-color': '#2B62C4', 'stop-opacity': '.16' }), svg('stop', { offset: '100%', 'stop-color': '#2B62C4', 'stop-opacity': '0' })])]));
  for (let i = 0; i <= 3; i++){
    const v = lo + (hi - lo) * i / 3, yy = Y(v);
    g.appendChild(svg('line', { x1: L, x2: W - R, y1: yy, y2: yy, stroke: '#E6EAE7', 'stroke-width': 1 }));
    const t = svg('text', { x: L - 8, y: yy + 4, 'text-anchor': 'end', class: 'ax' }); t.textContent = n1(v); g.appendChild(t);
  }
  const d0 = new Date(x0);
  if (S.mode === 'period'){
    for (let d = new Date(x0); d.getTime() <= x1; d = add(d, 1)) if (dow(d) === 0 && d.getTime() > x0 + DAY * (schmal ? 3 : 1)){
      const t = svg('text', { x: X(d.getTime()), y: H - B + 18, class: 'ax', 'text-anchor': 'middle' }); t.textContent = deShort(d); g.appendChild(t);
    }
  } else {
    for (let m = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1)); m.getTime() <= x1; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))){
      if (m.getTime() < x0) continue;
      const t = svg('text', { x: X(m.getTime()), y: H - B + 18, class: 'ax' }); t.textContent = MSHORT[m.getUTCMonth()]; g.appendChild(t);
    }
  }
  const xy = pts.map(p => [X(P(p.iso).getTime()), Y(p.kg)]);
  let dPath = 'M' + xy[0][0] + ',' + xy[0][1];
  for (let i = 1; i < xy.length; i++){ const [ax, ay] = xy[i - 1], [bx, by] = xy[i], mx = (ax + bx) / 2; dPath += ' C' + mx + ',' + ay + ' ' + mx + ',' + by + ' ' + bx + ',' + by; }
  if (xy.length > 1){
    g.appendChild(svg('path', { class: 'flaeche', d: dPath + ' L' + xy[xy.length - 1][0] + ',' + (H - B) + ' L' + xy[0][0] + ',' + (H - B) + ' Z' }));
    g.appendChild(svg('path', { class: 'linie', d: dPath, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 0 }));
  }
  xy.forEach(([x, y], i) => { const c = svg('circle', { cx: x, cy: y, r: 3.5, fill: '#F7F8F7', stroke: '#2B62C4', 'stroke-width': 2 });
    if (anim){ c.style.opacity = 0; c.style.transition = 'opacity .3s'; setTimeout(() => { c.style.opacity = 1; }, 250 + i / Math.max(1, xy.length) * 800); }
    g.appendChild(c); });
  const cross = svg('line', { x1: 0, x2: 0, y1: T, y2: H - B, stroke: '#14191E', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0 });
  const dot = svg('circle', { r: 6, fill: '#2B62C4', stroke: '#F7F8F7', 'stroke-width': 2.4, opacity: 0 });
  g.appendChild(cross); g.appendChild(dot);
  g.appendChild(svg('rect', { x: L, y: 0, width: W - L - R, height: H, fill: 'transparent' }));
  wrap.appendChild(g);
  function move(e){
    const r = g.getBoundingClientRect(), cx = (e.clientX - r.left) / r.width * W;
    let best = 0, bd = 1e9; xy.forEach((p, i) => { const d = Math.abs(p[0] - cx); if (d < bd){ bd = d; best = i; } });
    const p = pts[best], [px, py] = xy[best], delta = best > 0 ? p.kg - pts[best - 1].kg : null;
    cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('opacity', '.25');
    dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('opacity', '1');
    tipZeigen('<b>' + n2(p.kg) + ' kg</b><br><span class="t2">' + DAYNAMES[dow(P(p.iso))] + ' ' + deDate(P(p.iso)) + (delta !== null ? ', ' + sgn(delta) + n2(Math.abs(delta)) : '') + '</span>',
      r.left + px / W * r.width, r.top + py / H * r.height);
  }
  g.addEventListener('mousemove', move);
  g.addEventListener('touchstart', e => { if (e.touches[0]) move(e.touches[0]); }, { passive: true });
  g.addEventListener('touchmove', e => { if (e.touches[0]) move(e.touches[0]); }, { passive: true });
  const weg = () => { tipWeg(); cross.setAttribute('opacity', '0'); dot.setAttribute('opacity', '0'); };
  g.addEventListener('mouseleave', weg); g.addEventListener('touchend', () => setTimeout(weg, 1400));
  return wrap;
}
function wochenChart(a, anim){
  const cols = a.weeks, wrap = h('div', { class: 'chart' + (anim ? ' ein' : '') });
  if (!cols.length){ wrap.appendChild(h('div', { class: 'leer' }, ['No weeks in this period.'])); return wrap; }
  const W = 460, H = 220, B = 24, T = 10, L = 2;
  const max = Math.max(C.weeklyTarget, Math.max.apply(null, cols.map(c => c.v))) + 1, bw = (W - L * 2) / cols.length;
  const Yh = v => v / max * (H - T - B), goalY = H - B - Yh(C.weeklyTarget);
  const g = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Sessions per week' });
  cols.forEach((c, i) => {
    const x = L + i * bw, hgt = Yh(c.v);
    const bar = svg('rect', { class: 'saeule', x: x + bw * .18, y: H - B - Math.max(2, hgt), width: Math.max(2, bw * .64), height: Math.max(2, hgt), rx: Math.min(4, bw * .22),
      fill: c.v >= C.weeklyTarget ? '#2F5E91' : (c.v ? '#9CC4F0' : '#E1E5E2') });
    bar.style.setProperty('--i', i);
    bar.addEventListener('mousemove', e => tipZeigen('<b>Week ' + isoWeek(c.d) + '</b><br><span class="t2">' + deShort(c.d) + ' \u2013 ' + deShort(add(c.d, 6)) + ', ' + plural(c.v, 'session') + '</span>', e.clientX, e.clientY - 4));
    bar.addEventListener('mouseleave', tipWeg);
    g.appendChild(bar);
    if (cols.length <= 10 || i % Math.ceil(cols.length / 10) === 0){
      const t = svg('text', { x: x + bw / 2, y: H - B + 16, 'text-anchor': 'middle', class: 'ax' }); t.textContent = isoWeek(c.d); g.appendChild(t);
    }
  });
  g.appendChild(svg('line', { x1: L, x2: W - L, y1: goalY, y2: goalY, stroke: '#14191E', 'stroke-opacity': '.35', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }));
  wrap.appendChild(g);
  return wrap;
}

/* the month in full: workout, weight, extras, Special and journal per day; a click opens the day */
const DAYLONG = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
/* the month calendar can be folded away; remembered in this browser only */
function kalenderZu(neu){
  if (neu !== undefined){ S.kalZu = neu; try { localStorage.setItem('trainingslog.kalZu', neu ? '1' : ''); } catch (e){} }
  if (S.kalZu === undefined){ try { S.kalZu = localStorage.getItem('trainingslog.kalZu') === '1'; } catch (e){ S.kalZu = false; } }
  return S.kalZu;
}
function monatsKalender(anim){
  const y = +S.year, m = S.month, first = new Date(Date.UTC(y, m, 1)), n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), off = dow(first);
  const key = S.year + '-' + String(m + 1).padStart(2, '0');
  let gym = 0, log = 0; for (let d = 1; d <= n; d++){ const r = DATA.days[key + '-' + String(d).padStart(2, '0')]; if (r){ log++; if (r.gym) gym++; } }
  const zu = kalenderZu();
  const karte = h('div', { class: 'blatt' + (zu ? ' kalzu' : '') }, [h('div', { class: 'bk' }, [h('h2', {}, [MONTHS[m] + ' ' + S.year]),
    h('div', { class: 'kalkopf' }, [h('small', {}, [log ? plural(gym, 'gym day') + ', ' + plural(log, 'day') + ' logged' : 'nothing logged yet']),
      h('button', { type: 'button', class: 'btn mini leicht', 'aria-expanded': String(!zu), onclick: () => { kalenderZu(!zu); S.firstPaint.overview = true; render(); } }, [zu ? 'Show' : 'Hide'])])])]);
  if (zu) return karte;
  const kal = h('div', { class: 'kal' + (anim ? ' ein' : '') });
  const agenda = h('div', { class: 'agenda' + (anim ? ' ein' : '') });
  DAYNAMES.forEach(d => kal.appendChild(h('div', { class: 'kh' }, [d])));
  for (let i = 0; i < off; i++) kal.appendChild(h('div', { class: 'kt aus' }));
  let ai = 0;
  for (let d = 1; d <= n; d++){
    const iso = key + '-' + String(d).padStart(2, '0'), r = DATA.days[iso], wd = dow(P(iso));
    const cls = 'kt' + (r ? (r.gym ? ' gym' : '') : ' leer0') + (wd > 4 ? ' we' : '') + (iso === TODAY ? ' heute' : '');
    const kids = [h('div', { class: 'kd' }, [h('b', {}, [String(d)]), r && r.kg != null ? h('span', {}, [n2(r.kg) + ' kg']) : null])];
    const extras = r ? [r.cardio ? 'Cardio' : '', r.stretch ? 'Stretching' : ''].filter(Boolean) : [];
    if (r){
      if (r.gym) kids.push(h('span', { class: 'kw', title: r.training || 'Gym' }, [r.training || 'Gym']));
      if (extras.length) kids.push(h('span', { class: 'kx' }, [extras.join(' \u00b7 ')]));
      if (r.special) kids.push(h('div', { class: 'ks' }, [zeilenVon(r.special).join(' \u00b7 ')]));
      const j = zeilenVon(r.journal);
      if (j.length) kids.push(h('div', { class: 'kj', title: j.join('\n') }, [j.join(' \u00b7 ')]));
    }
    const zelle = h('button', { type: 'button', class: cls, 'aria-label': DAYLONG[wd] + ' ' + deDate(P(iso)), onclick: () => goTo('entry', iso) }, kids);
    zelle.style.setProperty('--i', off + d);
    kal.appendChild(zelle);
    if (r){
      const t = h('div', { class: 't' });
      if (r.gym) t.appendChild(h('span', { class: 'kw' }, [r.training || 'Gym']));
      const x = [r.kg != null ? n2(r.kg) + ' kg' : ''].concat(extras).filter(Boolean);
      if (x.length) t.appendChild(h('span', { class: 'mut', style: { fontSize: '12px', fontWeight: '600' } }, [x.join(' \u00b7 ')]));
      if (r.special) t.appendChild(h('span', { style: { color: 'var(--gym3)', fontWeight: '600' } }, [zeilenVon(r.special).join(' \u00b7 ')]));
      const j = zeilenVon(r.journal); if (j.length) t.appendChild(h('span', {}, [j.join(' \u00b7 ')]));
      const ag = h('button', { type: 'button', class: 'ag' + (r.gym ? ' gym' : ''), onclick: () => goTo('entry', iso) }, [h('div', { class: 'd' }, [h('b', {}, [String(d)]), DAYNAMES[wd]]), t]);
      ag.style.setProperty('--i', ai++);
      agenda.appendChild(ag);
    }
  }
  if (!ai) agenda.appendChild(h('div', { class: 'leer' }, ['Nothing logged in ' + MONTHS[m] + ' yet.']));
  karte.appendChild(kal); karte.appendChild(agenda);
  return karte;
}

