# V2 documentation review — 2026-11-02

## Scope and baseline

This is a documentation-only review, authorized by `doc-review-v2-ruleset` apply.
The user's clarification is the guiding abstraction: **the contract is states
and events**. The engine owns transaction integrity and event ordering; registered
tile strategies own mechanic-specific queries and transitions. Golden Rules
(inspectable/minimal state, determinism, early safety, meaningful progression)
remain unchanged. No new game rule, tile, object, API, or engine refactor is added.

Starting tree: five deleted source files from the separate World 6 archive move;
untracked archive destination, `docs/Nouveau document`, editor draft and editor
change; this review's planning artifacts. No tracked runtime changes were present.
Protected paths include `src/`, `data/`, `tests/`, `scripts/`, dependencies,
`docs/design-history/`, all archives, the migration source change,
`docs/Nouveau document`, `docs/level-editor-PDD-V1.md`, and
`openspec/changes/level-editor-v1/`. A SHA-256 manifest of 83 existing files was
captured at `/tmp/opencode/doc-review-v2-protected.json` before any edits.
The deleted World 6 source is not restored or staged.

Baseline commands run in this apply session:

| Command | Exit | Observed result |
|---|---|---|
| `openspec validate doc-review-v2-ruleset --strict` | 0 | Valid; no new behavior deltas (`skip_specs`). |
| `openspec validate v2-global-pack-migration --strict` | 0 | Valid source change. |
| `node scripts/audit-v2-assets.js --preaccept` | 1 | Editor draft error; deferred hazard spec; all ten sync mappings pending; `releaseReady: false`. |
| `node scripts/audit-v2-assets.js` | 1 | Editor draft and hazard spec errors; all ten pending sync errors; `releaseReady: false`. |

Both audit modes find 62 definitions plus the dot, 7 packs and 61 levels.
The unrelated editor draft is an independent global-audit blocker; no audit
exception, file relocation or draft overwrite is part of this change.

## Reviewed source-to-accepted mapping

Source for each row is
`openspec/changes/v2-global-pack-migration/specs/<capability>/spec.md`;
destination is `openspec/specs/<capability>/spec.md`. Requirement names below
are exact. Replace means the complete existing block including its scenarios;
add means append the source block, preserving unaffected requirements in order.
New accepted files use the source Purpose and a single Requirements section.
No delta-operation headings belong in accepted specs.

### event-resolution

Add all ten requirements (new accepted home):
- One initiating action resolves as one synchronous transaction
- Direct multi-actor moves commit atomically
- Priority and source order determine every queued effect
- Entry and departure records preserve committed trigger identity
- Handler mutation batches are validated atomic effects
- Cycles and exhausted effect budgets abort the whole action
- Physical closure is uniform across dynamic surfaces
- Matching goal entry interrupts after signal reactions
- Terminal failure is committed and restart-only
- All transition-relevant state shares lifecycle and event guarantees

Evidence: `sm-rules.js` queue priorities, `resolveTurn`, `resolveAction`,
`atomicEffect`, `enqueueBehavior`, `closureAt`, snapshot/restore/signature;
`tests/unit/v2.js` atomic mutation, priority, identity, checkpoint and rollback
fixtures. Events are the committed output, queued requests are internal work.

### conveyor-transport

Add all six requirements (new accepted home):
- A conveyor is floor with an explicit exit direction and inert tint
- Initial queue seeding checks all conveyor occupants
- Every eligible passenger uses shared current-state legality
- Blocked conveyors do not invent pushing
- Conveyor arrivals generate ordered subsequent work
- Every conveyor asset communicates the same unique exit direction

Evidence: `tiles.js` conveyor strategies/definitions, `sm-rules.js` `seedBelts`,
`queueForce`, transport dispatch; `tests/unit/v2.js` all-ID/passenger/tint,
stationary-rest, stale-source, blocked-exit and loop fixtures.

### tile-mechanics

Replace: The tile catalogue is documented by stable ID and behavior;
Tile effects occur at standard resolver boundaries;
Turns, strokes, and view playback share one deterministic result.
Add: Maintained gameplay assets describe only the sole V2 contract.
Preserve: Level grids and tile overrides have consistent coordinates;
Passability is evaluated from the current resolved state;
Linked locks use a fixed precedence;
Switches and sensors expose distinct activation conditions.

