# Proposal

## Why

Level designers currently have to infer tile behavior from the implementation, tests, and several unfinished world-specific specs; that makes it easy to author puzzles that rely on behavior the resolver does not actually provide. Establishing a single, detailed contract for the tile catalogue and turn resolver will make existing behavior authorable and testable, while a capability-based object model will support the requested movable targets and interactions without treating every object as a crate.

## What Changes

- Add a designer-facing specification of the current tile catalogue, parameters, movement/passability, activation, color/link effects, and turn-resolution order, clearly labeling implemented, reserved, and planned behavior.
- Add a maintained level-design guide and link it from the project README, with the same tile catalogue and authoring examples as the behavior spec.
- Define a general object interaction contract for pushing, pulling, and moving eligible objects, including movable target tiles and terrain/collision restrictions.
- Extend the interaction contract to cover eligibility-sensitive portal and conveyor transport and ray behavior that can transport or threaten objects according to their capabilities.
- Require all resulting object and tile-state changes to resolve deterministically and participate in undo, rendering, and solver state.

## Capabilities

### New Capabilities
- `tile-mechanics`: Authoritative level-designer reference for tile definitions, standard rules, and deterministic turn resolution.
- `movable-objects`: Capability-based movement and interaction rules for the player, crates, movable target tiles, and future movable objects.

### Modified Capabilities

## Impact

- Planning/specification: adds two reusable OpenSpec capabilities. Existing in-flight world specs describe some planned features (for example, rays and crate momentum); this change will identify overlaps and use the current runtime as the baseline rather than silently treating planned behavior as implemented.
- Runtime areas likely affected during implementation: `src/js/tiles.js`, `src/js/sm-rules.js`, state snapshots/cloning, renderer/UI, and `tests/verify.js`.
- Level authoring: existing grids and tile-ID overrides remain supported; an optional per-cell `object_overrides` map supplies object movement capabilities.
