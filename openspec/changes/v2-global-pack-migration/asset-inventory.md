# V2 migration asset inventory

**Status:** observed inventory plus required delivery plan, not certification.
Source: shared YAML parser/validator (`solve: false`) and live registry on
2026-11-01. All seven source packs parse/validate with the current runtime;
this is not evidence that their routes work under the proposed queue semantics.

## Pack coverage — no sampling-only completion

| Pack | Stable identity | Levels | Used tile IDs | Required review |
|---|---|---:|---|---|
| `data/levels.yaml` and `src/js/levels.default.js` | `prologue` | 13 | 0,1,2,3,4,10,11,20,22,30,34,41,42,44,45,50,60,64,70,71,80 | Recheck every tutorial/name/goal, intermediate color effects, belt shoving assumptions, portals, and closing surfaces. |
| `data/worlds/world-01-sokoban.levels.yaml` | `world-01-sokoban` | 8 | 0,1,2,3,10,23,24,25,26,27,70 | Atomic pushes, target edges, gate necessity/pending closure, safe first three levels. |
| `data/worlds/world-02-lolos-castle.levels.yaml` | `world-02-lolos-castle` | 8 | 0,1,2,3,10,23,24,25,26,27,70,81,82,83,84 | Remove routes/lessons dependent on respawn; prove shielding and no hazard-priority shortcuts. |
| `data/worlds/world-03-hyrule-flip-flop.levels.yaml` | `world-03-hyrule-flip-flop` | 8 | 0,1,2,3,46,47,48,70 | Switch ordering, crate-delayed closure, dot closure failure, full mastery search. |
| `data/worlds/world-04-pengo-vector.levels.yaml` | `world-04-pengo-vector` | 8 | 0,1,2,3,5,60,64,65,66,67,70,71 | Universal belt passengers, stationary transport on ACTION, ice entry records, rollback loops, no implicit shove. |
| `data/worlds/world-05-chips-chromatic.levels.yaml` | `world-05-chips-chromatic` | 8 | 0,1,2,3,10,11,12,13,20,22,30,31,32,33,34,35,36,41 | Per-hop prism/dial timing; matching **entry**, not stationary color equality; four carrier colors. |
| `data/worlds/world-06-goof-proximity.levels.yaml` | `world-06-goof-proximity` | 8 | 0,1,2,3,10,26,27,50,64,71,72,73,93,94,99 | Per-hop receiver contacts, OR signals, belt-driven docking, re-docking/pending-close interactions. |

**Total: 61 levels, 49 distinct used IDs, 62 registered IDs.**
Worlds 7 and 8 are not shipped packs and are not added to this migration.

Specific review hotspots already evidenced in source:

- World 2 `level_4`, `level_7`, and `level_8` explicitly teach caught pushes or
  strategic respawn in their goal text. These require board/route redesign and
  revised prose if that dependency survives the first V2 probe.
- Prologue `level_9` describes a belt shoving an object in front. The new belt
  checks its own passenger; redesign the board/lesson, not the universal rule.
- World 3 `level_8` currently declares PAR 97. Do not retain it from a bounded
  `unknown`, nor claim it is a proven V2 optimum.
- The Prologue copies have different object-key order in some levels. Compare
  semantic data, not raw JSON string order, before asserting source drift.
- Existing route examples/review notes are evidence for their original runtime,
  not proof for these changed priorities and terminal outcomes.

For **each** level deliver a certification row containing world/key/name,
dimensions, final tile/profile set, intended lesson, exact search status/budgets,
replayed minimum route/strokes, direction counts, tie-comparison completeness,
failure/closure/loop findings, wrong-push review for early levels, and board/text
changes. `unknown` is a release blocker for that level, not success. Maintain
all 61 rows even when a board needs no changes.

## Code, UI, and tool ownership

