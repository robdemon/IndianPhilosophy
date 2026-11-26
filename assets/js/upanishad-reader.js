// Upaniṣad reader: one verse per screen. Book list on the left, verse navigator on top,
// Sanskrit beside the translation, word-by-word and commentaries side by side below.
// Book data loads lazily from assets/js/upanishads/<slug>.js (see Documents/upanishads/).
(function () {
  const BASE = '../assets/js/upanishads/';
  const VER = '20261127';
  const state = { slug: null, flat: [], i: 0, tab: 'coms' };
  let root;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = sel => root.querySelector(sel);

  function load(slug) {
    const D = window.UPANISHAD_DATA || {};
    if (D[slug]) return Promise.resolve(D[slug]);
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = `${BASE}${slug}.js?v=${VER}`;
      s.onload = () => ok(window.UPANISHAD_DATA[slug]);
      s.onerror = () => fail(new Error('Could not load ' + slug));
      document.head.appendChild(s);
    });
  }

  function railHTML() {
    const groups = {};
    window.UPANISHAD_INDEX.forEach(b => (groups[b.group] = groups[b.group] || []).push(b));
    let h = '';
    for (const [g, books] of Object.entries(groups)) {
      h += `<div class="upr-group">${esc(g)}</div><ul>`;
      books.forEach(b => {
        h += `<li><button data-slug="${b.slug}"><span class="upr-bname">${esc(b.name)}</span><span class="upr-bcount">${b.verses}</span></button></li>`;
      });
      h += '</ul>';
    }
    return h;
  }

  function selectHTML() {
    return window.UPANISHAD_INDEX.map(b => `<option value="${b.slug}">${esc(b.name)} · ${b.verses}</option>`).join('');
  }

  function mount(el) {
    root = el;
    root.innerHTML = `
      <div class="upr">
        <nav class="upr-rail" aria-label="Upaniṣads">${railHTML()}</nav>
        <section class="upr-main">
          <select class="upr-select" aria-label="Choose an Upaniṣad">${selectHTML()}</select>
          <header class="upr-head"></header>
          <div class="upr-nav"></div>
          <article class="upr-verse" aria-live="polite"></article>
        </section>
      </div>`;
    root.querySelector('.upr-rail').addEventListener('click', e => {
      const b = e.target.closest('button[data-slug]'); if (b) open(b.dataset.slug);
    });
    root.querySelector('.upr-select').addEventListener('change', e => open(e.target.value));
    document.addEventListener('keydown', e => {
      if (!root.offsetParent || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'j') go(state.i + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'k') go(state.i - 1);
    });
    const deep = (window._deepLink || '').split('/');
    const slug = window.UPANISHAD_INDEX.some(b => b.slug === deep[1]) ? deep[1] : window.UPANISHAD_INDEX[0].slug;
    open(slug, deep[1] === slug && deep[2] ? parseInt(deep[2], 10) : undefined);
  }

  function open(slug, i) {
    state.slug = slug;
    // set the full hash now: a bare #vedanta at page load makes the browser jump to the panel
    history.replaceState(null, '', `#vedanta/${slug}` + (i === undefined ? '' : `/${i}`));
    root.querySelectorAll('.upr-rail button').forEach(b => b.classList.toggle('active', b.dataset.slug === slug));
    $('.upr-select').value = slug;
    $('.upr-verse').innerHTML = '<p class="upr-loading">Loading…</p>';
    load(slug).then(book => {
      if (state.slug !== slug) return;
      state.book = book;
      state.flat = [];
      book.sections.forEach((s, si) => s.u.forEach(u => state.flat.push({ u, si })));
      renderHead();
      // without an explicit verse, start at the first verse rather than the introduction notes
      if (i === undefined || isNaN(i)) i = Math.max(0, state.flat.findIndex(f => f.u.kind !== 'note'));
      go(Math.min(i, state.flat.length - 1), true);
    }).catch(err => { $('.upr-verse').innerHTML = `<p class="upr-loading">${esc(err.message)}</p>`; });
  }

  function renderHead() {
    const b = state.book, meta = window.UPANISHAD_INDEX.find(x => x.slug === b.slug);
    $('.upr-head').innerHTML = `
      <div class="upr-title"><h2>${esc(/Upaniṣad/.test(b.name) ? b.name : b.name + ' Upaniṣad')}</h2><span class="upr-deva" lang="sa">${esc(b.deva)}</span></div>
      <p class="upr-meta">${meta.verses} ${meta.group === 'Overview' ? 'entries' : 'verses'} ·${b.sections.length} sections${b.note ? ' · ' + esc(b.note) : ''}</p>
      ${b.intro.length ? `<details class="upr-about"><summary>About this text</summary>${b.intro.map(p => `<p>${p}</p>`).join('')}</details>` : ''}`;
  }

  function label(u) { return u.ref.replace(/^(Verses?|Mantras?|Kārikā|Khaṇḍa|Anuvāka|Section)\s+/i, ''); }

  function renderNav() {
    const { book, flat, i } = state, cur = flat[i];
    const opts = book.sections.map((s, si) => `<option value="${si}" ${si === cur.si ? 'selected' : ''}>${esc(s.t || book.name)}</option>`).join('');
    let chips = '';
    flat.forEach((f, k) => {
      if (f.si !== cur.si) return;
      const note = f.u.kind === 'note';
      chips += `<button class="upr-chip${k === i ? ' active' : ''}${note ? ' note' : ''}" data-k="${k}" title="${esc(f.u.ref + (f.u.title ? ' — ' + f.u.title : ''))}">${esc(note ? '¶' : label(f.u))}</button>`;
    });
    $('.upr-nav').innerHTML = `
      <div class="upr-navrow">
        ${book.sections.length > 1 ? `<select class="upr-sec" aria-label="Section">${opts}</select>` : ''}
        <span class="upr-pos">${i + 1} / ${flat.length}</span>
        <button class="upr-step" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Previous verse">←</button>
        <button class="upr-step" data-d="1" ${i === flat.length - 1 ? 'disabled' : ''} aria-label="Next verse">→</button>
      </div>
      <div class="upr-chips">${chips}</div>`;
    const sec = $('.upr-sec');
    if (sec) sec.onchange = e => go(flat.findIndex(f => f.si === +e.target.value));
    $('.upr-nav').querySelectorAll('.upr-chip').forEach(c => (c.onclick = () => go(+c.dataset.k)));
    $('.upr-nav').querySelectorAll('.upr-step').forEach(c => (c.onclick = () => go(state.i + +c.dataset.d)));
  }

  function go(i, first) {
    if (i < 0 || i >= state.flat.length) return;
    state.i = i;
    renderNav();
    renderVerse();
    history.replaceState(null, '', `#vedanta/${state.slug}/${i}`);
    if (!first) {
      const top = root.querySelector('.upr-main').getBoundingClientRect().top;
      if (top < 0) window.scrollBy({ top: top - 16 });
    }
    // scroll only the chip strip (scrollIntoView would also move the page)
    const active = $('.upr-chip.active'), strip = $('.upr-chips');
    if (active) { strip.scrollTop = active.offsetTop - 4; strip.scrollLeft = active.offsetLeft - strip.clientWidth / 2; }
  }

  function renderVerse() {
    const u = state.flat[state.i].u;
    const isNote = u.kind === 'note';
    let h = `<div class="upr-vhead"><span class="upr-ref">${esc(u.ref)}</span>${u.title ? `<h3>${esc(u.title)}</h3>` : ''}</div>`;
    if (!isNote && (u.sa.length || u.lit)) {
      h += `<div class="upr-text">
        <div class="upr-sa">
          ${u.sa.map(l => `<p lang="sa">${esc(l)}</p>`).join('')}
          ${(u.iast || []).map(l => `<p class="upr-iast">${esc(l)}</p>`).join('')}
        </div>
        <div class="upr-tr">
          ${u.lit ? `<p class="upr-lit">${u.lit}</p>` : ''}
          ${u.para ? `<p class="upr-para">${u.para}</p>` : ''}
        </div>
      </div>`;
    }
    const tabs = [];
    if (u.coms && u.coms.length) tabs.push(['coms', `Commentaries <span>${u.coms.length}</span>`]);
    if (u.words && u.words.length) tabs.push(['words', `Word by word <span>${u.words.length}</span>`]);
    if (u.notes && u.notes.length) tabs.push(['notes', isNote ? 'Text' : `Notes <span>${u.notes.length}</span>`]);
    if (tabs.length) {
      if (!tabs.some(t => t[0] === state.tab)) state.tab = tabs[0][0];
      h += `<div class="upr-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === state.tab}">${l}</button>`).join('')}</div>
            <div class="upr-pane">${pane(u, state.tab)}</div>`;
    }
    const v = $('.upr-verse');
    v.innerHTML = h;
    v.querySelectorAll('.upr-tabs button').forEach(b => (b.onclick = () => {
      state.tab = b.dataset.tab;
      v.querySelectorAll('.upr-tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
      v.querySelector('.upr-pane').innerHTML = pane(u, state.tab);
    }));
  }

  function pane(u, tab) {
    if (tab === 'coms') return `<div class="upr-coms">${u.coms.map(([n, t]) => `<div class="upr-com"><div class="upr-cname">${esc(n)}</div><div>${t}</div></div>`).join('')}</div>`;
    if (tab === 'words') return `<dl class="upr-words">${u.words.map(([p, g, gl]) => `<div><dt>${esc(p)}</dt><dd>${g ? `<span class="upr-gram">${esc(g)}</span> ` : ''}${esc(gl)}</dd></div>`).join('')}</dl>`;
    return `<div class="upr-notes">${u.notes.map(n => n.startsWith('<pre') || n.startsWith('<table') ? n : `<p>${n}</p>`).join('')}</div>`;
  }

  window.mountUpanishadReader = mount;
})();
