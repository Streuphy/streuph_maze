# Proposal

## Why

Streuph's Maze needs an original, abstract pixel-art identity inspired by Japanese 8/16-bit puzzle-game visual conventions, with every mechanic and state readable at a glance. Its current SVG-fragment consumers span play, gallery, codex, victory images and editor UI, so the redesign must establish one shared presentation system rather than another editor-specific renderer.

## What Changes

- Introduce a Konva Canvas2D presentation backend, vendored locally under MIT with exact version, checksums and notices; preserve classic scripts, offline `file://` use and no build requirement for players.
- Make `pixel` the default identity and retain a complete `vector` alternate/fallback through the same presentation model, compositing and playback path. This is a visual choice, not a gameplay ruleset selector.
- Deliver a complete original baseline pixel set for all 62 registered tile IDs plus the separate dot, including supported-unused variants, custom directions/links and relevant state combinations. Use abstract walls, braced crates, floor marks and switches, not a medieval/futuristic skin or copied commercial sprites. Do not postpone core art coverage to a later change.
- Support sprite frames and shade/palette cycling that preserve semantic color, direction, links, occupancy and closure. Provide reduced-motion/static equivalents and readable failure/win states without recoloring actual gameplay meaning.
- **BREAKING (internal presentation API only):** replace SVG-fragment insertion with shared glyph/board/thumbnail/export presentation APIs. Migrate play, gallery, codex, editor palette/help/edit board/snapshot previews/quick-test and generated World 1 victory snapshots together. Retain user-facing authoring and solving workflows; no new solver or editor feature is introduced.
- Use canonical states and ordered committed events as the presentation input. Preserve atomic commit playback, interrupt-and-settle behavior, restart/undo, terminal precedence and diagnostic rollback; animation never calls the resolver to decide an outcome.
- Add theme controls, isolated presentation preferences, accessible semantic board/inspection controls, bounded animation resources and native-browser coverage for both identities across all consumers.

## Capabilities

### New Capabilities

- `glyph-rendering`: Shared offline visual identity, complete pixel/vector definitions, sprite/palette assets, passive state/event playback, accessible interaction, editor-consumer integration, image export and presentation lifecycle guarantees.

### Modified Capabilities

None. Accepted `event-resolution`, `tile-mechanics`, `conveyor-transport` and `world-level-packs` already specify state/event semantics, inspectability, exit arrows and solved-board images without requiring SVG output. They are consumed unchanged; a new rendering backend does not justify duplicating or weakening their requirements. The active editor and standalone-solver changes retain their own scope and acceptance gates.

## Impact

- Main integration points: `src/js/sm-glyphs.js`, `sm-render.js`, `sm-ui.js`, the presentation binding of `sm-editor.js`, game/editor CSS, `index.html`, `editor.html` and `glyphs.html`. Add local Konva distribution/notices and shared presentation/asset modules as needed.
- Update all SVG-specific presentation tests and native evidence tooling without replacing behavior assertions with mocks. Preserve pure/headless registry, rules, editor-model and solver testing without a Canvas dependency.
- Regenerate renderer-bound native evidence after implementation; preserve mathematical proofs if engine/pack fingerprints remain unchanged. Keep World 1 solved-board fallback, valid custom PNG victory art and authored YAML export intact.
- Document the art vocabulary, frame/manifest format, accessibility, themes, animation lifecycle, shared API and license provenance. Use original editable indexed-pixel sources as the baseline assumption; external/AI art and optional polish are not prerequisites.
- No new mechanic, tile/object, carrier color, world pack, PAR, inventory, schema field or gameplay-progress migration. No WebGL, network assets, mandatory modules/server/build, proprietary art/runtime, or changes to resolver/search semantics.
- Preserve unrelated working-tree changes, user drafts, archived records and in-flight editor/solver work. Rebase presentation adapters onto their current implementation before apply; do not absorb their unresolved functionality or audit blockers.

## Delivery branch

All implementation, asset authoring, presentation integration and verification for
this change will take place on **`graphiscs-engine-update-pixel-16bit`**, tracking
**`origin/graphiscs-engine-update-pixel-16bit`** in
`https://github.com/Streuphy/streuph_maze`. Do not implement this change directly
on `main` or switch this shared checkout to another activity mid-task.

The branch was created and published on 2026-11-02 from committed HEAD
`1322961c01a17333c951093e77c07f785e827e7c`. Publishing that reference did not
commit or upload the pending planning artifacts, accepted-spec documentation,
editor/solver prerequisites or other local work. Their presence in the working
tree is not evidence that a fresh checkout of this remote branch contains them.

Before implementation, establish a reviewed, reproducible prerequisite baseline
on this branch. Any prerequisite commits/merges require separate scope review;
do not silently include unrelated changes, stage the whole tree, discard local
work or force-push to manufacture a clean baseline. Future publication and merge
to `main` remain explicit user/review actions. The renderer scope and behavioral
contract are unchanged by this branch requirement.
