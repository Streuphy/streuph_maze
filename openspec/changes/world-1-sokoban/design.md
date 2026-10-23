# Design

## Context

See `proposal.md` for motivation and the two delta specs for observable behavior.

The current engine already supports rectangular integer-grid levels up to 16×9, push actions, a separate crate-position grid, linked phase walls, bounded BFS solvability/par checking, YAML file picker/drop/paste, and atomic replacement after validation. The YAML subset parser accepts ordinary mappings and flow/block integer arrays but rejects block scalars used by the legacy ASCII registry. Syntax errors carry line and column; most semantic validation errors currently use line 0.

Important implementation gaps found during review:

- Tile IDs 70–73 are both the initial crate marker in the static grid and the crate entity. When a crate moves, the original static cell remains a solid crate tile unless level construction normalizes it to its underlying floor.
- The resolver stores crates separately from terrain, but `describeTile` and the renderer's cell draw path currently render the static tile only; moving crate entities need an explicit visual overlay.
- Lock sources currently include player switches and adjacency sensors. A target-occupancy source must be distinguished from the World 6 receiver, whose rule is orthogonal crate adjacency and whose behavior must not change.
- `overrides` are keyed by tile ID, so all cells using one ID share parameters. The existing phase wall ID 10 likewise cannot express multiple gate links in one level by override alone.
- UI level buttons use completion-based unlock state, and stored progress keys are level keys without a world namespace.

## Goals / Non-Goals

**Goals:**

- Add a deterministic, undoable, solver-visible crate-on-target signal for World 1 and linked passage gates.
- Ship World 1 as an eight-level, independently loadable pack that respects the blueprint progression, grid limits, and push-only Sokoban rule.
- Keep custom world packs, levels with identical keys, and Prologue progress distinct while supporting direct level selection and local `file://` loading.
- Make the crate and target layers visually unambiguous, including when a crate occupies a target.
- Keep victory feedback local and level-specific without requiring network assets.

**Non-Goals:**

- Implement the other seven world mechanics or a connected campaign/unlock sequence between worlds.
- Replace World 6's adjacency receiver with the occupancy target.
- Add crate pulling, real-time behavior, a complete multi-crate deadlock solver, or new gameplay colors.
- Make the old ASCII/block-scalar registry a runtime YAML format.
- Require all world packs in one manifest or discover files by scanning the filesystem.

## Decisions

### 1. Represent targets as a separate static target family and crates as an overlay

Keep target tiles in the board's static terrain grid and movable crates in the existing crate-state grid. Add a dedicated `target` tile family and occupancy activation source rather than overloading `sensor`/`receiver`; the resolver will query whether a crate occupies the target coordinate. A crate's starting ID in the authored integer grid creates a crate entity over ordinary floor, not a permanently solid static crate tile. This makes the vacated cell walkable and lets a moving crate cover a target without erasing it.

**Alternatives considered:** treating a target as the existing receiver would conflate occupancy and adjacency; storing target state on the crate would lose the target when the crate moves away; making each crate position replace the terrain would make undo and rendering harder and erase floor features.

The renderer will compose the static target/terrain glyph with the crate entity glyph for each cell. The rules layer will expose both layers through its read-only tile description; it will not create DOM/SVG or depend on rendering.

### 2. Use momentary target occupancy and link-specific tile variants

A target is active while one or more crates occupy target cells assigned to its link; removing the last crate from that link deactivates it. This follows the source document's pressure-plate language and the existing momentary-lock model. Multiple plates on the same link use OR semantics: any occupied plate satisfies that link.

For the first World 1 pack, use reserved IDs 23–25 for target variants on links 1–3. Keep phase wall ID 10 as the link-1 gate and add equivalent phase-wall variants on links 2 and 3 (provisionally IDs 26–27). These are proposed registry allocations, not IDs copied from the obsolete V4 document. Link defaults live in the registry; level YAML uses the ID to select a variant and remains free of behavior code. This bounded approach supports the blueprint's three-gate level and respects the current ID-keyed override limitation.

**Alternatives considered:** per-cell overrides would remove the link-count ceiling but require a broader authoring, validation, and serialization change; a single target ID with per-instance overrides is not representable in the current schema. If more than three independent links become necessary, that should trigger a separate data-model decision rather than silently reusing IDs.

The lock resolver will treat active target variants as momentary link sources alongside existing momentary plates/sensors. A target only queries occupancy; it does not inspect crate color. World 1 will use the white crate ID 70 for the classic uncolored presentation. Existing colored crates and ID 50's color-matched adjacency behavior remain unchanged.

### 3. Derive activation from crate positions and use the real resolver in search

Target activation is derived from the crate grid at the normal lock-rebuild boundary after each resolved action. It is not separately latched mutable state. State clone/undo already copies crate locations; lock state is rebuilt after restore. Ensure the solver's state signature distinguishes all state that affects World 1 outcomes and evaluates the same target/gate rule as play. Existing movement and successful pushes each cost one stroke; blocked movement/pushes cost zero.

