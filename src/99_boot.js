/* ================================================================ boot */
Kit.init({
  app: 'training-log', defaultTheme: 'prism', icon: (theme, u) => ICONS.rise(u).replace('<svg ', '<svg width="100%" height="100%" '),
  toolEffects: [
    { id: 'rep', kind: 'signature', tool: 'RISE', name: 'The rep', desc: 'Logging a day stamps a seal: the dumbbell does one rep, a few sparks fly, and a line from the ledger of gains appears. Off: a quiet toast says the same.' }
  ],
  /* a new look: the page is drawn again quietly (no replayed animations), so colours drawn by code follow too */
  onTheme: (id, first) => { if (!first && DATA && $('#shell').classList.contains('on')){ S.firstPaint[S.tab] = true; try { render(); } catch (e){ console.error(e); } } },
  toast: (m, o) => toast(m, !!(o && o.type === 'error'))
});
Kit.initDropdowns('select.select, select.eingabe');
/* an app left open over midnight moves on to the new day; a day with changes on Entry not logged yet stays on the form */
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !DATA) return;
  const neu = lokalHeute(); if (neu === TODAY) return;
  const alt = TODAY; TODAY = neu;
  if (S.tag === alt && !(F && F.changed)){ S.tag = neu; F = null; }
  malWoche();
  if ($('#shell').classList.contains('on')){ malCtl(); render(); }
});
/* hosted (GitHub Pages): the web manifest for the home screen and the offline cache (sw.js), so the home-screen app
   also opens without a signal. Opened as a local file, nothing of this is loaded. */
if (location.protocol === 'https:'){
  document.head.appendChild(h('link', { rel: 'manifest', href: 'manifest.webmanifest' }));
  if ('serviceWorker' in navigator){
    const hatteSchon = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hatteSchon) toast('A new version is ready. Close and reopen the app to use it.'); });
  }
  /* asks the browser to keep this site's storage (the draft) rather than clear it when space runs low */
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
zeigeStart();
})();
</script>
</body>
</html>
