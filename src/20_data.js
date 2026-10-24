/* ================================================================ data */
const DEFAULT_PARTS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];
const DEFAULT_MAP = {
  'Upper Body': ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'], 'Lower Body': ['Legs'],
  'Full Body': ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs'],
  'Push': ['Chest', 'Shoulders', 'Triceps'], 'Pull': ['Back', 'Shoulders', 'Biceps'], 'Legs': ['Legs'],
  'Chest': ['Chest'], 'Back': ['Back']
};
const FOCUS_OPTIONS = ['Upper Body', 'Lower Body', 'Full Body', 'Push', 'Pull', 'Legs', 'Chest', 'Back'];

let DATA = null, C = null, F = null;   /* F: the day on the entry form, written into the log with Log day */
let FILE = { name: '', handle: null };
let KG_CLEANED = 0;

function uid(){ return 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function rangeFromName(name){
  const iso = String(name).match(/\d{4}-\d{2}-\d{2}/g);
  if (iso && iso.length >= 2) return { from: iso[0], to: iso[1] };
  const de = String(name).match(/\d{2}\.\d{2}\.\d{4}/g);
  if (de && de.length >= 2){ const f = de[0].split('.'), t = de[1].split('.'); return { from: f[2]+'-'+f[1]+'-'+f[0], to: t[2]+'-'+t[1]+'-'+t[0] }; }
  return null;
}
/* Takes whatever came out of a file (new .json, or the payload of the old single-file HTML) and makes it current. */
function normalize(raw){
  const d = raw && typeof raw === 'object' ? raw : {};
  if (!d.days || typeof d.days !== 'object') d.days = {};
  if (!Array.isArray(d.sources)) d.sources = [];
  if (!d.config || typeof d.config !== 'object') d.config = {};
  const c = d.config;
  if (!c.weeklyTarget) c.weeklyTarget = 4;
  if (!Array.isArray(c.bodyParts)) c.bodyParts = DEFAULT_PARTS.slice();
  if (!c.map || typeof c.map !== 'object') c.map = klon(DEFAULT_MAP);
  if (!c.aliases || typeof c.aliases !== 'object') c.aliases = {};
  if (!c.colors || typeof c.colors !== 'object') c.colors = {};
  if (typeof c.name !== 'string') c.name = '';
  KG_CLEANED = 0;
  if (!(d.v >= 2)){
    d.sources = d.sources.map(x => {
      if (x && typeof x === 'object') return x;
      const r = rangeFromName(String(x));
      return { id: uid(), name: String(x), added: null, bytes: 0, b64: null, fileRemoved: true, from: r ? r.from : null, to: r ? r.to : null, inferred: true };
    });
    d.sources.forEach(s => { if (!s.from || !s.to) return; for (const k in d.days) if (k >= s.from && k <= s.to) d.days[k].src = s.id; });
    for (const k in d.days){ const r = d.days[k]; if (r && r.kgSrc === 'text' && r.kg != null){ r.kg = null; r.kgSrc = null; KG_CLEANED++; } }
  }
  for (const k in d.days){
    const r = d.days[k];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !r || typeof r !== 'object'){ delete d.days[k]; continue; }
    r.gym = !!r.gym; r.cardio = !!r.cardio; r.stretch = !!r.stretch;
    r.training = String(r.training || ''); r.special = String(r.special || ''); r.journal = String(r.journal || '');
    if (r.kg === '' || r.kg === undefined) r.kg = null;
  }
  /* the Excel archive is gone: everything lives in this file now */
  delete d.sources;
  for (const k in d.days) delete d.days[k].src;
  d.app = 'training-log'; d.v = 4;
  return d;
}
function emptyData(){ return normalize({ days: {}, config: {}, v: 4 }); }

/* an alias points an old split name at the one you decided to keep */
function canon(label){
  let k = String(label || '').trim(); if (!k) return '';
  for (let i = 0; i < 8; i++){
    const a = C.aliases[k.toLowerCase()];
    if (!a || String(a).toLowerCase() === k.toLowerCase()) break;
    k = a;
  }
  return k;
}
function aliasesOf(name){ const out = [], lk = String(name).toLowerCase(); for (const k in C.aliases) if (String(C.aliases[k]).toLowerCase() === lk) out.push(k); return out.sort(); }
function partsOf(label){ const k = canon(label); if (!k) return null; for (const m in C.map) if (m.toLowerCase() === k.toLowerCase()) return C.map[m]; return null; }
function seenSplits(){ const o = {}; for (const k in DATA.days){ const t = (DATA.days[k].training || '').trim(); if (t) o[t] = (o[t] || 0) + 1; } return o; }
function mergeSplits(from, into){
  let n = 0; const lf = from.toLowerCase();
  for (const d in DATA.days) if (String(DATA.days[d].training || '').trim().toLowerCase() === lf){ DATA.days[d].training = into; n++; }
  const srcParts = C.map[from] || [];
  if (!C.map[into]) C.map[into] = [];
  if (!C.map[into].length && srcParts.length) C.map[into] = srcParts.slice();
  delete C.map[from];
  if (C.colors[from] && !C.colors[into]) C.colors[into] = C.colors[from];
  delete C.colors[from];
  for (const a in C.aliases) if (String(C.aliases[a]).toLowerCase() === lf) C.aliases[a] = into;
  C.aliases[lf] = into;
  delete C.aliases[String(into).toLowerCase()];
  return n;
}
function normKey(s){
  return String(s || '').toLowerCase().replace(/[()\[\]{}]/g, ' ').replace(/[&,\/]/g, '+').replace(/[^a-z0-9+ ]/g, ' ')
    .split('+').map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).sort().join('+');
}
function mergeCandidates(){
  const seen = seenSplits(), names = {};
  for (const k in C.map) names[k] = seen[k] || 0;
  for (const s in seen) if (!(s in names)) names[s] = seen[s];
  const byKey = {};
  for (const nm in names){ const kk = normKey(nm); if (kk) (byKey[kk] = byKey[kk] || []).push({ name: nm, n: names[nm] }); }
  const out = [];
  for (const g in byKey) if (byKey[g].length > 1){ byKey[g].sort((a, b) => b.n - a.n || (a.name < b.name ? -1 : 1)); out.push(byKey[g]); }
  return out.sort((a, b) => a[0].name.toLowerCase() < b[0].name.toLowerCase() ? -1 : 1);
}

/* colours: every split uses the theme's gym colour (token) */
const GYM = 'var(--gym)';
function colorOf(){ return GYM; }

