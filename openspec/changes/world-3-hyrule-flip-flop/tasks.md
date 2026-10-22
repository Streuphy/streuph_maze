# Tasks

## 1. Binary polarity model and barriers

- [ ] 1.1 Reserve and register red/blue polarity barriers and an ACT switch using IDs 46–48 while leaving ID 44 `master_lock` and ID 45 `master_void` untouched; add a registry test proving the IDs and meanings are unique.
- [ ] 1.2 Add validated initial per-level polarity and derived barrier solidity; test both initial states, complementary red/blue passability, unaffected ordinary/color gates, and player/crate blocking.
- [ ] 1.3 Implement one ACT flip per action and occupant-safe closure semantics; add tests for a barrier closing beneath the player/crate, permitted departure, and blocked re-entry.
- [ ] 1.4 Document polarity as distinct from player/world aura colors and from master-lock links; verify codex text and registry glyphs expose current open/closed state.

## 2. Undo, solver, and rendering

- [ ] 2.1 Include polarity in clone, snapshots, restore, and solver state identity; verify undo restores the previous switch state and stroke count and BFS finds a switch-order solution.
- [ ] 2.2 Add browser rendering for both barrier classes and switch state; verify the visible gate arrangement matches the rules state immediately after ACT and after undo.
- [ ] 2.3 Add validation and headless tests for invalid polarity metadata and preserve existing master-lock/master-void tests; document the allowed initial-state values.

## 3. World 3 pack

- [ ] 3.1 Confirm the shared world-pack contract from `world-1-sokoban` is available and use it without adding a second pack loader.
- [ ] 3.2 Author eight named levels for the tutorial-to-mastery curve, including the width-16 × height-2 corridor and movable-blocker variants; verify every grid is within 16×9 and metadata matches row lengths.
- [ ] 3.3 Run the real solver on all eight levels, set each par to its verified optimum, and manually review switch order, gate bypasses, and safe occupancy when polarity flips; record route notes.
- [ ] 3.4 Add pack-level tests for all eight levels, initial polarity, gate-class links, solver/par results, and direct level selection; verify no level depends on wall-clock state.

## 4. Integration

- [ ] 4.1 Run `npm test` and verify all existing color-gate, master-lock, Prologue, and new polarity tests pass.
- [ ] 4.2 Load World 3 under Chromium `file://`, flip polarity, push toward a closed barrier, undo, and return to the Prologue; verify no existing lock behavior changed.
