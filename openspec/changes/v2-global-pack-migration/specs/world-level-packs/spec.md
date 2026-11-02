# World level packs specification delta

## MODIFIED Requirements

### Requirement: World progress uses world-qualified level identity
Current V2 completion, best scores, last selection, and seen-tile data SHALL remain world-qualified and separate from any obsolete-rule storage. The current store SHALL start empty and SHALL NOT read or import completion/scores from another rule contract. Existing serialized older data SHALL remain inert and untouched, not reset or merged.

#### Scenario: Same level key in two packs
- **WHEN** two current packs contain `level_1`
- **THEN** their completion, best scores, last selection, and discovery data remain independent

#### Scenario: Existing obsolete-rule data is present
- **WHEN** V2 starts with prior serialized records still present in browser storage
- **THEN** the current namespace is empty unless it already has current-format records, and the prior bytes are neither consumed nor deleted

#### Scenario: Progress import has an incompatible contract
- **WHEN** an imported progress file does not identify the supported current contract/schema
- **THEN** import rejects it without changing current records

## ADDED Requirements

### Requirement: Every pack has one V2 interpretation
Built-in, file-picked, dropped, pasted, and exported packs SHALL use the same sole V2 loader/validator/resolver interpretation. No runtime ruleset selector, fallback resolver, or alternate action/hazard semantics SHALL be retained. Unsupported obsolete selectors/fields SHALL be diagnosed, not used to dispatch another engine.

#### Scenario: Unversioned shipped YAML loads
- **WHEN** a shipped pack with the established world/level envelope is loaded
- **THEN** it executes V2 without opting into a compatibility mode

#### Scenario: Obsolete selection is requested
- **WHEN** input tries to select an unsupported resolver contract
- **THEN** validation rejects the request atomically instead of preserving another playable behavior

### Requirement: All shipped levels receive V2 certification
Release certification SHALL cover the Prologue's 13 levels and all eight levels in each of Worlds 1–6: 61 levels total. Every level SHALL have a replay-proven minimum-stroke V2 solution, matching `golf_score`, reviewed teaching text, and intended-mechanic evidence. Unsolvable or budget-limited unknown levels SHALL block completion rather than being skipped.

#### Scenario: One world is omitted
- **WHEN** a migration report lacks any shipped world/level identity
- **THEN** the release gate fails even if other packs pass

#### Scenario: Route requires an abolished recovery outcome
- **WHEN** a level depends on continued play after terminal exposure
- **THEN** its board/route/text are redesigned and re-proven rather than retaining an exception to V2

#### Scenario: A larger board exceeds search budgets
- **WHEN** bounded search reports `unknown`
- **THEN** no exact PAR or completed migration is claimed for that level; it requires a stronger valid proof or redesign

### Requirement: Pack migration preserves identities and canonical progression
World IDs, level keys, valid dimensions, and pack counts SHALL remain stable through migration. Worlds 1–6 SHALL retain eight named tutorial-to-mastery levels, with early wrong-action review. Board and text revisions SHALL be allowed where required by V2, with reasons and actual route/lesson alignment recorded.

#### Scenario: Changed semantics require a new board
- **WHEN** a migrated level needs shielding or transport changes to remain meaningful and solvable
- **THEN** its existing world/key identity is retained and its name/goal/lesson are revised coherently if needed

#### Scenario: Tutorial is solvable but has a dangerous wrong push
- **WHEN** review finds an unintended irreversible softlock in an early level
- **THEN** solvability alone is insufficient acceptance; the board is corrected or an explicit educational reset exception is reviewed

### Requirement: Prologue generation and pack exports preserve current data
The built-in Prologue source and generated YAML SHALL be semantically equivalent under the shared loader. Export tooling SHALL load all required runtime dependencies, preserve supported authoring fields, and verify results before claiming success. Browser pack export SHALL serialize authored initial data rather than transient state.

#### Scenario: Prologue is regenerated after migration
- **WHEN** current Prologue authoring is emitted to YAML
- **THEN** its 13 levels, parameters, grids, metadata, scores, and initial states reload equivalently; key-order differences alone do not imply data drift

#### Scenario: An export helper cannot simulate a route
- **WHEN** a missing dependency, failed replay, or unknown proof prevents correct generation
- **THEN** the helper reports failure rather than silently publishing an unverified score set

### Requirement: Certification records make scores and coverage inspectable
The migration report SHALL identify every level, its lesson, tile/profile set, proof status/budgets, replayed minimum route, strokes, directional counts, tie-comparison completeness, and material review findings. The theoretical world minimum SHALL aggregate only proven level minima. Authored values, personal bests, and incomplete totals SHALL remain distinguishable.

#### Scenario: A representative route comparison is incomplete
- **WHEN** PAR is proven but comparison among tied minimum routes is budget-limited
- **THEN** the minimum remains valid and the report explicitly declines a globally best-balanced claim

#### Scenario: Current replay reaches failure
- **WHEN** a printed route ends failed or does not match its claimed stroke count
- **THEN** certification fails and the route cannot count toward a complete level/world total
