"""Block stream (blocks/*.json) -> one data object per Upanishad (out/<stem>.json).

Unit = a heading whose own content (up to the next heading) holds Devanagari; a unit whose
body carries several '॥ N ॥' markers is split into one unit per marked verse.
Inside a unit: Devanagari -> sa, IAST -> iast, pada table/list -> words, 'Literal:' (or the
first plain English after the verse) -> lit, 'Paraphrase:'/'Theme' -> para, commentators -> coms,
everything else -> notes. Every other heading (front matter, Details, Visual, Practical,
bibliography...) becomes a note-only unit, so nothing in the books is dropped except 'Contents'.
"""
import json, re, html, sys, pathlib
HERE = pathlib.Path(__file__).parent
OUT = HERE / 'build' / 'out'; OUT.mkdir(parents=True, exist_ok=True)

DEVA = re.compile(r'[ऀ-ॿ]')
DIAC = re.compile(r'[āīūṛṝḷṃṁḥṣśṇṭḍñṅĀĪŪṚṢŚṆṬḌÑṄ]')
def deva_ratio(s):
    letters = [c for c in s if c.isalpha()]
    return sum(1 for c in letters if DEVA.match(c)) / max(1, len(letters))

def inline(s):
    """markdown-ish inline -> safe HTML (strong/em only), tolerant of unbalanced '*'."""
    s = html.escape(s.strip(), quote=False)
    s = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><em>\1</em></strong>', s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = s.replace('**', '')
    parts = s.split('*')
    if len(parts) % 2 == 1 and len(parts) > 1:      # balanced single '*': toggle <em>
        s = ''.join(p if i % 2 == 0 else f'<em>{p}</em>' for i, p in enumerate(parts))
    else:
        s = s.replace('*', '')
    s = re.sub(r'(?<![\w])_(?!\s)([^_]+?)(?<!\s)_(?![\w])', r'<em>\1</em>', s)
    return s.replace('\n', '<br>')

def plain(s):
    s = re.sub(r'^>\s?', '', s, flags=re.M)
    return re.sub(r'[*`]', '', s).strip()

def unquote(s):
    return re.sub(r'^>\s?', '', s, flags=re.M).strip()

LABEL = re.compile(r'^\**\s*(literal(?: translation)?|translation|paraphrase(?: & note)?|meaning|english|narration|iast|theme|'
                   r'key concepts|classical commentaries|english translations|public-domain sources|note|notes|'
                   r'word-by-word|word by word|pada-by-pada gloss|commentary)(?:\s*\(([^)]*)\))?\s*[:.]?\**\s*[:.]?\s*', re.I)
JUNK = re.compile(r'^\**(pada-by-pada gloss|word-by-word|commentaries|six-commentary digest|five-commentary digest|commentary digest)[:.]?\**$', re.I)
BRACKET = re.compile(r'^\**⟦([A-Z]+)⟧\s*([^*:]{0,40}?)\**[:.]?\s*')
BRNAME = {'CITED': 'Cited', 'ED': 'Editor', 'UNCERTAIN': 'Uncertain reading', 'NOTE': 'Note'}
MARK = re.compile(r'^[॥|/]{1,2}\s*([०-९\d]+)\s*[॥|/]{1,2}$')
COMHEAD = re.compile(r'commentar|digest', re.I)
WORDHDR = re.compile(r'^(pada|word|term|key term|iast|sanskrit|devan)', re.I)
STRUCT = re.compile(r'^(Brāhmaṇa|Khaṇḍa|Vallī|Adhyāya|Prapāṭhaka|Anuvāka|Praśna|Muṇḍaka|Chapter|§)\b', re.I)
ITRANS = re.compile(r'[a-z](?:M|H|A|I|U|R\^?i|N|T|D|Sh)[a-z ]')
D2A = str.maketrans('०१२३४५६७८९', '0123456789')

def is_iast(x):
    return '|' in x or len(DIAC.findall(x)) / max(1, sum(c.isalpha() for c in x)) > .05 and not re.search(r'\b(the|and|of|is|to|which|that)\b', x) and ':' not in x

def com_name(n):
    n = plain(n).strip().rstrip(':.')
    m = re.match(r'^(.+?)\s*\(([^)]*)\)$', n)
    return (m.group(1), m.group(2)) if m and len(m.group(1)) > 2 else (n, '')

def com_split(x):
    """'- *Name:* text' | 'Name: text' | '**Name.** text' -> (name, text) or None."""
    s = re.sub(r'^\s*[-•]\s*', '', x)
    m = re.match(r'^\*{1,2}([^*]{2,70}?)[:.]?\*{1,2}[:.]?\s+(.+)$', s, re.S) or \
        re.match(r'^([A-ZĀĪŪṚṢŚṆḌṬ][^:\n]{1,60}?):\s+(.+)$', s, re.S)
    if not m or len(m.group(1).split()) > 8: return None
    return m.group(1), m.group(2)

