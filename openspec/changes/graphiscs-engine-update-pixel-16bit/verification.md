# Graphics rendering implementation record

> **Pre-merge implementation checkpoint:** the shared pixel/vector implementation and automated
> repository/native checks pass. Historical preflight blockers below are retained
> with their resolutions. Rendering changes remain local/uncommitted on the
> graphics branch at that checkpoint. The subsequent user-authorized merge is
> recorded below; Git history records its final commit/publication state.

## Preflight — 2026-11-02

- Selected change: `graphiscs-engine-update-pixel-16bit`, schema `spec-driven`.
- Current branch: `graphiscs-engine-update-pixel-16bit`.
- Upstream: `origin/graphiscs-engine-update-pixel-16bit`.
- Committed HEAD: `1322961c01a17333c951093e77c07f785e827e7c`.
- `openspec validate graphiscs-engine-update-pixel-16bit --strict`: passed.
- Apply instructions: ready; **1/30 tasks complete**, branch setup only.
- Index is empty. No implementation, staging, commit, push or release was
  performed in this apply preflight.

## A01 — Required committed prerequisite baseline is absent

**Status: blocking task 0.2; requires explicit scope approval.**

The approved proposal/design/tasks require a reviewed committed prerequisite
baseline before rendering implementation. They explicitly distinguish publishing
the branch reference from committing pending work, and require separate review
for prerequisite commits/merges. The request to implement the rendering features
does not identify which unrelated pending changes may be committed as that
baseline; do not silently waive task 0.2 or bundle them into renderer commits.

HEAD still contains only the earlier V2 migration commit. `git ls-tree` confirms
the editor module, editor page, standalone solver and two synchronized accepted
specification homes are absent from that committed tree. A fresh checkout cannot
reproduce the required shared-editor/solver contract using HEAD alone.

Observed working-copy prerequisite versions:

| Path | Present in HEAD | Working-copy SHA-256 |
|---|---|---|
| `src/js/sm-editor.js` | no | `63db0850a364301942b90dd9fab3de9ec08dd827367de89117fcf0e45d6ce1d2` |
| `src/js/sm-solver.js` | no | `c4f17cbd87f1ac70ec539a1ee3b26f824ae589940db9a5890cffb6047c1f1399` |
| `editor.html` | no | `07d4672bb437dae182a5bae506dfbbe67ba69f38227c63663e9e8618447f8f60` |
| `src/js/levels.js` | yes, locally modified | `9c0b70825ee17c309c1d4607299f8b0b86ae3dc38b6824d40c685cd8072eda8a` |
| `index.html` | yes, locally modified | `94757e943092b8ba09cbe726084c6016154e3dd55a30835dec257c3c582ff46f` |
| `package.json` | yes, locally modified | `805b74b2b2ad4bb7b2363b883a37b2f35b6eac34512b2be4a82922524dec9bde` |
| `openspec/specs/event-resolution/spec.md` | no | `7595e19ff8260d443969aae67a8472e66067f3804dcc5d4a38ae520e00c22205` |
| `openspec/specs/conveyor-transport/spec.md` | no | `fded27bed2a3b3c650675db9e641dfcb382e8274a0c493220272c2bede4d8350` |

The source changes are independently tracked: `standalone-state-solver` is
18/18, `level-editor-v1` is 50/51, and `level-editor-v2` is 0/29. Presence and
task counts are not release acceptance. The current dirty tree also includes
documentation synchronization, the separate World 6 archive relocation and
user drafts. All remain untouched by this preflight.

Proposed resolution: separately review and explicitly approve scoped prerequisite
commits for the current documentation/spec synchronization, editor implementation
and standalone solver, excluding the World 6 archive relocation, user drafts and
editor-v2 planning. Validate that committed tree before changing presentation.
Alternatively the owner can provide the prerequisite commits, or explicitly
revise the committed-baseline requirement to permit tracked dirty-tree work.
Neither alternative is assumed approved, and no task is marked done on that basis.

