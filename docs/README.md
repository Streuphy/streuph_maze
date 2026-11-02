# Documentation guide

Streuph's Maze has one implemented ruleset: **queued V2**. Start with the guide
for your role; future proposals and historical notes are not playable variants.

## Players

- [Project README](../README.md) — quick start, controls, development and license.
- [Game rules](GAME_RULES.md) — movement, colors, tiles, winning and recovery.
- [Definition gallery](../glyphs.html) — open locally to inspect registered glyphs.

## Level authors

- [Level editor](level-editor.md) — the separately developed `editor.html`
  authoring surface and its current workflow; it consumes the shared game
  contracts, not an editor-specific ruleset.
- [Tile Mechanics Reference](level-design/tile-mechanics.md) — all 62 registered
  IDs plus the separate dot; exact defaults, supported profiles and behavior.
- [World packs](world-level-packs.md) — shared YAML format, loading and export.
- [Authoring checklist](level-design/world-authoring-checklist.md) — progression,
  wrong-action review, minimum-PAR proof/replay and browser checks.
- [Worlds blueprint](level-design/worlds-blueprint.txt) — Golden Rules and current
  lessons; its later-world concepts are explicitly future work.

## Engine contributors and coding agents

- [Shared rendering](rendering.md) — one Konva compositor for pixel/vector play,
  gallery and editor; original sprite sources, motion and state/event playback.

The contract is **state transitions and ordered committed events**, not tile-ID
branches or rendering. The engine owns transaction integrity, scheduling,
invariants and rollback. Registered definitions own mechanic-specific behavior
through declared strategies, capabilities and state metadata.

- [Accepted specifications](../openspec/specs/) — normative requirements and
  WHEN/THEN scenarios for the current V2 baseline.
  - [Event resolution](../openspec/specs/event-resolution/spec.md) — shared
    transactions, ordering, closure, outcomes, rollback and lifecycle.
  - [Conveyors](../openspec/specs/conveyor-transport/spec.md) — common passenger
    policy, cardinal exits, inert tint and one-hop transport.
  - [Tile mechanics](../openspec/specs/tile-mechanics/spec.md) — definition and
    authoring contract, linked sources and supported identity index.
- [PDD / abstract model](Product_Design_Document.md) — vocabulary for canonical
  state, derived queries, round-local work and committed output.
- [Engine architecture](engine-architecture.md) — concrete ownership, module
  boundaries, clone/snapshot/restore, solver identity and passive playback.
- [Repository agent guide](../AGENTS.md) — scope, authority and verification rules.

### Authority and change status

Accepted specs define the normative baseline; authoring references index it and
the runtime/tests provide implementation evidence. A selected active change may
explicitly propose a breaking target; it is not evidence of implementation or
acceptance. Report disagreements rather than choosing an undocumented rule.

The ten existing [V2 migration deltas](../openspec/changes/v2-global-pack-migration/specs/)
were integrated during the [documentation review](../openspec/changes/archive/2026-11-02-doc-review-v2-ruleset/review.md).
Synchronization does not itself approve a release or archive a change. That
archived review records its then-open editor-draft finding. The current graphics
branch's [rendering verification](../openspec/changes/graphiscs-engine-update-pixel-16bit/verification.md)
records fresh passing asset/native checks; unrelated drafts and editor-v2 work
remain preserved in their separate checkout, not silently imported or discarded.

## Verification and non-shipped material

- [Verification record](level-design/v2-verification.md) — dated Node/jsdom and
  separate native Chromium results, plus the current acceptance boundary.
- [61-level certification ledger](level-design/v2-pack-certification.md) — proofs,
  replay and manual lesson reviews; solver success alone is not design quality.
- [Design history](design-history/) and [archived changes](../openspec/changes/archive/)
  — preserved historical decisions, not current gameplay instructions.
- [Original editor proposal](level_editor_Proposal.md) — precursor to the separate
  editor work; its current status points to the editor guide above.
- [Active changes](../openspec/changes/) — scoped plans and work in progress,
  not automatic acceptance evidence. The editor was added concurrently by its
  own change, not implemented or accepted by this documentation review. Additional
  carrier colors, inventory keys and collapse mechanics remain out of scope.

Keep declared scores, proven minima, personal bests, automated readiness and
human release approval separate. An `unknown` solver result proves neither
solvability nor impossibility; jsdom results are not native Chromium results.
