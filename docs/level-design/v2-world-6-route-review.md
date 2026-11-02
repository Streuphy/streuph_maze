# World 6: queued V2 receiver review

Source `data/worlds/world-06-goof-proximity.levels.yaml`, stable identity
`world-06-goof-proximity`, eight levels. The separate user World 6 archive move
is untouched. This is current content/math evidence, not final browser approval.

## Method and contract

All minima use the shared validator, actual solver, and real-resolver replay.
Budgets: 250,000 states, depth 200, 250,000 route labels; all balance comparisons
completed. Every intended action is committed/non-failed and ends in `won` at
the declared stroke count. Full generated evidence, with fingerprints and
first-three reachability results, is in `v2-pack-proofs.json`.

P/W remain White. Receiver colors match **crate** color, not the dot's aura.
All crates retain pushable/not-pullable, conveyor-enabled, portal-disabled,
ray-blocking profiles with no authored capability overrides. There are no rays,
prisms, ice, portals, or occupancy targets in these boards. Receivers derive
all four matching cardinal contacts after each atomic commit; diagonal, same-cell,
and dot occupancy do not count. Source contacts combine with OR, never per-contact
toggle parity. Unchanged activity emits no new edge. Gates use links 1/2/3.

Focused pack tests inspect every contact indicator on initial, settled, and
intermediate authoritative event frames; replay every minimum; independently
remove each receiver to prove necessity; and verify every gate is crossed.
Shared rules fixtures additionally cover multiple simultaneous contacts and
OR-combined same-link sources (not falsely claimed as extra authored sources
on these sparse boards). A receiver is never silently treated as a target.

## Levels 1–4

| Review | Board; IDs | PAR; selected route | U,D,L,R | States / labels |
|---|---|---|---|---|
| G01 | 5×5; 0,1,2,3,10,50,71 | 6; `R R U D R R` | 1,1,0,4 | 11 / 11 |
| G02 | 7×5; 0,1,2,3,10,26,50,71,72,94 | 6; `R R R R R R` | 0,0,0,6 | 8 / 8 |
| G03 | 9×6; 0,1,2,3,10,50,71 | 12; `U L U R D D R R R R R R` | 2,2,1,7 | 21 / 21 |
| G04 | 10×8; 0,1,2,3,10,50,64,71 | 13; `R U U R R R D D R R R R R` | 2,2,0,9 | 20 / 20 |

### G01 — First Dock

The old `U R R` overshoot put the crate **on** D2's receiver, permanently
removing adjacency and closing the exit. Redesigned the tiny dock without
changing 5×5/PAR 6: crate now starts C2, parks at C3 beside receiver D3, with
C4/B3/D2 walls preventing every wrong-side approach or overshoot. Push North
from C1, return South, then cross gate D1/link 1 to E1's goal. The receiver is
not occupied by the crate or dot. Removing it makes the level unsolvable.
All 13 reachable playing/won states can win; no terminal failures or aborts.

### G02 — Two Colors, Two Links

Unchanged board/PAR. Red crate C3 already supports receiver B3/link 1; green
crate F3 supports E3/link 2. This is an **inspection/color-correspondence
variant**, not a falsely claimed crate-pushing PAR. Both sources are necessary:
their independent removal closes the corresponding C2/E2 gate and makes the
board unsolvable. Guarded pockets prevent disturbing either source into an
irreversible wrong push. All nine reachable states retain a winning continuation;
unchanged active sensors emit no repeated activation edges during the six moves.

### G03 — Around the Corner

Retain 9×6/PAR 12, but guard the actual turn. Push C2 → C3, move West to B2,
North B3, then push East C3 → D3 beside receiver D4. Return through C2/C1
and the lower lane to gate G1 and I1's goal. C4/E3/D2 walls prevent north
overshoot, east overshoot, and a wrong approach beneath the final dock. The old
E2/F2 branch and receiver-row overshoot are removed. No implicit "lift" or pull
ability is inferred. This remains two orthogonal pushes with a real corner walk.

The original board had 78 unwinnable playing states. All 22 final reachable
states now have a winning continuation, no terminal failures or aborts. The
guarded receiver still derives from South contact, not same-cell occupancy.

### G04 — Belt and Barrier

The old minimum only rode a belt past an already-docked source. Now push B1's
red crate onto C1's East conveyor; the queued passenger hop parks it D1 beside
receiver E1 and opens F1/link 1 **after that hop**. Leave the cargo in place,
take B2/B3–E3/E2's upper detour, return through E1, and cross F1 to J1.
No front shove, red-selected transport, or target occupancy is used.

C2/D2 walls prevent a tied direct-push bypass. New PAR **13**, formerly 8;
replacing the conveyor with floor raises it to 15, and removing the receiver
makes the board unsolvable. Thus automatic cargo docking is material to the
optimum, not a mislabeled dot-only conveyor. Its activation edge appears in the
transport commit's journal before lower-priority work can read stale occupancy.

As the fourth/combinatory level, it retains deliberate wrong-push consequences:
26 reachable playing/won states include nine unwinnable states, zero terminal
failures or aborts. `R R R` overshoots onto the receiver; later reverse pushes
can also strand the cargo. Ordinary undo/restart, not an automatic failure
recovery exception, handles those avoidable mistakes. The intended route never
uses them.

