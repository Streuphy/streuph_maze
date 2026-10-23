# World-level authoring and test checklist

Use this checklist whenever creating or revising a level or world pack. The
repository-root `AGENTS.md` makes the final `npm test` requirement apply to all
OpenCode work in this project.

## Design review

- Read the relevant world entry in `worlds-blueprint.txt` and its Golden Rules:
  minimal visual language, deterministic and inspectable state, a safe and
  focused tutorial, and the eight-level progression from tutorial through
  mastery.
- Use the world-specific design/specification as the authority for implemented
  mechanics. If a legacy blueprint description conflicts with an accepted design
  or current runtime behavior, call out the conflict and follow the accepted
  design; do not silently introduce unsupported behavior. World 2 hazards, for
  example, are fixed turn-based rays, not timers or sweeping beams.
- Keep levels 1–3 free of unintended irreversible softlocks. Include a manual
  wrong-push/dead-end review; solver-proven solvability only proves that at
  least one winning route exists.
- Introduce ideas progressively. The tutorial should isolate the world mechanic;
  levels 2–3 should add a small variation; level 4 may combine it with familiar
  elements; later levels should build toward the advertised remix, hard, and
  mastery roles. Do not introduce several unexplained mechanics at once.
- Make each level's name, goal text, actual shortest route, and intended lesson
  agree. Review the rendered board for visual minimalism and at-a-glance
  readability.

## Pack and solver checks

- Store an independent pack under `data/worlds/` and load it through the shared
  `SM.LEVELS.load`/UI validation path. Do not add a world-specific loader.
- Verify stable lowercase `world_id`, display name, correct `num_level`,
  contiguous `level_1` … `level_n` entries, unique descriptive level names,
  rectangular grids, and matching dimensions.
- Keep boards within 16 columns by 9 rows. YAML rows are top-first; game
  coordinate A1 is bottom-left. Use only registered, implemented tile IDs.
- For every level, require a solver-proven `solvable` result and set
  `golf_score` to the solver's minimum stroke count. Replay the returned path
  with the real resolver and confirm it ends in `won` with the recorded stroke
  count.
- Verify every authored start is safe under the initial ray/gate/crate state.
  Replay every caught transition and verify the respawn cell is safe in that
  resulting state as well.
- Check all targets, gates, links, crates, and emitters have the intended
  correspondence. Where a gate or shield is supposed to be essential, test
  that removing or disabling it makes the route impossible or changes the
  optimum as intended; also inspect plausible bypass routes.
- Assert the intended mechanic is actually exercised by the shortest route.
  If a level still has the same solution when its defining hazard/shield is
  removed, either redesign it or explicitly document that element as decorative.
- Document route-review findings, especially tutorial recovery, gate necessity,
  safe respawns, intentional catches, and any deviation from the world blueprint.

## World 2 ray-hazard checks

- Test all four static emitter directions and verify ray traversal uses the
  settled post-action board.
- Confirm walls, crates, and closed/solid barriers stop rays; open gates and
  targets do not. Test pushes that both create and remove shielding.
- Confirm exposed successful actions catch the player before the final goal
  test, charge one stroke total, preserve crates/colors/latches, recompute
  player-dependent locks after respawn, and remain exactly undoable.
- Verify catches are turn-based and independent of rendering delays. Do not add
  timers, animation-dependent rules, or a game-over state.
- In the codex/tutorial and browser checks, make emitter directions, active ray
  cells, crate shielding, catches, and respawns inspectable.

## Required commands

Run the focused rules suite while iterating if useful, then run the complete
suite before declaring the work done:

```sh
npm run test:rules
npm run test:browser
npm test
```

`npm test` runs both Node verification and the jsdom browser smoke suite. When
the change affects real-browser rendering or local `file://` pack loading, also
load the authored pack through the actual UI in Chromium, play a representative
shield/catch/undo path, return to the Prologue, and verify no external resources
or unintended game-over state. Record that check separately; do not imply that
`npm test` launched Chromium.
