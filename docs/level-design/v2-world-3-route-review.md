# World 3: queued V2 polarity review

> **2026-11-02 status follow-up:** Contract-sync statements below describe the
> content-certification checkpoint. The ten V2 deltas are now synchronized;
> current audit/approval dependencies are in the [verification follow-up](v2-verification.md#documentation-review-follow-up--2026-11-02).
> Board/route evidence below is unchanged, not a new browser run.

Source `data/worlds/world-03-hyrule-flip-flop.levels.yaml`, stable identity
`world-03-hyrule-flip-flop`, eight levels. All boards/dimensions/PARs retained.
Only level 7's goal now explicitly warns to leave the crate in its parking cell.
These are content/math proofs; final repository, browser, and accepted-spec
gates are separate.

## Contract and method

Every board starts `red-open` with White P/W. Crystal 48 responds only to
occupied ACTION; stepping on it is not a flip. Red/blue barrier classes 46/47
test binary polarity, not P/W or mixed colors. Effects derive closure
immediately; crate-held closure is pending, dot closure is terminal. No
breakable blockers, timer, automatically closing turn counter, conveyor, portal,
target, or linked gate is inferred from the blueprint's historical prose.

Minimum search budgets: 250,000 states, depth 200, 250,000 route labels. All
routes replay to `won` at the declared score without failure/abort; all balance
comparisons complete. Counts are **U,D,L,R**, excluding ACT (which still costs
one stroke). `tests/unit/pack-migration.js` asserts every PAR, exact flip count,
entry-vs-ACTION behavior, unchanged P/W, pending-state clone/restore, and crystal
necessity. Removing all crystals makes every board unsolvable.

## Levels 1–7

| Review | Board; IDs | PAR; selected route | U,D,L,R; ACT | States / labels |
|---|---|---|---|---|---|
| H01 | 5×5; 1,2,3,46,47,48 | 5; `R R ACT R R` | 0,0,0,4; 1 | 5 / 5 |
| H02 | 6×6; 1,2,3,46,47,48 | 8; `R U ACT R R ACT D R` | 1,1,0,4; 2 | 8 / 8 |
| H03 | 8×8; 1,2,3,46,47,48 | 8; `R R ACT R R ACT R R` | 0,0,0,6; 2 | 8 / 8 |
| H04 | 10×8; 0,1,2,3,46,47,48 | 12; `R R ACT U R R R ACT R R R R` | 1,0,0,9; 2 | 14 / 14 |
| H05 | 12×8; 0,1,2,3,46,47,48 | 15; `R R R ACT U R R R R R ACT U R R R` | 2,0,0,11; 2 | 21 / 21 |
| H06 | 16×2; 1,2,3,46,47,48 | 20; `R R ACT R R R ACT R R R ACT R R R ACT R R ACT R R` | 0,0,0,15; 5 | 20 / 20 |
| H07 | 16×9; 0,1,2,3,46,47,48,70 | 11; `R U R R ACT D R R ACT R R` | 1,1,0,7; 2 | 42 / 45 |

### H01 — Red First, Blue Next

Cross B3's initially open red barrier, enter C3's crystal, ACT to open blue,
then cross D3 and enter E3. Wrong ACT counts can be corrected at the crystal;
closed approaches block for free. All six reachable playing/won states can win.

### H02 — Two-Switch Zigzag

Cross B1 red, turn north to B2's crystal, flip blue for C2, and flip red at D2
before descending D1 to E1. The bend and wall prevent bypassing either class.
All nine reachable states can win; no unintended early closure/reset trap.

### H03 — Ordered Twin Chambers

The linear variant has two crystals separated by the blue barrier. First opens
blue D2, second restores red F2 before G2's goal. ACT is explicit at each;
stationary matching does not bypass a barrier. All nine reachable states win
from a continuation, with no failures/aborts.

### H04 — Switch Loop

Flip at C1 for E2's blue class, then F2 for G2's red exit segment. "Loop" here
means a polarity exchange, not a queued conveyor cycle or arbitrary endpoint.
The board combines a wall turn with two explicit binary decisions. All 15
reachable states retain a winning continuation, no failures/aborts.

### H05 — Palace of Darkness

Route from lower D1's crystal to upper I2's crystal, through blue G2 and red
K3. Walls force the two-room sequence; no secret carrier change opens a gate.
The name is a room-layout homage, not an exact historical board claim. All 22
reachable states retain a winning continuation, no failures/aborts.

### H06 — Sixteen-Column Exchange

A sparse two-row envelope contains a one-row path and five crystals. The
minimum uses exactly five flips, ending `blue-open`. There is no time limit or
mechanical one-way restriction. This is the long linear remix, not a timed
sprint. All 21 reachable states can win; no failures/aborts.

### H07 — Barrier Blocker

Push B2's default push-only White crate onto C2's initially open red barrier;
take the upper crystal at D3 and ACT blue. C2 requests closure but stays
effectively open beneath the crate, with pending presentation. The minimum
returns through D2 and E2 blue, then flips red at F2 before G2/H2. It never
tries to push a crate off a requested-closed surface with the dot following.
The pending display is derived identically after snapshot restore/clone.

Complete 20,000-budget review found 59 reachable playing/won states, including
11 unwinnable playing states and two terminal closure transitions, no aborts.
The avoidable early sequence `R R` pushes past C2 into D2 and blocks the return
lane; as a hard seventh level this deliberately needs nonterminal undo/restart.
Following a crate off a closed barrier can fail and then requires restart.
Goal text now distinguishes the intended parking cell. The crate is a visible
pending-closure demonstration on the actual minimum, not a breakable wall.

## Early safety and progression

First-three full review (20,000-state budget): 6/9/9 reachable states, all with
winning continuations, zero failures or diagnostic aborts. Repeated ACT at a
crystal remains correctable; ordinary barrier color does not invoke chromatic
carrier effects. Later boards build wall routing, repeated exchanges, and the
crate-held closure observation. Large wall padding remains a stable envelope,
not a claim of extra hidden complexity. No early educational reset exception.

## H08 — Grand Inversion: independent minimum proof

Retain 16×9, the five-lane board, and **PAR 97** only after re-proving it under
the sole queued engine. IDs are 0,1,2,3,46,47,48, initial polarity `red-open`,
White P/W, no crates or profile overrides. It is a long forced polarity capstone,
not a claim that large dimensions alone make a branching puzzle difficult.

The actual search explored 127 states/127 route labels with the budgets above,
proved 97, completed balance comparison, and replayed to `won`, `red-open`,
97 strokes, no failure/abort. Full reachable-state review completed with 128
playing/won states, no unwinnable playing states or terminal transitions.
The proof did not inherit the declared score or infer solvability from unknown.

An independent lower bound explains why 97 is necessary:

- Fixed walls leave one five-lane snake from A1 to P9. Each 16-cell lane needs
  15 horizontal moves; four two-row connectors need eight North moves. No
  transport or breakable wall shortens these **83 explicit moves**.
- Two crystals on the first lane and three on each later lane sit between
  successive complementary barriers. Each necessary class exchange needs an
  occupied ACTION; entry does not flip and neighboring ACTION does nothing.
  Hence at least **14 additional ACTION strokes** are required.
- The replay below achieves 83 + 14 = **97**. Extra backtracking or toggles
  cannot beat that lower bound. Stationary White equality is not a goal shortcut.

Expanded selected route, grouped by lane for readability (concatenate lines;
`U U` is the connector, not automatic movement):

```text
R R R R ACT R R R R R R ACT R R R R R U U
L L L L ACT L L L L ACT L L L L ACT L L L U U
R R R ACT R R R R ACT R R R R ACT R R R R U U
L L L L ACT L L L L ACT L L L L ACT L L L U U
R R R R ACT R R R R ACT R R R R ACT R R R
```

U,D,L,R counts **8,0,30,45**, ACT 14; balance score 1266.75, comparison complete.
All fourteen intended polarity transitions occur; removing the crystals makes
the board unsolvable. No occupied barrier closure is needed in this crate-free
mastery route. Repeated ACT remains repairable at the current crystal; moving
onto an incompatible class blocks without an environmental tick.

## Completion boundary

All eight minima are proved/replayed: the theoretical world minimum is **176**.
The maintained ledger records every level separately. No board or score needed
an arbitrary adjustment; only the hard level's parking instruction was clarified.
The historical blueprint's breakable blockers/synchronized autonomous walls
are not implemented features. All-pack math evidence is in `v2-pack-proofs.json`.
Passing repository/Chromium results are recorded in `v2-verification.md`;
accepted-spec synchronization remains pending.
