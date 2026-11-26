"""Turn each Upanishad book (.md preferred, else .docx) into a flat block stream:
   {"t":"h","lvl":n,"x":text} | {"t":"p","x":text,"style":s} | {"t":"tbl","rows":[[...]]}"""
import json, re, sys, pathlib, docx
from docx.table import Table
from docx.text.paragraph import Paragraph
SRC = pathlib.Path('/Users/rattanramakanth/Documents/Books/Upanishads')
OUT = pathlib.Path(__file__).parent / 'build' / 'blocks'; OUT.mkdir(parents=True, exist_ok=True)

DEVA = re.compile(r'[\u0900-\u097F]')
BOX = re.compile(r'[\u2500-\u257F\u2580-\u259F✦◯]')
def implicit_heading(p):
    """Books without Heading styles mark headings as large bold roman text."""
    runs = [r for r in p.runs if r.text.strip()]
    if not runs: return None
    size = runs[0].font.size.pt if runs[0].font.size else 0
    # 108 Compendium entries: "12. Name (Alt)" with only the first run bold and large
    if runs[0].bold and size >= 14 and re.match(r'^\d{1,3}\.\s', p.text.strip()): return 3
    if not all(r.bold for r in runs): return None
    if 12 <= size < 13 and len(DEVA.findall(p.text)) <= 3 and len(p.text) <= 120: return 'small' 
    if size < 13 or len(DEVA.findall(p.text)) > 3 or len(p.text) > 160: return None
    return 1 if size >= 18 else 2 if size >= 15 else 3

def from_docx(path):
    d = docx.Document(path); out = []
    styled = any(p.style.name.startswith('Heading') for p in d.paragraphs)
    for el in d.element.body.iterchildren():
        tag = el.tag.split('}')[1]
        if tag == 'p':
            p = Paragraph(el, d); x = p.text.strip()
            if not x: continue
            if len(BOX.findall(p.text)) >= 2:   # ASCII/box diagrams keep their spacing
                out.append({'t':'pre','x':p.text.rstrip()}); continue
            s = p.style.name
            m = re.match(r'Heading (\d)', s)
            lv = None if styled else implicit_heading(p)
            if m: out.append({'t':'h','lvl':int(m.group(1)),'x':x})
            elif lv == 'small': out.append({'t':'p','x':x,'style':s,'small_head':True})
            elif lv: out.append({'t':'h','lvl':lv,'x':x})
            elif s == 'Title': out.append({'t':'h','lvl':0,'x':x})
            else:
                ital = bool(p.runs) and all(r.italic for r in p.runs if r.text.strip())
                out.append({'t':'p','x':x,'style':s+(' italic' if ital else '')})
        elif tag == 'tbl':
            t = Table(el, d)
            rows = [[c.text.strip() for c in r.cells] for r in t.rows]
            out.append({'t':'tbl','rows':rows})
    # small bold lines directly followed by Devanagari open a verse (048/053 companions)
    for k, b in enumerate(out):
        if b.pop('small_head', False) and k + 1 < len(out) and out[k+1]['t'] == 'p' and len(DEVA.findall(out[k+1]['x'])) > 10:
            out[k] = {'t':'h','lvl':4,'x':b['x']}
    return out

def from_md(path):
    out = []; lines = path.read_text().splitlines(); i = 0
    while i < len(lines):
        l = lines[i]
        m = re.match(r'^(#{1,6})\s+(.*)', l)
        if m: out.append({'t':'h','lvl':len(m.group(1)),'x':m.group(2).strip()}); i += 1; continue
        if l.strip().startswith('```'):
            buf=[]; i+=1
            while i < len(lines) and not lines[i].strip().startswith('```'): buf.append(lines[i]); i+=1
            i+=1; out.append({'t':'pre','x':'\n'.join(buf)}); continue
        if l.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells if c): rows.append(cells)
                i += 1
            out.append({'t':'tbl','rows':rows}); continue
        if l.strip() and not re.fullmatch(r'-{3,}|\*{3,}', l.strip()):
            buf = [l]; i += 1
            # join soft-wrapped lines of the same paragraph (but keep blockquote lines separate-ish)
            while i < len(lines) and lines[i].strip() and not re.match(r'^(#|\||[-*] |\d+\. |```)', lines[i]) and not (buf[0].startswith('>') != lines[i].startswith('>')):
                buf.append(lines[i]); i += 1
            out.append({'t':'p','x':'\n'.join(buf),'style':'md'}); continue
        i += 1
    return out

for f in sorted(SRC.iterdir()):
    if f.suffix == '.docx' and (SRC / (f.stem + '.md')).exists(): continue
    if f.suffix not in ('.md', '.docx'): continue
    b = from_md(f) if f.suffix == '.md' else from_docx(f)
    (OUT / (f.stem + '.json')).write_text(json.dumps(b, ensure_ascii=False))
    print(f'{f.name:48} {len(b):5} blocks')