## Early safety

Complete 20,000-budget reverse reachability: levels 1–3 have 13/9/22 reachable
states, zero unwinnable playing states, failures, or diagnostic aborts. Manual
review of overshoot walls, guarded approaches, and the corner turn agrees.
The changes repair the two actual early softlocks found by exhaustive review;
no educational-reset exception or hidden pull profile was added.

## Levels 5–8

Boards/dimensions/PARs unchanged. Goals 6/8 now explicitly describe the upper
track and already-parked Blue source, not a full-width automatic railway or a
new docking action absent from the minimum.

| Review | Board; IDs | PAR; route | U,D,L,R | States / labels |
|---|---|---|---|---|
| G05 | 12×8; 0,1,2,3,10,26,50,71,72,94 | 11; `R R R R R R R R R R R` | 0,0,0,11 | 11 / 11 |
| G06 | 16×6; 0,1,2,3,10,50,71 | 19; `U U R R R R R R R R R R D D R R R R R` | 2,2,0,15 | 165 / 168 |
| G07 | 16×9; 0,1,2,3,10,26,50,71,93 | 21; `R R U R U L R D D R R R R R R R R R R R R` | 2,2,1,16 | 31 / 31 |
| G08 | 16×9; 0,1,2,3,10,26,27,50,71,73,93,99 | 21; `R R U R U L R D D R R R R R R R R R R R R` | 2,2,1,16 | 31 / 31 |

### G05 — Castle Basement Rooms

Red C3 supports B3/link 1, Green I3 supports H3/link 2. Both are deliberately
pre-parked inspection sources, not required pushing commands. Cross D1 and H1
to the L1 goal; the isolated pockets cannot be altered through nonexistent
floor paths. Every receiver removal independently makes the board unsolvable,
so both remote sources are necessary even though they add no docking action.
All twelve reachable states can win; no failures or aborts.

### G06 — Railway Dock

Move North twice to A3, then push the red crate from B3 to L3 with ten East
commands. L3 is west-adjacent to receiver M3; do not overshoot onto the sensor.
The dot reaches K3, descends K2/K1, then takes five East commands through O1's
link-1 gate to P1. This is **manual repeated pushing**, not an unregistered
conveyor or color-selected force effect. The full envelope is 16 columns;
the upper crate track does not pretend to span all sixteen by itself.

Every authoritative state-frame inspection agrees with current contacts, and
receiver removal makes the board unsolvable. Complete 20,000-budget review:
363 playing/won states, 56 unwinnable playing states, no failure or abort.
An eleventh East push puts the crate onto M3 (same-cell does not count), where
the east wall prevents re-docking. That deliberate sixth-level planning mistake
needs ordinary undo/restart, not a hidden pull or a prior-rule compatibility
outcome. The intended minimum stops at L3.

### G07 — Re-dock the Red Crate

Initial red C3 supports D3 receiver 50/link 1, so cross C1's gate first.
Approach from D3 and push the same crate West C3 → B3, now adjacent to A3
receiver 93/link 2. One atomic commit derives **both** link-2 activation and
link-1 release; C1 closes behind the dot, F1 opens ahead. Return through D2/D1
and the lower corridor to P1. There is no stable old-source signal for later
queue work to exploit, and no crate tint implies pulling or strength.

Both receiver removals independently make the board unsolvable. All contact
indicators, not merely the first matching side, are checked on every committed
state frame. Full review: 32 states, seven unwinnable playing states, no failure
or diagnostic abort. A second West push overshoots onto A3, losing adjacency
at the board edge; avoid it or use nonterminal undo/restart.

### G08 — Grand Dockworks

The same red re-docking sequence switches links 1 → 2, with identical real
activation/release edges. Blue J4 is already adjacent to I4's Blue receiver
99/link 3; it keeps M1's final gate open. The minimum **does not move Blue**;
the revised goal states that fact instead of inventing a later docking step.
Removing either red receiver or the Blue receiver makes the board unsolvable;
all three gates are crossed. White dot/world carriers do not impersonate a Blue
crate. Full review: 32 states, seven avoidable overshoot deadlocks, no failure
or abort. This sparse three-source board is not a claim of executable automation
or unsupported factory timers.

## Closure, progress, and completion boundary

The winning re-docking routes close an unoccupied gate behind the dot and do
not need a crate-held gate. A separate regression using the actual level-7
crate/phase-wall definitions places the crate on an unsupported link-1 gate:
requested closure is pending/effectively open and survives clone/restore and
inspection. This is a common closure-conformance fixture, **not** a fabricated
step in the winning route. Shared rules tests cover departure, immediate dot
closure failure, and reopening cancellation for the same gate policy.

All eight minima sum to **109 strokes**, with every receiver necessary and
every intended linked gate crossed. The current-only store keeps world progress
independent; no archived World 6 tasks or files were modified. The maintained
ledger now records all 61 shipped identities, and the generated evidence supplies
minimum routes, profiles, budgets, counts, and fresh level fingerprints. Final
full repository/jsdom, real Chromium, catalogue/reference audits, and accepted
specification synchronization remain separate release gates.
