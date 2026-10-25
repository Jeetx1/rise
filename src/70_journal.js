/* ================================================================ journal */
function markiert(text, q){
  const t = String(text);
  if (!q) return document.createTextNode(t);
  const span = h('span'), lt = t.toLowerCase(), lq = q.toLowerCase();
  let i = 0, j;
  while ((j = lt.indexOf(lq, i)) >= 0){
    if (j > i) span.appendChild(document.createTextNode(t.slice(i, j)));
    span.appendChild(h('mark', {}, [t.slice(j, j + q.length)]));
    i = j + q.length;
  }
  if (i < t.length) span.appendChild(document.createTextNode(t.slice(i)));
  return span;
}
function zeilenVon(text){ return String(text || '').split(/\s*\/\/\s*|\n/).map(t => t.trim()).filter(Boolean); }
function seiteJournal(el){
  const q = S.q.trim();
  const treffer = r => !q || [r.journal, r.special, r.training].some(x => String(x || '').toLowerCase().indexOf(q.toLowerCase()) >= 0);
  let days;
  if (S.pr) days = Object.keys(DATA.days).sort().map(k => [k, DATA.days[k]]).filter(p => istPrTag(p[1]) && treffer(p[1]));
  else if (S.sp) days = Object.keys(DATA.days).sort().map(k => [k, DATA.days[k]]).filter(p => p[1].special && treffer(p[1]));
  else if (q) days = Object.keys(DATA.days).sort().map(k => [k, DATA.days[k]]).filter(p => treffer(p[1]));
  else days = daysIn(scope()).filter(p => p[1].journal || p[1].special || p[1].gym || p[1].kg);

  const suche = h('input', { type: 'search', placeholder: 'Search all years', value: S.q, 'aria-label': 'Search the journal' });
  let st = null;
  suche.addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => { S.q = suche.value; const pos = suche.selectionStart; render(); const n = $('#p-journal input[type=search]'); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch (e){} } }, 180); });
  el.appendChild(h('div', { class: 'jbar' }, [
    h('label', { class: 'suche' }, [h('span', { html: icon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 16) }), suche]),
    h('button', { type: 'button', class: 'btn btn--ghost btn--sm kbtn' + (S.pr ? ' on' : ''), 'aria-pressed': String(!!S.pr), title: 'Only days with a personal record, all years', onclick: () => { S.pr = !S.pr; S.sp = false; render(); } }, ['PRs']),
    h('button', { type: 'button', class: 'btn btn--ghost btn--sm kbtn' + (S.sp ? ' on' : ''), 'aria-pressed': String(!!S.sp), title: 'Only days with a Special entry, all years', onclick: () => { S.sp = !S.sp; S.pr = false; render(); } }, ['Special']),
    S.pr ? h('button', { type: 'button', class: 'btn btn--ghost btn--sm kbtn', title: 'Set or remove PR on every record by body weight', onclick: () => {
      /* shows what would change first: the check touches every year */
      const ae = prPruefen();
      if (!ae.length) return toast('Every PR is up to date.');
      const zeilen = [].concat(...ae.map(a => a.zeilen.map(z => deDate(P(a.iso)) + ': “' + z.vorher + '” → “' + z.nachher + '”')));
      bestaetigen({ titel: 'Re-check PRs', lead: plural(zeilen.length, 'line') + ' on ' + plural(ae.length, 'day') + ' would change. Only the PR tag changes; the rest of each line stays as you typed it.',
        liste: zeilen.length > 8 ? zeilen.slice(0, 8).concat(['… and ' + (zeilen.length - 8) + ' more']) : zeilen,
        ja: 'Apply', beiJa: () => { const n = prAnwenden(ae); F = null; touch(); toast(plural(n, 'day') + ' changed by the PR check. Save to keep it.'); render(); } });
    } }, ['Re-check PRs']) : null,
    h('button', { type: 'button', class: 'btn btn--ghost btn--sm kbtn', onclick: () => alle(true) }, ['Expand all']),
    h('button', { type: 'button', class: 'btn btn--ghost btn--sm kbtn', onclick: () => alle(false) }, ['Collapse all'])
  ]));
  el.appendChild(h('p', { class: 'untertitel' }, [S.sp ? plural(days.length, 'day') + ' with a Special, all years' + (q ? ' matching \u201c' + q + '\u201d' : '') : S.pr ? plural(days.length, 'day') + ' with a PR or Rep-PR, all years' + (q ? ' matching \u201c' + q + '\u201d' : '') : q ? plural(days.length, 'day') + ' with \u201c' + q + '\u201d' : scopeLabel(true) + ', ' + plural(days.length, 'day')]));
  if (!days.length){ el.appendChild(h('div', { class: 'card blatt' }, [h('div', { class: 'leer' }, [S.sp ? 'No Special entries yet.' : S.pr ? 'No PRs yet. A record needs a body weight within ' + PR_TAGE + ' days to count.' : q ? 'Nothing matches.' : 'Nothing logged in this period.'])])); return; }

  const byMonth = {};
  days.forEach(p => { const m = p[0].slice(0, 7); (byMonth[m] = byMonth[m] || []).push(p); });
  Object.keys(byMonth).sort().forEach(mk => {
    const list = byMonth[mk], gym = list.filter(p => p[1].gym).length;
    const det = h('details', { class: 'jm' });
    if (q || S.pr || S.sp) det.open = true;
    const pills = h('span', { class: 'pills', 'aria-hidden': 'true' });
    list.slice(0, 31).forEach(p => pills.appendChild(h('i', { style: p[1].gym ? { background: colorOf(p[1].training || 'Full Body') } : null })));
    det.appendChild(h('summary', {}, [h('h3', {}, [MONTHS[parseInt(mk.slice(5), 10) - 1] + ' ' + mk.slice(0, 4)]), pills,
      h('span', { class: 'meta' }, [plural(list.length, 'day') + ', ' + gym + ' gym'])]));
    let gebaut = false;
    const fuellen = () => {
      if (gebaut) return; gebaut = true;
      const inhalt = h('div', { class: 'jinhalt' });
      list.forEach(([iso, r]) => {
        const d = P(iso), chips = h('div', { class: 'chips' });
        if (r.gym) chips.appendChild(h('span', { class: 'chip split', style: { background: colorOf(r.training || 'Full Body') } }, [markiert(r.training || 'Gym', q)]));
        if (r.cardio) chips.appendChild(h('span', { class: 'chip' }, ['Cardio']));
        if (r.stretch) chips.appendChild(h('span', { class: 'chip' }, ['Stretching']));
        if (r.kg) chips.appendChild(h('span', { class: 'chip kg' }, [n2(r.kg) + ' kg']));
        const sp = zeilenVon(r.special), prs = sp.filter(z => { const x = rekordVon(z); return x && x.pr; }), rest = sp.filter(z => prs.indexOf(z) < 0);
        prs.forEach(z => { const b = kgBei(iso), x = rekordVon(z);
          chips.appendChild(h('span', { class: 'chip pr' + (x.art === 'rep' ? ' rep' : ''), title: b ? 'at ' + n1(b.kg) + ' kg body weight' : '' }, [markiert(z, q)])); });
        if (rest.length) chips.appendChild(h('span', { class: 'chip sp' }, [markiert(rest.join(' \u00b7 '), q)]));
        const body = h('div', {}, [chips]);
        zeilenVon(r.journal).forEach(t => body.appendChild(h('p', { class: 'jzeile' }, [markiert(t, q)])));
        inhalt.appendChild(h('div', { class: 'jtag', title: 'Edit this day', onclick: () => goTo('entry', iso) }, [h('div', { class: 'd' + (dow(d) > 4 ? ' we' : '') }, [h('b', {}, [iso.slice(8)]), DAYNAMES[dow(d)]]), body]));
      });
      det.appendChild(inhalt);
    };
    det.addEventListener('toggle', () => { if (det.open) fuellen(); });
    if (det.open) fuellen();
    el.appendChild(det);
  });
  function alle(open){ $$('details.jm', el).forEach(d => { d.open = open; }); }
}

