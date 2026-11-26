// Shared verse reader for every text on the reading page (Upaniṣads and the sūtra texts).
// One verse per screen: a list on the left (books, or the sections of a single text), a sticky
// navigator, Sanskrit beside the translation, then commentaries / word-by-word / notes in columns.
//   mountReader(el, { key, books:[{slug,name,deva,group,note,verses}], load: slug => Promise<book> })
// book = { slug, name, deva, note, intro:[html], sections:[{ t, u:[unit] }] }
// unit = { ref, title, sa:[], iast:[], words:[[pada,grammar,gloss]], lit, para, coms:[[name,html]], notes:[html], kind? }
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // stable ink colour per commentator, so a voice keeps its colour from verse to verse
  const INKS = ['#8A5714', '#9F4218', '#2F6B4F', '#34558B', '#6B3F7A', '#7E2E2E', '#4F5B1F', '#1F6670'];
  const inkOf = name => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return INKS[h % INKS.length]; };
  window.readerInk = inkOf;   // the map view colours commentators the same way

  function mountReader(el, cfg) {
    const single = cfg.books.length === 1;
    const st = { slug: null, book: null, flat: [], i: 0, tab: 'coms' };
    const $ = s => el.querySelector(s);

    el.innerHTML = `
      <div class="upr${single ? ' upr-single' : ''}">
        <nav class="upr-rail" aria-label="${single ? 'Sections' : 'Texts'}"></nav>
        <section class="upr-main">
          <select class="upr-select" aria-label="${single ? 'Section' : 'Text'}"></select>
          <header class="upr-head"></header>
          <div class="upr-nav"></div>
          <article class="upr-verse" aria-live="polite"></article>
        </section>
      </div>`;

    function railBooks() {
      const groups = {};
      cfg.books.forEach(b => (groups[b.group || ''] = groups[b.group || ''] || []).push(b));
      $('.upr-rail').innerHTML = Object.entries(groups).map(([g, bs]) =>
        `${g ? `<div class="upr-group">${esc(g)}</div>` : ''}<ul>${bs.map(b =>
          `<li><button data-slug="${b.slug}"><span>${esc(b.name)}</span><span class="upr-bcount">${b.verses}</span></button></li>`).join('')}</ul>`).join('');
      $('.upr-select').innerHTML = cfg.books.map(b => `<option value="${b.slug}">${esc(b.name)} · ${b.verses}</option>`).join('');
    }
    function railSections() {
      const secs = st.book.sections;
      $('.upr-rail').innerHTML = `<div class="upr-group">${esc(st.book.name)}</div><ul>${secs.map((s, si) => {
        const n = s.u.filter(u => u.kind !== 'note').length;
        return `<li><button data-sec="${si}" title="${esc(s.t)}"><span class="upr-slabel">${esc(s.s || s.t || st.book.name)}</span><span class="upr-bcount">${n}</span></button></li>`;
      }).join('')}</ul>`;
      $('.upr-select').innerHTML = secs.map((s, si) => `<option value="${si}">${esc(s.t || st.book.name)}</option>`).join('');
    }
    function markRail() {
      const si = st.flat[st.i] && st.flat[st.i].si;
      el.querySelectorAll('.upr-rail button').forEach(b =>
        b.classList.toggle('active', single ? +b.dataset.sec === si : b.dataset.slug === st.slug));
      $('.upr-select').value = single ? String(si) : st.slug;
    }

    $('.upr-rail').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (single) go(firstOf(+b.dataset.sec)); else open(b.dataset.slug);
    });
    $('.upr-select').addEventListener('change', e => single ? go(firstOf(+e.target.value)) : open(e.target.value));
    document.addEventListener('keydown', e => {
      if (!el.offsetParent || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'j') go(st.i + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'k') go(st.i - 1);
    });
    const firstOf = si => Math.max(0, st.flat.findIndex(f => f.si === si && f.u.kind !== 'note'), st.flat.findIndex(f => f.si === si));

    const hashFor = i => single ? `#${cfg.key}/${i}` : `#${cfg.key}/${st.slug}/${i}`;

    function open(slug, i) {
      st.slug = slug;
      if (!single) history.replaceState(null, '', `#${cfg.key}/${slug}` + (i === undefined ? '' : `/${i}`));
      $('.upr-verse').innerHTML = '<p class="upr-loading">Loading…</p>';
      cfg.load(slug).then(book => {
        if (st.slug !== slug) return;
        st.book = book;
        st.flat = [];
        book.sections.forEach((s, si) => s.u.forEach(u => st.flat.push({ u, si })));
        if (single) railSections();
        renderHead();
        if (i === undefined || isNaN(i)) i = Math.max(0, st.flat.findIndex(f => f.u.kind !== 'note'));
        go(Math.min(i, st.flat.length - 1), true);
      }).catch(err => { $('.upr-verse').innerHTML = `<p class="upr-loading">${esc(err.message)}</p>`; });
    }

    function renderHead() {
      const b = st.book, meta = cfg.books.find(x => x.slug === b.slug);
      const n = meta.verses, noun = meta.noun || 'verses';
      $('.upr-head').innerHTML = `
        <div class="upr-title"><h2>${esc(b.name)}</h2>${b.deva ? `<span class="upr-deva" lang="sa">${esc(b.deva)}</span>` : ''}</div>
        <p class="upr-meta">${n} ${noun}${b.sections.length > 1 ? ` · ${b.sections.length} sections` : ''}${b.note ? ' · ' + esc(b.note) : ''}</p>
        ${b.intro && b.intro.length ? `<details class="upr-about"><summary>About this text</summary>${b.intro.map(p => `<p>${p}</p>`).join('')}</details>` : ''}`;
    }

    const label = u => u.ref.replace(/^(Verses?|Mantras?|Kārikā|Khaṇḍa|Anuvāka|Section|YS|SK|NS|VS|ŚS)\s+/i, '');

    function renderNav() {
      const { book, flat, i } = st, cur = flat[i];
      const opts = book.sections.map((s, si) => `<option value="${si}" ${si === cur.si ? 'selected' : ''}>${esc(s.t || book.name)}</option>`).join('');
      let chips = '';
      flat.forEach((f, k) => {
        if (f.si !== cur.si) return;
        const note = f.u.kind === 'note';
        chips += `<button class="upr-chip${k === i ? ' active' : ''}${note ? ' note' : ''}" data-k="${k}" title="${esc(f.u.ref + (f.u.title ? ' — ' + f.u.title : ''))}">${esc(note ? '¶' : label(f.u))}</button>`;
      });
      $('.upr-nav').innerHTML = `
        <div class="upr-navrow">
          ${!single && book.sections.length > 1 ? `<select class="upr-sec" aria-label="Section">${opts}</select>` : `<span class="upr-sectitle">${esc(book.sections[cur.si].t || '')}</span>`}
          <span class="upr-pos">${i + 1} / ${flat.length}</span>
          <button class="upr-step" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Previous">←</button>
          <button class="upr-step" data-d="1" ${i === flat.length - 1 ? 'disabled' : ''} aria-label="Next">→</button>
        </div>
        <div class="upr-chips">${chips}</div>`;
      const sec = $('.upr-sec');
      if (sec) sec.onchange = e => go(firstOf(+e.target.value));
      el.querySelectorAll('.upr-chip').forEach(c => (c.onclick = () => go(+c.dataset.k)));
      el.querySelectorAll('.upr-step').forEach(c => (c.onclick = () => go(st.i + +c.dataset.d)));
    }

    function go(i, first) {
      if (!st.flat.length || i < 0 || i >= st.flat.length) return;
      st.i = i;
      renderNav(); renderVerse(); markRail();
      history.replaceState(null, '', hashFor(i));
      if (!first) {
        const top = $('.upr-main').getBoundingClientRect().top;
        if (top < 0) window.scrollBy({ top: top - 16 });
      }
      // scroll only the chip strip (scrollIntoView would also move the page)
      const a = $('.upr-chip.active'), strip = $('.upr-chips');
      if (a) { strip.scrollTop = a.offsetTop - 4; strip.scrollLeft = a.offsetLeft - strip.clientWidth / 2; }
    }

    function renderVerse() {
      const u = st.flat[st.i].u, isNote = u.kind === 'note';
      const sa = u.sa || [], iast = u.iast || [];
      let h = `<div class="upr-vhead"><span class="upr-ref">${esc(u.ref)}</span>${u.title ? `<h3>${esc(u.title)}</h3>` : ''}</div>`;
      if (!isNote && (sa.length || iast.length || u.lit)) {
        h += `<div class="upr-text">
          <div class="upr-sa${sa.length ? '' : ' roman'}">
            ${sa.map(l => `<p lang="sa">${esc(l)}</p>`).join('')}
            ${iast.map(l => `<p class="upr-iast">${esc(l)}</p>`).join('')}
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
        if (!tabs.some(t => t[0] === st.tab)) st.tab = tabs[0][0];
        h += `<div class="upr-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === st.tab}">${l}</button>`).join('')}</div>
              <div class="upr-pane">${pane(u, st.tab)}</div>`;
      }
      const v = $('.upr-verse');
      v.innerHTML = h;
      v.querySelectorAll('.upr-tabs button').forEach(b => (b.onclick = () => {
        st.tab = b.dataset.tab;
        v.querySelectorAll('.upr-tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
        v.querySelector('.upr-pane').innerHTML = pane(u, st.tab);
      }));
    }

    function pane(u, tab) {
      if (tab === 'coms') return `<div class="upr-coms">${u.coms.map(([n, t]) =>
        `<div class="upr-com" style="--ink:${inkOf(n)}"><div class="upr-cname">${esc(n)}</div><div>${t}</div></div>`).join('')}</div>`;
      if (tab === 'words') return `<dl class="upr-words">${u.words.map(([p, g, gl]) =>
        `<div><dt>${esc(p)}</dt><dd>${g ? `<span class="upr-gram">${esc(g)}</span> ` : ''}${esc(gl)}</dd></div>`).join('')}</dl>`;
      return `<div class="upr-notes">${u.notes.map(n => /^<(pre|table)/.test(n) ? n : `<p>${n}</p>`).join('')}</div>`;
    }

    if (!single) railBooks();
    const deep = (window._deepLink || '').split('/');
    if (deep[0] === cfg.key) window._deepLink = '';
    if (single) open(cfg.books[0].slug, deep[0] === cfg.key && deep[1] ? parseInt(deep[1], 10) : undefined);
    else {
      const slug = deep[0] === cfg.key && cfg.books.some(b => b.slug === deep[1]) ? deep[1] : cfg.books[0].slug;
      open(slug, deep[0] === cfg.key && deep[1] === slug && deep[2] ? parseInt(deep[2], 10) : undefined);
    }
  }

  // ── Upaniṣads: one file per book under assets/js/upanishads/, loaded on demand ──
  const UP_VER = '20261127';
  function loadUpanishad(slug) {
    const D = window.UPANISHAD_DATA || {};
    if (D[slug]) return Promise.resolve(D[slug]);
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = `../assets/js/upanishads/${slug}.js?v=${UP_VER}`;
      s.onload = () => {
        const b = window.UPANISHAD_DATA[slug];
        if (!/Upaniṣad/.test(b.name)) b.name += ' Upaniṣad';
        ok(b);
      };
      s.onerror = () => fail(new Error('Could not load ' + slug));
      document.head.appendChild(s);
    });
  }
  window.mountUpanishadReader = el => mountReader(el, {
    key: 'vedanta',
    books: window.UPANISHAD_INDEX.map(b => ({ ...b, noun: b.group === 'Overview' ? 'entries' : 'verses' })),
    load: loadUpanishad,
  });

  // ── Sūtra texts: built from the data arrays already on the page ──
  const splitScript = s => {          // "देवनागरी ॥१॥ | atha yoga… ||1||" -> {sa, iast}
    const parts = String(s || '').split(/\s{2,}\|\s{2,}/);
    const sa = [], iast = [];
    parts.forEach(p => (/[ऀ-ॿ]/.test(p) ? sa : iast).push(p.trim()));
    return { sa, iast };
  };
  const words = pairs => (pairs || []).map(p => [p[0], '', p[1]]);
  const coms = cs => (cs || []).map(c => [c.name, esc(c.text)]);
  function group(rows, keyOf, unitOf) {
    const secs = [];
    rows.forEach(r => {
      const k = keyOf(r), full = Array.isArray(k) ? k[0] : k, short = Array.isArray(k) ? k[1] : '';
      if (!secs.length || secs[secs.length - 1].t !== full) secs.push({ t: full, s: short, u: [] });
      secs[secs.length - 1].u.push(unitOf(r));
    });
    return secs;
  }
  // 'Book I — …' + 'Āhnika 1: Topic' -> [full title, '1.1 · Topic'] for the side list
  const ahnikaKey = r => [`${r.book} · ${r.ahnika}`,
    `${r.id.split('.').slice(0, 2).join('.')} · ${r.ahnika.replace(/^Āhnika\s*\d+\s*[:—–-]\s*/, '')}`];
  const SUTRA = {
    yoga: () => ({
      name: 'Yoga Sūtras of Patañjali', deva: 'योगसूत्र', rows: YOGA_SUTRAS,
      sections: group(YOGA_SUTRAS, r => r.pada, r => {
        const s = splitScript(r.sanskrit);
        return { ref: 'YS ' + r.id, title: '', sa: s.sa, iast: s.iast, lit: esc(r.translation), para: '', words: words(r.pairs),
                 coms: coms(r.commentaries), notes: r.cross_ref ? [esc(r.cross_ref)] : [] };
      }),
    }),
    samkhya: () => ({
      name: 'Sāṃkhyakārikā of Īśvarakṛṣṇa', deva: 'साङ्ख्यकारिका', rows: SAMKHYA_SUTRAS,
      sections: group(SAMKHYA_SUTRAS,
        r => r.number <= 9 ? 'SK 1–9 · Purpose and the means of knowledge' : r.number <= 21 ? 'SK 10–21 · Prakṛti and puruṣa'
           : r.number <= 38 ? 'SK 22–38 · The evolution of the tattvas' : r.number <= 59 ? 'SK 39–59 · Subtle body, bondage and the bhāvas'
           : 'SK 60–72 · Liberation and the lineage',
        r => ({ ref: 'SK ' + r.number, title: r.title || '', sa: [], iast: [r.sanskrit], lit: esc(r.translation), para: '',
                words: words(r.pairs), coms: coms(r.commentaries), notes: [] })),
    }),
    nyaya: () => ({
      name: 'Nyāya Sūtras of Gautama', deva: 'न्यायसूत्र', rows: NYAYA_SUTRAS,
      sections: group(NYAYA_SUTRAS, ahnikaKey,
        r => ({ ref: 'NS ' + r.id, title: '', sa: [], iast: [r.sanskrit], lit: esc(r.translation), para: '',
                words: words(r.pairs), coms: coms(r.commentaries), notes: [] })),
    }),
    vaisheshika: () => ({
      name: 'Vaiśeṣika Sūtras of Kaṇāda', deva: 'वैशेषिकसूत्र', rows: VAISESIKA_SUTRAS,
      sections: group(VAISESIKA_SUTRAS, ahnikaKey,
        r => ({ ref: 'VS ' + r.id, title: '', sa: [], iast: [r.sanskrit], lit: esc(r.translation), para: '',
                words: words(r.pairs), coms: coms(r.commentaries), notes: [] })),
    }),
    shiva: () => ({
      name: 'Śiva Sūtras of Vasugupta', deva: 'शिवसूत्र', rows: SHIVA_SUTRAS,
      sections: group(SHIVA_SUTRAS, r => r.book,
        r => ({ ref: 'ŚS ' + r.id, title: r.title || '', sa: [r.sanskrit], iast: r.iast ? [r.iast] : [], lit: esc(r.translation), para: '',
                words: words(r.pairs), coms: coms(r.commentaries), notes: [] })),
    }),
  };
  window.mountSutraReader = (key, el) => {
    if (el._mounted) return;
    el._mounted = true;
    const b = SUTRA[key]();
    const book = { slug: key, name: b.name, deva: b.deva, note: '', intro: [], sections: b.sections };
    mountReader(el, { key, books: [{ slug: key, name: b.name, verses: b.rows.length, noun: key === 'samkhya' ? 'kārikās' : 'sūtras' }],
                      load: () => Promise.resolve(book) });
  };
})();
