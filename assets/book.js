/* ANSWERED PRAYERS — reader behaviour: theme, drawer, share, paginated book */
(function () {
  'use strict';
  var root = document.documentElement;
  var LS = window.localStorage;
  var body = document.body;
  var slug = body.getAttribute('data-slug');
  var title = body.getAttribute('data-title');
  var now = function () { return Date.now ? Date.now() : (+new Date()); };

  /* ---------- Theme ---------- */
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
  }
  try { applyTheme(LS.getItem('ap:theme')); } catch (e) {}
  function currentTheme() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function toggleTheme() {
    var n = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(n); try { LS.setItem('ap:theme', n); } catch (e) {}
  }
  each('#themeBtn', function (b) { b.addEventListener('click', toggleTheme); });

  /* ---------- Toast ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------- Share ---------- */
  function doShare() {
    var url = location.href.split('#')[0];
    var data = { title: 'Answered Prayers' + (title ? ' — ' + title : ''),
      text: 'Answered Prayers: What God Really Says When We Ask, by Rev. Basilius Magnus', url: url };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast('Link copied to clipboard'); },
        function () { prompt('Copy this link:', url); });
    } else { prompt('Copy this link:', url); }
  }
  each('.shareBtn', function (b) { b.addEventListener('click', doShare); });

  /* ---------- Drawer ---------- */
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('scrim');
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open'); scrim.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    var cur = drawer.querySelector('a.current'); if (cur) cur.scrollIntoView({ block: 'center' });
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open'); scrim.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
  }
  each('#menuBtn', function (b) { b.addEventListener('click', openDrawer); });
  each('#drawerClose', function (b) { b.addEventListener('click', closeDrawer); });
  if (scrim) scrim.addEventListener('click', closeDrawer);

  /* ---------- Cover: continue-reading ---------- */
  var cont = document.getElementById('continueBtn');
  if (cont) {
    try {
      var lastc = JSON.parse(LS.getItem('ap:last') || 'null');
      if (lastc && lastc.slug && lastc.slug !== 'cover') {
        cont.href = 'read/' + lastc.slug + '.html#resume';
        cont.querySelector('.lbl').textContent = 'Continue — ' + lastc.title;
        cont.style.display = '';
      }
    } catch (e) {}
  }

  /* ---------- Paginated book reader ---------- */
  var book = document.getElementById('book');
  var pagesEl = document.getElementById('pages');
  var pbBar = document.getElementById('pb');

  if (book && pagesEl) {
    var page = 0, totalPages = 1, step = 1, twoCol = false;
    var pgNow = document.getElementById('pgNow'), pgTotal = document.getElementById('pgTotal');
    var edgeL = document.getElementById('edgeL'), edgeR = document.getElementById('edgeR');
    var pgPrev = document.getElementById('pgPrev'), pgNext = document.getElementById('pgNext');
    var prevUrl = body.getAttribute('data-prev'), nextUrl = body.getAttribute('data-next');

    var measureTries = 0;
    function measure(keepRatio) {
      var ratio = totalPages > 1 ? page / (totalPages - 1) : 0;
      var W = book.clientWidth;
      if (W < 60) {                     // not laid out yet — defer, never divide by ~0
        if (measureTries++ < 60) requestAnimationFrame(function () { measure(keepRatio); });
        return;
      }
      measureTries = 0;
      twoCol = W >= 880;
      book.classList.toggle('two-col', twoCol);
      var colsPer = twoCol ? 2 : 1;
      var gap = twoCol ? Math.round(Math.min(96, Math.max(44, W * 0.06))) : 0;
      var colW = twoCol ? Math.floor((W - gap) / 2) : W;
      book.style.setProperty('--colgap', gap + 'px');
      pagesEl.style.columnGap = gap + 'px';
      pagesEl.style.columnWidth = colW + 'px';
      pagesEl.style.transform = 'none';
      var sw = pagesEl.scrollWidth;
      step = colsPer * (colW + gap);
      if (step < 20) { totalPages = 1; page = 0; render(false); return; }  // safety
      totalPages = Math.max(1, Math.round(sw / step));
      var cap = 400;
      while ((totalPages) * step - gap < sw - 2 && totalPages < cap) totalPages++;
      while (totalPages > 1 && (totalPages - 1) * step >= sw + gap) totalPages--;
      page = keepRatio ? Math.round(ratio * (totalPages - 1)) : page;
      if (page > totalPages - 1) page = totalPages - 1;
      if (page < 0) page = 0;
      render(false);
    }

    function render(animate) {
      pagesEl.style.transition = animate ? '' : 'none';
      pagesEl.style.transform = 'translateX(' + (-page * step) + 'px)';
      if (!animate) { void pagesEl.offsetWidth; pagesEl.style.transition = ''; }
      if (pgNow) pgNow.textContent = (page + 1);
      if (pgTotal) pgTotal.textContent = totalPages;
      var atStart = page <= 0, atEnd = page >= totalPages - 1;
      if (edgeL) edgeL.disabled = atStart && !prevUrl;
      if (edgeR) edgeR.disabled = atEnd && !nextUrl;
      if (pgPrev) pgPrev.disabled = atStart && !prevUrl;
      if (pgNext) pgNext.disabled = atEnd && !nextUrl;
      var prog = totalPages > 1 ? (page + 1) / totalPages : 1;
      if (pbBar) pbBar.style.width = (prog * 100).toFixed(1) + '%';
      try { LS.setItem('ap:last', JSON.stringify({ slug: slug, title: title, page: page, pages: totalPages, t: now() })); } catch (e) {}
    }

    function goNext() {
      if (page < totalPages - 1) { page++; render(true); }
      else if (nextUrl) location.href = nextUrl;
    }
    function goPrev() {
      if (page > 0) { page--; render(true); }
      else if (prevUrl) location.href = prevUrl + '#end';
    }

    if (edgeL) edgeL.addEventListener('click', goPrev);
    if (edgeR) edgeR.addEventListener('click', goNext);
    if (pgPrev) pgPrev.addEventListener('click', goPrev);
    if (pgNext) pgNext.addEventListener('click', goNext);

    /* wheel -> page (no vertical scroll in book mode) */
    var wheelLock = 0;
    book.addEventListener('wheel', function (e) {
      e.preventDefault();
      var t = now(); if (t - wheelLock < 480) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 12) return;
      wheelLock = t; (d > 0 ? goNext : goPrev)();
    }, { passive: false });

    /* touch swipe */
    var tx = 0, ty = 0, tt = 0;
    book.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; tt = now();
    }, { passive: true });
    book.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
      if (now() - tt < 800 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        (dx < 0 ? goNext : goPrev)();
      }
    }, { passive: true });

    /* keyboard */
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); goPrev(); }
      else if (e.key === 'Home') { page = 0; render(true); }
      else if (e.key === 'End') { page = totalPages - 1; render(true); }
      else if (e.key === 'Escape') closeDrawer();
      else if (e.key.toLowerCase && e.key.toLowerCase() === 't') toggleTheme();
      else if (e.key.toLowerCase && e.key.toLowerCase() === 'c') { drawer && drawer.classList.contains('open') ? closeDrawer() : openDrawer(); }
    });

    /* resize (debounced) */
    var rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { measure(true); }, 180); });

    function start() {
      body.classList.add('book-mode');
      book.classList.add('paginated');
      measure(false);
      // restore position
      var hash = location.hash;
      if (hash === '#end') { page = totalPages - 1; render(false); }
      else if (hash === '#resume') {
        try {
          var last = JSON.parse(LS.getItem('ap:last') || 'null');
          if (last && last.slug === slug && last.page > 0) { page = Math.min(last.page, totalPages - 1); render(false); }
        } catch (e) {}
      }
    }
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(start); setTimeout(function () { if (!body.classList.contains('book-mode')) start(); }, 700); }
    else start();
  } else {
    /* fallback (no book container): simple scroll progress + chapter nav keys */
    function docProg() { var h = root; var m = h.scrollHeight - h.clientHeight; return m > 0 ? h.scrollTop / m : 0; }
    window.addEventListener('scroll', function () { if (pbBar) pbBar.style.width = (docProg() * 100).toFixed(1) + '%'; }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') { var n = document.querySelector('a.next:not(.disabled)'); if (n) location.href = n.href; }
      else if (e.key === 'ArrowLeft') { var p = document.querySelector('a.prev:not(.disabled)'); if (p) location.href = p.href; }
      else if (e.key === 'Escape') closeDrawer();
    });
  }

  function each(sel, fn) { var els = document.querySelectorAll(sel); for (var i = 0; i < els.length; i++) fn(els[i]); }
})();
