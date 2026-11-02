# World 5: Chip's Chromatic — route review

The pack uses only the existing `wht`, `red`, `gre`, and `blu` gameplay
colors. “White fills the yellow-key role” is a theme analogy only: the player
carrier, gate color, palette, and glyph remain white. There is no mixing or
automatic aura loss. A prism replaces `P`; the player keeps that aura while
walking away. World dials affect `W`; winning requires a legal **goal entry**
with `P === W`, after that hop's signals. Stationary equality is not a win.

## Solver routes and manual review

The queued V2 review independently loaded this complete pack through the common
loader, re-proved all eight minima and replayed each through the real resolver
to immediate victory. Every tied-route comparison completed. PAR counts each
explicit move or pull once; ACT counts toward
PAR but not the U/D/L/R balance. The route strings below are the selected
representative routes, not additional authored instructions.

| Level | Board | PAR / selected route | U/D/L/R | Final P/W | Route review |
| --- | ---: | --- | --- | --- | --- |
| 1. The White Mark | 5×5 | 8 — `R U R R L U U U` | 4/0/1/3 | red/red | The route takes the red prism and one red world-dial step, then returns to the red aura gate. The gate and both color-setting actions are necessary; substituting a wrong-color gate or removing either action makes the level unsolvable. The start is safe and no dial is revisited. |
| 2. Two Prisms | 7×5 | 10 — `R R R R R U ACT ACT D R` | 1/1/0/6 | blu/blu | The red and blue prisms feed their matching aura gates in order. After the blue gate, the route visits the dial, advances W from white through red and green to blue, then returns through the blue gate. P persists as blue during that backtrack. |
| 3. The Other Carrier | 9×6 | 9 — `R R ACT ACT R R R R R` | 0/0/0/7 | blu/blu | At the blue world gate, P is red while W is blue; entry succeeds because this gate tests W. The blue prism then sets P for the goal. The route does not revisit the cycle dial. |
| 4. Guarded Spectrum | 10×8 | 7 — `R R R R R R R` | 0/0/0/7 | gre/gre | The latched key opens the phase wall and activates the green set-dial. The green prism sets P, the set-dial sets W, and the matching aura gate admits the route. Removing the key, prism, set-dial, or changing the gate color makes the level unsolvable. |
| 5. Three-Way Filter | 12×8 | 13 — `R R R R R R R ACT ACT R R R R` | 0/0/0/11 | blu/blu | The route replaces P in red/green/blue order and crosses all three matching aura filters. The final dial advances W to blue; it is not revisited. Removing any prism or the dial, or changing a filter to a wrong color, makes the route unsolvable. |
| 6. Chromatic Corridor | 16×2 | 15 — `R R R R R R R R R R R R R R R` | 0/0/0/15 | blu/blu | The straight route alternates world-color gates with player-aura gates. Each dial advances W to red, green, then blue; each prism sets P to the same sequence. The selected route proves the distinction at every pair of gates. |
| 7. Commit to Green | 16×9 | 27 — `R R U U U U U R R R R R R R R D D D D D R R R ACT ACT R R` | 5/5/0/15 | blu/blu | The shortest route chooses the required green branch, then sets P blue and advances W to blue for the exit. The red spur is a deliberate, reversible dead-end choice; it is not required by the shortest route and does not trap the player. The authored start is safe. |
| 8. Spectrum Nexus | 16×9 | 15 — `R R R R R R R R R R R R R R R` | 0/0/0/15 | blu/blu | The route uses the white aura gate while P is initially white, then red, green, and blue aura gates. Interleaved dials set W for the red, green, and blue world gates. All four existing colors remain distinct; no yellow state is introduced. |

The mixed-carrier gates in levels 3, 6, and 8 are checked against the carrier
configured in the registered tile definition. Content regression tests replay
each selected route, assert the carrier matches at gate entry and the final
P/W pair, and perturb required prisms/actuators or gate colors to check route
necessity. Levels 1–3 contain no crates or irreversible pushes; all other
levels likewise avoid introducing unrelated crate behavior.

## Blueprint adaptations

- The level-3 “mixing/backtracking resets aura” concept becomes persistent-aura
  routing through a W-gate while P differs, followed by an explicit blue prism.
- The level-6 corridor is authored as 16 columns × 2 rows, following the
  blueprint prose and resolving its table/prose dimension mismatch.
- The level-7 temporary-aura-shedding concept becomes an explicit green-route
  choice followed by a blue prism; its red spur is a recoverable decoy, not an
  aura reset or an irreversible softlock.