Evidence: `tiles.js` registry/dot/state manifests; `levels.js` schema;
`sm-rules.js` captured hooks, closure/checkpoint and queue; registry/rules unit
suites and `checkTileMechanicsGuide`. Replace the old incomplete ID table as
part of its source requirement. Rewrite Purpose's in-flight-change wording;
explain requested versus effective closure outside preserved requirement blocks.

### movable-objects

Replace: Movable entities use declared capabilities;
Push moves one eligible object into a legal destination;
Pull moves an eligible trailing object with the mover;
Movable targets preserve identity and link behavior;
Automatic transport is capability- and destination-aware;
Rays can transport compatible objects and threaten exposed players;
Object movement is finite, undoable, renderable, and solver-visible.
Preserve: Designers can configure supported object capabilities per cell.

Evidence: common movement/destination/profile and transport helpers;
`checkDirectObjectMovement`, `checkTargetLayer`, `checkObjectOverrides`,
`checkFailureSolver`, and V2 lifecycle/transport fixtures. Preserve the exact
per-cell capability mapping; source defaults replace the old baseline paragraph.

### line-of-sight-hazards

Replace: Cardinal rays threaten unobstructed cells;
Hazard resolution is turn-based; Lolo's Castle has eight progressive levels.
Remove: Caught player respawns without a lose state (and all its scenarios).
Add: Exposed failed attempts preserve the board until restart or navigation.

Evidence: `resolveAction` drained-queue exposure, `failAttempt`, terminal input
guard, UI undo/restart and `checkFailureTransitions`/`checkFailureSolver`.
Purpose must describe final terminal exposure, not positional recovery.

### binary-gate-polarity

Replace: Closed polarity barriers block entry and crate pushes;
Polarity state is undoable and solver-visible.
Add: Every shipped polarity level is recertified under V2.
Preserve: Binary polarity controls complementary barriers;
Hyrule Flip-Flop has eight progressive levels.

Evidence: `closureAt`/`enforceDotClosure`, polarity query/flip strategy,
`checkPolarityBarriers`/`checkPolaritySwitch` and V2 pending/failed fixtures.
The complementary class describes requested openness; crate-deferred effective
closure is separately defined by event-resolution, not a second polarity.

### chromatic-aura-routing

Replace: Prisms set one player aura and matching gates test the correct carrier;
World 5 exits retain the existing matching-goal rule.
Add: Every shipped chromatic route reflects queue timing.
Preserve: Chromatic puzzles use only the existing four gameplay colors;
Chromatic levels teach the mechanic without mixing or implicit aura reset.

Evidence: captured prism/goal strategies, `checkChromaticContracts`, V2
intermediate-prism and stationary-goal fixtures; no fifth carrier/color mixing.

### sokoban-targets

Replace: Crate occupancy activates a target;
Target activity controls its linked gate; Sokoban crates can only be pushed;
Sokoban state is undoable and solver-visible.
Preserve: World 1 levels follow the Sokoban teaching progression.

Evidence: atomic push, derived target activity, `checkTargetLayer`,
`checkWorldOneContent` and V2 signal-edge/closure tests. Normal dot walking onto
a stationary target is not an attempted feature relocation.

### crate-proximity-switches

Replace: Receiver activity follows crate movement;
Receiver state is visible, undoable, and solver-visible.
Add: Every shipped docking level is migrated and certified.
Preserve: A receiver detects matching crates in cardinally adjacent cells;
Receiver colors and links are independently authorable;
Goof Proximity has eight progressive levels.

Evidence: receiver activation strategy, `signalState`, atomic derivation,
`checkReceiverVariants`/`checkReceiverLinksAndSolver`, V2 OR and edge tests.

### world-level-packs

Replace: World progress uses world-qualified level identity.
Add: Every pack has one V2 interpretation;
All shipped levels receive V2 certification;
Pack migration preserves identities and canonical progression;
Prologue generation and pack exports preserve current data;
Certification records make scores and coverage inspectable.
Preserve: A world pack identifies its world and levels;
World packs load without network access;
Pack validation is atomic and actionable;
Every level in a loaded world is directly selectable;
World 1 provides a victory picture for every solved level;
World pack grids obey the supported board format.

