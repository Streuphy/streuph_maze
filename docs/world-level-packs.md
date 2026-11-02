# World level packs

A world is an independently loadable YAML pack. Imported packs must have a
stable, lowercase `world_id` slug, a display `name`, a matching `num_level`, and
contiguous `level_1` through `level_n` records. Each level's `name` is shown in
the level selector. The built-in Prologue is the sole exception: its existing
document shape has no `world_id` and is assigned the reserved internal identity
`prologue`.

## Canonical YAML shape

```yaml
name: "Sample World"
world_id: sample-world
num_level: 1
levels:
  level_1:
    name: "First Steps"
    goal: "Walk to the exit."
    width: 2
    height: 2
    golf_score: 2
    grid:
      - [0, 2]
      - [1, 0]
```

`grid` rows are written **top-first**: the first row is the board's highest
row, while game coordinate A1 is the bottom-left cell. Grids must be rectangular,
match their declared `width` and `height`, and fit within 16 columns by 9 rows.
Every cell is an integer ID for a registered, implemented tile. `golf_score` is
the minimum number of player strokes; the validator uses the same resolver and
solver as gameplay to check it.

## V2 authoring contract

V2 is the sole runtime interpretation, tracked in
`openspec/changes/v2-global-pack-migration/`. There is no pack or level runtime
selector. Unsupported selectors, floor-tier fields, and prototype prerequisite
fields are rejected rather than silently choosing different behavior. The
content/math migration covers all 61 levels; final verification/acceptance is
tracked separately in the per-level ledger and asset checklist.

```yaml
name: "V2 Example"
world_id: v2-example
num_level: 1
levels:
  level_1:
    name: "Declared capabilities"
    goal: "Reach the matching exit."
    width: 4
    height: 2
    initial_player_colour: wht
    initial_world_colour: wht
    object_overrides:
      B1: { pullable: true }
    grid:
      - [0, 0, 0, 2]
      - [1, 70, 0, 0]
```

This is a schema example, not a claimed optimum route. The optional
`initial_player_colour` and `initial_world_colour` default to White and accept
only `wht`, `red`, `gre`, and `blu`. Black/mute are presentation colors only.
The goal marker always follows the world. Crate movement comes from declared
capabilities, not crate color or supporting-floor tint. ID 5 selects ice
explicitly. Standalone imported world levels remain directly selectable;
this migration adds no prerequisite authoring feature.

The registry declares category/layer, physical-closure metadata, named hooks,
and supported parameter defaults. Conveyors (IDs 60–67) are floor tiles with
`colour: wht` and one exact unit `dir` vector: North `{x: 0, y: 1}`, East
`{x: 1, y: 0}`, South `{x: 0, y: -1}`, West `{x: -1, y: 0}`. These vectors
name the exit, not the entry side. Tint accepts the four colors but has no
mechanical effect; no passenger-kind parameter selects different transport.

## PAR route examples

The Prologue authoring source is `src/js/levels.default.js`. After reviewing its
boards and proven scores, `npm run levels:emit` validates/proves/replays all
13 levels and checks the emitted round trip **before** an atomic YAML write.
`npm run levels:emit -- --check` performs those checks and semantic JS/YAML
comparison without writing. `--pars` reasserts proven values but refuses to
publish a generated score that disagrees with the reviewed JS source; update
that source first. Supported profiles, initial colors, overrides, and victory
art are preserved, not reduced to a hand-picked subset of keys.

The queued Prologue migration regenerated and semantically checked all 13
levels; see [its complete route/design review](level-design/v2-prologue-route-review.md).
`Cargo current` (level 9) is now PAR 13. Levels 4/6 guard tutorial wrong actions,
level 8 requires its portal, and optional demonstrations are explicitly labeled.
World identities, keys, overrides, and the embedded level-2 victory PNG remain
intact. Final browser/Chromium and remaining release checks are separate
gates, not implied by a successful generation command.

Use `npm run levels:routes -- --early-review` to include bounded reverse
reachability checks for every shipped first-three-level group. An incomplete
review or a nonterminal deadlock blocks that report's proof-complete status.
Visible terminal hazard mistakes are counted separately, not mislabeled as
hidden playing-state softlocks. Manual wrong-push/lesson review is still required.

Run `npm run levels:routes` to print replay-checked optimal routes for the
Prologue and all six shipped `data/worlds/*.levels.yaml` packs. Unexpected/missing
shipped files fail the manifest check rather than silently changing coverage. PAR remains the
minimum stroke count. When several routes share that optimum, the solver chooses
the one with the lowest squared deviation from an even split of up, down, left,
and right commands. The score is
`(U - T/4)^2 + (D - T/4)^2 + (L - T/4)^2 + (R - T/4)^2`, where
`T = U + D + L + R`.

