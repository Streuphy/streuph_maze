# Design

## Context

See `proposal.md` for motivation and `specs/tile-mechanics/spec.md` plus `specs/movable-objects/spec.md` for the behavior contract.

The current resolver is synchronous, DOM-free, and returns playback steps. Terrain is an immutable `[y][x]` grid; crates have a separate mutable position layer; switches/targets are indexed from their grid coordinates; portals are indexed by link. The catalogue is in `src/js/tiles.js`; the level loader validates ID-keyed overrides and flips YAML's top-down rows once. The solver, undo, and renderer all depend on state cloning and ordered resolver events. The source also contains planned-but-not-running ray behavior in world-specific artifacts; IDs 81–84 are registered but do not currently resolve ray effects.

## Goals / Non-Goals

**Goals:**

- Preserve existing IDs and no-override level files while introducing optional per-cell object capability overrides.
- Keep the OpenSpec behavior contract, the level-design guide, tests, and runtime behavior aligned.
- Add movable target features and generic push, pull, conveyor, portal, and ray transport without bypassing terrain and gate rules.
- Keep all outcomes deterministic, bounded, undoable, renderable, and solver-visible.

**Non-Goals:**

- Arbitrary user-authored scripts, diagonal movement, multi-object push chains by default, moving ray emitters, wall-clock hazards, or object destruction.
- Changing tile IDs, gameplay colors, board dimensions, or existing tile-ID override semantics.
- Treating display animation or DOM state as part of rule resolution.

## Decisions

### 1. Keep terrain and movable features in separate state layers

Retain the static terrain grid for floor, walls, gates, effects, and other cell surfaces. Normalize crate and target markers into stable entity records carrying type, identity, parameters, capabilities, and position; vacated cells reveal their original terrain. The player remains its own actor record. Targets remain non-blocking floor features that can coexist with a player or crate, so a crate at the target's current coordinates activates it. Moving a target changes only that entity's coordinates; its link, identity, and capability profile travel with it.

**Alternatives considered:** moving entries directly in the terrain grid would erase underlying floor/effects and destabilize coordinate-indexed switches; representing targets as crates would conflate occupancy activation with target identity and link state.

### 2. Store default profiles in the catalogue and per-entity overrides in YAML

Add declarative capability defaults to movable tile definitions. Preserve existing `overrides: { tileId: ... }` for type-level tile parameters. Add optional `object_overrides` keyed by board labels such as `C2`, whose supported keys are the spec's `pushable`, `pullable`, `conveyor`, `portal`, and `ray` capabilities. Validate coordinates against the authored grid, require a movable entity at each coordinate, reject unsupported keys/values, and apply the resolved profile to that entity once at level construction. The profile then moves with the entity rather than being re-read from its current cell.

Defaults preserve current intent where possible: player control remains intrinsic; crates remain pushable and ray-opaque; target features are pushable/pullable but non-blocking; conveyors/portals for non-player entities and ray transport are opt-in. Pull is enabled by default for crates and targets to satisfy the new interaction model. `ray: block` makes an object opaque, `ray: transport` lets it travel along a static ray, and `ray: ignore` neither transports nor blocks it. Player ray vulnerability remains intrinsic and uses the existing intended catch/respawn rule.

**Alternatives considered:** putting a behavior bitmask in the grid would make levels unreadable; ID-keyed overrides cannot distinguish two objects of the same ID; arbitrary scripts would be difficult to validate and search.

### 3. Route movement through shared legality checks and an ordered event chain

Use one destination predicate for bounds, current solidity, gate lock/color rules, and blocking-entity occupancy. Push is atomic: validate both the object's destination and the actor's step before moving either. Pull is an explicit directional action: the actor advances one cell and the eligible trailing entity moves into the actor's vacated cell. Bind Shift+direction to pull in the existing keyboard controls; ordinary movement keys remain unchanged. Do not push chains unless a future entity profile explicitly introduces that behavior.

Resolve each accepted action in this order: (1) validate and commit the direct move/push/pull atomically; (2) settle automatic movement for entities moved by that action in movement order, then the player; (3) apply the final resting tile's entry effect once for the player; (4) recompute targets, receivers, plates, and linked locks; (5) trace static rays in stable source-coordinate order against the settled board, transporting ray-compatible non-player objects; when transport changes an obstruction, retrace that emitter for cells beyond the moved object; an entity is transported at most once per emitter per turn; (6) recompute occupancy signals and locks after ray transport, then catch any exposed player; (7) recompute player-position links after a respawn; (8) test the goal and return the ordered events. No link/switch change opens a gate halfway through a single force chain. Teleport ends that entity's force chain and does not re-trigger the destination portal during the same action.

