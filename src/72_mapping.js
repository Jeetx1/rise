/* ================================================================ mapping */
function seiteMapping(el){
  const seen = seenSplits();

  /* settings: name and weekly target */
  const nameIn = h('input', { type: 'text', class: 'eingabe', value: C.name || '', placeholder: 'Shown on the PDF', autocomplete: 'name' });
  nameIn.addEventListener('input', () => { C.name = nameIn.value.trim(); touch(); });
  const wert = h('b', {}, [String(C.weeklyTarget)]);
  const setz = v => { C.weeklyTarget = Math.max(1, Math.min(14, v)); wert.textContent = C.weeklyTarget; touch(); };
  el.appendChild(h('div', { class: 'card blatt' }, [h('div', { class: 'einst' }, [
    h('label', { class: 'feld' }, [h('span', {}, ['Your name']), nameIn]),
    h('div', { class: 'feld' }, [h('span', {}, ['Sessions per week']), h('div', { class: 'stepper' }, [
      h('button', { type: 'button', 'aria-label': 'One less', onclick: () => setz(C.weeklyTarget - 1) }, ['\u2212']), wert,
      h('button', { type: 'button', 'aria-label': 'One more', onclick: () => setz(C.weeklyTarget + 1) }, ['+'])])])
  ])]));

  /* body parts as chips */
  const tags = h('div', { class: 'tags' });
  C.bodyParts.forEach(p => tags.appendChild(h('span', { class: 'tag' }, [p, h('button', { class: 'x', type: 'button', 'aria-label': 'Remove ' + p, onclick: () => {
    let used = 0; for (const m in C.map) if (C.map[m].indexOf(p) >= 0) used++;
    const weg = () => { C.bodyParts = C.bodyParts.filter(x => x !== p); for (const m in C.map) C.map[m] = C.map[m].filter(x => x !== p); touch(); render(); };
    if (!used) return weg();
    bestaetigen({ titel: 'Remove \u201c' + p + '\u201d?', lead: plural(used, 'workout') + ' count' + (used === 1 ? 's' : '') + ' it. They lose this body part; logged days stay as they are.', ja: 'Remove', gefahr: true, beiJa: weg });
  } }, ['\u00d7'])])));
  const neuTeil = h('input', { type: 'text', placeholder: '+ Body part', 'aria-label': 'New body part' });
  neuTeil.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return; e.preventDefault();
    const v = neuTeil.value.trim(); if (!v) return;
    if (C.bodyParts.some(x => x.toLowerCase() === v.toLowerCase())) return toast('\u201c' + v + '\u201d already exists', true);
    C.bodyParts.push(v); touch(); render(); const n = $('#p-mapping .tag.neu input'); if (n) n.focus();
  });
  tags.appendChild(h('span', { class: 'tag neu' }, [neuTeil]));
  el.appendChild(h('div', { class: 'card blatt' }, [h('div', { class: 'bk' }, [h('h2', {}, ['Body parts']), h('small', {}, ['type and press Enter to add'])]), tags]));

  /* workouts: one line each, click to edit */
  const karte = h('div', { class: 'card blatt' }, [h('div', { class: 'bk' }, [h('h2', {}, ['Workouts']), h('small', {}, ['these fill the dropdown under Data entry'])])]);
  const cands = mergeCandidates();
  cands.forEach(grp => karte.appendChild(h('div', { class: 'sugg' }, [
    h('span', {}, [grp.map(g => '\u201c' + g.name + '\u201d').join(' and ') + ' look like the same workout.']),
    h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onclick: () => { grp.slice(1).forEach(g => mergeSplits(g.name, grp[0].name)); touch(); render(); toast('Merged into \u201c' + grp[0].name + '\u201d'); } }, ['Merge into \u201c' + grp[0].name + '\u201d'])])));
  const names = Object.keys(C.map);
  Object.keys(seen).forEach(k => { if (!partsOf(k) && names.indexOf(k) < 0) names.push(k); });
  names.sort((x, y) => (seen[y] || 0) - (seen[x] || 0) || (x.toLowerCase() < y.toLowerCase() ? -1 : 1));
  const liste = h('div', { class: 'workouts' });
  names.forEach(name => liste.appendChild(workoutZeile(name, seen[name] || 0)));
  karte.appendChild(liste);
  const neuWo = h('input', { type: 'text', class: 'eingabe', placeholder: 'New workout, e.g. Arms' });
  const addWo = () => {
    const v = neuWo.value.trim(); if (!v) return;
    if (C.aliases[v.toLowerCase()]) return toast('\u201c' + v + '\u201d is already merged into \u201c' + canon(v) + '\u201d', true);
    if (partsOf(v)) return toast('\u201c' + v + '\u201d already exists', true);
    C.map[v] = []; S.offen = v; touch(); render();
  };
  neuWo.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); addWo(); } });
  karte.appendChild(h('div', { class: 'neuwo' }, [neuWo, h('button', { class: 'btn btn--primary', type: 'button', onclick: addWo }, ['Add'])]));
  el.appendChild(karte);
}
function workoutZeile(name, used){
  const parts = C.map[name] || (C.map[name] = []);
  const offen = S.offen === name;
  const box = h('div', { class: 'wo' + (offen ? ' offen' : '') });
  const teile = h('span', { class: 'teile' + (parts.length ? '' : ' fehlt') }, [parts.length ? parts.join(', ') : 'no body parts']);
  box.appendChild(h('button', { type: 'button', class: 'zeile', 'aria-expanded': String(offen), onclick: () => { S.offen = offen ? null : name; render(); } }, [
    h('i', { class: 'sw', style: { background: colorOf(name), width: '12px', height: '12px' } }),
    h('span', { class: 'nm' }, [name, h('small', {}, [used ? used + '\u00d7' : 'unused'])]), teile, h('i', { class: 'pfeil' })]));
  if (!offen) return box;

  const edit = h('div', { class: 'edit' });
  const wahl = h('div', { class: 'teilwahl' });
  C.bodyParts.forEach(b => {
    const btn = h('button', { type: 'button', class: parts.indexOf(b) >= 0 ? 'on' : '', 'aria-pressed': String(parts.indexOf(b) >= 0), onclick: () => {
      const i = parts.indexOf(b); if (i >= 0) parts.splice(i, 1); else parts.push(b);
      parts.sort((x, y) => C.bodyParts.indexOf(x) - C.bodyParts.indexOf(y));
      btn.classList.toggle('on', parts.indexOf(b) >= 0);
      teile.textContent = parts.length ? parts.join(', ') : 'no body parts'; teile.classList.toggle('fehlt', !parts.length);
      touch();
    } }, [b]);
    wahl.appendChild(btn);
  });
  edit.appendChild(h('div', {}, [h('div', { class: 'lab' }, ['Trains']), wahl]));
  const als = aliasesOf(name);
  if (als.length) edit.appendChild(h('div', { class: 'alias' }, ['Old spellings that land here: ', h('span', {}, als.map(a => h('em', {}, [a,
    h('button', { type: 'button', 'aria-label': 'Forget ' + a, onclick: () => { delete C.aliases[a]; touch(); render(); } }, ['\u00d7'])])))]));
  const andere = Object.keys(C.map).filter(k => k !== name).sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
  const ziel = h('select', { class: 'eingabe', style: { width: 'auto', minHeight: '32px', padding: '4px 30px 4px 10px', fontSize: '13px' }, 'aria-label': 'Merge into' },
    [h('option', { value: '' }, ['Merge into\u2026'])].concat(andere.map(k => h('option', { value: k }, [k]))));
  ziel.onchange = () => {
    const t = ziel.value; if (!t) return;
    bestaetigen({ titel: 'Merge \u201c' + name + '\u201d into \u201c' + t + '\u201d?', lead: plural(used, 'logged day') + ' get relabelled. \u201c' + name + '\u201d disappears from the list; nothing is deleted.',
      ja: 'Merge', beiJa: () => { const n = mergeSplits(name, t); S.offen = t; touch(); render(); toast(plural(n, 'day') + ' now say \u201c' + t + '\u201d'); } });
    ziel.value = '';
  };
  edit.appendChild(h('div', { class: 'aktionen' }, [ziel,
    h('button', { class: 'btn btn--quiet-danger btn--sm', type: 'button', onclick: () => {
      if (!used){ delete C.map[name]; delete C.colors[name]; S.offen = null; touch(); render(); return; }
      bestaetigen({ titel: 'Remove \u201c' + name + '\u201d?', lead: 'It leaves the dropdown. The ' + plural(used, 'day') + ' that used it keep their label and show up as without body parts. To fold it into another workout, use Merge instead.',
        ja: 'Remove', gefahr: true, beiJa: () => { delete C.map[name]; S.offen = null; touch(); render(); } });
    } }, ['Remove'])]));
  box.appendChild(edit);
  return box;
}