- The level-8 mastery route uses the white aura gate plus the three RGB states
  and both gate carriers, without adding a fifth color or color-mixing rule.

## Queued V2 certification evidence

No board, dimension, goal, override, or PAR required migration edits. Stable
identity is `world-05-chips-chromatic`; all eight authored keys remain. Budgets
were 250,000 states, depth 200, 250,000 route labels. The table above supplies
the exact routes/counts/final carriers. All routes finish at their recorded
strokes without failed/aborted transitions; no stationary goal equality or
future queued prism is used to enter a gate early.

| Review | Registered IDs | Proof states / labels | Complete recovery states |
|---|---|---|---|
| C01 | 0,1,2,3,11,20,31 | 21 / 21 | 33 |
| C02 | 0,1,2,3,11,13,20,31,33 | 19 / 19 | 21 |
| C03 | 0,1,2,3,11,13,20,36 | 19 / 19 | 26 |
| C04 | 0,1,2,3,10,12,22,32,41 | 13 / 13 | 26 |
| C05 | 0,1,2,3,11,12,13,20,31,32,33 | 28 / 28 | 29 |
| C06 | 0,1,2,3,11,12,13,20,31,32,33,34,35,36 | 46 / 46 | 48 |
| C07 | 0,1,2,3,11,12,13,20,31,32,33 | 57 / 59 | 105 |
| C08 | 0,1,2,3,11,12,13,20,30,31,32,33,34,35,36 | 42 / 42 | 44 |

Recovery enumeration used a 20,000-state budget and completed for **all eight**
boards: zero unwinnable playing states, terminal failures, or diagnostic aborts.
Every start is ordinary safe terrain. There are no crates/movable features,
emitters, conveyors, ice, portal, or object overrides; the only moving entity
is the default dot. No blocked carrier entry is physical closure beneath it.
The linked phase wall in level 4 uses the common closure query, not an exception.

### C01–C03 — introduction, replacement, and distinct carriers

Level 1 isolates red P/W while keeping actual White as the theme analogy. Its
red prism and world dial are individually essential. Wrong dial cycles can be
repaired; the side branch returns safely before the gate. Level 2 requires
both prisms and the dial; blue persists during the dial backtrack, with exactly
two occupied ACTs after dial entry. Level 3's world gate admits **red P / blue W**
before the blue prism supplies goal equality. Its initial red prism is a
deliberate carrier-contrast demonstration, not an essential extra lock; removing
the blue prism or world dial makes the board unsolvable. This distinction is
recorded rather than falsely asserting every displayed prism adds difficulty.

### C04–C06 — link execution and interleaved carrier tests

Level 4's key, green prism, and green set-dial are separately essential. The
set-dial checks the link **when executed**; an occupied ACTION with its source
unlatched leaves W White. The normal route has already latched the key before
reaching it, passes the phase wall, then sets P/W Green before the aura gate.
No "key inventory" or delayed permission survives incorrectly in snapshots.

Level 5 requires each RGB replacement and the final dial. Gates filter current
P in sequence; the two ACTs bring W to Blue before goal entry, not while waiting
on the goal. Level 6's three ordinary dial entries advance W Red/Green/Blue
between actual world gates; interleaved prisms set P for actual aura gates.
Removing any necessary prism or dial makes these boards unsolvable. No mixed,
Yellow, Black, or automatic reset color is introduced.

### C07–C08 — reversible branch and four-color capstone

Level 7's red spur is explicitly **optional/reversible**, not a required filter
on PAR. Wrong-spur replay returns through its red gate to the fork, then the
green prism replaces P and permits the intended upper route. Green/blue prisms
and the final dial are individually essential. There is no temporary aura
shedding mechanic or irreversible failed turn hidden in this branch.

Level 8 crosses White's aura filter while P is still White, then the RGB prisms,
all three matching aura filters, and all three world filters. Each entry tests
the registered P or W at action time; no premature deferred effect is applied.
Necessary RGB prisms/dials cannot be removed; wrong-filter perturbations in the
content suite prevent unsupported equal-PAR bypass claims. Final Blue equality
is tested on entering P1, not by waiting there.

## Completion boundary

The world minimum is **104 strokes**. These updated notes and ledger rows are
content/math certification under the sole queued four-color contract, not a
claim that full repository/jsdom tests, real Chromium,
or accepted-spec synchronization have completed. Focused pack regressions cover
all eight proofs, current-carrier entry timing, source necessity, recovery,
linked-dial execution, and the deliberately reversible red spur.
