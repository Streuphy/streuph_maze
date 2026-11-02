# Tasks

## 0. Delivery branch and prerequisite baseline

- [x] 0.1 Create and check out `graphiscs-engine-update-pixel-16bit`, publish it to `origin` and configure the matching upstream without committing pending work; verify the local branch and remote reference identify the same committed HEAD and preserve the existing dirty tree. Setup completed from `1322961c01a17333c951093e77c07f785e827e7c` on 2026-11-02.
- [x] 0.2 Before implementation, confirm the named branch/upstream, record required documentation/editor/solver prerequisite versions and obtain an approved committed-baseline integration strategy; verify a fresh checkout can reproduce the required baseline and that unrelated pending changes are excluded from renderer commits. Recheck branch and scoped diff before eventual commits; do not force-switch/reset, stash foreign work, broadly stage, force-push or merge to `main` without authorization.

## 1. Baseline and redistributable backend

- [x] 1.1 Validate this change, record current editor/solver integration, protected working-tree paths, audit findings and engine/pack/presentation fingerprints in this change's verification record; verify the observed API mapping in design.md is current and no foreign edits are overwritten.
- [x] 1.2 Vendor the Konva 10.9.1 browser-global bundle with its pinned-release MIT license, source/version/checksum and third-party notices; verify byte/hash provenance, a local classic-script global, absence of mandatory native/runtime dependencies, and document acquisition versus offline runtime use.

## 2. Pure visual model and conformance

- [x] 2.1 Implement a headless definition/view-to-visual descriptor module with shared semantic color roles, direction/link/contact/closure marks and actor layers; verify every registered ID plus dot maps without modifying rules or YAML using `npm run test:unit:registry` and `npm run test:unit:helpers`, and document the descriptor boundary.
- [x] 2.2 Add pure composition and label builders for runtime states, gallery samples and authored/invalid editor drafts; verify terrain/feature/occupant identity, explicit diagnostics and A1 orientation without requiring DOM, Konva, a valid quick-test state or any new mechanics.
- [x] 2.3 Extract/reuse the display event reducer and atomic commit grouping as shared presentation helpers; verify full state-frame coverage, push/pull multi-actor updates, portal cuts, terminal flags and diagnostic rollback with focused helper/rules tests and document intent versus committed output.

## 3. Complete pixel/vector identities and sprite sources

- [x] 3.1 Create original editable 32×32 indexed-pixel patterns for every role in the design's art table, including all 62 registered variants and dot; deliver a coverage map/contact sheet and verify no supported definition is an unimplemented placeholder or copied commercial asset.
- [x] 3.2 Implement the complete vector node factory using the same descriptors, including explicit ID 0, carrier badges, larger link marks, all directions, contacts, pending closure and terminal samples; verify a two-identity conformance matrix with `npm run test:unit:registry` and helper tests and document that vector is not a separate SVG engine.
- [x] 3.3 Implement validated frame/manifest data and deterministic origin-clean atlas generation with checked-in runtime data and retained editable sources; verify bad bounds/references/durations/palettes are diagnosed, equivalent sources reproduce output, file-URL use needs no fetched JSON, and license/provenance and manifest format are documented.
- [x] 3.4 Add decorative belt/ice/portal/beam/dot frames and within-ramp palette cycling with stable semantic anchors; verify every frame retains required colors/exit arrows, crate/target/pending overlays survive occlusion, static/reduced samples remain legible, and missing pixel frames visibly fall back to vector without counting as completed art coverage.

## 4. Shared Konva surfaces and accessible coordinates

- [x] 4.1 Implement shared board, thumbnail and offscreen-export surfaces with reusable nodes, independent instance ownership and the design's layer/overlay model; verify runtime and authoring descriptors compose identically, thumbnails do not require one live stage each, and document the mount/update/export/dispose API.
- [x] 4.2 Implement responsive sizing, nearest-neighbor pixel scaling and a shared bottom-left-coordinate hit map; verify 20/32/64/96 CSS-pixel cells, DPR 1/2, fractional zoom, tight viewport fit/scroll and matching pointer/keyboard coordinates with focused transform tests.
- [x] 4.3 Add semantic grid/roving focus, inspection labels and visible cursor/selection/diagnostic overlay callbacks; verify colors, links, occupants, closure and outcome are accessible without pixels, decorations cannot consume edits, controls dispatch once and a missing Canvas context produces a readable failure message rather than hanging.

## 5. Committed playback, motion and teardown

- [x] 5.1 Drive commit-frame playback and bounded ambient sprite indexing from a surface-managed Konva clock; verify atomic actor tracks, current mirror snapshots, no partial handler state, representative static frames and unchanged route events/outcomes with `npm run test:unit:helpers` and `npm run test:unit:rules`.
- [x] 5.2 Implement settle/cancel, generation-guarded completion and complete teardown for input interruption, undo, restart, navigation and identity changes; verify immediate final-state settlement, at-most-once callbacks, no stale HUD/progress side effects, and no retained nodes/listeners/timers with deterministic fake-clock tests.
- [x] 5.3 Implement system-reduced-motion defaults and explicit presentation motion controls, hidden-surface suspension, failed-board freeze and stable won marks; verify colors and positions are never masked by desaturation/flash, resuming has no time catch-up queue, and document motion policies and cancellation semantics.

