# Glyph rendering specification delta

## Purpose

Defines one shared, offline presentation contract for abstract pixel/vector identities, sprite animation, readable state, accessible board interaction and image export across the game, gallery and level editor without changing gameplay.

## ADDED Requirements

### Requirement: Every visual consumer uses the shared presentation contract
Play, gallery, codex, editor boards, palettes, help, snapshots, quick-test and generated solved-board images SHALL use the same identity definitions and state-to-visual mapping. Each surface SHALL own its own view instance. Editor interaction and solving controls SHALL remain consumers, not a second renderer or rules engine.

#### Scenario: One definition appears in several surfaces
- **WHEN** the same definition, parameters, view state and identity appear in play, gallery and editor
- **THEN** color meaning, silhouette, direction, link indicators and state marks agree apart from scale and surface-specific selection overlays

#### Scenario: Editor quick-test and snapshot preview
- **WHEN** an editor shows a snapshot or runs a quick-test route
- **THEN** it uses the shared rendering path while edits, solver results and quick-test progress remain separate from gameplay progress

### Requirement: Both identities cover the complete supported catalogue
The renderer SHALL provide pixel and vector identities for every registered supported tile and the separate dot, including supported-unused variants, declared overrides and relevant visible states. Pixel SHALL be the initial default. Unknown IDs SHALL remain diagnostics, not invented mechanics; a supported blank floor SHALL not be mislabeled as missing artwork.

#### Scenario: Full catalogue is displayed
- **WHEN** the current catalogue of 62 IDs plus the dot is inspected in either identity
- **THEN** each supported definition has a deliberate representation, with no numeric-gap placeholders or omitted unused variants

#### Scenario: Authored direction and link override
- **WHEN** a supported source has an overridden cardinal direction or supported link
- **THEN** its visual uses the effective parameter and does not guess from the numeric ID or a baked default sprite

### Requirement: Pixel art follows an original abstract puzzle vocabulary
Pixel identity SHALL use original low-resolution art inspired by Japanese 8/16-bit puzzle conventions, with consistent pixel scale, silhouettes and contrast. Walls, braced crates, floors, switches, targets, receivers, gates, portals and the dot SHALL be distinguishable without a narrative skin. It SHALL NOT copy commercial sprites or introduce medieval/futuristic theming.

#### Scenario: Distinct pieces share a color
- **WHEN** a wall, crate, plate, target and receiver appear together using neutral or matching colors
- **THEN** shape and structural marks still distinguish their different roles in a static frame

#### Scenario: Art is inspected at playable scale
- **WHEN** a small board and a 16-by-9 board are displayed at supported viewport sizes
- **THEN** pixel edges, movement directions and state marks remain readable without relying on a glow, blur or animation phase

### Requirement: Palette animation preserves semantic color meaning
The renderer SHALL preserve White, Red, Green and Blue gameplay identities. Dot fill SHALL express P, goal SHALL express W, gates SHALL show their configured requirement and carrier, and crates/receivers SHALL retain configured colors. Shade cycling SHALL NOT rotate a semantic role through other carrier colors. Polarity class and inert conveyor tint SHALL remain distinct concerns.

#### Scenario: Gate differs from current carrier
- **WHEN** a Red P-gate is displayed while P is Blue
- **THEN** the gate remains visibly Red and P-based rather than recoloring Blue or appearing open solely because of its artwork

#### Scenario: Decorative cycle advances
- **WHEN** conveyor, ice or portal animation advances frames
- **THEN** semantic color anchors and the indicated exit remain stable and no frame suggests a new carrier, inventory item or timer-based rule

### Requirement: State distinctions remain readable without motion
Both identities SHALL distinguish inactive/active sources, latches, requested/effective closure, pending closure, terminal failure and victory using stable marks as well as color. A crate SHALL not hide its supporting pending-close indicator or occupied target. Receiver contacts and link correspondence SHALL remain inspectable. Failure styling SHALL preserve actual colors and settled positions.

#### Scenario: Crate holds a surface pending
- **WHEN** closure is requested beneath a crate
- **THEN** the crate, pending mark and supporting-surface identity remain visible, and reopening or departure updates that mark from current state

#### Scenario: Failure freezes a colored board
- **WHEN** a round commits failure with distinct dot, world and crate colors
- **THEN** the failed board retains those colors and positions, shows a stable failure cue and does not animate a return-to-start or falsely closed/open surface

#### Scenario: Several receiver contacts coexist
- **WHEN** matching crates touch a receiver from multiple cardinal directions
- **THEN** all matching contacts can be identified without treating contact count as multiple toggles or confusing adjacency with same-cell targets

### Requirement: Playback projects committed state and events only
The renderer SHALL consume canonical view state and ordered committed events without mutating rules or deriving outcomes from animation. Atomic commit batches SHALL be presented coherently. Interpolation SHALL be cosmetic between committed positions; diagnostic-abort work SHALL not appear as a retained move. Identity and animation changes SHALL not affect search, counters, latches or progress.

#### Scenario: Atomic push is animated
- **WHEN** a committed push moves the dot and crate together
- **THEN** the shared view updates both actors in one commit frame and never presents a half-push as an authoritative board

#### Scenario: Identical route uses different presentation settings
- **WHEN** the same route runs with either identity, full motion, reduced motion or interrupted playback
- **THEN** snapshots, terminal outcome, event order, strokes, turns and solver result are unchanged

