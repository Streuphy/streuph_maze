# Streuph's Maze

> A local-first browser puzzle game, currently a work in progress.

Streuph's Maze is a small maze-and-logic puzzle game. Levels combine movement
and crate puzzles with mechanics such as switches, gates, colors, conveyors, and
other tile effects. The game and its levels are still being developed, so
features and level content may change.

## Play locally

You can run the game directly from a local checkout in Chromium. No build step,
web server, or network connection is required to play.

```sh
git clone https://github.com/Streuphy/streuph_maze.git
cd streuph_maze
```

Then open `index.html` in Chromium. To load a separate level pack while running
from a local file, use the in-game file picker, drag-and-drop, or YAML paste
control; browsers do not allow the game to automatically read neighboring files.

## Game rules and levels

- [Game rules and tile mechanics](docs/level-design/tile-mechanics.md) — how
  movement, objects, tiles, and turn resolution work.
- [World level packs](docs/world-level-packs.md) — available pack format and
  how levels are loaded and authored.
- [World authoring checklist](docs/level-design/world-authoring-checklist.md) —
  progression, playtesting, and validation guidance for level authors.

The built-in levels are in [`data/levels.yaml`](data/levels.yaml). Additional
world packs are in [`data/worlds/`](data/worlds/).

## Development

Node.js and npm are only needed to run the test suite; they are not required to
play the game. Install the development dependencies and run the full checks
with:

```sh
npm install
npm test
```

See [Engine Architecture](docs/engine-architecture.md) for an overview of the
codebase.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

Maintained by [@Streuphy](https://github.com/Streuphy).
