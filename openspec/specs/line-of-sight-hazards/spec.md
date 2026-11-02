# line-of-sight-hazards Specification

## Purpose

Defines static cardinal ray hazards, capability-enabled object transport and crate shielding. Final exposure after a non-winning queued round commits terminal failure; restart or navigation recovers the attempt, not a positional reset. Shared state/event precedence is defined in [event-resolution](../event-resolution/spec.md).

## Requirements

### Requirement: Cardinal rays threaten unobstructed cells
Each static emitter SHALL trace its one configured cardinal direction to the board edge, an effectively solid surface, or the first ray-blocking object. Lolo's Castle crates SHALL block and default targets SHALL ignore rays. Final exposure SHALL be evaluated only for a non-winning drained queue; it SHALL cause terminal failure.

#### Scenario: Player is in an unobstructed ray
- **WHEN** the non-winning action queue drains with the dot on an unshielded ray cell
- **THEN** that attempt becomes failed and its settled board remains visible

#### Scenario: Wall or crate blocks a ray
- **WHEN** an effectively solid wall/barrier or blocking crate lies before the dot on the ray
- **THEN** cells beyond it are not exposed by that emitter

#### Scenario: Target is transparent to a ray
- **WHEN** a default target lies on the ray without another intervening blocker
- **THEN** it does not shield the dot

#### Scenario: Player is not aligned with a ray
- **WHEN** the dot is outside the emitter's configured cardinal ray
- **THEN** that emitter does not threaten it

### Requirement: Hazard resolution is turn-based
Ray-enabled object transport SHALL execute as queued transport with per-hop legality/derivation. After a non-winning queue drains, final exposure SHALL cause terminal failure. A previously committed matching goal-entry win SHALL cancel later ray sampling. Rules SHALL be synchronous and independent of elapsed time or rendering completion.

#### Scenario: Catch is independent of rendering delay
- **WHEN** identical states/actions use different display timing
- **THEN** ray transport, settled exposure, terminal state, and stroke result are identical

#### Scenario: Matching goal entry has already won
- **WHEN** the dot passes a legal matching goal-entry checkpoint before the final hazard sample
- **THEN** remaining work is canceled and exposure cannot replace that win

### Requirement: Lolo's Castle has eight progressive levels
The Lolo's Castle pack SHALL retain eight named V2 levels within the blueprint roles/board limits, using static turn-based rays and restart-recoverable terminal failure. All eight SHALL have proven minimum winning routes that do not rely on continued play after exposure. Changed boards, lessons, and PARs SHALL be reviewed together.

#### Scenario: Tutorial teaches one shield
- **WHEN** level 1 is reviewed and played
- **THEN** a single crate can safely shield one static ray and the lesson does not require intentional terminal failure

#### Scenario: Mastery combines multiple rays and shields
- **WHEN** level 8 is certified
- **THEN** its multiple emitters/shields form a solvable 16×9 puzzle with a replay-proven V2 minimum and no required recovery teleport

### Requirement: Exposed failed attempts preserve the board until restart or navigation
Terminal exposure SHALL preserve the settled positions, colors, latches, signals, and normal initiating stroke while blocking gameplay and undo. Restart SHALL reconstruct initial state; navigation SHALL remain available. Failure SHALL add no extra stroke and SHALL NOT award completion or best score.

#### Scenario: Failed move cannot be undone
- **WHEN** a committed move finishes exposed and the player requests undo
- **THEN** the failed board remains unchanged and the interface offers restart rather than restoring a prior gameplay position

#### Scenario: Restart recovers the attempt
- **WHEN** the player restarts after terminal exposure
- **THEN** the authored initial board, counters, colors, and playing outcome are reconstructed with no pending effects