Evidence: shared `levels.js` loader/solver, `sm-store.js`, pack migration tests,
UI authored export and `isWorldOneLevel`/`solvedBoardDataUri` (World 1 snapshot fallback).
Default PASS art elsewhere does not supersede World 1's snapshot requirement.

## Dispositions and completion evidence

Mapping reviewed before accepted-spec writes. All source scenarios survive
their corresponding replacements; unaffected requirement blocks are preserved.
Status and verification results are recorded below as work completes.

- 2.1: Created accepted event-resolution (10 requirements) and conveyor-transport
  (6 requirements), preserving source blocks and Purpose. Added a non-normative
  state/event boundary introduction outside the blocks. Rules suite: **418/418**.
- 2.2: Merged the catalogue and movable-object blocks, including independent dot,
  all 62 IDs, per-hop timing and whole-round abort. Preserved four tile-mechanics
  requirements and the object-overrides requirement. Registry passed; rules
  **418/418**. Requested/effective interpretation is outside source blocks.
- 2.3: Merged hazard, polarity and chromatic deltas. Removed the entire old
  recovery requirement and corrected hazard Purpose. Preserved progression and
  four-color clauses; polarity introduction distinguishes requested class from
  effective cell closure. Rules **418/418**.
- 2.4: Merged target and receiver per-commit derivation, edge/source OR, closure
  and nonterminal undo; retained distinct occupancy/contact definitions and
  progression requirements. Rules **418/418**.
- 2.5: Merged current-only progress and all five pack additions, retaining six
  unrelated requirements. UI World 1 solved-board generation was inspected.
  Levels suite: **783/783**, including shipped-pack proof/replay regressions.
- 2.6: All ten accepted specs pass strict validation. The semantic-block audit
  reports `pendingAcceptedSpecSync: []` and `deferredAcceptedSpecs: []`.
  A comparison against HEAD also verifies all 19 unaffected requirement blocks
  are unchanged (trimmed boundary whitespace only). Whole-file review covers
  Purpose, catalogue, scope and requested/effective interpretation. The remaining
  audit error is exclusively the protected editor draft; no release approval.
- 3.1: Added `docs/README.md` with player/author/agent paths, normative-versus-
  evidence authority and non-shipped history/future labels; local links checked.
- 3.2: Replaced migration-heavy README with quick start, compact controls,
  agent/LLM authorship, deterministic offline gameplay, docs/tests/license and
  issue-report guidance. Keys checked against `bindInput`/`KEYMAP`; local links
  exist. Rebinding is explicitly source-only, not an implemented settings UI.
- 3.3: Game rules now explain observable commands, colors, intermediate effects,
  transport/source distinctions, precedence and recovery, loading and scores.
  Scheduler coordinates, effect budget, state identity and storage-schema detail
  are linked to technical homes. Statements map respectively to event-resolution,
  chromatic routing, conveyors, movable objects, targets/receivers and packs;
  current keys and all local links were checked.
- 4.1: PDD now defines D/S/derived R/round C/journal E/observation O, the
  transition/result table, intent versus captured trigger versus committed output,
  and engine/definition/view ownership. Clarified that handler manifests are not
  a sandbox and counters/discovery/checkpoint-only victory are core-constrained.
  Formal notation is descriptive, not new fields or APIs. Source anchors are
  `resolveTurn`, `atomicEffect`, `queueForce` and the sealed state validator.
- 4.2: Architecture maps the same vocabulary onto concrete query/commit/journal/
  view boundaries, work-record categories, solver versus round identity and
  lifecycle. `snapshot` deliberately excludes discovery while abort separately
  restores it; `snapshotSig` excludes counters and includes terminal reason.
  These code boundaries were inspected. Helpers suite: **32/32**.
- 4.3: Updated pack/reference/checklist/blueprint/agent authority to accepted
  V2 specs and the state/event boundary. Clarified schema-only loading versus
  solver-certified PAR in the pack guide. Numeric ID catalogue/defaults, example
  YAML and profiles are unchanged. Registry passed; levels **783/783**. The
  reference's registry/default/usage audit still passes with only the draft error.

