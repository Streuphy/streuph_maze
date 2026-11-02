# World 1: queued V2 route review

> **2026-11-02 status follow-up:** Contract-sync statements below describe the
> content-certification checkpoint. The ten V2 deltas are now synchronized;
> current audit/approval dependencies are in the [verification follow-up](v2-verification.md#documentation-review-follow-up--2026-11-02).
> Board/route evidence below is unchanged, not a new browser run.

Source: `data/worlds/world-01-sokoban.levels.yaml`, stable identity
`world-01-sokoban`, eight levels. Content/math review is separate from the
repository/Chromium results in `v2-verification.md` and pending accepted-spec approval.

## Verification method

All listed routes were minimum-proven and replayed to immediate V2 `won`, with
matching authored PAR and no failed/aborted transitions. Search budgets were
250,000 states, depth 200, 250,000 route labels; all balance comparisons completed.
U,D,L,R counts below exclude automatic work and ACT (none is used here).
`tests/unit/pack-migration.js` replays every minimum, checks push-only profiles,
restores/replays every action snapshot, and checks each target independently
for necessity. Removing any target, leaving its gate intact, makes its level
unsolvable. Every shortest route activates every target and crosses every gate;
no gate or shield is decorative.

All levels start with White P/W and no emitters, prisms, conveyors, portals, or
explicit object overrides. Crates are White, pushable, not pullable,
conveyor-enabled, portal-disabled, ray-blocking. Targets are stationary,
non-blocking floor features and ignore rays. Target occupancy derives after the
complete atomic push, before later work; same-cell crates, not adjacent crates
or the dot, activate them. IDs 23/24/25 link to phase gates 10/26/27 as 1/2/3.
No master switch or alternate source can bypass those links. Closing beneath
crates uses the common pending policy; none of the intended routes requires a
pending gate or closure under the dot.

## Levels 1–4

Boards, names, dimensions, and PARs unchanged.

| Review | Board; IDs | PAR; route | U,D,L,R | Search states / labels |
|---|---|---|---|---|
| S01 | 5×5; 0,1,2,3,10,23,70 | 8; `R U U R R R D D` | 2,2,0,4 | 10 / 10 |
| S02 | 6×6; 0,1,2,3,10,23,70 | 8; `R R U R R R U U` | 3,0,0,5 | 13 / 13 |
| S03 | 8×6; 0,1,2,3,10,23,70 | 9; `R R U R R R R U R` | 2,0,0,7 | 11 / 11 |
| S04 | 10×6; 0,1,2,3,10,23,24,26,70 | 13; `R U R R R D R R U R R R D` | 2,2,0,9 | 18 / 18 |

### S01 — First Push

One push B3 → C3 occupies target 23; the dot follows into B3 atomically. D3's
wall prevents overshoot; A3/start is the only initial approach. Take the raised
detour to E4's link-1 gate and E3's goal. The receiver/adjacency mechanic is not
used here. Wrong pushes off the target or into corners are geometrically
unavailable, and blocked directions do not disturb target state.

### S02 — Corridor Pivot

Push C3 → D3 to activate link 1, then C4 → C5 to park the second crate in a
safe pocket and clear the raised lane. F5's gate guards F6. The second crate
is a blocker, not an unpaired target. C6 is a wall, stopping pointless upward
overshoot; the dot cannot get behind it to reverse the tutorial pushes. No
pulling is necessary or permitted by the profile.

### S03 — Corner Check

Push C3 → D3, then take row 4 around E3/F3's wall block to gate G5 and H5's
goal. E3 is a wall so the target crate cannot be overshot. The old blueprint's
literal introduction of irreversible corner traps conflicts with early safety;
this shipped layout teaches **reading sealed corners**, not suffering a hidden
reset. Keep that explicit deviation instead of adding an accidental deadlock.

### S04 — Two-Chamber Detour

Push B4 → C4 for link 1, cross E4, then push G4 → H4 for link 2 and detour
to J5/J4. D4/I4 walls stop target overshoot; no bypass joins the chambers around
their gate. This is the first combination of two target/gate pairs, using the
same push rule rather than an unexplained new mechanic.

## Wrong-action/recovery review

Exhaustive 20,000-budget reverse reachability completed with 11, 14, 12, and 23
states for levels 1–4. Every reachable playing state has a winning continuation;
zero terminal failures or diagnostic aborts. Manual review of start approaches,
target overshoot walls, and the level-2 blocker pocket agrees with those results.
No educational-reset exception is required in these levels. The starts/goal
entries are safe; all gates remain supported while the dot crosses them.

## Levels 5–8

Boards, dimensions, and PARs unchanged. Level 6's wording now says "target"
and "upper corridor", not a player plate or an unimplemented one-way rule.

| Review | Board; IDs | PAR; route | U,D,L,R | Search states / labels |
|---|---|---|---|---|
| S05 | 12×8; 0,1,2,3,10,23,24,26,70 | 15; `R U R R R R R D R U R R R R D` | 2,2,0,11 | 50 / 54 |
| S06 | 14×6; 0,1,2,3,10,23,70 | 17; `R U U R R R R R R R R R R R R D D` | 2,2,0,13 | 19 / 19 |
| S07 | 16×9; 0,1,2,3,10,23,24,25,26,27,70 | 21; `R U R R R R R D R R U R R R R U R R R D D` | 3,3,0,15 | 60 / 60 |
| S08 | 16×9; 0,1,2,3,10,23,24,25,26,27,70 | 23; `R U R R R R R D R R D R R R U R U U R R U R U` | 6,2,0,15 | 85 / 87 |

### S05 — Warehouse No. 3

Two staged targets: B2 → C2 opens F3; H2 → I2 opens L3 for the L2 exit.
The minimum parks both, then leaves them in place. Target removal tests prove
each source essential; neither upper room connects around its gate.
The classic name is a **homage**, not a claim to reproduce a historical Sokoban
board. This fifth level permits reversible-by-undo mistakes: exhaustive review
found 23 unwinnable playing states among 72 reachable states. For example,
`R U R R R R R R R D L` begins a reverse push away from the second target.
This is an advanced push-planning consequence, not an early-tutorial exception.
No terminal failures/aborts occur; ordinary undo/restart can recover the mistake.

### S06 — Long Alley Remix

One push B3 → C3 supports the remote N4 gate while the player walks the
upper corridor to N3. No conveyor, automatic pull, or directional restriction
is implemented here; the legacy blueprint's belt/pull remix is not the shipped
contract. This is the deliberate sparse long-distance remix of the same target
signal, with two-way backtracking allowed. Complete review: all 20 reachable
states can win, no failures or aborts. Target removal makes it unsolvable.

### S07 — Four-Crate Shuffle

Three target crates plus one parking blocker, not four unmatched receptors.
Push B2 → C2 for F3/link 1. Push G2 → G1 to clear the corridor. Push
I2 → J2 for L3/link 2 and M3 → N3 for P3/link 3, then descend to P2.
Every gate is crossed; removing any of the three target IDs makes the board
unsolvable. No crates need pulling or color changes. The blocker pocket is safe
and intentionally irreversible **but does not deadlock the level**. All 76
reachable settled states can win, with zero failures or diagnostic aborts.
The shipped sequence is ordered parking/sorting, not the historical blueprint's
unimplemented repeated cyclic shuffle.

### S08 — Master Warehouse

The three-link sequence now ends in a longer lower/upper switchback. First
B2 → C2 supports F3; park G2 → G1. Then I2 → J2 supports L2 and
M2 → N2 supports P5, followed by P6's exit. Every target/link has one intended
counterpart; each independent removal makes the level unsolvable. White P/W
never changes, so goal entry does not mask a chromatic or hazard shortcut.

Complete review found 42 unwinnable playing states among 122 reachable states,
zero terminal failures/aborts. A representative wrong route
`R U R R R R R D R R D R U` pushes the middle target crate north into the
wrong lane. This eighth/mastery board deliberately requires push foresight;
nonterminal undo/restart remain available. It is not falsely certified as
globally deadlock-free merely because its minimum wins.

## Progression and completion boundary

The six eight-level worlds preserve their stable keys, dimensions, and roles.
World 1 progresses from one guarded push through a blocker pocket, safe corner
reading, two links, a warehouse homage, the sparse distance remix, and two
three-link parking/switchback boards. Blank walls in the larger envelopes are
not new mechanisms. No unsupported crushing, pulls, historical target IDs, or
alternate compatibility rules were introduced to match old concept prose.

This file and `world-1-sokoban.txt` describe the actual eight-level pack, not the
obsolete four ASCII layouts formerly shown as a registry. Focused levels/rules
tests cover the reviewed routes and target necessity; `v2-pack-proofs.json`
publishes all-pack math evidence. Final repository tests,
real Chromium checks, and accepted-spec synchronization remain
separate release gates.
