# Prologue: queued V2 content review

Design/math review of the built-in source, `src/js/levels.default.js`. This is
not the final jsdom/Chromium or accepted-spec gate. Generated all-pack evidence
is published in `v2-pack-proofs.json`. Stable identity is
`prologue::level_n`; there are 13 levels, not an eight-level canonical world.

## Method and scope

All minima below were solved with the actual `SM.LEVELS.solve` and replayed
through `SM.RULES.resolveTurn` to `won`, never `failed`, at the exact stroke
count. Budgets: 250,000 states, depth 200, 250,000 route labels. All tied-route
comparisons completed. U/D/L/R counts exclude ACT and automatic hops; ACT still
costs a stroke. Counts are in **U,D,L,R** order. `tests/unit/pack-migration.js`
checks every minimum, replay, lesson event, and the counterfactuals below via the
shared validator/resolver. No alternate simulator or color-dependent mobility.

Every board uses the default dot profile and initial White P/W. All crates are
pushable, not pullable, conveyor-enabled, portal-disabled, and ray-blocking. No
movable feature profiles or object overrides occur here. IDs/coordinates below
are authored, with A1 bottom-left. Starts are safe: these boards have no emitters.
Gate checks use current carriers, not future prism effects. Snapshot/clone/undo,
pending closure, and immediate goal checkpoints have separate rules regressions.

For levels 1–7 we also enumerated all reachable settled playing/winning states
with a 20,000-state budget and reverse-marked those that can win without undo or
restart. Final state counts are 21, 76, 15, 15, 150, 61, 72 respectively, with
**zero unwinnable playing states, terminal failures, or diagnostic aborts**.
Blocked attempts and duplicate stable rest states are not new states. This
supports, rather than replaces, the wrong-action reviews below.

## Levels 1–7

| Review | Dimensions; IDs | PAR; selected route | U,D,L,R | Search states / labels |
|---|---|---|---|---|
| P01 | 5×5; 0,1,2,3 | 8; `U U U U R R R R` | 4,0,0,4 | 20 / 20 |
| P02 | 5×5; 0,1,2,3,11,20,34 | 8; `R R U U U R U R` | 4,0,0,4 | 35 / 35 |
| P03 | 5×5; 0,1,2,3,64 | 6; `R R U U U U` | 4,0,0,2 | 16 / 16 |
| P04 | 6×4; 0,1,2,3,30,50,71 | 8; `R R R U R R U U` | 3,0,0,5 | 14 / 14 |
| P05 | 8×5; 0,1,2,3,30,41,44 | 9; `U R R R R R R R D` | 1,1,0,7 | 121 / 139 |
| P06 | 8×5; 0,1,2,3,10,30,41,42 | 11; `U R R U U R R R R R U` | 4,0,0,7 | 60 / 60 |
| P07 | 8×5; 0,1,2,3,10,41 | 11; `U R U U R R R R R R U` | 4,0,0,7 | 71 / 71 |

### P01 — First steps

Unchanged board/PAR. Only walking and wall detours; all accessible branches
rejoin. Wrong directions block or backtrack, and resting has no hidden effect.
White matching **entry**, not waiting, finishes the route. No links or hazards.

### P02 — Two colours

Board/PAR and embedded PNG unchanged; goal wording now explicitly says entry.
The minimum enters C2's cycle dial and C4's red prism before D5's world gate.
Both the dial and prism are essential: separately removing either makes the
board unsolvable. Extra dial turns can be repaired by cycling again; the gate
blocks mismatched approach without failing. Dead-end west/east pockets remain
escapable; the complete early-state enumeration confirms color recovery.

### P03 — Conveyor

Board/PAR unchanged. Text now describes the arrow's **exit**, not an ambiguous
"one tile per stroke" rate. The minimum crosses C1/D1 and commits both free
East hops. Replacing belts with floor raises PAR from 6 to 8. Wrong entries can
return across ordinary floor; no belt loop or front object exists.

### P04 — Loader

