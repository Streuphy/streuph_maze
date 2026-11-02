# Design

## Context

See `proposal.md` and `specs/crate-proximity-switches/spec.md` for the receiver behavior contract.

The current engine already implements ID 50 as a color-matched crate-adjacency sensor, checks all four cardinal neighbors, recalculates its activity from crate positions, drives linked momentary locks, exposes direction indicators to the renderer, and has headless tests for wrong-color, same-cell, and N/S/E/W cases. However, ID-keyed overrides mean every cell using ID 50 shares the same color and link. The current `rebuildLocks` behavior is OR-based for active sensors on a link, not AND-based. `world-1-sokoban` is adding the common world-pack and crate-overlay contracts this pack should reuse.

## Goals / Non-Goals

**Goals:**

- Preserve the established adjacency-only semantics of ID 50.
- Support a small, explicit set of color/link receiver variants so World 6 can author separate receiver links without per-cell overrides.
- Build and validate eight levels centered on docking/re-docking colored crates.
- Keep receiver activity derived from crate positions and compatible with existing undo, solver, and visual indicators.

**Non-Goals:**

- Change a receiver into an occupancy target or permit diagonal/player contact.
- Add AND-combinator semantics requiring multiple same-link receivers to be active simultaneously.
- Add generalized per-cell override syntax or depend on World 4 momentum mechanics for World 6 crate movement.
- Change the existing World 1 crate-target rule or add new gameplay colors.

## Decisions

### 1. Preserve ID 50 and its exact tested behavior

Keep ID 50 as the existing red, link-1 receiver. Its activation remains “at least one matching crate in N/S/E/W”; all four directions may be shown lit, but only one matching neighbor is needed for active state. A crate on the receiver is not adjacent and does not count. Receiver activity is recalculated after crate movement rather than latched.

**Alternatives considered:** repurposing ID 50 as a crate-on-target tile would break the existing B11 tests and World 1 distinction; storing sensor activity as a latch would leave gates open after the crate moves away.

### 2. Add fixed color/link variants rather than per-cell override data

Use dedicated registry variants for the receiver color/link pairs needed by this world. Keep ID 50 for red/link 1 and provisionally allocate IDs 90–100 for the remaining pairs on links 1–3:

| ID | Color | Link |
|---:|---|---:|
| 50 | red | 1 |
| 90 | gre | 1 |
| 91 | blu | 1 |
| 92 | wht | 1 |
| 93–96 | red, gre, blu, wht | 2 |
| 97–100 | red, gre, blu, wht | 3 |

This matches the current grid-ID configuration model and keeps YAML declarative. Link-2/link-3 consumers reuse the phase-wall variants proposed in World 1 (provisionally IDs 26/27). Reconcile this shared registry allocation before implementation; if either set changes, update both designs/specs before applying either change.

**Alternatives considered:** per-cell overrides would support arbitrary combinations but would expand the schema/editor/serializer for a requirement that needs only a few variants; a single link for every sensor would not demonstrate independent gates; same-link AND logic is not the current lock contract and would be a new combination mechanic.

### 3. Use separate links for sequential/interdependent dock puzzles

Each receiver variant activates its own configured link. Multiple active receivers on the same link continue to combine with existing OR semantics. Levels requiring a sequence of two docks use separate links and gates, or require the player to re-dock a crate after a previous gate changes; they must not imply that one gate waits for every same-link sensor unless a future capability adds AND semantics.

### 4. Rely on derived sensor state and existing transition/search model

Do not add mutable receiver flags to snapshots. `sensorLit` derives directional indicators and active state from current crate positions; lock rebuilding uses that result. Existing crate snapshots/undo and resolver-based BFS therefore remain the source of truth. Add regression tests for every new variant's default color/link and ensure an unrelated link never changes.

### 5. Author independent content without a new file convention

Place World 6's eight named levels in its own world pack under `data/worlds/`, using the shared W1 schema and explicit local file loading. Retain the blueprint's eight progression roles and max 16×9. For the long Railway Dock, use pushing and track geometry only; do not require the still-new World 4 sliding behavior, which would couple two independently managed worlds.

## Risks / Trade-offs

- [Variant IDs can collide with other world work] → Reserve the listed IDs in the combined registry plan and run a unique-ID test before implementing any world change.
- [The current lock resolver uses OR semantics] → Author independent links for separate gates; add explicit tests to prevent accidental AND assumptions.
- [Receivers may look like World 1 targets] → Keep the flat-top receiver glyph with N/S/E/W indicators and the target's separate target glyph; document that only adjacency activates ID 50/variants.
- [Crate rendering/underlay is being addressed by World 1] → Treat the World 1 crate-overlay behavior as a prerequisite and test visible crates before approving World 6 content.
- [The current source may contain too few levels or inaccurate pars] → Treat all eight maps as content to be validated, not as values to copy; compute par with the real resolver and manually review docking routes.

