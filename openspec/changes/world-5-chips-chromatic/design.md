# Design

## Context

See `proposal.md` and `specs/chromatic-aura-routing/spec.md` for the World 5 contract.

The current runtime already has four player/world color states, red/green/blue player prisms, a world-color cycle/reset, player-aura gates, red/green/blue world gates, and a goal that clears only when `P === W`. It has no yellow state, no color-mixing state, and no player-aura reset tile. `world-1-sokoban` is defining the reusable world-pack format, local loading, and named levels; World 5 must reuse it.

## Goals / Non-Goals

**Goals:**

- Teach existing aura and gate behavior through eight independently selectable, solver-checked levels.
- Make the white-as-yellow theme mapping explicit in text while retaining white gameplay state and glyph.
- Use goal color matching deliberately so each solved route ends in a valid `P === W` state.
- Keep existing Prologue color semantics and palette unchanged.

**Non-Goals:**

- Add yellow, color mixing, chromatic inheritance, aura shedding, or a white player prism.
- Add new gate mechanics where a current player-gate, world-gate, cycle, or reset tile already expresses the requirement.
- Modify color rules for other worlds or make World 5 progress unlock another world.

## Decisions

### 1. Reuse current tile IDs and rules before adding code

Use the current registry: IDs 11–13 set player aura red/green/blue; IDs 20–22 alter/reset world color; IDs 30–33 check player aura; IDs 34–36 check world color. No new tile IDs are required for the core theme. Content tests should prove existing behavior rather than duplicate rule code inside a World 5 loader.

**Alternatives considered:** adding a distinct yellow prism/gate would violate the palette decision; adding a “mix” tile would create a fifth state; aliasing `wht` to yellow in the actual color state would break `P === W` and the existing white goal behavior.

### 2. Treat `wht` as thematic correspondence only

The world name/hints may explain that the classic yellow key role is represented by `wht`, but gameplay data continues to store and render `wht`. Do not use a yellow CSS color, yellow glyph, or `yellow` YAML value as if it were a gameplay state. This retains the four-state invariant and avoids misleading gate color checks.

### 3. Author explicit P/W routes and avoid imaginary resets

Each level documents which tile changes P and which changes W. A player prism replaces P with one explicit RGB value; walking away does not change P. A cycle dial changes W only according to its existing rule; the reset changes W to white but does not change P. Before a goal, the authored route must leave both carriers equal.

The level 1 tutorial includes the necessary world-color action (e.g., a cycle dial to red) as well as the red prism and matching player gate; merely reaching a red gate is not enough to win because the goal checks both carriers. No level may rely on backtracking to restore P to white or on mixing colors.

### 4. Adapt blueprint slots that require unsupported states

Keep eight levels and their intended difficulty roles. Replace the beginner “mixing/backtracking resets aura” slot with sequential prism/gate routing that makes persistent P legible. Replace the hard “temporary aura shedding” slot with a multi-branch choice/order puzzle where the player commits to an explicit prism route. Use the existing states for the mastery spectrum. Resolve the corridor table/prose mismatch as 16 columns × 2 rows if that remix slot is retained.

### 5. Keep the pack independent and test the shared resolver

Place the eight levels in a World 5-specific pack using the shared W1 pack contract. Run the common validator and actual resolver-based solver against each level. Tests should verify that `P` gates, `W` gates, and `P === W` goal clearing remain distinct; do not add World 5-specific assumptions to generic gate code.

## Risks / Trade-offs

- [White-as-yellow prose may confuse players about the actual white state] → Explain the analogy in World 5 hints/codex while keeping the glyph and state explicitly white.
- [A route may pass every gate but fail at the goal due to `P !== W`] → Solver-check every map and manually document the final P/W pair in content review.
- [Cycle dials can change W again when revisited] → Avoid placing a cycling dial on a mandatory backtracking route unless the repeated transitions are part of the puzzle; use an existing reset/set dial where its documented behavior fits.
- [The source blueprint asks for unsupported mixing/shedding] → Replace those ideas with persistent-aura routing and include regression tests that reject unsupported color values.
- [The 16×4 table entry disagrees with 2×16 prose] → If used, encode the odd corridor as width 16, height 2 and test grid dimensions.

## Migration Plan

1. Confirm/reuse the current palette and registry semantics with headless tests; fix only demonstrable generic defects.
2. Author the World 5 pack and solve every level with the runtime resolver.
3. Add pack-level assertions for palette values, gate carriers, goal state, and computed par; add browser checks for named level loading and explanatory hints.
4. Review the eight routes manually and verify no puzzle relies on unavailable yellow/mixing/reset behavior.

Rollback removes the World 5 pack and its descriptive text. Existing Prologue levels and global color behavior remain unchanged.

## Open Questions

- None blocking. The yellow correspondence is thematic only; all gameplay data remains in the existing four-color domain.
