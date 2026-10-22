# Design

## Context

See `proposal.md` and `specs/vector-momentum/spec.md` for the world behavior contract.

The current engine already supports four-direction player conveyors (IDs 64–67), crate-force conveyors (IDs 60–63), synchronous resolver step records, undo snapshots, and a 64-hop belt-chain cap. It does not have ice terrain or a forced-movement rule for an entity that was just pushed. The renderer plays returned steps; the BFS solver uses the same resolver. The World 1 change is defining the common world-pack and crate-overlay contract that this pack will reuse.

## Goals / Non-Goals

**Goals:**

- Preserve the tested conveyor behavior while adding explicit ice sliding for players and crates.
- Resolve all movement from one input synchronously, with stable event ordering, one stroke, and bounded chains.
- Make forced steps visible to the renderer and identical in undo and solver paths.
- Author eight finite, solvable levels without high-speed/reflex timing or entity destruction.

**Non-Goals:**

- Wall-clock momentum, animation-driven state, pinball randomness, or player-crushing/game-over behavior.
- Replacing existing conveyor IDs or changing their current player-vs-crate distinction.
- Implementing arbitrary wall redirector scripts or pushing one crate into another.

## Decisions

### 1. Add one explicit ice terrain tile; reuse directional conveyors

Use currently reserved terrain ID 5 for a walkable `ice` cell. Keep the existing conveyor IDs and their configured cardinal vectors. Ice preserves the direction of the movement that entered it; conveyor cells supply their own vector. This separates a surface that carries current momentum from a belt that applies a declared direction.

**Alternatives considered:** encoding ice as a player belt would make it directional and could not represent the push direction; changing all existing belt semantics would risk the Prologue levels and existing tests; per-instance direction overrides are unnecessary for a non-directional ice surface.

### 2. Resolve forces as a deterministic event queue inside one action

After a valid player step or push, settle forced movement synchronously and append each committed substep to the resolver result. On a push, first move the crate one cell and the player into its former cell; settle the crate's ice slide from the push vector, then settle any player force chain from the player's resulting cell. A later force is processed only after the preceding entity reaches a stable cell. A forced crate stops before a wall, board edge, or other crate; it never pushes a second crate by inertia.

On a player-carrying belt, preserve current semantics: advance the player one cell in the belt direction, stop at a blocking crate/wall, and continue if the destination is another belt or ice. On a crate-force belt, preserve the current explicit crate-shove rule; any resulting crate-on-ice slide follows its belt direction. Every automatic hop costs zero strokes; the initiating player action remains one stroke.

This ordered queue avoids nested recursive tile callbacks and lets the renderer replay a complete, already-determined result. It must use the same data path for play and BFS.

### 3. Bound force chains by board state, not frame timing

Track the moving entity, coordinate, and direction during each force chain. Stop a repeated state as a loop and enforce a hard maximum of `width × height × 4` directional states per chain (at most 576 on the maximum board). Report a cap/loop step for diagnostics; do not freeze the UI or leave a partially resolved turn. Author levels so ordinary solutions do not depend on hitting a safety cap.

**Alternatives considered:** retaining the existing fixed 64-hop cap could cut off a legitimate route spanning much of a 16×9 board; a wall-clock timeout would violate turn-based purity; an unbounded loop is unsafe for both play and load-time BFS.

### 4. Treat collisions as stops, never as crushing

Forced movement checks bounds, static solidity, current gate state, and crate occupancy before committing each hop. A blocked destination leaves the entity on its last valid cell. No force destroys the player or a crate. The level-5 “crushing chamber” is re-authored as a block-compression/route puzzle where walls stop vectors safely, not as a lethal condition.

### 5. Keep tile and turn state minimal

Ice itself is immutable level data. Direction is local to the current resolved event chain and does not persist between player inputs. Crate and player positions already live in the mutable state and snapshots; no new persistent momentum field is needed. Any loop/cap marker is a returned display step, not gameplay state. The solver's transition signature only needs state that survives the turn.

### 6. Stage levels and document the common file dependency

Author all eight pack levels using the `world_id`/name/`num_level` world-pack shape from the World 1 change. Keep the proposed board sizes and roles, but translate “high-speed” into long deterministic chains and remove destructive crushing. Level data can use existing flow IDs and new ice ID 5. Do not add another file-discovery mechanism; under `file://`, load this pack through the shared explicit picker/drop/paste workflow.

## Risks / Trade-offs

- [Changing how a push settles can subtly alter existing crate-belt interactions] → Preserve the current resolver tests first and add combined push/belt/ice scenarios without rewriting existing expected results.
- [Entity event ordering can yield confusing animation or a different final state] → Specify and test the queue order, and compare renderer replay's final mirror with the rules state.
- [Maximum force chains raise BFS branching/step cost] → Track repeated directed states, enforce the board-derived cap, and keep V10 search budgets.
- [A forced entity may reach a gate whose state changes during the same turn] → Resolve force conditions against the current state at each hop and rebuild linked locks only at documented resolver boundaries; avoid levels relying on ambiguous mid-chain switch changes.
- [The source uses “crushing” and “high-speed” terminology] → Replace those with safe push-compression and long-chain concepts in World 4 level text; no death or frame-speed mechanic is introduced.
- [The new ice ID is shared registry space] → Reserve ID 5 for ice in the combined tile allocation and check against other pending changes before implementation.

## Migration Plan

1. Add the ice tile and forced event-chain model while retaining current belt tests unchanged.
2. Add headless tests for player/crate ice slides, push ordering, blockers, loops, hop caps, strokes, solver transitions, and undo.
3. Extend renderer step playback for the newly returned forced movement records and verify final display mirrors.
4. Author, solve, par, and manually review all eight levels in the World 4 pack.

Rollback removes the World 4 pack and ice definition in a later change. Existing belt tile definitions and Prologue behavior must remain operational.

## Open Questions

- None blocking. The force-queue ordering and board-derived cap above are the implementation contract for the first version.
