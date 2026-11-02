# Product Design Document (PDD) — Tile Mechanics Architecture

**Status:** Implemented queued V2 design. Its ten existing capability deltas are now synchronized into accepted specifications by `doc-review-v2-ruleset`. Whole-tree audit readiness and release approval remain separate; see the [archived review](../openspec/changes/archive/2026-11-02-doc-review-v2-ruleset/review.md).

**Target:** State/event contracts, resolver ownership and registered mechanic behavior.

**Scope:** One queued interpretation of all existing mechanics. Consumable inventory keys and crumbling paths are explicitly out of scope.

> **Authority:** [Accepted specifications](../openspec/specs/) define the normative V2 baseline, especially [event-resolution](../openspec/specs/event-resolution/spec.md). This PDD explains its abstract model; [Engine Architecture](engine-architecture.md) maps it to current code. The migration deltas are provenance, not an alternate engine. The maintained [tile reference](level-design/tile-mechanics.md) indexes all 62 IDs plus the dot. Proof, browser evidence, contract synchronization and release approval are distinct facts; consult the [verification record](level-design/v2-verification.md).

---

## 1. V2 decisions and compatibility

V2 is global, with no selectable compatibility implementation. All packs use the same declarative loader/validator/resolver; unsupported selectors/fields are rejected atomically. Changes to solutions/PARs require full re-proof, replay, and lesson review before release.

Current behavior is defined by the accepted state/event contracts and indexed by the maintained uniform tile/object reference; no unspecified fallback interpretation survives.

The current progress store uses fresh key `streuphs-maze/progress/v2`, contract `v2-queued`, schema 1. It neither reads nor imports earlier completion/best scores and does not delete their serialized bytes. Current records remain world-qualified; rejected imports preserve current data. Denied/full storage falls back to session memory; progress JSON export/import supplies durable user-controlled backup.

The initial V2 release changes resolver ownership, propagation order, per-hop effect timing, gate closure behavior, and hazard failure. It does **not** add inventory keys or crumble terrain. Those need separate behavior contracts and changes.

### Deliberate trade-offs

- Registered tile handlers may directly mutate declared mutable gameplay fields in one atomic batch. Fixed definitions are immutable and state roots are tracked/sealed; an untracked field is not new behavior. This flexibility increases coupling, so every handler must be deterministic, synchronous, invariant-validated, and interaction-tested.
- The core owns action transactions, scheduling, invariant validation, rollback, counters, terminal-state handling, and presentation-independent outcomes. The core does not choose a mechanic's desired state transition.
- Rendering only plays returned outcomes; it never runs rules, schedules effects, or changes the resolved state.

## 2. State and tile model

Tile definitions provide authored configuration; movable entities occupy a separate runtime layer over terrain. A crate is a blocking entity, not terrain that becomes passable when pushed. A crate may share a feature cell only where that feature permits it. Presentation state is never authoritative gameplay state.

Avoid one universal `state` enum. Each mechanic declares its configuration, mutable state, and derived state. In particular:

| Concern | V2 ownership |
|---|---|
| Tile identity, color/link, emitter direction, trigger metadata | Authored tile/entity configuration |
| Player/crate/feature positions, player/world colors, polarity, switch latches, feature profiles, terminal outcome/reason, counters | Mutable gameplay state |
| Receiver/target/plate activity, requested locks, effective passability, pending closure | Derived from canonical configuration/latches/positions |
| Glyphs, animation, inspection prose | Presentation only |

Gameplay colors remain exactly `wht`, `red`, `gre`, and `blu`. `blk`/`mute` are presentation colors. Binary polarity is a separate level-wide state, `red-open` or `blue-open`; it is not a color, carrier, or inventory token.

### 2.1 Abstract state vocabulary

The notation below describes existing behavior, not new data fields or a public
API. There is no universal tile `on/off` enum: each definition declares its own
configuration, state dependencies and supported transitions.

| Symbol | Meaning | Lifetime / authority |
|---|---|---|
| `D` | Normalized terrain, immutable definitions, authored parameters, actor identities, initial conditions and initial profiles | Fixed level configuration; moving an actor never moves its supporting terrain |
| `S` | Canonical positions, P/W, polarity, latches, mutable feature profiles, counters, terminal outcome/reason | Authoritative gameplay state, cloned and restored coherently |
| `R(D,S)` | Current activity/contacts, requested locks, effective solidity and pending closure | Derived queries/cache rebuilt from canonical inputs; no independent pending-lock truth |
| `C` | Pending typed effects, trigger payloads, source/actor identity, transport provenance, signal-edge state, attempt count | Transaction-local scheduling context; discarded at settlement, victory, failure or rollback |
| `E` | Ordered committed movement/color/signal/outcome records and authoritative state frames | Output journal for passive consumers; never an input from animation |
| `O` | Discovery/seen observations | Auxiliary observation state; restored on diagnostic abort, not a cause of movement |

