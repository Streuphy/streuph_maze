# World-level authoring and test checklist

Use this checklist whenever creating or revising a level or world pack. The
repository-root `AGENTS.md` makes the final `npm test` requirement apply to all
OpenCode work in this project.

The level editor (`editor.html`, documented in [level-editor.md](../level-editor.md)) is
the recommended authoring surface for the workflows below: it loads, edits, validates,
quick-tests, and exports world-pack YAML through the shared `SM.LEVELS.load` path, and
runs the standalone A→B solver between two authored snapshot arrangements. It is a
consumer of the shared validator and real resolver — never a second source of executable
rules. Hand-authoring YAML remains supported, but the editor's live validation, area
fill, and quick-test features remove the most common authoring errors.

The sole queued four-color V2 contract applies to all shipped content. Its
existing migration deltas are synchronized into [accepted specs](../../openspec/specs/);
the [event-resolution contract](../../openspec/specs/event-resolution/spec.md)
owns shared goal/closure/hazard ordering. Do not reintroduce recoverable exposure
to satisfy historical route notes. Track all 61 rows in `v2-pack-certification.md`
and preserve historical archives unchanged. The [documentation guide](../README.md)
separates normative contracts, authoring reference and verification evidence.

## Design review

- Read the relevant world entry in `worlds-blueprint.txt` and its Golden Rules:
  minimal visual language, deterministic and inspectable state, a safe and
  focused tutorial, and the eight-level progression from tutorial through
  mastery.
- Use accepted capability specifications and the maintained tile reference as
  the contract for implemented mechanics; world designs describe teaching intent.
  If a legacy blueprint, proposed design or runtime behavior conflicts with that
  contract, record and resolve the conflict before authoring rather than silently
  introducing unsupported behavior. World 2 hazards, for
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
- For a documented PAR example, run `npm run levels:routes` and use a route
  among the minimum-stroke solutions with the closest U/D/L/R command counts.
  Count explicit move and pull commands only; exclude ACT and automatic
  movement. If balance scores tie, use the first route in solver discovery
  order. Record the route, PAR, counts, and whether the comparison completed;
  an incomplete balance comparison does not invalidate a proven minimum PAR,
  but it must not be described as globally best-balanced.
- Verify every authored start is safe under the initial ray/gate/crate state.
  Replay every intended transition and confirm it never continues after failure.
  Exposure freezes the settled board; restart/navigation, not a respawn rule,
  recover the attempt. Review failure paths separately from winning proofs.
- Check all targets, gates, links, crates, and emitters have the intended
  correspondence. Where a gate or shield is supposed to be essential, test
  that removing or disabling it makes the route impossible or changes the
  optimum as intended; also inspect plausible bypass routes.
- Assert the intended mechanic is actually exercised by the shortest route.
  If a level still has the same solution when its defining hazard/shield is
  removed, either redesign it or explicitly document that element as decorative.
- Document route-review findings, especially tutorial recovery, gate necessity,
  safe intended positions, terminal mistakes, and blueprint deviations. Record
  optional/decorative elements explicitly; do not imply PAR exercises them.
- Use `npm run levels:routes -- --early-review` for bounded reverse-reachability
  evidence on every first-three-level group. Report incomplete review as unknown.
  Count terminal failures separately from hidden nonterminal softlocks; manually
  review wrong pushes, guarded pockets, and actual lesson use as well.

## World 2 ray-hazard checks

- Test all four static emitter directions. Configured ray-object hops use the
  common atomic queue, stable source y/x ordering, current destination legality,
  per-hop signals, and session provenance. Only a non-winning drained queue gets
  final dot exposure testing. A legal matching goal entry wins after its signal
  reactions; closure failure takes precedence, and stationary equality cannot win.
- Confirm walls, crates, and closed/solid barriers stop rays; open gates and
  targets do not. Test pushes that both create and remove shielding.
- Confirm final exposure commits terminal failure with the normal initiating
  stroke and preserves the settled actors, colors, and latches. Gameplay and
  player undo are blocked; restart reconstructs initial state and navigation
  remains available. Failure never awards completion, best scores, or victory art.
- Check linked gates, polarity barriers, and phase void with the common closure
  query: crate-held closure stays visibly pending until departure, reopening
  cancels it, closure beneath the dot fails immediately. Ordinary color mismatch
  is an entry filter, not physical closure.
- Verify resolution is turn-based and independent of rendering delays. Do not
  add timers, automatic recovery teleports, or animation-dependent outcomes.
- In the codex/tutorial and browser checks, make emitter directions, active ray
  cells, crate shielding, failed boards, and restart/undo policy inspectable.

## Required commands

During iteration, use a focused Node unit suite for the changed area. For
example, use `test:unit:levels` for schema/coordinate validation and
`test:unit:rules` for resolver behavior. The jsdom browser suite is reserved for
final validation rather than routine edits. Before declaring the work done, run
the complete suite:

```sh
npm run test:unit:levels
npm run test:unit:rules
npm test
```

`npm test` runs both Node verification and the jsdom browser smoke suite. Use
`npm run test:browser` only at final validation. When the change affects
real-browser rendering or local `file://` pack loading, also load the authored
pack through the actual UI in Chromium, play a representative shield path and
nonterminal undo, verify terminal input/undo blocking, restart, navigate back to
the Prologue, and verify no external resources. Inspect arrows and pending
closure as applicable. Record this separately; `npm test` does not launch Chromium.
