# V2 shipped-pack certification ledger

**Migration in progress.** Certified rows have content-design and replay-proof
review, not final release/browser approval. Pending rows retain observed source
scores, not proven queued-engine minima. `pending`, `unknown`, failed replay, or
an omitted row blocks release. Passing repository and separate real Chromium
gates are recorded in [v2-verification.md](v2-verification.md). Accepted-spec
synchronization/approval is still pending; these rows do not assert release approval.

Each certified row must link evidence containing dimensions, tile/profile set,
lesson, solver budgets/status, minimum route/strokes, U/D/L/R counts, tied-route
comparison completeness, replay outcome, failure/closure/loop/necessity findings,
early wrong-push review, and any board/name/goal change. Complete proof evidence
is required even when the authored board does not change.

## Prologue — `prologue`

Sources: `src/js/levels.default.js` and generated `data/levels.yaml` (13 levels).

| Key | Source name | Declared | V2 status / evidence |
|---|---|---:|---|
| level_1 | First steps | 8 | certified — review: [P01](v2-prologue-route-review.md#p01--first-steps) |
| level_2 | Two colours | 8 | certified — review: [P02](v2-prologue-route-review.md#p02--two-colours) |
| level_3 | Conveyor | 6 | certified — review: [P03](v2-prologue-route-review.md#p03--conveyor) |
| level_4 | Loader | 8 | certified — review: [P04](v2-prologue-route-review.md#p04--loader) |
| level_5 | Keys and masters | 9 | certified — review: [P05](v2-prologue-route-review.md#p05--keys-and-masters) |
| level_6 | Hold and release | 11 | certified — review: [P06](v2-prologue-route-review.md#p06--hold-and-release) |
| level_7 | Hinges | 11 | certified — review: [P07](v2-prologue-route-review.md#p07--hinges) |
| level_8 | Short cuts | 12 | certified — review: [P08](v2-prologue-route-review.md#p08--short-cuts) |
| level_9 | Cargo current | 13 | certified — review: [P09](v2-prologue-route-review.md#p09--cargo-current) |
| level_10 | The long way round | 27 | certified — review: [P10](v2-prologue-route-review.md#p10--the-long-way-round) |
| level_11 | Corridor | 16 | certified — review: [P11](v2-prologue-route-review.md#p11--corridor) |
| level_12 | Colophon | 27 | certified — review: [P12](v2-prologue-route-review.md#p12--colophon) |
| level_13 | Void and passage | 4 | certified — review: [P13](v2-prologue-route-review.md#p13--void-and-passage) |

## World 1 — `world-01-sokoban`

Source: `data/worlds/world-01-sokoban.levels.yaml` (8 levels).

| Key | Source name | Declared | V2 status / evidence |
|---|---|---:|---|
| level_1 | First Push | 8 | certified — review: [S01](v2-world-1-route-review.md#s01--first-push) |
| level_2 | Corridor Pivot | 8 | certified — review: [S02](v2-world-1-route-review.md#s02--corridor-pivot) |
| level_3 | Corner Check | 9 | certified — review: [S03](v2-world-1-route-review.md#s03--corner-check) |
| level_4 | Two-Chamber Detour | 13 | certified — review: [S04](v2-world-1-route-review.md#s04--two-chamber-detour) |
| level_5 | Warehouse No. 3 | 15 | certified — review: [S05](v2-world-1-route-review.md#s05--warehouse-no-3) |
| level_6 | Long Alley Remix | 17 | certified — review: [S06](v2-world-1-route-review.md#s06--long-alley-remix) |
| level_7 | Four-Crate Shuffle | 21 | certified — review: [S07](v2-world-1-route-review.md#s07--four-crate-shuffle) |
| level_8 | Master Warehouse | 23 | certified — review: [S08](v2-world-1-route-review.md#s08--master-warehouse) |

## World 2 — `world-02-lolos-castle`

Source: `data/worlds/world-02-lolos-castle.levels.yaml` (8 levels).

| Key | Source name | Declared | V2 status / evidence |
|---|---|---:|---|
| level_1 | First Medusa | 7 | certified — review: [L01](v2-world-2-route-review.md#l01--first-medusa) |
| level_2 | Crossfire | 7 | certified — review: [L02](v2-world-2-route-review.md#l02--crossfire) |
| level_3 | Crossing Lines | 11 | certified — review: [L03](v2-world-2-route-review.md#l03--crossing-lines) |
| level_4 | The Unhurried Exit | 20 | certified — review: [L04](v2-world-2-route-review.md#l04--the-unhurried-exit) |
| level_5 | Four Medusas | 15 | certified — review: [L05](v2-world-2-route-review.md#l05--four-medusas) |
| level_6 | Still Corridor | 18 | certified — review: [L06](v2-world-2-route-review.md#l06--still-corridor) |
| level_7 | Twin Chambers | 31 | certified — review: [L07](v2-world-2-route-review.md#l07--twin-chambers) |
| level_8 | Labyrinth Fortress | 39 | certified — review: [L08](v2-world-2-route-review.md#l08--labyrinth-fortress) |

## World 3 — `world-03-hyrule-flip-flop`

Source: `data/worlds/world-03-hyrule-flip-flop.levels.yaml` (8 levels).

| Key | Source name | Declared | V2 status / evidence |
|---|---|---:|---|
| level_1 | Red First, Blue Next | 5 | certified — review: [H01](v2-world-3-route-review.md#h01--red-first-blue-next) |
| level_2 | Two-Switch Zigzag | 8 | certified — review: [H02](v2-world-3-route-review.md#h02--two-switch-zigzag) |
| level_3 | Ordered Twin Chambers | 8 | certified — review: [H03](v2-world-3-route-review.md#h03--ordered-twin-chambers) |
| level_4 | Switch Loop | 12 | certified — review: [H04](v2-world-3-route-review.md#h04--switch-loop) |
| level_5 | Palace of Darkness | 15 | certified — review: [H05](v2-world-3-route-review.md#h05--palace-of-darkness) |
| level_6 | Sixteen-Column Exchange | 20 | certified — review: [H06](v2-world-3-route-review.md#h06--sixteen-column-exchange) |
| level_7 | Barrier Blocker | 11 | certified — review: [H07](v2-world-3-route-review.md#h07--barrier-blocker) |
| level_8 | Grand Inversion | 97 | certified — review: [H08](v2-world-3-route-review.md#h08--grand-inversion-independent-minimum-proof) |

## World 4 — `world-04-pengo-vector`

Source: `data/worlds/world-04-pengo-vector.levels.yaml` (8 levels).

| Key | Source name | Declared | V2 status / evidence |
|---|---|---:|---|
| level_1 | First Current | 2 | certified — review: [V01](v2-world-4-route-review.md#v01--first-current) |
| level_2 | Double Circuit | 5 | certified — review: [V02](v2-world-4-route-review.md#v02--double-circuit) |
| level_3 | Ice Launch | 8 | certified — review: [V03](v2-world-4-route-review.md#v03--ice-launch) |
| level_4 | Wall Channel | 7 | certified — review: [V04](v2-world-4-route-review.md#v04--wall-channel) |
| level_5 | Compression Chamber | 13 | certified — review: [V05](v2-world-4-route-review.md#v05--compression-chamber) |
| level_6 | Long Alley | 2 | certified — review: [V06](v2-world-4-route-review.md#v06--long-alley) |
| level_7 | Circuit Exit | 17 | certified — review: [V07](v2-world-4-route-review.md#v07--circuit-exit) |
| level_8 | Absolute Momentum | 4 | certified — review: [V08](v2-world-4-route-review.md#v08--absolute-momentum) |

## World 5 — `world-05-chips-chromatic`

Source: `data/worlds/world-05-chips-chromatic.levels.yaml` (8 levels).

| Key | Source name | Declared | V2 status / evidence |
|---|---|---:|---|
| level_1 | The White Mark | 8 | certified — review: [C01](world-5-chromatic-route-review.md#c01c03--introduction-replacement-and-distinct-carriers) |
| level_2 | Two Prisms | 10 | certified — review: [C02](world-5-chromatic-route-review.md#c01c03--introduction-replacement-and-distinct-carriers) |
| level_3 | The Other Carrier | 9 | certified — review: [C03](world-5-chromatic-route-review.md#c01c03--introduction-replacement-and-distinct-carriers) |
| level_4 | Guarded Spectrum | 7 | certified — review: [C04](world-5-chromatic-route-review.md#c04c06--link-execution-and-interleaved-carrier-tests) |
| level_5 | Three-Way Filter | 13 | certified — review: [C05](world-5-chromatic-route-review.md#c04c06--link-execution-and-interleaved-carrier-tests) |
| level_6 | Chromatic Corridor | 15 | certified — review: [C06](world-5-chromatic-route-review.md#c04c06--link-execution-and-interleaved-carrier-tests) |
| level_7 | Commit to Green | 27 | certified — review: [C07](world-5-chromatic-route-review.md#c07c08--reversible-branch-and-four-color-capstone) |
| level_8 | Spectrum Nexus | 15 | certified — review: [C08](world-5-chromatic-route-review.md#c07c08--reversible-branch-and-four-color-capstone) |

## World 6 — `world-06-goof-proximity`

Source: `data/worlds/world-06-goof-proximity.levels.yaml` (8 levels).

| Key | Source name | Declared | V2 status / evidence |
|---|---|---:|---|
| level_1 | First Dock | 6 | certified — review: [G01](v2-world-6-route-review.md#g01--first-dock) |
| level_2 | Two Colors, Two Links | 6 | certified — review: [G02](v2-world-6-route-review.md#g02--two-colors-two-links) |
| level_3 | Around the Corner | 12 | certified — review: [G03](v2-world-6-route-review.md#g03--around-the-corner) |
| level_4 | Belt and Barrier | 13 | certified — review: [G04](v2-world-6-route-review.md#g04--belt-and-barrier) |
| level_5 | Castle Basement Rooms | 11 | certified — review: [G05](v2-world-6-route-review.md#g05--castle-basement-rooms) |
| level_6 | Railway Dock | 19 | certified — review: [G06](v2-world-6-route-review.md#g06--railway-dock) |
| level_7 | Re-dock the Red Crate | 21 | certified — review: [G07](v2-world-6-route-review.md#g07--re-dock-the-red-crate) |
| level_8 | Grand Dockworks | 21 | certified — review: [G08](v2-world-6-route-review.md#g08--grand-dockworks) |
