# Design

## Context

The engine is organized as `sm-io.js` (YAML text/IO), `sm-yaml.js` (parser), `levels.js`
(shared validator + BFS solver), `tiles.js` (catalogue), `sm-rules.js` (synchronous resolver
with `newState`/`cloneState`/`snapshot`/`restore`/`snapshotSig`/`resolveTurn`), `sm-ui.js`
(input/HUD/lifecycle/undo), `sm-render.js` (display mirror), and `sm-store.js` (progress).
The rule layer is DOM-, timer-, and async-free by construction; `index.html` loads local
classic scripts in dependency order for `file://` use. See `proposal.md` for why an editor
is needed and the engine-architecture doc for ownership boundaries.

Two existing facts shape this design:
1. The solver is currently embedded in `levels.js` (`SM.LEVELS.solve`) and only searches
   `newState(level)` → `st.won`. Generalizing it to an arbitrary start state and an
   arbitrary goal predicate is the job of the separate prerequisite `standalone-state-solver`
   change; this change consumes that API and does not modify the solver.
2. Authored worlds are YAML loaded through the shared `SM.LEVELS.load`/`validate` path.
   `docs/level_editor_Proposal.md` and `docs/world-level-packs.md` are the accepted contract;
   the earlier `docs/level-editor-PDD-V1.md` proposes `.json` files and a fixed palette,
   both superseded by the contract.

## Goals / Non-Goals

**Goals:**
- A standalone `editor.html` + `src/js/sm-editor.js` + editor CSS that authors, validates,
  quick-tests, and exports world-pack YAML, and drives the A→B solver, with no second rules
  engine and no new level format.
- A clean three-buffer model (level initial config | snapshot A | snapshot B) so the editor
  always edits the starting state and snapshots are solver inputs only.
- Reuse the shared validator for all validation and the real resolver for all gameplay.

**Non-Goals:**
- Generalizing the solver itself (owned by `standalone-state-solver`).
- Any change to the rules core, YAML schema, tile IDs, or progress store.
- An editor-specific simulator, renderer-owned outcomes, neighbor-ACTION waves, or partial
  push observation.
- Authoring snapshot B's *derived* state by hand; only the arrangement is authored.
- Offloading solver search to a Web Worker in v1 (see Risks).
- A multi-scenario manager; one active A/B pair per session, with optional sidecar save.

## Decisions

### 1. The editor is a presentation+UI layer over the shared engine
`sm-editor.js` orchestrates editing, validation, quick-test, and solver calls; it never
reimplements rules. All gameplay outcomes come from `SM.RULES.resolveTurn`; all validation
comes from `SM.LEVELS.load`/`validate`; all tile identity comes from the live `SM.TILES`
catalogue. The editor holds an in-memory authored document (the world-pack object) and a
currently-edited level's grid + overrides, and writes YAML via the shared emitter.
*Alternative*: an editor-internal validator/simulator — rejected; it would diverge from play
and violate the rules-core boundary.

### 2. Three distinct buffers, never aliased
- **Level buffer**: the authored initial configuration for the current level (the YAML
  source of truth). Editing targets this buffer only.
- **Snapshot A**: an independently authored arrangement held as a cloned state plus its
  `snapshotSig`. Seeded by "use current board as A" then edited independently.
- **Snapshot B**: an independently authored target arrangement held the same way.

A snapshot is captured as a *settled* state (between turns), never mid-resolution, so its
signature is well-defined. The editor keeps snapshots out of the YAML export; an optional
named-scenario sidecar (JSON) stores `{ arrangementA, arrangementB, notes }` for reuse.
*Alternative*: A always mirrors the level initial — rejected by requirement; the user wants A
and B to be standalone arrangements with a convenience seeding shortcut.

### 3. Snapshot B's derived state is auto-computed, never hand-authored
B is authored as an **arrangement**: grid tiles, crate positions, player position, player
color, world color, and polarity. Switch latches, gate `locked` state, and effective/pending
closure are *derived*. To produce B's `snapshotSig`, the editor builds a level-like config
from the arrangement, constructs `SM.RULES.newState`, and runs a read-only settle (a clone on
which no action is applied; `newState` already runs `rebuildLocks`/`enforceDotClosure`). If
the arrangement is inconsistent (e.g., a gate that should be closed under the dot), the
settle yields a failed state, and the editor reports B as not a valid target rather than
silently hand-editing derived fields. This keeps B always a realizable settled-state
signature and respects the contract that initial-state edits do not store derived contacts,
closure, or a queue.
*Alternative*: let the author set latches/locks directly — rejected; it would let B encode
non-realizable states and would duplicate resolver logic.

### 4. Quick test clones the initial config and uses the full HUD
Quick test constructs `SM.RULES.newState(level)` from the current level buffer, then drives
`SM.RULES.resolveTurn` through the existing UI input/HUD/undo path (reused, not forked). It
writes nothing to `sm-store.js`; it never publishes scores or completion. Reset reconstructs
`newState(level)` again. Terminal failure leaves the settled failed board and blocks
gameplay/player undo per the resolver contract; reset/navigation recover.
*Alternative*: a compact step-replay view — deferred to a future change; v1 ships the full
session, which is the contract-mandated path.

### 5. A→B solving consumes the standalone solver, budget-bound
The editor calls the standalone solver (from the prerequisite change) with snapshot A's
cloned state as `startState` and a goal predicate matching snapshot B on a non-failed state.
It forwards the solver's configured `maxStates`/`maxDepth`/`maxRouteLabels` (exposed in the
editor with safe defaults). Results are replayed through `SM.RULES.resolveTurn` on a fresh
clone of A before display. The editor shows `solvable`/`unsolvable`/`unknown` distinctly,
plus commands, counts, budget usage, and balance-comparison completeness. The standard
action set (move/pull/act) is used; no action restriction in v1.

