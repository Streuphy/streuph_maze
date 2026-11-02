# Design

## Context

See `proposal.md` for motivation and scope. `docs/GAME_RULES.md` is the strict V2 guideline source; the delta specs turn its wording and the user's clarifications into testable contracts. An unarchived proposal does not replace accepted legacy behavior before implementation and acceptance.

The current runtime already has explicit pulling, colored crates, same-round ice/conveyor chains, ACT, scalar player/world colors, movable targets, snapshots, and a shared solver. This is a semantic extension, not a missing-feature rewrite:

| Boundary | Current evidence | V2 work |
|---|---|---|
| Normalization/state | `src/js/sm-rules.js:94–349` separates terrain, crates, and target features; colors currently start White. | Carry selected ruleset, authored floor colors, and initial colors through all lifecycle paths. |
| Entity legality | `src/js/sm-entities.js:20–56` has preflight and individual relocation helpers. | Add shared source-floor veto and transaction preflight; do not implement chain pushes by repeatedly attempting ordinary pushes. |
| Round resolver | `src/js/sm-rules.js:876–961` accepts move/pull/act and settles rays/catches before the final goal. | Select five-action V2 policy, automatic pull, neighbor activation, atomic chains, and final-only V2 victory. |
| Registry | `src/js/tiles.js:115–126,313–328,395+` defines terrain, crates, named hooks, and capability schemas. | Add ruleset-aware floor/activation metadata rather than ID/name dispatch. |
| Loader/solver | `src/js/levels.js:102–200,389–450,530–670` validates packs and searches nine legacy actions. | Validate V2 fields, select five actions, retain route tie-break ownership, and correct incomplete-search reporting. |
| Progress/UI | `src/js/sm-store.js:15–18,42–48,137–178` uses schema 2 world-level keys; `sm-ui.js:82–100,328–363,448–498` controls entry, inputs, and scores. | Isolate V2 records, centralize prerequisites, render visible terrain/state and world aggregates. |

Existing conflicts are explicit: the catalogue permits four gameplay colors, ACTION only addresses the current tile, pulling has a separate input, and imported packs bypass progression. The accepted target wording also disagrees with the direct-move test at `tests/verify.js:2492–2496`; V2 follows non-blocking stationary-target semantics, without changing legacy outcomes. Prism assignment currently omits its declared color event. The solver currently skips depth-limited nodes without marking the proof incomplete. These last two defects are directly relevant to reliable V2 events and score proofs.

## Goals / Non-Goals

**Goals:**

- Keep one local classic-script architecture, shared loader, authoritative synchronous resolver, and state lifecycle.
- Make ruleset differences explicit policy inputs rather than a forked engine or scattered tile-ID branches.
- Include progression and golf totals in this change, as requested, while keeping them outside per-level puzzle transitions.
- Turn every guideline into an acceptance trace and keep each implementation group coupled with its tests and documentation.

**Non-Goals:**

- A level editor, JSON level format, new canonical world pack, cross-world prerequisites, or automatic migration of authored legacy packs.
- Persistent momentum, hidden interaction modes, crate-color mobility tiers, adhesive state, global conveyor ticking, new inventory, or arbitrary moving terrain.
- Black inversion effects: the user explicitly chose to reserve these. Black matching and visible initial color are implemented now; reversed passability, inverted controls, and special Black wins are not.
- Reworking World 7 crumble or the in-flight PAR-route balancing algorithm.

## Decisions

### 1. Scope the new interpretation with a pack-level selector

Use `ruleset: legacy | v2`; omission means `legacy`. One pack uses one ruleset, and level-local overrides are rejected. The normalized level carries the selector so UI, solver, registry validation, rules, and cache identity agree. `legacy` names the behavior of the current accepted/runtime baseline, not the exact older `ALPHA-0` Git commit.

Reject unsupported selectors and V2-only fields on legacy packs instead of silently ignoring them. Keep the existing Prologue shape and legacy imported-pack access. World 5's four-color contract remains a legacy world-specific contract; V2 does not rewrite it.

