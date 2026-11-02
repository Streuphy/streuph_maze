# Proposal

> **SUPERSEDED — do not apply.** The user selected the sole queued-engine
> contract in `../v2-global-pack-migration/`. This document and its partial
> task history are retained as non-authoritative design history, not a second
> supported ruleset or a completed feature.

## Why

`docs/GAME_RULES.md` establishes fifteen strict product guidelines, but the current engine has different action, floor, palette, and progression contracts. Introduce an explicitly selected V2 ruleset that implements those guidelines without silently changing existing packs or mistaking already implemented mechanics for missing features.

## What Changes

- Treat all fifteen numbered guidelines as V2 acceptance constraints, with rule-to-requirement/test traceability in the design. Interpret “stateless” as fully inspectable, history-independent gameplay at round boundaries, not an absence of mutable board data.
- Add pack-level ruleset selection through the existing YAML loader. Unversioned packs retain current legacy behavior; unknown rulesets are rejected atomically.
- **BREAKING within V2 only:** expose exactly four directional actions and ACTION/REST; pulling is automatic for an eligible trailing crate on green floor rather than a separate command. ACTION activates the current tile and orthogonally adjacent tiles/objects once.
- **BREAKING within V2 only:** floors control movement, not crate colors. Blue produces same-round sliding; green beneath a crate enables pulling; red immobilizes non-dot occupants, while a dot starting on red may atomically push a legal crate chain.
- Support five gameplay colors, including Black, and derive the goal's color from the world color. Black participates in color matching; its unspecified reversal effects are explicitly reserved, not invented.
- Preserve separate terrain, movable-feature, and object layers, including supported movable targets. Make floor colors authorable beneath markers and objects without allocating conflicting tile IDs.
- Add explicit prerequisites referencing earlier levels in the same world, ruleset-isolated progress, and level/world golf summaries. Retain free blocked directions, one-stroke ACTION, and free automatic substeps.
- Keep construction, clone, snapshots/restore, undo, solver transitions/identity, ordered events, rendering, and offline loading consistent. Exact PAR must be solver-proven; truncated searches report `unknown`.

## Capabilities

### New Capabilities

- `level-progression`: explicit same-world prerequisites, visible lock reasons, and consistent access checks across level-entry paths.
- `golf-scores`: minimum-stroke accounting/proofs, level best scores, and complete versus partial world aggregates.

### Modified Capabilities

- `tile-mechanics`: ruleset-scoped palette, visible round state, ACTION activation, floor semantics, matching-goal presentation, and round boundaries.
- `movable-objects`: floor-dependent V2 mobility, automatic pulling, red-floor chain pushes, and transport/layer invariants while retaining legacy interactions.
- `world-level-packs`: ruleset selection, V2 YAML authoring fields, prerequisite-aware selection, and ruleset-qualified progress identity.

## Impact

- Implementation: `src/js/tiles.js`, `sm-rules.js`, `sm-entities.js`, `levels.js`, `sm-store.js`, `sm-ui.js`, `sm-io.js`, `sm-render.js`, `sm-glyphs.js`, and the necessary local HUD/inspection markup/styles in `index.html` and `src/css/sm.css`.
- Verification: `tests/unit/registry.js`, the rules/levels/helpers groups in `tests/verify.js`, final `tests/browser-test.js`, and separate real-Chromium `file://` checks. No new dependency, executable YAML, network requirement, or asynchronous rules core.
- Documentation: retain `docs/GAME_RULES.md` as the source guideline document; update mechanics/pack/architecture guides and reconcile conflicting exploratory PDD wording during implementation.
- No editor implementation, canonical-world redesign, new crumble mechanic, key inventory, mixed colors, global conveyor clock, or Black reversal rules. Do not alter the existing World 7 or PAR-route change ownership. No runtime changes are made by this proposal.
