# Streuph's Maze — game rules

Guide the dot to the exit with its aura matching the world color. Each command
resolves completely before the next one; there are no timed moves or sweeping
beams. Inspect tiles to see their current behavior and state.

## Commands and strokes

| Action | Control |
|---|---|
| Move one cardinal step, pushing one eligible object if legal | Arrows / WASD / HJKL |
| Pull an eligible object immediately behind you while advancing | Shift + direction |
| Action / Rest on the tile you occupy | Space / Enter |
| Undo a nonterminal round | Z |
| Restart the level | R |
| Next level | N |
| Inspect a tile | Click |

A successful move, push, pull or Action/Rest costs **one stroke**. Automatic
movement adds none. A blocked directional command counts as an attempt but costs
no stroke and does not advance conveyors or hazards. A push or pull either moves
both participants together or moves neither. There is no default chain push.

Action affects only your **current tile**, never neighboring tiles. On plain
floor it still acts as rest: eligible passengers already on conveyors can move.
Movement bindings are source-configured; there is no in-game rebinding screen.

## Colors and the exit

There are four gameplay colors: **White, Red, Green and Blue**. The dot's aura
is called **P**; the world color is **W**. Prisms replace P; dials change W.
Colors do not mix, fade or give crates extra movement abilities. Black and muted
tones are display colors, not additional gameplay states.

The exit displays W. You win on a **legal entry** when P and W match at that
entry's checkpoint, after its signal reactions. Standing on the exit and changing
colors to match is not enough: leave and enter again while matching. A winning
entry ends the round before later automatic effects or ray exposure. Physical
closure beneath the dot takes precedence and can fail the attempt first.

## Objects and movement tiles

- **Crates** sit over the floor: moving a crate does not move the terrain.
  Defaults allow pushing and conveyor movement, but not pulling or portal travel;
  authored capability profiles can explicitly enable supported interactions.
  Crate color does not grant mobility.
- **Targets** are non-blocking features. You can walk onto an ordinary stationary
  target without moving or activating it. Moving a target requires an explicitly
  enabled capability; its identity and link move with it.
- **Conveyors** point to their adjacent **exit**, regardless of which side you
  entered from. Their White default tint is mechanically inert. All conveyor
  variants use the same eligibility rules; blocked exits never shove another crate.
  Stationary eligible passengers are checked after a successful command or rest.
- **Ice** continues eligible movement in the incoming direction during that round;
  it does not remember a previous command's direction.
- **Portals** transport eligible occupants to a legal linked partner. Arrival
  does not automatically bounce you back. Blocked destinations do not destroy
  or displace occupants.

Effects on intermediate entered cells still count, even when automatic movement
then carries the dot away. Automatic movement and tile reactions are deterministic,
not controlled by animation speed.

## Signals, gates and polarity

These three sources have different activation conditions:

| Source | Active when… |
|---|---|
| Player plate | The dot occupies it |
| Crate target | A crate occupies the same cell |
| Receiver | A matching-color crate is immediately north, south, east or west |

A diagonal crate, or one on a receiver itself, does not activate that receiver.
Several matching contacts keep it active; same-link sources combine so any active
one can satisfy the link. Tagged keys toggle persistent latches rather than being
consumed. The master lock overrides linked gates. Signals update at every
committed step, including automatic movement.

Color gates check their declared P or W color **when you try to enter** as well
as their effective lock state. A color mismatch blocks entry; it is not physical
closure beneath an occupant. The polarity crystal is separate from colors: use
Action while on it to exchange red-open and blue-open barrier classes.

Linked gates, polarity barriers and master-controlled void share one closure
policy. A crate holds requested closure **pending** until it leaves; reopening
cancels the pending close. Effective closure beneath the dot immediately fails
the attempt. The dot is not pushed out or allowed to continue from a closed cell.

## Rays, failure and recovery

Each emitter projects one fixed cardinal ray. Walls, effectively closed surfaces
and ray-blocking crates shield cells beyond them; open gates and default targets
do not. Rays and any enabled ray-object movement resolve as part of commands,
not a timer. Exposure is checked on the settled board only if the round has not
already won. Passing through a ray during automatic movement is not itself the
final exposure test.

Exposure or physical closure can **fail** the attempt. The settled board and
normal initiating stroke remain; gameplay and player undo are blocked. Failure
awards no completion, best score or victory picture. **Restart with R**, or use
level navigation. There is no automatic return-to-start after exposure.

Z restores a completed nonterminal round, including all its automatic effects.
An engine diagnostic is different from failure: a cycle or invalid transaction
rolls back the entire command without keeping partial changes or charging a
stroke/attempt. See the [technical contract](../openspec/specs/event-resolution/spec.md)
for scheduling, safety limits and state/event guarantees.

## Packs, PAR and progress

The Prologue has 13 levels; six additional worlds have eight each: **61 levels**.
Under `file://`, load packs with the file picker, drag-and-drop or YAML paste.
Imported levels are directly selectable; invalid packs leave the active game
unchanged. See the [pack guide](world-level-packs.md).

**PAR** is the minimum strokes only when the shared solver has proved it and
replayed a winning route. A declared score or personal best is not that proof.
`Unknown` means the search did not establish an answer, not that the level is
solvable or impossible. Automatic motion is free, but Action/Rest counts toward PAR.
Directional balance only chooses a representative among tied minimum routes;
it does not change PAR.

Progress is separate for each world. Earlier-rule scores are not imported into
the current game, and their stored bytes are left untouched. Use current-progress
**JSON export/import** for backup; authored packs are **YAML**. If browser storage
is unavailable or full, progress lasts only for the current session.

For exact definitions and defaults, use the [Tile Mechanics Reference](level-design/tile-mechanics.md).
For contracts, architecture and evidence, start at the [documentation guide](README.md).
