# Design

## Context

See `proposal.md` for motivation and `specs/glyph-rendering/spec.md` for observable requirements. Discovery was read-only; the repository already contains substantial uncommitted documentation, editor and standalone-solver work, the World 6 archive move and user drafts. This change must recheck those boundaries before applying. `level-editor-v1` is still active; its remaining acceptance work is not completed by this proposal.

Observed integration points:

- `sm-glyphs.js` builds 24×24 SVG fragments. Its selector uses family/name plus presentation data; `inst.glyph`, parameters and presentation descriptors already provide a reusable visual vocabulary.
- `sm-render.js` builds DOM cells, composes terrain/feature/crate/ray fragments and a separate player overlay, mirrors states, batches events by commit ID, and exposes `build`, `draw`, `fitBoard`, `play`, `cancel` and `applyFrame`. It avoids unnecessary DOM replacement with `dataset.mark`; there is no measured performance defect justifying claims that SVG is inherently too slow.
- `sm-ui.js` owns input, codex icons and `solvedBoardDataUri`, which separately builds a solved-board SVG. Input interrupts playback; `afterTurn` is called by its completion callback. Those integration and cancellation semantics must be reviewed together.
- `sm-editor.js` shares `SM.Renderer` in quick-test but still hand-builds its edit grid and glyph HTML for palette/guide/help. Its headless `describeTile` currently calls the SVG helper. Migrating only quick-test would not satisfy the requested shared renderer.
- The gallery consumes the same SVG helper. `tests/browser-test.js` and native `verify-v2-chromium.js` inspect SVG paths/classes as well as gameplay behavior. Current native presentation fingerprints omit editor assets and future vendor/sprite sources.
- Accepted gameplay specs are representation-neutral. None requires changing rules for this backend; World 1's generated solved-board image and custom-image precedence remain existing requirements.

## Goals / Non-Goals

**Goals**

- Pixel art is a complete default identity, not an empty manifest awaiting future art. Vector remains a complete alternate and missing-pixel fallback without a second board/playback engine.
- One presentation model drives game, editor authoring/preview/quick-test, gallery, codex and exported images. Each mounted surface owns an independent stage; pages do not literally share one global stage.
- Art remains abstract, legible and original. State/events are the stable boundary; no Konva objects, animation phases, asset paths or preferences enter rules, solver identity, YAML or progress.
- Maintain offline classic scripts, GPL-compatible redistribution, accessible semantics and renderer-bound native evidence.

**Non-Goals**

- No resolver/search rewrite, new tile/object/color, floor-derived capability, inventory, pack/PAR change or new authoring tool.
- No React/framework migration, WebGL, CDN requirement, network manifest loader, paid sprite editor, proprietary runtime, or arbitrary user-uploaded skin format.
- No claim that dual identity is cost-free: both visual mappings require coverage, but normalization, compositor, playback, input and resource lifecycle are shared.

## Decisions

### 0. Work on the named delivery branch with a reproducible baseline

Use local `graphiscs-engine-update-pixel-16bit` and upstream
`origin/graphiscs-engine-update-pixel-16bit` throughout this activity. Branch setup
is complete: the remote reference was published from
`1322961c01a17333c951093e77c07f785e827e7c` and the current checkout was switched to
it without committing, stashing or discarding pending work. No implementation
task was completed by creating the branch.

Before an implementation session and before any eventual commit, verify
`git branch --show-current`, `git rev-parse --abbrev-ref '@{upstream}'` and the
scoped working-tree diff. If another activity changed the checkout's branch,
restore the intended working context safely before editing; never use a forced
switch/reset or move somebody else's changes to compensate. Parallel activities
should use separate worktrees rather than changing this checkout's branch.

The pending accepted-spec documentation and editor/solver source are not yet
part of the branch's committed history. Record their required versions and an
approved integration strategy before implementation so a fresh branch checkout
can reproduce the same baseline. A dirty working tree is neither a dependency
commit nor permission to bundle other changes. Use separately reviewed normal
commits/merges when authorized; no automatic stash, broad staging, force-push or
merge into `main` is part of this task. Record commit-level baseline and final
evidence in the change's verification record when that record is implemented.

