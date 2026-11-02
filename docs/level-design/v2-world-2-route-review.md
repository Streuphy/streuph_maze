# World 2: queued V2 shielding review

> **2026-11-02 status follow-up:** Contract-sync statements below describe the
> content-certification checkpoint. The ten V2 deltas are now synchronized;
> current audit/approval dependencies are in the [verification follow-up](v2-verification.md#documentation-review-follow-up--2026-11-02).
> Board/route evidence below is unchanged, not a new browser run.

Source `data/worlds/world-02-lolos-castle.levels.yaml`, stable world identity
`world-02-lolos-castle`, eight levels. No timer, sweeping beam, or continued
play after exposure. All listed proofs use the real solver/resolver, not a
recovery simulator. Final repository and Chromium checks remain separate.

## Levels 1–3

The original goals sat on exposed ray cells and could be entered immediately
for two-stroke victories, bypassing their shields. Each goal now sits **one row
beyond** the ray. A successful approach must settle safely on the crossing
before goal entry; goal priority is unchanged. Walls above/right of the emitter
prevent going around the ray into the goal chamber. A wall east of the initial
crate blocks lateral wrong pushes without obstructing its west-side return lane.
The boards retain world/key identities, names, dimensions, and one shield each.
Level 3's old "slide east" text is replaced: no automatic slide exists here.

| Review | Board; IDs | PAR; route | U,D,L,R | Search states / labels |
|---|---|---|---|---|
| L01 | 5×5; 0,1,2,3,70,84 | 7; `R R U L U L U` | 3,0,2,2 | 20 / 23 |
| L02 | 7×5; 0,1,2,3,70,83,84 | 7; `R R U L U L U` | 3,0,2,2 | 21 / 23 |
| L03 | 9×6; 0,1,2,3,70,83,84 | 11; `R R R R U L U L L L U` | 3,0,4,4 | 37 / 38 |

Budgets: 250,000 states, depth 200, 250,000 route labels. Every minimum was
replayed to `won` at the authored PAR without failure/abort. Every balance
comparison completed. P/W remain White; the only object profile is the default
White pushable/not-pullable, ray-blocking crate. No target, gate, link, transport,
or profile override is hidden in these three lessons.

### L01 — First Medusa

Move below C2 and push North, parking the shield at C3. The settled dot at C2
is outside the West ray; the crate stops the ray before its own cell. Return
west, cross the protected A3/B3 cells, then enter goal A4. C4's wall prevents
north overshoot, and D2 prevents lateral pushes from stranding the shield.
No intended fatal action occurs. Trying the ray before shielding deliberately
fails and requires restart; it does not teleport the player or preserve a
playable post-exposure board.

### L02 — Crossfire

Same guarded approach, now with a South emitter at C5 as well as G3's West
emitter. C3's shield blocks both crossing rays, protecting C2 below it and the
west return. The North/South corridor above the crossing is not an escape
around the goal. The secondary ray does not add strokes to PAR; it constrains
alternative crate moves: pushing the parked shield east or north exposes the
dot on column C, instead of granting an extra recovery route. Both sources are
real fixed beams, not timers or colored gate filters.

### L03 — Crossing Lines

The wider variant moves the intersection to E3, with South emitter E6 and West
emitter I3. Push E2 → E3 from E1, then return west to A3 and A4's exit.
F2 prevents sideways wrong pushes; the upper E-column is exposed rather than
an upper bypass. This scales the route while retaining the same inspected
cardinal-intersection lesson, not unsupported diagonal movement or ice.

## Necessity, wrong-action, and start review

For each board, removing the crate **or** changing its profile to `ray: ignore`
makes the board unsolvable. Removing the primary West emitter reduces PAR to
3 (direct North approach), proving the shield is not decorative under immediate
goal priority. Secondary South rays constrain alternatives, not additional PAR.
All starts are outside active rays; intended pushes keep the dot safe in their
settled state. The final winning entries do not rely on skipping an earlier
unsafe crossing. `tests/unit/pack-migration.js` checks all these counterfactuals.

Complete 20,000-budget reverse-reachability review found 36, 30, 40 playing/won
states respectively, with **zero unwinnable playing states or diagnostic
aborts**. Terminal hazard transitions (6, 10, 12) are counted separately. Manual
review confirms guarded lateral pushes, safe return lanes, and no north/top
bypass. This preserves the safe puzzle lesson while honestly retaining visible
exposure mistakes as the world's restart lesson, not hidden softlocks.

## Levels 4–6

| Review | Board; IDs | PAR; route | U,D,L,R | Search states / labels |
|---|---|---|---|---|
| L04 | 10×8; 0,1,2,3,10,23,70,84 | 20; `R R U L U L U U R U R R R R R R D R R U` | 6,1,2,11 | 320 / 333 |
| L05 | 12×8; 0,1,2,3,70,81,82,83,84 | 15; `U U R R R R R U L U L L L L U` | 5,0,5,5 | 85 / 91 |
| L06 | 14×6; 0,1,2,3,70,81,83,84 | 18; `U R R R R R R R U L U L L L L L L U` | 4,0,7,7 | 140 / 170 |

Same proof/replay budgets as levels 1–3; all comparisons complete, all intended
routes won with zero failed/aborted transitions. Default White P/W and crate
profiles remain unchanged. No ray transport is configured.

### L04 — The Unhurried Exit

Replaced the caught-push board rather than preserving its fatal push or merely
lowering its score. The lower C2 shield moves North to C3, blocking West
emitter J3 while the dot returns through A3 and A4 into the upper room. A
**separate** upper crate moves B5 → C5 target 23, opening J5/link 1. D5 and
I6 walls force the real raised detour through J5 before goal J6. Both crates
matter, but do not introduce a new mechanic: shield placement is from this
world and target occupancy is familiar World 1 behavior.

A one-crate shield/target combination was rejected during review because it
made the ray redundant to the optimum. In the final board, removing the primary
ray reduces PAR 20 → 16; removing target 23 makes the board unsolvable;
making the shields ray-transparent makes it unsolvable. Thus neither ray nor
target is merely decoration. Target occupancy never depends on dot adjacency
or a continued failed action. There is no timer on the gate.

The source retains 10×8 dimensions and its stable key/name; final PAR is 20.
Complete recovery review: 502 reachable playing/won states, none unwinnable,
64 visible terminal hazard transitions, no diagnostic aborts. C4/D2 stop the
initial lower-crate wrong pushes; D5 stops target overshoot. All intended
settled dot positions are safe, including the upper detour and final entry.

### L05 — Four Medusas

Goal A6 moves beyond the West ray row A5–K5, and the upper walls prevent a
goal-priority bypass. Push F4 → F5 at the intersection with South emitter F8,
then return west below the ray and cross to A6. G4 guards lateral pushing.
The two side turrets A7 East and J1 North remain **wall-occluded scenery**,
explicitly labeled in the goal text, not falsely necessary hazards. Their
occluding walls B7/J2 must remain in place. The two active rays retain fixed
cardinal directions; the South ray constrains unsafe alternative shield moves
rather than adding minimum strokes.

Primary-ray removal reduces PAR 15 → 5; removing the shield or making it ignore
rays makes the board unsolvable. The original four-UP exposed-goal bypass no
longer wins: it fails before reaching the goal. Complete recovery review:
99 playing/won states, zero unwinnable playing states, 17 terminal exposure
transitions, no aborts. No intended failure or automatic recovery remains.

### L06 — Still Corridor

Move H3 → H4 into N4's West ray, then use the lower row-3 return aisle to
A4 and goal A5 beyond it. I3 prevents sideways shield mistakes, and the solid
upper bank prevents an above-emitter bypass. Existing E6 South and K1 North
sources are **occluded scenery**, not moving rays or extra required shields.
The defining corridor beam is N4 West; removing it lowers PAR 18 → 4.
Removing the crate or making it ray-transparent makes the board unsolvable.

All 349 reachable playing/won states retain a winning continuation; 33 terminal
exposure transitions are visible mistakes, with no diagnostic aborts. The
minimum contains one safe North push and no post-exposure continuation. This
is the intended distance/remix of a fixed corridor ray, not the historical
blueprint's timed/sweeping barrier.

## Levels 7–8

Replaced their impossible continued-after-exposure routes with alternating
safe-side approaches to the same registered targets and linked gates. Keep
16×9 dimensions and stable names/keys; level 7 retains two shields/two emitters,
level 8 three shields/six registered emitters. No new tile IDs or capabilities.

| Review | Board; IDs | PAR; route | U,D,L,R | Search states / labels |
|---|---|---|---|---|
| L07 | 16×9; 0,1,2,3,10,23,24,26,70,84 | 31; `R R U L U L U U R R R R R R R D L D L D D R R R R R R R R R R` | 4,4,4,19 | 250 / 268 |
| L08 | 16×9; 0,1,2,3,10,23,24,25,26,27,70,82,83,84 | 39; `R R U L U L U U R R R R R R R D L D L D D R R R R R R R U L U L U U R R R R R` | 8,4,6,21 | 409 / 415 |

Same budgets and default White dot/crate profiles as earlier levels. Both
minimum routes replayed to `won` at PAR, with complete balance comparison and
no failed/aborted action. All target activity is same-cell post-commit occupancy;
all links remain supported as the dot crosses their gates.

### L07 — Twin Chambers

First push C2 → C3, blocking E3's West ray and activating target 23/link 1.
Cross the protected west end to A4's gate, then traverse the upper connector.
Approach the second crate from H5 and push **South**, H4 → H3, blocking J3's
West ray and activating target 24/link 2. Return west above the beam, cross F3
while shielded, pass gate F2, then follow the lower lane to P1's exit. It is not
a second north push from underneath an emitter and never needs to respawn.

The east-side D3/I3 apertures are **unsafe shortcuts**, not walls masquerading
as hazards: each active beam independently prevents a route skipping its target
and shield. Replacing either emitter with a wall lowers PAR 31 → 27. Replacing
both lowers it to 23. Removing either target, or disabling crate ray blocking,
makes the actual board unsolvable. Every linked gate is crossed by the minimum.
Goal priority cannot skip either crossing: the exit is on the separate lower
lane, beyond several already-settled safe actions.

Complete 20,000-budget recovery review: 351 playing/won states, 212 unwinnable
playing states, 73 terminal exposure transitions, zero aborts. As a hard seventh
level, deliberate wrong pushes may require ordinary undo/restart. For example
`U R R` shoves the first shield sideways away from its target. These are recorded
advanced planning consequences, not waived early-tutorial safety or continued
failed play. Starts and every intended settled position remain safe.

### L08 — Labyrinth Fortress

The first two chambers use the same North/South pattern and supported A4/F2
gates. Then push M2 → M3 **North** onto target 25/link 3, shielding P3's West
ray. Return through K3, cross gate K4, and follow K5–P5 to the exit. J5's wall
separates the upper chambers so the initial connector cannot bypass the final
crossing. O3 is exposed even after the shield parks at M3; it is not a safe
eastern shortcut. No goal lies on an exposed pre-goal crossing cell.

All three target removals independently make the board unsolvable. Replacing
any one active E3/J3/P3 emitter with a wall lowers PAR 39 → 35; replacing all
West emitters lowers it to 27. Crate `ray: ignore` makes the actual board
unsolvable. Thus all three active beams, shields, links, and gates are material.

Six registered emitters remain, but only those three beams intersect the chambers.
A9 East, O9 South, and P9 West are explicitly **occluded presentation scenery**
in the upper solid bank (the last crosses the O9 emitter floor and stops at N9's wall). They do
not claim three additional required hazards or unsupported moving rays. This
is an explicit deviation from the old six-active-turret blueprint.

Complete review: 662 playing/won states, 464 unwinnable playing states, 126
terminal transitions, no diagnostic aborts. The same sideways first-shield
mistake can strand the intended target sequence; this mastery board retains
push-planning/undo consequences. The winning route never exploits one of these
states or continues after a failure.

## World summary and release boundary

The world minimum is **148** strokes, not the sum of earlier-rule declarations.
All eight levels are proved/replayed, all starts are ray-safe, all intended
transitions are non-failed, and every target gate has a necessary source. Safe
first-three-level guards, terminal mistakes, optional occluded emitters, late
wrong-push consequences, and deliberate blueprint deviations are explicit here.
The maintained authoring checklist now tests failed-board blocking/restart,
not a special World 2 recovery rule. All-pack mathematical evidence is published
in `v2-pack-proofs.json`; passing repository and real Chromium results are in
`v2-verification.md`. Accepted-spec synchronization remains pending.
