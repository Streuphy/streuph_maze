# Tasks

## 1. Establish sole-contract scope and protect existing work

- [x] 1.1 Read this change's apply context and all supporting inventory/catalogue files, run `openspec validate v2-global-pack-migration --strict`, and inspect current Git diffs; verify the seven-pack/61-level inventory and preserve the pending World 6 archive and unrelated user changes without resetting/staging them.
- [x] 1.2 Mark `v2-rule-set` visibly superseded by this change, retaining its 26 checked tasks and incomplete history; verify maintained authority links target the new contract and no prior task is falsely marked complete or silently redefined.
- [x] 1.3 Establish the 61-row certification ledger and explicit maintained-asset checklist from `asset-inventory.md`; verify every shipped world/key and all 62 registered IDs plus the dot are accounted for, while historical/harness/dependency exclusions remain explicit.

## 2. Current-only registry, authoring, and catalogue schema

- [x] 2.1 Remove resolver-selection/fallback authoring and runtime branches, retaining one V2 interpretation and actionable rejection of obsolete fields; verify common loader atomicity, four-color validation, independent object layers, and direct world selection with `npm run test:unit:levels`.
- [x] 2.2 Replace superseded floor/color mobility and neighbor-ACTION assumptions with declared object profiles/current-tile ACTION; retain compatible parser/geometry/event fixes and verify explicit pull, stationary-target walking, unsupported-field diagnostics, and empty YAML collection round trips in focused rules/levels tests.
- [x] 2.3 Define uniform registry metadata for every catalogue entry, including neutral White/inert conveyor `colour`, exact cardinal `dir`, no passenger-kind policy, and explicit hook/state schemas; verify all 62 definitions and reserved gaps with `npm run test:unit:registry` and update the maintained schema/reference text for this boundary.

## 3. Canonical state and atomic transaction infrastructure

- [x] 3.1 Define coherent playing/won/failed state and canonical requested/derived closure ownership; update construction, clone, snapshot/restore, restart, search identity, and display mirrors together, verifying exhaustive state/lifecycle regressions with `npm run test:unit:rules`.
- [x] 3.2 Implement whole-action snapshots and atomic multi-actor direct push/pull commits; verify no handler/signal sees a half-move, blocked input seeds no propagation, and unchanged supporting terrain/feature identities survive with focused rules tests.
- [x] 3.3 Add the pure priority scheduler and typed captured effect records with source y/x and enqueue-order ties; verify priority reinsertion, competing destinations, stale source revalidation, and no input/render interleaving with `npm run test:unit:rules`.
- [x] 3.4 Journal and validate complete registered-handler mutation batches, covering bounds, occupancy, references, supported values, counters, outcomes, and queued payloads; verify direct multi-field mutations emit complete ordered events and invalid batches/exceptions restore the full action in focused rules tests.
- [x] 3.5 Implement semantic gameplay-plus-queue repetition detection and the `64 × cell count` attempt budget including discarded effects; verify repeated logical queues with increasing sequence numbers still abort, and positions/colors/latches/counters/progress restore exactly. Document state, atomicity, scheduling, and rollback in `docs/engine-architecture.md` with these tests.

## 4. Generic queued transport for every actor

- [x] 4.1 Seed post-direct conveyor occupant requests for stationary and newly moved eligible passengers, including ACTION on a no-op tile; verify dot/crate/enabled-feature parity, source-layer order, all directions/entry sides, inert tint variants, and blocked direct-command non-ticking with focused rules/registry tests.
- [x] 4.2 Implement one-hop conveyor destination preflight, pending-request deduplication, arrival continuations, and ordinary conflict blockage without front shoving/chain strength; verify occupied exits, closed/carrier-incompatible exits, stale passengers, and multi-belt cycles with `npm run test:unit:rules`.
- [x] 4.3 Convert ice and portal transport to queued commits with captured transitions and arrival provenance; verify blockers, source/partner legality, finite portal arrival without bounce-back, intermediate entry effects, and clone/undo parity in focused rules tests.
- [x] 4.4 Convert configured ray-object movement to queued legal hops with stable emitter ordering/provenance; verify shielding changes, overlapping emitters, no duplicate sessions, blocked transports, and common layer legality. Document all transport definitions/priorities and update their regressions with `npm run test:unit:rules`.