A settled command is described by `T(D,S,a) → (S',E,result)`, using `C` only
during evaluation. A derived cache is not an extra mutable source of truth.
Counters and observations participate in restoration even when excluded from
the solver's transition-equivalence key.

| Result | Canonical state and events | Accounting / subsequent play |
|---|---|---|
| Blocked direct command | No relocation or environment work; blocked feedback | Attempts +1, strokes +0; still playing |
| Completed nonterminal command | Complete action and propagation journal | Attempts +1, strokes +1; whole-round undo available |
| Won | Legal matching entry checkpoint after signal/closure consequences; cancel later work | Normal initiating accounting, completion may be published |
| Failed | Effective closure beneath dot or final non-winning exposure; freeze the settled board | Normal initiating accounting; no gameplay/undo or completion, restart/navigation available |
| Diagnostic abort | Restore the pre-action canonical/observation snapshot; discard tentative journal, return diagnostic only | No counters/progress committed; not a persistent fourth gameplay outcome |

The three persistent outcomes are `playing`, `won` and `failed`. Malformed
commands are API validation errors, not player actions; a terminal input is
blocked. A defensive restored state already closed beneath the dot is validated
before beginning another transaction; it cannot gain a free escape or invent an
initiating movement stroke. Ordinary reachable failure retains its initiating
stroke. These are state validation boundaries, not extra game rules.

### 2.2 Low-coupling behavior boundary

**The shared contract is states and events.** The core is responsible for *when
and whether a mutation can commit*, not for selecting mechanic behavior by tile
ID, name, family, tint or world. A registered definition supplies the local
query/transition policy through named strategies and explicit context. Empty
hooks are neutral, not an invitation for the engine to infer an effect.

| Producer / owner | Supplies | Must not assume |
|---|---|---|
| Definition/strategy | Supported defaults and profiles, local passability/activation/transport/ray queries, declared entry/ACTION/exit/edge behavior and state/event metadata | A particular renderer, animation completion, world-specific loader or executable YAML |
| Transaction engine | Current-state legality, atomic batches, scheduling/checkpoints, invariants, derivation boundaries, counters, terminal enforcement and rollback | Meaning inferred from an ID range, visual family or ordinary tint |
| Journal / snapshot layer | Complete validated state changes, stable actor/commit identity and ordered output | A readable animation hint is the full authoritative mutation |
| View/controller | Inputs, passive playback/inspection and user lifecycle operations | Permission to schedule rule work or choose win/failure |

A queued request is **intent**, not proof a transition happened. Dequeue
revalidates current source identity, destination and capability. A captured
entry/departure is evidence of a past committed transition: its declared reaction
addresses that actor, not whoever later occupies the source. An occupancy signal
instead queries the current board. A committed output event describes an actual
validated mutation. These three record types must not be conflated.

Handlers may mutate declared mutable gameplay fields in a synchronous batch;
the engine validates and journals the whole batch rather than trusting optional
animation hints. This is not a sandbox or an event-sourcing-only implementation:
manifests document reads/writes/events, invariants enforce global boundaries, and
mechanic tests establish local semantic correctness. Counters, observation,
immutable definitions and checkpoint-only victory retain core-owned constraints.
The supported actor layers/actions and shared terminal policy remain explicit
engine concepts; this document does not claim arbitrary plug-ins are supported.

Golden Rules constrain the same boundary: inspectable state and minimal visuals,
synchronous deterministic outcomes, safe focused early lessons, and route/lesson
agreement. Reducing coupling means using these declared state/query/event
interfaces, not deleting the common legality or safety guarantees.

## 3. Action transaction and propagation

Each player command is one initiating action transaction. It is synchronous and deterministic; timers, render completion, network access, and browser globals cannot affect the result.

### 3.1 Start and direct action

