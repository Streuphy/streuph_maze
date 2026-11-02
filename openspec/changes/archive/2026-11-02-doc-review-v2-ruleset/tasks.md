# Tasks

## 1. Establish review evidence and synchronization mapping

- [x] 1.1 Record current working-tree scope and protected paths in this change's `review.md`; verify the editor draft/change, `docs/Nouveau document`, historical archives and World 6 relocation are not edited by this work.
- [x] 1.2 Validate this change and `v2-global-pack-migration` with `openspec validate <change> --strict`, and capture both `node scripts/audit-v2-assets.js --preaccept` and strict audit output in `review.md`; verify baseline errors and all pending capabilities are explicit rather than inferred from old records.
- [x] 1.3 Expand the design's ten-capability matrix into a source-requirement/destination/action/evidence mapping, including preserved requirements, full-file Purpose/table prose, and test/runtime anchors; verify every source ADDED/MODIFIED/REMOVED block has a disposition and material conflicts are resolved or explicitly blocking before accepted-spec writes.

## 2. Reconcile the existing V2 accepted contracts

The source is `v2-global-pack-migration`, not this spec-skipped change. Use the spec-sync workflow for that source after the mapping review; tasks below are reviewable capability batches of the same synchronization. Do not archive either change or duplicate deltas here.

- [x] 2.1 Integrate `event-resolution` and `conveyor-transport` into new accepted-spec homes from the existing migration deltas; verify all source requirements/scenarios are retained, links resolve, and queue priority/checkpoint, no-front-shove, closure and rollback prose agree with `tests/unit/v2.js` and `sm-rules.js`. Run `npm run test:unit:rules` and record results.
- [x] 2.2 Reconcile `tile-mechanics` and `movable-objects`, including the full catalogue/dot, per-hop effects, capability profiles, target walking versus relocation, terminal hazards and whole-action abort; verify unaffected coordinate/link/profile requirements remain, no stale belt-kind or final-rest-only rules survive, and `npm run test:unit:registry` plus `npm run test:unit:rules` pass.
- [x] 2.3 Reconcile `line-of-sight-hazards`, `binary-gate-polarity`, and `chromatic-aura-routing`, including stale Purpose text; verify respawn and allowed dot departure from effective closure are removed, stationary equality cannot win, and source scenarios plus `npm run test:unit:rules` confirm closure-before-goal-before-final-exposure precedence.
- [x] 2.4 Reconcile `sokoban-targets` and `crate-proximity-switches`; verify per-commit derivation, contact/source OR, activation/release edges, pending/effective closure, nonterminal-only undo, and target-versus-receiver distinctions against their complete source deltas and `npm run test:unit:rules`.
- [x] 2.5 Reconcile `world-level-packs`, preserving unrelated loading/selection/victory-image requirements; verify sole-policy YAML loading, current-only progress, atomic authored export, proof/score distinctions and 61-level certification map to existing behavior, and `npm run test:unit:levels` passes. Pause on a residual runtime/spec conflict rather than changing behavior.
- [x] 2.6 Review all ten complete accepted files and run `openspec validate --specs --strict`; verify no obsolete authoritative clause remains, the audit's `pendingAcceptedSpecSync` is empty, and `review.md` records the reviewed integration without equating it to release approval. Keep unrelated audit failures visible.

## 3. Publish player-oriented navigation and README

- [x] 3.1 Add `docs/README.md` with the design's audience/authority map and links to current rules, authoring, accepted contracts, architecture, verification and clearly non-authoritative history/future work; verify every local target exists and no draft is presented as a shipped feature.
- [x] 3.2 Revise root `README.md` with a short game description, local Chromium quick start, compact controls, explicit agent-/LLM-driven development note, tests/docs links, GPL license and maintainer; verify controls against `sm-ui.js` and say rebinding is source-based, not an available settings UI. Keep gameplay independent of AI/network services.
- [x] 3.3 Simplify `docs/GAME_RULES.md` around player-observable commands, colors, goal entry, conveyors, distinct signal sources, failure/undo/restart, packs and scores; verify each behavioral statement maps to a synchronized requirement and relocate/link technical scheduler/storage detail without losing caveats.

## 4. Formalize agent-oriented engine and authoring documentation

- [x] 4.1 Extend the existing PDD with the descriptive configuration/canonical/derived/round-context model, transition and outcome vocabulary, deterministic ordering/checkpoint, invariants and ownership; verify it describes current behavior, distinguishes diagnostic abort from gameplay failure, introduces no API/rule/schema, and links normative accepted contracts.
- [x] 4.2 Reconcile `docs/engine-architecture.md` with that vocabulary, current implemented status, concrete module boundaries, state lifecycle and solver-versus-queue identity; verify anchors against construction/clone/snapshot/restore/resolve/closure functions, passive playback and progress ownership, and run `npm run test:unit:helpers` for referenced helper boundaries.
- [x] 4.3 Reconcile `docs/world-level-packs.md`, the tile reference, authoring checklist, blueprint and root `AGENTS.md` authority/status links; verify dimensions, YAML coordinate/override scope, registered definitions/profiles and proof/unknown distinctions remain exact and consistent. Run `npm run test:unit:registry` and `npm run test:unit:levels` without changing packs, scores or generated proofs.
- [x] 4.4 Complete `review.md` dispositions for maintained, historical, future and unresolved material, explicitly recording the user-owned editor draft's JSON/YAML and bounds conflicts as an owner dependency; verify protected files are unchanged and no future rule/tile/object or editor/generalized-solver decision was introduced.
- [x] 4.5 Append the current documentation-review outcome to the maintained verification/acceptance references, preserving dated prior implementation and browser results; verify synchronization status, remaining owner dependencies and release approval are separately stated with no false claim of a fresh Chromium run.

## 5. Final integration and completion gates

- [x] 5.1 Validate this change, the source migration and all accepted specs with strict OpenSpec validation; inspect links, whitespace and the final scoped diff, and verify no runtime, registry, tests, scripts, packs, dependency files, historical archives or protected user work changed.
- [x] 5.2 Run final repository-root `npm test` and record actual Node/jsdom results in `review.md`; verify test success or accurately document any blocker. Do not claim jsdom is native Chromium or regenerate existing browser/proof JSON for prose-only changes.
- [x] 5.3 Run both `node scripts/audit-v2-assets.js --preaccept` and strict `node scripts/audit-v2-assets.js`; verify accepted-spec synchronization is complete and record each exit status, error and `releaseReady` value. Leave the whole-tree coherence/release gate incomplete while the protected editor draft or any other unresolved dependency still causes failure; request owner resolution rather than changing it or weakening the audit.
- [x] 5.4 Publish a concise final review summary distinguishing documentation updated, reviewed contract synchronization, test evidence, unresolved items and release/archive status; verify every checked task has its stated evidence and no release-ready/all-documentation-coherent claim is made with an unresolved gate.

## Workflow follow-up

- Resolve user-owned conflicting editor-draft guidance through its owner or separate explicit authorization; do not absorb editor implementation into this change.
- Release approval and archival of `v2-global-pack-migration` or this review are separate user decisions after the relevant gates pass. Neither is performed automatically by the documentation review.
