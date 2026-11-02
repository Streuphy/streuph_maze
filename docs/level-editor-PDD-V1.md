# OpenSpec Proposal (Explore Phase): Streuph's Maze Level Editor

> **⚠ HISTORICAL / NOT CURRENT.** This exploratory PDD is retained as design
> history only. It is **superseded** and must not be used as an authority for
> current behavior. The implemented, accepted contract lives in
> `openspec/specs/` and the level-editor workflow in
> [docs/level-editor.md](level-editor.md). See the Status note below for the
> reconciliation against this original draft.

**Target Application:** Streuph's Maze  
**Entry Point:** `editor.html`  
**Document Type:** OpenSpec Exploration & Change Proposal  
**Status:** Implemented by the `level-editor-v1` OpenSpec change. The editor at
`editor.html` consumes the shared YAML loader/validator and the real resolver; see
[docs/level-editor.md](level-editor.md) for the workflow. Accepted-contract
reconciliations versus this original PDD: authored packs are **YAML** (not `.json`),
loaded via `SM.LEVELS.load`; grid bounds are the runtime bounds (width 2–16, height 1–9);
and the palette is **registry-driven** (all 62 registered tile IDs), not a fixed list.

---

## 🎯 1. Executive Summary & Goals

This proposal outlines the functional and technical requirements for building a lightweight, keyboard-accessible, web-based Level Editor (`editor.html`) for **Streuph's Maze**. The objective is to provide an intuitive tool for level designers to create, inspect, edit, and export maze configurations conforming to the game engine's state and entity taxonomy.

---

## 🛠️ 2. Key Capabilities & Requirements

### 2.1 File System & Persistence
* **Local Load:** Load existing `.json` level configurations directly from local disk storage.
* **Local Save:** Export and save the active canvas/level data to local disk as `<level_name>.json`.

### 2.2 Board Configuration & Canvas
* **Custom Dimensions:** Grid dimensions adjustable between **3x3 (Min)** and **16x9 (Max)**.
* **Responsive Visual Canvas:** Clear grid overlay displaying tiles, entities, and spatial boundaries without visual clutter.

### 2.3 Interface Layout & Palette Manager
* **Minimalist UI Layout:** Non-cluttered single-view workspace.
* **Right-Side Categorized Palette:** Organized tile and entity selector grouped by category (`floor`, `wall`, `crate`, `switch`, `target`, `special`).
* **Two Palette Slots:**
  * **Primary / Active Slot:** Currently selected tile/entity used for placement.
  * **Secondary / Background Slot:** Default base floor tile used to clear cells or fill empty grid spaces (can be reassigned by the user).

### 2.4 Navigation & Selection System
* **Arrow Key Navigation:** Move active cursor across grid cells.
* **Region Selection (`Shift` + Arrows):** Select contiguous multi-tile regions for batch operations.
* **Grid Mouse Interactions:**
  * **Left-Click / Drag:** Paint with the Primary slot item.
  * **Right-Click:** Direct placement / context add on the grid.

### 2.5 Dedicated Entity Placement
* **Dot Start Position:** Dedicated single-instance marker tile designating the player avatar's spawn location and starting color aura.
* **Target Position(s):** Dedicated win-condition target tile placement (with associated target color settings).

### 2.6 Inspector & Property Editor
* **State Editing:** When a tile or region is selected, display an Inspector panel allowing updates to starting attributes (e.g., `color`, `state: on/off`, `pushable`, `pullable`, `orientation`).
* **Mixed-State Indication:** If a selected region contains entities with differing property values, visually highlight mixed properties (e.g., `Color: <Mixed>`).
* **Batch Overrides:** Applying a property change while a region is selected forces that attribute across all entities in the selection.

---

## 📋 3. Proposed OpenSpec Explore Prompt

```markdown
### OpenSpec Exploration Task: Streuph's Maze Level Editor (`editor.html`)

Please conduct an exploration phase to design the architectural draft and functional implementation plan for `editor.html` in Streuph's Maze based on the following specifications:

1. **Environment & Files:**
   - Standalone editor page running in `editor.html`.
   - Native File System Access / Download API integration to load and save local `<level_name>.json` files matching the engine's level schema.

2. **Grid & Dimensions:**
   - Dynamic canvas supporting grid sizes from 3x3 up to 16x9.
   - Default fill using the user-defined Secondary (Base Floor) slot.

3. **User Interface & Palette:**
   - Clutter-free layout with a right-hand sidebar categorized palette.
   - Dual-slot selection system: Primary slot (active draw brush) and Secondary slot (default base floor tile).

4. **Controls & Selection Engine:**
   - Grid focus navigation via Arrow Keys.
   - Multi-tile region selection using `Shift` + Arrow Keys.
   - Mouse support: Left-click paint, Right-click contextual placement.
   - Dedicated tools/markers for Dot Start Position and Target Destination(s).

5. **Property Inspector & Batch State Management:**
   - Context-sensitive attribute editing panel for selected tiles or regions.
   - Visual detection and indication of ambiguous/mixed states in multi-tile selections.
   - Deterministic batch forcing across region selections.

**Exploration Deliverables Requested:**
- Proposed UI component structure for `editor.html`.
- JSON Level Schema definition supporting all grid sizes, initial states, and entity taxonomy.
- Event flow diagram detailing keyboard/mouse selection logic and state synchronization.
```