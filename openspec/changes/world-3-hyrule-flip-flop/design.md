# Design

## Context

See `proposal.md` and `specs/binary-gate-polarity/spec.md` for the intended polarity behavior.

The registry has reserved IDs 46–49; ID 44 is an existing global master lock, and ID 45 is reserved for deferred master-void behavior. The resolver maintains state, derives gate solidity, snapshots turns for undo, and runs a bounded BFS over its own transition function. Its current barrier logic handles fixed lock links and phase-void state, not complementary global gate classes. World 3 will use the world-pack contract defined by World 1 rather than create a second pack schema.

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

The barrier's solidity is derived from the tile definition and current state, not by rewriting tile definitions or mutating the registry. Player entry and crate destination checks both query the derived solidity. If a flip closes a barrier beneath an existing occupant, leave that occupant in place; normal movement lets it leave, but it cannot enter again until the barrier opens. This follows the existing dynamic-gate occupancy convention and avoids teleporting or deleting entities.

### 4. Include polarity in all state identity paths

Initialize polarity from optional level metadata with a documented default; validate it against the two allowed states. Include it in `newState`, `cloneState`, snapshots, restore, and the solver signature. Since gate solidity is derived, recompute it from polarity rather than snapshotting a second potentially stale gate map. The renderer receives the state via read-only tile descriptions and depicts both the barrier class and whether it is currently passable.

### 5. Keep world content coherent and deterministic

Use the blueprint's eight slots, max 16×9, and the world-pack structure from World 1. Define level 6 as 16 columns × 2 rows—the prose's “2×16 corridor” is treated as width × height despite the table's `16x4` typo. Use player-actuated changes, never automatic per-turn/timer cycles. For level 7, use movable/pushable blockers rather than introduce an unrelated breakable-wall mechanic in this world's core showcase.

## Risks / Trade-offs

- [A polarity change can close the tile an entity currently occupies] → Do not eject occupants; test leave-but-not-reenter behavior for players and crates.
- [New polarity can be confused with aura colors] → Use distinct tile names/family metadata and glyph state; document that red/blue here mean barrier classes, not a `P` or `W` check.
- [State omitted from a clone or search key can make undo/par incorrect] → Add focused clone/restore/signature tests before authoring levels.
- [Registry IDs are shared across parallel world changes] → Reserve 46–48 for this change, keep 45 untouched, and reconcile the combined ID map before implementation.
- [The source blueprint has a corridor size typo] → Encode and test level 6 as 16×2 in both metadata and grid shape.

## Migration Plan

1. Add tile variants and binary state derivation without changing existing gate definitions.
2. Add ACT transition, undo/clone/search integration, and headless tests.
3. Add switch/gate rendering and browser tests, including state closure under occupants.
4. Author and validate the eight-level pack; verify all pars against the real resolver and review route order manually.

Rollback removes the World 3 pack and its polarity definitions through a later change. It must not alter existing master-lock levels or stored Prologue progress.

## Open Questions

- None blocking. ID allocation and the `red-open` initial default are documented design choices and must remain consistent between definitions, YAML validation, and tests.
