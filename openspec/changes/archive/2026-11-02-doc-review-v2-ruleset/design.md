# Design

## Context

See `proposal.md` for motivation and scope. The runtime already implements one queued V2 interpretation. `v2-global-pack-migration` has 53 checked tasks and passes strict artifact validation; those facts are not accepted-spec synchronization or release approval.

Discovery found eight accepted capability directories versus ten migration deltas. The absent accepted homes are `event-resolution` and `conveyor-transport`. The remaining specs have substantive stale clauses, not merely editorial differences. The maintained game rules, PDD, catalogue, and pack guide largely describe V2, but player help includes scheduler internals, architecture still says the engine "is migrating", and authority/status prose is repeated across documents.

Read-only runtime anchors include `RULES.resolveTurn` and `resolveAction` in `src/js/sm-rules.js` (atomic transaction, no propagation for blocked input, terminal handling and rollback), `closureAt`/`enforceDotClosure` (requested/pending/effective closure), queue priority metadata (signal 0, entry checkpoint 0.5, transport 1, ordinary 2), and `tests/unit/v2.js` for queue/lifecycle/transport regressions. Existing registry, loader, progress, and pack tests supply further evidence; documentation must not silently resolve a disagreement by changing code.

The current `node scripts/audit-v2-assets.js --preaccept` exits 1: it reports the unrelated untracked `docs/level-editor-PDD-V1.md`, deferred hazard guidance, and all ten pending accepted-spec mappings. The editor draft proposes JSON levels and a 3×3 minimum while the maintained contract specifies YAML and 2–16 by 1–9. Earlier passing verification records describe their checkpoint, not this changed working tree.

## Goals / Non-Goals

**Goals:**

- Make V2 discoverable at three levels: player instructions, authoring reference, and normative/technical engine contracts.
- Synchronize the existing V2 deltas without losing unchanged requirements or duplicating a competing rule source.
- Provide explicit vocabulary, state ownership, transition ordering, and outcome distinctions for agent reasoning.
- Make unresolved dependencies visible and attributable; distinguish documentation acceptance, automated audit readiness, and actual release approval.

**Non-Goals:**

- No implementation, tile/object allocation, pack redesign, score recalculation, schema extension, key-rebinding UI, or future-mechanic decision.
- No editor/A→B solver design, user draft cleanup, historical rewrite, or automatic archive/commit/push.
- No claims that previously generated browser/proof evidence was newly executed by a documentation review.

## Decisions

### 1. Reuse the migration deltas; do not fork them

This change sets `skip_specs: true`. Its behavioral source is the ten existing deltas under `../v2-global-pack-migration/specs/`, not an additional set of ADDED/MODIFIED rules. During apply, review their requirement-level mappings and invoke the spec-sync workflow for **that source change**, not for this spec-skipped review. Applying this change authorizes the documented reconciliation, not an unconditional release declaration or archive.

Before any accepted-spec write, record each source requirement, destination, action (add/replace/remove/preserve), evidence, and conflicts in `review.md` under this change. Pause for a material source/runtime disagreement or overlapping user edit. Unrelated pending proposals never override the selected V2 contract.

Alternative rejected: copying ten deltas into this proposal would create two owners of the same contract and ambiguous archival/sync ordering. Introducing a new "documentation" game capability merely to satisfy the schema would also misrepresent scope.

### 2. Use a documented authority and audience map

Add `docs/README.md` as an index, not another rule book:

| Audience / concern | Maintained home | Role |
|---|---|---|
| GitHub visitor | root `README.md` | Game pitch, local play, short controls, AI development disclosure, license |
| Player | `docs/GAME_RULES.md` | How to move, act, solve, fail, undo/restart, load packs, interpret scores |
| Level author | `docs/level-design/tile-mechanics.md`, `docs/world-level-packs.md`, checklist | Exact supported definitions, defaults, YAML and authoring boundaries |
| Agent / contract reviewer | `openspec/specs/` | Accepted normative requirements and scenarios; after synchronization, no obsolete competing mechanics |
| Engine implementer | existing PDD and `docs/engine-architecture.md` | Abstract state/transition model and concrete module/lifecycle ownership respectively |
| Verifier | certification and verification records | Dated evidence, proof completeness, browser distinction, unresolved approval |
| Future/history reader | explicitly labeled drafts, design history, active changes, archives | Non-shipped proposals or historical intent; never automatic runtime contracts |

Before sync, describe the scoped V2 deltas as the selected breaking implementation target and accepted-spec drift as pending. After reviewed sync, route normative references to accepted specs and retain the migration as provenance. Adjust the root `AGENTS.md` authority note consistently; do not erase the fact that approval was once pending.

