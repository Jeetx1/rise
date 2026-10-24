/* ================================================================ monthly PDF */
function pdfDialog(){
  if (!DATA) return;
  const ys = yearsWithData();
  const ySel = h('select', { class: 'eingabe' }, ys.slice().reverse().map(y => h('option', { value: y, selected: y === S.year }, [y])));
  const mSel = h('select', { class: 'eingabe' });
  const fuelle = () => {
    mSel.innerHTML = '';
    MONTHS.forEach((m, i) => {
      const key = ySel.value + '-' + String(i + 1).padStart(2, '0'); let n = 0;
      for (const k in DATA.days) if (k.slice(0, 7) === key) n++;
      mSel.appendChild(h('option', { value: i, selected: ySel.value === S.year && i === S.month }, [m + (n ? '' : ' (empty)')]));
    });
  };
  ySel.onchange = fuelle; fuelle();
  const opt = { journal: true, notizen: true, prs: true };
  const pille = (key, txt) => { const b = h('button', { type: 'button', class: 'pille on', 'aria-pressed': 'true' }, [h('i'), txt]);
    b.onclick = () => { opt[key] = !opt[key]; b.classList.toggle('on', opt[key]); b.setAttribute('aria-pressed', String(opt[key])); }; return b; };
  const los = h('button', { class: 'btn btn--primary', type: 'button' }, ['Preview']);
  const body = h('div', { class: 'pdfwahl' }, [
    h('div', { class: 'zeile' }, [h('label', { class: 'feld' }, [h('span', {}, ['Year']), ySel]), h('label', { class: 'feld' }, [h('span', {}, ['Month']), mSel])]),
    h('div', { class: 'feld' }, [h('span', {}, ['Include']), h('div', { class: 'optionen' }, [pille('journal', 'Journal'), pille('notizen', 'Special notes'), pille('prs', 'PRs')])]),
    h('div', { class: 'aktion' }, [h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => d.zu() }, ['Cancel']), los])
  ]);
  let url = null;
  const weg = () => { if (url){ URL.revokeObjectURL(url); url = null; } };
  /* step 2: the page as it will be saved */
  los.onclick = () => {
    let blob, name;
    const y = ySel.value, m = parseInt(mSel.value, 10);
    let doc;
    try { doc = baueBericht(y, m, opt); blob = doc.output('blob'); name = stamp() + '_RISE REPORT ' + MONTHS[m].toUpperCase() + ' ' + y + '.pdf'; }
    catch (e){ toast('PDF failed: ' + (e && e.message || e), true); return; }
    weg(); url = URL.createObjectURL(blob);
    const db = d.box.querySelector('.db'), titel = d.box.querySelector('.dk h2'), sub = d.box.querySelector('.dk p');
    titel.textContent = MONTHS[m] + ' ' + y; sub.textContent = name;
    d.box.classList.add('breit');
    const speichernBtn = h('button', { class: 'btn btn--primary', type: 'button' }, ['Save PDF']);
    /* the click on Save is fresh, so the save dialog or share sheet may open */
    speichernBtn.onclick = () => ablegen(blob, name, { desc: 'PDF', mime: 'application/pdf', ext: '.pdf' }).then(r => {
      if (r.ok){ d.zu(); toast(r.download ? 'Downloaded as ' + r.name : (r.opened ? 'Opened in a new tab' : (r.shared ? 'Handed to the share sheet' : 'Saved as ' + r.name))); }
      else if (!r.abort) toast('Could not save the PDF: ' + (r.err && r.err.message || 'unknown error'), true);
    });
    db.innerHTML = '';
    const leinwand = h('canvas', { 'aria-label': 'Preview of the PDF page', role: 'img', title: 'Open full size', style: { cursor: 'zoom-in' }, onclick: () => window.open(url, '_blank') });
    db.appendChild(h('div', { class: 'vorschau' }, [leinwand]));
    /* sharp on any screen: the canvas gets the real pixel width of its box */
    requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3), box = leinwand.parentNode, innen = box.clientWidth - 2 * parseFloat(getComputedStyle(box).paddingLeft);
      const hoch = window.innerHeight * (window.innerWidth < 1000 ? .62 : .68) - 28, bw = Math.max(240, Math.min(innen, hoch * doc.breite / doc.hoehe));
      leinwand.style.width = bw + 'px';
      leinwand.width = Math.round(bw * dpr * 1.5); leinwand.height = Math.round(leinwand.width * doc.hoehe / doc.breite);
      doc.zeichne(leinwand, 1);
    });
    db.appendChild(h('div', { class: 'aktion' }, [
      h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => { weg(); d.box.classList.remove('breit'); titel.textContent = 'Monthly report'; sub.textContent = 'One page, A4 landscape'; sub.hidden = false; db.innerHTML = ''; db.appendChild(body); } }, ['Back']),
      h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => window.open(url, '_blank') }, ['Open full size']),
      speichernBtn
    ]));
    setTimeout(() => speichernBtn.focus(), 30);
  };
  const d = dialog('Monthly report', 'One page, A4 landscape', body, { beimSchliessen: weg });
}

