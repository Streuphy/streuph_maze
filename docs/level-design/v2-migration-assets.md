# V2 maintained-asset checklist

> **Migration checkpoint:** The checklist below preserves the implementation
> review, when accepted-spec synchronization was still deferred. The subsequent
> documentation review synchronized all ten deltas; see the follow-up at the end.

Checkboxes record actual review/verification for the sole queued contract;
accepted-spec synchronization/approval is a separate dependency, not assumed.
The change's `asset-inventory.md` and `tile-catalogue.md` define dispositions.

## Runtime and presentation

- [x] `src/js/tiles.js` — all 62 entries plus separate dot definition.
- [x] `src/js/sm-board.js` — retained common geometry; focused/full coverage.
- [x] `src/js/sm-entities.js`.
- [x] `src/js/sm-rules.js`.
- [x] `src/js/levels.js`.
- [x] `src/js/levels.default.js` and generated `data/levels.yaml`.
- [x] `src/js/sm-yaml.js` — empty collections and current authoring header.
- [x] `src/js/sm-store.js`.
- [x] `src/js/sm-ui.js`.
- [x] `src/js/sm-io.js` — retained shared activation/export; native file/paste coverage.
- [x] `src/js/sm-render.js`.
- [x] `src/js/sm-glyphs.js`.
- [x] `src/css/sm.css`.
- [x] `index.html`, including embedded/custom victory presentation.
- [x] `glyphs.html`, including all cardinal exits and registered variants.

## Content, tooling, tests

- [x] All 61 identities in `v2-pack-certification.md`.
- [x] `scripts/emit-levels-yaml.js`.
- [x] `scripts/report-par-routes.js`.
- [x] `scripts/audit-v2-assets.js`, including complete definition/default/usage checks.
- [x] `v2-pack-proofs.json` and all seven per-pack route/design reviews.
- [x] `tests/verify.js` and `tests/unit/registry.js`.
- [x] `tests/unit/v2.js` and `tests/unit/pack-migration.js`.
- [x] `tests/browser-test.js` and actual Chromium `file://` evidence.
- [x] `scripts/verify-v2-chromium.js` and `v2-chromium-verification.json`.
- [x] `v2-verification.md` distinguishes final Node/jsdom, real Chromium, and acceptance.
- [x] `package.json` existing commands retained; no dependency or lockfile changes needed.

## Maintained guidance and contracts

- [x] `README.md`, `AGENTS.md`, `docs/GAME_RULES.md`.
- [x] `docs/Product_Design_Document.md`, `docs/engine-architecture.md`.
- [x] `docs/world-level-packs.md`, `docs/level-design/tile-mechanics.md`.
- [x] `docs/level-design/world-authoring-checklist.md`.
- [x] `docs/level-design/worlds-blueprint.txt` implemented-world sections.
- [x] `docs/level-design/world-1-sokoban.txt`.
- [x] `docs/level-design/world-5-chromatic-route-review.md`.
- [x] `docs/level_editor_Proposal.md` future YAML-only guidance; editor remains unimplemented.
- [ ] Accepted specification deltas/purpose synchronization after approval.
- [x] Active authority links and explicit supersession of the incomplete plan.

The one unchecked item is the explicitly deferred **acceptance/release** step,
not omitted implementation review. All ten capability deltas remain visible to
the semantic audit; pre-acceptance success never reports `releaseReady`.
See `v2-verification.md` for actual commands/native-browser evidence.

## Definition coverage

Required IDs: 0–5; 10–13; 20–27; 30–36; 40–42; 44–48; 50; 60–67;
70–73; 80–84; 90–100. This is exactly 62 registered entries, not every number
between the minimum and maximum. The dot is separately required, not ID 1.
Current pack usage contains 49 of those IDs; all 13 other entries have the same
definition/schema/glyph/lifecycle coverage. ID gaps remain unsupported.

## Preserved exclusions

Historical `openspec/changes/archive/**`, `docs/design-history/**`, explicitly
superseded proposal records, `.git` history/tags, dependencies, and harness skills
are not rewritten. Do not discard the user's World 6 archive move or unclassified
`docs/Nouveau document`. A historical exemption never permits an obsolete live
resolver path or misleading maintained guidance.

## Documentation review follow-up — 2026-11-02

- [x] All ten existing V2 deltas synchronized into accepted specs, including
  Purpose corrections and the two missing accepted capability homes.
- [x] Player/author/agent navigation and state/event ownership clarified without
  changing mechanics, authored boards, progress records or generated evidence.
- [ ] Whole-tree audit readiness: blocked by conflicting protected editor-draft
  guidance owned by separate work; synchronization alone cannot clear that gate.

See the [archived review](../../openspec/changes/archive/2026-11-02-doc-review-v2-ruleset/review.md)
for command outcomes, concurrent-work attribution and remaining dependencies.
No release approval or archival is implied.

## Graphics branch automated gate — 2026-11-02

The shared pixel/vector renderer has producer-refreshed mathematical/native
evidence and passing strict/preaccept asset checks in its isolated worktree.
See the [current rendering record](../../openspec/changes/graphiscs-engine-update-pixel-16bit/verification.md).
The older unchecked draft/readiness item above is its preserved review checkpoint,
not the current branch result. Unrelated drafts are still preserved separately;
no audit exception was added for obsolete rule/schema prose. Explicit versioned
OpenSpec provenance is no longer mistaken for a playable old policy, with
negative regression tests retaining the stale-guidance checks.
