# Upaniṣad reader data

Builds `assets/js/upanishads/*.js` (the Vedānta tab's **Verses** view) from the books in
`~/Documents/Books/Upanishads/` (`.md` is used when present, otherwise `.docx`).

```bash
python3 Documents/upanishads/blocks.py   # books -> build/blocks/*.json (flat headings/paragraphs/tables)
python3 Documents/upanishads/parse.py    # -> build/out/*.json (sections and verse units)
python3 Documents/upanishads/export.py   # -> assets/js/upanishads/<slug>.js + index.js
```

After a rebuild, bump `?v=` on the reader links in `Temp/darshana_3.html` and `VER` in
`assets/js/upanishad-reader.js`. A new book needs a row in the `BOOKS` list in `export.py`.
`build/` is scratch and is not committed.
