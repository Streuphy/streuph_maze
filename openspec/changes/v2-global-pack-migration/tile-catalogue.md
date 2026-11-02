# V2 tile and object definition catalogue

**Status: proposed target definitions, not a claim of implemented behavior.**
Inventory is observed from `src/js/tiles.js` and all seven shipped YAML packs.
There are **49 used tile IDs**, **13 additional registered IDs**, and the **dot**,
which is an object rather than tile ID 1. Stable numeric IDs are not reused.
The current registry names below identify source definitions; display names for
the two conveyor ID groups must no longer imply different passenger rules.

## Universal definition template

Every tile/object, including the dot, has the following explicit definition:

1. **Identity/classification:** ID or object identity, terrain/feature/object
   layer, category, and where it is used.
2. **Authored attributes:** defaults, supported overrides, color meaning or
   deliberately inert tint, link/carrier/direction, and capability profile.
3. **State:** distinguish immutable configuration, mutable gameplay fields,
   derived queries, and display-only values. Missing hooks are explicit no-ops.
4. **Trigger and queue:** direct action, queue-opening occupancy check, committed
   entry/departure record, occupancy edge, ACTION, or settled hazard sample;
   priorities and stable source ordering are stated rather than inferred.
5. **Preflight/commit:** who can move/activate, source identity and current
   destination legality, one atomic change, resulting effects, and events.
6. **Blocked/terminal/abort:** blocked effects have no partial commit; terminal
   outcomes follow V2; repeated queue state, budget exhaustion, or invalid
   mutation rolls the initiating action back, not just the last hop.
7. **Visibility/lifecycle:** glyph, unique direction cues, inspection, clone,
   snapshot/restore, restart, solver identity, and event-playback requirements.

Shared rules apply to every definition below, not only conveyors. Gameplay
carrier colors are White (`wht`), Red (`red`), Green (`gre`), and Blue (`blu`).
Black/muted palette values are presentation only. A neutral conveyor means
**White**, not a fifth absent-color state. Plain tint does not grant movement
capabilities or invent a floor mechanic; ID 5 explicitly selects ice behavior.

World abbreviations: **P** = Prologue, **W1–W6** = corresponding shipped world.

## All used IDs

Each row supplies its exact default variant and references the complete behavior
definition in the following section. Unspecified fields/hooks are neutral.