## Release status

Not implemented or released. All rendering feature and acceptance tasks remain
unchecked. No native rendering or new test success is claimed for this apply.

## A01 resolution — approved prerequisite commits

The user explicitly approved separate prerequisite commits, excluding the World 6
archive relocation, user drafts and editor-v2 planning. Created locally on the
named branch, without pushing:

- `50770d0`: V2 documentation and accepted-contract baseline, including the
  already-archived documentation review.
- `e0c68a8`: existing editor and standalone-solver integration, with their source
  artifacts and shared test wiring. Their task/release status remains independent.

A fresh `git archive HEAD` export at `/tmp/opencode/pixel-baseline-Nharfq`, using
the installed jsdom dependency via a node_modules symlink, passed `npm test`:
**1120 Node + 264 game jsdom + 28 editor-browser** checks. No uncommitted runtime
source was required by that export. Task 0.2 is therefore satisfied; unrelated
drafts/archives/editor-v2 work remain outside those commits.

## A02 — Existing evidence is stale after the solver prerequisite

Pre-implementation `audit-v2-assets.js --preaccept` reports the two previously
recorded editor-document findings plus stale generated math/native evidence.
The standalone-solver prerequisite changes fingerprint inputs even though shared
resolver routes pass the baseline tests. This is not permission to waive hashes
or call the release ready. Final verification must regenerate actual proof/native
evidence through the existing producers and distinguish prerequisite source
movement from a change in gameplay semantics.

## Implementation baseline

- Committed runtime baseline: `e0c68a8` (named branch/upstream confirmed).
- Engine fingerprint: `6d098b827f5c12caf34a023109cceeee5e5ed9405b9a9503ec361efe13791752`.
- Presentation fingerprint: `880aaa2eee70765cb521c91a8e03b931e9f8fe08702885a6f7df56378a4065f1`.
- Protected uncommitted work: World 6 archive source deletions/destination,
  `docs/Nouveau document`, `docs/level-editor-PDD-V1.md`, and
  `openspec/changes/level-editor-v2/`. No graphics implementation existed at this
  checkpoint. Registry/rules/solver/pack semantics are not renderer edit targets.
- `sm-editor.js` uses `SM.Renderer` for quick-test, but manual SVG edit-grid and
  palette rendering elsewhere. Its model's descriptor currently returns glyph
  strings. These are required migration boundaries, not grounds for a second
  simulator or acceptance of missing editor functionality.

## 1.2 — Vendored backend

Konva 10.9.1 browser distribution and MIT LICENSE acquired from the version-pinned
npm tarball. Bundle SHA-256:
`acc5719ed72c2cab2858e200a61051e6930c635a29825c2ebe1852bad103d2cc`.
Its 197,594 bytes match the researched browser bundle. A Node VM load verified
the global version and all provenance checksums without DOM/native dependencies.
No production page has been migrated yet. Third-party notices and the local
backend boundary are documented; no upstream sample artwork was copied.

## Pure presentation model (2.1–2.3)

`sm-visuals.js` now supplies definition descriptors, semantic labels, runtime and
unevaluated authoring compositions, A1 coordinate transforms, atomic commit
grouping and authoritative-frame reduction without DOM/Konva. The new helper
tests cover 63 definitions × all P/W combinations, required-versus-current gate
color, four direction overrides, 576 coordinate round trips, unsupported draft
IDs and a real atomic push replay against the authoritative snapshot. Abort
records retain the restored mirror. Registry passed; helpers **32/32** plus the
new assertion module; rules **418/418**. No production consumer has migrated yet.

## Original artwork and identity factories (3.1–3.2)

