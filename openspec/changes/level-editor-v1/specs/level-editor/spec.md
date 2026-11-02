# Spec Delta

## Purpose

A standalone, local-first level authoring tool that loads, edits, validates, quick-tests,
and exports world-pack YAML through the shared loader/validator and the real resolver, and
that drives a standalone A→B solver between two authored snapshot arrangements.

## ADDED Requirements

### Requirement: Editor loads and saves world-pack YAML through the shared path

The editor SHALL load world packs from local file, drag-and-drop, or pasted YAML, and save
the authored pack as YAML, using the shared `SM.LEVELS.load` parser/validator and the shared
emitter. It SHALL run as local classic scripts under `file://` without a server, network,
or build step, and SHALL NOT introduce a world-specific loader or a new level format.

#### Scenario: Load and save round-trip a valid pack
- **WHEN** the user loads a valid YAML pack and then saves it
- **THEN** the saved YAML re-validates through `SM.LEVELS.load` with no new diagnostics and preserves `world_id`, `name`, `num_level`, contiguous level keys, dimensions, overrides, and declared scores

#### Scenario: Loading works offline under file://
- **WHEN** the editor page is opened directly from the filesystem
- **THEN** it can load and save packs without fetching sibling files or contacting a network service

### Requirement: Authoring covers a full world pack one level at a time

The editor SHALL manage a full world pack (`world_id`, display `name`, `num_level`,
contiguous `level_1`…`level_n`) and let the user select and edit one level at a time, while
preserving stable lowercase `world_id`, matching `num_level`, unique level names, and
rectangular grids within the supported 2–16 columns by 1–9 rows bounds. YAML rows SHALL be
treated as top-first with game coordinate A1 at the bottom-left.

#### Scenario: World metadata is preserved across level edits
- **WHEN** the user edits a level inside a loaded pack and saves
- **THEN** the saved YAML keeps the pack's `world_id`, `name`, `num_level`, and contiguous level ordering unchanged

#### Scenario: Grid bounds are enforced
- **WHEN** the user resizes a level beyond the supported column or row bounds
- **THEN** the editor rejects the resize and reports the supported bounds

### Requirement: Palette is registry-driven with dual slots

The editor SHALL build its palette from the live tile catalogue, grouped by catalogue
`category`, showing every registered tile ID plus the dot, with each entry's glyph, ID, and
name. Registered-but-unused IDs SHALL be shown and visually marked. The editor SHALL provide
two palette slots: a Primary brush for placement and a Secondary base-floor slot used to
clear or fill cells; both slots SHALL accept only registered, implemented tile IDs.

#### Scenario: All registered tiles appear
- **WHEN** the palette is rendered
- **THEN** every tile ID in the active catalogue is listed under its category, including registered-but-unused IDs that are visually marked

#### Scenario: Categories are browsable and user-friendly
- **WHEN** the user browses the palette
- **THEN** tiles are grouped into clearly labeled, collapsible categories so the user can find a tile by category without scanning a flat list

#### Scenario: Secondary slot fills empty space
- **WHEN** the user paints the Primary brush onto a cell and the Primary is not the Secondary
- **THEN** only the painted cell changes to the Primary tile

### Requirement: Quick guide shows the two selected tiles

The editor SHALL display a quick guide panel that always reflects the current Primary and
Secondary slot tiles, showing each selected tile's glyph, ID, name, category, and an
author-friendly summary of its attributes and behavior. The panel SHALL update live whenever
a slot's tile changes.

#### Scenario: The guide reflects the current slots
- **WHEN** the user assigns a tile to the Primary slot
- **THEN** the quick guide shows that tile's glyph, ID, name, category, attributes, and behavior summary for the Primary slot

#### Scenario: Both slots are shown together
- **WHEN** both Primary and Secondary slots are set
- **THEN** the quick guide shows the two tiles side by side so the user can compare the active brush and the base-floor slot

### Requirement: Tile help documents attributes and behavior in author-friendly terms

For any tile in the palette, the editor SHALL provide help documentation covering identity
(ID, name, category, layer), authorable attributes (e.g., color, orientation, state,
pushable/pullable), and behavior (what it does in play, how it interacts with the dot,
crates, gates, rays, and targets), described in author-friendly language sourced from the
live tile catalogue. The help SHALL NOT present rule strategy names, hook identifiers, or
resolver internals as authorable behavior.

#### Scenario: Help covers identity, attributes, and behavior
- **WHEN** the user opens help for a tile
- **THEN** the help shows the tile's ID, name, category, layer, authorable attributes, and a plain-language behavior summary

#### Scenario: Help hides implementation details
- **WHEN** the user reads a tile's help
- **THEN** strategy names, hook identifiers, and resolver-internal labels are not presented as authorable behavior