The normal level victory remains the existing player-on-goal condition with `P === W`. World 1 starts in white/white and does not add a second win condition requiring every crate to occupy a target; target plates are route-clearing objectives, and the player still reaches the exit.

### 4. Use the existing world-pack shape with stable world identity

Store the pack at `data/worlds/world-01-sokoban.levels.yaml`. Use the current top-level `name`, `num_level`, and `levels` shape, adding `world_id: world-01-sokoban` as stable identity. Each level keeps the existing `level_n`, `name`, `width`, `height`, `golf_score`, and integer `grid` fields. Rows remain top-first in YAML; A1 remains bottom-left in game coordinates. The pack contains eight named levels, while the generic pack loader should not impose an eight-level limit on future worlds.

The current parser already accepts this grid/document style. Do not broaden it to accept the legacy `- [L1, 8x6, G6]: |` form. Improve semantic diagnostics used by this pack to include world, level, tile ID/coordinate, and an actionable message; preserve parser line/column details where the parser can provide them. A full YAML implementation and a standalone legacy ASCII importer are out of scope.

### 5. Activate packs atomically, permit direct selection, and namespace progress

Reuse the current file picker, drag/drop, and paste routes. Validate the complete world pack before changing active levels. Display the active world name and each level's name. All validated levels in a loaded world pack are directly selectable, regardless of completion state; completion and best scores remain records, not access gates. Keep the Prologue as the built-in pack and provide a way to return to it.

Use `world_id + level key` for progress identity. Give the built-in Prologue a stable internal ID and migrate its existing unqualified level-key progress without losing completions or best scores. Loading a pack with a repeated `level_1` must not reuse another pack's progress. Invalid packs leave the active pack, selection, and board untouched.

The browser cannot enumerate sibling world files under `file://`; loading a world remains an explicit picker/drop/paste action. No server, `fetch`, ES modules, or network dependencies are introduced.

### 6. Generate level-specific victory imagery locally

When a World 1 level has a valid existing `win_picture`, keep using it. Otherwise generate a deterministic solved-board snapshot from trusted tile glyphs and the final player/crate/target positions, then show it only after victory. Clear it on restart or level change. Do not inject arbitrary user-provided SVG markup; custom images continue through the existing PNG data-URI validation.

### 7. Keep the eight-level curve while revising the contradictory remix slot

Author eight levels against the World 1 blueprint: 5×5 safe single push; two-crate pivot; deadlock awareness; maze/detour combination; classic-style homage; odd long-corridor remix; four-crate hard sorting; 16×9 mastery. Levels 1–3 must be solvable and avoid unintended irreversible softlocks. Every authored par must equal the computed minimum strokes when the bounded solver can prove an optimum.

The blueprint's level-6 text says a conveyor alley forces backward pulls/pushes, which conflicts with Sokoban's push-only rule and mixes in World 4's mechanic. Preserve the odd/remix role with an asymmetric long warehouse corridor, but do not implement pulling. Conveyors are not required in World 1; if an authored remix later uses one, it must not enable a pull action and must still be reviewed as a Sokoban level.

Use solver validation plus human route review. A solver-proven level is not enough: verify each intended gate is unavoidable, target/link pairs are correct, no crate can be pushed through a closed gate, and the teaching point matches the slot. A complete deadlock detector is deferred; undo/restart remain recovery tools.

### Route review: levels 1–4

Coordinates below use A1 at the bottom-left. The route and gate checks were
replayed with the shipped resolver; the headless World 1 assertions also remove
each target link in turn and confirm that the corresponding exit route becomes
unsolvable.

- **Level 1 — First Push (5×5, par 8):** push B3→C3, then take B4–B5–C5–D5–E5,
  enter the link-1 phase wall at E4, and finish at E3. D3 is a wall and E5 is
  enclosed from the goal side, so E4 is the only entrance to the exit. C3 is a
  safe target pocket: its other push destinations are walls. The crate cannot
  be pushed onto the gate.
- **Level 2 — Corridor Pivot (6×6, par 8):** push the first crate C3→D3, which
  opens link 1. The second crate at C4 blocks the direct north lane; push it
  north into the intentional C5 parking pocket, then go D4–E4–F4–F5 through the
  gate to F6. E5 and the cells beside the goal are walls, so the gate cannot be
  bypassed. C5 is a deliberate non-target parking cell that does not block the
  exit. The second crate cannot be pushed sideways into the gate corridor or
  farther north from its parking cell.
- **Level 3 — Corner Check (8×6, par 9):** push C3→D3, then go C4–D4–E4–F4–G4,
  enter the link-1 gate at G5, and reach H5. H4 and the cells south of the
  target are walls, leaving no route around G5. The crate's only useful push is
  onto its safe target; the sealed wall corners are not reachable crate lanes.
