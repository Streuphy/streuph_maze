# Design

## Context

See `proposal.md` and `specs/line-of-sight-hazards/spec.md` for motivation and observable behavior.

The resolver is synchronous and returns ordered step records; the renderer animates those records but cannot affect their outcome. Crates are separately represented in state, and the current rules already support push actions, undo snapshots, a bounded BFS solver, and level-local linked gates. There is no hazard/raycast state or respawn event. World packs and their stable identity/direct selection are being defined in `world-1-sokoban`; this change reuses that contract rather than inventing another pack schema.

## Goals / Non-Goals

**Goals:**

- Resolve fixed cardinal ray threats deterministically against the settled board after each successful player action.
- Let the existing movable crates act as shields and make catch/respawn an undoable one-stroke outcome.
- Keep non-player game state intact while recomputing any state derived from the respawned player's position.
- Deliver eight level-pack entries that teach static line of sight without wall-clock timing.

**Non-Goals:**

- Moving/sweeping rays, timers, animation-dependent hazards, or a terminal game-over state.
- New crate physics, colored-shield requirements, or a general hazard scripting language.
- Modifying the World 6 adjacency receiver or the World 1 occupancy target.

## Decisions

### 1. Represent emitters as static directional tile variants

Add a hazard tile family with one registered definition per cardinal direction, provisionally using reserved IDs 81–84. Each emitter is static and has no per-instance mutable phase. This avoids requiring the current ID-keyed override mechanism to express a direction per occurrence. Emitters return presentation metadata/glyphs; ray traversal is determined by the rules layer.

**Alternatives considered:** a single emitter ID with a direction override cannot represent differently directed occurrences in one level; moving rays add turn-phase state and conflict with the no-wall-clock design; arbitrary YAML ray scripts would be difficult to validate and solve.

### 2. Trace rays through a single settled state

After a valid move/push and all existing forced movement and entry effects finish, trace each emitter cell-by-cell in its direction. Stop at the first board edge or opaque cell. Walls, crates, and currently solid barriers occlude a ray; an unlocked barrier does not. A target is visibility for the emitter only and does not itself block the ray. This makes the same final state produce the same catch result.

Ray resolution occurs before the final goal test. If a player reaches the goal while exposed to a ray, the catch takes precedence and the level is not cleared. A static ray does not catch a player merely because a level is constructed with that player position; every authored start cell must be safe.

### 3. Make catch a post-action player relocation, not a level reset

Use one resolver event sequence: movement/push → existing forced movement and tile effects → linked-lock rebuild → ray check → if caught, emit a respawn step and set player coordinates to `start` → recompute player-position-derived momentary switches/locks → test goal → return the complete step list. Preserve crate positions, P/W colors, latched switches, and other non-player mutable state.

The attempted successful player action is charged once even if the player ends at the same coordinates after respawn. Catch must explicitly mark the turn as changed/stroked; deriving stroke cost only by comparing the pre-turn and final player coordinates would incorrectly make a catch free. Undo remains the existing pre-action snapshot restore, so it naturally reverses both the action and the respawn.

**Alternatives considered:** restarting the whole level would erase the strategic crate/color setup the user wants to retain; charging one stroke for movement plus another for respawn contradicts “one stroke to reset”; handling catch in the renderer would make results animation-dependent and unsearchable.

### 4. Treat shields as existing crates and define opacity centrally

Use the existing pushable crate entities as ray shields; do not add a second block type for this world. A crate in an emitter's ray blocks cells beyond it regardless of crate color. Walls and locked gates are opaque; open gates are transparent. The final resolver must query actual settled crate/gate state rather than tile-glyph color or DOM classes.

### 5. Keep ray and respawn state in solver-visible transitions

Emitters are immutable level data, so no new ray phase enters state keys. Respawn is part of the same turn, not a queued event. The BFS successor must retain the pushed crate changes, colors, latches, and derived player occupancy after respawn. A successful catch must remain a one-stroke successor even when its final player position equals the initial position. Tests use the same real resolver as interactive play.

### 6. Author static variants in the eight-level progression

