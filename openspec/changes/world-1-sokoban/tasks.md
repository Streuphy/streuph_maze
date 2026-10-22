# Tasks

## 1. Crate and target rule foundation

- [x] 1.1 Add the World 1 target definitions on links 1–3 and phase-wall variants for links 2–3 using the reserved IDs recorded in `design.md`; verify every definition resolves to the intended family, parameters, and glyph in a registry test.
- [x] 1.2 Normalize a crate's authored starting cell to its underlying walkable floor while retaining the crate entity in play state; add headless tests proving a pushed crate leaves a traversable cell and blocked pushes change neither state nor strokes.
- [x] 1.3 Add target-occupancy activation to link resolution without changing receiver ID 50 adjacency behavior; test crate-on-target activation, adjacent-crate non-activation, player non-activation, momentary deactivation, and independent links.
- [x] 1.4 Verify target state is derived consistently after moves, pushes, clone/restore, undo, and BFS; add headless tests for undoing a push onto/off a target and for a solver path through a target-controlled gate.
- [x] 1.5 Document the World 1 target/gate IDs, link limits, occupancy-vs-adjacency distinction, and crate-underlay authoring rule next to the tile/level authoring guidance; verify the docs match the tested registry.

## 2. Crate, target, and victory presentation

- [x] 2.1 Extend read-only tile descriptions and rendering to compose terrain/target glyphs with movable crate entities; add a browser test that sees a crate move, exposes its source floor, and visibly covers—but does not hide—the target.
- [x] 2.2 Render target activity and linked-gate state deterministically without adding rule decisions to the DOM layer; add browser assertions for inactive/occupied target and open/closed gate visuals.
- [x] 2.3 Generate a local solved-board victory snapshot from trusted glyphs when a World 1 level has no custom `win_picture`; add browser tests for final crate/target visibility and for clearing the picture on restart or level load.
- [x] 2.4 Preserve custom PNG victory art and the existing Prologue PASS fallback; run existing victory-image tests and document the custom-image precedence.

## 3. World-pack loading, selection, and progress

- [x] 3.1 Extend pack validation to accept and validate stable `world_id` metadata while retaining the existing Prologue document shape; add tests for missing identity, duplicate/invalid level keys, count mismatch, grid bounds, and dimension mismatch.
- [x] 3.2 Improve pack validation diagnostics to include world, level, tile ID/coordinate, and actionable messages while preserving parser syntax line/column data; add malformed and semantic-error tests that assert useful locations/context.
- [ ] 3.3 Activate a valid loaded world pack atomically through the existing picker/drop/paste workflow and display its world name; add browser tests proving invalid files leave the current board and pack untouched and valid files replace them under the local-file-compatible path.
- [ ] 3.4 Allow direct selection of every validated level in a loaded world pack by display name while retaining return-to-Prologue behavior; add browser tests selecting an uncleared later level and returning to the Prologue.
- [ ] 3.5 Namespace stored level identity by stable world ID and migrate existing Prologue progress without losing best scores or completions; add store tests for two packs sharing `level_1` and for migration.
- [ ] 3.6 Document the canonical per-world YAML shape, top-first grid convention, `world_id`, `num_level`, level naming, IDs, and `file://` loading limitations; verify the documented sample parses and validates.

## 4. World 1 levels 1–4

- [ ] 4.1 Create `data/worlds/world-01-sokoban.levels.yaml` with World 1 metadata and levels 1–4 following the 5×5 tutorial, two-crate pivot, deadlock-awareness, and combinatory maze roles; verify pack structure and declared count after the remaining levels are added.
- [ ] 4.2 Validate levels 1–4 for one start/exit, rectangular dimensions, implemented IDs, crate/target/link correspondence, and a solver-proven route; set each par to the verified minimum stroke count and add content assertions to the test suite.
- [ ] 4.3 Manually inspect levels 1–4 for gate bypasses, unintended crate-on-gate states, dead squares, and the intended teaching point; record route-review notes alongside the World 1 design documentation and verify levels 1–3 have no unintended irreversible softlock.

## 5. World 1 levels 5–8

- [ ] 5.1 Author levels 5–8 in the same pack for the intermediate homage, push-only odd/remix corridor, hard multi-crate sorting, and 16×9 mastery roles; verify every grid fits the 16×9 limit and uses only registered IDs.
- [ ] 5.2 Compute and record verified minimum-stroke pars for levels 5–8; require a solver-proven optimum or an independently reproducible exhaustive result for any level that exceeds the in-browser search budget, and add content tests for the recorded values.
- [ ] 5.3 Manually review levels 5–8 for intended gate necessity, link correctness, solvability, and push-only behavior; document the level-6 remix rationale and verify no layout relies on pulling a crate.
- [ ] 5.4 Validate the complete eight-level pack through the same loader used by the UI and verify all levels pass structural, mechanic-specific, solvability, and par checks before the pack is treated as shippable.

## 6. End-to-end compatibility

- [ ] 6.1 Run `npm test` and verify all existing Prologue tests plus the new rule, pack, renderer, progress, victory-image, and World 1 content tests pass.
- [ ] 6.2 Open the app through Chromium `file://`, load the World 1 pack via picker or drag/drop, select levels directly, solve a target-gate route, undo a crate push, return to the Prologue, and verify no network dependency or state leakage occurs.