## Migration Plan

1. Coordinate and register the color/link variants; keep ID 50 behavior unchanged and add registry/validation tests.
2. Verify existing adjacency tests and add variant, multi-link, undo, gate, and solver tests.
3. Reuse World 1's crate overlay/world-pack capabilities and implement the World 6 pack and direct selection.
4. Author, solve, par, and manually review all eight levels for the intended color-matched adjacent docking behavior.

Rollback removes World 6's pack and any newly allocated variants. Existing ID 50 levels, Prologue content, and World 1 targets remain unchanged.

## Route review: World 6 levels

Coordinates use A1 at the bottom-left. Routes below are the shared BFS solver's
minimum-stroke paths and were replayed through the resolver; comparison of tied
minimum routes completed for every level. Counts include explicit directional
commands (including pushes), not forced conveyor hops. Removing any listed
receiver makes its level unsolvable, and the level tests assert the route crosses
each linked gate. The pack uses no target IDs: receivers are activated only by
matching-color crates in cardinally adjacent cells.

- **Level 1 — First Dock (5×5, PAR 6):** `U R D R R R` (U=1, D=1, L=0, R=4).
  The first push moves the crate B2→C2, immediately adjacent to receiver D2; the
  only route to E1 crosses link-1 gate D1. A crate on D2 would not activate the
  receiver. Reversing the push or parking the crate off the dock is recoverable
  with undo/restart; no blocked action changes the board.
- **Level 2 — Two Colors, Two Links (7×5, PAR 6):** `R R R R R R`
  (U=0, D=0, L=0, R=6). Red crate C3 docks at B3/link 1 and green crate F3
  docks at E3/link 2. The sole route from A2 to G2 crosses gates C2 and E2 in
  order. The crate-and-wall alcoves do not permit a bypass or push into the gate
  corridor.
- **Level 3 — Around the Corner (9×6, PAR 12):** `U L U R R R D R D R R R`
  (U=2, D=2, L=1, R=7). The crate starts at C2; push north to C3, walk around
  its west side, then push east around the corner. It ends at F3 beside receiver
  E3, opening the only route through gate G1. Short pushes onto the receiver do
  not count as contact, but the minimum route re-docks it on the far side.
- **Level 4 — Belt and Barrier (10×8, PAR 8):** `R R R R R R R R`
  (U=0, D=0, L=0, R=8). The red crate begins docked at C2 beside B2's receiver;
  a single east command on B1's player conveyor carries the player to C1. Gate
  F1 is the only exit from the corridor. The route uses the existing conveyor
  resolver and does not depend on World 4 sliding.
- **Level 5 — Castle Basement Rooms (12×8, PAR 11):** eleven east commands
  (U=0, D=0, L=0, R=11). The red/link-1 dock at B3 and green/link-2 dock at H3
  control consecutive gates D1 and H1. The two walled rooms cannot be traversed
  as a substitute path; each gate's receiver is individually necessary.
- **Level 6 — Railway Dock (16×6, PAR 19):** `U U` + ten east pushes + `D D` +
  five east commands (U=2, D=2, L=0, R=15). Push the crate from B3 to L3 along
  the 16-column railway, where it touches receiver M3. Return through K2/K1 and
  cross gate O1 to P1. K is the only descent from the track; the gate cannot be
  bypassed from the upper rows.
- **Level 7 — Re-dock the Red Crate (16×9, PAR 21):**
  `R R U R U L R D D` + twelve east commands (U=2, D=2, L=1, R=16). The red
  crate at C3 initially activates receiver D3/link 1, opening gate C1. After
  crossing it, push the crate west to B3; link 1 deactivates and receiver A3/
  link 2 activates. Gate F1 then opens. The solver route confirms the re-dock
  occurs only after the player has crossed the first gate.
- **Level 8 — Grand Dockworks (16×9, PAR 21):** the same re-dock sequence as
  level 7 (U=2, D=2, L=1, R=16), followed by the long route through gate M1.
  A red crate switches from D3/link 1 to A3/link 2 after gate C1; a separate
  blue crate stays beside the blue/link-3 receiver at I4 and opens gate M1.
  Each of the three link gates is necessary and inspectable. This combines
  sequential re-docking with a stable second-color dock without introducing
  new movement behavior.

Levels 1–3 were manually checked for plausible wrong pushes and dead ends.
Bounded wall cells prevent crate loss into the gate route; a wrong push can
temporarily park a crate away from its intended dock, but undo/restart restores
the authored puzzle. The pack's shortest routes and exact pars are asserted in
the World 6 content suite.

## Open Questions

- None blocking. The variant map is intentionally limited to three links and four gameplay colors; expand it only when a reviewed level demonstrates the need.