| Asset | Required disposition |
|---|---|
| `src/js/sm-rules.js` | Replace policy branching/flat force settlement with one V2 transaction scheduler; closure, terminal state, snapshot/clone/search identity, and events. |
| `src/js/sm-entities.js`, `src/js/sm-board.js` | Common layer/occupancy/destination helpers and atomic relocations, including dot and movable features. |
| `src/js/tiles.js` | Complete definition metadata; four colors; neutral-tint belt schema; queue hooks; no passenger-kind split or obsolete floor-color policies. Preserve generic IDs, not incompatible semantics. |
| `src/js/levels.js` | One interpretation, supported authoring only, terminal-aware solver, exhaustive minimum proofs, result/route diagnostics, no compatibility selection. |
| `src/js/levels.default.js` | Migrate the 13-level Prologue source and keep generated YAML equivalent. |
| `src/js/sm-yaml.js` | Shared declarative parser/emitter round trips, including empty lists/mappings; retain compatible bug fixes. |
| `src/js/sm-store.js` | Fresh current progress namespace; no reading/importing older-rule completion or scores. Existing serialized data remains inert and untouched. |
| `src/js/sm-ui.js`, `src/js/sm-io.js` | Sole controls/help/loading; failed-state input/undo blocking and restart; accurate score/status labels; common offline activation/export. |
| `src/js/sm-render.js`, `src/js/sm-glyphs.js`, `src/css/sm.css` | Passive event playback, visible terminal/pending-close states, unique cardinal exit arrows, tint-neutral movement; retain unrelated presentation colors. |
| `index.html` | Load dependencies in classic-script order; failure/restart UI, complete control affordances, current-only help and score labels. |
| `glyphs.html` | Replace heuristic ES-module harvesting with the actual classic-script registry/glyph API; include ID 0, actual registered IDs, the dot, variants, and state examples under `file://`. |
| `scripts/emit-levels-yaml.js` | Load all common runtime dependencies (currently missing board/entity dependencies); safe Prologue generation and replay-verified score regeneration before writing. |
| `scripts/report-par-routes.js` | Evaluate only V2; report all 61 rows, terminal-aware replay, exact PAR, tie completeness, and nonzero exit on missing certification. |
| `tests/verify.js`, `tests/unit/registry.js`, `tests/unit/v2.js`, `tests/browser-test.js` | Replace obsolete outcome assertions; cover all registered entries, queue boundaries, rollback, terminal lifecycle, all packs, gallery, and local loading. Preserve useful generic regressions. |
| `package.json`, `package-lock.json` | Keep existing commands valid; add no dependency without demonstrated need. Lock changes only if a justified manifest change requires them. |

## Maintained documentation and contracts

Rewrite/update `README.md`, `AGENTS.md`, `docs/GAME_RULES.md`,
`docs/Product_Design_Document.md`, `docs/engine-architecture.md`,
`docs/world-level-packs.md`, `docs/level-design/tile-mechanics.md`,
`docs/level-design/world-authoring-checklist.md`,
`docs/level-design/worlds-blueprint.txt`,
`docs/level-design/world-1-sokoban.txt`, and
`docs/level-design/world-5-chromatic-route-review.md` as applicable to the sole
current contract. Reconcile `docs/level_editor_Proposal.md` as future YAML-only
design guidance, not a second source of executable rules or an implemented editor.

Update all eight accepted capabilities through reviewed deltas; add the queue
and conveyor capabilities. Coordinate the active World 1, World 4, and PAR-route
plans so they cannot demand contradictory outcomes. Mark the paused
`v2-rule-set` as superseded with incomplete progress preserved; do not keep it as
an active apply target or falsely declare its outstanding tasks complete.

**Cleanup boundary confirmed by the user:** remove obsolete-rule references,
selection branches, and executable-only compatibility from maintained assets.
Historical `openspec/changes/archive/**`, `docs/design-history/**`, and clearly
retired/superseded proposal records remain unchanged and non-authoritative.
Do not rewrite `.git` history, tags, dependencies, or `.opencode` harness skills.
`docs/Nouveau document` is unclassified user work, not assumed disposable or a
maintained product reference. The pending World 6 archive move is separate user
work and must not be reverted or swept into this migration automatically.

Audit semantics as well as words: removed behavior includes recoverable hazard
reset, final-rest-only entry dispatch, alternate ruleset dispatch, passenger-kind
belt shoving, and old-progress import. Do not blindly delete parser diagnostic
labels such as `V1`/`V2` merely because their numeric validation codes resemble
rule-version names; rename them only as a deliberate diagnostic cleanup.
