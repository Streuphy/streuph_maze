# Spec Delta

## Purpose

Defines how the solver chooses and reports a representative route among minimum-stroke solutions, so PAR examples are reproducible and directionally balanced without changing the meaning of PAR.

## ADDED Requirements

### Requirement: PAR remains the minimum stroke count
The system SHALL define a level's PAR as the proven minimum number of player strokes; route-balance preferences MUST NOT increase or otherwise change that value.

#### Scenario: Several routes share the minimum
- **WHEN** multiple winning routes have the same minimum stroke count
- **THEN** the solver reports that shared minimum as PAR and selects a representative route only as a secondary preference

### Requirement: Select the most directionally balanced minimum route
Among all winning routes at the minimum stroke count, the system SHALL prefer the route with the lowest squared deviation of its north, south, east, and west command counts from an equal split.

#### Scenario: Directional commands are counted consistently
- **WHEN** the solver compares minimum routes
- **THEN** each explicit move or pull command contributes once to its commanded direction, while ACT and automatic movement contribute to no directional count

#### Scenario: A more balanced route exists
- **WHEN** two minimum routes have different directional-balance scores
- **THEN** the solver selects the route with the lower score without changing PAR

### Requirement: Equal balance uses deterministic solver discovery order
When minimum routes have equal directional-balance scores, the system SHALL select the route encountered first in the solver's deterministic breadth-first action order.

#### Scenario: Balanced routes tie
- **WHEN** two or more minimum routes have the same best balance score
- **THEN** repeated searches select the earliest such route in the established action order

### Requirement: Route-balance certainty is reported honestly
The system SHALL distinguish a completed comparison of minimum routes from a route search stopped by its configured budget, while preserving any already-proven minimum PAR.

#### Scenario: The route-selection budget is exhausted
- **WHEN** the solver has proven a minimum route but cannot finish comparing all minimum routes within budget
- **THEN** it retains a valid minimum route and PAR, and marks balanced-route selection as incomplete rather than claiming it found the best-balanced route

### Requirement: Route reports contain replayable PAR examples
An opt-in route report SHALL provide the level identity, PAR, an ordered action sequence, north/south/east/west command counts, balance score, and route-selection completeness.

#### Scenario: A complete route report is requested
- **WHEN** route reporting is enabled for a level with a proven optimum
- **THEN** the output contains sufficient action and count detail to replay the selected route and document the PAR example

#### Scenario: The level has no proven optimum
- **WHEN** the solver returns unsolvable or unknown, or has no proven PAR
- **THEN** the report does not label any displayed route as an optimal PAR example