The original editable 32×32 grammar is in `sm-sprites.js`; it can emit indexed
palette data, deterministic RGBA frames and geometry for the shared vector
factory. `scripts/report-glyph-atlas.js` generated the checked-in baseline sheet
`docs/graphics/pixel-catalogue.png` (972×756, 63 definitions). The sheet was
visually inspected: walls, braced crates, prism floors, source sockets, framed
exit, target rings, polarity classes and all four belt/emitter directions are
distinct. This is a sampled active/closed art checkpoint, not the required final
state/native-browser matrix or human release approval.

The helper module verifies all definitions have pixel sources, deterministic
RGBA/indexed output, valid frame metadata and real Konva vector node construction
without DOM mounting. Invalid bounds, references and palette roles are rejected.
Konva's environment probe was primed as Node for this non-drawing factory test;
no pixel correctness is inferred from a fake browser. Focused helpers passed.

## A03 — Concurrent editor-v2 integration collision

**Blocking production consumer migration until work is isolated/coordinated.**

After the approved baseline commits, another activity modified `sm-editor.js`
(roughly 394 changed lines), `editor.html`, editor CSS, editor tests and its user
guide in this same checkout. The browser binding moved from its previously
reviewed locations and its controls are being redesigned. Those changes are not
graphics changes and have not been overwritten, reset, staged or committed here.

The graphics implementation so far adds isolated visual/art/drawing/surface
modules, graphics CSS, notices, contact-sheet tooling/documentation and its own
unit module plus one helper-suite hook in `tests/verify.js`. The old production
renderer and SVG consumers are still intact. The new surface is not yet
integrated or verified as a released renderer; all such tasks remain unchecked.

Recommended resolution: leave the concurrent editor work on its own branch in
this checkout, move the graphics activity to a separate worktree on the existing
named graphics branch at the approved committed baseline, and carry only this
activity's own pending files/helper hook to that worktree. This requires explicit
approval because it changes the other activity's checkout context. Alternatively
coordinate/pause that activity before shared-file integration. Do not silently
drop editor integration, import its unreviewed changes, force-switch/reset, or
release a mixed rendering implementation.

### A03 resolution

The user approved isolation. The original checkout is now on `level-editor-v2`,
with that activity's dirty work preserved. This session now works at
`/tmp/opencode/streuphs-maze-graphics` on the required graphics branch, based on
`e0c68a8`. Only this activity's own pending files and helper-test hook were moved;
their file hashes were verified across the move. No editor-v2 source changes were
imported. The installed Node dependencies are shared by a local symlink, which
must not be staged as project content.

## A04 — Baseline editor height resize violates its own coordinate test

Focused editor tests exposed `new top row filled with secondary: 1 !== 0`.
The same failure reproduces in the untouched fresh prerequisite export, proving
it predates rendering. `setHeight` appended YAML rows although YAML is top-first,
shifting the established A1-relative cells. The minimal integration correction
prepends growth rows and removes top padding on shrink; this follows the existing
coordinate contract and existing test intent, not a new editing feature or rule.
Added explicit grow/shrink anchor assertions. Final focused results follow below.

The next baseline editor failure was a fixture that tried to load a pack without
start/goal, then assumed it had replaced the prior valid pack. That conflicts with
atomic invalid-load rejection. The test now loads a valid board and removes its
markers through the existing edit API before checking confirmation/default-marker
placement. This retains the intended assertions and adds no new import behavior.

## A05 — Real pointer input differs from a programmatic click

The native DPR probe found a cell behind the header: its client rect had center
Y≈26 and `elementFromPoint` hit Load pasted YAML. DOM `.click()` still worked,
which is why jsdom could not detect it. Generic game-main centering had leaked
into the editor layout. The editor now stretches bounded scrollable sections
and keeps wide authoring boards left-aligned/reachable. The real probe then hit
the intended cell (Y≈342) and set cursor B1. Quick-test sizing uses an external
viewport budget, not child-driven height that repeatedly shrinks through a
ResizeObserver feedback loop. The native matrix covers all four cell sizes,
DPR 1/2 and CSS zoom 1/1.25 with real pointer/keyboard input and Shift-paint undo.

