# Proposal

## Why

The adopted `docs/Product_Design_Document.md` and the clarified conveyor contract require one queued V2 engine, while shipped assets and the unfinished `v2-rule-set` implementation still encode incompatible outcomes. Migrate the complete playable product together: all seven packs, all 61 levels, every registered tile/object definition, tooling, presentation, tests, and maintained documentation.

## What Changes

- **BREAKING:** V2 becomes the sole engine interpretation. Remove selectable compatibility branches, fallback implementations, and obsolete-only code/tests/help; do not retain another playable ruleset or import its progress.
- Implement synchronous atomic effects, per-hop signal derivation, captured entry/departure records, deterministic priority queues, invariant checks, and whole-action rollback for cycles or invalid mutations.
- **BREAKING:** matching goal entry wins after its signal reactions and before later transport/rays. Stationary color matching is insufficient. Exposure and closure under the dot cause terminal failure; failed attempts cannot be undone, but restart/navigation remain available.
- Apply pending closure beneath crates and immediate closure failure beneath the dot uniformly to linked gates, polarity barriers, and phase void. Ordinary color mismatch alone is not physical closure.
- **BREAKING:** conveyors are floor tiles with one unambiguous exit direction. White is their default tint; tint is inert. After a committed direction or ACTION, initial queue seeding checks belt occupants including stationary passengers. Signals outrank transport; transport outranks ordinary tile effects. Eligible dot, crate, and movable-feature passengers share destination legality; blocked belts never implicitly push front objects.
- Document all 49 used IDs, the dot, and all 13 additional registered IDs using a uniform behavioral definition. The planning reference is `tile-catalogue.md`; implementation publishes the maintained catalogue and gallery from the same contracts.
- Recertify all 61 levels under V2, redesign incompatible routes rather than weakening the engine, recompute/replay every PAR, and preserve stable world/level identities and the six eight-level progressions. Refresh the Prologue JS/YAML pair together.
- Audit all maintained assets, not only gameplay scripts: loader/exporter, solver, persistence, input/HUD/failure UI, glyphs/CSS/gallery, route tools, fixtures, docs, contributor instructions, and active specifications.
- Remove obsolete references from maintained assets and mark superseded plans non-authoritative. Per user clarification, leave historical archives/design history, Git history, dependencies, and harness internals untouched. This proposal does not delete code or migrate content itself.

## Capabilities

### New Capabilities

- `event-resolution`: atomic action/effect scheduling, signal priorities, captured triggers, queue/invariant rollback, terminal outcomes, and lifecycle parity.
- `conveyor-transport`: neutral-tint floor conveyors, exit-direction semantics, queue-opening occupant checks, common passenger legality, and chained transport.

### Modified Capabilities

- `tile-mechanics`: full catalogue contract, per-hop effects, immediate entry-only victory, physical closure, four-color vocabulary, and committed outcome playback.
- `movable-objects`: shared queued movement for the dot/crates/features, immutable trigger identity, atomic push/pull, cycle rollback, and terminal-aware search/undo.
- `world-level-packs`: sole V2 interpretation, fresh progress, all-pack certification, generated Prologue parity, and asset/route evidence.
- `line-of-sight-hazards`: settled-ray terminal failure and immediate-win priority, replacing recoverable exposure outcomes.
- `binary-gate-polarity`: pending crate closure and terminal dot closure, with per-effect polarity derivation.
- `sokoban-targets`: immediate occupancy derivation and edge reactions after atomic moves, while retaining push-only World 1 profiles.
- `chromatic-aura-routing`: captured per-hop color effects, strict entry-only victory, and review of every chromatic route.
- `crate-proximity-switches`: per-hop adjacency, OR-combined links, edge-triggered reactions, and migrated receiver/gate puzzles.

## Impact

`asset-inventory.md` is the explicit delivery checklist: 7 YAML packs/61 levels, 12 gameplay scripts, 2 entry pages, CSS, 2 Node tools, all test tiers, and maintained docs/specs. `tile-catalogue.md` inventories 62 registered definitions plus the dot. Both distinguish observed source data from proposed V2 behavior; no future PAR or migration success is claimed.

This change supersedes, but does not silently reset/discard, the 26 checked tasks and uncommitted work in `v2-rule-set`. Its compatible helpers can be reused after review; incompatible policy branches must be removed during implementation. No new World 7/8 pack, crumble mechanic, inventory key system, editor application, extra color state, asynchronous rules, or network dependency is introduced. Existing future-work plans and historical evidence are not rewritten as completed V2 work.