**Alternative rejected:** globally replacing defaults would invalidate shipped lessons, routes, and scores. A second loader or separate rules engine would duplicate validation and undo/search policy.

### 2. “Stateless” means no hidden history at settled boundaries

The board may change; object positions, colors, visible latches, and feature positions remain canonical mutable state. All transition-relevant values must be visible or available immediately through board inspection. Counters, codex discovery, previous inputs, and animation frames cannot influence the next outcome. Progress prerequisites govern entry only, not in-level movement.

Same-round worklists and activation sets are ephemeral resolver data, discarded before return. There is no persisted ice direction, pull mode, adhesion flag, or color-history dependency. Test pairs of equal visible configurations reached through different histories.

**Alternative rejected:** interpreting “stateless” literally as immutable gameplay would contradict pushes, switches, color changes, and movable tiles.

### 3. Author supporting-floor color without allocating new IDs

Keep integer grids and coordinate notation. Add V2 level fields:

| Field | Meaning/default |
|---|---|
| `floor_colours` | Mapping from `A1`-style coordinates to `wht`, `blu`, `red`, `gre`, or `blk`; ordinary supporting floor defaults White. |
| `initial_player_colour` | Dot color, default `wht`. |
| `initial_world_colour` | World color, default `wht`. |
| `requires` | Distinct earlier `level_n` keys in this world; omitted/empty means no gate. |

Allow floor colors on ID 0 and ordinary support normalized beneath start, goal, crate, and target markers. ID 5 retains intrinsic Blue and rejects contradictory recoloring. Other terrain combinations are explicitly unsupported in this change; reject them rather than layering colors onto gates, portals, conveyors, switches, void, or prisms with unspecified precedence. Supporting floor color is separate from entity color and goal-marker color. This is enough to author crates on green/red and the dot on red without composite IDs or arbitrary per-cell executable behavior.

Example schema fixture (not a canonical level or a claimed PAR route):

```yaml
name: "V2 schema example"
world_id: v2-schema-example
ruleset: v2
num_level: 1
levels:
  level_1:
    name: "Layered start"
    goal: "Inspect the red start and green crate support."
    width: 4
    height: 2
    initial_player_colour: wht
    initial_world_colour: wht
    requires: []
    floor_colours:
      A1: red
      B1: gre
    grid:
      - [0, 0, 0, 2]
      - [1, 70, 0, 0]
```

Entity colors default White. Existing color parameters can use Black under V2 only. Goal color is derived from `W`, never independently stored or authored. Keep existing dial cycles; do not invent a five-color cycle order. Initial colors and supported fixed-color parameters make Black representable. Black floors have no special movement effect while inversion is reserved.

No new IDs are allocated. Preserve retired IDs and the active World 7 provisional ID 101; do not adopt its stale reference to a World 6 range as evidence of availability. YAML remains declarative. The existing export path preserves raw authoring, not normalized/transient runtime positions.

**Alternative rejected:** a general layered placement schema and arbitrary instance properties would expand scope unnecessarily. Bare recoloring of the whole board by `W` would silently change floor rules and obscure supporting terrain.

### 4. Derive mobility from floors and preflight whole transactions

Introduce registered floor-policy metadata and a shared effective-mobility/source-legality query. Apply it to direct movement and every forced relocation path, including ray transport. Crate colors do not affect these permissions; receiver/gate matching still reads color.

- White/Black and Blue support permit ordinary crate pushes. Green support additionally enables automatic trailing pulls. Red support vetoes all non-dot departures, including supported movable features.
- Reject V2 crate `pushable`/`pullable` authoring overrides: there must not be a second hidden priority system competing with the selected floor contract. Keep other transport capabilities and supported target profiles.
- If a direction faces an object, attempt only its forward push; no simultaneous rear pull. If it faces legal empty terrain, pull an eligible rear crate on green, or a supported pullable target, as part of that step. With no eligible rear object, walk normally. If a rear object is eligible but its destination is illegal, block the whole transaction.
- A dot starting on red can push a contiguous crate chain. Preflight each source-floor permission and each post-transaction destination, including individual gates and occupancy, before mutation. Intermediate crate cells are legal only because their occupants participate in the same transaction. Commit farthest-first events after approval; failure moves nothing.
- Do not let targets join a crate chain, or let automatic belt hops inherit the dot's red-floor strength. A one-object target push retains its declared capability rules.
- An object arriving on red stops; it is not permanently glued. Vacating/moving a target leaves its source terrain and color in place. V2 dot entry onto a stationary non-blocking target walks over it; target activity remains crate-only.

