"""Merge concordance notes (ys*.json, sk.json) into the site data files.

Safe to re-run: an existing concordance entry is replaced, never duplicated.
Run from anywhere:  python3 Documents/concordance/merge.py
"""
import json, pathlib

HERE = pathlib.Path(__file__).parent
JS = HERE.parent.parent / 'assets' / 'js'
NAME = 'Concordance · Sāṃkhya–Yoga–Śruti'


def merge(js_file, notes, key):
    path = JS / js_file
    src = path.read_text()
    head, start, end = src[:src.index('[')], src.index('['), src.rindex(']') + 1
    data = json.loads(src[start:end])
    missing = [str(v[key]) for v in data if str(v[key]) not in notes]
    assert not missing, f'{js_file}: no note for {missing}'
    for v in data:
        coms = [c for c in v.get('commentaries', []) if c['name'] != NAME]
        coms.append({'name': NAME, 'text': notes[str(v[key])]})
        v['commentaries'] = coms
    path.write_text(head + json.dumps(data, ensure_ascii=False, indent=2) + src[end:])
    print(f'{js_file}: {len(data)} notes merged')


ys = {}
for f in sorted(HERE.glob('ys*.json')):
    ys.update(json.loads(f.read_text()))
merge('yoga-sutras.js', ys, 'id')
merge('samkhya-sutras.js', json.loads((HERE / 'sk.json').read_text()), 'number')
