# Tasks

## 1. Receiver variant allocation and validation

- [ ] 1.1 Reserve IDs 90–100 for the documented color/link receiver variants and coordinate phase-wall links 1–3 with `world-1-sokoban`; add a unique-ID/default-parameter test before registering them.
- [ ] 1.2 Keep ID 50 as red/link 1 and register the remaining variants; verify each variant reports its intended color/link while existing ID 50 definitions still pass the B11 tests.
- [ ] 1.3 Validate that receivers only accept supported colors and configured links; add malformed/dangling link tests and document the finite variant matrix and OR semantics.

## 2. Sensor rules, rendering, and solver tests

- [ ] 2.1 Retain cardinal-only derived activation and add tests for each color/link combination, wrong colors, diagonal/same-cell non-contact, multiple lit directions, and immediate deactivation after crate movement.
- [ ] 2.2 Add multi-link rules/solver tests proving a receiver opens only its assigned gates and separate links remain independent; verify same-link active sensors retain OR behavior.
- [ ] 2.3 Add browser coverage for directional indicator glyphs and crate visibility using the shared World 1 crate-overlay contract; document that receivers are not occupancy targets.

## 3. World 6 pack

- [ ] 3.1 Confirm the shared world-pack, progress identity, and crate-overlay contracts from `world-1-sokoban` are available; integrate the pack without duplicating loader behavior.
- [ ] 3.2 Author eight named levels for single docking, multiple color/link docks, corner routing, combinations with existing locks/conveyors, homage, 16-wide railway track, re-docking, and mastery; do not require World 4 sliding.
- [ ] 3.3 Solve all levels and set verified pars; manually review each sensor's color/link, gate necessity, re-docking sequence, and absence of occupancy-target assumptions; record route notes.
- [ ] 3.4 Add content tests for all eight levels, variant/link references, sensor contact, solver status, and exact pars; verify the entire pack validates atomically.

## 4. Integration

- [ ] 4.1 Run `npm test` and verify legacy sensor behavior, variant tests, crate rendering, World 6 solver/content tests, and browser loading pass.
- [ ] 4.2 Load World 6 under Chromium `file://`, dock and re-dock a colored crate, inspect each cardinal indicator, switch worlds, and verify no progress or receiver-state leakage.
