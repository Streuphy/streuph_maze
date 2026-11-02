# Design

## Context

See `proposal.md` for intent, `asset-inventory.md` for every delivery surface,
and `tile-catalogue.md` for the complete uniform definition template and ID map.
The inventory used the common parser/validator with solving disabled: seven
packs, 61 levels, 49 used IDs, and 62 registry definitions. No migrated PAR has
been computed because the proposed queue engine is not implemented yet.

The working tree includes 26 checked tasks from `v2-rule-set` and their code,
plus user-authored untracked documents and a pending World 6 archive move. Those
checks describe an earlier selected design, not completion of this one. Do not
reset the tree, apply the old remaining tasks, or treat changed code as pristine.

The user's adopted PDD controls where it differs from the earlier discussion.
The current accepted specs still describe different entry/hazard/closure
boundaries; the ten deltas explicitly replace those contracts at acceptance.

## Goals / Non-Goals

**Goals:** one executable V2 policy, one declarative YAML path, atomic queued
effects for all actors, exhaustive shipped-content/asset certification, and no
contradictory maintained rule guidance.

**Non-Goals:** a second playable engine, automatic import of incompatible
progress, inventory keys, crumble, new World 7/8 packs, an editor application,
real-time simulation, network resources, Git-history rewriting, or deletion of
unused-but-supported registry definitions.

## Decisions

### 1. Pin the clarified contract before implementation

| Topic | Chosen behavior |
|---|---|
| Rules selection | One global V2 interpretation; remove selectable compatibility and obsolete dispatch. |
| Colors | Four carrier states: White, Red, Green, Blue. Black/mute are presentation only. |
| Conveyors | Floor tiles; default White tint; color reserved/inert; cardinal arrow names the exit cell. |
| Queue opening | Direct action first. Post-direct occupancy checks seed all eligible belt passengers, not only actors that just moved. |
| Queue priority | Signal reactions, transport, ordinary effects; source y/x, then enqueue sequence. |
| Goal | Matching legal entry only, after that hop's signal reactions; cancel later work. Stationary equality is insufficient. |
| Closing surfaces | Same pending-crate / failed-dot behavior for linked barriers, polarity barriers, and phase void. Color mismatch alone is not physical closure. |
| Hazards | Sample final rays only after non-winning queue drain; exposure is terminal failure, no gameplay/undo until restart/navigation. |
| Mutations | Registered handlers may mutate declared gameplay state atomically; the core validates the batch and journals every committed difference. |
| Cleanup | Maintained assets only. Preserve historical archives/design history and Git history; mark superseded plans non-authoritative. |

`docs/GAME_RULES.md` must be reconciled as maintained guidance, not left beside
the adopted PDD with incompatible five-color/floor-tier/action assertions.
Retain its inspectable board, finite rounds, layered objects, matching goal,
world identity, and golf-score principles. Replace conflicting palette,
automatic-green-pull/red-strength, and neighbor-ACTION prose with this contract.
Explicit declared-capability pulling and current-tile ACTION follow the adopted
PDD's retained mechanics; no hidden interaction mode is added. Ice remains the
explicit registered ice mechanic, not an effect inferred from any Blue tint.

**Alternative rejected:** carrying both definitions as active options would
recreate the compatibility code and asset ambiguity the user explicitly removed.

### 2. Reconcile partial code deliberately, without rollback commands

Review every current diff before editing. Retain compatible work such as the
empty-list parser fix, shared geometry, neutral destination helpers, correct
prism events, safe proof-budget handling, and useful registry/controller tests.
Replace/remove incompatible ruleset branches, five-color gameplay, automatic
floor-derived mobility/strength, neighbor ACTION, recoverable hazard outcomes,
arbitrary force-loop endpoints, final-rest-only entries, and old-score import.

Do not delete a helper solely because its name predates this plan or because an
ID is unused by current packs. The thirteen unused registered entries still
need supported V2 metadata, unit coverage, glyphs, and inspection. Prototype
prerequisite-selector paths unused by the shipped packs are not introduced as
a new campaign feature here; retain the accepted imported-world selection
behavior and existing Prologue access policy, expressed without rule modes.
Generic world-score proof aggregation remains useful under the single policy.

Mark the previous plan visibly superseded while preserving its incomplete
checkbox history and uncommitted work. Do not falsely archive it as completed,
silently change its checked-task meaning, or modify harness skills to hide it.
Any lifecycle operation requiring separate approval remains explicit follow-up.

