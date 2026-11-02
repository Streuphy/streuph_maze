# Original graphics sources and contact sheets

The editable GPL-3.0 artwork source is `src/js/sm-sprites.js`: explicit 32×32
pixel-space primitives, palette slots and frame offsets rasterized deterministically
into RGBA pixels. No commercial sprites, copied game characters or upstream demo
art are included. `sm-draw.js` renders the same grammar as Konva geometry for the
vector identity; it is not a second board or gameplay implementation.

Generate the baseline sheet with:

```sh
node scripts/report-glyph-atlas.js docs/graphics/pixel-catalogue.png
```

The sheet is ordered by registered numeric ID ascending, then the separate dot,
left-to-right in nine columns. It shows a sampled active/closed view with Red P
and Blue W. It is an art-coverage checkpoint, not final runtime/state/native-browser
evidence. See the shared rendering guide and change verification record for the
remaining state matrix, native checks and release status.

Supported IDs: 0–5, 10–13, 20–27, 30–36, 40–42, 44–48, 50, 60–67,
70–73, 80–84 and 90–100. Numeric gaps are not placeholder artwork. Duplicate belt
and receiver variants reuse patterns with their effective parameters. Semantic
required colors remain fixed; animated highlights change only within their ramp.
