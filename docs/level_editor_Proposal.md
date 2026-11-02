# Future level editor proposal — YAML and current registry

**Status:** Exploration only; no editor application is implemented or shipped.
`editor.html` is a proposed entry point, not an available product page. A future
OpenSpec change must separately authorize/design/test it. This migration only
reconciles its authoring assumptions with the actual game contract.

## Goal and local-first boundary

Design a lightweight, keyboard-accessible editor for the same standalone YAML
packs accepted by `SM.LEVELS.load`/`validate`, not another level format, loader,
or rules implementation. It should work with local classic scripts under
`file://` without a build/server/network requirement. File input, drag/paste,
and download are baseline paths; optional File System Access support cannot be
required for correctness or safe fallback.

Load/export `.yaml` or `.yml` using the shared parser/emitter and validator.
Preserve `world_id`, display name, contiguous level keys, `num_level`, goals,
dimensions, initial carriers/polarity, registered overrides, profiles, declared
scores, and supported victory assets. Export authored **initial** configuration,
never a transient play snapshot, queue, derived locks, failure, or completion.
Progress backup JSON remains a separate current-contract store format, not a
JSON level-pack schema.

## Canvas and accessible controls

- Runtime bounds are width 2–16 and height 1–9, not a new editor-specific minimum.
  YAML is top-first, coordinates bottom-left A1. Exactly one start and one goal.
- Propose a clear grid with a right-side categorized palette and primary brush/
  secondary base-floor slot. Any chosen base item must still be registered and
  validated; a brush does not bypass layer or tile schema restrictions.
- Arrow navigation, Shift+arrow region selection, accessible named controls,
  left-click painting, and contextual placement are future UI requirements.
  Editor selection undo is not permission to undo a failed play attempt.
- Display mixed values explicitly before batch changes. Distinguish an
  ID-wide parameter override from a coordinate-specific object profile; changing
  one ID's parameter affects every occurrence, not just the selected cells.

## Use the complete definition model

Consume the actual registry and the [universal definition template](level-design/tile-mechanics.md):
all 62 supported IDs, including 0 and supported-unused variants, plus the dot
as a separate object. Never scrape module exports or invent placeholders for
numeric gaps. Show identity/layer/category, exact defaults, color meaning,
mutable/derived/display state, hooks/priority, legality/commits, outcomes/events,
presentation, and lifecycle. Named strategies are code-side, not editable YAML.

- Start brush places marker 1; initial dot aura comes from supported level data.
  Dot appearance/capabilities are not inferred from the start glyph.
- Goal brush places unique marker 2, whose color follows W. It has no separately
  editable fixed goal color and is not a crate-occupancy target.
- Targets 23–25 are non-blocking features over terrain; crates are independent
  blocking objects. Preserve supporting terrain on movement. Receiver contact
  is cardinal matching-color adjacency, never same-cell target occupancy.
- Inspector color choices are only White/Red/Green/Blue. No mixing, floor-derived
  strength/pulling, inventory keys, or crumble behavior may be inferred.
- Conveyor orientation is an exact cardinal exit vector and White/inert tint;
  all IDs use the same eligible-passenger policy. Ice is explicit ID 5.
- Per-entity `object_overrides` edit only supported boolean capabilities and ray
  profile values. Initial state edits do not directly store derived contacts,
  effective/pending closure, or a queue. Invalid region changes must be diagnosed
  atomically, without replacing the active valid pack.

## Play-test and score requirements

A future preview must invoke the same synchronous `SM.RULES.resolveTurn` as
play/search. It must not create an editor-specific simulator, renderer-owned
outcome, neighbor ACTION wave, or partial push observation. Inspect requested,
effective, and pending closure distinctly; display final failed boards and
block gameplay/player undo until restart/navigation. Matching legal goal entry
wins after signals and before later work; stationary color equality does not.

Keep declared `golf_score`, replay-proven minimum, personal best, and incomplete
world totals separate. Solver unknown cannot be labeled solved or impossible.
Route previews must show commands/counts/budgets, real replay, and tied-route
comparison completeness. Manual lesson/wrong-push review remains necessary.
Batch editing must not silently publish new scores or mutate current progress.

## Future exploration deliverables

Propose UI structure, shared-YAML round-trip/state flow, accessible selection
behavior, definition/profile presentation, atomic validation failure handling,
and real `file://` loading tests. Reuse the existing registered mechanics rather
than extending the schema or constructing a new rules engine as an incidental
editor feature. The editor itself remains out of scope and unimplemented.