Keep the 6×4 identity and PAR 8. The old B2/C2 alcove let a player get east of
an early crate and push it irretrievably into A1 (`R U R R D L` began that
deadlock). Walled B2/C2 and the now-unused B3/C3 pocket: the first crate lesson
now only permits useful forward pushes until the crate parks at E1. This
minimal guard removes all 19 previously unwinnable playing states; all 15 final
states can win. F1 stops overshoot. The shortest route makes receiver E2 active
from its matching red neighbor E1, opening F2's White-P gate on link 1. Removing
either the receiver or crate makes the board unsolvable. The dot can walk over
the receiver but cannot activate it. No hidden pull, target, or ray lesson.

### P05 — Keys and masters

Board/PAR unchanged. C2's link-1 key is necessary; removing it makes the board
unsolvable. The minimum uses H2 and enters H1; G1 prevents a gate bypass. B3's
master is an **optional inspection/experiment**, not a second minimum-route
requirement: removal leaves PAR 9. It forces locks closed rather than opening
every gate. Occupied ACTION releases it again; the revised goal text says so.
Wrong master/key toggles remain repairable and cannot close under a remote dot.
This explicit optional demonstration is retained instead of pretending PAR
teaches both switches.

### P06 — Hold and release

Keep PAR 11 and key C2 (link 1), phase gate G4, and the optional link-2 plate
demonstration. Moved the plate **G3 → F3**, leaving G3 safe floor. Previously the
instruction encouraged moving directly onto H3 as its plate released, causing
immediate closure failure. Now F3 opens H3 while inspected; stepping to G3
releases it, and the subsequent East command blocks for free on the already
closed gate. A regression replays that exact experiment without terminal loss.
The minimum uses the latched link-1 route, never plate link 2. Removing the key
makes the board unsolvable; removing the plate leaves PAR 11. Goal text honestly
labels the plate optional. No gate-bypass or educational-reset exception is
needed; all 61 reachable final states retain a winning continuation.

### P07 — Hinges

Unchanged board/PAR. B2's key opens H4's phase wall (link 1, no carrier filter).
Removing the key makes the board unsolvable. G5 and G3/H3 walls prevent walking
around H4; the minimum crosses it and enters H5. Repeated key entries/ACT can
be corrected before approach; no remote switch can close beneath the dot.

## Levels 8–13

| Review | Dimensions; IDs | PAR; selected route | U,D,L,R | Search states / labels |
|---|---|---|---|---|
| P08 | 8×6; 0,1,2,3,11,20,34,80 | 12; `R R R R R U R R R R U U` | 3,0,0,9 | 125 / 126 |
| P09 | 8×5; 0,1,2,3,30,50,60,71 | 13; `U U R R U U R R R D R R U` | 5,1,0,7 | 337 / 384 |
| P10 | 16×9; 0,1,2,3,71 | 27; `R U R R U U L L U U U U R U R R R R R R R R R R R R R` | 8,0,2,17 | 2080 / 2177 |
| P11 | 16×2; 0,1,2,3,30,41 | 16; `R R R R R R R R R R R R U R R R` | 1,0,0,15 | 39 / 39 |
| P12 | 16×9; 0,1,2,3,10,11,22,34,41,44,70 | 27; `R R R U U D D R R R R U R U U U U R R R R R R U U R U` | 10,2,0,15 | 472 / 472 |
| P13 | 4×1; 1,2,4,45 | 4; `R ACT R R` | 0,0,0,3 | 5 / 5 |

### P08 — Short cuts

Previously the portal tied a walking route around the lower chamber, so a
minimum route could omit the level's named mechanic. Row 2 is now a solid
divider: the D1/B3 pair is the only connection between chambers. PAR remains
12. The selected route teleports exactly once, then visits the world dial and
red prism, passes H5's world-color gate, and enters H6. Portal removal makes
the board unsolvable. Arrival at B3 does not bounce back, but re-entering it
manually remains legal. No transport is carried into another command.
Complete recovery review: 136 states, zero unwinnable playing states, failures,
or diagnostic aborts. Repeated cycling/backtracking remains recoverable.