def add_com(u, name, text, sigla):
    """Append a commentary; split fused digests ('<strong>BY</strong> … <strong>De</strong> …')."""
    h = inline(text) if not text.startswith('<') else text
    toks = list(re.finditer(r'<strong>([^<]{1,14})</strong>', h))
    fused = [t for t in toks if t.group(1).strip('/ ') in sigla or (len(toks) >= 2 and len(t.group(1)) <= 6)]
    if len(fused) >= 2 and fused[0].start() < 40:
        for a, b in zip(fused, fused[1:] + [None]):
            key = a.group(1).strip()
            body = h[a.end(): b.start() if b else len(h)].strip(' :.—')
            u['coms'].append([sigla.get(key.split('/')[0], key), body])
        return
    nm, paren = com_name(name)
    body = re.sub(r'^' + re.escape(nm) + r'\s*:\s*', '', h)
    if paren: body = f'<em>({html.escape(paren)})</em> ' + body
    u['coms'].append([nm, body])

def explode(body):
    """One block per line for blockquotes, mixed-script paragraphs and ⟦tag⟧ lines."""
    out = []
    for b in body:
        if b['t'] == 'p' and '\n' in b['x']:
            ls = [l for l in b['x'].split('\n') if l.strip()]
            if len({deva_ratio(l) > .5 for l in ls}) > 1 or all(l.startswith('>') for l in ls) or any('⟦' in l for l in ls[1:]):
                out += [{**b, 'x': l} for l in ls]; continue
        out.append(b)
    return out

def parse_unit(ref, title, body, ctx):
    u = {'ref': ref, 'title': title, 'sa': [], 'iast': [], 'words': [], 'lit': '', 'para': '', 'coms': [], 'notes': []}
    mode = None; prev = None
    for b in explode(body):
        if b['t'] == 'pre':
            u['notes'].append('<pre>' + html.escape(b['x']) + '</pre>'); prev = 'note'; continue
        if b['t'] == 'tbl':
            rows = [r for r in b['rows'] if any(c.strip() for c in r)]
            if not rows: continue
            hdr = rows[0]
            if WORDHDR.match(hdr[0]) and len(hdr) >= 2:
                deva_first = re.match(r'devan', hdr[0], re.I)
                for r in rows[1:]:
                    if len(hdr) >= 4 and re.match(r'iast', hdr[0], re.I): u['words'].append([r[0], r[2], r[3] if len(r) > 3 else ''])
                    elif deva_first and len(r) >= 3: u['words'].append([r[1], r[0], r[2]])
                    elif len(r) >= 3: u['words'].append([r[0], r[1], r[2]])
                    else: u['words'].append([r[0], '', r[-1]])
                prev = 'words'; continue
            if len(hdr) == 2 and (mode == 'coms' or any(c.lower() in hdr[0].lower() for c in ctx['coms'])):
                for r in rows: add_com(u, r[0], r[1], ctx['sigla'])
                continue
            u['notes'].append('<table>' + ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows) + '</table>')
            continue
        raw = b['x'].strip(); style = b.get('style', '')
        x = unquote(raw)
        if not x or MARK.match(x): continue
        if deva_ratio(x) > .5:
            u['sa'] += [plain(l) for l in x.split('\n') if l.strip()]; prev = 'sa'; continue
        ital = 'italic' in style or (x.startswith('*') and not x.startswith('**') and x.rstrip().endswith('*'))
        if prev in ('sa', 'iast'):
            if ital and is_iast(x): u['iast'] += [plain(l) for l in x.split('\n') if l.strip()]; prev = 'iast'; continue
            if prev == 'iast' and ITRANS.search(x) and not DIAC.search(x): continue   # ITRANS duplicate line
        bm = BRACKET.match(x)
        if bm:
            tag, lab, rest = bm.group(1), bm.group(2).strip(), x[bm.end():].strip()
            if tag == 'TRANS': u['lit'] = inline(rest)
            elif tag != 'TEXT' and rest:
                u['coms'].append([BRNAME.get(tag, tag.title()) + (f' · {lab}' if lab else ''), inline(rest)])
            prev = 'note'; continue
        if JUNK.match(x):
            low = x.lower(); mode = 'words' if ('pada' in low or 'word' in low) else 'coms'; prev = None; continue
        cm = re.match(r'^\*\*(commentary digest|commentaries|commentary)[.:]?\*\*[.:]?\s+(.+)$', x, re.I | re.S)
        if cm: add_com(u, 'Commentary digest', cm.group(2), ctx['sigla']); prev = 'note'; continue
        if COMHEAD.search(x) and len(x) < 60 and not LABEL.match(x):
            mode = 'coms'; prev = None; continue
        lm = None if re.match(r'^[-•]', x) or ctx['note'] else LABEL.match(x)
        if lm:
            key = lm.group(1).lower(); paren = lm.group(2); rest = x[lm.end():].strip()
            prev = None
            if key == 'iast':
                if rest: u['iast'].append(plain(rest))
                continue
            if key in ('word-by-word', 'word by word', 'pada-by-pada gloss'):
                mode = 'words'
                for part in re.split(r'\s+·\s+', rest) if rest else []:
                    t = re.split(r'\s+[—–]\s+', part, 1)
                    if len(t) == 2: u['words'].append([plain(t[0]), '', plain(t[1])])
                continue
            if key == 'commentary':
                if rest: add_com(u, 'Commentary' + (f' ({paren})' if paren else ''), rest, ctx['sigla'])
                else: mode = 'coms'
                continue
            if key == 'classical commentaries':
                if rest: u['coms'].append(['Classical commentaries', inline(rest)])
                else: mode = 'coms'
                continue
            tgt = {'theme': 'para', 'meaning': 'para', 'key concepts': 'note', 'english translations': 'note',
                   'public-domain sources': 'note', 'note': 'note', 'notes': 'note'}.get(key)
            tgt = tgt or ('lit' if key.startswith('literal') or key == 'narration' else 'para' if key.startswith('paraphrase') else 'tr')
            if not rest: mode = tgt; continue
            mode = None
            if tgt == 'lit' or (tgt == 'tr' and not u['lit']): u['lit'] = (u['lit'] + '<br>' if u['lit'] else '') + inline(rest)
            elif tgt in ('para', 'tr'): u['para'] = (u['para'] + '<br>' if u['para'] else '') + inline(rest)
            else: u['notes'].append(f'<strong>{html.escape(lm.group(1).strip())}.</strong> ' + inline(rest))
            continue
        if mode in ('lit', 'tr') and not u['lit']: u['lit'] = inline(x); mode = None; prev = None; continue
        if mode == 'para': u['para'] = (u['para'] + '<br>' if u['para'] else '') + inline(x); mode = None; continue
        if mode == 'words':
            t = re.split(r'\s+[—–]\s+', x, 1)
            if len(t) == 2 and len(t[0]) < 60: u['words'].append([plain(t[0]), '', plain(t[1])]); continue
        if mode == 'coms' or style.startswith('List') or x.startswith(('- ', '• ')):
            c = com_split(x)
            if c and (mode == 'coms' or any(k.lower() in c[0].lower() for k in ctx['coms'])):
                add_com(u, c[0], c[1], ctx['sigla']); continue
        # first plain English after the verse is its translation (key-verse books, Śānti blocks)
        if prev in ('sa', 'iast', 'words') and not u['lit'] and mode is None and not ctx['note'] and len(x) > 20:
            u['lit'] = inline(x); prev = None; continue
        prev = None
        u['notes'].append(inline(x))
    return u