Alternative rejected: implementing directly on `main` or relying on uncommitted
prerequisites would undermine review isolation and make remote reproduction
misleading. The named branch is the delivery boundary, not a new game feature.

### 1. Pin a redistributable Canvas2D backend

Use Konva **10.9.1**'s browser-global distribution as the planned baseline, checked from npm metadata and the version-pinned distribution on 2026-11-02. The public bundle is 197,594 uncompressed minified bytes and exposes `globalThis.Konva`; npm's default entry is ESM and is **not** the page entry point. Vendor the exact browser file plus upstream MIT LICENSE, source URL/version/checksum and a third-party notices entry. Do not put upstream development dependencies or optional native Node canvas peers in the game's runtime.

Evidence consulted:
- `https://registry.npmjs.org/konva/latest` (reported 10.9.1).
- `https://cdn.jsdelivr.net/npm/konva@10.9.1/konva.min.js` (HTTP 200, browser-global wrapper and version header inspected).
- `https://github.com/konvajs/konva/blob/master/LICENSE` (MIT terms inspected; verify the pinned release license when vendoring).

Those are acquisition references, not URLs requested by the shipped pages. Retain notices when distributing with this GPL project. Project-authored editable pixel patterns/frames use the project's license. Code licenses do not license third-party sample art; no upstream demo sprites, commercial game rips or unreviewed AI/asset-pack output are dependencies.

Alternative rejected: a tree-shaken bespoke build adds a mandatory maintenance pipeline for marginal benefit on this small board. A browser script works without changing the classic-script architecture. Konva has Canvas2D, not a magic SVG/GPU fallback: if the drawing context fails, show an accessible unsupported-renderer explanation; vector identity cannot fix a missing Canvas backend.

### 2. Normalize presentation once, render through interchangeable identities

Use a pure, headless presentation-description layer between registered definitions/read-only state and Konva nodes. Proposed separation (filenames are implementation targets, not a new public API promise):

| Component | Responsibility |
|---|---|
| `sm-visuals.js` | Pure definition/view → semantic visual descriptor; cell composition, labels, roles, anchors and state marks; no DOM/Konva/timers |
| `sm-sprites.js` and editable art sources | Shipped indexed patterns, frame rectangles, palettes, durations, provenance and finite asset validation |
| `sm-glyphs.js` | Pixel/vector Konva node factories from descriptors; cached thumbnails and frame selection; browser-only backend use |
| `sm-render.js` | Surface/stage lifecycle, shared compositor, sizing/hit maps, committed display mirror, playback/settlement and overlays |
| `sm-ui.js` / editor browser binding / gallery | Controls, semantic DOM, presentation preferences and surface-specific actions; no tile drawing or alternate game simulation |

Descriptors include visual key, layer, semantic color roles, carrier badge, direction, link mark, contacts, requested/effective/pending state and occupant identity. Use existing `glyph`/presentation metadata and supported parameters; keep any visual alias mapping in presentation data, not new numeric-ID gameplay branches. For example, two belt IDs with equal effective direction/tint get the same descriptor. A definition's image key does not grant movement capabilities.

Pixel/vector factories consume the same descriptor and return nodes to the same compositor. Register identity providers once, not theme branches throughout controllers. The pure editor model returns visual keys/descriptors, not mounted canvas nodes or SVG strings. Preserve its user-facing summaries and use browser bindings to mount previews. Gameplay/headless tests never need Konva just to load a registry or run a solver.

Keep static labels, forms, HUD, codex text and inspector in DOM. Small thumbnails are cached images generated by the shared drawing path, not a live stage per palette entry. A focused animated preview may own a reusable live stage. A gallery of 63 definitions must not create 63 continuous animation loops.

Alternative rejected: retaining SVG as an independent board/export renderer plus a canvas game view would duplicate semantics and violate the editor's shared-renderer requirement. Vector means Konva geometry on the same backend, not the old SVG pipeline kept indefinitely.

### 3. Deliver an original 32×32 pixel grammar