### 3. One event scheduler owns atomic commits

Keep classic scripts and the current ownership boundaries: registry definitions
and registered synchronous handlers in `tiles.js`; geometry/layers in
`sm-board.js`/`sm-entities.js`; transactions/scheduling/invariants in
`sm-rules.js`; shared loader/search in `levels.js`; UI/store/rendering outside
the pure rules core. A small pure scheduler module is acceptable only if needed
to keep the resolver readable; every entry page/test/tool must then load it in
the same dependency order. Do not create a parallel simulator or world loader.

Each initiating action captures a complete gameplay snapshot. Preflight all
direct participants and commit their positions together. Effects operate on
the post-direct board; a blocked direct attempt has no propagation. ACTION
captures its original occupied-tile hook and opens a round even for a no-op.

A queued record contains priority, source coordinate/identity, actor identity,
effect kind, captured trigger payload, and stable enqueue ordering. Revalidate
current destination/source legality at dequeue. Ordinary blockage discards that
effect and counts an attempt; it does not undo a previous legal effect. After
each batch, validate global invariants, rebuild current signals/closure, capture
new edges, and enqueue downstream work before lower-priority effects proceed.

Handlers may mutate declared mutable gameplay state directly. Fixed catalogue
definitions/authored configuration remain immutable; intermediate assignments
inside one invocation are not separately committed hops. Derive a complete
mutation journal around the atomic invocation so renderer events cannot omit a
direct position/color/latch change. Multiple observable hops must be separate
commits/queued effects, not undocumented intermediate writes inside a batch.

**Alternatives rejected:** sequential half-push observation violates atomicity;
only checking the final board loses per-hop signals; relying on hand-authored
display events without verifying state differences can hide handler mutations.

### 4. Separate captured transitions, derived occupancy, and goal checkpoints

Record entry/departure events for each committed actor relocation, preserving
actor identity and configured payload even when later transport moves it. A
dot-only prism effect addresses that captured dot; it does not read a new crate
occupant later. Signals are different: plates, targets, and receivers query
current positions after every batch, combine same-link sources with OR, and
queue only activity edges. Stable occupied state does not refire an activation.

After every dot hop, hold its goal-entry checkpoint until that hop's higher-
priority signal work has drained. Recompute closure after each signal effect.
Closure failure wins precedence. Then revalidate that the dot still legally
occupies the entered goal with equal carriers. A win cancels remaining queue
work and suppresses final hazard sampling. Deferred color changes after a
mismatched entry do not manufacture another entry checkpoint.

Portal arrival carries transport provenance in its captured record. The arrival
still participates in signal/ordinary trigger processing, but the portal's own
automatic handler treats a paired transported arrival as a no-op; otherwise
every useful portal pair would bounce forever under per-hop entry semantics.
No permanent portal/ice memory survives a completed round. Ray transport uses
stable source ordering and per-emitter actor/session provenance so one session's
atomic hops do not create duplicate whole-ray sessions.

### 5. Normalize requested and effective physical closure

Compute requested link locks with defaults → toggle parity → active source OR
→ master-lock precedence. Binary polarity and master-void provide their own
requested solid state. Feed all three sources into one occupancy-aware closure
query. A crate delays physical closure while occupying the cell; the request
is not lost. Departure closes immediately before later queued entry unless a
signal has reopened it. Dot occupancy of an effectively closing cell commits
terminal failure. Keep color-gate carrier filters separate from solidity.

Prefer derived effective/pending state from canonical requests plus occupancy.
If canonical requests cannot be derived from latches/positions/parameters,
declare and snapshot them explicitly. Never persist a second independent
effective-lock truth. Inspection, solver legality, rays, redraw, clone, and
restore use the same query. Stationary targets are non-blocking; ordinary dot
movement onto them must not be confused with an unsupported target push.

### 6. Implement conveyors as generic actor transport, not shoving variants

Preserve IDs 60–67 but give all of them the same floor-conveyor policy. Keep
their stable direction defaults; remove the executable `kind` split and old
front-shove behavior. Add/validate default `colour: wht` as inert supported tint
and validate `dir` as exactly one cardinal unit vector. Glyph/inspector labels
must name the exit direction without implying an entry side or passenger type.