1. Capture a complete pre-action snapshot of mutable gameplay state. External progress writes are deferred until resolution finishes.
2. Validate and commit the direct action. A push is **one atomic effect**: the crate moves to a legal destination and the player enters the vacated cell together. No handler or signal evaluation can observe a half-push.
3. A blocked direct action commits no movement and queues no environmental effects or ray check. It increments the attempt/turn counter but costs no stroke. A committed movement/push/pull costs one stroke; ACT costs one stroke. Automatic work costs no additional stroke.
4. If valid, seed captured transition/signal work and post-direct conveyor occupancy checks for all eligible passengers, including stationary ones. ACTION invokes only its original current tile, even on no-op floor; it is not a neighbor activation wave.

### 3.2 Effect queue and rounds

One propagation round is the full queue-drain for a single initiating action. Continue until there is no pending work, immediate goal victory, terminal failure, or an abort condition.

Every individual queued effect is revalidated against the current board when dequeued. It either commits atomically or has no effect. A collision does not roll back the whole action: the first legal commit wins, and later conflicting work is revalidated and may be discarded as blocked.

After each committed movement/effect hop:

1. Recompute derived signals and effective gate state from the new positions/state.
2. Enqueue activation/release reactions only for signal edges (inactive→active or active→inactive). Continuous occupancy does not repeatedly retrigger an edge reaction.
3. Select pending work by priority: **signal reactions**, then **transport/forced movement**, then **ordinary entry/departure/other tile effects**.
4. Within a priority, order by source coordinate (runtime `y` ascending, then `x` ascending), then monotonically increasing enqueue sequence. Effects created by a commit re-enter the same priority ordering before lower-priority pending work.

An entry/departure trigger is an immutable event record captured when the transition commits. It runs exactly once even if that actor later moves before the queued reaction is processed. Occupancy signals are different: they are always derived from current positions and never replayed from stale entry records.

The “signals → transport → ordinary effects” ordering is a priority, not a promise to run each category only once. A transport hop can produce a new signal edge; that signal reaction runs before remaining transport or ordinary effects.

The dot-entry **goal checkpoint** is an interrupt between signal and transport
priority, not an ordinary goal-tile rest effect. Signal reactions can create
further signal work, which also precedes it. Effective closure is enforced after
each atomic batch, before a later checkpoint or queued effect. Terminal outcome
cancels pending reactions; captured triggers are not obligations beyond that
transaction's termination.

### 3.3 Handler commits and invariants

Tile handlers may directly mutate declared mutable gameplay fields subject to core-owned constraints (§2.2). One handler invocation is atomic: its complete mutation batch becomes visible together, then the core validates global invariants and recomputes derived signals/locks. A failed invariant rolls back the entire initiating action and emits a deterministic diagnostic; partial handler state is never retained.

Core validation SHALL cover at least board bounds, valid entity positions and occupancy, supported color/polarity values, valid gate/source references, coherent terminal/counter state, and well-formed queued effects. Handlers and their tests remain responsible for mechanic-specific legality and intended behavior; core validation is not proof that an arbitrary mutation is semantically correct.

### 3.4 Cycles and safety budget

The resolver records a signature of the complete mutable gameplay state **and the ordered pending queue**, including effect types, priorities, source identities, and trigger payloads. Repeating the same signature aborts the action. A deterministic effect-attempt budget of `64 × board cell count` per action also bounds queue growth; attempts that are discarded as blocked count against the budget.

On repeated signature, exhausted budget, or failed invariant validation, restore the full pre-action gameplay snapshot, discard pending work, do not commit counters or progress, and return a non-gameplay diagnostic. This is not a player loss and is distinct from hazard failure.

### 3.5 Universal conveyor/transport definition

IDs 60–67 are passable floor conveyors with White default tint, supported four-color tint mechanically inert, and one exact cardinal exit vector. The arrow names the **EXIT destination**, not the side of entry. No dot-only/crate-only passenger-kind split exists. The same eligible actor/source/destination checks govern every passenger; stationary occupancy is scanned after the direct commit, including rest.

One legal hop commits atomically, derives signals/closure, captures entries/departures, and queues any new continuation. Blocked exits never shove a front crate. Deduplicate equivalent pending source requests, not real later arrivals. Ice uses a round-local incoming vector; portal arrival provenance prevents bounce-back without suppressing signals/ordinary effects. Configured ray-object movement uses stable emitter/session provenance. No transport outcome depends on rendering or carries hidden work into the next command.

## 4. Derived links and gate behavior

The established linked-lock combination is:

