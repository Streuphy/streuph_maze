# Spec Delta

## Purpose

Defines turn-based line-of-sight hazards that movable crates can shield, plus the caught-player respawn rule used by Lolo's Castle.

## ADDED Requirements

### Requirement: Cardinal rays threaten unobstructed cells
The system SHALL evaluate each static ray emitter along its configured cardinal direction until the board edge or first opaque obstacle.

#### Scenario: Player is in an unobstructed ray
- **WHEN** a resolved player position lies on an emitter's active cardinal ray before any opaque obstacle
- **THEN** the player is considered caught by that hazard

#### Scenario: Wall or crate blocks a ray
- **WHEN** a wall or movable crate lies between an emitter and the player on the same row or column
- **THEN** the ray does not catch the player beyond that obstacle

#### Scenario: Player is not aligned with a ray
- **WHEN** the player is not on the emitter's row or column in its configured direction
- **THEN** that emitter does not catch the player

### Requirement: Caught player respawns without a lose state
The system SHALL return a caught player to the level start after the resolved action without clearing strokes or resetting non-player state, and SHALL NOT enter a terminal game-over state.

#### Scenario: Player is caught after a move
- **WHEN** a successful player action ends in an unobstructed ray
- **THEN** the player returns to the start, the action costs exactly one stroke, crates/colors/latched switches/hazard state remain, and player-occupancy switches and derived gates reflect the respawn position

#### Scenario: Respawn is undoable
- **WHEN** the player undoes a caught action
- **THEN** the player and all other game state return to their exact pre-action values, including the previous stroke count

#### Scenario: Start tile is safe after respawn
- **WHEN** a player is caught by a hazard
- **THEN** the level's authored start position does not immediately catch the respawned player in an unbounded loop

### Requirement: Hazard resolution is turn-based
The system SHALL resolve ray checks synchronously as part of a player action and SHALL NOT depend on elapsed wall-clock time, animation completion, or an asynchronous timer.

#### Scenario: Catch is independent of rendering delay
- **WHEN** identical game states receive the same action with different rendering delays
- **THEN** both actions produce the same ray result and respawn state

### Requirement: Lolo's Castle has eight progressive levels
The Lolo's Castle pack SHALL contain eight named levels in the blueprint roles and board limits; time-based and sweeping descriptions SHALL be authored as deterministic turn-based ray puzzles instead.

#### Scenario: Tutorial teaches one shield
- **WHEN** the player selects level 1
- **THEN** one static ray can be safely blocked by positioning one movable crate

#### Scenario: Mastery combines multiple rays and shields
- **WHEN** the player selects level 8
- **THEN** the board combines multiple emitters and movable shields in a solvable 16×9 facility