#### Scenario: Action aborts diagnostically
- **WHEN** the resolver returns a diagnostic with full-action rollback
- **THEN** only the restored board and diagnostic are presented, with no tentative movement or completion retained

### Requirement: Playback interruption and disposal settle safely
New input, restart, undo, navigation, theme changes and disposal SHALL cancel stale visual work safely. Interrupted playback SHALL settle to its committed final state before another round is presented. Completion callbacks SHALL run at most once; obsolete callbacks SHALL not repaint a replacement surface or publish progress. Old timers, animations, listeners and nodes SHALL be released.

#### Scenario: Input interrupts conveyor playback
- **WHEN** another gameplay command arrives while a committed conveyor route is animating
- **THEN** the existing route settles immediately and the next command is not delayed or resolved from an intermediate visual position

#### Scenario: Navigation occurs during a transition
- **WHEN** a different level replaces a surface with active visual work
- **THEN** old callbacks cannot move its actors, alter its HUD or trigger victory after the replacement is mounted

### Requirement: Animation has complete static and reduced-motion modes
Presentation SHALL support bounded sprite-frame and decorative shade animation without making motion necessary to identify a tile or state. System reduced-motion preference SHALL be honored by default. Reduced/static mode SHALL retain directions, contacts, closure and terminal cues; failed boards SHALL have no ambient motion and hidden/disposed surfaces SHALL stop scheduling animation.

#### Scenario: Reduced motion is enabled
- **WHEN** the user requests reduced motion or the system preference applies
- **THEN** a representative static frame and immediate committed-state updates replace ambient cycling and movement tweens without changing gameplay

#### Scenario: Animated surface becomes hidden
- **WHEN** a preview is hidden or a page is backgrounded
- **THEN** unnecessary animation stops and resuming draws current committed state without a long catch-up queue or retained hidden rule work

### Requirement: Identity preferences are presentation-only and recoverable
Play, gallery and editor SHALL expose pixel/vector selection consistently. Explicit URL selection SHALL override a stored preference, with pixel as the default when neither is valid. Preferences SHALL use storage separate from game progress and YAML. Storage denial SHALL degrade to session behavior. A missing pixel resource SHALL use an identified vector fallback without changing gameplay.

#### Scenario: Theme changes during editing
- **WHEN** the user selects vector while editing a pack or inspecting solver snapshots
- **THEN** only presentation changes; authored YAML, edit history, snapshot buffers, route results and progress remain unchanged

#### Scenario: Presentation preference cannot be stored
- **WHEN** local storage is denied or full
- **THEN** identity controls still work for the current session and no game-progress record is reset or migrated

### Requirement: Offline rendering assets are freely redistributable
All runtime libraries, sprite data, frame metadata and license notices SHALL ship locally and permit redistribution with this GPL project. Play, gallery and editor SHALL work under ordinary Chromium file URLs without network, fetched sibling manifests, a server, browser-security overrides or a player build step. Resource failure SHALL be diagnosed without changing a valid board or silently claiming pixel coverage.

#### Scenario: Fresh offline checkout is opened
- **WHEN** each page is opened directly from disk with no network and an empty browser cache
- **THEN** both identities, their supported animations and previews load from shipped resources with preserved third-party notices and no runtime CDN dependency

#### Scenario: Canvas is unavailable
- **WHEN** a browser cannot create the required drawing context
- **THEN** it presents an accessible renderer-unavailable explanation without hanging, fabricating gameplay, or claiming the vector identity can bypass the same missing backend

### Requirement: Board interaction remains accessible across surfaces
The renderer SHALL preserve labeled board coordinates, keyboard focus, inspection and editor hit testing independently of drawn pixels. A1 SHALL remain bottom-left after resizing, zooming or changing identity. Pointer and keyboard selection SHALL agree, decorations SHALL not capture editing input, and text controls/HUD SHALL remain accessible outside canvas.

#### Scenario: Editor selects a resized cell
- **WHEN** the user points at a cell or reaches it with the keyboard after resizing or changing device scale
- **THEN** both methods select the same board coordinate and dispatch only the intended edit or inspection action

#### Scenario: Board is read without relying on pixels
- **WHEN** a user navigates its semantic grid and inspection controls
- **THEN** labels expose terrain, occupants, colors, link/direction, source activity, closure and outcome without requiring color vision or active animation

### Requirement: Shared image export preserves solved and authored data
Generated World 1 victory images and presentation previews SHALL use the shared identity mapping and an export-safe asset path. Valid custom victory images SHALL retain precedence. Exporting an image SHALL not serialize visual frames into world YAML, alter progress, or replace authored initial configuration with a transient play state.

#### Scenario: Solved board has no custom victory picture
- **WHEN** a World 1 level is won without a custom image in either identity under file URLs
- **THEN** its generated picture depicts the settled solved board, including crate/target state, without canvas security errors

#### Scenario: Custom victory picture is present
- **WHEN** a valid custom PNG is configured
- **THEN** it is displayed instead of the generated board and restart/navigation clears the old image as before

#### Scenario: Editor exports after animation and theme changes
- **WHEN** the user plays a quick test, changes identity and saves the authored pack
- **THEN** the YAML still contains authored initial data and no sprites, preferences, animation clocks or transient play state