After the direct commit, scan belts in y/x order and capture their current
eligible passengers for initial source-specific requests. The dot qualifies;
crates/targets use declared conveyor capabilities. For co-located layers use a
documented stable passenger enumeration (blocking actor first, then movable
feature) before assigning enqueue sequence. No dot/crate co-occupancy is legal.
No transport commits during initial scanning; signal priority still applies.

At dequeue, verify the same actor/source and the adjacent exit's current
legality. Commit one hop, derive signals/closure, and capture entries/departures.
A new conveyor landing queues a new source-specific request. Deduplicate only
equivalent *pending* actor/source requests, not later real arrivals. A blocked
request is not automatically retried on every board change; retry needs a
declared new trigger or the next action's initial scan. Exit occupancy never
creates an implicit push. Ice/portal continuations use their own named policy.

**Alternative rejected:** keeping dot-only and crate-only branches would
contradict the same definition for every movable object. Timers, color-selected
directions, and renderer-owned transport are also excluded.

### 7. Bound queues and distinguish abort, failure, and victory

Use `playing`, `won`, and `failed` as coherent outcome semantics (an equivalent
non-contradictory representation is acceptable). Defer committed counters and
external progress writes until resolution succeeds. Successful movement that
returns to its origin still costs its initiating stroke. Failure costs that
normal stroke only; abort restores all tentative counters/knowledge/progress.

Canonical repetition identity includes every mutable gameplay field, the
ordered pending semantic records, pending checkpoints, and transition-relevant
round context such as transport provenance. Preserve relative queue order, not
absolute ever-increasing enqueue numbers; serial numbers alone must not prevent
detecting a repeated logical queue. Count all effect attempts, including stale/
blocked ones, against `64 × width × height`. Repetition, budget exhaustion,
handler exception, or invariant failure restores the full pre-action snapshot
and yields a diagnostic, not an arbitrary stop or a terminal player loss.

After non-winning queue drain, final rays can commit `failed`. The failed board
is frozen; direct API input and UI undo both reject gameplay. Restart builds
fresh initial state; navigation remains usable. Search discards failed nodes
and cannot exploit undo or a diagnostic abort as a recovery step. Lower-level
snapshot restoration remains available for internal rollback/testing, not as a
player undo command bypass.

### 8. Inventory the state lifecycle before changing mechanics

Review construction, canonical state manifest, clone, full action snapshot,
restore, restart, stable-state search identity, queue repetition identity,
derived rebuilding, ordered events, renderer mirror, and persistence together.
Positions, colors, polarity, latches/requests, outcomes, and counters are all
covered. Derived contacts/pending closure rebuild from canonical state. Queue
and round context stay local to a transaction and must be empty at settled
boundaries. Codex/discovery never affects legality; diagnostic abort cannot
commit discovery/progress writes. Successful undo can retain non-gameplay
knowledge only if that existing observation policy remains explicit.

Use a fresh current progress storage key/contract. Never read/import prior-rule
completions or scores, and never clear their stored bytes. Keep safe in-memory
fallback and current progress export/import. No compatibility parser/migration
branch survives just to make incompatible scores appear current.

### 9. Certify all packs only after the engine contract passes

Gate content work on focused queue/closure/terminal/transport tests. Then process
each row in `asset-inventory.md`; every one of its 61 levels gets a separate
certification row. Initial probes may identify changed minima, unsolvability,
budget-limited unknown, or lessons invalidated by a new shortcut. Do not change
mechanics, accept unknown, disable hazards, or bump PARs arbitrarily to make a
pack appear migrated.

World 2 levels 4/7/8 and Prologue level 9 have explicit incompatible prose and
are first-pass redesign hotspots. Recheck all other levels too. Preserve world
IDs/level keys and the six eight-level roles; adjust boards/text minimally to
restore a meaningful lesson under the new queue. World 3 mastery must have an
actual proof, not its retained large declared score. World 4 cycles must be
intentional abort/restart lessons or redesigned, never arbitrary settled stops.

For every level prove minimum strokes with the real resolver, replay the route
to immediate V2 victory, set `golf_score`, and record counts, tie-comparison
completeness, mechanic necessity, safe starts, and early wrong-action review.
Failure/closure/hazard-bypass review is independent of solvability. Document any
deliberate educational reset exceptions. World totals use only proven minima;
declared values/personal records/partial totals stay distinct.

