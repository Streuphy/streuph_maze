# World 4: queued V2 vector review

> **2026-11-02 status follow-up:** Contract-sync statements below describe the
> content-certification checkpoint. The ten V2 deltas are now synchronized;
> current audit/approval dependencies are in the [verification follow-up](v2-verification.md#documentation-review-follow-up--2026-11-02).
> Board/route evidence below is unchanged, not a new browser run.

Source `data/worlds/world-04-pengo-vector.levels.yaml`, stable identity
`world-04-pengo-vector`, eight levels. Full pack browser/release gates are
separate from the content/math reviews below.

## Shared contract and proof method

Conveyors 60–67 share one eligible-passenger rule: default White/inert tint,
cardinal arrow names the **exit** destination. No passenger kind, front shove,
strength, or floor-color mobility is selected. Every automatic move is an atomic
queued hop; signals precede remaining transport, then captured ordinary entries.
Ice 5 uses the incoming direction only within the round. A blocked direct
command does not advance passengers; accepted ACTION scans stationary belts.
Complete queue cycles roll back the whole action rather than granting a loop
endpoint. No board here depends on ray exposure, carriers, portals, or targets.

All minima use 250,000-state/depth-200/250,000-route-label budgets, the actual
solver, and real-resolver replay to `won` at authored PAR without failure/abort.
Every representative balance comparison completed. Counts below are U,D,L,R,
excluding free transport and ACT. All starts are safe, White P/W remains fixed.
Crates use declared default pushable/not-pullable, conveyor-enabled,
portal-disabled, ray-blocking profiles; their tints do not change capability.

## Levels 1–3

| Review | Board; IDs | PAR; route | U,D,L,R | States / labels |
|---|---|---|---|---|
| V01 | 5×5; 0,1,2,3,64 | 2; `R U` | 1,0,0,1 | 2 / 2 |
| V02 | 7×5; 0,1,2,3,64,65,67 | 5; `R D R R U` | 1,1,0,3 | 6 / 6 |
| V03 | 9×6; 0,1,2,3,5,60,71 | 8; `R R R U U U R R` | 3,0,0,5 | 24 / 24 |

### V01 — First Current

Unchanged board/PAR. One East command enters the B3–D3 arrows and stops at E3
floor, then North enters E4's goal. Removing the belts raises PAR 2 → 5.
Wrong entries/rests never strand the dot or hide a direction in a future turn.

### V02 — Double Circuit

The old closed loops were unsolvable under whole-action rollback. Changed C3
and F3 from North to East, preserving IDs' registered meanings rather than
changing resolver policy. The first East run now stops before wall D3, and
the second reaches G3's matching goal. Use C2/D2/E2 as the deliberate lower
connector between them. The optional upper branches return to a wall-stopped
East source, not an arbitrarily cut cycle. PAR is **5**, formerly 8.
Removing conveyors raises PAR to 8. No diagnostic abort is needed on any
reachable action, and the minimum exercises both transport circuits.

### V03 — Ice Launch

Board retained; corrected PAR **8**, formerly 7, and removed the "crate belt"
wording. Second East pushes C2's red crate onto ice D2/E2, then East conveyor
F2 delivers it to G2. The dot is still at C2 after that transaction. Third East
slides the dot to F2, where the occupied G2 exit blocks further transport. The
conveyor cannot shove the front crate to H2. Take North along F3–F5 and the
upper exit; optional manual pushing remains a separate direct action.

Removing conveyors raises PAR to 9; removing ice raises it to 10. Removing the
crate lowers it to 7. Thus the shortest route really uses both cargo and dot
transport. Whole-round restore/replay preserves the authored ice/conveyor layer
and crate identity. Rest while blocked at F2 opens a fresh occupancy scan but
does not invent a shove or retain an old ice vector.

## Early wrong-action review

Complete 20,000-budget reverse reachability found 3, 8, 47 playing/won states
for levels 1–3, all with winning continuations, zero terminal failures or
diagnostic aborts. Manual review of wall stops, lower connectors, and the
optional extra crate push agrees with the enumeration. No educational reset
exception or unsupported front-shove shortcut remains in the first three.
Focused `pack-migration.js` regressions cover PAR/replay, belt-removal minima,
occupied-exit rest, and snapshot restoration.

## Levels 4–6

No board, dimension, or score changes needed. Names/goals already describe
actual wall stops and deliberate route choices, not reflection or crushing.

| Review | Board; IDs | PAR; route | U,D,L,R | States / labels |
|---|---|---|---|---|
| V04 | 10×8; 0,1,2,3,5,64,66 | 7; `R R D R R U U` | 2,1,0,4 | 8 / 8 |
| V05 | 12×8; 0,1,2,3,5,71 | 13; `R R U U R R R R R R R R R` | 2,0,0,11 | 31 / 33 |
| V06 | 16×6; 0,1,2,3,5,64 | 2; `R U` | 1,0,0,1 | 2 / 2 |

### V04 — Wall Channel

First East rides B3/C3 East to D3 North, then ice D4/D5 carries the dot into
a **wall stop**, not a reflected direction. Choose East E5, South E4, then the
G4 East arrow delivers H4; two North commands reach H6. Removal tests:
belts → floor raises PAR 7 → 11; ice → floor lowers it to 6 by removing a forced
detour. Both effects are exercised by the real minimum. Supporting terrain is
unchanged throughout transport, restore, and clone. All nine reachable states
can win, no failure/abort or hidden direction between rounds.

### V05 — Compression Chamber

Second East pushes C3's red crate through D3–G3 ice to stop against wall H3.
No crate/wall is destroyed or crushed, and its stable entity identity remains
in the pocket. The dot then uses C4/C5 and the upper corridor to L5. This is an
**observed cargo-distance demonstration**, not a claim that automatic cargo
distance reduces the player's PAR: replacing ice with floor still gives PAR 13,
and removing the crate also gives 13. The intended minimum nevertheless pushes
and visibly slides the real crate, rather than bypassing the lesson entirely.
The authored goal only promises vacating the initial cell, not a required target
or receiver that does not exist. All 35 reachable states can win, no failures or
aborts; wall H3 and the pocket preserve entity count and surface identity.

### V06 — Long Alley

One East command crosses B3–N3's conveyor arrows and O3 ice, stopping at P3
floor. North enters P4's goal. Belts removed → PAR 15; ice removed → PAR 3;
full authored route → PAR 2. This is the deliberate sparse long-distance remix,
not an animation-speed challenge or a claim of autonomous pinball reflection.
All three reachable settled states can win, no failure/abort. A blocked attempt
cannot tick the environment, and ACTION cannot invent a persistent ice vector.

## Mid-pack verification

Focused pack regressions verify all six minima, real replay, per-board belt/ice
counterfactuals, and bounded recovery. Existing rules tests cover neutral tint,
all cardinal arrows, per-hop entries, explicit object eligibility, and round
restoration. There are **no portal tiles in this pack**; portal provenance is
covered by the Prologue/shared rules instead of being falsely claimed here.

## Levels 7–8

| Review | Board; IDs | PAR; route | U,D,L,R | States / labels |
|---|---|---|---|---|
| V07 | 16×9; 0,1,2,3,65,66,67,71 | 17; `R D D R R R R R R R R R R R R R R` | 0,2,0,15 | 20 / 20 |
| V08 | 16×9; 0,1,2,3,5,64,65,66,70 | 4; `R U U U` | 3,0,0,1 | 6 / 6 |

Both minima were proved and replayed with complete balance comparison and no
failed/aborted action. Scores and 16×9 identities remain unchanged.

### V07 — Circuit Exit

The old closed-loop entry was unsolvable. Moved the start A4 → A5, walled A4,
and changed B4's conveyor into **plain floor**. East now enters B5's South
arrow from the west and exits onto B4, showing that the arrow means exit, not
entry side. The C4 North/C5 West/B5 South branch forms a finite circuit back to
that floor junction; it is not an arbitrary closed-loop endpoint.

Two manual South pushes move the red crate B3 → B2 → B1, clearing B2 for
the long exit lane to P2. The parked crate is not lost/crushed. Removing belts
raises PAR 17 → 18. Removing the crate retains 17: it is a deliberate **parking
interaction on the actual route**, not a claim that pushes cost extra over the
same two walking commands. No profile/color-selected belt rule is needed.

Full 20,000-budget review: all 21 reachable playing/won states can win, no
failure or diagnostic abort. Rest on the floor junction has no hidden transport;
entering the branch again returns through a real stop and costs its initiating
stroke. The separate regression restoring level 2's old North exits produces a
true queue cycle and verifies complete rollback, zero counters, and no partial
playback rather than accepting an arbitrary loop endpoint.

### V08 — Absolute Momentum

The first East command rides the lower East channel, turns North through G3/G4
ice, and lands on G5's West belt. White crate F5 stops that exit without being
shoved. North from G5 enters G6's East conveyor channel, reaching P6 via O6 ice;
two more North commands enter P8's goal. The crate stays in place on the minimum.

Previously the absent bumper still allowed a four-command upper shortcut from
F5. Added the single wall **F6**; E6 remains unchanged. Now removing the crate
makes the board unsolvable, so the stop is genuinely essential. Removing belts
raises PAR to 18; removing ice raises it to 7. Nothing is color-filtered: the
bumper's profile and occupancy, not White tint, block transport. The goal text
now says "upper exit channel", not a nonexistent full 16-cell upper path.

Full review: 15 reachable playing/won states, including ten unwinnable playing
states after unnecessary bumper pushes (e.g. `R L`), no terminal failure/abort.
This eighth/mastery level deliberately requires leaving the bumper in place;
nonterminal undo/restart can recover a wrong push. It is not certified as
globally deadlock-free. The intended route uses an occupied exit, not a queue
budget cutoff, front shove, or impossible stationary color victory.

## World summary

All eight minima total **58 strokes**. First-three safety, mid-pack cargo/ice
observations, optional parking consequences, indispensable mastery bumper,
and the closed-cycle/open-circuit distinction are explicit here. Existing
registry/rules fixtures cover every arrow/tint and stationary passenger scan;
pack regressions re-prove/replay every level and counterfactual. All-pack math
proof is published in `v2-pack-proofs.json`. Repository/browser/Chromium tests and accepted-spec review
remain separate release gates.