### Requirement: Area fill uses the secondary slot

The editor SHALL fill a selected rectangular region, and a connected flood region of the
same existing tile, with the Secondary slot's tile. Fill operations SHALL go through the
shared validator; an invalid fill SHALL be diagnosed atomically and SHALL NOT replace the
active valid pack.

#### Scenario: Rectangle fill applies the secondary tile
- **WHEN** the user selects a rectangle and invokes fill
- **THEN** every cell in the rectangle is set to the Secondary tile and the board is revalidated

#### Scenario: Flood fill stops at differing tiles
- **WHEN** the user invokes flood fill on a cell
- **THEN** only the connected region of cells holding the same tile as the origin cell is filled with the Secondary tile

### Requirement: Keyboard and mouse grid editing with single-instance markers

The editor SHALL move the editing cursor with arrow keys, select contiguous regions with
`Shift`+arrows, paint with left-click and drag, and place contextually with right-click.
The Start (ID 1) and Goal (ID 2) markers SHALL each be single-instance: painting a second
occurrence SHALL move the marker to the new cell and remove it from the previous cell, after
a confirmation.

#### Scenario: Region selection and fill
- **WHEN** the user selects a region with `Shift`+arrows and applies the Primary brush
- **THEN** every cell in the region is set to the Primary tile

#### Scenario: Second start placement relocates the marker
- **WHEN** a level already has a start and the user places another start
- **THEN** the editor asks for confirmation and, on accept, removes the old start and keeps exactly one start at the new cell

### Requirement: Inspector auto-routes overrides by property kind

The editor SHALL route property edits to the correct override mechanism: tile-level
parameters to ID-wide `overrides`, and entity capabilities to coordinate-specific
`object_overrides`. The Inspector SHALL label each edit's scope and SHALL warn "affects N
cells" when an ID-wide edit changes more than the selected cells.

#### Scenario: ID-wide parameter edit warns of scope
- **WHEN** the user changes a tile-level parameter for a tile ID that appears in multiple cells
- **THEN** the Inspector applies the change to every occurrence and warns how many cells are affected

#### Scenario: Entity capability edit is coordinate-specific
- **WHEN** the user changes a capability of one entity at one cell
- **THEN** the Inspector writes a coordinate-specific `object_overrides` entry that affects only that entity, not other occurrences of the same tile ID

### Requirement: Live validation hard-blocks save, test, and export

The editor SHALL validate the board on every edit and show inline markers and Inspector
messages. Save, quick-test, and export SHALL be hard-blocked while the board is invalid.
An invalid edit SHALL be diagnosed atomically and SHALL NOT replace the active valid pack.
A mixed-value property across a selected region SHALL be displayed as mixed before any batch
override is applied.

#### Scenario: Invalid board blocks save
- **WHEN** the board has validation errors and the user clicks Save
- **THEN** the save is blocked and the errors are reported inline with corrective messages

#### Scenario: Mixed region is shown before batch override
- **WHEN** a selected region contains entities with differing color values
- **THEN** the Inspector displays the color as mixed and applies a chosen color across the whole region only on an explicit batch override

### Requirement: Inspector colors and roles are constrained

Color choices in the Inspector SHALL be limited to White, Red, Green, and Blue. The Goal
color SHALL follow the world color and SHALL NOT be separately editable. No color mixing,
inventory keys, or crumble behavior SHALL be inferable from the Inspector.

#### Scenario: Goal color is not editable
- **WHEN** the user selects the Goal marker
- **THEN** the Inspector shows the world-derived goal color as read-only and offers no color override for it

#### Scenario: Colors are limited to the four game colors
- **WHEN** the user edits a color property
- **THEN** the only offered values are White, Red, Green, and Blue

### Requirement: Editor undo and reset are independent of gameplay undo

The editor SHALL keep a separate edit undo/redo history that is independent of gameplay
undo, and SHALL provide a reset-to-last-saved action that discards unsaved edits and returns
the board to the last saved state. Editor undo SHALL NOT undo a failed play attempt.

#### Scenario: Edit undo does not affect gameplay undo
- **WHEN** the user edits a tile and then invokes editor undo
- **THEN** the tile edit is reversed and no gameplay state is consulted or changed

#### Scenario: Reset to last saved discards unsaved edits
- **WHEN** the user makes edits and then resets to last saved
- **THEN** the board returns to the last saved state and unsaved edits are discarded

### Requirement: The editor always edits the starting state

The editor model SHALL be the level's initial configuration only. Export SHALL emit the
initial configuration and SHALL NOT emit a transient, queued, derived, failed, or won
snapshot. Snapshots captured for the solver SHALL never become the YAML edit target.

