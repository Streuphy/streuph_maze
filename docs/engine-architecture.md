# Engine architecture

This note records the Alpha 0 architecture review and intended ownership
boundaries. It is a migration map, not a second rules specification: current
gameplay contracts remain in the accepted `tile-mechanics`, `movable-objects`,
`line-of-sight-hazards`, and `world-level-packs` specifications and the
[Tile Mechanics Reference](level-design/tile-mechanics.md).

## Current runtime flow

1. `sm-io.js` obtains YAML text or an in-memory level object. `sm-yaml.js`
   parses YAML; `levels.js` validates the shared document and calls
   `SM.RULES.buildLevel`.
2. `tiles.js` registers tile IDs, defaults, capabilities, strategy hooks, and
   state/presentation descriptors. `sm-glyphs.js` turns display keys and view
   state into SVG. `levels.js` consults the catalogue for known IDs, parameters,
   capabilities, and validation diagnostics.
3. `sm-rules.js` constructs the runtime board/state and resolves one action
   synchronously. It returns ordered `steps`; the solver uses this same
   resolver. The rule layer must remain DOM-, timer-, and async-free.
4. `sm-ui.js` owns input, level lifecycle, progression, inspection, codex,
   undo orchestration, and controller state. `sm-render.js` owns the display
   mirror and playback of resolver steps; display timing must never feed back
   into the authoritative rules state.
5. `sm-store.js` owns progress persistence. `index.html` loads local classic
   scripts in dependency order for direct `file://` use.

## Current state and event inventory

`sm-rules.js` creates and copies state in `newState`, `cloneState`,
`snapshot`/`restore`, and `snapshotSig`. The canonical review list is:

| State | Ownership / role |
|---|---|
| `level`, `key`, `width`, `height` | Immutable level identity and dimensions. |
| `grid`, `portals`, `start`, `goal` | Immutable normalized terrain/index data and authored locations. |
| `crates` | Mutable movable-entity occupancy; crate instances refer to immutable definitions. |
| `switches` | Mutable switch latches and movable target positions; definitions/capabilities are shared metadata. |
| `locked` | Derived passability state rebuilt from tile defaults, active signals, latches, and master lock. |
| `player` | Mutable player position. |
| `P`, `W` | Mutable player and world color carriers. |
| `strokes`, `turns`, `won` | Mutable action accounting and completion state. |
| `seen` | Mutable per-level codex/progress observation. |

Any added gameplay field must be considered in state construction, clone,
snapshot, restore, derived-state rebuilding, solver identity, and renderer
mirroring. A field that is presentation-only must not enter resolver outcomes.

Resolver events currently include `blocked`, `press`, `move`, `push`, `pull`,
`target-move`, `teleport`, `object-teleport`, `colour`, `switch`, `ray`,
`caught`, `respawn`, `goal`, and bounded-chain diagnostics (`force-loop`,
`belt-cap`, `object-force-cap`). The resolver owns their order and meaning;
`sm-render.js` applies them to a display mirror. New/changed event forms must be
reviewed against playback, undo, and solver behavior together.

## Tile-specific dispatch and intended ownership

| Concern | Current coupling found | Intended owner after migration |
|---|---|---|
| Tile IDs, names, defaults, parameter defaults, capabilities | Catalogue in `tiles.js`; loader and rules read the fields. | `tiles.js` definitions and schemas; stable IDs remain authored data. |
| Entry/ACT effects (goal, color setters, world dials, latch toggles, teleport) | `tiles.js` behavior-name switch delegates back into a rules-created engine object. | Named synchronous behavior strategies in the tile registry, invoked at explicit resolver phases through a constrained context. |
| Start/goal discovery, crate/target layers, switch registration, portal index | `buildLevel` branches on `name` and `family` in `sm-rules.js`. | Generic level normalization plus declarative tile roles/registration metadata; no tile ID/name case logic. |
| Solidity/passability, gates, void, signal activity, lock precedence | `isSolid`, `canEnter`, `switchActive`, `masterVoidActive`, `rebuildLocks`, and repeated gate checks branch on family, mode, scope, or special keys. | Shared bounds/occupancy/legality and resolver phases in the engine; tile strategies/metadata supply solidity, activation, and carrier requirements. |
| Crate/target movement and object capabilities | Movement helpers use entity identity and target-specific branches; capabilities are partly declarative. | Generic entity movement and capability helpers; registered entity roles/profiles define supported operations. |
| Belts, ice, portals, rays | Force chains inspect `flow`, `portal`, `ice`, `hazard`, and `gate`; rays use hazard family and object profiles. | Explicit force/ray hooks plus generic bounded traversal, collision, deterministic order, and catch/respawn phases. |
| Glyphs, codex, inspection/tutorial text | Glyph generation was co-located with `tiles.js`; `sm-ui.js` branched on families/names for prose; `sm-render.js` plays step events. | `tiles.js` owns readable display descriptors; `sm-glyphs.js` renders glyphs; UI formats descriptors and uses read-only engine queries. |
| YAML/world data | `levels.js` validates shared YAML; validation has family checks for actuator/object/portal roles. | `levels.js` remains the single YAML authority and reads declarative registry schemas, never executable tile behavior. |

Descriptive `family` metadata may remain useful to authors and presentation
code. It must not be the gameplay dispatch mechanism. The engine still owns
domain-general state invariants, action semantics, collision, boundedness,
stroke accounting, deterministic turn ordering, and event emission.

## Existing verification coverage

`tests/verify.js` is the Node/VM harness. Its current named groups include:

- Registry and catalogue checks: `checkTileRegistry`.
- Parser, YAML validation, and level loading: `checkYaml`, `checkLevels`,
  `checkObjectOverrides`.
- General movement, colors, gates, portals, switches, sensors, and counters:
  `checkRules`, `checkDirectObjectMovement`, `checkObjectForceChains`.
- Ray queries, transport, catches, respawn, undo, and solver behavior:
  `checkRayQueries`, `checkRayTransportTransitions`, `checkCatchTransitions`,
  `checkCatchSolver`.
- World-specific solver/content assertions: `checkWorldOneContent`,
  `checkWorld2Content`, `checkWorld4Content`, `checkVectorSolver`, and
  `checkParRouteSelection`.
- Static purity/offline checks: `checkRulesPurity`.

`tests/browser-test.js` boots the real `index.html` in jsdom and covers board
construction, codex and glyphs, input, undo, persistence, YAML pack activation,
ray playback, conveyors/ice, targets, and victory pictures. It is a final
browser-layer regression suite, not a fast module-level unit test and not a
substitute for the separate real-Chromium `file://` check when rendering or
local-file loading changes.

The future fast unit suites should reuse and isolate appropriate assertions
from this inventory. Full pack solving, broad integration/replay assertions,
and DOM interaction remain in final validation so targeted suites stay small
and do not silently weaken the comprehensive gate.

## Alpha 0 test timing snapshot

Local Linux/Node 26.12 measurement at final validation; informational only, not
a CI threshold:

| Suite | Before | After | Result |
|---|---:|---:|---|
| Browser/jsdom interaction | 9.405 s with the former fixed waits (temporary baseline copy) | 5.411 s using state-based completion waits | 151 passed in both runs; 3.994 s faster (about 42%). |
| Broad Node verification | 0.497 s in the earlier 857-assertion baseline | 0.598 s after adding architecture/state coverage (867 assertions) | No Node speedup is claimed; coverage increased and elapsed time remains below 0.6 s in this run. |

The browser baseline and after run used the same assertions and game code; only
the test waits differed. The browser suite is still run only during final
validation. The focused Node unit suites remain the recommended iteration
commands.