1. Start from the gate's configured default.
2. Matching latched tagged toggles invert by parity.
3. Any active matching momentary source (player plate, crate target, or crate receiver) opens the link — same-link signals combine with OR.
4. A latched global master lock overrides and closes lock-controlled gates.

Color gates independently require the configured carrier (`P` or `W`) to match in addition to the link being open. Binary polarity barriers instead use the level-wide binary polarity and do not use color carriers or link signals.

### 4.1 Crate targets and receivers are distinct

- **Player momentary plate:** active while the player occupies its cell.
- **Sokoban target:** active only while a crate occupies its cell. Player occupancy and adjacency do not count.
- **Crate receiver:** active when one or more matching-color crates touch one of its north/east/south/west neighbor cells. Diagonal and same-cell crates do not count; all matching cardinal indicators may be shown. Activity is derived and updates after each committed hop.

### 4.2 Pending gate closure

Keep **requested lock state** separate from **effective passability**. If the derived lock requests closure while a crate occupies the gate cell, retain the crate and keep the gate effectively open with a derived `pending-close` condition. The crate may leave normally. Immediately after it leaves, close the gate before any later queued movement can enter it. If signals reopen the link first, cancel the pending closure.

This common occupancy-aware closure policy applies equally to linked gates, binary polarity barriers, and phase void. Color mismatch alone is a carrier entry filter, not physical closure or pending-close state.

Crates never prevent a new close request from being recorded; they only delay effective closure. If the player occupies a gate when it becomes effectively closed, terminal failure occurs immediately after signal/gate recomputation and before goal evaluation or another queued effect. The player is not ejected. Since a crate blocks shared occupancy, a player cannot simultaneously enter a gate occupied by a crate.

## 5. Entry, goal, and hazard outcomes

### 5.1 Every entered cell has an entry trigger

Every committed actor entry/departure—including intermediate conveyor, portal, or other forced-movement cells—captures its supported trigger by actor identity and payload. A dot-only effect cannot retarget a later occupant; its queued reaction survives the dot leaving. Targets/plates/receivers instead derive current occupancy. Missing hooks are neutral. Blocked transitions and stationary ACTION do not fabricate entry events; final-rest-only triggering is not supported.

### 5.2 Immediate goal victory

After each committed player hop, recompute signals and gates, then drain the signal-priority reactions generated by that hop, recomputing after each such effect. If this makes a gate effectively close beneath the player, fail immediately. Once no signal-priority work from that hop remains, if the player entered the goal with `P === W`, set victory immediately, discard all remaining transport and ordinary effects, and do not run later ray checks for that action. A mismatched color does not win; normal propagation continues.

### 5.3 Rays and terminal failure

Each emitter has one configured cardinal direction, not four simultaneous axes. Walls, closed gates, and ray-blocking objects stop its ray; open gates and transparent features do not. Any configured object ray-transport work is queued as transport and settles under the common legality rules.

Do not test player exposure between individual forced-movement hops. After the action's queue fully drains, trace rays on the settled board. If the final player position is exposed and victory has not already occurred, set a terminal `failed` outcome. This is a permanent failure state for that level attempt:

- Freeze the board and preserve its failure-state positions, signals, latches, colors, and counters.
- Block gameplay input and undo; restart is the recovery operation. UI navigation may leave or load another level.
- The successful initiating move/ACT still costs its normal one stroke; hazard failure adds no extra stroke. Do not award level completion or a best PAR record.
- Do not respawn, reset the board, or convert the result into a recoverable catch.

If the player enters a matching goal before end-of-round ray testing, immediate victory takes precedence and the hazard is not evaluated for that action. If gate-closure failure occurs on that same hop, gate-closure failure takes precedence over victory.

## 6. V2 tile behavior summary

| Mechanic | V2 behavior |
|---|---|
| Floor / wall | Floor is traversable terrain. Wall is an impassable destination for player, crates, and transport. |
| Dot | Separate object definition, White P default, explicit movement/push/pull/ACTION, declared transport and exposure behavior. Start is only its authored origin marker. |
| Crate | Separate colored entity; pushes are atomic. Preserve each crate's declared movement/transport capabilities. |
| Player plate | Derived momentary signal from player occupancy. |
| Sokoban target | Derived momentary signal from crate occupancy only; never conflate with a receiver. |
| Crate receiver | Derived matching-color cardinal adjacency; signal edges enqueue reactions. |
| Linked gate | Derive requested lock from the precedence in §4; apply pending closure rules in §4.2. |
| Binary polarity barrier | Passability follows the complementary level-wide `red-open` / `blue-open` state. |
| Chromatic prism/gate | Use only `wht`, `red`, `gre`, `blu`; prisms set `P`, color gates test `P` or `W`, and the goal retains `P === W`. |
| Line-of-sight emitter | One static cardinal direction; transport settles in the queue; terminal exposure is sampled after settlement. |
| Conveyor / ice / portal | One current queued transport model, inert conveyor tint, round-local ice vector, portal arrival provenance; full uniform definitions in the maintained reference. |