Keep `levels.default.js` as the Prologue authoring source used by existing tools;
update it and regenerate/semantically compare `data/levels.yaml` after fixing the
emitter's missing dependencies. Do not run the writing emitter against an
unreviewed source. Standalone world YAML uses the same parser/validator/resolver.

### 10. Publish a complete current reference and audit all assets

Publish the uniform catalogue into the maintained mechanics reference and
registry descriptors, with all 62 IDs plus the dot. Recompute pack usage after
redesign; the observed 49/13 split is an inventory baseline, not a limit on
which assets receive review. Every definition names fields, state, triggers,
queue priorities, legality, blocked/terminal/abort behavior, events, visuals,
and lifecycle. Do not treat missing hooks as guessed behavior.

Make `glyphs.html` a true local classic-script registry consumer. Its current
module imports/heuristic harvesting do not match the game architecture. Include
ID 0, actual registry variants, the dot, cardinal exit arrows, effective/pending
closure, terminal states, and tint-only variants without placeholders for gaps.
Review both entry pages, CSS, embedded victory images, inspector, codex,
tutorials, input hints, restart/undo controls, and score labels. Failure must not
display a victory image; rendering never chooses its outcome.

Fix route/emission tooling and test fixtures together with their relevant code
groups. The route command currently prints unknown results without failing;
complete certification requires a nonzero failure result for any uncertified
shipped identity. Inventory/test bootstrap paths must load every common runtime
dependency consistently, without another rules implementation.

The cleanup covers every maintained path enumerated in `asset-inventory.md`,
including contributor instructions and future editor guidance. Update active
authority links and prepare accepted-spec synchronization/updated purpose text
at approval. Do not modify historical archives/design history or the World 6
archive move. Use semantic checks as well as reference scans; parser validation
codes and incidental substrings in embedded PNG data are not evidence of an
obsolete playable rule contract. Do not exempt active gameplay paths merely
because their filenames sound historical.

## Risks / Trade-offs

- [Handler mutation flexibility increases coupling] → Complete atomic journals, strict invariants, rollback, and per-definition interaction tests; never allow executable YAML.
- [Per-hop signals/priority can invalidate many routes] → Engine gate first, then a mandatory 61-row proof/redesign ledger, no compatibility exceptions.
- [Goal entry may bypass a defining hazard] → Explicit shortest-route lesson/necessity review, especially World 2, not solver success alone.
- [Queue signatures include endlessly increasing serials] → Normalize to semantic pending order and include all transition-relevant round context.
- [Portal arrivals repeatedly re-trigger transport] → Preserve arrival provenance and test finite transport plus captured entry semantics.
- [Pending closure is stored inconsistently] → One canonical request/occupancy derivation and parity checks in rules, rays, solver, restore, and renderer.
- [Cleanup erases useful code or user work] → Inspect current diffs, retain compatible helpers, preserve untracked drafts and histories, and stage explicit reviewed paths only.
- [Large searches remain unknown] → Improve valid proof budgets/algorithm without false claims, or redesign minimally; release remains blocked for that level.
- [Visual arrows or tint imply different rules] → Paired semantic/DOM/glyph tests and actual Chromium inspection of every direction/state family.

## Migration Plan

1. Confirm the new change, pre-existing work, supersession scope, and exact current source contracts. Keep a reviewable Git checkpoint without discarding changes or auto-committing user work.
2. Land the single-policy registry/loader/state and pure scheduler boundary with tests and associated docs. Do not temporarily ship two selectable engines.
3. Implement generic queued transport, per-hop triggers/signals, occupied closure, goal checkpoints, terminal handling, rollback, and matching renderer/search/store behavior in tested dependency order.
4. Publish the full catalogue/gallery and tool fixes; migrate Prologue and Worlds 1–6 in separate reviewable batches with a complete certification row for every level.
5. Replace incompatible maintained docs/tests/help; leave history intact. Run focused suites during each group and final `npm test`, `npm run levels:routes`, complete catalogue/reference/coverage audits, and separate Chromium `file://` checks for each pack and gallery.
6. Review implementation, then synchronize accepted specs (including obsolete Purpose prose) and retire superseded active guidance through approved OpenSpec workflow. Rerun the complete maintained-asset audit after synchronization; release cannot claim exhaustive cleanup before that step.

Rollback, if needed, is a separately reviewed delivery reversal, not an in-app
compatibility selector. Preserve all stored data; do not restore runtime policy
by reinterpreting current progress or silently reviving deleted dispatch paths.