#### Scenario: Export is the initial configuration
- **WHEN** the user exports a level after running a quick test
- **THEN** the exported YAML reflects the authored initial configuration, not any state produced during the test session

### Requirement: Quick test uses the real resolver with the full HUD

The quick-test action SHALL launch a full play session by cloning the authored initial
configuration and driving the synchronous `SM.RULES.resolveTurn` with the standard HUD,
gameplay undo, and failure/restart behavior. The editor SHALL NOT introduce an
editor-specific simulator, SHALL NOT publish scores, and SHALL NOT mutate the progress
store.

#### Scenario: Quick test plays through the real resolver
- **WHEN** the user clicks quick test and inputs a move
- **THEN** the move is resolved by `SM.RULES.resolveTurn` and the standard HUD reflects the resulting state

#### Scenario: Quick test does not publish scores or touch progress
- **WHEN** a quick-test session completes a level
- **THEN** no score is published and the progress store is unchanged

#### Scenario: Terminal failure blocks undo and reset restores
- **WHEN** a quick-test session reaches terminal failure and the user resets
- **THEN** the session returns to the authored initial configuration and gameplay/player undo remains blocked until reset, matching the resolver contract

### Requirement: Snapshot A and B are independent authored arrangements

The editor SHALL hold two snapshot slots, A and B, as board arrangements distinct from the
level's initial configuration. It SHALL offer "use current board as A" and "use current
board as B" shortcuts that copy the level's current initial state into a slot as a starting
point; each slot SHALL then be editable independently. The editor SHALL keep one active A/B
pair per session and MAY save or load named scenario pairs to a sidecar file. Snapshots
SHALL NOT be serialized into the authored YAML.

#### Scenario: Using the current board seeds a snapshot
- **WHEN** the user clicks "use current board as A"
- **THEN** snapshot A becomes a copy of the level's current initial configuration and can then be edited without affecting the level configuration

#### Scenario: Snapshots are not exported to YAML
- **WHEN** the user exports the pack after authoring snapshots A and B
- **THEN** the exported YAML contains no snapshot data

#### Scenario: One active pair per session
- **WHEN** the user authors a new A/B pair
- **THEN** it replaces the session's active pair, and any previously named pair persists only if saved to a sidecar

### Requirement: A→B solver invocation is budget-bound and replay-verified

The editor SHALL invoke the standalone solver, passing snapshot A as the start state and
an exact full-state signature match to snapshot B as the goal, bound by the solver's
configured state, depth, and route-label budgets. The editor SHALL replay any returned
route through the real resolver before reporting it and SHALL show a budget-exhausted
`unknown` result distinctly from an exhaustive `unsolvable` result.

#### Scenario: A reachable B reports the optimal route
- **WHEN** snapshot A can reach an exact match of snapshot B within budget
- **THEN** the editor replays the returned route through `SM.RULES.resolveTurn`, reports the stroke count and command counts, and marks selection completeness

#### Scenario: Budget exhaustion is reported as unknown
- **WHEN** the solver cannot finish within the configured budgets
- **THEN** the editor reports `unknown`, distinct from `unsolvable`, and does not claim B is unreachable

#### Scenario: B is not realizable
- **WHEN** snapshot B's arrangement settles to a failed state or no reachable state matches its signature after exhaustive search
- **THEN** the editor reports B as invalid or `unsolvable` rather than silently normalizing B

### Requirement: The editor does not extend the rules core or YAML schema

The editor SHALL NOT add DOM access, timers, asynchronous primitives, or browser-global
dependencies to the rules core, SHALL NOT add a world-specific loader, and SHALL NOT
introduce new tile IDs or YAML behavior. It SHALL consume the shared validator, the real
resolver, and the live tile catalogue as the contract for all gameplay outcomes.

#### Scenario: Editor edits never change rule behavior
- **WHEN** the editor authors a level that is also authorable by hand in YAML
- **THEN** the level resolves identically whether loaded through the editor or through the shared loader, with no editor-specific outcomes

### Requirement: The editor is documented for authors

The project SHALL include a level-editor usage guide covering loading/saving packs,
palette and dual slots, area fill, grid editing, the Inspector, the quick guide and
per-tile help, quick test, reset, snapshot A/B authoring, and A→B solving. The
world-authoring and level-design references SHALL point at the editor for authoring,
validation, and A→B solving without making the editor a second source of executable rules.

#### Scenario: An author can learn the workflow from docs
- **WHEN** a new author reads the level-editor guide
- **THEN** they find the load/edit/validate/save, quick-test, quick-guide and per-tile help, and A→B solver workflows described with the shared-validation and real-resolver constraints
