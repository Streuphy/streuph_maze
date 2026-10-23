# Design

## Context

`SM.LEVELS.solve` in `src/js/levels.js` performs breadth-first search over the real resolver and currently returns as soon as it finds the first goal. Its stable action order is move north/east/south/west, pull north/east/south/west, then ACT. The returned `path` is therefore minimum-stroke but not selected for directional balance. The existing visited-state map collapses alternate prefixes to the same state, so it cannot by itself compare all equally short routes.

World 1 and World 2 have authored packs; World 2's OpenSpec change is archived. World 3–7 have design artifacts and solver/par tasks but no authored pack files yet. Existing route and PAR examples must remain grounded in actual pack data and resolver replays.

## Goals / Non-Goals

**Goals:**

- Preserve shortest-stroke PAR and select the best-balanced route only among routes at that same optimum.
- Keep the selector deterministic and bounded, and expose whether its comparison was complete.
- Provide an opt-in, copy-ready report for authoring and document one verified representative example per world as its pack becomes available.
- Count only explicit directional solver commands: move and pull count once in the command's direction; ACT and automatic movement do not count toward balance.

**Non-Goals:**

- Changing the game's win rules, stroke costs, movement behavior, or authored `golf_score` values.
- Treating balanced direction counts as a gameplay objective or changing the optimum when no balanced route is found.
- Fabricating routes for Worlds 3–7 before their levels exist, or changing their mechanic-specific designs.
- Editing an external Word document. The report and repository examples provide verified text for the document author to embed.

## Decisions

### 1. Keep route preference secondary to PAR

First determine the minimum stroke depth using the existing resolver and BFS. At that depth, compare winning action sequences by

`(u - T/4)^2 + (d - T/4)^2 + (l - T/4)^2 + (r - T/4)^2`,

where `u`, `d`, `l`, and `r` are the up, down, left, and right command counts and `T = u + d + l + r`. Lower is better. This continuous-average score also works when the directional-command count is not divisible by four. ACT contributes a stroke to PAR but not to `T`; forced conveyor and portal movement are resolver consequences, not commands.

If scores tie, choose the route first encountered under the existing BFS action order. The existing order must not be changed as part of this feature, so tie behavior remains reproducible.

### 2. Preserve equal-depth route alternatives without claiming a false optimum

The solver must retain enough equal-depth route-prefix information to compare alternate routes that converge to the same rules state; retaining only one `seen` path per state can discard a better-balanced solution. The route comparison continues only through the complete minimum-goal depth. Keep route-prefix/label exploration bounded by the solver budget.

The first found winning path already proves the minimum PAR under BFS. If the budget is exhausted before all routes at that depth can be compared, return that valid minimum route and PAR, but set an explicit route-selection completeness indicator to incomplete. Do not label its balance as globally best. If comparison completes, return the lowest-score route and mark it complete. Preserve existing solvability status and limits unless a separate, explicitly tested route-label limit is needed.

### 3. Keep report generation opt-in and data-driven

Add an optional route-report command or flag that loads the built-in Prologue and every available `data/worlds/*.yaml` pack through the common loader, then prints level/world identity, minimum PAR, the ordered commands, U/D/L/R counts, balance score, and completeness. Show move and pull distinctly in the sequence (for example, `U` versus `PU`) and include ACT explicitly; direction totals still use the agreed counting rule. Do not add a route dump to ordinary test output.

The report is a source for documentation, not a replacement for verification: replay each selected route with the real resolver and require a winning final state and stroke count equal to PAR before publishing it.

### 4. Add verified examples to world references as packs become available

Use one representative worked PAR example for each of Worlds 1–7, with level identity, PAR, route, and directional counts. Update the corresponding design reference alongside pack authoring. World 1's data exists and World 2's data exists in the archive; World 3–7 examples cannot be populated until their packs are authored. Do not modify mechanic requirements to force a directionally balanced route, and do not call a non-optimal path PAR.

## Risks / Trade-offs

- [Equal-depth route prefixes can multiply even when rules states are deduplicated] → Bound route-label exploration and report incomplete balance selection separately from the already-proven minimum PAR.
- [Changing the selected `path` may change downstream test expectations or printed examples] → Keep `optimal` semantics stable, replay all selected paths, and make the new report opt-in.
- [A chosen representative route may not be the clearest teaching route] → Treat balance as a documentation tie-break only; retain manual review of lesson, safety, mechanic necessity, and readability.
- [World 3–7 examples are unavailable until their packs exist] → Keep those examples as explicit follow-up items attached to their pack-authoring work; never publish placeholder counts as solver results.

## Migration Plan

No data migration is required. Existing `golf_score` values remain minimum-stroke pars. Once route selection is implemented, regenerate and replay examples; replace only documentation examples whose route is no longer the selected balanced optimum. Existing saved scores and pack schemas are unaffected.
