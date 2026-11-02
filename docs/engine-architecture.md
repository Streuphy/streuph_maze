# Engine architecture

The current implementation is migrating to the sole queued contract in
`openspec/changes/v2-global-pack-migration/`. Engine tests and the shipped-pack
certification ledger are separate gates; implementing the scheduler does not
certify existing levels. Accepted specification synchronization remains a
review/release step. This document describes ownership, not another ruleset.

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
| `switches` | Mutable latches, target positions/profiles, stable identities; immutable tile definitions are shared, mutable profiles are copied. |
| `locked` | Derived requested linked locks; `closureAt` separately derives effective/pending solidity from requests and crate occupancy. |
| `player` | Mutable player position. |
| `P`, `W` | Mutable player and world color carriers. |
| `polarity` | Mutable red-open/blue-open binary state, independent of P/W. |
| `strokes`, `turns`, `won` | Mutable action accounting and completion state. |
| `failed`, `failureReason` | Mutable terminal-failure state; cannot coexist with `won`. |
| `seen` | Mutable per-level codex/progress observation. |

Any added gameplay field must be considered in state construction, clone,
snapshot, restore, derived-state rebuilding, solver identity, and renderer
mirroring. A field that is presentation-only must not enter resolver outcomes.

Resolver events include `blocked`, `press`, `move`, `push`, `pull`,
`target-move`, `teleport`, `object-teleport`, `colour`, `switch`, `polarity`, `signal-edge`,
`ray`, `failed`, `goal`, authoritative `state` snapshots, and `effect-abort`
diagnostics. Atomic mutation events share a commit ID. The resolver owns their order and meaning;
`sm-render.js` applies them to a display mirror. New/changed event forms must be
reviewed against playback, undo, and solver behavior together.

## Tile-specific dispatch and current ownership

| Concern | Owner / boundary |
|---|---|
| IDs, names, parameter defaults/schema, capabilities, hook/state/display metadata | `tiles.js`; numeric IDs remain authored identities, never executable rule cases. |
| Entry/ACTION/exit/edge behavior | Registered synchronous named strategies through explicit resolver phases/context. Unconfigured hooks are neutral. |
| Start/goal roles, object/feature normalization, switch/portal registration | `buildLevel` reads declarative roles/strategies and constructs immutable configuration, with independent movable layers. |
| Bounds, occupancy, carrier preflight, atomic commits, closure, invariants | Core transaction helpers; tile passability/activation/ray hooks supply mechanic queries. Requested locks and occupancy-aware closure have separate ownership. |
| Crate/feature movement | Stable actor identity and declared capabilities, common destinations, atomic push/pull and queued transport; no tint-selected mobility. |
| Conveyors, ice, portals, rays | Typed queue records, one-hop revalidation, source ordering/provenance, per-hop signals, bounded repetition/budget, terminal precedence. No old independent force-chain resolver. |
| Presentation | Registry descriptors, display-only `sm-glyphs.js`, UI formatting, passive commit-frame playback. The dot has the same explicit model without a tile ID. |
| YAML/world data | One `levels.js` parser/validator/activation path; metadata/schema validation never runs authored callbacks. |

Descriptive `family` metadata may remain useful to authors and presentation
code. It must not be the gameplay dispatch mechanism. The engine still owns
domain-general state invariants, action semantics, collision, boundedness,
stroke accounting, deterministic turn ordering, and event emission.

## V2 round policy

There is one interpretation and no runtime selector. Four moves, explicit
capability-enabled pulls, and current-tile ACTION share the same transaction.
Initial colors and authored geometry/profiles form fixed level identity.
Supporting terrain/definitions are immutable, and state roots are sealed;
handlers may mutate declared gameplay state, not add untracked root fields.

Direct push/pull destinations preflight completely and both actors commit
together. Each committed hop captures entry/departure records by identity,
derives current occupancy signals and physical closure, then queues work.
Priority is signal reactions, transport, ordinary effects; ties use runtime
y/x then enqueue order. A goal-entry checkpoint follows signal work but
precedes transport. Missing hooks are neutral, not executable YAML.

