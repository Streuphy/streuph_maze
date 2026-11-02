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

### V2 migration and controls

The sole queued V2 engine and all shipped content have been migrated in the
working implementation; final verification/acceptance remains tracked separately.
See the [61-level certification ledger](docs/level-design/v2-pack-certification.md)
and [asset checklist](docs/level-design/v2-migration-assets.md). All 61 minimum
routes now prove/replay, with a theoretical aggregate of 869 strokes. Content/math
reviews are not a claim that final jsdom, Chromium, or accepted-spec gates passed.
The [verification record](docs/level-design/v2-verification.md) reports the actual
passing repository and separate real-Chromium checks. Accepted-spec synchronization
remains an approval/release dependency, not a compatibility mode.

- Arrows/WASD/HJKL move; Shift+direction explicitly pulls an eligible trailing
  object. Object profiles, not crate/floor colors, grant that ability.
- Space/Enter or Action/Rest invokes the current tile and opens the same queued
  environment round. Belts indicate their exit direction and can carry stationary
  eligible passengers on rest. No timer controls gameplay.
- Z undoes a successful nonterminal round. Exposure or physical closure can
  fail an attempt: its board freezes and undo/gameplay are blocked. R restarts;
  navigation remains available. A rollback diagnostic is different: no stroke
  or action mutation is committed.
- A legal matching-color **goal entry** wins. A stationary color match alone
  does not. The four carrier colors are White, Red, Green, and Blue.
- Labels distinguish replay-proven PAR, unverified authored scores, personal
  bests, and partial world totals. Current progress has a fresh namespace;
  use progress JSON export/import for backup if browser storage is unavailable.

### Verification

Node.js and npm are only needed to run the test suite; they are not required to
play the game. Install the development dependencies and run the full checks
with:

```sh
npm install
npm test
```

See [Engine Architecture](docs/engine-architecture.md) for an overview of the
codebase.

Open [`glyphs.html`](glyphs.html) directly for the definition gallery. It uses
the same local classic-script registry and SVG renderer, includes all registered
IDs (including 0) plus the dot, and offers explicit display samples for active,
pending-close, and failed states. Samples do not run a second game engine.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

Maintained by [@Streuphy](https://github.com/Streuphy).