| ID | Current registry name | Category/layer | Default attributes | Used in | Definition |
|---:|---|---|---|---|---|
| 0 | `floor` | Floor/terrain | Walkable; neutral appearance | P,W1–W6 | A |
| 1 | `start` | Start/floor marker | Unique authored dot origin | P,W1–W6 | A,B |
| 2 | `goal` | Goal/floor marker | Unique; color derives from world | P,W1–W6 | C |
| 3 | `wall` | Wall/terrain | Solid; presentation Black | P,W1–W6 | A |
| 4 | `void` | Phase floor/terrain | Open unless `master_void` requests solidity | P | D |
| 5 | `ice` | Ice floor/terrain | Incoming-direction transport | W4 | E |
| 10 | `phase_wall` | Linked closing surface | Link 1; requested closed initially | P,W1,W2,W5,W6 | D |
| 11 | `prism_red` | Aura floor | Sets dot `P=red` | P,W5 | F |
| 12 | `prism_gre` | Aura floor | Sets dot `P=gre` | W5 | F |
| 13 | `prism_blu` | Aura floor | Sets dot `P=blu` | W5 | F |
| 20 | `cycle_dial` | World actuator/floor | White→Red; Red→Green→Blue→Red | P,W5 | G |
| 22 | `set_dial` | World actuator/floor | Link 1; target color Red | P,W5 | G |
| 23 | `target_link_1` | Target/feature | Link 1; stationary; momentary | W1,W2 | H |
| 24 | `target_link_2` | Target/feature | Link 2; stationary; momentary | W1,W2 | H |
| 25 | `target_link_3` | Target/feature | Link 3; stationary; momentary | W1,W2 | H |
| 26 | `phase_wall_link_2` | Linked closing surface | Link 2; requested closed initially | W1,W2,W6 | D |
| 27 | `phase_wall_link_3` | Linked closing surface | Link 3; requested closed initially | W1,W2,W6 | D |
| 30 | `aura_gate_wht` | Carrier gate/terrain | `P=wht`; link 0; open lock default | P,W5 | D |
| 31 | `aura_gate_red` | Carrier gate/terrain | `P=red`; link 0; open lock default | W5 | D |
| 32 | `aura_gate_gre` | Carrier gate/terrain | `P=gre`; link 0; open lock default | W5 | D |
| 33 | `aura_gate_blu` | Carrier gate/terrain | `P=blu`; link 0; open lock default | W5 | D |
| 34 | `world_gate_red` | Carrier gate/terrain | `W=red`; link 0; open lock default | P,W5 | D |
| 35 | `world_gate_gre` | Carrier gate/terrain | `W=gre`; link 0; open lock default | W5 | D |
| 36 | `world_gate_blu` | Carrier gate/terrain | `W=blu`; link 0; open lock default | W5 | D |
| 41 | `link_key` | Toggle switch/floor | Link 1; latch initially off | P,W5 | I |
| 42 | `link_plate` | Player plate/floor | Link 1; momentary | P | I |
| 44 | `master_lock` | Global toggle/floor | `master_lock`; latch off | P | I,D |
| 45 | `master_void` | Global toggle/floor | `master_void`; latch off | P | I,D |
| 46 | `polarity_barrier_red` | Polarity closing surface | Open in `red-open` | W3 | J,D |
| 47 | `polarity_barrier_blue` | Polarity closing surface | Open in `blue-open` | W3 | J,D |
| 48 | `polarity_switch` | Global switch/floor | ACTION-only; initial polarity `red-open` | W3 | J |
| 50 | `receiver` | Receiver/floor | Red; link 1; orthogonal crate sensor | P,W6 | K |
| 60 | `crate_east` | Conveyor/floor | Exit East; tint White/inert | P,W4 | L |
| 64 | `player_east` | Conveyor/floor | Exit East; tint White/inert | P,W4,W6 | L |
| 65 | `player_west` | Conveyor/floor | Exit West; tint White/inert | W4 | L |
| 66 | `player_north` | Conveyor/floor | Exit North; tint White/inert | W4 | L |
| 67 | `player_south` | Conveyor/floor | Exit South; tint White/inert | W4 | L |
| 70 | `crate_wht` | Crate/blocking object | White; crate profile M | P,W1,W2,W3,W4 | M |
| 71 | `crate_red` | Crate/blocking object | Red; same mobility as 70 | P,W4,W6 | M |
| 72 | `crate_gre` | Crate/blocking object | Green; same mobility as 70 | W6 | M |
| 73 | `crate_blu` | Crate/blocking object | Blue; same mobility as 70 | W6 | M |
| 80 | `portal` | Portal/floor | Matching link 0; partner required | P | N |
| 81 | `ray_north` | Ray emitter/floor | Cardinal North | W2 | O |
| 82 | `ray_east` | Ray emitter/floor | Cardinal East | W2 | O |
| 83 | `ray_south` | Ray emitter/floor | Cardinal South | W2 | O |
| 84 | `ray_west` | Ray emitter/floor | Cardinal West | W2 | O |
| 93 | `receiver_red_link_2` | Receiver/floor | Red; link 2 | W6 | K |
| 94 | `receiver_gre_link_2` | Receiver/floor | Green; link 2 | W6 | K |
| 99 | `receiver_blu_link_3` | Receiver/floor | Blue; link 3 | W6 | K |

ID 71 is overridden to White in Prologue `level_10`; per-ID authoring overrides
remain authoritative for that level. Registry defaults are not a substitute
for listing effective level parameters in the certification evidence.

## Registered but unused IDs

These entries are supported registry assets, not automatically obsolete code.
They receive the same definition, schema, glyph, and queue regression review.

