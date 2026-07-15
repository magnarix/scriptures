/* ANSWERED PRAYERS — reader behaviour */
(function () {
  'use strict';
  var root = document.documentElement;
  var LS = window.localStorage;

  /* ---- Theme ---- */
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
  }
  try { applyTheme(LS.getItem('ap:theme')); } catch (e) {}

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { LS.setItem('ap:theme', next); } catch (e) {}
  }
  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  /* ---- Drawer ---- */
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('scrim');
  var menuBtn = document.getElementById('menuBtn');
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open'); scrim.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    var cur = drawer.querySelector('a.current');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open'); scrim.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  if (scrim) scrim.addEventListener('click', closeDrawer);
  var drawerClose = document.getElementById('drawerClose');
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);

  /* ---- Reading progress + position memory ---- */
  var pb = document.getElementById('pb');
  var slug = document.body.getAttribute('data-slug');
  var title = document.body.getAttribute('data-title');

  function docProgress() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    return max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
  }
  var ticking = false, saveT = 0;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var p = docProgress();
      if (pb) pb.style.width = (p * 100).toFixed(2) + '%';
      var now = Date.now ? Date.now() : (+new Date());
      if (slug && now - saveT > 400) {
        saveT = now;
        try {
          LS.setItem('ap:last', JSON.stringify({ slug: slug, title: title, p: p, t: now }));
        } catch (e) {}
      }
      ticking = false;
    });
  }
  if (slug) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    /* resume: if returning to the exact chapter we left, restore position */
    try {
      var last = JSON.parse(LS.getItem('ap:last') || 'null');
      var wantResume = /[?#]resume/.test(location.href);
      if (last && last.slug === slug && wantResume && last.p > 0.02 && last.p < 0.985) {
        window.requestAnimationFrame(function () {
          var h = document.documentElement;
          window.scrollTo(0, last.p * (h.scrollHeight - h.clientHeight));
        });
      }
    } catch (e) {}
  }

  /* ---- Cover: continue-reading ---- */
  var cont = document.getElementById('continueBtn');
  if (cont) {
    try {
      var lastc = JSON.parse(LS.getItem('ap:last') || 'null');
      if (lastc && lastc.slug && lastc.slug !== 'cover') {
        cont.href = 'read/' + lastc.slug + '.html?resume';
        cont.querySelector('.lbl').textContent = 'Continue — ' + lastc.title;
        cont.style.display = '';
      }
    } catch (e) {}
  }

  /* ---- Keyboard navigation ---- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.key === 'ArrowRight') { var n = document.querySelector('a.next:not(.disabled)'); if (n) location.href = n.href; }
    else if (e.key === 'ArrowLeft') { var p = document.querySelector('a.prev:not(.disabled)'); if (p) location.href = p.href; }
    else if (e.key === 'Escape') closeDrawer();
    else if (e.key.toLowerCase() === 't') toggleTheme();
    else if (e.key.toLowerCase() === 'c' && menuBtn) { drawer.classList.contains('open') ? closeDrawer() : openDrawer(); }
  });
})();
