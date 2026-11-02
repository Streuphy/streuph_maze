# Queued V2 verification record

> **Status follow-up — 2026-11-02 documentation review:** The ten existing V2
> deltas are now synchronized into accepted specifications. The implementation
> checkpoint below is preserved as recorded; its no-sync/no-commit statements
> describe that earlier checkpoint. See the current follow-up at the end and the
> [review record](../../openspec/changes/archive/2026-11-02-doc-review-v2-ruleset/review.md) for
> unresolved whole-tree audit guidance. This is not release approval.

Recorded on 2026-11-02 for the working implementation of
`v2-global-pack-migration`. This is implementation/content evidence, not accepted-
spec approval or a released version. No commit, staging, archive, or spec sync
was performed.

## Mathematical coverage and repository checks

- Seven packs, **61/61** minimum solutions proved/replayed, authored scores
  matching, all representative-route balance comparisons complete.
- All shipped first-three-level groups have complete bounded reverse
  reachability review with zero unwinnable playing states. Terminal ray mistakes
  are counted separately; advanced avoidable wrong pushes and optional scenery
  remain explicit in the per-pack reviews.
- Totals: Prologue 160; Worlds 1–6: 114 / 148 / 176 / 58 / 104 / 109.
  Aggregate **869 strokes**, not a personal best or a difficulty rating.
- **62 registered tiles + dot** use the same full definition template; current
  usage is 49 IDs, with 13 supported unused IDs retained. Audits verify every
  default, usage row, complete behavior group, and separate dot state/profile.
- Existing focused registry/rules/levels/helpers commands passed. Final
  `npm test` passed **1120 Node checks and 264 jsdom checks**, zero failed.
- `npm run levels:emit -- --check`, `npm run levels:routes -- --early-review`,
  OpenSpec strict validation, whitespace, and maintained-asset checks are distinct
  gates. Only completed commands are recorded in the change's verification log.

Machine-readable proof: [v2-pack-proofs.json](v2-pack-proofs.json).
Design review for every identity: [certification ledger](v2-pack-certification.md).
The proof contains exact routes, dimensions, profiles, budgets, counts, source
digests, engine fingerprint, replay status, and early-state results.

## Actual Chromium `file://` check — not jsdom

`node scripts/verify-v2-chromium.js` passed using installed **Chromium
154.0.8037.97**, a fresh temporary profile, and local DevTools automation.
The optional script needs Node with built-in WebSocket and a Chromium executable
(`CHROMIUM=/path/to/chromium` can override the default). Its headless/no-sandbox
flag is confined to this harness profile, not a game runtime requirement. The
game itself uses no server, build, module fetch, or external resource.

For **each** pack, actual browser file input and YAML paste used the shared UI
loader. The native loader verified every level minimum. Show-current/export
round-tripped initial authoring before **and after play**, including the embedded
victory PNG and overrides; invalid loading left the active board unchanged.
Every representative route won at its proven score, and nonterminal undo restored
the complete pre-action snapshot. Completed playback matched authoritative state.

| Pack | Representative real UI play | Additional inspection |
|---|---|---|
| Prologue | First steps; Two colours; Conveyor | Unlocked progression, decoded 250×250 custom victory PNG, current carrier and arrow floor |
| World 1 | First Push | Atomic crate push, active target, required gate, undo |
| World 2 | First Medusa | Safe shield placement/undo; native unshielded crossing commits ray failure |
| World 3 | Barrier Blocker | Pending crate closure glyph/accessible requested/effective distinction; native dot-following push commits closure failure |
| World 4 | Absolute Momentum | Essential bumper stop, chained cardinal transport; Red conveyor-tint variant changes neither arrow nor outcome |
| World 5 | The Other Carrier | World Blue gate admits Red P / Blue W; later matching goal entry |
| World 6 | Belt and Barrier | Actual cargo conveyor docking produces receiver/gate signal before exit traversal |

A clearly identified **shared terminal fixture** was loaded from each pack
context (it is not presented as an authored winning route). Failure visibly froze
the board, disabled gameplay/undo, awarded no best, and hid victory art. Direction
and Z left the failure snapshot untouched. R rebuilt a fresh playable attempt;
Back-to-built-in returned to the 13-level Prologue every time. Native World 2
ray and World 3 closure failures additionally exercised those same policies on
actual authored boards; earlier legitimate best scores were not erased.

`glyphs.html` loaded directly from disk and rendered all **63 definitions**, ID 0
included, no numeric-gap placeholders. All eight conveyor variants had visible
White-stroked arrows covering four exit directions. Inert tint preserved glyphs;
pending/failed samples remained distinct. Actual screenshots were inspected for
each representative board, pending/failure, custom victory, and gallery arrows.
Large fixed board envelopes retain documented wall padding; it is not claimed
to create extra puzzle complexity.

**Zero page exceptions and zero external resource requests** in the final native
run. Full version, per-pack source hashes, engine/presentation fingerprints,
scenario flags, and temporary screenshot paths are in
[v2-chromium-verification.json](v2-chromium-verification.json). The audit rejects
missing, failed, omitted-pack, or stale native evidence. Rerun the script after
changing engine/presentation or authored sources; screenshots are harness
artifacts under `/tmp/opencode`, not bundled game resources.

## Acceptance boundary

`node scripts/audit-v2-assets.js --preaccept` passes with no implementation,
content, reference, proof, or browser-evidence errors. It **does not** claim
`releaseReady`: ten capability deltas still require reviewed accepted-spec
synchronization, including removal of the former recovery requirement and stale
Purpose text. The audit compares added/modified/removed requirement blocks, not
just keyword scans. Strict release mode intentionally blocks on that dependency.

Review/synchronize accepted specs before release or archival. Historical archives,
design history, the pending separate World 6 archive relocation, dependencies,
harness internals, and `docs/Nouveau document` were not discarded or rewritten.

## Documentation review follow-up — 2026-11-02

`doc-review-v2-ruleset` explicitly integrated the existing ten source deltas into
accepted specs, including new event-resolution/conveyor-transport homes and
stale hazard Purpose/recovery text. Strict validation passes for all ten accepted
specs. Both pending-sync and deferred-spec audit lists are empty. That is a
reviewed documentation baseline, not an archive or release declaration.

Player instructions now have a concise commands/outcomes guide. The PDD and
architecture separate configuration, canonical/derived state, round context,
captured triggers, pending intent and committed events. Engine transaction
integrity and registered mechanic policy meet through those explicit boundaries,
not numeric-ID dispatch or rendering decisions. No new mechanics were specified.

The protected exploratory editor draft independently fails the whole-tree asset
audit; its format/bounds conflict is assigned to separate editor work. Source
code and tests for that work also changed concurrently and are not part of this
documentation review. They are preserved and not presented here as accepted.
Current command results and remaining gates are recorded in the
[review](../../openspec/changes/archive/2026-11-02-doc-review-v2-ruleset/review.md).

No new native Chromium run was performed for prose-only changes. The earlier
fingerprint-bound mathematical/native-browser JSON remains unchanged; passing
fresh jsdom checks cannot be substituted for a native-browser run.