After a multi-object transaction, settle moved objects farthest-first along the push direction (the same stable order as commit events), then the dot. Single-pull object force precedes dot force. Apply red source veto on every substep. This extends the current object-before-dot behavior deterministically, rather than depending on rendering or array iteration accidents.

**Alternatives rejected:** sequential push attempts risk partial commits; color tiers contradict the clarified floor rule; a separate pull key or mode violates the five-action and visible-state constraints.

### 5. Keep one finite synchronous round with an identity-based activation set

V2 round order:

1. Validate one of the five actions and capture the start configuration needed for preflight/activation.
2. Commit one direct directional transaction, or capture and dispatch ACTION participants in current/N/S/E/W order. For adjacent cells, order terrain, feature, then blocking object. The current position activates its tile, not the dot itself. Deduplicate by stable layer/identity; snapshot the original participant set, not successive neighborhoods.
3. Settle resulting relocation/force chains in deterministic commit order, preserving existing conveyor/portal boundaries. Resolve final resting dot entry once; ACTION must not create duplicate entry effects merely because a tile is also in the activation set.
4. Derive links/locks; transport ray-compatible objects in existing stable emitter order subject to source-floor veto; rebuild locks and evaluate exposure.
5. Apply catch/respawn and re-derive player-dependent links. Charge at most the initiating stroke; update non-gameplay discovery.
6. Evaluate victory once against the final legal dot position and final `P === W`, with goal display derived from that `W`.

ACTION invokes each participant's registered `onAct`, not `onEnter`. Targets without an ACTION hook do nothing; occupancy-driven momentary state is still derived, not toggled blindly. Remote activation receives distinct actor and participant coordinates. A spatial hook must satisfy its declared occupancy preconditions: activating an empty adjacent portal must not teleport the dot from a different cell. Ordinary adjacent prisms/dials can use their existing non-spatial color effect. Deferred force processing does not recapture participants after teleports.

Retain movement-triggered belts rather than adding an unrequested global environmental tick. A blue support adds the same incoming-direction force as existing ice. Bound force/worklist traversal by directed-state repetition and board-sized safety limits, emitting a diagnostic and ending the chain without a next-round obligation. Every committed state change emits an ordered event; fix the missing prism event through the shared color operation.

Blocked directions retain the existing free-stroke policy and attempt counter, but cause no environmental board change. Counters do not affect gameplay identity. A direction with committed direct movement costs one even if later automatic motion returns to its origin. ACTION always costs one. Rendering plays the completed result and cannot choose outcomes or delay rule evaluation.

**Alternative rejected:** live neighborhood rescanning can double-toggle or flood activation; retained momentum contradicts Rule 13 and full-information boundaries; intermediate goal checks could award a win before a catch or later color change.

### 6. Extend the complete lifecycle and expose every gameplay fact

Review `STATE_CONTRACT`, construction, clone, snapshots, restore, derived lock rebuilding, solver identity, renderer mirrors, and reset as one boundary. Floor colors are immutable authored terrain in this scope; do not add redundant mutable copies. Existing target positions/latches, object identity/positions, `P`, `W`, and polarity retain their lifecycle. Ruleset and fixed-level data separate solver/caches where states from different levels/rulesets could collide.

No new permanent momentum/adhesion fields are needed. If implementation discovers a necessary mutable gameplay field, it must be visible, copied/restored, event-described, and included in canonical identity where transition-relevant before use. Never add behavior only to rendering.