"16-bit" is the artistic era, not a mandatory 16-pixel or 16-color hardware limit. Use a **32×32 logical pixel cell** for the initial set, transparent background where layers compose, consistent one-pixel structural outlines and restrained stepped highlights. Keep a strong silhouette, quiet floors and stable visual anchors. No blur/glow is necessary to understand a state. Vector identity preserves the same signs and semantic roles using crisp geometry.

The complete baseline set is original editable indexed-pixel pattern/frame data authored with the implementation, compiled to cached sprite atlases. This is actual raster pixel art, even when its editable source is text. Optional later PNG polish can replace frames under the same contract; no supported piece is deferred to a follow-up. A baseline contact sheet and state atlas are reviewed before broad consumer migration so aesthetic defects are caught early.

| Existing role | Baseline pixel vocabulary / distinctions |
|---|---|
| Plain floor/start | Quiet neutral tile; small origin marker distinct from dot; no new general floor-color parameter |
| Goal | Simple framed exit with a stable W-colored center/rim, distinct from target rings and portal swirls; no castle door or themed scenery |
| Wall | Solid block with sparse seam/edge; unmistakably impassable silhouette, not decorative scenery |
| Phase void/ice | Dashed passage outline versus diagonal glint; effective void fill remains separate from pending closure |
| Prisms | Colored inset floor field with diamond mark; they change P, not a new kind of colored terrain |
| Cycle/reset/set dials | Ring arrow / reset mark / linked set mark, distinguishing world W control from P prisms |
| Targets | Recessed floor ring with neutral link pips; crate occupancy visible around its edges, not a goal door |
| Linked/carrier gates | Closing bars/edge posts plus link and P/W badge; configured required color never replaced by current P/W |
| Plates/tagged toggle/masters | Pressed/unpressed button, latched toggle mark, distinct lock/void master symbols; not consumable keys |
| Polarity barriers/crystal | Complementary Red/Blue class mark and split-state switch; no narrative crystal lore or new color |
| Receivers | Central contact socket with four visible cardinal terminals, configured crate color and neutral link marks |
| Conveyors | Neutral belt border, persistent unique exit arrow, subtle tread motion; all eight IDs share policy and style |
| Crates | Braced box with semantic White/Red/Green/Blue inset/edges, not a brown fifth gameplay state |
| Portal | Double broken ring/swirl; unmistakably distinct from goal, target and receiver |
| Emitters/rays | Fixed cardinal chevron/emitter silhouette, continuous readable beam overlay; decorative beam rhythm cannot imply a sweep or timed hazard |
| Dot | Small anonymous orb, with a minimal two-pixel face as a decorative default; P fill and W rim remain visible; no hero costume or copied character |

Reuse patterns for variants but test every registered ID and effective override. Link marks are not arbitrary new colors: show counts/pips and an accessible text value, including supported larger links. Known floor ID 0 intentionally draws a subtle base; unknown IDs retain a diagnostic crosshatch/label and cannot become a playable placeholder.

Alternatives rejected: deferring the whole art set would fail the default identity; generative model images are not automatically crisp, palette-consistent or licensed for all intended uses; borrowing nostalgic sprites creates redistribution risk. Style inspiration does not require copying assets or characters.

### 4. Palette and sprite data are display assets, not level data

Separate **semantic slots** from **decorative shade slots**. P, W, required gate color, crate/receiver configuration, polarity class and link meaning are stable anchors. Black/mute and ramps are presentation shades, not extra carrier tokens. Frame animation may rotate highlight/shadow indices within the same ramp; it must not rotate a Red gate to Green or make an inert belt tint look like a passenger filter. Direction arrow geometry is constant in every belt frame.

Conceptual manifest (not a new YAML level format):

```js
{
  schema: 1, cellPixels: 32,
  frames: {
    beltEast0: { x: 0, y: 0, width: 32, height: 32 },
    beltEast1: { x: 32, y: 0, width: 32, height: 32 }
  },
  animations: { beltEast: { frames: ['beltEast0', 'beltEast1'], frameMs: 160, loop: true } },
  paletteRoles: { required: 'configured-colour', dot: 'P', goal: 'W' }
}
```

