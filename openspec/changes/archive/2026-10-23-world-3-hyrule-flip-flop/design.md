# Design

## Context

See `proposal.md` and `specs/binary-gate-polarity/spec.md` for the intended polarity behavior.

The World 3 allocation registers IDs 46–48 for the red barrier, blue barrier, and ACT switch; ID 49 remains reserved. ID 44 is the existing global master lock, and ID 45 is reserved for deferred master-void behavior. The resolver maintains state, derives gate solidity, snapshots turns for undo, and runs a bounded BFS over its own transition function. World 3 uses the world-pack contract defined by World 1 rather than creating a second pack schema.

## Goals / Non-Goals

**Goals:**

- Provide a per-level binary state that controls red and blue polarity barriers as complements.
- Make switch activation deterministic, undoable, and identical in interactive resolution and BFS.
- Preserve current color-gate and master-lock behavior.
- Deliver eight named levels, including the explicitly resolved 16-column × 2-row corridor remix.

**Non-Goals:**

- Change the player's/world's color system or use aura/world-gate color matching for polarity barriers.
- Replace or overload ID 44 `master_lock` or implement deferred ID 45 `master_void`.
- Add timed state changes or a world-wide persistent polarity shared between separate levels.

## Decisions

### 1. Keep binary polarity separate from color state and lock links

Add one level-scoped boolean-like polarity (`red-open` / `blue-open`) to the mutable game state. Add two polarity barrier variants and one switch variant using reserved IDs 46, 47, and 48 respectively; reserve 49. The barrier definitions declare which polarity makes each tile solid. This is not `P`, `W`, or the existing `locked` matrix: polarity barriers do not perform a carrier-color test and do not consume link IDs.

**Alternatives considered:** reusing red/blue color gates would couple global inversion to the player's/world's aura and introduce color requirements; reusing `master_lock` would toggle all ordinary linked locks rather than swap two complementary classes; reusing `master_void` is prohibited and its semantics are different.

### 2. Activate polarity switches with ACT

Use the existing explicit ACT command when the player is standing on a polarity switch. Every successful ACT flips the level-wide state once and costs one stroke under the existing action rule. Walking onto a switch does not also toggle it. Multiple switches in one level all affect the same polarity.

This makes the switch action visible and lets levels distinguish reaching the switch from choosing to flip it. It also avoids double activation during entry and keeps state change within one resolver turn.

### 3. Resolve solidity from current polarity on every access

The barrier's solidity is derived from the tile definition and current state, not by rewriting tile definitions or mutating the registry. Player entry and crate destination checks both query the derived solidity. A normal switch flip can close a barrier beneath a crate; leave it in place, allow it to be pushed away under normal rules, and reject pushes back into the closed barrier. The single-cell ACT switch cannot close a barrier beneath the player through ordinary play, because the player must occupy the switch cell. Still preserve the generic occupancy invariant for a player already on a barrier in a runtime/restored state: do not eject it, allow departure, and reject re-entry while closed. Test that defensive player case with a focused state fixture; do not add remote ACT or layered tiles.

### 4. Include polarity in all state identity paths

Initialize polarity from optional level metadata with a documented default; validate it against the two allowed states. Include it in `newState`, `cloneState`, snapshots, restore, and the solver signature. Since gate solidity is derived, recompute it from polarity rather than snapshotting a second potentially stale gate map. The renderer receives the state via read-only tile descriptions and depicts both the barrier class and whether it is currently passable.

### 5. Keep world content coherent and deterministic

Use the blueprint's eight slots, max 16×9, and the world-pack structure from World 1. Define level 6 as 16 columns × 2 rows—the prose's “2×16 corridor” is treated as width × height despite the table's `16x4` typo. Use player-actuated changes, never automatic per-turn/timer cycles. For level 7, use movable/pushable blockers rather than introduce an unrelated breakable-wall mechanic in this world's core showcase.

## World 3 route and authoring review

All eight pack levels were loaded through the shared world loader and solved by
the real resolver. Every result was `solvable`, every returned route replayed
to `won` at the recorded minimum PAR, and route-balance comparisons completed.
The verified minimum PARs are 5, 8, 8, 12, 15, 20, 11, and 97 for levels 1–8.

### Balanced-optimal route example

For `level_2 Two-Switch Zigzag`, the solver-selected minimum route is
`R U ACT R R ACT D R`, PAR 8. Direction counts exclude ACT: U=1, D=1, L=0,
R=4; balance score 9; comparison complete. Replay wins in exactly 8 strokes.

### Manual route review

- **L1–L3:** Each is a single corridor embedded in walls. Initial starts are
  safe; the shortest route must ACT at each named crystal to exchange to the
  next required barrier class. There are no gate bypasses, crate deadlocks, or
  irreversible wrong pushes.
- **L4–L5:** Both use a winding two-state sequence: red-open → blue-open →
  red-open. The walls leave no bypass around either polarity gate. The ACT
  switch is a distinct cell from every barrier, so no player is trapped by a
  switch flip; no forced or timed transition occurs.
- **L6:** The 16×2 corridor is a deliberate turn-based reinterpretation of the
  blueprint's timed sprint. Five spaced ACT switches make each alternating
  gate segment traversable; there is no clock or automatic state change.
- **L7:** The minimum route pushes the crate onto the initially open red
  barrier, uses the upper crystal to open blue (closing red beneath the crate),
  then uses the second crystal to reopen red for the exit. The crate is a real
  path blocker, not decoration; the switch never closes under the player and
  no gate is bypassable.
- **L8:** The 16×9 board is a five-lane serpentine corridor, connected only at
  alternating ends. Its 14 ACT switches and paired red/blue barriers are all
  on the unique route; the shortest route exercises every lane and polarity
  transition. All starts are ordinary floor, not a barrier or switch.

These maps deliberately replace the blueprint's timed changes and breakable
blockers with deterministic ACT changes and a pushable crate, as required by the
accepted design and current runtime.

## Risks / Trade-offs

- [A polarity change can close the tile an entity currently occupies] → Do not eject occupants; test leave-but-not-reenter behavior for players and crates.
- [New polarity can be confused with aura colors] → Use distinct tile names/family metadata and glyph state; document that red/blue here mean barrier classes, not a `P` or `W` check.
- [State omitted from a clone or search key can make undo/par incorrect] → Add focused clone/restore/signature tests before authoring levels.
- [Registry IDs are shared across parallel world changes] → Keep the registered 46–48 meanings unique, leave 45 and 49 untouched, and reconcile the combined ID map before future allocations.
- [The source blueprint has a corridor size typo] → Encode and test level 6 as 16×2 in both metadata and grid shape.

## Migration Plan

1. Add tile variants and binary state derivation without changing existing gate definitions.
2. Add ACT transition, undo/clone/search integration, and headless tests.
3. Add switch/gate rendering and browser tests, including state closure under occupants.
4. Author and validate the eight-level pack; verify all pars against the real resolver and review route order manually.

Rollback removes the World 3 pack and its polarity definitions through a later change. It must not alter existing master-lock levels or stored Prologue progress.

## Open Questions

- None blocking. ID allocation and the `red-open` initial default are documented design choices and must remain consistent between definitions, YAML validation, and tests.
