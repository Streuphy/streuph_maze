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

## PAR route examples

Run `npm run levels:routes` to print replay-checked optimal routes for the
Prologue and every available `data/worlds/*.levels.yaml` pack. PAR remains the
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

The browser cannot enumerate sibling files or fetch them from a `file://` page.
Load a pack explicitly with the in-game file picker, drag-and-drop, or YAML paste
control. All three paths parse and validate the complete pack before activation;
an invalid pack leaves the current board and active world unchanged. The app
uses local classic scripts and does not require a server or network connection.