## 6. Play, gallery, codex and victory-image migration

- [x] 6.1 Load local Konva/assets in `index.html` and migrate `sm-ui.js`/`sm-render.js` to shared surfaces while preserving controls, HUD and terminal/undo/restart/interrupt orchestration; verify game controller integration through focused helper/rules tests and update engine architecture for the state/event-only boundary.
- [x] 6.2 Migrate codex icons and `glyphs.html` to shared previews with both identities and a full 63-definition/state gallery; verify direction/tint/carrier/contacts/pending/failed samples have the same descriptor meaning, static thumbnails use bounded resources and document the identity/state review workflow.
- [x] 6.3 Replace the independent solved-board SVG builder with export through the shared compositor, preserving custom PNG precedence and PASS fallback; verify World 1 crate/target final state, restart/navigation image clearing, origin-clean export preparation and no YAML/progress mutation with focused tests and updated image-export documentation.

## 7. Editor is a full shared-renderer consumer

- [x] 7.1 Remove SVG/DOM-cell drawing from the editor browser binding and use shared surfaces for the edit grid, palette, quick guide/help and authored/snapshot previews; verify the headless editor model remains Canvas-free using `npm run test:unit:editor`, and document the shared API rather than a forked editor renderer.
- [x] 7.2 Adapt editor coordinate callbacks/overlays while retaining primary/secondary brush, region/cursor, marker confirmation, inspector override scope, edit undo and validation/save blocks; verify the existing user workflows and authored initial data are unchanged with editor unit tests and semantic UI fixtures.
- [x] 7.3 Route quick-test and solver snapshot/route presentation through shared committed playback without altering solving; verify no quick-test scores/progress writes, failed undo blocking, reset, A/B buffer isolation and unchanged solver commands/strokes using `npm run test:unit:editor` and `npm run test:unit:solver`.

## 8. Identity controls, regression harness and current guidance

- [x] 8.1 Add pixel/vector controls on play/gallery/editor with URL-over-preference precedence and isolated memory/storage fallback; verify changes settle visuals but preserve rules, edit history, A/B snapshots, YAML and progress, and document preference/reload behavior in player/editor guides.
- [x] 8.2 Adapt jsdom tests to the actual new renderer orchestration and semantic accessibility layer, using a test-only recording Canvas boundary where needed; verify behavior assertions are preserved rather than replaced by always-successful stubs, no production test-only fallback is shipped, and document what jsdom cannot prove about real pixels.
- [x] 8.3 Remove legacy SVG-fragment glyph insertion after all consumers migrate; update README, documentation index, tile-reference presentation details and architecture without changing accepted gameplay requirements, and verify a call-site search finds no alternate board/glyph/export renderer while intentional custom/PASS images remain supported.
- [x] 8.4 Extend the native rendering harness and asset audit for Canvas-based directions, complete pixel/vector coverage and fingerprints covering vendor/art/manifest/editor/presentation files; verify existing seven-pack proof/native obligations are retained, stale/new-asset evidence is rejected and unrelated draft/audit issues are recorded rather than hidden.

## 9. Final integration, visual review and evidence

- [x] 9.1 Run the existing focused registry/helpers/rules/levels/editor/solver suites and final root `npm test`; validate this change strictly, check local links/notices/whitespace and scoped diff, and record actual results proving no new mechanic, pack/PAR/schema or gameplay-progress change.
- [x] 9.2 Run the updated real-Chromium `file://` harness for all seven packs, gallery and editor in both identities with real Konva/assets, plus reduced motion, denied storage, failure/undo/restart, input interruption, coordinate edits and generated/custom victory images; inspect contact sheets and screenshots at playable sizes, verify zero external resources/page errors, and publish fresh fingerprint-bound native evidence separately from jsdom.
- [x] 9.3 Measure the 16×9 animated stress scene, all-definition gallery and 100 theme/rebuild/preview cycles on a recorded browser/CPU/viewport/DPR; verify the design's frame-work targets, bounded caches/live clocks and full disposal, preserve math proofs only when their inputs remain unchanged, run strict/preaccept asset audits, and report visual/contract/release readiness and unresolved owner dependencies separately.

## Workflow follow-up

- Keep this activity on `graphiscs-engine-update-pixel-16bit`. Further commits/pushes and any pull request or merge to `main` require explicit authorization/review; creating the remote branch did not publish uncommitted plans or prerequisites.
- Request visual acceptance of the full pixel/vector contact sheets and native evidence before release. Optional future art polish is not a substitute for the complete baseline set required here.
- Synchronization of this change's new presentation capability and archival are later reviewed actions; do not infer acceptance of the active editor/solver changes or global release readiness from rendering task completion.