Count each explicit move or pull command once in its commanded direction. ACT
and automatic conveyor/ice/portal movement do not add a direction count. If
multiple minimum routes have the same score, the first route found in the
solver's fixed breadth-first action order wins. The report distinguishes a
complete comparison from one stopped by the solver's route-search budget; an
incomplete result is still a proven minimum route/PAR, but is not claimed to be
the globally best-balanced route. Replay a printed route and keep mechanic,
safety, and intended-lesson review separate from this direction-balance
tie-break.

The command enumerates the fixed seven-pack/61-level shipped inventory. Missing,
invalid, unknown, unsolvable, unreplayed, or wrong-declared-PAR rows cause a
nonzero exit; every expected identity is still reported. Use `-- --json` for
structured evidence, or `-- --output=docs/level-design/v2-pack-proofs.json` to
write generated evidence. Existing non-generated JSON is never overwritten.
`--max-states=N`, `--max-depth=N`, and `--max-route-labels=N` expose proof budgets.
Reports include per-level digests, engine fingerprint, exact routes/counts,
initial actor profiles, and comparison completeness. Mathematical evidence does
not replace the separate lesson, hazard/closure, and early wrong-push ledger.

Run `node scripts/audit-v2-assets.js` for the maintained-asset release audit:
registry/usage coverage, current guidance/dispatch, seven-pack inventory, fresh
proof evidence, and all 61 design-review rows. Historical archives/design history
and harness/dependency internals are preserved, not rewritten. Parser validation
labels are not treated as alternate engines. During review, `--preaccept` reports
obsolete accepted-spec guidance as an explicit deferred synchronization item;
it never bypasses missing proofs or pending design reviews and cannot report
`releaseReady` while synchronization is still deferred.

The [verification record](level-design/v2-verification.md) separates actual Node/
jsdom results from the native Chromium `file://` gate. Run the optional
`node scripts/verify-v2-chromium.js` with a Chromium executable and Node built-in
WebSocket to refresh native source/engine/presentation-bound evidence. It uses
the real file-input/paste/export UI and renderer, not a game server or jsdom.

Search considers cardinal movement, explicit eligible pulls, and ACTION. An authored
`golf_score` is a **declared** value until the real resolver's solver proves and
replays the minimum. A personal best is a separate successful-run record, not a
proof of optimum. State, depth, route-label, and unsupported-transition limits
report `unknown` rather than `unsolvable`; only exhaustive search establishes
impossibility. A proven PAR survives incomplete comparison among tied routes,
but that representative must not be called globally best-balanced.

## Relevant tile IDs

- `0` floor, `1` start, `2` exit, and `3` wall.
- `10`, `26`, and `27` are phase walls on links 1, 2, and 3 respectively.
- `23`, `24`, and `25` are momentary crate-occupancy targets on links 1, 2, and
  3. A crate activates a target only while on its cell; standing next to it does
  not. This differs from receiver ID `50`, which senses adjacent matching-color
  crates.
- `70`–`73` mark white, red, green, and blue movable crate entities. An authored
  crate marker is normalized to ordinary floor beneath the movable crate. Put
  the target in a separate grid cell and push the crate onto it during play.

Tile IDs and link defaults are defined in `src/js/tiles.js`. Because `overrides`
are keyed by tile ID, every occurrence of one ID shares its override values;
use link-specific variants when a level needs separate links.

World YAML remains data-only: tile IDs select definitions and overrides select
registered parameters or per-entity capabilities. Rule strategy names, handler
code, and presentation descriptors are not authored in YAML. The shared
`levels.js` loader validates values against the active tile catalogue before
normalizing or activating a pack.

## Loading under `file://`

Progress is separate from authoring. The current store requires contract
`v2-queued`, schema 1, and uses a fresh V2 storage namespace. Prior-rule records
are not read/imported and their stored bytes are not deleted. Current records
remain world-qualified. Rejected imports preserve active current data, and
reset touches only current storage. Use progress **JSON** Export/Import for
durable backups if local storage is denied or full. This does not introduce JSON
level packs: authored worlds remain **YAML**. Memory fallback lasts only for the
current session; an authored or personal score is not a proof of minimum PAR.

The browser cannot enumerate sibling files or fetch them from a `file://` page.
Load a pack explicitly with the in-game file picker, drag-and-drop, or YAML paste
control. All three paths parse and validate the complete pack before activation;
an invalid pack leaves the current board and active world unchanged. The app
uses local classic scripts and does not require a server or network connection.
