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
/* hosted (GitHub Pages): the web manifest for the home screen. Opened as a local file, nothing of this is loaded. */
if (location.protocol === 'https:') document.head.appendChild(h('link', { rel: 'manifest', href: 'manifest.webmanifest' }));
zeigeStart();
})();
</script>
</body>
</html>