## A06 — Cosmetic animation still needs semantic constraints

- All conveyor treads initially moved East despite a fixed North/South/West
  arrow. They now move on the declared exit axis, with tests for all directions;
  source/vector paths are clipped to the same 32×32 cell.
- A crate or dot can hide a supporting target, polarity class or P/W gate badge. Stable
  top-visible badges and link marks now supplement the pending-close outline.
  Movable targets sort below crates and the dot rather than by creation order.
- Portals use a cut, not a fake walk through intervening cells; other cosmetic
  interpolation is limited to adjacent committed poses.
- DPR-only Canvas resizing resets native smoothing state. Backing stores and
  native context smoothing are reapplied explicitly, and pixel image export also
  disables smoothing. Both identities animate through the same surface clock;
  vector frames update existing nodes rather than creating new nodes per tick.

These are presentation corrections. No resolver, tile registry, solver, level
board, capability default, carrier, PAR or progress schema changed.

## A07 — Progress publication must not depend on movie completion

Legacy `afterTurn`/`onWin` persisted progress after playback. Immediate navigation
could either lose an already committed win or let an obsolete callback present
the replacement level. The controller now persists the fully resolved canonical
result before playback, and completion checks the captured state/session before
presenting UI. Navigation dismisses obsolete victory art. New regression checks
prove the committed win persists while replacement counters/overlay stay clean.
Blocked/diagnostic results refresh only the mirror/HUD, with no progress write.
Editor quick-test remains outside the gameplay publication path; its former
`|| true` smoke assertion was replaced with exact before/after store equality.

## A08 — Harness lifetime and audit provenance are not gameplay

The first migrated smoke run printed passing results but did not exit because
the editor harness never closed its live window. Tests now dispose shared
surfaces and close jsdom. Page hiding/disposal also stops clocks and detaches
surface observers/listeners in production. No always-successful drawing stub is
shipped: jsdom uses a test-only recording boundary, while native Chrome verifies
actual pixels, pointer input, fallback and PNG export.

The old audit mistook a backticked versioned OpenSpec change name for an old
ruleset. Only explicit `` `name-vN` OpenSpec change `` provenance is normalized;
tests prove that old-policy prose and JSON-level-schema guidance remain rejected,
even in the same document as a valid change reference. The protected exploratory
draft remains in the separate original checkout and was not edited or imported
to the reproducible rendering baseline.

## Final implementation/evidence matrix

| Tasks | Delivered boundary and verification |
|---|---|
| 3.3–3.4 | Validated local manifest/atlas/indexed sources; complete original contact sheet; stable colors/arrows in every frame; eight dot frames; static/reduced equivalents and identified vector fallback. Registry/helpers and actual native file-URL loading/export pass. |
| 4.1–4.3 | Shared Konva surfaces/previews/offscreen export, reusable nodes, semantic grid/focus, diagnostics, independent instances and disposal. Coordinate tests cover 20/32/64/96 pixels and the native DPR/zoom matrix; missing Canvas explains failure and does not leave playback pending. |
| 5.1–5.3 | One surface clock for pixel/vector frames and coherent commit batches; adjacent-only interpolation/portal cut; interrupt, generation guards, hidden/reduced/failed behavior. Fake-clock, snapshot, obsolete-callback and native interruption/teardown checks pass. |
| 6.1–6.3 | Play/codex/gallery/victory-image consumers migrated; no SVG glyph insertion remains. World 1 uses shared solved-board PNG export; valid custom PNGs and PASS fallback preserve precedence. All game smoke scenarios pass, including canonical progress publication. |
| 7.1–7.3 | Editor grid/palette/guide/help/snapshots/quick-test share presentation APIs; headless editor stays Canvas-free. Authoring, marker/brush/cursor/Shift-paint, edit undo, solver A/B and progress isolation pass focused and native checks. |
| 8.1–8.4 | URL/preference controls and isolated denied-storage fallback; recording-only jsdom seam; current guides/notices; extended Canvas-native asset/fingerprint audit with negative checks. No legacy board renderer or executable YAML/skin code was retained. |
| 9.1 | Focused registry, helpers (32 harness checks plus the visual module), rules 418, levels 783, editor and solver pass. Final `npm test`: **1120 Node + 269 game jsdom + 28 editor-browser**, exit 0. |
| 9.2 | Actual Chromium **154.0.8037.97** under `file://`: seven packs per identity, 63-definition gallery, shared editor/snapshots/solver/quick-test, custom/generated images, terminal/restart/undo, full/reduced motion, denied storage and real input. **Zero page exceptions and zero external resources.** |
| 9.3 | 144 animated glyphs, 50 measured steady-state work samples and 100 rebuild/dispose cycles per identity on AMD Ryzen 7 9800X3D, 1280×960, DPR 2. p95 CPU presentation work: **pixel 0.30 ms; vector 1.80 ms** (reference measurements, not portable FPS guarantees). Tracked stages return to baseline; caches stay bounded: pixel 67 atlases/58 previews, vector 4/58. |

