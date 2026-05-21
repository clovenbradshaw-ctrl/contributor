/* =========================================================================
   THE CONTRIBUTOR — Search Modal
   Searches two content types:
     • Articles  — newspaper content from /wp/v2/posts
     • Pages     — static pages from /wp/v2/pages
   Combines WP server-side search with client-side fuzzy re-ranking so
   misspellings and partial matches still surface results.
   ========================================================================= */
(function () {
  'use strict';

  const WP_BASE = 'https://thecontributor.org';
  const API = WP_BASE + '/wp-json/wp/v2';

  /* ---------- styles + markup ---------- */
  const css = `
    .search-modal {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: flex-start; justify-content: center;
      padding: 60px 20px 20px;
      opacity: 0; pointer-events: none;
      transition: opacity .18s ease;
    }
    .search-modal[data-open="true"] { opacity: 1; pointer-events: auto; }
    .search-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,.55);
      backdrop-filter: blur(2px);
    }
    .search-panel {
      position: relative;
      width: 100%;
      max-width: 760px;
      background: var(--white, #fff);
      border: 1px solid var(--ink, #222);
      box-shadow: 8px 8px 0 0 var(--ink, #222);
      max-height: calc(100vh - 80px);
      display: flex; flex-direction: column;
      transform: translateY(-12px);
      transition: transform .2s ease;
    }
    .search-modal[data-open="true"] .search-panel { transform: translateY(0); }
    .search-header {
      display: flex; align-items: center; gap: 12px;
      padding: 18px 22px;
      border-bottom: 1px solid var(--border, #BEBEBE);
    }
    .search-header > svg { width: 22px; height: 22px; color: var(--text-muted, #808080); flex: 0 0 22px; }
    .search-input {
      flex: 1; background: none; border: 0; outline: 0;
      padding: 6px 0;
      font-family: var(--font-sans, system-ui), sans-serif;
      font-size: 20px;
      color: var(--ink, #222);
      min-width: 0;
    }
    .search-input::placeholder { color: var(--text-muted, #808080); }
    .search-close {
      background: var(--bg, #F5F5F5);
      border: 1px solid var(--border, #BEBEBE);
      padding: 4px 10px;
      font-family: var(--font-sans, system-ui), sans-serif;
      font-size: 12px; font-weight: 700;
      letter-spacing: .05em;
      color: var(--text-body, #484848);
      cursor: pointer;
      flex: 0 0 auto;
    }
    .search-close:hover { background: var(--ink, #222); color: var(--white, #fff); border-color: var(--ink, #222); }

    .search-tabs {
      display: flex; gap: 0;
      border-bottom: 1px solid var(--border, #BEBEBE);
      padding: 0 22px;
    }
    .search-tab {
      background: none; border: 0;
      padding: 14px 16px;
      font-family: var(--font-sans, system-ui), sans-serif;
      font-style: italic;
      font-weight: 500;
      font-size: 14px;
      letter-spacing: .05em;
      text-transform: uppercase;
      color: var(--text-muted, #808080);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .search-tab[data-active="true"] {
      color: var(--ink, #222);
      border-bottom-color: var(--yellow, #FFC525);
    }
    .search-tab .count {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 6px;
      background: var(--bg, #F5F5F5);
      border-radius: 999px;
      font-size: 11px;
      font-style: normal;
      color: var(--text-body, #484848);
    }

    .search-results {
      flex: 1; overflow-y: auto;
      padding: 4px 0 12px;
    }
    .search-empty,
    .search-loading,
    .search-noresults {
      padding: 36px 22px;
      text-align: center;
      font-family: var(--font-serif, Georgia), serif;
      font-style: italic;
      color: var(--text-muted, #808080);
      font-size: 15px;
    }
    .search-noresults strong { font-style: normal; color: var(--ink, #222); }

    .search-result {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 22px;
      cursor: pointer;
      text-decoration: none;
      color: var(--ink, #222);
      border-left: 3px solid transparent;
      transition: background .12s, border-color .12s;
    }
    .search-result:hover,
    .search-result.is-active {
      background: var(--bg, #F5F5F5);
      border-left-color: var(--yellow, #FFC525);
    }
    .search-result .thumb {
      width: 64px; height: 64px;
      flex: 0 0 64px;
      background: var(--yellow, #FFC525);
      object-fit: cover;
      object-position: 50% 30%;
      display: block;
    }
    .search-result .thumb.placeholder {
      display: flex; align-items: center; justify-content: center;
      color: var(--yellow-soft, #FFDD72);
      font-family: var(--font-serif, Georgia), serif;
      font-style: italic;
      font-weight: 700;
      font-size: 32px;
      line-height: 1;
    }
    .search-result .thumb.page {
      background: var(--ink, #222);
      color: var(--yellow, #FFC525);
    }
    .search-result .body { min-width: 0; flex: 1; }
    .search-result .title {
      font-family: var(--font-sans, system-ui), sans-serif;
      font-weight: 700;
      font-size: 17px;
      line-height: 1.3;
      color: var(--ink, #222);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .search-result .title mark {
      background: var(--yellow-soft, #FFDD72);
      color: inherit;
      padding: 0 1px;
    }
    .search-result .meta {
      font-family: var(--font-sans, system-ui), sans-serif;
      font-size: 13px;
      color: var(--text-muted, #808080);
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .search-result .meta .kind {
      display: inline-block;
      font-style: italic;
      font-weight: 500;
      color: var(--blue, #2275BB);
      letter-spacing: .05em;
      text-transform: uppercase;
      font-size: 11px;
      margin-right: 8px;
    }

    .search-hint {
      padding: 12px 22px;
      font-family: var(--font-sans, system-ui), sans-serif;
      font-size: 12px;
      color: var(--text-muted, #808080);
      border-top: 1px solid var(--border, #BEBEBE);
      display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;
    }
    .search-hint kbd {
      font-family: ui-monospace, monospace;
      font-size: 11px;
      background: var(--bg, #F5F5F5);
      border: 1px solid var(--border, #BEBEBE);
      padding: 1px 6px;
      border-radius: 3px;
    }
    @media (max-width: 600px) {
      .search-modal { padding: 16px; }
      .search-panel { box-shadow: 4px 4px 0 0 var(--ink, #222); }
      .search-input { font-size: 18px; }
      .search-hint { display: none; }
    }
  `;

  const html = `
    <div class="search-backdrop" data-close></div>
    <div class="search-panel" role="dialog" aria-label="Search The Contributor">
      <div class="search-header">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
          <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <input type="search" class="search-input" placeholder="Search articles or pages…" autocomplete="off" />
        <button class="search-close" data-close type="button">ESC</button>
      </div>
      <div class="search-tabs" role="tablist">
        <button class="search-tab" data-scope="all"      data-active="true" role="tab">All <span class="count"></span></button>
        <button class="search-tab" data-scope="articles" role="tab">Articles <span class="count"></span></button>
        <button class="search-tab" data-scope="pages"    role="tab">Pages <span class="count"></span></button>
      </div>
      <div class="search-results" id="search-results">
        <div class="search-empty">Start typing to search articles &amp; pages</div>
      </div>
      <div class="search-hint">
        <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
        <span><kbd>↵</kbd> Open</span>
        <span><kbd>⇥</kbd> Switch scope</span>
        <span><kbd>Esc</kbd> Close</span>
      </div>
    </div>
  `;

  /* ---------- helpers ---------- */
  function decode(s) {
    const t = document.createElement('textarea');
    t.innerHTML = s || '';
    return t.value;
  }
  function strip(s) {
    const d = document.createElement('div');
    d.innerHTML = s || '';
    return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function fmtDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function debounce(fn, ms) {
    let t;
    return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  }
  function getThumb(post) {
    const m = post._embedded && post._embedded['wp:featuredmedia'];
    if (!m || !m[0] || m[0].code === 'rest_forbidden') return null;
    const media = m[0];
    const sizes = media.media_details && media.media_details.sizes;
    if (sizes) {
      return (sizes.thumbnail && sizes.thumbnail.source_url)
          || (sizes.medium && sizes.medium.source_url)
          || media.source_url || null;
    }
    return media.source_url || null;
  }

  /* ---------- fuzzy matching ---------- */
  // Score how well `q` matches `text`. Higher = better. 0 means no useful match.
  // Combines: exact substring, subsequence order, word-start bonus, edit-distance.
  function fuzzyScore(q, text) {
    if (!q || !text) return 0;
    const Q = q.toLowerCase();
    const T = text.toLowerCase();

    // Exact phrase match — biggest signal
    if (T.includes(Q)) {
      // Bonus if it starts a word
      const idx = T.indexOf(Q);
      const startBonus = idx === 0 || /\s|^|[\-_]/.test(T[idx - 1]) ? 30 : 0;
      return 100 + startBonus + Math.max(0, 50 - idx);
    }

    // Subsequence — each query char appears in order
    let qi = 0, hits = 0, streak = 0, lastIdx = -1, wordStarts = 0;
    for (let i = 0; i < T.length && qi < Q.length; i++) {
      if (T[i] === Q[qi]) {
        hits++;
        if (i === lastIdx + 1) streak++;
        if (i === 0 || /\s|[\-_]/.test(T[i - 1])) wordStarts++;
        lastIdx = i;
        qi++;
      }
    }
    if (hits === Q.length) {
      return 40 + streak * 4 + wordStarts * 6 - Math.min(20, T.length / 10 | 0);
    }

    // Per-word edit-distance for typo tolerance
    const words = T.split(/\s+/);
    let bestEd = Infinity;
    for (const w of words) {
      if (Math.abs(w.length - Q.length) > 2) continue;
      const ed = lev(Q, w);
      if (ed < bestEd) bestEd = ed;
    }
    if (bestEd <= Math.max(1, Math.floor(Q.length / 4))) {
      return Math.max(0, 25 - bestEd * 5);
    }

    return 0;
  }

  // Levenshtein edit distance (small strings only)
  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const dp = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) dp[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let prev = i - 1, tmp;
      dp[0] = i;
      for (let j = 1; j <= b.length; j++) {
        tmp = dp[j];
        dp[j] = a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = tmp;
      }
    }
    return dp[b.length];
  }

  // Highlight matched substrings (whole query or each query char)
  function highlight(text, q) {
    if (!q || !text) return escapeHTML(text);
    const T = text;
    const Tl = T.toLowerCase();
    const Q = q.toLowerCase();
    const idx = Tl.indexOf(Q);
    if (idx >= 0) {
      return escapeHTML(T.slice(0, idx))
        + '<mark>' + escapeHTML(T.slice(idx, idx + Q.length)) + '</mark>'
        + escapeHTML(T.slice(idx + Q.length));
    }
    // Fallback: highlight subsequence chars
    let out = '', qi = 0;
    for (let i = 0; i < T.length; i++) {
      if (qi < Q.length && Tl[i] === Q[qi]) {
        out += '<mark>' + escapeHTML(T[i]) + '</mark>';
        qi++;
      } else {
        out += escapeHTML(T[i]);
      }
    }
    return out;
  }

  /* ---------- modal lifecycle ---------- */
  let modal, input, results, tabsEl, lastQuery = '', scope = 'all', cursor = -1;
  let currentResults = { articles: [], pages: [] };

  function mount() {
    if (modal) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    modal = document.createElement('div');
    modal.className = 'search-modal';
    modal.id = 'search-modal';
    modal.innerHTML = html;
    document.body.appendChild(modal);

    input = modal.querySelector('.search-input');
    results = modal.querySelector('#search-results');
    tabsEl = modal.querySelectorAll('.search-tab');

    modal.addEventListener('click', e => {
      if (e.target.matches('[data-close]')) close();
    });
    input.addEventListener('input', debounce(onInput, 220));
    input.addEventListener('keydown', onKey);
    tabsEl.forEach(t => t.addEventListener('click', () => setScope(t.getAttribute('data-scope'))));
    document.addEventListener('keydown', onGlobalKey);
  }

  function open() {
    mount();
    modal.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { input.focus(); input.select(); }, 60);
  }
  function close() {
    if (!modal) return;
    modal.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
  }
  function setScope(s) {
    scope = s;
    tabsEl.forEach(t => t.setAttribute('data-active', t.getAttribute('data-scope') === s ? 'true' : 'false'));
    paint();
  }

  function onGlobalKey(e) {
    if (e.key === 'Escape' && modal && modal.getAttribute('data-open') === 'true') close();
    // Cmd/Ctrl+K to open
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      open();
    }
  }
  function onKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = results.querySelectorAll('.search-result');
      if (!items.length) return;
      cursor += (e.key === 'ArrowDown' ? 1 : -1);
      cursor = (cursor + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('is-active', i === cursor));
      items[cursor].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const active = results.querySelector('.search-result.is-active') || results.querySelector('.search-result');
      if (active) { e.preventDefault(); location.href = active.getAttribute('href'); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const order = ['all', 'articles', 'pages'];
      const idx = order.indexOf(scope);
      setScope(order[(idx + (e.shiftKey ? -1 : 1) + order.length) % order.length]);
    }
  }

  /* ---------- search ---------- */
  async function onInput() {
    const q = input.value.trim();
    if (q === lastQuery) return;
    lastQuery = q;
    cursor = -1;

    if (!q) {
      currentResults = { articles: [], pages: [] };
      results.innerHTML = '<div class="search-empty">Start typing to search articles &amp; pages</div>';
      updateCounts();
      return;
    }
    if (q.length < 2) {
      results.innerHTML = '<div class="search-empty">Keep typing…</div>';
      return;
    }
    results.innerHTML = '<div class="search-loading">Searching…</div>';

    // Fetch from two sources in parallel. Pull more than we'll show so fuzzy
    // re-ranking has material to work with.
    const articlesUrl = `${API}/posts?search=${encodeURIComponent(q)}&_embed=true&per_page=20&_fields=id,date,slug,title,excerpt,_embedded`;
    const pagesUrl    = `${API}/pages?search=${encodeURIComponent(q)}&per_page=15&_fields=id,slug,title,excerpt`;

    const settled = await Promise.allSettled([
      fetch(articlesUrl).then(r => r.ok ? r.json() : []),
      fetch(pagesUrl).then(r => r.ok ? r.json() : [])
    ]);
    if (lastQuery !== q) return; // stale

    const articles = settled[0].status === 'fulfilled' ? (settled[0].value || []) : [];
    const pages    = settled[1].status === 'fulfilled' ? (settled[1].value || []) : [];

    // Score + sort
    const scored = (items, getText, kind) => items
      .map(item => {
        const titleText = decode((item.title && item.title.rendered) || '');
        const exText    = strip((item.excerpt && item.excerpt.rendered) || '');
        const titleScore   = fuzzyScore(q, titleText) * 3;       // title matches weighted heavily
        const excerptScore = fuzzyScore(q, exText);
        const totalScore = titleScore + excerptScore;
        return { item, titleText, exText, score: totalScore, kind };
      })
      .filter(r => r.score > 0 || items.length < 4)              // keep server-trusted results if fuzzy fails
      .sort((a, b) => b.score - a.score);

    currentResults = {
      articles: scored(articles, p => decode(p.title.rendered), 'article'),
      pages: scored(pages, p => decode(p.title.rendered), 'page'),
    };
    paint();
  }

  function updateCounts() {
    const counts = { all: currentResults.articles.length + currentResults.pages.length,
                     articles: currentResults.articles.length,
                     pages: currentResults.pages.length };
    tabsEl.forEach(t => {
      const s = t.getAttribute('data-scope');
      const span = t.querySelector('.count');
      span.textContent = counts[s] > 0 ? counts[s] : '';
    });
  }

  function paint() {
    updateCounts();
    const q = lastQuery;
    if (!q) {
      results.innerHTML = '<div class="search-empty">Start typing to search articles &amp; pages</div>';
      return;
    }
    let toShow = [];
    if (scope === 'all') {
      // Interleave: take top of each, weighted by score
      toShow = [...currentResults.articles, ...currentResults.pages]
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
    } else if (scope === 'articles') {
      toShow = currentResults.articles.slice(0, 15);
    } else {
      toShow = currentResults.pages.slice(0, 15);
    }

    if (!toShow.length) {
      results.innerHTML = `<div class="search-noresults">No matches for &ldquo;<strong>${escapeHTML(q)}</strong>&rdquo;.<br>Try a shorter query or check spelling.</div>`;
      return;
    }
    results.innerHTML = '';
    toShow.forEach(r => results.appendChild(buildResult(r, q)));
    // Auto-select first
    const first = results.querySelector('.search-result');
    if (first) { first.classList.add('is-active'); cursor = 0; }
  }

  function buildResult(scored, q) {
    const { item, titleText, exText, kind } = scored;
    const a = document.createElement('a');
    a.className = 'search-result';

    let href, thumbHTML, kindLabel, meta;

    if (kind === 'article') {
      href = 'article.html?slug=' + encodeURIComponent(item.slug);
      kindLabel = 'Article';
      const thumb = getThumb(item);
      thumbHTML = thumb
        ? `<img class="thumb" src="${thumb}" alt="" loading="lazy" />`
        : `<span class="thumb placeholder">C</span>`;
      meta = fmtDate(item.date);
    } else {
      href = 'page.html?slug=' + encodeURIComponent(item.slug);
      kindLabel = 'Page';
      thumbHTML = `<span class="thumb placeholder page">¶</span>`;
      meta = exText.slice(0, 90) + (exText.length > 90 ? '…' : '');
    }

    a.href = href;
    a.innerHTML = `
      ${thumbHTML}
      <div class="body">
        <div class="title">${highlight(titleText, q)}</div>
        <div class="meta"><span class="kind">${kindLabel}</span>${escapeHTML(meta)}</div>
      </div>
    `;
    return a;
  }

  /* ---------- wire triggers ---------- */
  function wire() {
    document.querySelectorAll('.search-btn').forEach(btn => {
      btn.onclick = null;
      btn.removeAttribute('onclick');
      // strip any stale listeners by replacing the node
      const fresh = btn.cloneNode(true);
      fresh.onclick = null;
      fresh.removeAttribute('onclick');
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(); });
    });
    document.querySelectorAll('.drawer-item').forEach(el => {
      const label = el.querySelector('.grow');
      if (label && label.textContent.trim().toLowerCase() === 'search') {
        el.onclick = null;
        el.removeAttribute('onclick');
        const fresh = el.cloneNode(true);
        fresh.onclick = null;
        fresh.removeAttribute('onclick');
        el.parentNode.replaceChild(fresh, el);
        fresh.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(); });
      }
    });
  }

  window.openSearch = open;
  window.closeSearch = close;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