Render support color beneath occupants, dot color, world color, goal color, movable feature links, active locks/latches, and movement restrictions with accessible labels and sufficient contrast, including Black. Inspection must not depend on codex discovery. Full redraw and event playback must agree after multi-object rounds, ACTION, catch, and undo.

### 7. Keep progression outside board resolution and isolate persistence

Validate `requires` as an AND-list of distinct earlier keys. This guarantees an acyclic same-world graph without cross-pack discovery. A pure access helper derives unmet requirements from same-world/ruleset completion. Use it in level selection, Next/jump, direct player-facing load, restored selection, and pack activation. Do not use the legacy “next level unlocked” flag as V2 authority; branch unlocks derive from completed requirements. Solver/authoring analysis is intentionally not campaign-gated.

Extend progress storage to a new schema preserving existing legacy world-qualified keys. Use explicit ruleset qualification for V2 level records and last selection (for example, `v2::world-id::level_1` and `v2::world-id`), leaving legacy keys intact. Migrate schemas 1/2 without reclassifying their completions; import/export preserves both namespaces. Validate the extended key shape. Keep `file://` in-memory fallback and durable progress export/import. Never clear unrelated user progress as migration.

**Alternative rejected:** automatic sequential locks contradict optional prerequisites; cross-world references require catalog/dependency policy not requested here; sharing progress can fabricate V2 completion and scores.

### 8. Separate PAR proofs, authored scores, and player records

Use five solver successors for V2 and retain nine legacy successors. Invoke the same resolver and skip unchanged free blocked attempts. Reconstruct/replay winning routes using the selected ruleset; preserve the existing directional-balance algorithm as a secondary comparison among minimum-stroke routes.

Correct depth-cutoff accounting and track transition failures as incomplete proof rather than silently claiming impossibility. First proven minimum and tied-route comparison completeness are separate results. A route-label limit must never result in an exhaustive-unsolvable claim. Add fixtures with a solution beyond `maxDepth` and replay every claimed V2 optimum.

Compute world PAR as the sum of all proven level minima; prerequisites add no puzzle strokes. Compute personal world best as the sum of per-level bests only after all levels are cleared, otherwise report partial progress with a count. Derive aggregates rather than persisting a second authoritative total. An authored `golf_score` remains a declared value unless proven; when solving is disabled or unknown, do not promote its sum to an exact world minimum. Persist player bests under ruleset-qualified keys, not solver analysis.

### 9. Trace every strict guideline to requirements and verification

These are acceptance obligations, not optional design suggestions. Test names below describe coverage to add within the existing harness, not currently implemented tests.

| `GAME_RULES.md` rule | Contract owner / interpretation | Required coverage |
|---|---|---|
| 1 | `tile-mechanics`: fully inspectable settled state; no hidden history | Equal exposed boards/different histories produce equal transitions; inspection reveals covered support and latches. |
| 2 | `tile-mechanics`: the dot initiates a multi-step round | One dot action produces ordered substeps without interleaved input. |
| 3 | `tile-mechanics`, `world-level-packs`: five colors | Palette validation by ruleset; Black initial state/matching; no invented reversal. |
| 4 | `movable-objects`: colored objects with floor-dependent state | All crate colors share floor mobility; colors remain visible; unspecified color is White. |
| 5 | `tile-mechanics`: legal final dot/goal color equality | Matching, mismatching, intermediate-goal, and catch-before-win cases. |
| 6 | `tile-mechanics`: goal color always equals world | ACTION/world-color change updates goal and final validation consistently. |
| 7 | `movable-objects`: supported movable tile features | Target movement retains identity/link and reveals unchanged source terrain; unsupported terrain cannot move. |
| 8 | `movable-objects`, `world-level-packs`: layers and empty support | Colored floor beneath crate/start/goal/target, vacated-cell preservation, target+crate occupancy. |
| 9 | `level-progression`: explicit previous-level requirements | Missing/self/forward references rejected; all entry paths enforce AND requirements; unrequired levels selectable. |
| 10 | `golf-scores`: level/world minima and personal records | Stroke accounting, route replay, depth-limit unknown, exact/partial world totals, persistence isolation. |
| 11 | `tile-mechanics`: five actions and current+adjacent ACTION | No extra pull input; current/N/S/E/W tile/feature/object activation exactly once, no diagonals/flood. |
| 12 | `tile-mechanics`: all substeps finish the round | Bounded chains, synchronous result, no pending next-round obligation, undo/playback parity. |
| 13 | `tile-mechanics`: Blue same-round directional sliding | Chained blue cells, non-blue landing, blocked endpoint, object sliding, no memory. |
| 14 | `movable-objects`: Green under the crate permits automatic pull | Four directions, legal/blocked destinations, dot-green-only negative case, source/destination floor change. |
| 15 | `movable-objects`: Red immobilizes non-dot occupants and empowers dot chain pushes | Source veto across transports, legal dot departure, atomic chains, blocked member/end, no belt strength inheritance. |

