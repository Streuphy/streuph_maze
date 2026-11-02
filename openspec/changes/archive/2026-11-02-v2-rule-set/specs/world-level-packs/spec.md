# World level packs specification delta

## MODIFIED Requirements

### Requirement: Every level in a loaded world is directly selectable
The system SHALL list each validated level in the active world pack by its display name. Legacy imported packs SHALL retain direct selection without prerequisite clears. V2 packs SHALL permit entry precisely when the explicit same-world prerequisites are satisfied; levels without prerequisites SHALL remain directly selectable.

#### Scenario: Select a later Sokoban level directly
- **WHEN** a valid legacy World 1 pack is active and the user selects any listed level
- **THEN** that level loads even if earlier levels have not been completed

#### Scenario: Prologue remains available
- **WHEN** the user returns from a loaded world pack to the built-in Prologue
- **THEN** the original Prologue levels remain available and loadable under their existing progression behavior

#### Scenario: V2 selection enforces explicit requirements
- **WHEN** a V2 level has unmet `requires` entries
- **THEN** it remains listed with the unmet requirements but cannot be entered through a player-facing load path

### Requirement: World progress uses world-qualified level identity
The system SHALL keep progress distinct across worlds, level keys, and rulesets. Existing unversioned progress SHALL remain legacy progress and SHALL NOT grant V2 completion, best scores, last selection, or seen-tile knowledge. Storage migration and export/import SHALL preserve legacy records while round-tripping V2 records.

#### Scenario: Same level key in two packs
- **WHEN** two different packs each contain `level_1`
- **THEN** completion, best score, last selection, and seen-tile progress for one pack do not overwrite the other pack's progress

#### Scenario: Existing obsolete-rule data is present
- **WHEN** V2 starts with prior serialized records still present in browser storage
- **THEN** the current namespace is empty unless it already has current-format records, and the prior bytes are neither consumed nor deleted

#### Scenario: Progress import has an incompatible contract
- **WHEN** an imported progress file does not identify the supported current contract/schema
- **THEN** import rejects it without changing current records

#### Scenario: Same world and level use different rulesets
- **WHEN** a legacy and V2 pack use the same world ID and level key
- **THEN** their progress remains independent and clearing the legacy level cannot satisfy a V2 prerequisite

#### Scenario: Existing saved progress migrates without reclassification
- **WHEN** the application reads an existing supported progress export or local record
- **THEN** legacy progress remains accessible under its previous world/level identity and no V2 completion is fabricated

## ADDED Requirements

### Requirement: A pack selects one supported gameplay ruleset explicitly
The shared YAML loader SHALL accept a pack-level `ruleset` value of `legacy` or `v2`, applying it to every level. An omitted value SHALL mean `legacy`. Unknown values, non-string selectors, and level-local selectors SHALL be rejected before activation. Ruleset selection SHALL NOT require another loader or executable YAML.

#### Scenario: Existing pack remains behavior-compatible
- **WHEN** an existing pack omits `ruleset`
- **THEN** its action set, colors, scoring, force behavior, and imported-level access retain current legacy behavior

#### Scenario: V2 uses the common activation path
- **WHEN** valid YAML declares `ruleset: v2`
- **THEN** file selection, drag-and-drop, and YAML paste validate and activate the same V2 interpretation without network access

#### Scenario: Unknown ruleset is not a fallback
- **WHEN** a pack declares an unsupported ruleset or a per-level ruleset override
- **THEN** validation reports the offending selector and leaves the active pack and game state unchanged

### Requirement: V2 floor colors are authored independently of occupants
A V2 level SHALL accept `floor_colours` as a board-coordinate mapping to the five supported color tokens. It SHALL apply to ordinary floor or the ordinary supporting floor beneath start, goal, crate, and target markers. Unspecified supporting floor SHALL be White; ID 5 SHALL retain intrinsic Blue. Invalid coordinates, unsupported cells, and attempts to recolor ID 5 non-Blue SHALL be rejected.

#### Scenario: Crate starts on green without a composite ID
- **WHEN** a V2 grid contains a crate marker at B1 and `floor_colours` assigns B1 `gre`
- **THEN** normalization creates that crate above green supporting floor and exposes both identities for play and inspection

#### Scenario: Dot starts on red floor
- **WHEN** the unique start cell is assigned `red` in `floor_colours`
- **THEN** the dot starts on red supporting floor and its first directional action uses red-floor strength without losing the start/respawn marker

#### Scenario: Colored support does not fix the goal's color
- **WHEN** a goal cell has an authored supporting-floor color different from the world
- **THEN** its supporting-floor effect uses that color while the separate goal marker color remains derived from the world

#### Scenario: Unsupported floor override is diagnosed
- **WHEN** a floor-color entry names an out-of-bounds cell, unsupported token, wall, void, gate, conveyor, portal, switch, prism, or another unsupported underlying tile
- **THEN** validation rejects it rather than silently inventing combined terrain behavior

#### Scenario: Floor color is not executable behavior
- **WHEN** an authored mapping contains a handler, strategy, or unknown property instead of a supported color token
- **THEN** the shared validator rejects the data without executing it

### Requirement: V2 initial colors use the shared five-color contract
A V2 level SHALL accept `initial_player_colour` and `initial_world_colour`, each defaulting to `wht` and restricted to the five supported gameplay tokens. Supported entity/tile `colour` parameters SHALL use the same V2 vocabulary. The goal SHALL NOT accept an independent fixed color. Legacy packs SHALL reject V2-only fields rather than silently ignoring them.

#### Scenario: Black can be represented without guessed reversal
- **WHEN** a V2 level initializes player and world colors to `blk`
- **THEN** both values are retained by construction and restart, and goal equality works without reversing terrain rules

#### Scenario: Legacy palette remains unchanged
- **WHEN** a legacy pack requests Black gameplay color, `floor_colours`, V2 initial colors, or `requires`
- **THEN** validation rejects the unsupported authoring request with the ruleset identified

#### Scenario: Goal color override would contradict the world
- **WHEN** V2 authoring attempts to fix a goal marker color independently of `W`
- **THEN** validation rejects it instead of rendering or evaluating a contradictory goal

### Requirement: V2 authoring round-trips through the existing YAML path
The existing YAML parser, validator, normalization, and export path SHALL preserve supported V2 fields, source-coordinate meaning, ruleset identity, prerequisite lists, and declared golf scores. Normalized runtime data SHALL NOT be exported as executable behavior or replace the authored document with transient gameplay state.

#### Scenario: Exported V2 pack reloads equivalently
- **WHEN** a valid V2 pack is loaded, exported, and reloaded through the existing UI
- **THEN** it has equivalent initial board layers, colors, ruleset, requirements, and declared metadata

#### Scenario: Runtime play does not rewrite initial authoring
- **WHEN** crates or targets move during play before the pack is exported
- **THEN** exported level data retains authored initial placement and floor colors rather than the current gameplay positions