## Disposition inventory

| Material | Audience / issue | Disposition | Owner / evidence |
|---|---|---|---|
| Ten accepted capability specs | Normative baseline lagged V2 | resolved | Complete source mapping above; strict spec validation and zero pending sync mappings |
| Root README and game rules | Player help mixed migration/scheduler detail; missing concise controls/AI disclosure | resolved | Player-oriented rewrite, current key bindings and state/outcome contracts |
| PDD and architecture | Ambiguous engine/tileset coupling and mutable-state wording | resolved | Descriptive state/event model, declared strategies, atomic journals, core-owned invariants |
| Authoring reference, pack guide, checklist, blueprint, AGENTS | Pending-sync authority and schema/proof ambiguity | resolved | Accepted-spec links, exact bounds/profiles retained, shared-loader examples/tests |
| Certification, asset checklist, per-world route reviews and verification | Checkpoint prose says synchronization pending | historical-non-authoritative for status | Preserve original math/browser evidence; dated follow-up supplies current contract status |
| `docs/level_editor_Proposal.md` | Maintained future-editor concept using current YAML/registry | deferred-out-of-scope | Not a shipped gameplay contract; editor implementation belongs to its separate change |
| `docs/level-editor-PDD-V1.md` | Untracked exploratory draft specifies JSON levels, 3×3 minimum and ambiguous start/target state | blocked | User-owned editor work; conflicts with YAML, 2–16 by 1–9 and independent dot/goal/target contracts; owner must reconcile before whole-tree audit readiness |
| `openspec/changes/level-editor-v1/`, editor sources/tests | Concurrent authoring-tool development | deferred-out-of-scope | Preserve; no editor acceptance, code change or generalized solver design by this review |
| Blueprint Worlds 7/8; active collapse/generalized-solver ideas | Future concepts include unsupported mechanics | deferred-out-of-scope | No decisions on new rules, tiles or objects; active proposal status is not implementation evidence |
| `openspec/changes/v2-rule-set/` | Explicitly superseded older selectable/color model | historical-non-authoritative | Preserve its incomplete history; sole current V2 has no selector or fifth carrier |
| `docs/design-history/`, `openspec/changes/archive/` | Historical intent may contradict V2 | historical-non-authoritative | Preserve bytes and use accepted specs for current behavior |
| `docs/Nouveau document` | Unclassified user draft | deferred-out-of-scope | Preserved without treating it as a contract |
| World 6 archive relocation | Pending independent source/destination move | deferred-out-of-scope | Preserve source deletions and archive destination; no archive/stage/commit operation |

### Concurrent work detected during verification

The baseline hash check detected external changes in four files under
`openspec/changes/level-editor-v1/`, plus `package.json` and `tests/verify.js`.
`git diff` identifies the new editor unit command and editor module/test wiring;
new `editor.html`, editor CSS/JS and editor tests also appeared. This review's
edits have been exclusively documentation and accepted specs; none of those
external files was edited, restored or staged here. Hash checks on the remaining
protected baseline files must continue to match. An unchanged entire workspace
cannot be claimed while another task is active; scope verification attributes
only this review's own edits. Do not reset external changes to manufacture a
clean tree, and do not infer editor acceptance from newly present files.

- 4.4 scope verification: **77/83** protected baseline hashes still match;
  the six differences above belong to concurrent editor work, not this change.
  User drafts/history/source migration/core runtime/packs/proof files are intact;
  all five World 6 source deletions remain. No future-mechanic decision was made.
- 4.5: Added dated follow-ups to verification, asset checklist and all seven
  route reviews; updated the current ledger summary without changing rows/routes.
  Prior no-sync/no-commit/browser statements are explicitly checkpoint evidence.
  Current synchronization is recorded separately from draft blockers and release
  approval. Proof/native-browser JSON was not regenerated or edited.

## Final integration checks

- 5.1: Strict validation passes for this change, the unchanged migration source
  change and all **10 accepted specs**. `git diff --check` passes. **149** local
  links/heading anchors were checked across **30** review-owned documents/specs.
  Scoped diff is documentation-only; all 77 unaffected protected baseline hashes,
  archives, engine/packs/proof assets and World 6 source deletions remain intact.
  Six concurrent editor-owned changes are attributed separately above, not
  reverted or claimed as work performed here.
