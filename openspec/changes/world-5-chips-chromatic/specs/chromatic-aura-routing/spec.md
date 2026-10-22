# Spec Delta

## Purpose

Defines the Chip-inspired world as a sequence of puzzles using the existing player aura, world color, and matching gate rules without extending the gameplay palette.

## ADDED Requirements

### Requirement: Chromatic puzzles use only the existing four gameplay colors
World 5 SHALL use only `wht`, `red`, `gre`, and `blu`; `wht` SHALL serve the theme's yellow role without creating a yellow state or changing its white gameplay identity.

#### Scenario: White serves the yellow theme role
- **WHEN** World 5 describes or displays the yellow-like key role
- **THEN** it uses the existing `wht` state and does not expose a fifth gameplay color

#### Scenario: Unsupported color mixing is requested
- **WHEN** a level concept would require combining two aura colors into a new state
- **THEN** that concept is represented as sequential color routing or omitted, not as a mixed color state

### Requirement: Prisms set one player aura and matching gates test the correct carrier
World 5 SHALL use prisms to set the player's current aura and SHALL allow player-color gates by `P` and world-color gates by `W`, using their configured color.

#### Scenario: Player passes a matching aura gate
- **WHEN** the player attempts to enter an aura gate while `P` matches its required color
- **THEN** the gate permits entry unless a separate linked lock is closed

#### Scenario: Wrong player aura is rejected
- **WHEN** the player attempts to enter an aura gate while `P` does not match its required color
- **THEN** entry is blocked without changing the player's aura or charging a stroke

#### Scenario: World gate checks world color
- **WHEN** the player attempts to enter a world-color gate
- **THEN** entry depends on `W`, not on `P`

### Requirement: World 5 exits retain the existing matching-goal rule
The player SHALL clear a chromatic level only while standing on its goal with player aura `P` equal to world color `W`.

#### Scenario: Matching colors clear the goal
- **WHEN** the player reaches the goal with `P === W`
- **THEN** the level is cleared

#### Scenario: Mismatched colors do not clear the goal
- **WHEN** the player reaches the goal with `P !== W`
- **THEN** the level remains uncleared until the required color state is reached

### Requirement: Chromatic levels teach the mechanic without mixing or implicit aura reset
The World 5 pack SHALL contain eight named levels following the blueprint progression, and SHALL NOT rely on color mixing or automatic aura loss while backtracking.

#### Scenario: Beginner variant routes through two prisms
- **WHEN** a beginner level requires two colors in sequence
- **THEN** each prism sets one explicit player aura and the route tests the corresponding existing gate rules

#### Scenario: Backtracking preserves the current aura
- **WHEN** the player walks away from a prism without entering another aura-changing tile
- **THEN** the player's aura remains unchanged

#### Scenario: Mastery uses all palette states
- **WHEN** the player selects level 8
- **THEN** the puzzle may use white, red, green, and blue as distinct existing states without adding a fifth state