### Produced evidence and release boundary

- `npm run levels:routes -- --early-review --output=docs/level-design/v2-pack-proofs.json`
  regenerated **61/61** proven minima/replays after the prerequisite fingerprint
  change. All comparisons completed; total remains **869 strokes**. No pack or
  authored score changed.
- `node scripts/verify-v2-chromium.js` passed with both identities and the full
  expanded matrix. Native report: `docs/level-design/v2-chromium-verification.json`.
  Screenshots: `/tmp/opencode/v2-chromium-tghw1J/` (final run; the earlier
  `/tmp/opencode/v2-chromium-QqP9QE/` checkpoint was superseded after ensuring
  a dot cannot obscure the carrier badge beneath it).
- Current engine fingerprint remains the committed prerequisite baseline
  `6d098b827f5c12caf34a023109cceeee5e5ed9405b9a9503ec361efe13791752`.
  Current native presentation fingerprint:
  `751da61eaf68712240c1410349ce001a797c2cf68b85b9e85f34f8868e37af04`.
- Both strict and preaccept asset audits exit **0**, `ok: true`,
  `releaseReady: true`, zero errors/deferred/pending V2 sync mappings. This is the
  automated maintained-asset gate, not automatic approval/synchronization of the
  new `glyph-rendering` delta, a public GitHub release, or acceptance of editor-v2.
- The named graphics branch remains checked out in the isolated worktree.
  Only the two explicitly approved prerequisite commits exist beyond origin;
  rendering implementation, tests, assets and planning/evidence remain pending
  for scoped review/commit. No rendering push, main merge or archive was made.

Local documentation checks verified 68 linked targets; strict change validation
and whitespace checks pass. A final call-site search finds no `SM.glyph` or SVG
wrapper pipeline: the remaining SVG literal is the intentional PASS image, not
a board/glyph renderer. `git diff` confirms no changes to rules, tile registry,
solver, shipped packs or accepted gameplay specifications relative to the
approved baseline. The original contact sheet and final native target/pending/
carrier/editor/gallery images were visually inspected at playable sizes.

## User-authorized merge

The user subsequently requested merging this completed graphics activity into
`main`. Scope: the two reviewed prerequisite commits and the graphics
implementation, tests, evidence, original artwork, vendor notices and planning
artifacts. The separate `level-editor-v2` branch's archive commits `f6992b2` and
`d15ad96`, its pending work and user drafts are excluded. Earlier statements about
uncommitted/local-only work describe the implementation checkpoint, not a ban on
this explicitly requested publication. This merge does not archive the change,
silently synchronize its new capability, or create a tagged GitHub release.