- **Level 4 — Two-Chamber Detour (10×6, par 13):** push B4→C4 to open link 1,
  detour via B5–C5–D5–E5, cross E4, then push G4→H4 to open link 2. Finish by
  taking G5–H5–I5, crossing J5, and entering J4. The wall at F5 separates the
  chambers, D4 blocks a bypass around the first gate, and I4 blocks a bypass
  around the second. Both crates are stopped by the wall immediately beyond
  their target cells and cannot be pushed into a gate.

Levels 1–3 were reviewed specifically for required-crate deadlocks: the tutorial
crate reaches a terminal target pocket, level 2's second crate is intentionally
parked outside the exit lane, and level 3 has no required push into a corner.
The loader proves start-state solvability and exact par; it does not claim to
detect every optional dead-end push, so undo remains the recovery mechanism.

### Route review: levels 5–8

The same solver replay was used for the later levels. Their shortest paths make
the target occupancy and gate order explicit, and the content test verifies
that removing any target link makes the level unsolvable.

- **Level 5 — Warehouse No. 3 (12×8, par 15):** push B2→C2 (link 1), take the
  upper aisle to F3, then pass through gate F3 into the second chamber. Push
  H2→I2 (link 2), take the upper aisle through gate L3, and finish at L2. The
  wall at G4 separates the upper aisles, so neither gate can be bypassed. Both
  target cells are terminal pockets; neither crate has a route onto a gate.
- **Level 6 — Long Alley Remix (14×6, par 17):** push B3→C3, then traverse the
  asymmetric B5-to-N5 horizontal alley, turn south to M4, and enter gate N4
  before reaching N3. The wall at M3 prevents a bypass. The source blueprint's
  “backward pulls/pushes” conveyor concept conflicts with Sokoban's push-only
  rule, so this remix uses no conveyor IDs and asks only for a forward crate
  push followed by walking; pulling is neither represented nor required.
- **Level 7 — Four-Crate Shuffle (16×9, par 21):** the four pushes are B2→C2
  (link 1), G2→G1 (safe blocker parking), I2→J2 (link 2), and M2→N2 (link 3).
  The player crosses gates F3, L2, and P3 in order. E2, K2, and O2 wall cells
  keep crates out of the gate route; G1 is a bounded non-target parking pocket.
  The required target crates are parked against walls beyond their plates, and
  each link is necessary to reach the next chamber.
- **Level 8 — Master Warehouse (16×9, par 23):** the same four-crate/three-link
  sorting sequence opens gates F3, L2, and P5. After target N2 is occupied, the
  player takes the final switchback M3→N3→N4→O4→O5→P5→P6. P4 and O6 are walls,
  so the final gate cannot be bypassed. The 16×9 board adds a longer exit
  detour without introducing pulling or real-time movement.

Levels 5–8 contain no belt/conveyor tiles. Every solver route consists solely
of player moves and valid forward crate pushes; there is no pull action in the
resolver. The later-level pack tests replay each route, check the recorded
minimum pars, confirm every target/gate link is visited, and prove each link is
required by solving a variant with that link's target removed.

## Risks / Trade-offs

- [A crate-underlay normalization change can affect existing Prologue crate levels] → Add regression tests for all current crate pushes, vacated-cell traversal, renderer state, and Prologue solver results before updating shipped content.
- [Three link variants may constrain later levels] → Limit the first implementation to the three links required by the reviewed World 1 pack and document the allocation; revisit per-instance overrides only when a concrete level requires more.
- [Closing a momentary gate while the player stands on it can leave the player on a now-solid cell] → Preserve normal resolver behavior for occupying a cell that closes around the player, permit leaving it, and test that the player cannot re-enter after leaving; avoid authoring levels that require a different rule.
- [BFS may return `unknown` on dense later levels] → Keep state/depth budgets, report unknown distinctly, and use constrained level design or a separate offline verification tool rather than treating unknown as solvable.
- [Pack names or level keys may collide in progress storage] → Namespace every record by stable world ID and test migration of existing Prologue records.
- [The victory snapshot could expose unsafe SVG or stale state] → Construct output only from trusted catalogue glyphs and the winning state; clear it on every reset/load path and cover lifecycle behavior in browser tests.
- [The old World 1 maps and pars are invalid or strategically bypassable] → Redesign rather than mechanically transcribe them; validate the actual authored grid and manually inspect solver paths before claiming content complete.

## Migration Plan

1. Add target/gate variants and crate-overlay semantics with regression tests while keeping all existing Prologue levels loadable.
2. Add stable world identity and direct selection for loaded packs; migrate existing Prologue progress keys compatibly.
3. Add renderer composition and victory snapshots, retaining current custom-PNG support and PASS fallback for unrelated legacy content.
4. Author and validate the World 1 pack. Only expose it as a shipped example after the whole pack passes validation and manual route review.

Rollback is file-level: remove the World 1 pack and revert the feature through a later OpenSpec change. Do not rewrite or discard user-loaded packs or progress during rollback.

## Open Questions

- None blocking for the first implementation. The provisional ID allocation is documented above; if it proves insufficient during level authoring, revise the design before coding rather than inventing per-cell overrides ad hoc.
