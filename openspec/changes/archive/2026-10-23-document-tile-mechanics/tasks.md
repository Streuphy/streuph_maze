# Tasks

## 1. Authoring profiles and validation

- [x] 1.1 Add catalogue defaults and validate/build the optional per-cell `object_overrides` profile, preserving existing YAML behavior when omitted; verify valid profiles, invalid coordinates/keys, and same-ID entity independence in `npm run test:rules`.

## 2. Entity state and direct interactions

- [x] 2.1 Normalize crate and target markers into stable movable-entity state over unchanged terrain; verify target identity/link preservation and crate/target coexistence with terrain in resolver tests.
- [x] 2.2 Implement shared destination checks and atomic push/pull actions, including Shift+direction input; verify legal/blocked pushes and pulls, walls/gates, strokes, and keyboard/browser input in rules and browser tests.
- [x] 2.3 Extend clone, snapshot, restore, state identity, and BFS candidates for all movable entities; verify undo and solver replay restore exact crate/target positions, target activation, gates, and strokes.

## 3. Automatic movement and hazards

- [x] 3.1 Generalize bounded movement chains for compatible objects on conveyors, ice, and paired portals while preserving current player-belt and crate-belt behavior; verify collision stops, portal termination, loop bounds, and one-stroke accounting in resolver tests.
- [x] 3.2 Implement static-ray transport, opacity, and player catch/respawn ordering; verify ray transport once per emitter per turn, shielding/retracing, respawn persistence, undo, and solver behavior in rules tests.
- [x] 3.3 Replay entity-aware movement events in the renderer and codex/inspection views; verify final rendered player/crate/target positions match resolver state in browser tests.

## 4. Designer reference and spec alignment

- [x] 4.1 Create `docs/level-design/tile-mechanics.md` with every registered ID, defaults, runtime/new/reserved status, standard turn and lock rules, object capabilities, coordinate conventions, and validated YAML examples; verify its catalog against `src/js/tiles.js` and examples with the level loader.
- [x] 4.2 Link the guide from `README.md` and reconcile only overlapping World 2 ray and World 4 movement statements with the shared capability/rule contract; verify links and run `openspec validate` for affected changes.

## 5. Integration verification

- [x] 5.1 Run `npm test`, solve all existing authored levels, correct any affected declared pars, and verify legacy levels without `object_overrides` retain their intended routes and state behavior.
