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

## Authored World 4 Route Review

All coordinates use A1 at the bottom-left. Each pack route was replayed through
the shared resolver; the content tests verify solvability, exact minimum par,
forced-chain endpoints, and safe stops.

- **Level 1 — First Current (5×5, par 2):** move east from A3. The player belt
  carries the player through D3 and stops on floor at E3; move north to E4.
  There are no crates or alternate branches in this tutorial.
- **Level 2 — Double Circuit (7×5, par 8):** enter the west circuit from A3 and
  use a second east input to leave it at C3. Take the lower connector to E2,
  enter the east circuit, then step east twice to G3. The optimal route triggers
  both finite loop detectors; it never needs the safety hop cap. The loops are
  recoverable because the player can choose a manual exit after the resolver
  reports the repeated directed state.
- **Level 3 — Ice Launch (9×6, par 7):** walk A2–B2, then push C2 east. The
  crate crosses D2–E2 ice, follows the F2 east crate-force belt, and stops
  safely at G2; the player follows into C2. On the next input the player slides
  to F2, where the crate-force belt shoves the crate one more safe cell to H2
  and carries the player into G2. The player turns north through G3–G5, then
  east to H5. The source blueprint calls
  this a “bridge”; the engine has no bridgeable gap tile, so the authored level
  teaches a safe crate stop and a cleared vector lane instead. An optional extra
  eastward push is recoverable through the F-column upper passage, so it cannot
  irreversibly softlock this early level.
- **Level 4 — Wall Channel (10×8, par 7):** the opening east input turns north
  at D3, slides over D4–D5, and stops against the wall at D6. The player walks
  east, enters the second east belt at G4, and is carried to H4 before taking
  the two north steps to H6. The blueprint's “wall redirector” is deliberately
  represented by a wall stop plus an explicit belt direction; walls do not
  contain hidden or scripted redirection behavior.
- **Level 5 — Compression Chamber (12×8, par 13):** push the crate from C3
  across D3–G3 ice until the wall at H3 stops it on G3. The player enters C3,
  climbs to the upper corridor, and walks east to L5. This is a safe block
  compression puzzle, not a crushing or death mechanic; a wrong push can be
  undone, and no entity is deleted.
- **Level 6 — Long Alley (16×6, par 2):** one east input traverses the
  16-column belt/ice channel and naturally stops on P3 floor; one north input
  reaches P4. “High speed” is expressed as a long deterministic chain, with no
  animation timing or frame-speed condition.
- **Level 7 — Circuit Exit (16×9, par 17):** enter the four-way loop from A4;
  its finite chain returns to B4. Push the block south from B3 to B2 and again
  to the safe B1 parking cell, opening the only lower exit from the loop. Walk
  east across the long corridor to P2. The two pushes are valid, one-object
  pushes; neither belt collision pushes one crate into another.
- **Level 8 — Absolute Momentum (16×9, par 4):** enter the eastbound channel at
  A2, turn north at G2, continue over G3–G4 ice, and follow the westbound belt
  to G5. The fixed crate at F5 is the safe stop. Move north to G6; the upper
  eastbound channel carries the player to P6, then two north inputs reach P8.
  The network is finite and the route does not rely on hitting the chain cap.

The source blueprint's “crushing chamber,” “wall redirector,” “gap bridge,”
“high-speed,” and “zero safe footing” phrases are adapted to the accepted
turn-based contract: blockers stop vectors safely, belts explicitly set
directions, ice preserves incoming direction, and every authored solution has
a stable stopping cell. No level adds wall-clock speed, destructive movement,
or implicit wall scripts.

## Open Questions

- None blocking. The force-queue ordering and board-derived cap above are the implementation contract for the first version.
