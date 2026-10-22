# Tasks

## 1. Crumble tile and state lifecycle

- [ ] 1.1 Reserve/register crumble terrain ID 101 and its intact/collapsed glyph states; add a registry test proving it remains distinct from ID 4 `void` and from other pending world IDs.
- [ ] 1.2 Add and initialize the per-level collapsed-cell map; test that a successful player departure collapses the source cell while entry, blocked movement, ACT, and crate movement alone do not.
- [ ] 1.3 Apply collapsed solidity to player moves and crate destinations; add tests for blocked re-entry, blocked crate pushes, reset-to-intact behavior, and departure hooks for normal movement, conveyor hops, and teleport.
- [ ] 1.4 Include the map in cloning, snapshots, restore, and solver identity; verify undo restores the exact departed cell and stroke count and the BFS does not revisit collapsed cells.
- [ ] 1.5 Document player-only collapse, no crate-bridge behavior, ID distinction from phase void, and the authored level convention; verify docs agree with the headless rules tests.

## 2. Rendering and bounded search

- [ ] 2.1 Add `describeTile` collapsed state and render an unmistakable hole when a cell collapses; add browser tests for intact/collapsed glyphs and a full redraw after undo.
- [ ] 2.2 Verify solver returns bounded `solvable`, `unsolvable`, or `unknown` states for collapse maps without hanging; add compact exact fixtures and a deliberately budget-limited fixture.
- [ ] 2.3 Add a codex/tutorial explanation and test that visual state does not mutate the collapse bitmap; keep all rules synchronous and timer-free.

## 3. World 7 levels 1–4

- [ ] 3.1 Confirm shared world-pack/crate-overlay support from `world-1-sokoban`; create a World 7-specific pack and add the small tutorial trail, branching route, portal remix, and crate-positioning combination.
- [ ] 3.2 Solve levels 1–4 within budget where possible, record exact pars for proven optima, and report unknown distinctly; manually review every crumble/re-entry route and verify portals do not restore floor.
- [ ] 3.3 Add content tests for dimensions, route tile counts, collapse state semantics, portal pairs, solver status, and par values; document how L4 replaces unsupported crate bridging.

## 4. World 7 levels 5–8

- [ ] 4.1 Author the homage, width-16 × height-2 odd corridor, hard crate-dependent trail, and 16×9 mastery pack levels; verify no grid exceeds 16×9 or assumes a crate bridges void.
- [ ] 4.2 Run bounded solver checks on levels 5–8 and obtain independent reproducible solutions/pars where browser search is unknown; add evidence and route-review notes to World 7 documentation.
- [ ] 4.3 Manually inspect the full eight-level set for intended collapse order, no accidental start/goal collapse, undo recovery, and clear tutorial progression; verify all maps parse and validate together.

## 5. Integration

- [ ] 5.1 Run `npm test` and verify Prologue/World 1 behavior, existing ID 4 phase-void semantics, new crumble state, undo, renderer, and bounded solver tests all pass.
- [ ] 5.2 Load World 7 under Chromium `file://`, collapse and undo a tile, use the portal remix, select another world, and verify collapse state is level-local and reset on a fresh run.
