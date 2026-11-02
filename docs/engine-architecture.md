# Engine architecture

The implementation uses the sole queued V2 contract. Its existing ten deltas
have been synchronized into [accepted specifications](../openspec/specs/).
This guide maps the [abstract state/event model](Product_Design_Document.md#2-state-and-tile-model)
to current code; it is not another ruleset or a proposed engine refactor.
Proofs, browser evidence, documentation coherence and release approval remain
separate. See the [archived review](../openspec/changes/archive/2026-11-02-doc-review-v2-ruleset/review.md)
for unresolved cross-change guidance.

## Integration contract: states and events

The engine owns *transaction integrity*; registered strategies own
*mechanic-specific behavior*. Calls flow through declared query/behavior hooks
and explicit context. Committed state and ordered events are the common contract
for play, search, undo and rendering. It is not an event-only plug-in bus:
handlers currently mutate supported state in atomic batches, and the core
journals and validates them. Definitions remain immutable and YAML remains data.

| Boundary | Existing implementation | Dependency rule |
|---|---|---|
| Definition → query/behavior | `tiles.js` registry, strategies and state descriptors; `SM.resolveTileHook` | Declare parameters, profiles, reads/writes/hooks/events; no mechanic dispatch by ID/name/family/world |
| State → commit | `sm-rules.js` `atomicEffect`, common legality and validation | Commit whole actor/mutation batches or reject them; no half-push observation |
| Commit → subsequent work | Captured transitions, `signalState`, typed queue, `queueForce` and occupant scans | Queue intent is revalidated; captured actor identity cannot retarget a later occupant |
| State → view | `describeTile`, ordered `steps`, commit IDs and authoritative `state` frames | Consumers inspect/project committed truth; animation never schedules rules |
| State → search/restore | `cloneState`, `snapshot`/`restore`, `snapshotSig`, shared resolver | Preserve transition-relevant state; internal restore is not permission for player undo after failure |

Local policies answer such questions as "what direction does this source request?"
or "is this source active?" Core policy decides atomicity, priority, legal
capacity, terminal precedence, accounting and rollback. Core queries still have
explicit supported actor layers, carriers and closing-surface semantics; the
current implementation is not an arbitrary-entity extension API. Reducing coupling
means preserving these contracts, not adding tile-specific branches to the core
or moving rule decisions into rendering.

## Current runtime flow

1. `sm-io.js` obtains YAML text or an in-memory level object. `sm-yaml.js`
   parses YAML; `levels.js` validates the shared document and calls
   `SM.RULES.buildLevel`.
2. `tiles.js` registers tile IDs, defaults, capabilities, strategy hooks, and
   state/presentation descriptors. `sm-visuals.js` produces headless descriptions;
   `sm-sprites.js` retains original art and validated frames; `sm-draw.js` and
   `sm-glyphs.js` produce Konva nodes/shared previews. `levels.js` consults the catalogue for known IDs, parameters,
   capabilities, and validation diagnostics.
3. `sm-rules.js` constructs the runtime board/state and resolves one action
   synchronously. It returns ordered `steps`; the solver uses this same
   resolver. The rule layer must remain DOM-, timer-, and async-free.
4. `sm-ui.js` owns input, level lifecycle, progression, inspection, codex,
   undo orchestration, and controller state. `sm-render.js` owns the display
   mirror and playback of resolver steps through `sm-surface.js`, shared with
   editor authoring, quick-test, gallery thumbnails and image export. Timing never feeds back
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

In the PDD vocabulary, normalized configuration is `D`, mutable canonical state
is `S`, derived lock/activity queries are `R(D,S)`, and a command's queue/provenance
is local context `C`. The ordered committed output is `E`; discovery is auxiliary
observation `O`. None of these symbols introduces an additional stored root.

### Work records versus output records

- **Queued request:** pending intent with priority, operation, source, actor and
  payload; a stale or blocked request may commit nothing.
- **Captured entry/departure:** a past committed transition with stable actor
  identity; its supported reaction survives later movement unless the transaction
  terminates. It is not a current-occupancy assertion.
- **Signal edge:** change in derived current activity; unchanged contacts do not
  enqueue repeated activation. Contact count and boolean activity differ.
- **Committed event/frame:** actual validated mutation with commit identity;
  authoritative snapshots cover multi-field changes even without readable hints.
- **Abort diagnostic:** the sole output retained after full-action rollback;
  tentative movement events must not be played or persisted as real progress.

`resolveTurn` rejects malformed API commands, blocks terminal gameplay input and
defensively enforces closure on restored state before opening a transaction.
`resolveAction` owns direct commit, queue drain and final exposure.
`atomicEffect` validates mutations, rebuilds locks, enforces closure, derives
events and captures downstream work. The controller publishes win progress only
after the returned result, not during an intermediate commit.

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

### Identity and lifecycle review

| Concern | Required identity / boundary |
|---|---|
| Settled solver transition | `snapshotSig` captures transition-relevant positions/profiles, carriers, polarity, latches and terminal outcome; observations and absolute counters are not route identity |
| Transaction repetition | Gameplay plus semantically ordered pending work, signal state and transport provenance; normalized queue order, not ever-increasing enqueue serials |
| Undo/internal restore | Complete reversible payload and counters; observation rollback handled explicitly; rebuild derived locks rather than copy an independent pending flag |
| Restart | Reconstruct authored initial state, empty round context and playing outcome |
| Renderer | Mirror complete state frames/commit IDs; no independent mutable gameplay truth |

Changing a mechanic requires reviewing construction, clone, snapshot, restore,
derivation, state identity, events and passive playback together. A source reaction
must not require its consumer to know the emitter's tile ID. The existing focused
tests enforce these boundaries; this documentation change does not generalize
the supported engine or alter event formats.

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

The [rendering guide](rendering.md) documents the pixel-default/vector alternate,
isolated presentation preferences and original 32×32 artwork. Konva is a locally
vendored MIT browser-global backend, not an engine dependency. `sm-visuals.js`
and `sm-sprites.js` stay headless; rules/solver construction never needs Canvas.
Canvas pixels sit behind a semantic DOM grid for inspection/editing. Native
presentation fingerprints cover vendor, art, surface and editor assets; jsdom's
recording context is only orchestration evidence, not an appearance test.

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