Alternative rejected: putting scheduler details and migration process into every player-facing document invites duplication and stale authority claims.

### 3. Translate one contract into two writing styles

Player prose explains observable outcomes: arrows/WASD/HJKL, Shift+direction pull eligibility, Space/Enter current-tile Action/Rest, Z undo, R restart, N next, click inspection. Verify keys against `sm-ui.js`; its current `KEYMAP` is source-configured with no in-game rebinding UI. State explicitly that code development is agent- and LLM-driven without suggesting gameplay needs an LLM, network, or API key.

Keep game help practical: four colors, goal entry rather than stationary equality, conveyor exit arrows and stationary passengers on rest, plates/targets/receivers as distinct signal sources, terminal mistakes versus undoable nonterminal actions, and restart/navigation recovery. Move or link queue coordinates, cycle signatures, budgets, storage schema internals, and commit journals to technical material. Preserve all behavioral caveats rather than simplifying them away.

Technical prose defines terminology once in the existing PDD and links it elsewhere:

- **Configuration D:** immutable normalized board/definitions, authored parameters, initial conditions and declared actor profiles.
- **Canonical state S:** actor identity/positions, P/W, polarity, latches and mutable feature profiles, counters, terminal outcome/reason; observational discovery is separately tracked and rolled back when needed.
- **Derived state R(D,S):** source activity/contacts, requested closure, effective solidity and pending closure. It is rebuilt consistently, not stored as an independent competing truth.
- **Round context C:** pending typed work, source/actor provenance, incoming transport direction, signal edges, semantic repetition identity and attempt count. This context does not survive as hidden next-command work.
- **Transition T(D,S,a):** synchronous evaluation returning committed state and ordered events, or a diagnostic restoring the complete pre-action state. A direct blocked command and an aborted transaction are not the same outcome.
- **Outcome:** playing, won, failed; a diagnostic abort is not a fourth persistent gameplay state. Physical closure can fail before an entry checkpoint; legal matching entry can win before later effects/rays; only a non-winning drained queue is sampled for exposure.
- **Playback:** a passive projection of complete committed events/snapshots; rendering cannot choose an outcome or schedule rule work.

Do not pretend the model notation is a new public API or change existing field layout. Differentiate settled-state solver identity from transaction repetition identity: the latter also includes semantically ordered pending work and transition-relevant context, excluding absolute enqueue serials.

Alternative rejected: a new parallel technical rule book would compete with the PDD, accepted specs, and catalogue.

### 4. Synchronize every capability and inspect residual text

The initial review matrix is:

| Capability | Known accepted-spec discrepancy / required disposition |
|---|---|
| `event-resolution` | No accepted home; add the existing transaction, queue, closure, checkpoint, terminal, rollback and lifecycle contract. |
| `conveyor-transport` | No accepted home; add the existing common passenger policy, inert tint/exit direction, post-direct scans, one-hop legality, no front shove, provenance/rollback and presentation agreement. |
| `tile-mechanics` | Incomplete catalogue (missing polarity and receiver variants); dot absent as a separate definition; final-rest-only entry effects; old belt-kind split/front shove; recoverable rays; stationary goal match. Replace with uniform definitions and V2 boundaries; preserve unaffected coordinate/passability/link requirements. |
| `movable-objects` | Recoverable ray reset, chain-local loop stopping, whole-phase transport language, and ambiguous target relocation/ordinary walking; integrate atomic profiles, per-hop queue, terminal-aware undo/search, full-action abort. |
| `line-of-sight-hazards` | Purpose and requirements mandate respawn/no loss and catch before goal; remove obsolete recovery requirement and integrate terminal settled exposure and earlier goal-entry priority. |
| `binary-gate-polarity` | Allows a dot on a newly closed barrier to leave; replace with immediate terminal closure, crate-held pending closure, and matching lifecycle/search semantics. |
| `chromatic-aura-routing` | Allows winning by later equality while standing on goal; integrate entry-only checkpoint and captured prism/current carrier timing. |
| `sokoban-targets` | Round-level gate updates and ambiguity that stationary targets block ordinary dot walking; integrate per-commit activity/OR, common closure, and explicit relocation-versus-walking distinction. |
| `crate-proximity-switches` | Activity only described after a resolved action; integrate every-hop derivation, contact OR and edge reactions, shared closure and nonterminal-only undo. |
| `world-level-packs` | Missing sole-policy loading/current-only progress guarantees and complete V2 certification/export distinctions; merge all existing additions and preserve unrelated loading/selection/art requirements. |

