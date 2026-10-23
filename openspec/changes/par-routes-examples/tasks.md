# Tasks

## 1. Bounded balanced-route selection

- [x] 1.1 Extend the real-resolver BFS to compare equal-minimum winning routes by the specified four-direction squared-deviation score, retaining equal-depth route alternatives that converge to one state; verify a fixture chooses a better-balanced route without changing the minimum stroke count.
- [x] 1.2 Preserve the existing BFS action order as the deterministic tie-break and add tests proving repeated searches select the first equal-score route; cover move/pull counting and exclusion of ACT and forced movement.
- [x] 1.3 Bound route-alternative exploration and expose whether comparison completed; test budget exhaustion retains a replayable proven-minimum route/PAR while marking balance selection incomplete.

## 2. Route report and shared authoring guidance

- [x] 2.1 Add an opt-in route-report command that loads Prologue and available world packs through the common loader and prints route actions, PAR, direction counts, score, and completeness; verify its output parses/replays to a win at exactly PAR and does not appear in normal test output.
- [x] 2.2 Update `docs/world-level-packs.md` and `docs/level-design/world-authoring-checklist.md` with the command-count definition, scoring rule, deterministic tie-break, replay requirement, and incomplete-search caveat; verify each documented command and rule matches the implementation.

## 3. World 1–7 PAR examples

- [x] 3.1 Generate and replay one balanced-optimal example from the existing World 1 pack; add its level identity, PAR, ordered actions, and directional counts to `openspec/changes/world-1-sokoban/design.md`.
- [x] 3.2 Generate and replay one balanced-optimal example from the existing World 2 pack; add it to `openspec/changes/archive/2026-10-23-world-2-lolos-castle/design.md` without changing the archived change's task status.
- [ ] 3.3 As World 3–7 packs are authored, generate and replay one example per world and add the same fields to each corresponding `openspec/changes/world-3-hyrule-flip-flop/design.md` through `world-7-catrap-collapse/design.md`; do not add placeholders or claim examples before a pack and route exist.
- [x] 3.4 Verify each published example's route is a solver-selected minimum, its replay wins with strokes equal to PAR, and its direction totals and balance score match the report; run `npm test` after the documentation and tests are updated.

## 4. OpenSpec integration

- [x] 4.1 Run `openspec validate par-routes-examples` and resolve all validation errors; verify the change status shows the proposal, spec, design, and tasks as complete.
