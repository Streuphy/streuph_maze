# Repository instructions

## Required verification

- Before reporting work complete, run `npm test` from the repository root for
  changes to game code, tile definitions, level/world data, tests, or level-design
  documentation.
- `npm test` is the required final check. It runs both `tests/verify.js` and
  `tests/browser-test.js`. `npm run test:rules` and `npm run test:browser` are
  useful focused checks during development, but neither replaces the final
  `npm test` run.
- Report the command and its actual result. Do not claim a test passed if it was
  not run; if it fails, fix it or report the blocker instead of marking the work
  complete.
- For rendering or local-file loading changes, also follow the real-Chromium
  `file://` verification requirement in
  `docs/level-design/world-authoring-checklist.md`; the npm browser suite uses
  jsdom and is not a substitute for that check.

## World and level authoring

- Before adding or revising a world pack, follow
  `docs/level-design/world-authoring-checklist.md` and the Golden Rules in
  `docs/level-design/worlds-blueprint.txt`.
- Keep each world's progression, tutorial scope, board limits, solver-proven
  pars, safe starts, and mechanic-specific tests explicit. A solver finding one
  solution does not by itself prove a puzzle teaches its intended mechanic or
  avoids tutorial softlocks.
- Use the shared world-pack loader and format. Do not create a world-specific
  loader or bypass the common validation path.