Use explicit frame rectangles and durations as consumed by `Konva.Sprite`; Konva has no Pixi-style `Spritesheet` class to adopt. Validate positive dimensions, bounds, frame references, durations, palette-role enums and resource size limits before mounting. Asset metadata contains no behavior callbacks and cannot change rules. Do not expose arbitrary skin import or frame scripting in this change.

Avoid JSON fetch under `file://` and pixel reads from opaque-origin external images. Ship the generated manifest/atlas data through a local **classic script**: indexed arrays rasterized to origin-clean offscreen canvases, or embedded image data with a known-safe export path. Editable PNGs may be offline authoring inputs to an optional deterministic Node generator; its output is checked into the repository so play requires no build. Atlas encoding must be reproducible from retained sources.

Generate/copy the finitely required palette/frame variants once and cache by visual key/parameter/state/palette, with bounded shared resources; no per-frame `getImageData` recoloring or unbounded cache growth per animation tick. Fallback per missing/corrupt pixel glyph is a complete vector representation plus a diagnostic, not a hidden "coverage passed" exception. Baseline acceptance still requires every supported glyph to have pixel coverage.

### 5. One surface compositor and lifecycle

Each live board/preview has its own Konva Stage and up to three layers:

1. Static backing/terrain/features and state-dependent surface marks.
2. Actors and beam/transport visuals with stable identities.
3. Presentation-only focus/selection/diagnostic overlays, with noninteractive decoration.

Keep pending-close/link/target cues in a top-visible sublayer/edge region so a crate cannot cover them. Editor cursor/selection/diagnostic overlays are additions to this compositor, not a fork. Actors moving do not move or erase terrain. Static nodes update on descriptor changes; reuse actor nodes rather than rebuilding the whole stage every tick. Cache small complex static groups only when measurements justify it; blindly caching whole layers can increase memory and blur pixel art.

`fitBoard` maps bottom-left coordinates to top-left screen coordinates once. Snap pixel identity to integer destination device pixels, disable smoothing in drawing, scaling and cached exports, and prefer integer logical-pixel upscales. At tight widths preserve inspectability with a documented fit/scroll path rather than clipping cells or making hit maps differ from drawing. Test 20/32/64/96 CSS-pixel cells, fractional browser zoom and DPR 1/2: nearest-neighbor fallback is allowed when exact integer upscales do not fit, but arrow/closure marks must survive. Vector uses high-DPI paths through the same map.

Surfaces expose mount/build, draw/update, play, settle/cancel, resize, thumbnail/export and dispose operations; keep compatibility adapters for controller call signatures only while migrating callers in this change. Avoid leaking mutable Konva nodes into the editor model, rules or solver. A renderer instance can inspect read-only rule queries (`describeTile`, `traceRays`) against its mirror, never `resolveTurn` to make a display decision.

### 6. Playback is a projection of existing commits

Continue using commit IDs and authoritative state frames. A pure view reducer updates the display mirror for a whole batch; interpolation consumes old/new actor poses. Dot/crate push/pull tracks start together, not as two semantic frames. Missing readable hints cannot hide a validated mutation covered by a state frame. Portal transport uses an explicit cut/fade between endpoints, not a fake walk through intervening cells.

Use one controller-managed Konva animation clock per active surface for playback interpolation and ambient frame indexing. Do not independently start every Sprite/Tween timer. Advance atlas `frameIndex` from that clock; batch draw the affected layers. Keep the existing 70 ms per commit as the initial playback pace unless a verified visual adjustment is documented; cosmetic time never becomes a turn clock. Dot pulse may reuse the existing eight-frame/250 ms presentation cadence. No eight-frame walk is required for a one-step hop.

On gameplay interruption, settle all committed frames and call the completion callback once before accepting the next round's display. On restart/navigation/dispose, stop old clocks, invalidate generation tokens, detach listeners/observers and prevent stale callbacks touching a new surface. Review `sm-ui.js`'s `pending`/`afterTurn` orchestration and the editor's quick-test binding together; no animation completion may create a win or publish an obsolete session's progress.

