# Level editor

The level editor is a standalone, local-first authoring tool at `editor.html`. It
loads, edits, validates, quick-tests, and exports world-pack YAML through the **shared**
`SM.LEVELS.load`/`validate` path, drives the **real** resolver for quick-test play, and
runs a standalone A→B solver between two authored snapshot arrangements. It is a consumer
of the shared engine — never a second source of executable rules.

Open it directly from disk (`file://…/editor.html`); no server, build step, or network
connection is required. It uses the same classic scripts as the game.

## Loading and saving packs

- **Load** a world pack from a local `.yaml`/`.yml` file (file picker), by dragging the file
  onto the window, or by pasting YAML into the YAML pane and clicking **Load pasted YAML**.
  All three paths go through `SM.LEVELS.load` (parse + validate). A rejected pack reports
  diagnostics inline and **does not replace** the active valid pack.
- **Save pack** downloads the authored pack as YAML via the shared emitter, preserving
  `world_id`, `name`, `num_level`, contiguous `level_1`…`level_n` keys, dimensions,
  overrides, `initial_*` fields, and declared `golf_score` values.
- The editor manages a **full world pack** and edits **one level at a time**. Switching
  levels keeps unselected levels intact in the in-memory document.

The authored format is YAML. JSON is not a level-pack format; progress JSON is a separate
store the editor never touches.

## Palette and dual slots

The palette is built from the **live tile catalogue** (`SM.TILES`), grouped into clearly
labeled, collapsible categories. Every registered tile ID is listed with its glyph, ID, and
name. Registered-but-unused IDs are visually marked.

- **Primary slot** (left-click a palette entry): the active brush for placement.
- **Secondary slot** (right-click a palette entry, or use the slot control): the base-floor
  tile used to clear cells and to **area-fill**.

Both slots accept only registered, implemented tile IDs.

## Quick guide and tile help

- The **quick guide** panel always shows the current Primary and Secondary slot tiles side
  by side — glyph, ID, name, category, attributes, and an author-friendly behavior summary.
  It updates live when a slot changes.
- **Tile help** (click a palette entry) shows identity (ID, name, category, layer),
  authorable attributes, and a plain-language behavior summary, sourced from the live
  catalogue. Strategy names, hook identifiers, and resolver internals are never presented as
  authorable behavior.

## Grid editing and area fill

- **Arrow keys** move the editing cursor; **Shift+arrows** paint a region with the Primary
  brush; **Space** paints the current cell.
- **Mouse**: left-click paints the Primary tile; right-click places the Secondary tile.
- **Fill rect** fills the rectangle from the origin (A1) to the cursor with the Secondary
  slot. **Flood fill** fills the connected region of the same tile as the cursor cell with
  the Secondary slot. Both go through the shared validator; an invalid fill is diagnosed
  atomically and never replaces the active valid pack.
- **Start (ID 1) and Goal (ID 2) are single-instance.** Painting a second occurrence asks
  for confirmation and relocates the marker, leaving exactly one of each.

## Inspector and override routing

The Inspector routes property edits to the correct override mechanism:

- **Tile-level parameters** (e.g., a conveyor's `dir`, a target's `link`) go to ID-wide
  `overrides`, keyed by tile ID. Every occurrence of that ID in the grid shares the value;
  the Inspector warns **"affects N cells"** when an ID-wide edit changes more than the
  selected cells.
- **Entity capabilities** (e.g., a crate's `pushable`/`pullable`) go to coordinate-specific
  `object_overrides`, keyed by board coordinate (e.g., `B1`). Each affects only that one
  entity.
- **Color choices** are limited to White/Red/Green/Blue. The **Goal color follows the world
  color** and is not separately editable. No color mixing, inventory keys, or crumble
  behavior is inferable from the Inspector.
- A **mixed** property across a selected region is shown as mixed (e.g., `Color: <Mixed>`)
  before any batch override is applied.

## Live validation and hard-blocks

The board is revalidated on every edit through `SM.LEVELS.load`/`validate` (`solve: false`
for speed). Inline markers and Inspector messages surface diagnostics. **Save**, **Quick
test**, and **Show YAML** are hard-blocked while the board is invalid. The active valid pack
is never replaced by an invalid edit.

## Editor undo/redo and reset

The editor keeps a **separate edit-history stack** (Undo/Redo) that is independent of
gameplay undo — it never consults or changes gameplay state. **Reset to saved** discards
unsaved edits and returns the board to the last saved state.

## Quick test and reset

**Quick test** launches a full play session by cloning the authored initial configuration
and driving the real `SM.RULES.resolveTurn` with the standard HUD and gameplay undo. There
is no editor-specific simulator; quick test never publishes scores and never touches the
progress store.

- **Reset** returns the test session to the authored initial configuration at any stage,
  including after terminal failure.
- On terminal failure, gameplay and player undo are blocked until reset, matching the
  resolver contract.

## Snapshot A/B authoring and A→B solving

The editor holds **three distinct buffers**: the level initial configuration (the YAML
source of truth), snapshot A, and snapshot B. Editing always targets the level buffer;
snapshots are solver inputs, never the edit target.

- **Use current board as A** / **Use current board as B** copy the level's current initial
  state into a slot as a starting point; the slot is then edited independently of the level
  buffer.
- One active A/B pair per session. You may save/load named scenario pairs to an optional
  sidecar JSON file; snapshots are never serialized into the authored YAML.
- Snapshots are captured only as **settled (between-turn) states**; the editor refuses to
  capture while a resolve is in flight.
- **Solve A→B** invokes the standalone solver (provided by the separate
  `standalone-state-solver` prerequisite change), passing snapshot A as the start state and
  an **exact full-state signature match** to snapshot B as the goal, bound by the solver's
  configured budgets. B's derived state (switch latches, gate locks, effective/pending
  closure) is auto-computed from the arrangement via a read-only settle — it is never
  hand-authored, so B is always a realizable signature.

The result distinguishes three honest outcomes:

- `solvable` — an optimal route exists; the editor replays it through the real resolver
  before reporting the stroke count and command counts.
- `unsolvable` — exhaustive search found no exact match.
- `unknown` — the configured budget was exhausted; this does not prove B is unreachable.

If B's arrangement settles to a failed state, the editor reports B as invalid rather than
silently normalizing it.

## Always edited in the starting state

The editor model is the level's initial configuration only. Export emits the initial
configuration — never a transient, queued, derived, failed, or won snapshot. Snapshots A and
B never become the YAML edit target.