## 5. Per-hop signals, physical closure, and outcomes

- [x] 5.1 Capture every committed supported entry/departure by actor identity and payload while deriving plate/target/receiver occupancy from current state; verify intermediate prisms, delayed/stale triggers, multiple contacts, OR links, and repeated activity edges with focused rules tests.
- [x] 5.2 Implement one requested/effective/pending closure policy for linked gates, polarity barriers, and phase void; verify crate departure and reopen cancellation, dot closure failure, immediate closure before later queued entry, and carrier mismatch not becoming physical closure with `npm run test:unit:rules`.
- [x] 5.3 Implement per-hop goal checkpoints after signal reactions and before transport/ordinary work, with immediate cancellation on a matching legal entry; verify closure-before-win, goal-before-final-ray, mismatched entry, and stationary color matching not winning using focused rules tests.
- [x] 5.4 Implement final non-winning ray exposure as committed failed state, disallow gameplay and player undo after failure, and rebuild state on restart; verify frozen failure state, stroke accounting, navigation recovery, no failed completion/best, and diagnostic-abort distinction. Update mechanics/hazard/closure docs alongside these tests.

## 6. Shared search and fresh progress

- [x] 6.1 Update solver successors, goal/terminal checks, stable-state identity, and abort handling for the sole V2 resolver; verify failed branches cannot act as recovery routes and all claimed minimum solutions replay through the actual engine with `npm run test:unit:levels`.
- [x] 6.2 Retain/correct state/depth/route-label/transition proof-limit handling and directional-balance tie priority; verify `unknown` never proves impossibility or an exact PAR, and proven minima remain valid when only tied-route comparison is incomplete with focused levels tests.
- [x] 6.3 Replace compatibility progress migration with a fresh current contract/storage namespace and current-only export/import; verify prior stored bytes remain untouched/unread, incompatible imports preserve current data, independent world identities, memory fallback, and score isolation with `npm run test:unit:helpers`. Document backup/restart and declared/proven/personal score distinctions in the pack/architecture guides.

## 7. Runtime presentation, controls, and gallery assets

- [x] 7.1 Update passive event playback, redraw, inspector/codex, glyphs, and CSS for complete committed mutations, signal contacts, requested/effective/pending closure, and failed boards; verify helper/registry descriptors and add final browser regressions for playback-versus-redraw and undo/restart parity.
- [x] 7.2 Update `index.html`/UI input, failure/restart affordances, victory images, score labels, and current-only help without alternate rule modes; verify failed input/undo blocking, available navigation/restart, no victory picture on failure, and consistent controls in controller tests plus final browser fixtures. Update the associated user guidance with this work.
- [x] 7.3 Replace `glyphs.html` module harvesting with the actual local classic-script registry/glyph API, enumerating ID 0, all registered variants, and the dot; verify every cardinal exit arrow/tint-neutral belt and pending/failure example, add gallery smoke assertions for the final browser gate, and document the gallery's current contract.

## 8. Tooling and exhaustive certification support

- [x] 8.1 Repair `scripts/emit-levels-yaml.js` runtime dependency loading and preserve supported authoring fields; verify safe shared-parser round trips and semantic Prologue equivalence before using the writing command, retaining valid existing package commands and updating tool docs/tests.
- [x] 8.2 Update `scripts/report-par-routes.js` to enumerate exactly the seven shipped packs/61 levels, replay terminal-aware routes, report proof budgets/counts/tie completeness, and fail certification for any unknown/unsolvable/missing/failed replay; verify complete and deliberately incomplete fixture reports with focused levels/helper tests.
- [x] 8.3 Implement catalogue/usage and maintained-reference audits with explicit historical exclusions, distinguishing obsolete rule code from generic validation labels or embedded data; verify missing-definition, stale-authority, omitted-pack, and unsupported-mode fixtures fail. Document audit scope and execution without inventing unavailable npm commands.

