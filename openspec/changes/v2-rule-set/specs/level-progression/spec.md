# Level progression specification delta

## Purpose

Defines explicit prerequisites and observable level-access decisions for V2 worlds without changing legacy pack access or hiding puzzle-relevant board information.

## ADDED Requirements

### Requirement: V2 prerequisites name earlier levels in the same world
A V2 level SHALL accept an optional `requires` list of distinct earlier level keys in its own world. All listed levels SHALL be cleared before entry. An omitted or empty list SHALL impose no prerequisite. Unknown, duplicate, self, later-level, or cross-world references SHALL invalidate the pack.

#### Scenario: Explicit prerequisites are conjunctive
- **WHEN** `level_4` requires `level_1` and `level_2`, but only `level_1` is cleared
- **THEN** `level_4` remains locked until `level_2` is also cleared in the same world and ruleset

#### Scenario: No implicit sequential gate
- **WHEN** `level_3` has no prerequisites and earlier levels are uncleared
- **THEN** `level_3` is selectable without requiring those levels

#### Scenario: Invalid reference preserves the active world
- **WHEN** any prerequisite is duplicated, missing, not earlier, or world-qualified
- **THEN** the shared validator rejects the new pack with a world/level-specific diagnostic before activation

### Requirement: All player level-entry paths enforce the same access decision
V2 access checks SHALL apply to selection, next-level navigation, direct controller entry, restored last selection, and pack activation. A locked entry SHALL preserve the active playable state and report its unmet prerequisites. Validation and solver analysis SHALL remain independent of campaign unlocks.

#### Scenario: Navigation cannot bypass a lock
- **WHEN** next-level navigation or a direct player-facing entry requests a locked level
- **THEN** the request does not start it or replace the current board

#### Scenario: Saved selection is now locked
- **WHEN** a V2 pack is activated and its saved last selection has unmet prerequisites
- **THEN** activation selects the first available level in pack order and explains the unavailable saved selection

#### Scenario: Solvability checking does not require campaign play
- **WHEN** a structurally valid locked level is checked by the authoring validator or solver
- **THEN** its board can be analyzed without changing completion or unlock progress

### Requirement: Prerequisites are visible and completion-derived
The level selector SHALL display V2 levels, their locked/unlocked state, and unmet prerequisite names. Access SHALL derive from saved completion in the same world and ruleset rather than a separate authoritative unlock latch. Clearing one prerequisite SHALL refresh every affected level.

#### Scenario: One clear unlocks multiple branches
- **WHEN** two levels require only `level_1` and `level_1` is cleared
- **THEN** both levels become available without requiring sequential navigation through either branch

#### Scenario: Progress is absent or reset
- **WHEN** prerequisite completion is unavailable or reset
- **THEN** dependent levels remain locked and levels with no prerequisites remain available

#### Scenario: Lock information is inspectable
- **WHEN** a player inspects a locked level in the selector
- **THEN** its unmet prerequisite display names are available without entering the level or consulting prior action history