### Explicitly excluded

- **Consumable inventory keys:** not part of V2. Color routing is not an inventory or key-consumption system.
- **Crumbling paths:** not part of V2. The contradictory `intact → cracked → crumbled` text is not a runtime rule. A future proposal must decide player-only departure behavior, state lifecycle, and whether collapse is immediate before implementation.
- **New gameplay colors:** yellow, `chromatic`, and color mixing are not defined by this PDD.

## 7. Action-to-effect mapping

| Action / event | V2 outcome |
|---|---|
| Blocked directional intent | No movement, no propagation, no stroke; counts as an attempt/turn. |
| Successful move, push, or pull | One atomic direct commit and one stroke; enqueue its transitions. |
| Current-tile ACTION / rest | One stroke, only the current tile's action hook, plus post-direct occupant scans even without a hook. |
| Push | Validate destination, then move crate and player as one indivisible effect. |
| Committed hop | Recompute signals/gates; enqueue signal edges; process signals, transport, then ordinary effects by the deterministic queue. |
| Crate enters target cell | Target's derived occupancy signal updates after the hop. |
| Matching crate becomes cardinally adjacent to receiver | Receiver signal updates after the hop; an activation edge schedules one reaction. |
| Crate leaves a gate with pending closure | Close before any later queued movement can enter. |
| Gate closes under player | Immediate terminal failure before goal test; stop and discard pending work. |
| Matching goal entry | Immediate win after gate-closure validation; cancel pending work and skip ray test. |
| End of settled queue | Trace rays; exposed non-winning player enters terminal failure. |
| Cycle, effect-budget exhaustion, or invalid handler mutation | Roll back the whole initiating action and return a diagnostic; do not record gameplay progress. |

## 8. State lifecycle and acceptance criteria

The exhaustive state contract in the selected implementation SHALL be tested across construction, direct commits, queued effects, derived rebuild, clone, snapshot/restore, restart, solver identity, playback, and progress. The verification record, not this design text alone, establishes which checks have run. In particular:

- Requested/effective/pending gate state must have one authoritative representation or be fully derivable.
- The cycle signature must distinguish different ordered queues even when board positions match.
- Undo cannot recover from terminal failure; restart must clear terminal state, pending effects, and all V2 per-run derived/mutable state.
- A cycle/invariant rollback restores counters, latches, colors, entities, gates, and progress side effects exactly.
- A terminal hazard failure is represented in the solver as a non-winning terminal state; the solver may not route through it as though it were a respawn.
- Same state plus same action yields the same ordered effect sequence and result, independent of rendering speed.
- Tests cover competing destination requests, stale captured entry effects, multiple receivers, repeated edge transitions, pending closure cancellation/completion, player gate-closure failure, goal-versus-hazard priority, and cycle rollback.

## 9. Global migration and release gates

The sole queued implementation is not release-ready merely because packs parse. Before release:

1. Keep implementation and accepted specs coherent, including Purpose and unchanged surrounding prose. The existing ten V2 deltas were explicitly synchronized during the documentation review; do not infer release approval from that or archive unfinished work.
2. Cover all seven shipped packs: Prologue 13 plus six eight-level worlds, 61 levels. Recompute every PAR, replay each minimum, record budgets/counts/tie comparison and fresh fingerprints; missing/unknown/unsolvable rows block completion.
3. Manually review changed routes, especially World 1 occupancy targets, World 2 rays, World 3 polarity, World 5 color gates, World 6 receivers, and all gate-closure cases.
4. Use current-only progress without importing incompatible scores; preserve prior bytes and historical archives unchanged, not another executable rules implementation.
5. Run existing focused suites, full `npm test`, route/asset audits, and separate real Chromium `file://` checks for relevant runtime/presentation/pack changes. The jsdom suite is not Chromium. Prose-only review preserves existing fingerprint-bound evidence rather than claiming a fresh native run; record unresolved audit and approval dependencies explicitly.
