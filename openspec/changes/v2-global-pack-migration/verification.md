# Implementation verification

## Preflight

- Change status/instructions: ready, spec-driven, 0/53 at start.
- `openspec validate v2-global-pack-migration --strict`: passed.
- Read all context, inventory, and catalogue files; inspected existing diffs.
- Recounted source packs through the shared parser: Prologue 13, Worlds 1–6
  eight each, 61 total; registry has 62 entries plus the separate dot.
- Existing 26-task implementation is the superseded selectable-ruleset design.
  Its compatible fixes are retained by review, not by resetting the tree.
- Preserve the pending World 6 archive relocation, unclassified
  `docs/Nouveau document`, source drafts, and historical archives/design history.
- No staging, commits, branch changes, tags, pushes, or destructive resets.

Subsequent test/proof/browser evidence is recorded only after it is run.

## Engine and tool checkpoints

- Focused registry, rules, levels, and helpers commands have passed after their
  relevant changes. Browser fixtures are written; full browser/Chromium gates
  have not run at this checkpoint.
- `npm run levels:emit -- --check`: passed for all 13 Prologue levels; no files
  written, supported authoring and JS/YAML semantic parity verified.
- Read-only 61-level probe: 50,000 states, depth 200, 100,000 route labels.
  No `unknown`; five levels are unsolvable (World 2: 4/7/8; World 4: 2/7).
  World 2: 1/2/3/5/6 have new short goal-priority bypasses; these are not accepted
  redesigned lessons. World 4 level 3 minimum is 8 rather than declared 7.
  Other numerical minima match source declarations, including World 3 level 8
  minimum 97 (127 states). These probes do not replace manual design review or
  the pending certification ledger.

## Content and documentation checkpoint

- Completed tasks 9–15 with all seven per-pack reviews and all 61 ledger rows.
  All shipped first-three groups have complete playing-state reachability review
  with zero unwinnable playing states; visible ray failures are counted separately.
- Fixed early Prologue/World 6 wrong pushes, safe plate release, portal/cargo
  bypasses, all World 2 exposure-dependent boards, and World 4 closed loops and
  bumper bypass. Advanced avoidable wrong pushes and optional scenery are explicit
  in each review, not mistaken for global deadlock freedom.
- `npm run levels:routes -- --early-review --output=docs/level-design/v2-pack-proofs.json`
  passed: all 61 exact minima replay, every balance comparison complete. Totals:
  Prologue 160; W1 114; W2 148; W3 176; W4 58; W5 104; W6 109 = 869.
- Independently checked all 61 published route examples against current selected
  solver routes; all 48 implemented blueprint rows match source names/dimensions/PARs.
- Published all 62 ID definitions plus the dot, exact defaults, 49 used / 13 unused
  usage, complete behavior groups and lifecycle. Strengthened audits cover each
  group's required fields, every default, and exact per-pack usage. Registry,
  focused rules/levels/helpers checks passed for their associated changes.
- Reconciled current rules/PDD/architecture/pack guidance, author instructions,
  implemented blueprint sections, route reviews, and the future YAML-only editor
  draft. Worlds 7/8 and the editor remain explicitly unimplemented.

## Explicit obsolete-path disposition (task 16.4)

- Removed alternate resolver selection/fallback branches and prototype-only
  floor-tier data/policies, automatic Green pulling/Red chain strength, five-color
  gameplay, neighbor-ACTION participant waves, and unused supporting-floor flags.
- Removed independent player/object force-chain implementations and passenger-kind
  belt shoving; replaced arbitrary directed-loop endpoints with full transaction
  rollback. Retained generic geometry/entity/query helpers and supported unused IDs.
- Removed provisional/final-rest-only goal resolution and recoverable exposure
  state/events, their input/storage/presentation compatibility branches, stale
  caught-class/floor-color rendering, and obsolete gameplay assertions. Negative
  fixtures still prove unsupported fields/imports and recovery events are rejected.
- Replaced old-score migration with a fresh current-only store, leaving prior bytes
  unread and untouched. Kept generic registered handler APIs and `isCaught` as a
  read-only exposure query; neither supplies another playable policy.
- Replaced broken module-harvesting gallery/bootstrap/tool paths with the common
  local classic-script registry/runtime. Generators validate/replay before writes.
- Preserved generic validation diagnostics such as V1/V10/V12: these are error
  labels, not rule modes. Embedded victory PNG bytes and all source overrides survive.
- Closed review edge cases: shallow-frozen trigger payloads are deeply captured;
  unsupported nested fields/partial profiles, array extensions, and handler writes
  to core-owned discovery now abort/restore instead of escaping the state journal.
- Historical archives/design history, Git history/tags, dependency/harness internals,
  the pending user World 6 archive relocation, and `docs/Nouveau document` remain
  untouched. All task work is uncommitted; no staging, commits, branches, or pushes.

Final full-suite/Chromium/audit results are recorded below only once run.

## Final repository test gate (task 17.1)

