# World 5: Chip's Chromatic — route review

The pack uses only the existing `wht`, `red`, `gre`, and `blu` gameplay
colors. “White fills the yellow-key role” is a theme analogy only: the player
carrier, gate color, palette, and glyph remain white. There is no mixing or
automatic aura loss. A prism replaces `P`; the player keeps that aura while
walking away. World dials affect `W`, and every exit requires `P === W`.

## Solver routes and manual review

`npm run levels:routes` loaded the pack through the production resolver, replayed
each selected minimum route to victory, and completed its comparison across all
minimum routes. PAR counts each explicit move or pull once; ACT counts toward
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
