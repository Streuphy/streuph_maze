# Tasks

> **SUPERSEDED — do not continue these tasks.** Use
> `../v2-global-pack-migration/tasks.md`. The original 26 checked and four
> unfinished items below preserve the actual implementation history; their
> meanings and completion states have not been rewritten.

## 1. Ruleset and shared YAML boundary

- [x] 1.1 Confirm the selected change's apply instructions, run `openspec validate v2-rule-set --strict`, and review `git status --short --branch`; verify all fifteen guideline rows remain accounted for and record ownership of existing changes without staging or modifying unrelated files.
- [x] 1.2 Add pack-level `legacy`/`v2` selection, legacy defaulting, normalized ruleset identity, and atomic rejection of unknown or level-local selectors in `src/js/levels.js` and `sm-rules.js`; verify paired legacy/V2 and active-pack-preservation fixtures with `npm run test:unit:levels`.
- [x] 1.3 Add V2 `floor_colours`, initial color, and `requires` shape validation through registered schemas, including floor-support eligibility, Black tokens, intrinsic ID-5 Blue, and V2-only field rejection under legacy; verify malformed/coordinate/unsupported-cell cases with `npm run test:unit:registry` and `npm run test:unit:levels`.
- [x] 1.4 Document the selector, field defaults, coordinate examples, supported combinations, and reserved Black effects in `docs/world-level-packs.md`; verify examples parse with the shared YAML parser and link V2 guidance to `docs/GAME_RULES.md` without claiming unimplemented effects.

## 2. Board lifecycle and floor-derived movement

- [x] 2.1 Normalize supporting floors independently from markers/objects, apply initial colors, and update the state contract plus construction/clone/snapshot/restore/reset boundaries; verify branch isolation, floor retention, initial Black, and exact undo using `npm run test:unit:rules`.
- [x] 2.2 Add shared effective mobility/source-legality policy, reject V2 crate push/pull overrides, and enforce red-floor departure veto across direct, force, portal, ray, and supported feature movement paths; verify color-independent crate permissions, transport-profile veto, and legal dot departure with focused registry/rules/levels tests.
- [x] 2.3 Implement V2 directional walk versus forward push versus automatic eligible pull, including green beneath the crate, four directions, forward-push precedence, and atomic blocked pulls; verify no sixth action or hidden mode and retain legacy explicit-pull tests with `npm run test:unit:rules`.
- [x] 2.4 Implement complete preflight and atomic red-source dot chain pushes, then farthest-first commit/force ordering; verify legal chains, intermediate gate constraints, pinned members, occupied ends, no target-chain membership, and no automatic strength inheritance with `npm run test:unit:rules`.
- [x] 2.5 Apply same-round ice to V2 Blue support and preserve movable-feature terrain separation, including V2 stationary-target walkover; verify blockers, loops, red landings, feature identity/link retention, and undo/signature parity with `npm run test:unit:rules`, then document the floor/layer precedence in `docs/level-design/tile-mechanics.md`.

## 3. ACTION dispatch and deterministic round completion

- [x] 3.1 Capture current/N/S/E/W participants by stable layer/identity, activate terrain then feature then object once, and reject explicit V2 pull commands before mutation; verify no diagonals, live rescans, or recursive adjacency flooding with focused rules tests.
- [x] 3.2 Pass distinct actor/participant context to registered ACTION hooks and preserve occupancy preconditions for spatial effects; verify an empty neighboring portal cannot teleport the remote dot, moved participants are not reactivated, and final entry cannot double-trigger an ACTION participant with `npm run test:unit:rules`.
- [x] 3.3 Complete force/link/ray/catch processing before the single final V2 goal check, fix missing prism color events through the shared event operation, and preserve initiating-stroke accounting even for return-to-origin force chains; verify final-color goals, catch-before-win, event order, and exactly undoable multi-step rounds with `npm run test:unit:rules`.
- [x] 3.4 Document ACTION ordering, no-op activation, free blocked directions, one-stroke rest, bounded chains, and the absence of next-round memory in the mechanics/architecture guides; verify equal-exposed-state/different-history and rules-purity regressions with `npm run test:unit:rules`.

## 4. Solver action parity and score proof correctness

- [x] 4.1 Select five successors for V2 while retaining the nine legacy successors and existing directional-balance ranking; verify V2 solver routes contain no explicit pull commands and replay through the actual resolver with `npm run test:unit:levels` and the appropriate focused rules fixtures.
- [x] 4.2 Correct depth/state/route-label cutoff reporting and track transition failures without false proof claims; verify beyond-depth solvable fixtures return `unknown`, exhaustive impossible fixtures return `unsolvable`, and proved minimums survive incomplete tied-route comparison with `npm run test:unit:levels`.
- [x] 4.3 Add small replay-verified V2 fixtures covering automatic pulls, chain pushes, Blue sliding, multi-activation, Black matching, and catches; verify recorded stroke minima and cross-ruleset search/cache separation using the existing rules/levels harness rather than a second simulator.
- [x] 4.4 Document declared versus proven PAR, five-action route counting, and incomplete-proof reporting in the mechanics/pack guides; verify legacy route-ranking regressions still pass without changing the pending `par-routes-examples` artifacts or publishing unverified route examples.

