# Golf scores specification delta

## Purpose

Defines V2 level and world minimum-stroke scores, player best scores, and honest reporting when bounded search cannot prove an optimum.

## ADDED Requirements

### Requirement: V2 rounds charge at most one initiating stroke
A committed V2 directional action SHALL cost one stroke, including an automatic pull or chain push. A blocked direction with no committed gameplay change SHALL cost zero. ACTION/REST SHALL cost one even with no activatable neighbor. Automatic movement, effects, and respawn SHALL add no strokes; undo, restart, inspection, and UI navigation SHALL NOT be game strokes.

#### Scenario: Chain and ice remain one stroke
- **WHEN** one direction pushes several crates and triggers ice, conveyor, or portal substeps
- **THEN** the round costs one stroke in total

#### Scenario: Blocked direction is free
- **WHEN** a wall or illegal object transaction prevents the directional action from committing
- **THEN** no stroke is charged and the board is unchanged, apart from the non-gameplay turn-attempt counter

#### Scenario: Rest and catch do not double charge
- **WHEN** ACTION has no activation effect or causes a catch and respawn
- **THEN** it still costs exactly one stroke

### Requirement: Level PAR requires a replayable minimum-stroke proof
An exact V2 level PAR SHALL be the minimum stroke count proven by search over the same five actions and resolver as play. Its route SHALL replay to the settled matching-color goal with that stroke count. Authored `golf_score` and player best SHALL remain distinct from a proven minimum. Directional balance SHALL NOT change minimum-stroke priority.

#### Scenario: Replay validates a claimed optimum
- **WHEN** the solver reports a V2 minimum route
- **THEN** replay uses only four directions and ACTION, reaches a settled win, and records the reported stroke count

#### Scenario: Authored value is not proof
- **WHEN** a level declares `golf_score` but no complete minimum proof is available
- **THEN** the interface labels the value as declared or unverified rather than solver-proven

#### Scenario: Directional balance is only a tie-break
- **WHEN** routes have different stroke counts but the longer route has more balanced directional commands
- **THEN** the shorter route remains the PAR route

### Requirement: Search limits do not prove impossibility
Search SHALL report `unknown` when a state, depth, route-label, or transition-evaluation limit prevents proof of either a minimum solution or exhaustive impossibility. `unsolvable` SHALL require exhaustive supported-state search. A proven minimum with incomplete comparison of tied routes SHALL remain `solvable`, with comparison completeness reported separately.

#### Scenario: Depth truncation cannot establish unsolvability
- **WHEN** unexplored successors remain beyond the depth budget and no solution has been proven
- **THEN** the result is `unknown` with no exact PAR

#### Scenario: Unsupported transition prevents proof
- **WHEN** a transition cannot be evaluated correctly during search
- **THEN** search does not silently discard it and claim exhaustive unsolvability or a proven optimum

#### Scenario: Tied-route comparison is incomplete
- **WHEN** the minimum stroke count is proven but the equal-minimum balance comparison hits its budget
- **THEN** that PAR remains valid and the comparison is explicitly incomplete

### Requirement: World PAR is the sum of independent level minima
The exact V2 world golf score SHALL equal the sum of proven minimum-stroke scores for all levels in the pack. Each level SHALL start from its own authored initial board; unlock prerequisites SHALL NOT transfer board state or add strokes. If any level lacks a proven minimum, the world total SHALL NOT be labeled exact.

#### Scenario: All level minima are known
- **WHEN** all levels have replay-verified minima
- **THEN** the world PAR equals their sum regardless of the order in which available levels are played

#### Scenario: A level is unknown or unsolvable
- **WHEN** at least one level has an unknown result or is proven unsolvable
- **THEN** the world reports that status and any partial sum without claiming a complete exact world PAR

### Requirement: Player best totals remain distinct from theoretical minima
Successful V2 runs SHALL update the ruleset-qualified level best only when their stroke count improves it. The player world best SHALL sum level bests only when every level has been cleared; otherwise the interface SHALL label the aggregate partial and show its completed-level count. Unrelated rulesets and worlds SHALL NOT contribute.

#### Scenario: Worse replay preserves the best
- **WHEN** a cleared level is completed again with more strokes
- **THEN** its saved best and the derived world best do not increase

#### Scenario: Partial world progress is not a complete score
- **WHEN** two of three levels have saved bests
- **THEN** the interface displays a two-of-three partial total, not a completed-world best

#### Scenario: No persistent storage is available
- **WHEN** browser storage is unavailable under `file://`
- **THEN** scores remain usable for the session and existing progress export/import remains the durable fallback