| ID | Current registry name | Exact variant | Definition |
|---:|---|---|---|
| 21 | `cycle_reset` | World actuator: set `W=wht` | G |
| 40 | `plate` | Player momentary plate; link 1 | I |
| 61 | `crate_west` | Conveyor floor; West exit; White/inert tint | L |
| 62 | `crate_north` | Conveyor floor; North exit; White/inert tint | L |
| 63 | `crate_south` | Conveyor floor; South exit; White/inert tint | L |
| 90 | `receiver_gre_link_1` | Green receiver; link 1 | K |
| 91 | `receiver_blu_link_1` | Blue receiver; link 1 | K |
| 92 | `receiver_wht_link_1` | White receiver; link 1 | K |
| 95 | `receiver_blu_link_2` | Blue receiver; link 2 | K |
| 96 | `receiver_wht_link_2` | White receiver; link 2 | K |
| 97 | `receiver_red_link_3` | Red receiver; link 3 | K |
| 98 | `receiver_gre_link_3` | Green receiver; link 3 | K |
| 100 | `receiver_wht_link_3` | White receiver; link 3 | K |

## Complete behavior definitions

### A. Ordinary terrain, wall, and start

Floor is passable terrain and may be empty or support an eligible object and a
non-blocking feature. It emits no effect by itself. A solid wall rejects dot,
crate, feature, and automatic destinations and blocks ray traversal. Start is
a unique floor marker used to construct/restart the dot, not a second object
and not a hazard recovery destination. Entry/exit/ACT on ordinary floor/start
are no-ops unless a separately registered supported behavior exists. Occupancy
never overwrites supporting terrain. Glyphs distinguish solid boundaries and
start without assigning hidden mechanics from appearance.

### B. The dot — object, no tile ID

The dot has stable object identity, one position, mutable four-color aura `P`
(White by default), and visible world carrier `W`. It can move cardinally,
atomically push one permitted adjacent object, explicitly pull an eligible
trailing object, and use ACTION on its current tile. The existing explicit pull
operation is retained; the superseded automatic-green-floor policy is not.
It is conveyor/portal compatible and vulnerable to hostile rays. Its source,
destination, captured entry/departure identity, terminal outcome, and events use
the same transaction infrastructure as every other movable actor. No tile
code, animation, or input handler may relocate it outside that infrastructure.

The dot cannot share a blocking crate cell. It may stand on a stationary target
without activating it. Failure freezes the board and disables gameplay/undo;
restart reconstructs the level. Successful nonterminal turns remain undoable.
Invariants, clone, snapshots, solver identity, playback, and inspection include
all transition-relevant dot state, never just an SVG marker.

### C. Goal

Goal is a unique passable floor marker whose displayed color is always `W`.
After a committed dot-entry hop, recompute closing surfaces and drain that hop's
signal reactions. Closure failure takes precedence. If `P === W` at the entry
checkpoint, commit victory immediately and cancel remaining effects/ray testing.
A mismatch continues propagation. A stationary change to matching colors or
ACTION without a new entry does not win. Goal never declares an independent
fixed color. Record a single goal event and only then completion/score progress.

### D. Linked gates, carrier gates, and phase void

Requested physical closure is computed from authored defaults, parity of matching
latched toggles, active momentary/sensor sources combined with OR, then the
master lock. Wiring a carrier gate to a link retains the established default-
closed authoring convention unless explicit. Polarity barriers and phase void
have their own request sources but use the same occupied-cell closure policy.

A crate occupying a newly closing surface delays **effective** closure: show
derived `pending-close`, keep it passable subject to occupancy/carrier checks,
and let the crate legally leave. Close immediately after departure, before later
queued movement; a reopened request cancels pending closure. Effective physical
closure under the dot causes terminal failure immediately. No crushing or
implicit relocation occurs. Color mismatch is an independent entry filter, not
physical closure and not a pending-close trigger.