Registered synchronous handler batches may change several gameplay fields.
The core validates the whole batch and journals every committed mutation,
including changes made without an explicit event helper. Complete state patches
and commit IDs accompany readable movement/color/switch events for passive
playback. Queue source/actor references and transport policy are revalidated.
Deferred entry effects do not retarget later occupants. Occupancy signals query
current state and emit edges only when activity changes.

Conveyor checks seed all eligible post-direct passengers, including stationary
objects on ACTION. Every transport hop is atomic; no belt shoves a front crate.
Ice carries an incoming direction only within the round. Portal provenance
prevents arrival bounce-back. Pending physical closure is derived from requests
and occupancy, uniformly for linked barriers, polarity barriers, and phase void.

Queue repetition identity includes mutable gameplay state, semantically ordered
pending records, signal state, and transport provenance. Absolute ever-increasing
enqueue serials are excluded. Every attempted effect, including blocked/stale
ones, consumes the `64 × width × height` budget. Cycles, exceptions, invalid
mutations/references, or exhausted budget restore the full pre-action snapshot
and return only an abort diagnostic: no counters, discovery, or progress commit.

Successful movement costs one stroke even if it returns to its origin. ACTION
costs one even as a no-op. Blocked direct commands cost zero and increment only
attempts. Physical closure beneath the dot fails immediately; a legal matching
goal entry wins after signals and cancels later work. Only a non-winning drained
queue receives final ray exposure testing, which can commit failed state.
Failures retain the settled board and initiating stroke; restart/navigation are
the recovery operations. There is no rule work left pending between rounds.

Snapshots contain the complete switch/feature inventory, profiles, latches,
positions, object occupancy, carriers, terminal flags/reason, and counters.
Restore reconstructs mutable rows and derived locks; immutable definitions can
be shared safely. Player undo policy is separate from internal snapshot restore.

## Current progress storage

Persistence uses the fresh `streuphs-maze/progress/v2` key and requires JSON
`contract: "v2-queued"`, `schema: 1`. Records use `world-id::level_n`, with
independent best/clear/discovery and per-world last selection. No alternate
contract is read or imported; prior stored bytes remain inert and untouched.
Rejected imports are atomic. Reset removes only the current namespace.

The rules core performs no external progress writes. Local storage is optional
under `file://`; denied access or quota failure falls back to current-session
memory. Current progress JSON export/import is the durable user-controlled
backup. Authored level packs still use YAML, not the progress JSON schema.
Declared PAR, replay-proven minimum, personal best, and partial world totals
remain distinct and cannot borrow records from another contract.

## Existing verification coverage

`tests/verify.js` is the Node/VM harness. Its current named groups include:

- Registry and catalogue checks: `checkTileRegistry`.
- Parser, YAML validation, and level loading: `checkYaml`, `checkLevels`,
  `checkObjectOverrides`.
- General movement, colors, gates, portals, switches, sensors, and counters:
  `checkRules`, `checkDirectObjectMovement`, `checkObjectForceChains`.
- Ray queries, transport, terminal failure, snapshot restoration, and solver behavior:
  `checkRayQueries`, `checkRayTransportTransitions`, `checkFailureTransitions`,
  `checkFailureSolver`.
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

Existing focused suites are `test:unit:registry`, `test:unit:rules`,
`test:unit:levels`, and `test:unit:helpers`. The levels module also runs
`tests/unit/pack-migration.js`: all 61 real-resolver proofs/replays and scoped
necessity/recovery regressions. `scripts/report-par-routes.js` publishes complete
mathematical evidence separately from the manual design ledger. None of these
replace final `npm test` or real Chromium. Unknown and incomplete balance
comparison are reported distinctly, never promoted into a minimum proof.

## Historical Alpha 0 test timing snapshot — not V2 verification

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