## 5. Ruleset-qualified progress persistence

- [x] 5.1 Extend `src/js/sm-store.js` storage schema and keys for V2 level/last-selection records while preserving legacy keys; verify schema-1/schema-2 migration, overlapping world/level IDs, and legacy completion not granting V2 progress with `npm run test:unit:helpers`.
- [x] 5.2 Update progress import/export, key validation, and all callers for the selected ruleset without destructive resets; verify mixed legacy/V2 round trips, memory fallback, best-score retention, last-selection isolation, and seen-tile isolation with `npm run test:unit:helpers`.
- [x] 5.3 Document storage migration and offline recovery/export behavior in the architecture/pack guides; verify examples distinguish progress JSON exports from YAML-only level packs and do not imply local storage is guaranteed under `file://`.

## 6. Prerequisite-aware world access

- [x] 6.1 Validate distinct earlier same-world `requires` references and add a pure completion-derived access query; verify AND semantics, branching, optional gates, absent progress, and missing/self/forward/cross-world/duplicate references with focused levels/helpers tests.
- [x] 6.2 Route V2 selector clicks, Next/jump, direct player-facing load, restored selection, and pack activation through that query in `sm-ui.js`/`sm-io.js`; add controller regressions verifying locked requests preserve the current board and activation falls back to the first available level, while solver validation remains ungated.
- [x] 6.3 Show accessible unmet prerequisite names and refresh all dependent levels after a clear; add browser regression fixtures for branch unlocks and legacy imported-level direct access for the final browser gate, and document explicit versus implicit progression in `docs/world-level-packs.md`.

## 7. Inspectable presentation and world golf summaries

- [x] 7.1 Render V2 supporting floor colors beneath occupants and expose colors, feature links, locks/latches, and mobility through immediate inspection in `sm-glyphs.js`, `sm-render.js`, `sm-ui.js`, and required local styles; verify Black contrast/labels and covered-floor descriptors with focused registry/helper assertions and add playback-versus-redraw browser regressions.
- [x] 7.2 Make input/help ruleset-aware, keep V2 at five actions on keyboard and directional controls, and derive goal appearance solely from current `W`; add final browser regressions for no separate V2 pull mode, current/neighbor ACTION, final goal color, and full-round undo, and document the controls alongside the mechanics changes.
- [x] 7.3 Derive exact world PAR only from every level's proven minimum, and derive complete/partial player world totals from ruleset-qualified per-level bests; verify unknown/unsolvable/unverified inputs, improved/worse replays, absent records, and completed-level counts with `npm run test:unit:helpers` and `npm run test:unit:levels`.
- [ ] 7.4 Add level/world score labels to the local HUD/selector without conflating authored PAR, proven PAR, and personal best; add final browser fixtures for partial and complete worlds and update the relevant guides and conflicting exploratory PDD text, preserving the original strict rule document and explicitly recording the reserved Black interpretation.

## 8. Final integration acceptance

- [ ] 8.1 Run `npm run test:unit:registry`, `npm run test:unit:rules`, `npm run test:unit:levels`, `npm run test:unit:helpers`, then `npm test` from the repository root; verify all legacy world assertions and new V2 browser fixtures pass, and review evidence against every row of the fifteen-rule traceability table.
- [ ] 8.2 Perform and record a separate actual Chromium `file://` check: import V2 YAML through the UI, exercise representative green pull/red chain/Blue slide/ACTION/catch/undo paths, check covered-floor inspection, prerequisites and world scores, export/reload the pack, return to the Prologue, and verify no network dependency or unintended game-over state.
- [ ] 8.3 Run `openspec validate v2-rule-set --strict` and `git diff --check`, review only the intended delivery paths and guideline source availability, and report remaining limitations accurately; verify no unrelated World 6 archive, World 7 change, route-ranking change, or user document was silently included or discarded.

## Workflow follow-up

- Request review of the completed implementation before synchronizing or archiving specs; archive is not a tracked implementation task.
- Keep planning and tested implementation commits separate when commits are authorized; stage explicit paths and run `git diff --cached --check` before each commit. Do not push or create/move release tags without authorization.
- Preserve `ALPHA-0`; describe this milestone as planned/in progress until implementation acceptance, and reserve Black reversal effects for a separately specified change.
