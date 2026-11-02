# Proposal

## Why

The sole queued V2 runtime is implemented, but the eight accepted capability specifications still contain superseded behavior and two implemented capabilities have no accepted specification. Players and coding agents need distinct, discoverable documentation with explicit authority, precise engine terminology, and honest treatment of pending approval and unrelated draft work.

## What Changes

- Audit maintained `docs/`, `README.md`, `AGENTS.md`, and `openspec/specs/` against the existing V2 migration deltas, runtime, and regression tests; record each discrepancy and its disposition.
- Reconcile all ten capability deltas from `v2-global-pack-migration` into accepted specifications through reviewed synchronization. Create accepted homes for the already-implemented `event-resolution` and `conveyor-transport` capabilities; repair stale Purpose text and residual contradictions in unchanged clauses as well as changed requirements.
- Separate player guidance, level-authoring reference, normative agent contracts, implementation architecture, verification evidence, and historical/future proposals. Add a documentation entry point and a shared glossary/ownership map rather than another competing rules description.
- Make player guidance concise and practical; formalize the technical explanation of state, transactions, queue ordering, closure, terminal outcomes, rollback, lifecycle, and presentation boundaries without changing behavior.
- Revise the GitHub README with quick start, short controls, documentation links, GPL license, and explicit agent-/LLM-driven development disclosure. Do not advertise an in-game key-rebinding UI: existing bindings are source-configured.
- Track unresolved items separately from completed implementation. Preserve historical records and unrelated user-owned drafts; report an unresolved draft conflict as a blocker rather than rewriting it or bypassing audit checks.

## Capabilities

### New Capabilities

None introduced by this change. `event-resolution` and `conveyor-transport` already exist as implemented V2 migration deltas and will acquire accepted-spec homes through synchronization of that source change.

### Modified Capabilities

No new behavioral deltas are authored here. This documentation and synchronization change uses `skip_specs: true` to avoid duplicating or competing with the existing ten migration deltas:

`binary-gate-polarity`, `chromatic-aura-routing`, `conveyor-transport`, `crate-proximity-switches`, `event-resolution`, `line-of-sight-hazards`, `movable-objects`, `sokoban-targets`, `tile-mechanics`, and `world-level-packs`.

Their reviewed integration changes the accepted documentation baseline to describe the already-implemented V2 contract; it does not authorize a new game behavior. A genuine runtime/delta conflict must be reported and resolved explicitly before synchronization, never silently decided in prose.

## Impact

- Main targets: `docs/`, the ten accepted capability specifications under `openspec/specs/`, `README.md`, and authority/navigation wording in `AGENTS.md`.
- Expected documentation additions: `docs/README.md` for audience/authority navigation and a review/disposition record within this change. Extend the existing PDD and architecture guide instead of creating a second engine specification.
- Dependencies: completed implementation and existing deltas in `v2-global-pack-migration`; explicit review of all ten mappings before accepted-spec synchronization. This change does not archive that migration or any other change, and synchronization alone is not release approval.
- No runtime, registry, YAML schema, pack, PAR, progress-store, dependency, or test behavior changes. No new rule, tile, object, editor feature, generalized solver, color, inventory, or collapse mechanic.
- Preserve `docs/Nouveau document`, the untracked `docs/level-editor-PDD-V1.md`, `openspec/changes/level-editor-v1/`, and the pending World 6 archive relocation. The editor draft's conflicting format/bounds are a cross-change dependency, not authorization to overwrite user work.
