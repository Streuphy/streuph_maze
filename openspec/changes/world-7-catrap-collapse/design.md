# Design

## Context

See `proposal.md` and `specs/crumbling-trails/spec.md` for the player-trail behavior.

The current state contains a static tile grid and separate crate positions. `void` ID 4 is a different mechanic: its solidity is controlled by the deferred master-void switch; it does not remember player history. The resolver already has clone/snapshot/restore, a state signature, returned step records, and bounded BFS. All successful player relocation paths (normal movement, forced conveyor movement, and teleport) must respect one consistent departure rule. `world-1-sokoban` is defining the common world-pack and crate-overlay format.

## Goals / Non-Goals

**Goals:**

- Give designated floor a persistent per-run collapsed state triggered only when the player leaves it.
- Apply that state consistently to movement, crate destinations, rendering, undo, and solver search.
- Keep the feature deterministic and bounded under the existing loader solver budget.
- Deliver eight levels while adapting concepts that would require unsupported crate-bridging or wall-clock timing.

**Non-Goals:**

- Reuse or alter ID 4's phase-void/master-void behavior.
- Let crates trigger collapse, bridge a collapsed cell for the player, or restore collapsed ground.
- Add a complete general deadlock detector or promise that every dense level is solved within the browser BFS budget.
- Add real-time effects or change portals' existing pairing/teleport rules.

## Decisions

### 1. Represent crumble ground as immutable terrain plus a dynamic collapsed bitmap

Add a dedicated terrain tile, provisionally ID 101, that is initially walkable and marked as crumble terrain. Store a `crumbled[y][x]` boolean grid in mutable game state. The static level grid never changes; `isSolid` and movement validation treat a marked cell as void. This keeps authored identity intact and makes reset create a fresh bitmap.

ID 101 is selected above the other pending plans' proposed ranges (World 2 IDs 81–84 and World 6 IDs 90–100); reconcile it in the combined registry allocation before coding. Do not reuse ID 4 because its phase-dependent semantics are unrelated.

### 2. Centralize player departure transitions

Whenever the player's coordinates successfully change, inspect the cell being left. If its static tile is the crumble tile and its bitmap entry is still false, mark it collapsed and return a `crumble` step for rendering. Call the same transition for ordinary movement, any player conveyor hop, and teleport relocation. Do not call it for blocked moves, ACT in place, crate movement, or renderer animation. This makes “leave” a rules event, not a display effect.

For a push, first verify the crate destination. The player leaves their current tile as they enter the crate's previous cell; only that player departure can collapse ground. A crate may occupy an intact crumble tile without collapsing it. If later pushed away before the player has stood there and left, the tile remains intact. No crate bridge behavior is added.

### 3. Make collapsed cells block every entity destination

Use one `isSolid`/destination rule for player movement and crate pushes: out-of-bounds, static solid tiles, dynamic gates, and collapsed cells reject entry. Current occupants are never ejected when a tile collapses behind them; collapse occurs only after the player has left, so the cell will not collapse under the player. A crate on a crumble tile does not cause it to collapse.

### 4. Include the bitmap in every state identity and lifecycle path

Initialize all cells uncollapsed, deep-copy the bitmap for solver successors, capture it in undo snapshots, restore it exactly, and append a deterministic compact representation to the solver signature. Since the bitmap is derived only from player departures and never from rendering, identical state/action pairs remain deterministic. A reset/new level starts with every crumble tile intact.

### 5. Render collapsed state as a hole and retain tile inspection

Expose `crumbled` through the rules read-only tile description. The renderer draws the original tile glyph while intact and an unmistakable void/hole mark once collapsed. Keep this state separate from ID 4's phase-void visual so the two mechanics cannot be confused. The renderer animates the returned crumble step but cannot alter the bitmap.

### 6. Bound search and revise incompatible content ideas

Include the bitmap in the existing BFS key; use its state/depth budget and report `unknown` instead of hanging. Levels 1–3 remain small enough for exact search. Dense mastery content must be authored to fit the budget or receive an independently reproducible verification; `unknown` is not proof of solvability. Reinterpret blueprint L4's crate “bridge” as crate positioning around surviving paths because crates cannot be stepped over and are not bridges. Encode the odd corridor as width 16 × height 2 if retained, correcting the table/prose mismatch. Portals preserve crumble history and never restore ground.

## Risks / Trade-offs

- [The per-cell bitmap expands the solver's state space exponentially] → Keep early maps small, return bounded `unknown`, and avoid claiming exact par without proof.
- [A missing departure hook for a forced move can allow re-entry] → Centralize all player-coordinate changes and test normal, conveyor, and teleport departures.
- [Renderer/rules state can diverge during animation] → Rules own the bitmap; render only returned steps and verify the display mirror against a fresh redraw.
- [Crates placed on crumble ground may be interpreted as bridges] → Explicitly document and test that crates do not make collapsed cells traversable and do not trigger collapse.
- [ID 101 is not yet in the frozen registry] → Reserve it in the cross-world ID map before implementation and validate no duplicate registration.
- [Legacy ID 4 void may be mistaken for crumble] → Use separate definitions, names, glyph states, tests, and world documentation.

## Migration Plan

1. Add the crumble terrain definition and bitmap lifecycle to level construction/state clone/snapshot/restore.
2. Route all player departures through the collapse transition and update solidity/solver identity; add headless movement and undo tests.
3. Add collapsed-cell visuals and browser tests for holes and level reset.
4. Author and validate the eight World 7 levels, record solver status/par evidence, and manually inspect portal and route behavior.

Rollback removes the World 7 pack and ID 101 terrain feature through a later change. Existing ID 4 and master-void behavior remains untouched.

## Open Questions

- None blocking. Crumble is player-triggered only, and crates do not bridge the holes; these semantics are fixed for this version.
