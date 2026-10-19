<script>
/* Training log — front end. All data sits in DATA and is written to its own .json file; the DOM is disposable. */
(function(){
'use strict';

/* ================================================================ helpers */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const BEWEGUNG = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const TOUCH = !!(window.matchMedia && window.matchMedia('(hover:none) and (pointer:coarse)').matches);

function h(tag, attrs, kids){
  const e = document.createElement(tag);
  for (const a in (attrs || {})){
    const v = attrs[a];
    if (v === null || v === undefined || v === false) continue;
    if (a === 'class') e.className = v;
    else if (a === 'html') e.innerHTML = v;
    else if (a === 'text') e.textContent = v;
    else if (a === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (a.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(a.slice(2), v);
    else e.setAttribute(a, v === true ? '' : v);
  }
  (kids || []).forEach(k => { if (k !== null && k !== undefined && k !== false) e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k); });
  return e;
}
const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, kids){
  const e = document.createElementNS(NS, tag);
  for (const a in (attrs || {})) if (attrs[a] !== null && attrs[a] !== undefined) e.setAttribute(a, attrs[a]);
  (kids || []).forEach(k => k && e.appendChild(k));
  return e;
}
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
function n1(x){ return (Math.round(x * 10) / 10).toFixed(1); }
function n2(x){ return (Math.round(x * 100) / 100).toFixed(2); }
function sgn(x){ return x > 0 ? '+' : (x < 0 ? '\u2212' : '\u00b1'); }
function plural(n, one, many){ return n + ' ' + (n === 1 ? one : (many || one + 's')); }
function klon(o){ return JSON.parse(JSON.stringify(o)); }

/* dates: everything in UTC midnight, days are ISO strings */
const DAY = 86400000;
const P = iso => new Date(iso + 'T00:00:00Z');
const ISO = d => d.toISOString().slice(0, 10);
const add = (d, n) => new Date(d.getTime() + n * DAY);
const dow = d => (d.getUTCDay() + 6) % 7;            // 0 = Monday
const monday = d => add(d, -dow(d));
function deDate(d){ const p = ISO(d).split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
function deShort(d){ const p = ISO(d).split('-'); return p[2] + '.' + p[1] + '.'; }
function isoWeek(d){
  const t = new Date(d.getTime()); t.setUTCDate(t.getUTCDate() - dow(d) + 3);
  const f = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  f.setUTCDate(f.getUTCDate() - ((f.getUTCDay() + 6) % 7) + 3);
  return 1 + Math.round((t - f) / (7 * DAY));
}
function lokalHeute(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const TODAY = lokalHeute();
const DAYNAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MSHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

