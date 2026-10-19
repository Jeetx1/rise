/* ================================================================ data entry: one day at a time, written into the log with "Log day" */
const NEU = '__neu', OHNE = '__gym';
function workoutListe(){ return Object.keys(C.map).sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1); }
function mapKey(label){ const c = canon(label) || label; for (const k in C.map) if (k.toLowerCase() === String(c).toLowerCase()) return k; return c; }
function wachsen(t){ t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
function letzteWaage(vor){
  let best = null;
  for (const k in DATA.days){ const r = DATA.days[k]; if (k < vor && r.kg != null && r.kg !== '' && (!best || k > best)) best = k; }
  return best;
}
function formLaden(iso){
  const r = DATA.days[iso] || {};
  F = { iso, training: r.gym ? (r.training ? mapKey(r.training) : OHNE) : '', cardio: !!r.cardio, stretch: !!r.stretch,
    special: zeilenVon(r.special).join('\n'), journal: zeilenVon(r.journal).join('\n'), kg: r.kg != null ? n2(r.kg) : '', changed: false };
}
function formLeer(){ return !F.training && !F.cardio && !F.stretch && !F.special.trim() && !F.journal.trim() && !F.kg.trim(); }
function wochenGym(iso){ const m = monday(P(iso)); let n = 0; for (let i = 0; i < 7; i++){ const r = DATA.days[ISO(add(m, i))]; if (r && r.gym) n++; } return n; }
/* writes the form into the log and says what happened */
function formSchreiben(){
  const iso = F.iso, alt = DATA.days[iso], vorher = wochenGym(iso);
  if (formLeer()){ const war = !!alt; if (alt) delete DATA.days[iso]; F.changed = false; if (war) touch(); return { leer: true }; }
  const v = parseFloat(F.kg.replace(',', '.'));
  const kg = F.kg.trim() && isFinite(v) && v > 20 && v < 400 ? Math.round(v * 100) / 100 : null;
  const gym = !!F.training, training = F.training === OHNE ? '' : (canon(F.training) || F.training.trim());
  if (gym && training && !partsOf(training)) C.map[training] = [];
  DATA.days[iso] = { gym, training: gym ? training : '', cardio: F.cardio, stretch: F.stretch, special: F.special.trim(), journal: F.journal.trim(),
    kg, kgSrc: kg === null ? null : (alt && alt.kg === kg && alt.kgSrc ? alt.kgSrc : 'manual') };
  F.changed = false; touch();
  return { gym, training, vorher, nachher: wochenGym(iso) };
}
/* leaving a day with changes on the form: they go into the log quietly */
function formBuchenStill(){
  if (!F || !F.changed) return;
  const d = P(F.iso); formSchreiben();
  toast(DAYNAMES[dow(d)] + ' ' + deShort(d) + ' logged on the way out.');
}
function geheZuTag(iso){ formBuchenStill(); S.tag = iso; F = null; render(); }
function malStand(){
  const st = $('#p-entry .buchen .st'), lb = $('#logknopf');
  if (!st || !F) return;
  st.classList.toggle('offen', F.changed); st.classList.toggle('datei', !F.changed && S.dirty);
  st.lastChild.textContent = F.changed ? 'Changes on this day are not logged yet' : (S.dirty ? 'Logged. Save puts it into your file.' : 'Logged and saved');
  if (lb) lb.disabled = !F.changed;
}

function seiteEntry(el){
  if (!S.tag) S.tag = TODAY;
  const iso = S.tag, d = P(iso), wk0 = monday(d);
  if (!F || F.iso !== iso) formLaden(iso);
  const geaendert = () => { F.changed = true; malStand(); };

  const karte = h('div', { class: 'blatt', id: 'formkarte' });
  karte.appendChild(h('div', { class: 'tagkopf' }, [
    h('button', { class: 'rund', type: 'button', 'aria-label': 'Previous week', title: 'Previous week', onclick: () => geheZuTag(ISO(add(d, -7))), html: icon('<path d="M15 6l-6 6 6 6"/>', 17) }),
    h('div', { class: 'titel' }, [h('b', {}, [DAYLONG[dow(d)]]), h('span', {}, [d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ', week ' + isoWeek(d)])]),
    iso !== TODAY ? h('button', { class: 'heute-btn', type: 'button', onclick: () => geheZuTag(TODAY) }, ['Today']) : null,
    h('button', { class: 'rund', type: 'button', 'aria-label': 'Next week', title: 'Next week', onclick: () => geheZuTag(ISO(add(d, 7))), html: icon('<path d="M9 6l6 6-6 6"/>', 17) })
  ]));
  const strip = h('div', { class: 'tagwahl', role: 'tablist', 'aria-label': 'Day of the week' });
  for (let i = 0; i < 7; i++){
    const t = ISO(add(wk0, i)), r = DATA.days[t];
    strip.appendChild(h('button', { type: 'button', role: 'tab', 'aria-selected': String(t === iso), class: (t === iso ? 'on' : '') + (t === TODAY ? ' heute' : ''),
      onclick: () => { if (t !== iso) geheZuTag(t); } }, [h('small', {}, [DAYNAMES[i]]), h('b', {}, [String(add(wk0, i).getUTCDate())]),
      h('i', { style: { background: r && r.gym ? GYM : (r ? '#B8C1BC' : 'transparent') } })]));
  }
  karte.appendChild(strip);

  /* workout */
  const form = h('div', { class: 'form' });
  const wSel = h('select', { class: 'eingabe', 'aria-label': 'Workout' });
  const neuIn = h('input', { type: 'text', class: 'eingabe', placeholder: 'Name of the new workout', hidden: true });
  const fuelleWahl = () => {
    wSel.innerHTML = '';
    wSel.appendChild(h('option', { value: '' }, ['Rest day']));
    const liste = workoutListe();
    if (F.training && F.training !== OHNE && !liste.some(x => x.toLowerCase() === F.training.toLowerCase())) liste.unshift(F.training);
    wSel.appendChild(h('optgroup', { label: 'Workouts' }, liste.map(x => h('option', { value: x }, [x]))));
    if (F.training === OHNE) wSel.appendChild(h('option', { value: OHNE }, ['Gym, workout not set']));
    wSel.appendChild(h('option', { value: NEU }, ['New workout\u2026']));
    wSel.value = F.training;
  };
  fuelleWahl();
  wSel.addEventListener('change', () => {
    if (wSel.value === NEU){ neuIn.hidden = false; neuIn.value = ''; neuIn.focus(); return; }
    neuIn.hidden = true; F.training = wSel.value; geaendert();
  });
  const neuFertig = () => {
    if (neuIn.hidden) return;
    const v = neuIn.value.trim(); neuIn.hidden = true;
    if (v){ F.training = mapKey(v); geaendert(); }
    fuelleWahl();
  };
  neuIn.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); neuFertig(); } if (e.key === 'Escape'){ neuIn.value = ''; neuFertig(); } });
  neuIn.addEventListener('blur', neuFertig);

  /* weight */
  const lw = letzteWaage(iso);
  const kgIn = h('input', { type: 'text', inputmode: 'decimal', class: 'eingabe zahl', placeholder: lw ? n2(DATA.days[lw].kg) : '', value: F.kg, autocomplete: 'off', 'aria-label': 'Body weight in kg' });
  kgIn.addEventListener('input', () => { F.kg = kgIn.value; geaendert(); });
  form.appendChild(h('div', { class: 'reihe' }, [
    h('div', { class: 'feld' }, [h('span', {}, ['Workout']), wSel, neuIn]),
    h('label', { class: 'feld' }, [h('span', {}, ['Weight', lw ? h('small', {}, ['last ' + deShort(P(lw))]) : null]), h('div', { class: 'kgfeld' }, [kgIn, h('em', {}, ['kg'])])])
  ]));

  /* extras */
  const pille = (feld, txt) => {
    const b = h('button', { type: 'button', class: 'pille' + (F[feld] ? ' on' : ''), 'aria-pressed': String(F[feld]) }, [h('i'), txt]);
    b.addEventListener('click', () => { F[feld] = !F[feld]; b.classList.toggle('on', F[feld]); b.setAttribute('aria-pressed', String(F[feld])); geaendert(); });
    return b;
  };
  form.appendChild(h('div', { class: 'feld' }, [h('span', {}, ['Also']), h('div', { class: 'extras' }, [pille('cardio', 'Cardio'), pille('stretch', 'Stretching')])]));

  const textfeld = (feld, zeilen, platz) => {
    const t = h('textarea', { class: 'eingabe', rows: zeilen, placeholder: platz });
    t.value = F[feld];
    t.addEventListener('input', () => { F[feld] = t.value; wachsen(t); geaendert(); });
    requestAnimationFrame(() => wachsen(t));
    return t;
  };
  const spIn = textfeld('special', 1, '');
  /* PR: lift and kg become a Special line, tagged "PR " when the body weight says so */
  const liftIn = h('input', { type: 'text', class: 'eingabe', list: 'liftliste', placeholder: 'Lift', 'aria-label': 'Lift', autocomplete: 'off' });
  const prKg = h('input', { type: 'text', inputmode: 'decimal', class: 'eingabe zahl', 'aria-label': 'Weight lifted in kg', autocomplete: 'off' });
  const prReps = h('input', { type: 'text', inputmode: 'numeric', class: 'eingabe zahl', placeholder: '1', 'aria-label': 'Reps', autocomplete: 'off' });
  const prReihe = h('div', { class: 'prreihe', hidden: true }, [liftIn, h('div', { class: 'kgfeld' }, [prKg, h('em', {}, ['kg'])]), h('div', { class: 'kgfeld' }, [prReps, h('em', {}, ['reps'])]),
    h('datalist', { id: 'liftliste' }, liftsBekannt().map(l => h('option', { value: l }))),
    h('button', { type: 'button', class: 'btn mini', onclick: () => prDazu() }, ['Add'])]);
  const prDazu = () => {
    const lift = liftIn.value.trim().replace(/\s+/g, ' '), kg = parseFloat(prKg.value.replace(',', '.'));
    if (!/^[A-Za-zÀ-ſ][A-Za-zÀ-ſ \-]*$/.test(lift)) return toast('Name the lift in letters, e.g. Deadlift', true);
    if (!isFinite(kg) || kg <= 0 || kg > 1000) return toast('Enter the weight lifted in kg', true);
    const reps = prReps.value.trim() ? parseInt(prReps.value, 10) : 1;
    if (!(reps >= 1 && reps <= 100)) return toast('Reps: a whole number, or leave it empty for a single', true);
    const bw = parseFloat(F.kg.replace(',', '.')), u = prUrteil(F.iso, lift, kg, reps, isFinite(bw) && bw > 20 && bw < 400 ? bw : null, F.special);
    F.special = zeilenVon(F.special).concat(rekordText({ lift, kg, reps, rest: '' }, u.art)).join('\n');
    spIn.value = F.special; wachsen(spIn); geaendert();
    liftIn.value = ''; prKg.value = ''; prReps.value = ''; prReihe.hidden = true;
    toast(lift + ' ' + kg + ' kg' + (reps > 1 ? ' x' + reps : '') + ': ' + u.warum + '.');
  };
  [liftIn, prKg, prReps].forEach(x => x.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); prDazu(); } }));
  form.appendChild(h('div', { class: 'feld' }, [h('span', {}, ['Special', h('small', {}, ['records, firsts, anything to remember']),
    h('button', { type: 'button', class: 'prknopf', 'aria-expanded': 'false', onclick: e => { prReihe.hidden = !prReihe.hidden; e.currentTarget.setAttribute('aria-expanded', String(!prReihe.hidden)); if (!prReihe.hidden) liftIn.focus(); } }, ['+ PR'])]),
    prReihe, spIn]));
  form.appendChild(h('label', { class: 'feld' }, [h('span', {}, ['Journal', h('small', {}, ['one line per thought'])]), textfeld('journal', 5, 'How was the day?')]));
  karte.appendChild(form);

  const logBtn = h('button', { class: 'btn log', type: 'button', id: 'logknopf', onclick: () => buchen() }, ['Log day']);
  karte.appendChild(h('div', { class: 'buchen' }, [logBtn, h('span', { class: 'st' }, [h('i'), '']),
    h('span', { class: 'kbd' }, [/Mac|iPhone|iPad/.test(navigator.platform) ? '\u2318 Enter' : 'Ctrl Enter'])]));
  karte.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter'){ e.preventDefault(); if (F.changed) buchen(); } });

  /* the week beside it */
  const woche = h('div', { class: 'blatt' });
  let n = 0; for (let i = 0; i < 7; i++){ const r = DATA.days[ISO(add(wk0, i))]; if (r && r.gym) n++; }
  const pips = h('span', { class: 'pips' });
  for (let i = 0; i < Math.max(C.weeklyTarget, n); i++) pips.appendChild(h('i', { class: i < n ? 'on' : '' }));
  woche.appendChild(h('div', { class: 'bk', style: { marginBottom: '10px' } }, [h('h2', {}, ['Week ' + isoWeek(wk0)]), h('small', {}, [deShort(wk0) + ' \u2013 ' + deShort(add(wk0, 6))])]));
  woche.appendChild(h('div', { class: 'wsum' }, [pips, h('b', {}, [n + ' / ' + C.weeklyTarget])]));
  const liste = h('div', { class: 'wliste' });
  for (let i = 0; i < 7; i++){
    const t = ISO(add(wk0, i)), r = DATA.days[t] || {}, z = zeilenVon(r.journal);
    liste.appendChild(h('button', { type: 'button', class: 'wtag' + (t === iso ? ' on' : ''), onclick: () => { if (t !== iso) geheZuTag(t); } }, [
      h('div', { class: 'd' + (i > 4 ? ' we' : '') }, [h('b', {}, [t.slice(8)]), DAYNAMES[i]]),
      h('div', { class: 't' }, [
        r.gym ? h('div', { class: 'zeile1' }, [h('i', { class: 'sw', style: { background: GYM } }), r.training || 'Gym'])
              : h('div', { class: 'zeile1 rest' }, [t > TODAY ? '' : (DATA.days[t] ? 'Rest day' : 'Nothing yet')]),
        z.length ? h('div', { class: 'zeile2' }, [z.join(' \u00b7 ')]) : null]),
      h('span', { class: 'kg' }, [r.kg ? n2(r.kg) : ''])
    ]));
  }
  woche.appendChild(liste);
  el.appendChild(h('div', { class: 'eintrag' }, [karte, woche]));
  malStand();
}

