# Tasks

## 1. Verify existing chromatic behavior

- [ ] 1.1 Add focused headless assertions for prism replacement of `P`, player gates checking `P`, world gates checking `W`, cycle/reset behavior, and the `P === W` goal rule; verify no new color value is accepted.
- [ ] 1.2 Add a content validation test that rejects `yellow` and mixed-color states while accepting `wht/red/gre/blu`; document `wht` as the yellow-role analogy without changing its white glyph.

## 2. Author World 5 levels 1–4

- [ ] 2.1 Confirm the shared world-pack contract from `world-1-sokoban` is available and create the World 5-specific pack metadata; verify stable identity and declared level count parse.
- [ ] 2.2 Author the red tutorial, two-prism beginner variant, sequential-routing beginner variant, and guarded-prism combination; verify all grids fit their blueprint sizes and no level assumes aura resets or mixing.
- [ ] 2.3 Run solver and exact-par checks for levels 1–4; manually verify the final `P/W` match, gate carrier, route necessity, and distinct teaching point, then add these maps/par values to content tests.

## 3. Author World 5 levels 5–8

- [ ] 3.1 Author the intermediate homage, width-16 × height-2 chromatic corridor, multi-branch order puzzle without aura shedding, and four-state mastery level; verify all dimensions and registered tile IDs.
- [ ] 3.2 Compute and record exact pars for levels 5–8, using an independently reproducible exhaustive result if the bounded browser solver returns unknown; add solver/content assertions.
- [ ] 3.3 Manually review all later routes for persistent aura, cycle-dial revisit traps, world-gate vs aura-gate distinctions, and final `P === W`; document any source-blueprint reinterpretations.

## 4. Pack and browser integration

- [ ] 4.1 Add tests loading the complete eight-level pack through the shared validator and directly selecting each level by name; verify custom victory art or shared generated fallback behaves correctly.
- [ ] 4.2 Add browser checks for the white-as-yellow explanation, actual white presentation, and correct gate feedback without external assets or network calls.
- [ ] 4.3 Run `npm test` and verify the Prologue's existing colors, gates, goal condition, and World 5 pack all pass unchanged.