Theme changes settle playback without resolving another action. New failed state cancels ambient motion, preserving actual P/W, crates/latches and settled positions with a neutral outline/banner. Won state keeps a stable success mark; omit full-board flashing. Diagnostic abort discards tentative visual frames and shows restored state plus text. Backgrounding stops unnecessary clocks; foregrounding settles to current committed truth instead of replaying an accumulated time delta.

Static/reduced mode displays representative frame zero and no tweens or ambient cycling. Use `prefers-reduced-motion` by default and a presentation motion control; changing it never changes state identity. Beam/portal/belt effects use subtle 2–4-frame decorative cycles, but static arrows, boundaries and color anchors remain sufficient in every frame. A fixed emitter silhouette stays fixed; no sweep, countdown or hint of realtime safety.

### 7. Same visuals, accessible input and isolated preferences

Expose `pixel`/`vector` controls on play, gallery and editor. Resolution order: valid `?theme=` override, user-selected/stored preference, then pixel. An explicit control change updates the current override/address coherently so reload does not unexpectedly reapply an older URL selection. Store only small validated presentation preferences in a separate `streuphs-maze/presentation` key with schema 1; denied storage falls back to memory. Do not reuse the gameplay progress store, YAML overrides or a world ruleset field.

Canvas drawing cannot replace semantic DOM. Maintain coordinate-labeled grid/roving keyboard focus and inspection descriptions in an accessible companion layer, plus existing forms/HUD/controls. Input adapters map actual stage pointer positions and keyboard selection through the same board transform to semantic callbacks (`inspectCell` / edit intent). Decorative groups have listening disabled and must not cause duplicate edits. Keyboard focus has a visible overlay; accessible controls expose required colors, P/W, links, contacts, closure and outcome without interpreting pixels.

The editor browser binding consumes the same board/thumbnail surface for edit grid, palette, quick guide/help, authored and solver snapshot previews, and quick-test playback. Preserve left/right brush, cursor/region, marker confirmation, override scope, edit undo, validation/save blocks and A→B workflows. Construct read-only authoring descriptors without needing to create a legal runtime state for an invalid draft; show explicit diagnostics rather than fabricating gameplay. Quick-test still validates/clones and invokes the existing real resolver. This change migrates presentation wiring, not missing editor tools or solver functionality.

### 8. Export and all secondary consumers migrate together

Replace `solvedBoardDataUri`'s separate SVG drawing with an offscreen shared compositor at a representative static frame. Generated World 1 images must remain exportable under ordinary `file://` with actual crate/target occupancy; custom valid PNGs still take precedence, other levels retain existing PASS fallback. Text in an existing custom/fallback image is not a retained glyph renderer.

Codex, palette/help, quick guide and gallery thumbnails use the same descriptor/image path. Gallery shows both identities, P/W samples, inert tint/direction, contacts, requested/effective/pending closure and terminal samples. It is a presentation catalogue, not another simulator. Remove the old SVG-fragment insertion call sites after all consumers migrate; do not leave headless editor helpers depending on mounted nodes or synthetic markup.

### 9. Test drawing where it is actually drawn

| Boundary | Evidence strategy |
|---|---|
| Pure normalization/coverage | Existing registry/helpers suites extended with all 62 IDs + dot, four carriers, supported dir overrides, P/W badges, links and relevant state combinations; no Konva in rules/search |
| Playback/lifecycle | Deterministic fake-clock tests for reducer, atomic frame grouping, interruption, generation tokens, theme/motion switching and dispose; same route snapshots/events with all settings |
| jsdom UI | Keep real controller/renderer orchestration and semantic DOM assertions; use a test-only recording Canvas2D boundary where needed for Konva, not a production DOM-renderer bypass; no claim this proves pixel appearance |
| Native visual gate | Actual Konva and shipped assets in Chromium under `file://` for play/gallery/editor, both identities, actual canvas snapshots/screenshots, pointer/keyboard, reduced motion, blocked storage and image export |
| Performance/lifecycle | Representative 16×9 scene, 144 animated-cell stress fixture, all-definition gallery and 100 repeated theme/rebuild/preview cycles; resource counts must return to baseline after dispose |

