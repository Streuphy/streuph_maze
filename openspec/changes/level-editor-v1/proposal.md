# Proposal

## Why

The engine already has a synchronous resolver, a shared YAML level-pack loader, a tile
catalogue, and a bounded BFS solver, but no tool for authoring or inspecting levels.
Designers hand-edit YAML and cannot visually place tiles, capture arrangements, or ask
"can the dot reach this arrangement, and in how many strokes?". A local-first editor that
reuses the shared loader, validator, and real resolver — and that can drive the solver
between two authored arrangements — closes that gap without introducing a second rules
engine, a new level format, or any network dependency.

## What Changes

- Add a standalone `editor.html` entry point plus `src/js/sm-editor.js` and editor CSS,
  running as local classic scripts under `file://` with no build, server, or network
  requirement.
- Author full **world packs** (stable lowercase `world_id`, display name, `num_level`,
  contiguous `level_1`…`level_n`) and edit one level at a time, loading and saving **YAML**
  through the shared `SM.LEVELS.load` parser/validator and the shared emitter. Progress JSON
  remains a separate store and is untouched.
- Provide a registry-driven right-side palette grouped by catalogue `category` into clearly
  labeled, collapsible categories for user-friendly browsing, covering all 62 registered tile
  IDs plus the dot, with glyphs, ID, and name. Registered-but-unused IDs are shown and
  visually marked.
- Provide a **dual-slot palette**: a Primary brush and a Secondary base-floor slot, both
  validated through the shared path. The Secondary slot doubles as the **area-fill** brush
  for rectangle-region fill and connected flood-fill.
- Provide a **quick guide** panel that always reflects the current Primary and Secondary slot
  tiles (glyph, ID, name, category, and an author-friendly summary of attributes and
  behavior), updating live. Provide **per-tile help** documenting each tile's identity,
  authorable attributes, and behavior in author-friendly language sourced from the live tile
  catalogue; strategy names, hook identifiers, and resolver internals SHALL NOT be presented
  as authorable behavior.
- Provide arrow-key cursor navigation, `Shift`+arrow region selection, mouse left-click/drag
  paint, and right-click contextual placement. The single-instance Start (1) and Goal (2)
  markers auto-replace their previous occurrence on a confirm.
- Provide an Inspector that auto-routes property edits to the correct mechanism — tile-level
  parameters to ID-wide `overrides`, entity capabilities to coordinate-specific
  `object_overrides` — always labels scope, and warns "affects N cells" for ID-wide edits.
  Color choices are limited to White/Red/Green/Blue; the goal color follows the world color
  and is not separately editable; no mixing, inventory keys, or crumble may be inferred.
- Provide **live validation** with inline markers and inspector messages, and **hard-block**
  save, quick-test, and export until the board validates. Invalid edits are diagnosed
  atomically and never replace the active valid pack.
- Provide an independent editor undo/redo history plus a "reset to last saved" action,
  separate from gameplay undo.
- Provide a **quick play/test** button that launches a full play session through the real
  `SM.RULES.resolveTurn` with the standard HUD, gameplay undo, and failure/restart behavior —
  no editor-specific simulator, and it never publishes scores or mutates the progress store.
  A reset returns the test session to the authored initial config at any stage, including
  after terminal failure.
- Enforce the **always-edited-in-starting-state invariant**: the editor model is the initial
  configuration only; YAML export is the initial config, never a transient, queued, derived,
  failed, or won snapshot.
- Provide a **snapshot A/B workflow**: two independently authored board arrangements held as
  distinct buffers from the level's initial config, with "use current board as A/B"
  shortcuts that copy the level's current initial state into a slot as a starting point. One
  active A/B pair per session, with optional named scenario save/load to a sidecar file
  (never serialized into the authored YAML).
- Invoke the **standalone A→B solver** (provided by the prerequisite
  `standalone-state-solver` change) from the editor at any time, passing snapshot A as the
  start state and an exact full-state signature match to snapshot B as the goal, bound by
  the solver's configured budgets. The editor surfaces commands, counts, budget usage, and
  completeness, replayed through the real resolver before display, and shows `unknown`
  distinctly from `unsolvable`.

## Capabilities

### New Capabilities
- `level-editor`: A standalone, local-first, keyboard-and-mouse level authoring tool that
  loads, edits, validates, quick-tests, and exports world-pack YAML through the shared
  loader/validator and real resolver; provides dual-palette and area-fill editing; and
  drives a standalone A→B solver between two authored snapshot arrangements.

### Modified Capabilities
<!-- None. The editor consumes the existing `world-level-packs` capability and the solver
     capability without changing their requirements. The A→B solver generalization itself
     is owned by the prerequisite `standalone-state-solver` change, not this one. -->

## Impact

- **New files**: `editor.html`, `src/js/sm-editor.js`, editor CSS, and editor-focused tests.
- **Consumed APIs**: `SM.LEVELS.load`/`validate`/`parse` and the shared emitter for YAML
  round-trip; `SM.RULES.newState`/`cloneState`/`snapshotSig`/`resolveTurn` for quick-test and
  snapshot capture/restore; the tile catalogue in `src/js/tiles.js` (identity, `category`,
  `layer`, `glyph`, `params`, `colourRole`, `presentation`, `state`) and glyph data in
  `src/js/sm-glyphs.js` for the palette, quick guide, and per-tile help. The editor reads
  catalogue display descriptors but SHALL NOT surface `strategies` or hook code as authorable
  behavior.
- **Prerequisite**: depends on the separate `standalone-state-solver` change, which
  extracts the embedded `solve` into a standalone, budget-bound module that accepts an
  arbitrary start state and an arbitrary goal predicate. This change MUST NOT modify the
  rules core, introduce DOM/timers/async into the rules layer, add a world-specific loader,
  or change the YAML schema.
- **Documentation**: adds a level-editor usage guide and updates the level-design /
  world-authoring references to point at the editor for authoring, validation, and A→B
  solving, without making the editor a second source of executable rules.