Conveyors keep their existing distinction: `player_*` belts carry the player and `crate_*` belts shove crates when a player force chain traverses them. The generic `conveyor` profile allows non-player objects to receive the applicable belt effect. Ice preserves the entering direction for each compatible entity. Forced motion stops before an invalid destination and uses repeated `(entity, cell, direction, effect)` state detection plus a board-derived finite cap.

Ray transport and ray threat are separate outcomes on static emitters. A ray-compatible non-player object that enters the ray travels in its direction through legal cells to the last reachable ray cell. Crates default to ray blockers; objects configured `ignore` do not block. The player remains vulnerable, is checked after object transport, and returns to start without resetting other state; no non-player object is destroyed by a ray. Walls, closed barriers, and opaque entities stop ray tracing.

**Alternatives considered:** an unstructured recursive callback model risks re-entry loops and inconsistent event ordering; resolving forced motion in the renderer would make play and search disagree; moving emitters would add phase state beyond this request.

### 4. Make state snapshots and event playback entity-complete

Include each movable entity's stable identity, type, parameters, capability profile, and position in clone/snapshot/restore and solver state identity. Returned events must identify the entity and its before/after position so the renderer can replay player, crate, and target movement from a display-only mirror. Derived target/sensor/lock state is recomputed from entity positions after restoration rather than stored as a second source of truth. The solver calls the same resolver and includes pull actions among its candidate transitions.

**Alternatives considered:** retaining crates as the only mutable object map would require one-off target movement code and duplicate collision logic; storing derived signals in snapshots risks stale links after undo.

### 5. Treat the spec and designer guide as maintained interfaces

Create `docs/level-design/tile-mechanics.md` with the complete catalogue, status labels (runtime/new/reserved), parameter defaults, authoring coordinate rules, an `object_overrides` example, movement/lock/color semantics, turn order, and level-validation guidance. Link it from `README.md`. Keep the OpenSpec capability specs normative; the guide is a readable authoring reference and must not claim planned or newly introduced behavior is present before runtime implementation lands.

**Alternatives considered:** duplicating only a prose guide would leave no testable contract; publishing only OpenSpec deltas would make the manual harder for level designers to discover and use.

## Risks / Trade-offs

- [Making existing targets pushable/pullable can change old solutions and pars] → Default target movement as specified, use per-cell `object_overrides` to keep intentionally fixed targets fixed, and re-run the solver/par checks across all existing levels.
- [Object event ordering may affect switch timing, ray shielding, and animation] → Lock the order above in resolver tests and assert that replayed renderer state equals the resolved state.
- [Per-cell override coordinates can be confused with YAML row indices] → Use the established A1 bottom-left coordinate notation and test top-row conversion and validation errors.
- [Capability combinations can create forced-movement loops or solver state growth] → Validate supported combinations, bound each chain by directed board states, and retain the solver's explicit `unknown` budget result.
- [Existing world specs describe overlapping future mechanics with different assumptions] → Use the new tile-mechanics catalog as the shared contract; reconcile World 2/4 deltas during implementation rather than treating their unimplemented text as runtime fact.

## Migration Plan

1. Add catalog capability metadata and backward-compatible `object_overrides` validation; existing levels without the field keep registered defaults.
2. Move crate and target positions into the entity-aware state while keeping terrain immutable and preserving current IDs and YAML grid markers.
3. Add atomic push/pull plus object-aware belt, ice, portal, and ray events; preserve existing player movement and crate-belt tests.
4. Extend snapshots, state signatures, undo, renderer events, and solver actions for movable entities.
5. Add focused rules and browser tests; run `npm test`, solve and re-check par for existing authored levels, and review every target/ray level for intended movement.
6. Publish the level-designer guide and README link only after the behavior contract and runtime implementation are consistent.

Rollback should first disable per-cell capability overrides and return targets to fixed floor features while leaving legacy player/crate behavior operational. Preserve old level YAML and tile IDs throughout; do not reset player progress.
