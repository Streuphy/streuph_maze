# Tile Mechanics Reference

This is the maintained authoring index for the sole queued V2 runtime in
`src/js/tiles.js`, `sm-rules.js`, and `levels.js`. Normative contracts are the
[accepted specifications](../../openspec/specs/), including shared
[event resolution](../../openspec/specs/event-resolution/spec.md) and
[conveyor transport](../../openspec/specs/conveyor-transport/spec.md).
Their existing V2 deltas were explicitly synchronized in the documentation review;
release approval is separate. Historical design notes are not alternate playable
policies. All 62 registered IDs and the separate dot are
defined below. Unknown, retired, reserved, and unimplemented IDs are rejected.

The integration contract is states and events. Registered definitions supply
mechanic queries and transitions; the core validates atomic batches, schedules
work and returns complete committed events. See the [PDD vocabulary](../Product_Design_Document.md#2-state-and-tile-model)
for canonical versus derived state and pending intent versus committed output.

## Universal definition template

Every definition is the combination of its exact index row, its behavior group
A–O, and the common contracts below. This applies equally to floor, feature,
blocking object, and dot; no absent hook gets guessed behavior.

1. **Identity / attributes:** stable ID or object identity, category/layer,
   authored defaults, supported overrides, color meaning, direction/link/profile,
   and shipped usage (or explicitly supported-but-unused).
2. **State:** immutable configuration, mutable gameplay fields, derived queries,
   and display-only values are distinct. Registry `state` manifests expose
   `hooks`, `reads`, `writes`, and `events`; object lifecycle is owned by the core.
3. **Triggers / queue:** direct commands, captured entry/departure, current-tile
   ACTION, occupancy edges, transport requests, and final exposure have explicit
   priority and source identity. Unconfigured hooks are neutral no-ops.
4. **Legality / commit:** eligible actors, source and destination checks, one
   atomic mutation, layer/identity preservation, downstream derivation.
5. **Outcomes / events:** blocked effects, terminal precedence, abort rollback,
   complete committed events and authoritative snapshots.
6. **Presentation / lifecycle:** glyph/inspection/codex, clone, snapshot/restore,
   undo/restart, solver identity, passive playback; nothing depends on animation.

### Common state and lifecycle — applies to every entry

Authored terrain, parameters, named strategies, and fixed object definitions
are immutable. Start/crate/target markers normalize once: crate and target
markers leave ordinary floor beneath their independent object/feature layer.
Moving occupants never replaces that supporting terrain. The dot cannot share
a blocking crate cell. A crate can share a target; the dot can walk over a
stationary target without activating or pushing it. Features cannot overlap one
another or be moved onto a crate; no layer silently destroys another.

Positions, P/W, polarity, latches, feature capabilities, counters, outcome/reason,
and object inventory are cloned/snapshotted/restored together. Requested locks,
effective/pending closure, contacts, and activity rebuild from canonical state.
There is no independent stored pending-lock truth. Fixed metadata can be shared
by clones; mutable inventories cannot. Restart reconstructs authored initial
state. Successful non-failed rounds support whole-round undo; failed attempts
block player undo/gameplay, while internal restoration remains available for
rollback. Solver identity includes every transition-relevant state, not visual
animation, discovery, or absolute queue sequence numbers.

Every atomic handler batch is validated and journaled, including direct
multi-field mutations. Readable events include `move`, `push`, `pull`,
`target-move`, `teleport`, `object-teleport`, `colour`, `switch`, `polarity`,
`signal-edge`, `goal`, `failed`, and `ray`. A commit ID and authoritative `state`
snapshot let renderers draw a complete batch, never a half-push. `press` and
`blocked` are explicit; `effect-abort` discards uncommitted playback. Progress
is awarded outside the core only for a real win, never failure or abort.

### Common transaction and terminal rules

Cardinal move, capability-enabled explicit pull (Shift+direction), and current-
tile ACTION use one synchronous resolver. Space/Enter selects ACTION. No
neighbor activation, retained ice direction, floor-derived pulling/strength, or
runtime policy selector exists. P/W are exactly `wht`, `red`, `gre`, `blu`;
Black/mute are presentation only. Initial P/W default White, polarity `red-open`.

Preflight complete direct pushes/pulls, then commit all actors together. A
blocked direct command increments attempts only and seeds no environment work.
Movement and accepted ACTION cost one stroke, automatic hops cost none.
ACTION on ordinary floor is still a valid rest/queue-opening round.

After every commit, derive current occupancy/closure, capture actor-identified
entry/departure records, and queue signal edges. Priority is **signal →
transport → ordinary**, tied by runtime source y/x and enqueue order. The
goal-entry checkpoint runs after signal reactions but before transport/ordinary
work. Closure beneath the dot fails first; matching legal goal entry then wins
and cancels remaining effects/final rays. Stationary equality does not win.
Only a non-winning drained queue samples final exposure; exposure commits
failure and its ordinary initiating stroke, preserving the settled board.

Illegal/stale queued movement is discarded without partial mutation; each
attempt still counts. Equivalent *pending* actor/source requests are deduplicated,
not real later arrivals. Repeated semantic gameplay plus ordered queue/context,
invalid batches/references, exceptions, or the **64 × cell count** attempt budget
roll back the **entire action**, including counters and discovery, with only a
diagnostic. Queue/provenance/direction state is transaction-local, not a hidden
next-turn obligation. Core rules use no DOM, timer, network, or animation state.

## Board and authoring attributes

YAML rows are **top-first**; A1 is runtime bottom-left. Boards have 2–16 columns
and 1–9 rows, exactly one start and goal. Tile-ID `overrides` apply to every
occurrence of that ID. Supported keys are the registered `params` keys below;
unknown keys, wrong types, unsupported enums/colors/vectors are diagnosed.
`link` is a nonnegative integer (receivers require 1–3), `defaultLocked` a
boolean, `carrier` P or W, `openWhen` red-open or blue-open. Mode/scope/key
metadata uses registered `momentary`/`toggle`/`sensor`, `tagged`/`global`, and
`master_lock`/`master_void`; changing metadata never installs an absent hook.
Prefer each registered variant's declared activation semantics.

`dir` is an exact cardinal unit vector: North `(0,1)`, East `(1,0)`, South
`(0,-1)`, West `(-1,0)`. It names the exit/emission direction, not entry side.
`colour` has only the four carrier tokens; ordinary tint cannot invent mechanics.
`initial_player_colour`, `initial_world_colour`, and `initial_polarity` select
supported initial states, not behavior. YAML contains no callbacks or strategies.

`object_overrides` keys such as C2 address authored crate/target markers, not
YAML row numbers. Capability booleans are `pushable`, `pullable`, `conveyor`,
`portal`; `ray` is `block`, `transport`, or `ignore`. Defaults:

| Profile | Pushable | Pullable | Conveyor / ice | Portal | Ray |
|---|---|---|---|---|---|
| C: crates | true | false | true | false | block |
| T: target features | false | false | false | false | ignore |
| Dot | false (self-moves) | false (can pull others) | true | true | ignore as an object; separately vulnerable to exposure |

Example (schema illustration, not an authored-PAR proof):

```yaml
name: "Declared passenger profile"
world_id: declared-passenger
num_level: 1
levels:
  level_1:
    name: "Opt-in transport"
    width: 4
    height: 2
    grid:
      - [0, 0, 0, 2]
      - [1, 0, 71, 0]
    object_overrides:
      C1: { pullable: false, portal: true, ray: transport }
```

## Complete registered-ID index

Usage was refreshed from **all seven migrated packs / 61 levels**: **49 used,
13 supported unused**, plus the dot used everywhere. P = Prologue; W1–W6 =
shipped worlds. A dash means no authored parameters; group definitions supply
physical metadata and full state/queue/events/visual/lifecycle rules. C/T refer
to the exact profiles above. All entries remain supported, including unused ones.

| ID | Registry name | Category / layer | Exact defaults | Usage | Group |
|---:|---|---|---|---|---|
| 0 | `floor` | floor / terrain | — | P,W1,W2,W3,W4,W5,W6 | A |
| 1 | `start` | floor marker / terrain | —; unique origin | P,W1,W2,W3,W4,W5,W6 | A,B |
| 2 | `goal` | floor marker / terrain | —; unique, display W | P,W1,W2,W3,W4,W5,W6 | C |
| 3 | `wall` | wall / terrain | —; solid, not walkable | P,W1,W2,W3,W4,W5,W6 | A |
| 4 | `void` | phase floor / terrain | —; open unless master void | P | D |
| 5 | `ice` | ice floor / terrain | —; incoming vector | W4 | E |
| 10 | `phase_wall` | closing floor / terrain | link 1, defaultLocked true | P,W1,W2,W5,W6 | D |
| 11 | `prism_red` | aura floor / terrain | colour red | P,W5 | F |
| 12 | `prism_gre` | aura floor / terrain | colour gre | W5 | F |
| 13 | `prism_blu` | aura floor / terrain | colour blu | W5 | F |
| 20 | `cycle_dial` | world actuator / terrain | — | P,W5 | G |
| 21 | `cycle_reset` | world actuator / terrain | — | unused | G |
| 22 | `set_dial` | world actuator / terrain | link 1, colour red | P,W5 | G |
| 23 | `target_link_1` | target / feature | mode momentary, scope tagged, link 1; T | W1,W2 | H |
| 24 | `target_link_2` | target / feature | mode momentary, scope tagged, link 2; T | W1,W2 | H |
| 25 | `target_link_3` | target / feature | mode momentary, scope tagged, link 3; T | W1,W2 | H |
| 26 | `phase_wall_link_2` | closing floor / terrain | link 2, defaultLocked true | W1,W2,W6 | D |
| 27 | `phase_wall_link_3` | closing floor / terrain | link 3, defaultLocked true | W1,W2,W6 | D |
| 30 | `aura_gate_wht` | carrier gate / terrain | link 0, carrier P, colour wht, defaultLocked false | P,W5 | D |
| 31 | `aura_gate_red` | carrier gate / terrain | link 0, carrier P, colour red, defaultLocked false | W5 | D |
| 32 | `aura_gate_gre` | carrier gate / terrain | link 0, carrier P, colour gre, defaultLocked false | W5 | D |
| 33 | `aura_gate_blu` | carrier gate / terrain | link 0, carrier P, colour blu, defaultLocked false | W5 | D |
| 34 | `world_gate_red` | carrier gate / terrain | link 0, carrier W, colour red, defaultLocked false | P,W5 | D |
| 35 | `world_gate_gre` | carrier gate / terrain | link 0, carrier W, colour gre, defaultLocked false | W5 | D |
| 36 | `world_gate_blu` | carrier gate / terrain | link 0, carrier W, colour blu, defaultLocked false | W5 | D |
| 40 | `plate` | player plate / terrain | mode momentary, scope tagged, link 1 | unused | I |
| 41 | `link_key` | toggle / terrain | mode toggle, scope tagged, link 1 | P,W5 | I |
| 42 | `link_plate` | player plate / terrain | mode momentary, scope tagged, link 1 | P | I |
| 44 | `master_lock` | global toggle / terrain | mode toggle, scope global, key master_lock | P | I,D |
| 45 | `master_void` | global toggle / terrain | mode toggle, scope global, key master_void | P | I,D |
| 46 | `polarity_barrier_red` | closing floor / terrain | openWhen red-open | W3 | J,D |
| 47 | `polarity_barrier_blue` | closing floor / terrain | openWhen blue-open | W3 | J,D |
| 48 | `polarity_switch` | crystal / terrain | —; ACTION only | W3 | J |
| 50 | `receiver` | sensor / terrain | mode sensor, scope tagged, link 1, colour red | P,W6 | K |
| 60 | `conveyor_east` | conveyor floor / terrain | dir (1,0), colour wht (inert) | P,W4 | L |
| 61 | `conveyor_west` | conveyor floor / terrain | dir (-1,0), colour wht (inert) | unused | L |
| 62 | `conveyor_north` | conveyor floor / terrain | dir (0,1), colour wht (inert) | unused | L |
| 63 | `conveyor_south` | conveyor floor / terrain | dir (0,-1), colour wht (inert) | unused | L |
| 64 | `conveyor_east` | conveyor floor / terrain | dir (1,0), colour wht (inert) | P,W4,W6 | L |
| 65 | `conveyor_west` | conveyor floor / terrain | dir (-1,0), colour wht (inert) | W4 | L |
| 66 | `conveyor_north` | conveyor floor / terrain | dir (0,1), colour wht (inert) | W4 | L |
| 67 | `conveyor_south` | conveyor floor / terrain | dir (0,-1), colour wht (inert) | W4 | L |
| 70 | `crate_wht` | crate / object | colour wht; C | P,W1,W2,W3,W4 | M |
| 71 | `crate_red` | crate / object | colour red; C | P,W4,W6 | M |
| 72 | `crate_gre` | crate / object | colour gre; C | W6 | M |
| 73 | `crate_blu` | crate / object | colour blu; C | W6 | M |
| 80 | `portal` | portal floor / terrain | link 0 | P | N |
| 81 | `ray_north` | emitter floor / terrain | dir (0,1) | W2 | O |
| 82 | `ray_east` | emitter floor / terrain | dir (1,0) | W2 | O |
| 83 | `ray_south` | emitter floor / terrain | dir (0,-1) | W2 | O |
| 84 | `ray_west` | emitter floor / terrain | dir (-1,0) | W2 | O |
| 90 | `receiver_gre_link_1` | sensor / terrain | mode sensor, scope tagged, link 1, colour gre | unused | K |
| 91 | `receiver_blu_link_1` | sensor / terrain | mode sensor, scope tagged, link 1, colour blu | unused | K |
| 92 | `receiver_wht_link_1` | sensor / terrain | mode sensor, scope tagged, link 1, colour wht | unused | K |
| 93 | `receiver_red_link_2` | sensor / terrain | mode sensor, scope tagged, link 2, colour red | W6 | K |
| 94 | `receiver_gre_link_2` | sensor / terrain | mode sensor, scope tagged, link 2, colour gre | W6 | K |
| 95 | `receiver_blu_link_2` | sensor / terrain | mode sensor, scope tagged, link 2, colour blu | unused | K |
| 96 | `receiver_wht_link_2` | sensor / terrain | mode sensor, scope tagged, link 2, colour wht | unused | K |
| 97 | `receiver_red_link_3` | sensor / terrain | mode sensor, scope tagged, link 3, colour red | unused | K |
| 98 | `receiver_gre_link_3` | sensor / terrain | mode sensor, scope tagged, link 3, colour gre | unused | K |
| 99 | `receiver_blu_link_3` | sensor / terrain | mode sensor, scope tagged, link 3, colour blu | W6 | K |
| 100 | `receiver_wht_link_3` | sensor / terrain | mode sensor, scope tagged, link 3, colour wht | unused | K |

ID 71 is explicitly White in Prologue level 10; per-level overrides, not the
default name, determine effective crate color. Unused entries are 21,40,61–63,
90–92,95–98,100. All absent IDs are unsupported; numeric gaps are not placeholders
for guessed mechanics. IDs 6–7 remain retired, not restored one-way floors.

## Complete behavior definitions

### A. Ordinary terrain, wall, and start

**Attributes:** 0/1 are passable floor/marker with no parameters; 3 is solid and
not walkable. Start uniquely constructs the dot; it is not another actor.
**State:** no mutable tile fields; static solidity is configuration. Occupants
are independent. **Triggers/queue:** entry, exit, and ACTION are no-ops here;
wall uses read-only `passability: solidTrait`. Rest still opens the common queue.
**Legality/commit:** floor supports legal actors/features; walls reject every
movement destination and stop rays. **Outcomes/events:** no intrinsic mutation
or terminal outcome; movement/blocked events come from the core. Abort/terminal
rules remain common. **Presentation/lifecycle:** floor/start markers and solid
wall backing; immutable geometry survives all clones/restores. Restart uses
start, never a hazard-recovery teleport.

### B. The dot object — no tile ID

**Attributes:** stable actor ID `dot`, object layer, White P default, world W
display, profile above. It self-moves; other objects cannot push/pull it.
**State:** position, P, outcome/reason are mutable; W/polarity/board queries are
shared gameplay state. The explicit registry state manifest has no tile hooks;
direct actions are core operations. **Triggers/queue:** cardinal movement,
explicit eligible pull, current-tile ACTION, captured actor entries, and common
transport/exposure. **Legality/commit:** no crate overlap; both halves of push/
pull commit atomically. It can walk onto stationary targets without activation.
**Outcomes/events:** move/teleport/colour/goal/failed plus full core journal;
exposure or closure freezes failure, matching legal entry wins. Its object-ray
profile does not shield or transport it; separate vulnerability governs exposure.
**Presentation/lifecycle:** aura P and world ring W, inspectable failed state;
pulse frames are display-only. Full clone/snapshot/restart/search identity, not
an SVG-only marker. The start tile is not the dot definition.

### C. Goal

**Attributes:** unique passable marker 2, no independent fixed-color parameter;
display always W. **State:** no mutable tile state; won/failed are core state.
**Triggers/queue:** dot entry captures a checkpoint after signals, before
transport/ordinary work; `onAct: goal` cannot manufacture an entry checkpoint.
**Legality/commit:** revalidate entered goal, dot identity/position, passability,
and P===W. **Outcomes/events:** closure failure first; otherwise matching entry
commits one `goal`, cancels later work/rays, then external progress can record
the win. Mismatch continues; later stationary equality does not retry it.
**Presentation/lifecycle:** W-colored outline, outcome visible; snapshots/search
include won, restore clears/retains it exactly, restart reconstructs it false.

### D. Linked gates, carrier gates, and phase void

**Attributes:** IDs/defaults above. Linked phase walls have no carrier filter;
carrier gates test declared global P or W, never mover color. Unwired link 0
defaults open; assigning a link defaults closed unless explicitly overridden.
Void 4 is open unless master_void requests solidity. **State:** authored defaults,
latches/polarity and occupancy are canonical; requested/effective/pending closure
are derived. **Triggers/queue:** read-only passability on every preflight;
rederive after every batch and signal reaction. **Legality/commit:** requested
link state is defaults → matching toggle parity → active source OR opens →
master_lock forces closed. Crates defer physical closure while present; departure
closes immediately before later entry unless reopened. Carrier mismatch alone
is not solidity or pending closure. **Outcomes/events:** no crushing/ejection;
closure under the dot immediately fails, ordinary incompatible entry blocks.
`state`/signal events expose changes. **Presentation/lifecycle:** closed backing,
open outline, dashed pending cue; inspector separates requested/effective state.
All derive identically after clone/restore; no second stored lock truth.

### E. Ice

**Attributes:** passable terrain 5, no authored color mechanic or parameters.
**State:** immutable ice; incoming vector is round-local, never snapshotted
momentum. **Triggers/queue:** `forcedMovement: incomingIce` queues one transport
hop after a committed arrival with a vector. Stationary ACTION has no remembered
slide. **Legality/commit:** compatible dot/object checks source, bounds, closure,
carrier, layers; commit one hop, derive signals, capture entries, continue if
the next tile declares transport. **Outcomes/events:** blockers leave the actor
at its last legal cell; no push/conversion/destruction. Common cycle/budget
rollback, movement/state events. **Presentation/lifecycle:** explicit ice glyph,
not any Blue tint; tile identity survives transport, undo, clone, and restart.

### F. Chromatic prisms

**Attributes:** passable 11/12/13, configured four-color replacement for P.
**State:** params fixed, P mutable; no mixing, inventory, object recoloring, or
mobility assignment. **Triggers/queue:** captured dot `onEnter` or occupied
`onAct` uses `setPlayerColour` at ordinary priority. Exit/signal hooks absent.
**Legality/commit:** address the captured dot even if transported away; never
retarget a later occupant. **Outcomes/events:** one atomic replacement and
ordered `colour` plus state event when changed. No stationary win; rollback
restores earlier effects too. **Presentation/lifecycle:** prism tint/inspection
name the configured replacement; P is cloned/restored/search-visible, geometry
stays fixed and restart resets initial P.

### G. World actuators

**Attributes:** cycle 20, White reset 21, linked fixed-color set 22. Cycle order
White→Red→Green→Blue→Red. **State:** W mutable, configuration fixed; set dial's
current link condition is derived. **Triggers/queue:** captured ordinary entry
or occupied ACTION invokes advanceWorld/resetWorld/setWorldIfLinked respectively.
**Legality/commit:** set dial queries active sources **when executing**, then
sets configured W; unsupported metadata never adds hooks. **Outcomes/events:**
ordered `colour`/state when changed; no source means no set effect. No stationary
goal victory. Whole-action rollback includes W. **Presentation/lifecycle:** dial
glyphs/configured link and color; goal display follows W. Snapshot/search/restart
cover W, with no independent mutable goal color.

### H. Crate-occupancy targets / movable floor features

**Attributes:** 23–25, non-blocking feature over independent terrain, T profile,
momentary tagged links. **State:** feature identity, position, profile are mutable
and snapshotted if enabled; activity is current same-cell crate occupancy.
**Triggers/queue:** `activation: targetCrateOccupancy` after every batch; only
edges enqueue signal reactions. Dot occupancy/adjacency and stale entry never
activate it. **Legality/commit:** default stationary target can be walked over;
enabled push/pull/transport obeys common feature-capacity/carrier/closure rules.
No feature-feature overlap or moved feature onto a crate. Link follows identity,
not original position. **Outcomes/events:** target-move/object-teleport, edges,
state; unchanged occupancy does not refire. Common abort, no crushing.
**Presentation/lifecycle:** target mark under cargo, active fill/linked pips;
underlying terrain preserved in clone/undo/restart, identity includes location.

### I. Player plates and tagged/global toggles

**Attributes:** 40/42 momentary player plates, 41 tagged latch, 44/45 global keys.
All passable floor. **State:** toggle latches mutable; current activity/links
derived. **Triggers/queue:** plates use `activation: playerOccupancy`; latches
use captured ordinary entry/occupied ACTION `toggleLatched`, with toggleLatch
activity. Only activity edges enqueue signals. **Legality/commit:** plate needs
the dot, not a crate/target. Every distinct committed entry is a trigger, even
within one round; ACTION does not activate neighbors. **Outcomes/events:**
`switch`, edges, state; master_lock forces locks shut, master_void closes void.
Immediate dot closure can fail; crate-held closure is pending. No consumable
key or timer. **Presentation/lifecycle:** plate/key/master glyphs, active/latch
and link inspection; latches snapshot/restore, activity rederives, restart off.

### J. Binary polarity

**Attributes:** barriers 46/47 are complementary class gates; crystal 48 is
passable and ACTION-only. Initial polarity is level data, default red-open.
**State:** one mutable binary polarity, independent of P/W and linked locks.
**Triggers/queue:** crystal `onAct: flipPolarity`, no entry flip; barriers query
binaryPolarityBarrier. **Legality/commit:** flip is one ordinary atomic effect,
then rederive occupied closure using D. **Outcomes/events:** `polarity`, state;
closed class blocks entry, crate holds pending closure, closing under dot fails.
No barrier tint mixes carriers. **Presentation/lifecycle:** distinct class glyphs,
crystal displays state, pending cues; polarity is cloned/snapshotted/search-keyed
and restart uses authored initial polarity, not prior command history.

### K. Crate-adjacency receivers

**Attributes:** passable sensor floors 50/90–100; exact color/link variants above,
mode sensor/scope tagged. A receiver is not an occupancy target.
**State:** no latch; every matching N/E/S/W contact and
activity is derived. **Triggers/queue:** `activation: crateAdjacencySensor`
after each atomic hop; only inactive↔active edges queue signal work. Multiple
contacts/same-link sources combine with OR, not toggling. **Legality/commit:**
same-cell/diagonal/dot/feature occupancy never qualifies; movement onto a receiver
is otherwise ordinary legal floor. **Outcomes/events:** edge/state updates;
losing one of several contacts does not release a still-supported link. Common
closure/terminal policy downstream. **Presentation/lifecycle:** configured
color/link, all lit contact sides, actual activity; clone/restore/restart derive
from current crate positions/colors, never a stale saved sensor flag.

### L. Conveyor floor — uniform passenger policy

**Attributes:** 60–67 are passable floor with exact cardinal dir and White
reserved/inert tint; duplicate-direction IDs do not select passenger kind.
**State:** tile direction/tint fixed; actors independent. **Triggers/queue:**
post-direct scans include every eligible stationary/new passenger, including
ACTION on no-op floor. Arrivals queue further transport. Stable y/x, then
blocking passenger before movable feature, then enqueue order; signals still
preempt transport. **Legality/commit:** same source actor revalidated, adjacent
exit checked for bounds/effective closure/carrier/layer/profile. One atomic hop
derives signals and captures entries/departures. Pending requests deduplicate,
not later arrivals. **Outcomes/events:** occupied/illegal exits discard requests;
belts never shove a front object or gain chain strength. All attempts count
toward cycle/budget rollback. Core move/push/target-move and state events.
**Presentation/lifecycle:** one explicit White-stroked arrowhead names exit,
inspector says tint inert; no color/timing behavior. Immutable floor survives
movement/restore, queue state ends with the round, restart restores occupants.

### M. Crates

**Attributes:** blocking objects 70–73 over ordinary terrain, four default colors,
C profile. Color matches receivers; it does not choose mobility. Supported
per-object profiles override defaults explicitly. **State:** identity/position
and declared profile follow the crate, not supporting tile. **Triggers/queue:**
direct push/eligible pull; compatible conveyor/ice, opt-in portal/ray transport;
rayObjectProfile is a read-only query. **Legality/commit:** one-object push/pull
preflights both actors atomically. No chain push, deletion, crushing, or partial
move. Auto movement checks its own capability, not direct push permission.
**Outcomes/events:** push/pull/object-teleport, state and derived target/sensor
edges; crate-held closure uses D. Failure/abort follow common policy.
**Presentation/lifecycle:** visible crate color/position over supporting floor,
inspection profile; immutable configuration and stable identity, full occupancy
snapshots/clone/undo/search, authored restart. No implicit respawn behavior.

### N. Portals

**Attributes:** passable linked floor 80, default link 0. Prefer exactly two
endpoints per link; unpaired/odd counts warn. **State:** partner locations fixed,
arrival provenance local to the action. **Triggers/queue:** linkedPortal transport
on committed arrival; teleport hook on occupied ACTION/entry never addresses a
remote/empty cell. Paired transported arrival does not bounce back.
**Legality/commit:** same current passenger and partner, dot compatible, others opt-in;
current bounds/carrier/closure/layers revalidated. One atomic relocation still
captures entry/departure and derives signals. **Outcomes/events:** teleport or
object-teleport plus state; invalid partner/destination blocks that effect, not
earlier legal work. No recursive arrival chain. **Presentation/lifecycle:**
paired link marks, profile inspection; endpoints stay fixed under occupant
movement, snapshots/search include actors, no retained portal state after drain.

### O. Static rays and emitter floors

**Attributes:** passable emitter terrain 81–84, exact fixed cardinal vector.
The emitter cell is not an extra multi-axis attack; tracing begins adjacent,
so same-cell cargo does not shield the source's own outgoing beam. **State:**
configuration fixed, visible ray cells derived from current board.
**Triggers/queue:** cardinalRayEmitter/rayObjectProfile queries; configured object ray
transport queues legal atomic hops in source order with per-emitter session
provenance, preventing duplicate whole-ray work. Final dot exposure samples only
a non-winning drained queue. **Legality/commit:** walls/effectively solid
surfaces and ray-blocking objects stop rays; open gates and default targets do
not. Transport uses common object capability and destination rules.
**Outcomes/events:** moved-object/state/edge events, final `ray`; final exposure
commits failed, not a recovery teleport. Prior matching goal entry skips this
sample; closure takes earlier precedence. **Presentation/lifecycle:** static
direction glyph, inspectable cells/shields/failure, no timer; rays rebuild after
restore/clone/restart, no persistent swept phase or renderer-owned outcome.

## Publication and verification

The shared [rendering contract and guide](../rendering.md) now maps these
definitions to original 32×32 pixel art (default) or vector geometry using the
same Konva compositor. The play page, gallery, codex, editor and generated image
export share that mapping; no alternate gameplay renderer or ruleset is selected.
Static/reduced motion retains semantic colors, contacts, links and pending marks.

`glyphs.html` consumes the same local classic-script registry/glyph renderer,
enumerates all actual IDs including 0 and the separate dot, and exposes pending/
failed/tint display samples without simulating another engine. Gallery arrows
have an explicit visible stroke. Inspector/codex and event playback share the
same definitions; the renderer never chooses outcomes.

Use `npm run test:unit:registry`, `test:unit:rules`, and `test:unit:levels` for
focused work. `npm run levels:routes -- --early-review` covers all seven packs;
`node scripts/audit-v2-assets.js` checks usage/definitions/evidence and accepted
spec synchronization. `--preaccept` reports pending mappings without bypassing
other failures; it is not release approval. The [archived review](../../openspec/changes/archive/2026-11-02-doc-review-v2-ruleset/review.md)
records the completed mappings and its historical draft finding. The current
[rendering verification](../../openspec/changes/graphiscs-engine-update-pixel-16bit/verification.md)
records the isolated graphics branch's fresh passing audit/native checks.
The 61-row ledger links complete route/lesson reviews, including optional elements
and late wrong-push consequences. Unknown is not a minimum or impossibility
proof. Final `npm test` and real Chromium `file://` checks remain distinct gates.