## 9. Prologue migration — all 13 levels

- [x] 9.1 Revalidate and, where needed, minimally redesign Prologue levels 1–7 in `levels.default.js`, aligning each name/goal/board/lesson with atomic signals and V2 queue timing; verify seven replay-proven minima, matching scores, and early wrong-action findings in the certification ledger and focused levels/rules tests.
- [x] 9.2 Migrate Prologue levels 8–13, specifically portal provenance, level 9's abolished front-shove lesson, color/gate timing, master switches, and phase void; verify six replay-proven minima, absence of preserved unsupported shortcuts, and aligned tutorials with focused levels/rules tests and ledger evidence.
- [x] 9.3 Regenerate `data/levels.yaml` only from the reviewed source using the repaired emitter; verify shared-loader semantic equality for all 13 levels, route replay, score parity, and no lost overrides/embedded victory assets, then update Prologue/tool guidance with the actual findings.

## 10. World 1 migration — all eight Sokoban levels

- [x] 10.1 Review/migrate World 1 levels 1–4 under atomic pushes, current target edges, common closure, and stationary non-blocking features; verify four exact replayed PARs, push-only profiles, gate necessity, and early wrong-push recovery with focused levels/rules tests and ledger rows.
- [x] 10.2 Review/migrate World 1 levels 5–8, retaining progression, world/key identity, and matching lessons; verify four exact replayed PARs, target/link correspondence and bypass review, and update `world-1-sokoban.txt` plus route evidence rather than retaining earlier-route claims.

## 11. World 2 migration — all eight Lolo levels

- [x] 11.1 Review/migrate World 2 levels 1–3 for safe starts, meaningful shielding, and restart-recoverable terminal hazards; verify all three exact replayed PARs, no intended early fatal action, and hazard/goal bypass review in focused tests and ledger rows.
- [x] 11.2 Redesign/re-prove World 2 levels 4–6 as needed, explicitly replacing level 4's caught-push lesson; verify three minimum winning routes that never continue after exposure, correct static emitter directions, and updated boards/goals/PAR evidence with focused levels/rules tests.
- [x] 11.3 Redesign/re-prove World 2 levels 7–8 without their documented strategic-respawn dependencies; verify both exact minima, shield/gate necessity and immediate-goal-priority review, and update maintained World 2/tutorial/checklist guidance for terminal failure rather than a special recovery rule.

## 12. World 3 migration — all eight polarity levels

- [x] 12.1 Review/migrate World 3 levels 1–7 under immediate polarity derivation and uniform occupied closure; verify seven replay-proven minima, crystal input semantics, pending-crate behavior, dimensions/progression, and early wrong-action review in focused tests and ledger rows.
- [x] 12.2 Independently prove or minimally redesign World 3 level 8, never treating its retained declared score or `unknown` as proof; verify a complete minimum/replay result, update its PAR and mastery lesson, and document polarity route/closure findings with the pack evidence.

## 13. World 4 migration — all eight vector levels

- [x] 13.1 Review/migrate World 4 levels 1–3 for universal conveyor passengers and stationary queue-opening checks, replacing any front-shove dependence; verify three replay-proven minima and unique cardinal-exit teaching with focused tests and ledger rows.
- [x] 13.2 Review/migrate World 4 levels 4–6 for queued ice/portal/entry timing and wall stops, with no color-selected belt behavior; verify three replay-proven minima, preserved layer identity, intended mechanic use, and updated names/goals/route evidence.
- [x] 13.3 Review/migrate World 4 levels 7–8 for full queue cycles, abort rollback, and legitimate exits rather than arbitrary loop endpoints; verify both exact minimum routes, loop/softlock findings, and updated vector/tutorial guidance alongside focused regressions.

## 14. World 5 migration — all eight chromatic levels