### 10. Keep changes reviewable in Git

At apply time inspect `git status --short --branch` and the selected change status before editing. Preserve the user's pending World 6 archive and untracked design documents, including `docs/GAME_RULES.md` and `docs/Nouveau document`; do not auto-stage them. Source guidelines must be included in the final reviewed delivery, but ownership/staging is explicit.

Use a dedicated branch such as `milestone/v2-rule-set` once branch changes are authorized. Keep proposal and implementation commits separate; group implementation commits by the tested task boundaries below. Before any authorized commit inspect explicit staged paths and run `git diff --cached --check`; never use broad staging to absorb unrelated work. Do not move `ALPHA-0`, create a release tag for a proposal, or push without authorization. A milestone note can identify V2 as planned until the acceptance gate passes.

## Risks / Trade-offs

- [Floor-derived mobility differs from earlier Alpha-1 discussion] → The user's latest floor-control choice is recorded explicitly; remove color-tier assumptions from updated authoring/PDD text during implementation.
- [Black is visible but reversal is unspecified] → Explain the reserved status in validation/help; do not advertise an implemented inversion mechanic.
- [ACTION can activate several overlapping participants] → Capture by identity once, preserve actor/target context, test activation after relocation and exactly-once event counts.
- [Chain mutation or forced movement can desynchronize layers] → Preflight complete transactions, use shared source legality, emit deterministic events, and test clone/undo/solver/render parity together.
- [New policy leaks into legacy packs] → Pair legacy/V2 fixtures, keep all existing world routes/PAR expectations, and test ruleset-specific validation and action sets.
- [Search limits masquerade as exact world scores] → Separate proof status, declared values, comparison completeness, and player totals at API and UI boundaries.
- [Persistence migration loses or mixes records] → Schema migration fixtures, old-export import tests, namespace collision tests, and no destructive reset.
- [Single change spans several modules] → Implement dependency-ordered, tested groups; keep mechanic docs with each group and reserve the last group for integration only.

## Migration Plan

1. Validate this change and inspect live/user changes. Land shared ruleset/schema boundaries with paired legacy/V2 validation tests and docs.
2. Implement lifecycle/mobility and ACTION/round semantics with their focused regression groups; retain legacy behavior and world content.
3. Add five-action solver proofs, ruleset-qualified persistence, prerequisites, world summaries, and associated UI/inspection changes incrementally with tests/docs.
4. Use small inline/fixture V2 packs in the existing tests; do not create a new canonical eight-level world or edit shipped pack scores to conceal regressions.
5. Run focused suites during iteration, then `npm test`, followed by the separately recorded actual Chromium `file://` workflow: import V2 YAML, play representative green pull/red chain/blue slide/ACTION/undo paths, exercise progression and score display, export/reload, return to the Prologue, and verify no network dependencies.
6. Review and accept before synchronizing/archiving the deltas. Do not describe V2 as released or implemented from planning completion alone.

Rollback before release disables V2 activation through an explicit validation diagnostic while retaining legacy operation and saved V2 records for later recovery. Do not reinterpret V2 packs as legacy or downgrade/delete persisted records. Any released rollback is a separately reviewed change.