- 5.2: Final root `npm test` passed **1120 Node + 264 game jsdom checks**,
  plus **28 editor-browser checks** added concurrently by the separate editor
  work. The command's current script included `tests/browser-editor-test.js`;
  this review did not alter package/test files. No native Chromium was run.
- 5.3 command evidence: both `node scripts/audit-v2-assets.js --preaccept` and
  strict `node scripts/audit-v2-assets.js` exited **1**, with exactly:
  `docs/level-editor-PDD-V1.md: stale authoritative rule/schema guidance`.
  Both report `pendingAcceptedSpecSync: []`, `deferredAcceptedSpecs: []`,
  62 definitions plus dot, 7 packs and 61 levels; `ok: false` and
  `releaseReady: false`. Existing proof/native fingerprints are accepted by the
  audit; their files are unchanged. **The whole-tree gate remains incomplete**
  until the owner reconciles that protected draft. No bypass or unrelated edit.

### Concurrent documentation follow-up

After the initial link check, separate editor work added `docs/level-editor.md`,
an editor paragraph to the root README/checklist, and an implementation-status
note to `docs/level_editor_Proposal.md`. Those additions are preserved. This review
corrected only the checklist's relative guide link and linked that guide from the
documentation index; the blueprint no longer makes the now-stale blanket claim
that no editor exists. The editor's feature/acceptance claims remain owned by its
separate change, not verified as part of V2 contract synchronization. Earlier
disposition descriptions above refer to the discovery checkpoint. The conflicting
user-owned exploratory draft still needs owner reconciliation.

### Latest final results after concurrent documentation additions

- Repeated root `npm test`: **1120 Node / 264 game jsdom / 28 editor-browser**
  checks pass. No native Chromium execution is claimed.
- Updated local-link/anchor scan: **154** targets pass; whitespace check passes.
- Both final audit modes exit **1** with two reported paths:
  - `docs/level-editor-PDD-V1.md`: substantive conflicting exploratory guidance,
    protected and still unresolved by its owner.
  - `docs/level_editor_Proposal.md`: the concurrently added status references
    `level-editor-v1`; the audit's case-insensitive `\bV1\b` heuristic matches
    that change name. This extra flag is a **naming false positive**, not evidence
    that the YAML-only proposal now defines obsolete gameplay. Its current status
    and shared-YAML requirements were inspected; neither the external status
    reference nor the audit was rewritten just to obtain a passing result.
- Both final outputs still have `pendingAcceptedSpecSync: []`,
  `deferredAcceptedSpecs: []`, and `releaseReady: false`. The existing math/native
  evidence remains accepted by the fingerprint checks. All ten accepted contracts
  and both source/review change validations pass strict validation.

**Owner resolution requested:** reconcile or explicitly classify the protected
exploratory draft within its own scope, and review the audit's broad version-name
heuristic separately so valid change provenance is not confused with old rules.
No authorization for a rule/tile/object or code change is inferred here.

Verification task 5.3 is complete because both commands, sync checks, exact
failures and owner actions are recorded as required. The separate **whole-tree
coherence/release gate remains blocked**; completing this reporting task does not
claim its success, waive the dependency or imply release approval.

## Final review summary

- All documentation implementation and verification/reporting tasks in this
  change are complete. No gameplay behavior, tile/object, pack, PAR or schema was
  introduced or altered by this review.
- Accepted specs now contain the ten existing V2 capability contracts; source
  deltas remain unchanged, no pending sync mapping survives, and all 19 unrelated
  original requirement blocks are preserved.
- Player and agent documentation have distinct entry points. State/query/event
  boundaries, engine/definition ownership and lifecycle semantics are explicit;
  the root README contains short controls and agent-/LLM-driven disclosure.
- Historical math/native-browser evidence is preserved with dated status
  follow-ups. External editor work is preserved and attributed, including its
  README/checklist additions; it is not accepted or implemented by this review.
- Tests, strict contract validation, links and whitespace pass. Global asset
  readiness remains **false** for the two editor-document audit findings above.
- No staging, commit, push, archive, release approval, audit exemption or
  native-browser evidence regeneration was performed by this change.