/* A small PDF writer: Helvetica, lines, boxes, circles. Built in, so the export works offline and on the phone. */
const HW = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const HBW = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
const CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F };
const C1_OK = [0x80,0x82,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0x8A,0x8B,0x8C,0x8E,0x91,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9A,0x9B,0x9C,0x9E,0x9F];
/* turns any text into the characters Helvetica has (Windows-1252); safe to run twice */
function pdfText(s){
  s = String(s == null ? '' : s).replace(/\u2212/g, '-').replace(/\u2192/g, '->').replace(/\u2190/g, '<-').replace(/\u00a0/g, ' ').replace(/\r/g, '').replace(/\t/g, ' ');
  let out = '';
  for (const ch of s){
    const c = ch.codePointAt(0);
    if (c === 10 || (c >= 32 && c < 127) || (c >= 0xA0 && c <= 0xFF) || C1_OK.indexOf(c) >= 0) out += ch;
    else if (CP1252[c]) out += String.fromCharCode(CP1252[c]);
  }
  return out.replace(/ {2,}/g, ' ').trim();
}
/* Everything drawn is kept as a list, so the same page becomes the PDF file and the on-screen preview. */
const CP1252_ZURUECK = {}; for (const k in CP1252) CP1252_ZURUECK[CP1252[k]] = String.fromCharCode(+k);
function MiniPDF(o){
  const K = 72 / 25.4, quer = !!(o && o.landscape), PW = quer ? 841.89 : 595.28, PH = quer ? 595.28 : 841.89, KAPPA = .5523;
  const BREITE_MM = PW / K, HOEHE_MM = PH / K;
  const seiten = []; let cur = -1, fnt = 'F1', size = 10, fill = [0, 0, 0], stroke = [0, 0, 0], farbeT = [0, 0, 0], lw = .2, dash = null, props = {};
  const f = n => (Math.round(n * 100) / 100).toString();
  const pt = (x, y) => f(x * K) + ' ' + f(PH - y * K);
  const rgbS = c => f(c[0] / 255) + ' ' + f(c[1] / 255) + ' ' + f(c[2] / 255);
  const esc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const breite = (t, font, sz) => { const tab = font === 'F2' ? HBW : HW; let w = 0; for (let i = 0; i < t.length; i++){ const c = t.charCodeAt(i); w += (c >= 32 && c <= 255 ? tab[c - 32] : 0) || 556; } return w * sz / 1000 / K; };
  const pfad = (segs, st) => seiten[cur].push({ k: 'pfad', segs, st: st || 'D', fill: fill.slice(), stroke: stroke.slice(), lw, dash: dash ? dash.slice() : null });
  const api = {
    breite: BREITE_MM, hoehe: HOEHE_MM,
    addPage(){ seiten.push([]); cur = seiten.length - 1; return api; },
    setPage(i){ cur = i - 1; return api; },
    getNumberOfPages(){ return seiten.length; },
    setFont(fam, st){ fnt = st === 'bold' ? 'F2' : 'F1'; return api; },
    setFontSize(s){ size = s; return api; },
    setTextColor(r, g, b){ farbeT = [r, g, b]; return api; },
    setFillColor(r, g, b){ fill = [r, g, b]; return api; },
    setDrawColor(r, g, b){ stroke = [r, g, b]; return api; },
    setLineWidth(w){ lw = w; return api; },
    setLineDashPattern(a){ dash = a && a.length ? a.slice() : null; return api; },
    setProperties(p){ props = p || {}; return api; },
    rect(x, y, w, hh, st){ pfad([['M', x, y], ['L', x + w, y], ['L', x + w, y + hh], ['L', x, y + hh], ['Z']], st); return api; },
    roundedRect(x, y, w, hh, rx, ry, st){
      const r = Math.max(0, Math.min(rx, w / 2, hh / 2)), k = r * KAPPA;
      pfad([['M', x + r, y], ['L', x + w - r, y], ['C', x + w - r + k, y, x + w, y + r - k, x + w, y + r],
        ['L', x + w, y + hh - r], ['C', x + w, y + hh - r + k, x + w - r + k, y + hh, x + w - r, y + hh],
        ['L', x + r, y + hh], ['C', x + r - k, y + hh, x, y + hh - r + k, x, y + hh - r],
        ['L', x, y + r], ['C', x, y + r - k, x + r - k, y, x + r, y], ['Z']], st); return api;
    },
    line(x1, y1, x2, y2){ pfad([['M', x1, y1], ['L', x2, y2]], 'D'); return api; },
    circle(x, y, r, st){
      const k = r * KAPPA;
      pfad([['M', x + r, y], ['C', x + r, y + k, x + k, y + r, x, y + r], ['C', x - k, y + r, x - r, y + k, x - r, y],
        ['C', x - r, y - k, x - k, y - r, x, y - r], ['C', x + k, y - r, x + r, y - k, x + r, y], ['Z']], st); return api;
    },
    getTextWidth(t){ return breite(pdfText(t), fnt, size); },
    text(t, x, y, opt2){
      const zeilen = Array.isArray(t) ? t : [t], schritt = size * 1.15 / K;
      zeilen.forEach((z, i) => {
        const s = pdfText(z); if (!s) return;
        let xx = x; const w = breite(s, fnt, size);
        if (opt2 && opt2.align === 'center') xx -= w / 2; else if (opt2 && opt2.align === 'right') xx -= w;
        seiten[cur].push({ k: 'text', s, x: xx, y: y + i * schritt, fnt, size, col: farbeT.slice(), w });
      });
      return api;
    },
    splitTextToSize(t, maxW){
      const out = [];
      pdfText(t).split('\n').forEach(abs => {
        let zeile = '';
        abs.split(' ').forEach(wort => {
          if (!wort) return;
          while (breite(wort, fnt, size) > maxW && wort.length > 1){
            let n = wort.length - 1; while (n > 1 && breite(wort.slice(0, n), fnt, size) > maxW) n--;
            if (zeile){ out.push(zeile); zeile = ''; }
            out.push(wort.slice(0, n)); wort = wort.slice(n);
          }
          const probe = zeile ? zeile + ' ' + wort : wort;
          if (breite(probe, fnt, size) <= maxW) zeile = probe; else { if (zeile) out.push(zeile); zeile = wort; }
        });
        out.push(zeile);
      });
      while (out.length > 1 && !out[out.length - 1]) out.pop();
      return out;
    },
    /* the page on a canvas, for the preview: same list, same positions */
    zeichne(canvas, seite){
      const ops = seiten[(seite || 1) - 1] || [], g = canvas.getContext('2d'), s = canvas.width / BREITE_MM;
      g.save(); g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
      const farbe = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
      ops.forEach(op => {
        if (op.k === 'pfad'){
          g.beginPath();
          op.segs.forEach(sg => {
            if (sg[0] === 'M') g.moveTo(sg[1] * s, sg[2] * s);
            else if (sg[0] === 'L') g.lineTo(sg[1] * s, sg[2] * s);
            else if (sg[0] === 'C') g.bezierCurveTo(sg[1] * s, sg[2] * s, sg[3] * s, sg[4] * s, sg[5] * s, sg[6] * s);
            else g.closePath();
          });
          if (op.st === 'F' || op.st === 'FD' || op.st === 'DF'){ g.fillStyle = farbe(op.fill); g.fill(); }
          if (op.st !== 'F'){ g.strokeStyle = farbe(op.stroke); g.lineWidth = Math.max(.6, op.lw * s); g.setLineDash(op.dash ? op.dash.map(v => v * s) : []); g.stroke(); }
        } else {
          let t = ''; for (const ch of op.s){ const c = ch.charCodeAt(0); t += CP1252_ZURUECK[c] || ch; }
          g.fillStyle = farbe(op.col);
          g.font = (op.fnt === 'F2' ? 'bold ' : '') + (op.size / K * s).toFixed(2) + 'px Helvetica, Arial, sans-serif';
          g.fillText(t, op.x * s, op.y * s);
        }
      });
      g.restore();
    },
    output(){
      const objs = [];
      const neu = s => { objs.push(s); return objs.length; };
      const katalog = neu(''), seitenObj = neu('');
      const f1 = neu('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const f2 = neu('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const info = neu('<< /Title (' + esc(pdfText(props.title || '')) + ') /Creator (' + esc(pdfText(props.creator || 'RISE')) + ') /Producer (RISE) >>');
      const kids = [];
      seiten.forEach(ops => {
        const inhalt = ops.map(op => {
          if (op.k === 'text') return 'BT /' + op.fnt + ' ' + f(op.size) + ' Tf ' + rgbS(op.col) + ' rg ' + pt(op.x, op.y) + ' Td (' + esc(op.s) + ') Tj ET';
          const p = op.segs.map(sg => sg[0] === 'M' ? pt(sg[1], sg[2]) + ' m' : (sg[0] === 'L' ? pt(sg[1], sg[2]) + ' l' :
            (sg[0] === 'C' ? pt(sg[1], sg[2]) + ' ' + pt(sg[3], sg[4]) + ' ' + pt(sg[5], sg[6]) + ' c' : 'h'))).join(' ');
          const malen = op.st === 'F' ? 'f' : ((op.st === 'FD' || op.st === 'DF') ? 'B' : 'S');
          return 'q ' + rgbS(op.fill) + ' rg ' + rgbS(op.stroke) + ' RG ' + f(op.lw * K) + ' w ' + (op.dash ? '[' + op.dash.map(v => f(v * K)).join(' ') + '] 0 d ' : '') + p + ' ' + malen + ' Q';
        }).join('\n');
        const c = neu('<< /Length ' + inhalt.length + ' >>\nstream\n' + inhalt + '\nendstream');
        kids.push(neu('<< /Type /Page /Parent ' + seitenObj + ' 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> >> /Contents ' + c + ' 0 R >>'));
      });
      objs[katalog - 1] = '<< /Type /Catalog /Pages ' + seitenObj + ' 0 R >>';
      objs[seitenObj - 1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
      let s = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
      const offs = [];
      objs.forEach((ob, i) => { offs.push(s.length); s += (i + 1) + ' 0 obj\n' + ob + '\nendobj\n'; });
      const xref = s.length;
      s += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(x => String(x).padStart(10, '0') + ' 00000 n \n').join('');
      s += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + katalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF';
      const b = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255;
      return new Blob([b], { type: 'application/pdf' });
    }
  };
  return api;
}
function rgb(hex){ const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }

/* One month on one landscape page: a calendar with workout, weight, Special and journal in every day.
   The text in a day shrinks until it fits; zoom in to read the busy ones. */
function baueBericht(year, m, opt){
  const doc = MiniPDF({ landscape: true }); doc.addPage();
  const W = 297, H = 210, ML = 12, MR = 12, CW = W - ML - MR, K = 72 / 25.4;
  const sc = scopeOf(year, m, m), a = agg(sc), monat = MONTHS[m] + ' ' + year;
  const INK = rgb('#14191E'), INK2 = rgb('#4B5560'), INK3 = rgb('#89939C'), RULE = rgb('#DCE1DE');
  const PRFARBE = rgb('#9A5F00'), BLAU = rgb('#2F5E91'), BLAU2 = rgb('#4A7DB5'), HELL = rgb('#7DB1E6'), EIS = rgb('#EEF5FC'), EISRAND = rgb('#B9D5F2'), NAVY = rgb('#0E2A47');
  const fill = c => doc.setFillColor(c[0], c[1], c[2]), draw = c => doc.setDrawColor(c[0], c[1], c[2]), farbe = c => doc.setTextColor(c[0], c[1], c[2]);
  const font = (st, sz) => { doc.setFont('helvetica', st); doc.setFontSize(sz); };
  const text = (t, x, y, o) => doc.text(t, x, y, o || {});
  const kuerzen = (t, maxW) => { t = pdfText(t); if (doc.getTextWidth(t) <= maxW) return t; while (t.length > 1 && doc.getTextWidth(t + '...') > maxW) t = t.slice(0, -1); return t + '...'; };

  /* header */
  ['#2F5E91', '#4A7DB5', '#7DB1E6', '#C9DDF5'].forEach((c, i) => { fill(rgb(c)); doc.rect(ML + i * CW / 4, 9, CW / 4, 1.3, 'F'); });
  font('normal', 8); farbe(INK3);
  text(C.name ? 'Training report for ' + C.name : 'Training report', ML, 16);
  font('bold', 21); farbe(INK); text(monat, ML, 26);

  /* the few figures that still matter, small and to the right */
  const w = a.weights, wl = w.length ? w[w.length - 1] : null, dw = w.length > 1 ? wl.kg - w[0].kg : null;
  const stats = [
    [String(a.gym), a.gym === 1 ? 'gym day' : 'gym days'],
    [n1(a.perWeek), 'per week, target ' + C.weeklyTarget],
    [a.hit + ' / ' + a.weeks.length, 'weeks on target'],
    [wl ? n2(wl.kg) + ' kg' : '-', wl ? 'last weigh-in ' + deShort(P(wl.iso)) : 'no weigh-in'],
    [dw === null ? '-' : (dw > 0 ? '+' : (dw < 0 ? '-' : '')) + n2(Math.abs(dw)) + ' kg', 'change in the month']
  ];
  let sx = W - MR;
  stats.slice().reverse().forEach(st => {
    font('bold', 12); const w1 = doc.getTextWidth(st[0]); font('normal', 6.5); const w2 = doc.getTextWidth(st[1]);
    const bw = Math.max(w1, w2);
    font('bold', 12); farbe(INK); text(st[0], sx, 22.5, { align: 'right' });
    font('normal', 6.5); farbe(INK3); text(st[1], sx, 26, { align: 'right' });
    sx -= bw + 9;
  });
  draw(RULE); doc.setLineWidth(.25); doc.line(ML, 30.5, W - MR, 30.5);

  /* calendar */
  const gut = 7, top = 34, unten = 196;
  const first = new Date(Date.UTC(+year, m, 1)), nDays = new Date(Date.UTC(+year, m + 1, 0)).getUTCDate(), off = dow(first);
  const rows = Math.ceil((off + nDays) / 7), cw = (CW - gut) / 7, kopfH = 5, ch = (unten - top - kopfH) / rows;
  DAYNAMES.forEach((dn, i) => { font('bold', 7.5); farbe(i > 4 ? BLAU2 : INK3); text(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i], ML + gut + i * cw + 1.2, top + 3.2); });
  const y0 = top + kopfH;
  for (let r = 0; r < rows; r++){
    const wkStart = add(first, r * 7 - off);
    font('bold', 6.5); farbe(INK3); text('W' + isoWeek(wkStart), ML, y0 + r * ch + 4.2);
  }
  const SIZES = [7.2, 6.8, 6.4, 6, 5.6, 5.2, 4.8, 4.4];
  for (let i = 0; i < rows * 7; i++){
    const di = i - off + 1; if (di < 1 || di > nDays) continue;
    const x = ML + gut + (i % 7) * cw + .6, y = y0 + Math.floor(i / 7) * ch + .6, cww = cw - 1.2, chh = ch - 1.2;
    const iso = year + '-' + String(m + 1).padStart(2, '0') + '-' + String(di).padStart(2, '0'), r = DATA.days[iso], we = (i % 7) > 4;
    doc.setLineWidth(.25);
    if (r && r.gym){ fill(EIS); draw(EISRAND); doc.roundedRect(x, y, cww, chh, 1.8, 1.8, 'FD'); }
    else if (r){ fill([255, 255, 255]); draw(RULE); doc.roundedRect(x, y, cww, chh, 1.8, 1.8, 'FD'); }
    else { fill([250, 251, 250]); draw(rgb('#ECEFEC')); doc.roundedRect(x, y, cww, chh, 1.8, 1.8, 'FD'); }
    font('bold', 9.5); farbe(we ? BLAU2 : (r ? INK : INK3)); text(String(di), x + 2, y + 4.6);
    if (!r) continue;
    /* header line: date, then the workout right next to it, weight on the far right */
    let rechts = x + cww - 1.8;
    if (r.kg != null){ font('bold', 6.8); farbe(INK2); const kt = n2(r.kg) + ' kg'; text(kt, rechts, y + 4.4, { align: 'right' }); rechts -= doc.getTextWidth(kt) + 1.6; }
    font('bold', 9.5); let cx = x + 2 + doc.getTextWidth(String(di)) + 1.8;
    if (r.gym){
      font('bold', 6.6); const lab = kuerzen(r.training || 'Gym', Math.max(6, rechts - cx - 3.6)), tw = doc.getTextWidth(lab) + 3.6;
      fill(HELL); doc.roundedRect(cx, y + 1.65, tw, 3.9, 1.95, 1.95, 'F'); farbe(NAVY); text(lab, cx + 1.8, y + 4.45); cx += tw + 1.5;
    }
    let ty = y + 6.9;
    const ex = [r.cardio ? 'Cardio' : '', r.stretch ? 'Stretching' : ''].filter(Boolean).join(', ');
    if (ex){
      font('bold', 5.8); farbe(INK3);
      if (doc.getTextWidth(ex) <= rechts - cx) text(ex, cx, y + 4.4);
      else { text(kuerzen(ex, cww - 3.6), x + 1.8, ty + 2); ty += 3.2; }
    }
    /* Special and journal: largest size that fits */
    /* PR lines and the other Special lines can be switched on and off separately */
    const istPr = z => { const x = rekordVon(z); return !!(x && x.pr); };
    const sp = zeilenVon(r.special).filter(z => istPr(z) ? opt.prs : opt.notizen), jo = opt.journal ? zeilenVon(r.journal) : [];
    if (!sp.length && !jo.length) continue;
    const platz = y + chh - 1.6 - ty, breite = cww - 3.6;
    let wahl = null;
    for (const sz of SIZES){
      const lh = sz * 1.18 / K;
      font('bold', sz); const a1 = []; sp.forEach(t => doc.splitTextToSize(t, breite).forEach(z => a1.push({ z, pr: istPr(t) })));
      font('normal', sz); const a2 = []; jo.forEach(t => doc.splitTextToSize(t, breite - 1.6).forEach((z, k) => a2.push({ z, neu: k === 0 })));
      wahl = { sz, lh, a1, a2 };
      if ((a1.length + a2.length) * lh + .6 <= platz + lh * .3) break;
    }
    const maxZ = Math.max(1, Math.floor((platz + wahl.lh * .3) / wahl.lh));
    let n = 0;
    wahl.a1.forEach(e => { if (n >= maxZ) return; font('bold', wahl.sz); farbe(e.pr ? PRFARBE : BLAU); text(e.z, x + 1.8, ty + wahl.lh * .82); ty += wahl.lh; n++; });
    for (let k = 0; k < wahl.a2.length; k++){
      if (n >= maxZ) break;
      const e = wahl.a2[k], letzte = n === maxZ - 1 && k < wahl.a2.length - 1;
      font('normal', wahl.sz); farbe(INK2);
      if (e.neu){ fill(HELL); doc.circle(x + 2.3, ty + wahl.lh * .5, Math.max(.32, wahl.sz * .055), 'F'); }
      text(letzte ? kuerzen(e.z + ' ...', breite - 1.6) : e.z, x + 3.4, ty + wahl.lh * .82);
      ty += wahl.lh; n++;
    }
  }

  /* footer: weeks and body parts, squeezed into one line each */
  const wochen = a.weeks.map(c => 'W' + isoWeek(c.d) + ': ' + c.v).join('  \u00b7  ');
  const teile = ranked(a.part).map(p => p.k + ' ' + p.v).join('  \u00b7  ');
  font('bold', 6.5); farbe(INK2); text('Sessions per week', ML, 201); text('Body parts', ML, 205);
  font('normal', 6.5); farbe(INK3);
  text(kuerzen(wochen || '-', 150), ML + 22, 201); text(kuerzen(teile || '-', 160), ML + 22, 205);
  text((C.name ? C.name + '  /  ' : '') + 'RISE  /  exported ' + deDate(P(TODAY)), W - MR, 205, { align: 'right' });
  doc.setProperties({ title: 'Training report ' + monat, creator: 'RISE' });
  return doc;
}