Keep existing `test:unit:registry`, `test:unit:helpers`, `test:unit:rules`, `test:unit:levels`, `test:unit:editor` and `test:unit:solver`; add rendering cases to appropriate existing test modules rather than inventing commands that do not exist. Final `npm test` remains mandatory. Native rendering tests must use real pixels and visual inspection, not just successful stubs or metadata saying "east". Contact sheets need manual review for silhouette/contrast at minimum size and grayscale/state differentiation.

Adapt `scripts/verify-v2-chromium.js` to Canvas semantics instead of SVG selectors. Preserve all seven-pack/native gameplay scenarios and add both identities plus editor consumers. Extend presentation fingerprints to the vendor, art/manifest, renderer, UI/editor entry points/styles and shared model files, recording exact viewport/DPR/browser and image/theme coverage. Existing proof and native JSON are not rewritten to claim success without rerunning their producer. Engine/pack proof fingerprints unchanged → retain mathematical proofs; otherwise investigate before recertifying, never silently waive a stale hash.

Initial measurement targets: steady-state p95 presentation work ≤16.7 ms/frame on a documented reference Chromium/CPU/viewport and DPR; no animation clock per static thumbnail; no running animation after disposal or on hidden/failed surfaces; final-state settlement immediate without input waiting for an animation cycle. Record actual sizes/time/memory and the environment; do not assert a portable FPS guarantee. If targets fail, optimize shared caching/scheduling without dropping visual coverage, accessibility or editor integration.

## Risks / Trade-offs

- [Canvas loses DOM/SVG semantics] → Companion semantic grid and deterministic coordinate callbacks; preserve keyboard inspection/editing, not just pointer hit regions.
- [Sprite assets taint canvas under file URLs] → Bundled indexed data/origin-clean embedded atlas and direct native export test; no fetched JSON or unsafe pixel readback from sibling images.
- [Dual identity doubles bugs] → Shared descriptors/compositor/clock and per-definition conformance matrix; two visual factories, not two engines.
- [Palette cycling looks like mechanics] → Fixed semantic anchors, within-ramp cycling, stable exit arrows, explicit reduced/static samples; no realtime hazard hints.
- [Konva adds resource/memory overhead] → Reused nodes/caches, bounded atlases, limited live surfaces, static image thumbnails and 100-cycle teardown checks.
- [Concurrent editor/solver changes drift] → Re-read their current API/acceptance status before applying, preserve foreign edits, limit changes to shared presentation adapters and regression tests.
- [Stubs produce a falsely green test suite] → Native actual-canvas screenshots/export and unchanged gameplay checks remain required; mark each evidence type distinctly.
- [Existing whole-tree audit findings obscure this change] → Record pre-existing draft/version-name findings, do not overwrite user work or disable rules; separate scoped rendering success from global release readiness.

## Migration Plan

1. Confirm the named branch/upstream and establish the reviewed committed prerequisite baseline; capture current work/contract/evidence and verify Konva pin/license and editor/solver integration. Preserve unrelated changes/archives; branch publication alone does not publish local prerequisites.
2. Establish pure visual descriptors, full pixel/vector state atlas and asset validation, then vendor/backend/surface support. No production consumer remains on a stub.
3. Migrate play/codex/export and gallery, then editor editing/palette/help/previews/quick-test onto the shared surfaces in this change. Remove the legacy glyph-insertion path only after all call sites are covered.
4. Land themes, accessibility, motion/lifecycle/cancellation and their regressions along with each consumer, not as untested final polish.
5. Run focused suites, full `npm test`, complete native file-URL checks and updated presentation evidence. Preserve math proofs if their inputs did not change; report unrelated audit blockers and acceptance separately.

6. Keep reviewable renderer changes scoped to this branch. Publish further
   commits or open/merge a pull request only when requested, retaining the
   prerequisite/renderer distinction and recorded commit-level evidence.

Do not release a mixture of SVG boards and canvas editor boards as a completed change. If rollback is needed, reverse only this change's own presentation edits; do not reset concurrent work, revert accepted V2 mechanics, change old progress bytes or rewrite historical evidence. Optional future art polish uses the same manifest and licensing contract and is not required to make this initial pixel identity complete.