For each capability, review the complete accepted file after merging, including Purpose, prose between scenarios, tables, cross-references, and unchanged requirements. Preserve source delta requirement blocks when possible: `auditSpecSync` normalizes whitespace but compares complete named blocks, not just semantic keywords. Add abstract explanations outside those blocks; if a necessary correction conflicts with a source block, stop for a coherent source-artifact update instead of weakening the audit.

Full-file prose is not machine-checked by the block comparator. A green audit is necessary evidence, not proof that every sentence is coherent. Likewise unchanged broad victory-picture requirements need runtime comparison rather than assumptions; report a conflict if discovered without expanding game behavior.

### 5. Classify unresolved items; do not decide future mechanics

Record a small disposition table in `review.md`: path/section, audience, conflict, V2 source and runtime/test evidence, action, owner/dependency, status. Statuses are `resolved`, `blocked`, `deferred-out-of-scope`, or `historical-non-authoritative`.

- Accepted-spec synchronization is actionable within this change after mapping review.
- World 7/8 concepts, inventory/collapse/mixed-color proposals, superseded `v2-rule-set`, and editor/standalone-solver proposals are not playable rules. Preserve history and identify status without designing or implementing them.
- Preserve the user-owned editor draft and editor change. Link the YAML/JSON and board-bound discrepancy to their owner; resolution requires separate authorization/owner reconciliation. Do not silently move, overwrite or hide the draft, exclude it from auditing, or relabel its content as accepted.
- Preserve `docs/Nouveau document` and the World 6 archive relocation entirely. No broad cleanup or archive action is justified by this change.
- Maintain dated implementation/browser/proof records as checkpoint evidence; append a separate current review outcome rather than turning old pending statements into false historical claims.

### 6. Verify honestly with existing tools

During apply, validate both changes, review requirement mapping and local links, and run the existing registry/rules/levels/helpers focused suites as relevant plus final `npm test`. Run both strict `node scripts/audit-v2-assets.js` and `--preaccept`; record exact exit status, pending mappings, errors and readiness. Strict success is the desired post-sync result **only if all unrelated blockers are resolved**. Today the untracked editor draft is an independent blocker, so do not promise `releaseReady: true` from accepted-spec synchronization alone.

No runtime/presentation/pack changes are authorized. Do not regenerate mathematical/native-browser evidence just because prose changes. Check whether fingerprints remain valid, distinguish prior native Chromium evidence from newly run jsdom, and rerun real Chromium only if a separately authorized change actually affects rendering/local loading or evidence freshness requires it. Do not modify tools/tests to make obsolete statements pass.

## Risks / Trade-offs

- [Synchronization is mistaken for automatic acceptance] → Record the reviewed mapping, validate all ten source deltas, and report human approval/release and archive status separately from test/audit success.
- [Documentation inadvertently specifies a new rule] → Require a source delta and runtime/test anchor for every behavioral correction; pause on conflict instead of extending mechanics.
- [A partial merge retains a contradictory sentence] → Review entire accepted files and all unchanged clauses, not just changed blocks or regex hits.
- [Formalization becomes a second engine design] → Extend the existing PDD with descriptive notation and reference concrete architecture separately; do not add APIs or alternate algorithms.
- [Unrelated draft makes the global audit fail] → Preserve it, report its owner/dependency and exact failure, and leave the corresponding acceptance gate blocked. No audit exemptions or unauthorized draft edits.
- [Status wording damages historical evidence] → Preserve dated results, append current findings, and only update present-tense navigation/authority after reviewed synchronization.

## Migration Plan

1. Establish the read-only inventory, current audit baseline and protected-work list; write the requirement/discrepancy mapping before accepted-spec edits.
2. Review and synchronize all ten V2 source deltas without archival; reconcile stale Purpose and residual contradictory text, preserving unrelated requirements.
3. Add audience navigation, revise README/player help, formalize the existing PDD, and reconcile architecture/authoring/agent authority links.
4. Run validation, focused checks, final repository tests and both audit modes. Publish current review results and unresolved owner dependencies separately from older checkpoint evidence.
5. If an owner dependency remains unresolved, report the exact incomplete gate rather than declaring project documentation fully coherent or release-ready. Do not close tasks whose acceptance requires that dependency.

Rollback is a reviewed reversal of only this change's own documentation edits. Preserve all pre-existing user work; do not reset the working tree, restore old executable semantics, alter old progress bytes, or remove historical proposals.
