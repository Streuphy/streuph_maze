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

## Tile and level authoring

World 1 uses target IDs **23–25** for crate-occupancy links **1–3** and phase
wall IDs **10, 26, and 27** for gates on links **1–3**. This registry supports
three independent target/gate links without per-cell overrides; the current
`overrides` format is keyed by tile ID, so use the link-specific tile variant
rather than trying to give two instances of one ID different links.

Targets are momentary: a crate activates a target only while it occupies that
cell. A nearby crate or a player standing on the target does not activate it.
This is distinct from receiver ID **50**, which still detects an adjacent
matching-colour crate. Crate IDs **70–73** in an authored grid mark movable
starting entities over ordinary floor; when pushed away, their source cells
remain walkable floor. To put a crate on a target, author the crate and target
in separate cells and push the crate onto the target during play.

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
custom image, World 1 displays a locally generated solved-board SVG snapshot;
other levels use the built-in PASS artwork. A valid custom `win_picture` takes
precedence over the generated World 1 snapshot.
For World 1, a valid custom PNG takes precedence over the generated solved-board
snapshot; levels without custom art use the local snapshot instead.

Historical and future design notes are kept under `docs/`. Their older tile-ID
examples are not authoritative over `src/js/tiles.js` and the current levels.
