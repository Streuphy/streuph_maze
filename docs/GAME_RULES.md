# Streuph's Maze — rules of the game

These are the player-facing rules of the sole queued V2 implementation. The
[Tile Mechanics Reference](level-design/tile-mechanics.md) defines every tile
and object; the [PDD](Product_Design_Document.md) explains transaction ownership.
The selected `v2-global-pack-migration` tracks final verification and pending
accepted-spec synchronization, not a second playable ruleset.

## Inspectable state

The dot is the controllable object. Its position/aura, world color, crates,
switches, signals, barriers, arrows, and ray cells determine the next outcome.
Inspection exposes relevant state; no hidden previous input, timer, or animation
phase can change gameplay. This means inspectable state, **not absence of state**.

World and dot colors are exactly White, Red, Green, and Blue. Black/mute are
presentation colors only. Prisms replace the dot's aura P; dials change world W.
Colors do not mix, decay, grant crate mobility, or create an inventory. The goal
always displays W. Polarity red-open/blue-open is a separate binary state.

## Commands and rounds

- Arrows/WASD/HJKL move one cardinal step, or push one eligible object if the
  complete push is legal. There is no default chain push.
- Shift+direction explicitly pulls an eligible trailing object into the dot's
  vacated cell while the dot advances. Capabilities, not floor color, permit it.
- Space/Enter or Action/Rest invokes the **current tile only**. Missing hooks
  are no-ops, but rest still opens an environmental propagation round. It does
  not activate neighboring objects or tiles.
- The initiating movement/push/pull and every accepted ACTION cost one stroke.
  Automatic work costs none. A blocked direct command increments attempts but
  costs no stroke and triggers no environmental work.

One command resolves completely before another gameplay command. Push/pull
actors commit together; no signal sees a half-move. Each committed hop derives
current signals and captures supported entry/departure triggers by identity.
Priority is signal reactions, then transport, then ordinary effects; source y/x
and enqueue order break ties. Newly produced signals preempt remaining transport.

## Movement and signals

Objects/features sit over independent terrain; moving them never drags the
floor. Stationary targets are non-blocking. Default crates are pushable, not
pullable, conveyor-enabled, portal-disabled, and ray-blocking. Explicit authored
profiles can change supported capabilities. The dot has its own object definition,
not the start marker's definition.

Conveyor arrows name the adjacent **exit**, regardless of entry side. All belt
IDs share one passenger policy, with White/inert tint. Post-direct scans include
eligible stationary passengers, including during rest. Occupied exits block;
belts never shove objects standing in front. Explicit ice carries the incoming
direction only in that round. Portals respect eligible occupants and destination
legality; arrival provenance prevents bouncing back automatically.

Player plates use dot occupancy; targets use same-cell crate occupancy;
receivers use matching-color cardinal crate adjacency. They are not substitutes.
All receiver contacts and same-link sources combine with OR. Only activity edges
create reactions; unchanged occupancy does not repeatedly fire. Tagged toggle
keys latch rather than being consumed. Master lock forces linked gates shut.

Carrier gates test their declared P or W **at entry**. Link/default/toggle/source/
master state separately requests physical closure. Gates, polarity barriers,
and phase void use the same occupied closure policy: a crate holds closure
visibly pending until departure; reopening cancels it. Effective closure beneath
the dot fails immediately. Mere carrier mismatch is an entry filter, not closure.

## Win, fail, and recover

After a legal dot **goal entry**, resolve its signal reactions and closure first.
If P equals W and the dot still legally occupies that goal, victory commits
immediately and cancels later effects/rays. A stationary color match or ACTION
while already there does not manufacture another entry.

Only a non-winning drained queue gets final ray exposure testing. Exposure fails
the attempt, preserves the settled board and normal stroke, and blocks further
gameplay/undo. Closure beneath the dot can fail earlier, before victory. Failed
attempts award no completion/best score or victory image. **R restarts**; level
navigation remains available. Z undoes successful non-failed rounds, not a failed
attempt. There is no automatic hazard recovery teleport.

Cycles, invalid mutations, exceptions, or the 64-attempts-per-cell action budget
are different: they roll back the **whole action**, charge no stroke/counter,
retain no partial mutation/discovery, and report a diagnostic rather than a loss.

## Worlds and golf scores

The Prologue has 13 levels; six implemented worlds have eight each: 61 total.
Imported world levels remain directly selectable; no prototype prerequisite
authoring field is supported. A score/PAR is an actual minimum only after the
shared solver proves it and the route replays through the real resolver.
Unknown is neither a minimum nor an impossibility proof. Directional balance
chooses a representative among tied minima; ACT counts toward PAR but not
U/D/L/R balance. Personal bests and partial world totals are separate records.

Current progress uses contract `v2-queued`, schema 1, in a fresh V2 namespace.
Prior serialized scores are left unread and untouched, never imported as current
completion. Export/import current progress JSON for backup; authored levels
remain YAML. Storage can fall back to session memory under `file://`.