Carrier gates read exactly their declared global `P` or `W` channel and required
color for destination acceptance; do not invent mover-color matching. Phase
void is normally passable and requests solidity while `master_void` is latched.
Requested state, effective passability, and pending-close have one authoritative
or derivable representation and are visible/rebuildable after every effect.

### E. Ice

Ice is an explicitly registered passable terrain mechanic, not any Blue-tinted
floor. Entry with an incoming vector queues one transport step for the dot or
compatible object. Each committed hop re-derives signals and captures entries;
another ice cell queues a continuation. A legal ordinary landing ends sliding;
an illegal next destination leaves the actor on the last legal cell. A stopped
actor has no remembered next-round direction. An invariant/cycle/budget abort
restores the initiating action rather than leaving an arbitrary loop endpoint.

### F. Chromatic prisms

Prisms are passable floor tiles. A committed dot entry captures an ordinary-
priority effect setting `P` to the configured four-color value; current-tile
ACTION invokes the registered action effect once. Captured actor identity and
payload survive later transport: the effect does not retarget another occupant
or disappear because the dot left. Color replacement emits an ordered color
event. It is not mixing, inventory, crate recoloring, or mobility assignment.

### G. World actuators

Cycle dial, reset, and linked fixed-color dial enqueue ordinary entry/ACTION
effects. Cycle order is White→Red→Green→Blue→Red; reset sets White. A set dial
requires an active source on its link **when its queued effect executes**, then
sets `W` to its configured color. Changes emit color events, update the goal
display, and re-derive color-dependent queries. They do not implicitly change
floor mechanics or award stationary goal victory. Mutation/invariant failures
roll back the complete action, including color changes and counters.

### H. Crate-occupancy targets / movable floor features

Targets are non-blocking features over terrain, stationary by default, with
`pushable=false`, `pullable=false`, `conveyor=false`, `portal=false`, and
`ray=ignore`. Explicit supported per-cell capabilities can make a target movable;
its identity/link follows the feature, not its original coordinate. Dot walking
onto an immovable target is ordinary legal entry, not a failed push.

Activity is derived solely from same-cell crate occupancy after each atomic
commit. New activity/release edges enqueue reactions once; unchanged occupancy
does not repeatedly fire. Relocation preserves underlying terrain and recomputes
target/link state. Targets with enabled transport use common destination and
queue rules; they do not become blocking crates. Feature overlap restrictions
and crate sharing remain explicit.

### I. Player plates, tagged toggles, and master toggles

Player plates are passable and active only during current dot occupancy;
activity is derived after each atomic hop, not remembered from stale triggers.
Targets and crate adjacency cannot substitute for the dot. Tagged toggles flip
their latch once per captured entry or current-tile ACTION; repeated distinct
entries in one round are distinct triggers. Master toggles use the same trigger
model and their declared global key. Latches are mutable/snapshotted, signal
activity is derived, and only edges enqueue downstream signal reactions. No
consumable key or timer is implied by `link_key` naming.

### J. Binary polarity

One visible `red-open`/`blue-open` state controls complementary barrier classes;
the default initial state is `red-open`. The crystal switches only on occupied
ACTION, not entry or remote activation. A flip is one atomic effect followed by
derived closure evaluation. Barriers use the same pending-crate and failed-dot
closure rules as D. Polarity is independent of the four color carriers.

### K. Crate-adjacency receivers

Receivers are passable floor sensors, not crate-occupancy targets. A receiver
is active when any matching-color crate is directly north/south/east/west;
diagonal and same-cell crates do not count. Recompute all contact directions
after each committed hop, combining contacts with OR. Only inactive↔active
edges enqueue reactions; losing one of several contacts does not release a link.
Multiple same-link sources combine with OR before closure rules. Show configured
color/link, all matching direction indicators, and actual active state.

### L. Conveyor belt — uniform floor definition

**Definition:** a conveyor is a passable floor tile, neutral White by default.
Its supported tint is reserved appearance data: changing tint has no behavioral
effect. Its cardinal orientation names the **EXIT destination**—North, East,
South, or West—not the side from which passengers enter. The glyph has one
unambiguous arrowhead indicating that exit, and the inspector names it.