**Implementation refinement — mutable-state signature:** `SM.RULES.snapshotSig` begins with
`rulesIdentity|...`, where `rulesIdentity` embeds the grid and key. The grid is immutable
during play, so two arrangements with different crate/start positions (different grids) can
never match on the full `snapshotSig` — making A→B degenerate (only depth-0 or unreachable).
The editor therefore compares the **mutable** portion of the signature (player position,
crates, colors, latches, polarity — everything after the `rulesIdentity|` prefix) rather
than the full `snapshotSig`. This preserves the "exact match" intent for the reachable state
while allowing A and B to differ in mutable placement over shared terrain. A `mutableSig`
helper strips the leading `rulesIdentity|` segment; the goal predicate is
`!s.failed && mutableSig(s) === mutableSigB`.
*Alternative*: a custom A* — rejected; reusing the existing BFS over the real resolver
guarantees it never disagrees with play, which is the whole point.

### 6. Inspector auto-routes overrides by property kind
For each editable property the editor knows whether it is a tile-level parameter (lives in
`overrides`, keyed by tile ID, affecting every occurrence) or an entity capability (lives in
`object_overrides`, keyed by coordinate, affecting one entity). The Inspector labels the
target and warns "affects N cells" for ID-wide edits. Colors are constrained to
White/Red/Green/Blue; the Goal color is derived from the world color and is not editable.
*Alternative*: let the user choose scope per edit — rejected as too error-prone; auto-routing
matches the schema's actual two mechanisms.

### 7. Live validation reuses `SM.LEVELS.load`/`validate` diagnostics
On every edit the editor rebuilds the level object and runs validation with `solve: false`
for speed (solvability is not required to edit; it is checked on demand or on quick-test).
Diagnostics are mapped to inline cell markers and Inspector messages. Save, quick-test, and
export are hard-blocked while errors exist. The full solver (solve: true) runs on demand
(e.g., before publishing a `golf_score`) and on quick-test.
*Alternative*: on-demand validation only — rejected; live feedback prevents authoring
invalid boards that fail only at save.

### 8. Area fill writes grid cells, never override params
Rectangle and flood fill operate on the grid layer only, replacing tile IDs with the
Secondary slot's registered tile. Any property override affected by a fill is surfaced
through the Inspector for an explicit, scoped edit, not silently applied.
*Alternative*: fill that also writes overrides — rejected; ID-wide override side effects
must be explicit and scoped.

### 9. Quick guide and tile help are sourced from the live catalogue
The quick guide (the live panel showing the current Primary and Secondary slot tiles) and
per-tile help are presentation of catalogue metadata. The editor reads the live tile
catalogue for identity (`id`, `name`, `category`, `layer`, `family`), `glyph`, authorable
`params` and their defaults, `colourRole`, `presentation`, and `state`. Behavior summaries are
generated in author-friendly language from these fields and the documented tile mechanics;
`strategies` (the named-strategy/hook layer) is never surfaced as authorable behavior. The
quick guide updates live whenever a slot changes. The tile selector groups tiles into
clearly labeled, collapsible categories for user-friendly browsing.
*Alternative*: hand-written help text per tile, or a second human-authored help file —
rejected; both would duplicate the catalogue and drift from it. The catalogue is the
contract.

## Risks / Trade-offs

- **[Risk] Snapshot B is not realizable even with auto-computed derived state** → The
  settle may produce a failed state or a signature no reachable state matches. The editor
  reports B as invalid or the solver returns `unsolvable`/`unknown`; both are honest and
  must be surfaced distinctly. No silent normalization of B.
- **[Risk] Large solver budgets freeze the editor under `file://`** → v1 reuses the
  existing synchronous solver with the same default budgets as `levels.js`. Budgets are
  capped and exposed; exhaustion returns `unknown`, never a hang. Offloading to a Worker is a
  deferred, opt-in enhancement and must not change resolver outcomes.
- **[Risk] Snapshots captured mid-resolution produce undefined signatures** → Snapshots are
  only captured as settled states (between turns); the editor refuses to capture during an
  in-flight resolve.
- **[Risk] Editor edits silently change ID-wide overrides for the whole board** → The
  Inspector's "affects N cells" warning and explicit scope labeling mitigate this; area fill
  never writes overrides.
- **[Risk] Quick test mutates progress** → Quick test uses a separate session that never
  touches `sm-store.js`; reset reconstructs from the level buffer.
- **[Risk] The catalogue has no dedicated plain-language behavior-summary field** → The
  editor generates a short summary from known catalogue fields (`category`, `layer`,
  `colourRole`, `params`, `presentation`, `state`) and, where behavior is not derivable,
  points to the Tile Mechanics Reference rather than fabricating behavior. It never exposes
  `strategies` or hook code as authorable.
- **[Trade-off] Sidecar scenario files are an extra non-YAML artifact** → Kept optional and
  clearly separate from authored packs; the YAML contract is unchanged.

## Migration Plan

Greenfield; no migration. `editor.html` is a new entry point alongside `index.html` and
`glyphs.html`. No existing file's behavior changes; the prerequisite `standalone-state-solver`
change is implemented first and keeps `SM.LEVELS.solve` back-compatible. Rollback is removal
of the new files; no shared state is introduced.

## Open Questions

- Exact shape of the optional sidecar scenario file (v1 minimal; can evolve without spec
  change since it is not part of the YAML contract).
- Default solver budget values exposed in the editor UI (will mirror `levels.js` defaults
  unless usability testing suggests otherwise).
- Whether to add a compact step-replay view for walking a returned solver route (deferred to
  a future change; not required for v1).