- `npm run test:unit:registry`: passed.
- `npm run test:unit:rules`: 418 passed, zero failed.
- `npm run test:unit:levels`: 783 passed, zero failed, including all-pack native
  assertions in `tests/unit/pack-migration.js` beyond the harness counter.
- `npm run test:unit:helpers`: 32 passed, zero failed.
- `npm test`: final rerun passed **1120 Node checks / 264 jsdom checks**, zero
  failures. The first final run exposed two obsolete browser expectations;
  contact-vs-occupancy guidance and pending-barrier assertions were corrected,
  not skipped. A conservative no-color-actuator diagnostic no longer claims
  non-chromatic puzzles are trivially solvable.
- `npm run levels:routes -- --early-review --output=docs/level-design/v2-pack-proofs.json`:
  passed after final engine metadata/validation changes; fresh fingerprint,
  61/61 minima/replays and complete balance comparisons, all early reviews complete.
- `git diff --check`: passed at this checkpoint.
- `node scripts/audit-v2-assets.js --preaccept`: passed with zero implementation/
  content/reference errors; all ten capability synchronizations are explicitly
  pending. The strict release audit must not be represented as passing acceptance.

Actual Chromium checks are a distinct task; none of these commands launches it.

## Actual Chromium gate (task 17.2)

- `node scripts/verify-v2-chromium.js`: passed with real installed Chromium
  **154.0.8037.97**, headless local DevTools, fresh temporary profile, `file://`.
  No browser library, game server, or new dependency was installed.
- All seven packs loaded through actual file input and YAML paste. Every native
  source minimum was verified; initial authoring round-tripped before and after
  representative play, invalid input was atomic, and nonterminal undo matched
  the complete pre-action snapshot. Each representative reached real victory.
- Prologue progression/custom PNG/conveyors, World 1 targets, World 2 shield and
  native exposure failure, World 3 pending closure and native dot-following
  closure failure, World 4 bumper/tint variant, World 5 distinct P/W, and World 6
  actual conveyor docking were exercised through the real UI/keyboard.
- A labeled shared terminal fixture from every pack context verified frozen
  failure, disabled input/undo, no best/victory art, restart, and Prologue return.
  This fixture is not claimed as an authored pack route. Native W2/W3 failure
  cases additionally checked the actual authored boards.
- Gallery loaded all 62 IDs plus dot, eight visible arrows/four directions,
  inert tint, and pending/failed samples. Actual screenshots were inspected for
  each representative, pending/terminal state, custom victory, and gallery arrows.
- Final native run: **zero page exceptions / zero external resource requests**.
  Full source/engine/presentation-bound evidence and screenshots are recorded in
  `docs/level-design/v2-chromium-verification.json`; current screenshots are under
  `/tmp/opencode/v2-chromium-EAGzEs/` after the final source/header-comment rerun.
- An initial automation attempt stopped on a quoted selector in its DevTools
  evaluation, not a product failure; the harness was fixed and all seven cases
  were rerun successfully. Further native failure/export assertions also passed.
- `docs/level-design/v2-verification.md` is the readable public record. The asset
  audit now rejects stale/omitted/failed real-browser evidence as well as math/
  design omissions. Accepted-spec synchronization remains explicitly pending.

## Final scope/audit review (task 17.3)

- Final `openspec validate v2-global-pack-migration --strict`: passed.
- Final `npm test`: **1120 Node / 264 jsdom**, zero failed; all four existing
  focused commands passed again (registry, rules 418, levels 783, helpers 32).
- Refreshed proof report and real Chromium run after the last authoring-header,
  diagnostic, and stale source-link cleanup; both pass with current fingerprints.
  `npm run levels:emit -- --check` passes all 13 source/YAML minima without writes.
- Final `node scripts/audit-v2-assets.js --preaccept`: passed, no implementation,
  content, definition/default/usage, reference, math, or native-browser errors.
- Final **strict release audit exited 1 intentionally**: the only outstanding
  items are all ten accepted capability synchronizations and the accepted hazard
  document's obsolete recovery wording/Purpose. `releaseReady` remains false.
  No accepted spec was silently synchronized or archived; approval is required.
- `git diff --check`: passed. Diff/status review confirms no staged changes,
  dependency/lockfile/harness/history edits, or rollback of unrelated user work.
  The pre-existing World 6 archive relocation remains pending and unchanged by
  this implementation. The superseded plan still has exactly 26/30 tasks checked.
- All **61** ledger identities/names/scores match current source; all selected
  minima replay and compare completely; all **21** early reviews complete with
  no unwinnable playing states. Proven aggregate remains **869**.
- Reviewed the entire maintained-asset checklist. All implementation/assets are
  checked; the one unchecked acceptance/sync item is explicitly deferred, not
  an omitted code or content task. See `docs/level-design/v2-verification.md`.

Implementation task tracking is complete. Review/synchronize accepted specs
before release or archive; all changes remain uncommitted on the original branch.
