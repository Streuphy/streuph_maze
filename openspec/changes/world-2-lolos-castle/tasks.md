# Tasks

## 1. Cardinal ray and catch resolution

- [ ] 1.1 Register the four static directional ray variants (provisionally IDs 81–84) and distinct glyphs; verify the tile catalogue maps each variant to one cardinal direction and does not collide with other world IDs.
- [ ] 1.2 Implement bounded ray tracing against settled state, stopping at walls, crates, and closed barriers; add headless tests for all four directions, shielding, open/closed gates, and off-axis players.
- [ ] 1.3 Add post-action caught detection and player-only respawn, charging exactly one stroke even when final coordinates match the pre-action position; test retained crates/P/W/latches and recomputed player-occupancy locks.
- [ ] 1.4 Add undo tests for caught pushes/moves and document the catch ordering, opacity rules, safe-start requirement, and one-stroke accounting; verify the resolver has no timer or DOM dependency.

## 2. Solver and presentation

- [ ] 2.1 Make catch outcomes valid BFS successors with the same resolver and state signature; verify a small level's path/par includes strategic respawn and search terminates within budget.
- [ ] 2.2 Add returned ray/catch step records and render the static ray, crate shielding, and respawn visibly; add browser tests that the display reaches the resolver's final state.
- [ ] 2.3 Add world-2 hazard entries to the codex/tutorial presentation and verify ray states are inspectable without introducing timed or sweeping animation behavior.

## 3. World 2 pack

- [ ] 3.1 Confirm the shared `world-level-packs` contract and crate-overlay behavior from `world-1-sokoban` are available; verify the World 2 pack uses that schema rather than duplicating loader/UI behavior.
- [ ] 3.2 Author the eight named Lolo levels with the blueprint board bounds and fixed turn-based rays, including the safe single-ray tutorial and 16×9 mastery; verify the pack parses as one independent world.
- [ ] 3.3 Solve every level and record exact pars where proven; manually review shielding lines, gate bypasses, respawn safety, and intended lesson, with route notes in World 2 design documentation.
- [ ] 3.4 Add content tests for all eight grids, ray/link references, solver results, and safe start cells; verify the pack passes the same validator used by the UI.

## 4. Integration

- [ ] 4.1 Run `npm test` and verify the Prologue, existing crate/belt/receiver behavior, World 2 ray tests, solver tests, and browser pack tests all pass.
- [ ] 4.2 Load World 2 through Chromium `file://`, shield a ray, deliberately respawn, undo the caught turn, and return to the Prologue; verify no network access or game-over state occurs.