**Trigger/queue:** after a successful initiating move/pull or ACTION, queue
initial occupant checks for every conveyor in stable board order, including
stationary passengers. Those checks seed object-specific transport requests;
signals retain higher priority than transport, which precedes ordinary effects.
An arriving eligible passenger queues a further check on its destination belt.
Deduplicate equivalent pending actor/source requests, not real later arrivals.

**Preflight/commit:** for the dot, a conveyor-compatible crate, or an explicitly
transport-enabled feature, revalidate the same passenger at the source and the
adjacent exit cell's bounds, effective closure, carrier filter, layer capacity,
and object profile. A legal request moves that passenger one cell atomically,
emits its movement event, derives signals/closure, and captures entries/exits.
Later effects occur only according to queue ordering. A blocked or stale
request has no movement or extra stroke; a blocked request still consumes an
effect-attempt budget slot. Belts never push an object merely because it is
standing in front of the exit, and do not confer implicit chain strength.

**Variants/lifecycle:** IDs 60–67 share this behavior. Their numeric IDs are
retained data identities, not dot-only/crate-only transport policies. Direction
and tint are immutable metadata; passengers remain independent objects. Color,
frame timing, and gallery code never select outcomes. Queue cycles roll back
the action under the common budget/signature policy.

### M. Crates

Crates are blocking objects over independent terrain, with default White/Red/
Green/Blue variants. Default capabilities are pushable, not pullable,
conveyor-compatible, portal-incompatible, and ray-blocking. Supported per-cell
overrides remain available; color alone never makes a crate fixed/pullable.

Push preflight validates one crate destination and the dot's following cell;
commit both positions atomically before any signal handler observes them.
Explicit pull likewise preflights/commits both actors atomically. No default
chain push exists. Automatic movement uses conveyor/ice/portal/ray capabilities,
not player push permission. Failed destinations do not delete, crush, or
partially relocate an actor. Current successful turns support exact undo; failed
terminal turns require restart. Declared color/capability overrides follow the
crate's identity in snapshots, solver search, and display events.

### N. Portals

Portals are passable linked floor tiles. A matching-link partner determines the
destination under common occupancy/closure/carrier checks. The dot is compatible;
other actors require explicit capability. Dot entry or occupied ACTION requests
transport; an empty or remote portal cannot teleport an actor not present there.
Each portal hop is atomic, captures its own entry/departure records, and emits a
teleport event. The arrival record carries portal-transport provenance so the
paired arrival does not recursively teleport back as a fresh automatic request.
This ends that portal chain, not all remaining queued signal/ordinary work.
Signal/closure derivation still occurs after arrival. Invalid destinations block
that effect; malformed pairing is diagnosed in the shared authoring path.

### O. Static rays and emitter floors

Emitters are the registered passable floor hazards with one fixed cardinal
direction; the emitter cell itself is not an extra multi-axis attack. Ray
traversal stops at walls, effective closed surfaces, or ray-blocking objects.
Open gates and default transparent targets do not shield. Configured object
transport queues atomic legal hops, with stable emitter/source ordering and
per-emitter actor processing provenance to prevent duplicated transport work.

Only after the non-winning queue drains are final rays sampled against the
dot. Exposure commits terminal failure and preserves the failed board; there
is no recovery teleport. Gameplay and undo are blocked; restart/navigation
remain. A matching goal entry that already committed victory skips this ray
sample. Direction, rays, shielding, pending closures, and failure are inspectable.

## Publication and verification obligations

During implementation publish this complete template/content through the
maintained mechanics reference, registry inspection/codex, and classic-script
glyph gallery. Enumerate actual registry entries (including ID 0) and the dot;
do not infer objects by scraping ES module exports or reserving numeric gaps.
For every entry verify default/override values, hook behavior, blocked outcomes,
events, layer preservation, state lifecycle, and representative asset rendering.
Refresh the usage index from the migrated packs: a redesign may change usage,
but must not silently omit a definition, level, or registered supported asset.