Retain the blueprint's eight roles and suggested board sizes. Replace the “timed movement,” “timed exit,” “swept corridor,” and “moving rays” wording with fixed rays, static intersections, or deliberate player-triggered linked gates. No action advances a wall-clock ray phase. The pack lives at a World 2-specific `data/worlds/` path and uses the shared W1 world-pack format once that contract is available.

## Authored Level Route Review

The pack is `data/worlds/world-02-lolos-castle.levels.yaml`. All eight starts are at A1 and are outside every active ray in the initial state. The solver proves these minimum-stroke pars: **6, 6, 9, 12, 14, 14, 28, 36**. Route replay through the resolver confirms the intended shield and catch transitions:

| Level | Route and review |
|---|---|
| 1 — First Medusa | Push the crate north to the westbound row at C3; it blocks the ray before the exit at A3. The player can then reach the exit without entering the exposed segment. |
| 2 — Crossfire | Push the crate north to the crossing at C3. The crate blocks both the southbound and westbound rays; the exit at A3 is safe behind the shield. |
| 3 — Crossing Lines | Push the crate north onto the intersection at E3. It occludes both rays. The solver's shortest continuation uses one intentional catch from the exposed horizontal segment, then returns from A1 to the now-safe exit at A3. |
| 4 — The Unhurried Exit | Push the crate east onto the link-1 target; the player is caught and respawns while the target remains occupied. The link-1 gate opens, and the exit route follows the bottom corridor. Replacing the target with floor makes the level unsolvable, so the gate cannot be bypassed. |
| 5 — Four Medusas | Push the crate north to F5, where it blocks the westbound courtyard ray and the southbound ray. A subsequent exposed step intentionally respawns the player; the exit is then reached behind the shield. The two side emitters are stopped by their adjacent walls. |
| 6 — Still Corridor | Push the crate north to H4 to shield the westbound corridor. The shortest route accepts one catch on the exposed side of the shield and returns to the exit from A1. The other emitters terminate at walls; none sweeps or advances with time. |
| 7 — Twin Chambers | Push the first crate onto link 1, respawn, cross gate 1, then push the second crate onto link 2 and respawn before crossing gate 2. Wall F2 closes the upper bypass around gate 1, and the wall at K2 closes the gate-2 bypass. Removing the targets makes the level unsolvable. |
| 8 — Labyrinth Fortress | Three shield pushes activate links 1–3 in order; each caught push returns the player to A1 while retaining its crate and open gate. The three gates are the only passage between row-1 chambers, and replacing all targets makes the level unsolvable. Six static emitters and three movable crates are present; the three auxiliary rays terminate in walled-off cells. |

Solver replay ends with every level won, all three gated levels become unsolvable when their target cells are removed, and replayed respawns always land on the authored safe start. The static ray layout—not a timer, animation, or sweeping phase—is the only hazard state.

## Risks / Trade-offs

- [A crate moved during the same action can alter the ray line] → Check only the fully settled post-action board and test both shielding and unshielding pushes.
- [Respawn may land on a momentary switch or gate-dependent position] → Recompute position-derived links after relocation while preserving latched/non-player state; test both entry and departure cases.
- [Caught movement can end at the pre-action coordinates] → Represent catch as an explicit stroke-producing resolver outcome, independent of final coordinate equality.
- [Dense emitters increase solver work] → Trace each ray only to its first obstruction, share no mutable simulation state, and retain bounded solver limits with `unknown` reported distinctly.
- [Blueprint wording implies moving hazards and timing] → Treat the accepted no-time rule as authoritative and review every level for turn-based clarity.
- [Reserved tile IDs may have been allocated by another pending world change] → Coordinate registry allocations across the independent world changes before implementation; do not ship conflicting IDs.

## Migration Plan

1. Add the directional hazard definitions and pure ray-query/catch semantics without changing existing movement, crate, or receiver rules.
2. Add resolver and solver tests, including catch stroke accounting and exact undo restoration.
3. Add presentation and browser tests for ray visibility, shielding, and respawn feedback.
4. Author the eight-level pack on the common world-pack contract, verify every solution/par, and manually review safe starts and intended shielding routes.

Rollback removes the World 2 pack and hazard definitions through a later change; it must not reset stored progress for the Prologue or other worlds.

## Open Questions

- None blocking. Emitter IDs 81–84 are provisional and must be checked against the combined tile-ID allocation before coding.