def split_ref(t):
    t = plain(t)
    m = re.match(r'^(.*?)\s+[—–]\s+(.*)$', t) or re.match(r'^(.*?)\s+-\s+(.*)$', t)
    ref, title = (m.group(1), m.group(2)) if m else (t, '')
    if re.match(r'^part\s+[ivx]+$', ref, re.I) or re.match(r'^\d+\.$', ref): ref, title = title or ref, ''
    return ref, title

def sigla_of(b):
    """Siglum tables like | **BY** | Upaniṣad-Brahma-Yogin (…) | -> {'BY': 'Upaniṣad-Brahma-Yogin'}."""
    out = {}
    for x in b:
        if x['t'] != 'tbl': continue
        for r in x['rows']:
            if len(r) >= 2 and re.fullmatch(r'\*\*[^*]{1,8}\*\*', r[0].strip()):
                out[r[0].strip('* ')] = re.split(r'\s*[(,;—]', plain(r[1]))[0][:48]
    return out

def build(stem):
    b = json.load(open(HERE / 'build' / 'blocks' / f'{stem}.json'))
    ctx = {'coms': set(), 'sigla': sigla_of(b), 'note': False}
    for i, x in enumerate(b):
        if x['t'] == 'h' and COMHEAD.search(x['x']):
            for y in b[i+1:i+14]:
                if y['t'] == 'h': break
                if y['t'] == 'p':
                    m = re.match(r'^\s*(?:\d+\.\s*|[-•]\s*)?\**([A-ZĀĪŪŚṢ][^.*:(—]{2,40})', y['x'])
                    if m: ctx['coms'].add(m.group(1).strip().split(' (')[0])
    heads = [i for i, x in enumerate(b) if x['t'] == 'h']
    spans = [(i, heads[k+1] if k + 1 < len(heads) else len(b)) for k, i in enumerate(heads)]
    has_deva = lambda i, j: any(y['t'] == 'p' and any(deva_ratio(l) > .5 for l in y['x'].split('\n')) for y in b[i+1:j])
    is_unit = [has_deva(i, j) for i, j in spans]
    data = {'slug': stem, 'intro': [], 'sections': []}
    first = next((k for k, v in enumerate(is_unit) if v), None)
    if first is None: return data
    for y in b[:spans[first][0]]:
        if y['t'] == 'p' and len(y['x']) > 140 and deva_ratio(y['x']) < .2 and len(data['intro']) < 2:
            data['intro'].append(inline(unquote(y['x'])))
    intro_sec = {'title': 'Introduction', 'units': []}
    data['sections'].append(intro_sec)
    sec = intro_sec; stack = []
    for k, (i, j) in enumerate(spans):
        h = b[i]
        if h['lvl'] == 0 or re.match(r'^(table of )?contents$', h['x'], re.I): continue
        ref, title = split_ref(h['x'])
        body = b[i+1:j]
        deeper = any(is_unit[k2] and b[spans[k2][0]]['lvl'] > h['lvl'] for k2 in range(k+1, min(k+80, len(spans))))
        if not is_unit[k] and k > first and (deeper or STRUCT.match(ref)) and not re.match(r'^part\b', h['x'], re.I):
            while stack and stack[-1][0] >= h['lvl']: stack.pop()
            parent = ' · '.join(s[1] for s in stack if STRUCT.match(s[1]))
            stack.append((h['lvl'], ref))
            sec = {'title': (parent + ' · ' if parent else '') + plain(h['x']), 'units': []}
            data['sections'].append(sec)
            if any(y['t'] in ('p', 'pre', 'tbl') for y in body):
                ctx['note'] = True; sec['units'].append({**parse_unit(ref, title or 'Overview', body, ctx), 'kind': 'note'}); ctx['note'] = False
            continue
        if not body: continue
        if k > first and sec is intro_sec:
            sec = {'title': '', 'units': []}; data['sections'].append(sec)
        marks = [n for n, y in enumerate(body) if y['t'] == 'p' and MARK.match(unquote(y['x']))]
        if is_unit[k] and len(marks) >= 2:
            # a chapter of '॥ N ॥'-numbered verses: one unit per verse under its own section
            sec = {'title': plain(h['x']), 'units': []}; data['sections'].append(sec)
            cuts = [0] + marks + [len(body)]
            for a, z in zip(cuts, cuts[1:]):
                part = body[a:z]
                if not part: continue
                m = MARK.match(unquote(part[0]['x'])) if part[0]['t'] == 'p' else None
                vref = f"{ref.split('—')[0].strip()} · {m.group(1).translate(D2A)}" if m else ref
                kind = None if any(y['t'] == 'p' and deva_ratio(y['x']) > .5 for y in part) else 'note'
                u = parse_unit(vref, '' if m else title, part, ctx)
                if kind: u['kind'] = kind
                if u['sa'] or u['lit'] or u['notes']: sec['units'].append(u)
            sec = {'title': '', 'units': []}; data['sections'].append(sec)
            continue
        ctx['note'] = not is_unit[k]
        u = parse_unit(ref, title, body, ctx)
        ctx['note'] = False
        if not is_unit[k]: u['kind'] = 'note'
        sec['units'].append(u)
    data['sections'] = [s for s in data['sections'] if s['units']]
    for s in data['sections']:
        s['title'] = re.sub(r'^PART [IVX]+\s*[—–·-]\s*', '', s['title'], flags=re.I)
        for u in s['units']:
            u['sa'] = [plain(l) for l in u['sa']]
            u['iast'] = [plain(l) for l in u['iast']]
            u['words'] = [[plain(c) for c in w] for w in u['words']]
            if not u['iast']: u.pop('iast')
    return data

if __name__ == '__main__':
    stems = sys.argv[1:] or sorted(p.stem for p in (HERE / 'build' / 'blocks').glob('*.json'))
    for s in stems:
        d = build(s)
        units = [u for sec in d['sections'] for u in sec['units']]
        v = [u for u in units if u.get('kind') != 'note']
        q = lambda f: sum(1 for u in v if u.get(f))
        (OUT / f'{s}.json').write_text(json.dumps(d, ensure_ascii=False))
        print(f"{s[:36]:36} secs={len(d['sections']):3} verses={len(v):4} notes={len(units)-len(v):3} | sa={q('sa'):4} iast={q('iast'):4} words={q('words'):4} lit={q('lit'):4} para={q('para'):4} coms={q('coms'):4}")