- [x] 14.1 Review/migrate World 5 levels 1–3 with four carrier colors and captured per-hop prism/world effects; verify three exact replayed minima and carrier-at-gate/entry checkpoint timing in focused tests and ledger rows.
- [x] 14.2 Review/migrate World 5 levels 4–6, correcting any route requiring stationary goal equality or prematurely executed color work; verify three exact replayed minima, linked-dial execution conditions, and matching lesson text/PAR evidence.
- [x] 14.3 Review/migrate World 5 levels 7–8 and refresh `world-5-chromatic-route-review.md`; verify both minima/replays, no unsupported mixing/reset/extra color, gate necessity and full chromatic route findings with focused levels/rules tests.

## 15. World 6 migration — all eight docking levels

- [x] 15.1 Review/migrate World 6 levels 1–4 for per-hop adjacency edges, OR-combined sources, and universal conveyor docking; verify four exact minimum replays, early wrong-push review, receiver/link correspondence, and source necessity in focused tests/ledger rows.
- [x] 15.2 Review/migrate World 6 levels 5–8 for re-docking and pending closure without incompatible belt policies; verify four exact minima, all active contact indicators, dependency/bypass review, and updated pack/goals/receiver guidance without altering the separate user archive move.

## 16. Maintained documentation and obsolete-only asset cleanup

- [x] 16.1 Publish the full uniform tile/object reference, refreshed used/unused index, and all 62 registry entries plus dot in the maintained mechanics documentation; verify automated registry/pack coverage agrees and every definition has attributes/state/triggers/queue/legality/outcomes/events/visual/lifecycle fields.
- [x] 16.2 Reconcile `GAME_RULES.md`, the PDD, architecture/pack guides, README, and AGENTS with the sole approved four-color queued contract; verify no maintained authority teaches an alternate selector, floor-tier prototype, neighbor ACTION, final-rest-only trigger, recoverable exposure, or failed-state undo, preserving historical documents untouched.
- [x] 16.3 Update the world-authoring checklist, implemented sections of the blueprint, maintained route notes, and future YAML-editor guidance; verify all seven packs' lesson/score statements agree with the ledger, no editor or unimplemented world is falsely advertised, and every current tile/object consumer follows the same definition template.
- [x] 16.4 Remove executable-only obsolete compatibility in rules, loader, input, storage, tests, code comments, and tooling while retaining useful generic helpers; run reference/semantic audits, focused suites, and `git diff --check`, and review an explicit removed-path/behavior list showing no user/history/dependency work was discarded.

## 17. Final integration evidence

- [x] 17.1 Run existing registry/rules/levels/helpers unit commands, `npm test`, and `npm run levels:routes`; verify all 61 certification rows are exact/replayed, every pack count/identity and Prologue copy matches, terminal/cycle/closure regressions pass, and all 62 definitions plus dot have coverage.
- [x] 17.2 Record actual Chromium `file://` checks for each of the seven packs and `glyphs.html`: common file/paste loading and YAML round trip, representative intended-mechanic play, allowed nonterminal undo, terminal failure blocking/visibility, restart/navigation, arrow/tint/closure inspection, Prologue return, and no external resources. Distinguish these checks from jsdom.
- [x] 17.3 Run `openspec validate v2-global-pack-migration --strict`, final whitespace/diff/maintained-asset audits, and review the complete asset checklist; verify no missing certification, obsolete executable branch, unreviewed active guidance, or accidental historical rewrite. Report accepted-spec synchronization as a remaining approval/release dependency until performed.

## Workflow follow-up

- Request implementation review, then synchronize the accepted deltas and update obsolete accepted-spec Purpose text through the approved OpenSpec workflow. Do not claim complete maintained-reference cleanup or release before this acceptance step.
- Rerun the complete accepted-spec/maintained-document audit after synchronization; preserve archives/design history as the user requested. Retire superseded proposal guidance without claiming its unfinished tasks were implemented.
- Archive only after reviewed completion. Any operation to retire a superseded incomplete change must explicitly preserve its incomplete status/history rather than treating it as a completed feature.
- Keep planning and tested implementation commits separate when commits are authorized, stage explicit paths, and inspect staged diffs/whitespace. Do not push, rewrite history, or move/create release tags without authorization.