### P09 — Cargo current

Renamed from the abolished front-shoving lesson. The crate at C3 is **itself**
pushed onto D3's East floor conveyor and carried to E3, beside receiver F3.
This is common passenger transport; there is no frontal shove or crate-only
belt. Link 1 opens H4's White-P gate, with G5/G3/H3 preventing an exit bypass.
The dot takes the upper detour after pushing; the gate remains open because
the settled red crate still contacts its receiver.

Added walls D4 and F2 to remove tied manual overshoot/re-dock bypasses. Final
minimum is **13**, formerly 11. Replacing the conveyor with floor raises it to
15; removing the receiver makes the board unsolvable. Thus the actual minimum
uses and benefits from the conveyor, rather than merely displaying it.

This ninth tutorial deliberately retains push-planning consequences, not an
early safe tutorial promise: complete review found 531 unwinnable playing
states among 835 reachable states, with zero terminal failures/aborts. Examples
include pushing the crate north away from its dock (`U R R U U`) or overshooting
onto the receiver (`U U R R R R`). Those are ordinary wrong pushes, recoverable
with player undo or restart, not exposure or a queued cycle. The route review
does not claim global deadlock freedom for this advanced crate lesson.

### P10 — The long way round

Unchanged board/PAR. The minimum navigates fixed walls and deliberately walks
around the spare crate; removing that crate leaves PAR 27. The name/goal already
allow walking around it instead of mandating a push, so the crate is an
**optional obstacle/experiment**, not the defining mechanic. The only authored
override makes the crate White; this does not grant pulling or strength.

Complete review: 3821 reachable states, including 127 unwinnable playing states
after avoidable crate pushes, no terminal failures/aborts. A representative
wrong sequence is `R U R R R U R U L L`; the player can push the crate into a
route-blocking position. This advanced maze intentionally permits nonterminal
undo/restart recovery, unlike the first four guarded lessons. No progress is
awarded unless the real matching goal entry occurs.

### P11 — Corridor

Unchanged board/PAR. The goal now explicitly identifies the key/upper gate as
optional: a lower-lane bypass exists, and removing the gate leaves PAR 16.
This is a two-row wall-detour/layout lesson, not a falsely mandatory key puzzle.
The selected minimum visits M1's link-1 key then crosses M2's gate; H2's wall
prevents a straight upper-lane route. Complete review: all 61 reachable states
can win; no failures or diagnostic aborts. Color stays White.

### P12 — Colophon

Unchanged board/PAR. Corrected the unsupported "two links" claim: there is one
key/phase-gate link, red prism D3, and idempotent red set dial D2 on that link.
Individually removing the key, prism, or set dial makes the board unsolvable.
The minimum returns from the prism to the dial before crossing H1 and later
O7's world-red gate; it never depends on stationary equality at P9.
The M5 master and spare A3 crate are explicitly optional experiments: removing
the master leaves PAR 27, and the shortest route never pushes the crate. The
master forces gates shut; it is not another link or a color switch. Complete
review: all 533 reachable states can win, no terminal failures or aborts.

### P13 — Void and passage

Unchanged board/PAR. Entry onto B1 latches the master void switch, closing C1.
Occupied ACTION releases it; the final two East commands cross reopened void
and enter the matching goal. The ACT is essential on the minimum; direct East
while C1 is closed blocks without strokes/propagation. Removing the switch
changes PAR to 3 by removing the obstacle's control, not by restoring another
ruleset. Complete review: all six reachable states can win, no failure/abort.
Closure beneath a dot/crate on phase void is covered by the common rules tests;
this board does not disguise that failure as a recovery teleport.

## Completion boundary

These entries certify content design and mathematical routes only.
`npm run levels:emit` regenerated the YAML from this reviewed source, and
`npm run levels:emit -- --check` then verified all 13 replayed minima and full
shared-parser semantic equality without writes. Overrides and the unchanged
embedded level-2 PNG survive. Passing repository and real Chromium checks are
recorded in `v2-verification.md`; accepted-spec synchronization remains separate.
