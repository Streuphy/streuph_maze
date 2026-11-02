# Streuph's Maze

> A local-first browser puzzle game — a hobby project, still in development.

Guide a dot to a matching-color exit through maze-and-logic puzzles with crates,
switches, gates, conveyors, portals and ray hazards. Moves are turn-based:
take your time, inspect the board and aim for the fewest strokes.

## Play locally

No build step, web server or network connection is needed to play in Chromium.

```sh
git clone https://github.com/Streuphy/streuph_maze.git
cd streuph_maze
```

Open `index.html` in Chromium. The Prologue is built in; load extra packs from
[`data/worlds/`](data/worlds/) with the in-game file picker, drag-and-drop or YAML
paste. Under `file://`, the browser cannot automatically read neighboring files.

To author or inspect packs, open `editor.html` — a local-first level editor that
loads, edits, validates, quick-tests, and exports world-pack YAML, and runs an A→B
solver between two authored snapshot arrangements. See
[docs/level-editor.md](docs/level-editor.md).

## Controls

| Action | Control |
|---|---|
| Move / push | Arrow keys, WASD or HJKL |
| Pull an eligible trailing object | Shift + direction |
| Action / Rest on the current tile | Space or Enter |
| Undo a nonterminal round | Z |
| Restart | R |
| Next level | N |
| Inspect a tile | Click |

Movement keys are configured in `KEYMAP` in [`src/js/sm-ui.js`](src/js/sm-ui.js);
there is no in-game rebinding screen. A failed attempt blocks gameplay and undo;
restart or navigate to another level to recover.

## Learn more

- [Game rules](docs/GAME_RULES.md) — colors, tile interactions, winning and failure.
- [Documentation guide](docs/README.md) — player, level-author and contributor paths.
- [World-pack format](docs/world-level-packs.md) — create and load YAML packs.
- [Tile reference](docs/level-design/tile-mechanics.md) — supported definitions.
- [Graphics and animation](docs/rendering.md) — shared Konva pixel/vector
  identities, motion controls, offline assets and original-art provenance.

The sole queued V2 engine ships 61 levels. Minimum-PAR, replay and browser evidence
are recorded in the [verification record](docs/level-design/v2-verification.md);
that evidence is distinct from release approval. Features and levels may change.

## Development

**This project's code development is agent- and LLM-driven**, using AI coding
agents (including OpenCode) and large language models for implementation,
documentation and verification work. OpenSpec records the contracts and scoped
changes. Contributions and generated output still need review and testing;
AI authorship is not a correctness guarantee.

The game itself is deterministic JavaScript: playing requires no LLM, API key or
online service. The engine owns state transactions and ordered events; registered
tile strategies own mechanic behavior, and rendering only plays back the result.
See [Engine Architecture](docs/engine-architecture.md).

Node.js and npm are needed only for development checks, not to play:

```sh
npm install
npm test
```

Open [`glyphs.html`](glyphs.html) locally for the definition gallery. Bug reports
and puzzle feedback are welcome through [GitHub issues](https://github.com/Streuphy/streuph_maze/issues);
include the world/level and commands that reproduce the problem.

## License

[GNU General Public License v3.0](LICENSE).

Maintained by [@Streuphy](https://github.com/Streuphy).
