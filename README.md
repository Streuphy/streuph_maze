# Streuph's Maze

The supported game entry point is `index.html`. It uses local classic scripts
and CSS and can be opened directly in Chromium from the filesystem (`file://`);
there are no runtime network dependencies. Runtime JavaScript and styles are in
`src/js/` and `src/css/`. `src/js/levels.default.js` supplies the built-in
levels; `data/levels.yaml` is the editable/exportable YAML copy.

GitHub: [@Streuphy](https://github.com/Streuphy)

## Run

Open `index.html` in Chromium. To load an edited `data/levels.yaml` under `file://`,
use the in-game file picker, drag-and-drop, or paste controls rather than
fetching a sibling file.

## Verify

```sh
npm install
npm test
```

`npm test` runs the resolver/YAML checks and the jsdom browser smoke test. To
regenerate `data/levels.yaml` from the built-in level source:

```sh
npm run levels:emit
```

Custom level victory art is an optional `win_picture` YAML value containing a
`data:image/png;base64,...` URI. PNGs must be exactly 250×250 pixels. Without a
custom image, the game displays its built-in PASS artwork after victory.

Historical and future design notes are kept under `docs/`. Their older tile-ID
examples are not authoritative over `src/js/tiles.js` and the current levels.
