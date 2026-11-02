# Shared graphics presentation

This change's normative target is the `glyph-rendering` capability under
`openspec/changes/graphiscs-engine-update-pixel-16bit/`. Implementation status and
ambiguities are recorded in that change's `verification.md`; this guide is not
release evidence by itself.

## Local backend

Konva 10.9.1 is vendored as a classic-script Canvas2D backend. Its MIT notice and
checksums ship with the browser file; see [third-party notices](../THIRD_PARTY_NOTICES.md).
The browser requires no build step, modules, server or CDN. Both pixel and vector
identities use the same backend; vector cannot bypass an unavailable Canvas2D
context.

## Boundary

Rules own canonical state and ordered committed events. Presentation consumes
read-only descriptions and committed snapshots; animation never chooses a rule
outcome, changes YAML/progress, or calls a solver to decide what to draw.

`sm-visuals.js` is headless: `describe` maps a registered definition and view to
a copied descriptor; `board` composes read-only runtime queries, while `authored`
can show an invalid editing draft without constructing or simulating a legal
game. Such drafts explicitly label effective state as unevaluated. Labels and
coordinate transforms are shared across drawing and input. Semantic slots P, W,
required color, carrier, link, cardinal contacts and closure are never inferred
from an animation frame. `frames` groups atomic commits; `applyFrame` prefers the
complete authoritative state frame over readable event hints.

## Pixel/vector source and frames

`sm-sprites.js` retains the original editable 32×32 grammar and produces explicit
indexed palettes/indices or RGBA pixels. The same grammar produces Konva shapes
through `sm-draw.js` for the vector identity. Atlas metadata has integer bounds,
frame references, bounded durations and a closed palette-role vocabulary; it is
validated before mounting and cannot carry rule callbacks. All runtime data is
local classic-script data, not fetched JSON or read-back from opaque file images.
`sm-draw.js` creates origin-clean cached Canvas atlases and controlled
`Konva.Sprite` frames. Neither a Sprite's own timer nor an image load decides a
move. Atlases and static thumbnail caches are bounded to 128 and 256 entries.

See [the original contact sheet](graphics/README.md) for baseline coverage and
source/provenance. Vector factories share descriptor meaning and the board
compositor; they do not retain the SVG glyph pipeline as a second engine.

## Shared surfaces, motion and controls

Play, editor authoring/quick-test/snapshots and image export use `SM.Surface`.
Each mounted surface owns a stage, semantic coordinate buttons and up to three
layers; vector geometry and pixel sprites share the same compositor. Palettes,
codex and gallery use cached static previews rather than one animation loop per
icon. A1 remains bottom-left. In play, ordinary arrows remain game commands;
Alt+arrows navigate/inspect the focused semantic grid. Editor arrows move its
cursor. Pointer and keyboard coordinates use the same transform.

Graphics controls select `pixel` (default) or `vector`. A valid `?theme=` overrides
a stored preference; explicit control changes update that URL selection as well.
Preferences are isolated at `streuphs-maze/presentation`, schema 1, and fall back
to memory when storage is unavailable. They never enter YAML or gameplay progress.
Motion defaults to the system reduced-motion preference; `reduced` uses static
frames and immediate state updates, while `full` allows the shared visual clock.

The controller groups ordered events by commit ID and reduces full state frames
before drawing. Movement interpolation is cosmetic; interrupted input settles the
whole committed action immediately. Cancellation and disposal invalidate stale
callbacks, and page hiding stops ambient work. Failed boards retain colors and
positions with a stable outline and no ambient animation. No timer changes safety,
receiver activity or gate legality. Missing pixel resources are identified as
vector fallbacks; a missing Canvas2D backend is a readable error, not a false
promise that vector works without it.

World 1's generated solved-board PNG uses the same offscreen compositor. Custom
valid PNG art retains precedence. Export consumes settled state but world-pack
YAML still contains authored initial configuration; no display clock, theme,
failure snapshot or solver buffer is serialized into the pack.

Gameplay progress is published by the controller from the fully resolved result
before playback. Completion callbacks only present the matching session. Thus a
committed win survives immediate navigation, and an obsolete movie cannot publish
progress or show victory on its replacement level. Editor quick-test does not use
that progress publication path.

## Verification boundary

Pure descriptor, pixel-grammar, atlas and playback tests run without Canvas in the
rules/search path. jsdom runs real controller/Konva orchestration with a **recording
Canvas2D seam**, not a pixel implementation. Its journal produces test PNGs and
throws on unsupported context operations; these are not evidence of appearance.
Actual pixels, origin-clean export, cardinal arrows and readable state are checked
separately with Chromium under ordinary `file://`, in both identities on play,
gallery and editor. Generated proof/native fingerprints must be refreshed by
their producers after their inputs change, never edited to look current.
