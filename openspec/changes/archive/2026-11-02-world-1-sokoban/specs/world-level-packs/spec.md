# Spec Delta

## Purpose

Defines how an independently loadable world is represented as a named level pack and how its levels are validated, selected, and kept separate from the built-in Prologue.

## ADDED Requirements

### Requirement: A world pack identifies its world and levels
The system SHALL accept a world pack containing a stable world ID, a display name, a declared level count, and a contiguous ordered mapping of named levels.

#### Scenario: Valid named world pack
- **WHEN** a pack declares world metadata, `num_level`, and contiguous `level_1` through `level_n` records
- **THEN** the loader recognizes the world name and exposes each level's display name

#### Scenario: Declared level count is wrong
- **WHEN** `num_level` differs from the number of level records
- **THEN** validation rejects the pack and identifies the mismatch

#### Scenario: World identity is absent
- **WHEN** a pack omits a required stable world ID or non-empty world display name
- **THEN** validation rejects the pack with a diagnostic naming the missing metadata

### Requirement: World packs load without network access
The system SHALL let the user load a world pack from a local file, drag-and-drop, or pasted YAML while the game is opened directly under `file://`, without fetching sibling files or contacting a network service.

#### Scenario: Load a local Sokoban pack
- **WHEN** the user selects or drops a valid World 1 pack in Chromium under `file://`
- **THEN** the pack is parsed and validated without a server or network request

#### Scenario: Unsupported or malformed YAML
- **WHEN** the selected pack contains invalid syntax or an unsupported YAML construct
- **THEN** the system reports a useful parsing diagnostic with the source line and column when available

### Requirement: Pack validation is atomic and actionable
The system SHALL validate the entire pack before activation and report parse or semantic errors with the relevant file, world, level, source location when available, and a corrective message.

#### Scenario: Invalid new pack preserves active game
- **WHEN** any level in a newly selected pack fails parsing or validation
- **THEN** the system reports the error and leaves the currently active pack and playable state unchanged

#### Scenario: Valid new pack replaces active world
- **WHEN** every level in a newly selected pack passes validation
- **THEN** the system activates that pack as one operation and refreshes the world and level selectors

### Requirement: Every level in a loaded world is directly selectable
The system SHALL list each validated level in the active world pack by its display name and allow direct selection without requiring earlier levels to be cleared.

#### Scenario: Select a later Sokoban level directly
- **WHEN** a valid World 1 pack is active and the user selects any listed level
- **THEN** that level loads even if earlier levels have not been completed

#### Scenario: Prologue remains available
- **WHEN** the user returns from a loaded world pack to the built-in Prologue
- **THEN** the original Prologue levels remain available and loadable

### Requirement: World 1 provides a victory picture for every solved level
The system SHALL display the level's valid custom victory picture when present, or a generated snapshot of the solved board when no custom picture is supplied.

#### Scenario: Generated World 1 victory snapshot
- **WHEN** the player solves a World 1 level without a custom `win_picture`
- **THEN** the game displays an offline-generated image showing the final board, including crate and target state

#### Scenario: Custom World 1 victory image
- **WHEN** a valid custom `win_picture` is defined for a level
- **THEN** the custom image is displayed instead of the generated snapshot

#### Scenario: Victory image is cleared on level change
- **WHEN** the player restarts or loads another level
- **THEN** the previous level's victory image is hidden and cannot appear as the new level's result

### Requirement: World progress uses world-qualified level identity
The system SHALL keep progress for a level distinct from levels with the same key in another world pack or the Prologue.

#### Scenario: Same level key in two packs
- **WHEN** two different packs each contain `level_1`
- **THEN** completion, best score, last selection, and seen-tile progress for one pack do not overwrite the other pack's progress

### Requirement: World pack grids obey the supported board format
The system SHALL accept only rectangular integer-ID grids whose declared dimensions match their rows, whose cells reference implemented tiles, and whose dimensions are within the supported 16-by-9 maximum.

#### Scenario: Ragged or oversized grid
- **WHEN** a level has rows of different lengths, mismatched declared dimensions, or exceeds 16 columns by 9 rows
- **THEN** validation rejects the level and identifies its key and the offending dimension or row

#### Scenario: Valid rectangular grid
- **WHEN** a level contains a rectangular grid of implemented tile IDs within the board limits
- **THEN** the loader preserves the established convention that YAML rows are written top-to-bottom and game coordinate A1 is bottom-left
