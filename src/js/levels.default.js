/* =========================================================================
 * levels.default.js  —  STREUPH'S MAZE
 * The built-in boot levels, expressed as the SAME object shape that
 * levels.yaml parses into. This is what lets the game start under file://
 * with no fetch (S3, §12.1).
 *
 * GRID ORDERING — read twice, this is the classic off-by-N trap (C3, C4):
 *   grid[0]      is the TOP row, i.e. the row with the HIGHEST row number.
 *   grid[h - 1]  is the BOTTOM row, i.e. row 1.
 *   grid[row][col] uses x = col (0 = column A) and y = (h - 1 - row).
 *   A cell commented "C3" lives at grid[h - 3][2].
 *
 * `overrides` is keyed by the INTEGER tile id as used in that level's grid.
 * That is the whole reason levels.yaml needs to know nothing about tile
 * behaviour (§1.4 / §10.2).
 *
 * `golf_score` is PAR. levels.js recomputes the true optimum and warns (V12)
 * if a declared par does not match, so these values are corrected by
 * tests/verify.js during development.
 *
 * AUTHORING RULE worth stating once, because getting it wrong makes a level
 * silently unsolvable: a switch-driven chokepoint should be a PHASE WALL
 * (id 10), not a colour gate. A colour gate also demands the right carrier,
 * so if the player picks up a prism before crossing it, they lock
 * themselves out. Use a colour gate only when the colour IS the puzzle.
 *
 * Likewise: never route the only exit over a CYCLING DIAL (id 20). Crossing it
 * twice advances the world colour twice and the goal will not open. Use a
 * `set_dial` (id 22), which is idempotent, when a dial sits on the critical
 * path.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  SM.DEFAULT_LEVELS = {
    name: "Streuph's Maze",
    num_level: 12,
    levels: {

      /* ================================================================ */
      /* BAND 1 — walking, walls, and the goal                            */
      /* ================================================================ */
      level_1: {
        name: 'First steps',
        goal: 'Arrow keys or WASD to move. Reach the goal. You and the world are both white, so you match.',
        width: 5, height: 5, golf_score: 8,
        grid: [
          [0, 0, 0, 0, 2],   // row 5
          [0, 3, 0, 3, 0],   // row 4
          [0, 3, 0, 3, 0],   // row 3
          [0, 0, 0, 0, 0],   // row 2
          [1, 0, 0, 0, 0]    // row 1
        ]
      },

      /* ================================================================ */
      /* BAND 2 — the matching rule: prisms set P, dials set W            */
      /* ================================================================ */
      level_2: {
        name: 'Two colours',
        goal: 'A prism sets YOUR colour. A dial sets the WORLD colour. The goal only opens when the two match.',
        width: 5, height: 5, golf_score: 8,
        // Tutorial example: optional 250x250 PNG data URI. Level 1 uses the default PASS picture.
        win_picture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAAD6CAIAAAAHjs1qAAAFeElEQVR42u3dwW3bQBCGUd+pXlJKCvEtVaWv3AKkhwTwNbZlidydmf8B3zGIyOHzmpIp8uU4bu/1+vrjXx/8A6lUn4p9wV244y7cJdwl3CXcJdwl3KXzuL/9Cykh3JXE3cmMnLvjLtwl3CXcJdwl3CXcJdwl3IU77sIdd+GOu3CXcJdwl3CXcJdwl3CXcBfuuAt33IU77sJdwl3CXcJdwl3CXcJdwl3CXbjjLtxxF+64C3cJdwl3CXcJ9zl9+/n9gcwN97G4/QDgjjj6uAcr5x73ROXc456onHvcy0Gv/4q4417oM0TocS8E3bbhPhy6rcUddFuO+wjodgT3COv2CHfQ7R3uUzTYTdwjrKf9bOM+lnvsSW3OjuMeuqhnTgB31oPmgPsN9JyBpHNnPWos0dxZTxtOLnfWA0cUyh30zFklcmc9dmJx3FlPnlsWd9bDpxfEnXUzTOdOcNQYU7hb2k0yhTvr5pnCnXVTTefe7orzLtuMu0PyoO+mt7LB3S/c05S32B3co9eewTf4xZ311dAL7iPuWccg51buuLN+vk7icb93+gWh13+VLjOP5r7xqK/3V0d8iwU+gvv4vxMVQY97xNJeeX3dPgfcRy0wLT4W3DgN3OesLmX/yL9rw4ov8MO5Z1qvJh739utKi0sX67xvxr3xojLjUWSBCzzu868ExH0a95WHs+MXeRZvc9n5jOXOejXxuA/hXt96hd+BuLNOPO4lxzrmdgbLdgR33HHHvfzBS3hqdsLQBnLv6+PP71//zQKP+7qBXo3jPeWXut+1wOOey/1+6Kejx70f977H7DHo56IPPH2fxr3FAXve+iniAxd43Fe/xFnWLxKPO+6nvcS51p8XjzvuV/26v8L6k+K33BoE9zbcqy3t9Rd43Nu862+xtJ++wA/+cGYU98ovEcu91AKP+4qXuNr6M+Jxx73Z0t7ufAZ33HHHvf9BWmO98vkM7rjjjjvuuOOOO+6444477rjjjjvuuOOOO+64+zMT7rjjjrtLxFwihjvuLgDG3dc7fL0Dd1/e8+U93H0121ezcW963unGG7hnHS23VcK909Fy0zzcx344c7gl6pSPZQ43vN57zNzwGve4JcrjDHCvNVAPq8Hdo8huTfMosq7cDw+atLTjjjvuuKeL95D49tyJZx33dWJaiF+85biPXbfqi99uHffGy0kv8eu3tuxkcD8TUEHxWzYV91HnM13EF7GO+4RFpbj4XZtX+ed/OPdY8XWs4z5qafkA1pYjvXd7ir+Zmc99u/hlh3z7ZtR/7z6N+64F5lNqu9437x1CNRsR3Ousr2tuDVJn33G/zV5m7vH3/CateZVhS3sQ98XTv5/j/dt2xf+ZduXcTO4dxZ8b67iX+1iwO3Tcid+GPnzIuJf7e+cY5U2vhZ7MvfLa01p53+92Defe5ZB08d39e4yh3FvfJcZUcSfePHEn3iQDuR/jbnxnjLhb4M0Qd+JNL5A78eFzi+NOfPLEErkTHzurUO5Hq1sjGRHuDqfh4O6gGgvuxBsI7nddkAj6mDngTnzQBHD/wkXnmdAn7Tju6ct81P7inrvaBf42w/1BCvOemp1w5oZ7FotY6Lif5qP1gyajPoPC/UwrTe9xkPNhK+5j6YCO+1JGM+48jHs098dgXcer703IcI9A/wy7GXfbwz0a/eBbBOPOPeW4c0857txTjjv6iOPu00zhLuEu3HEX7rgLd9yFu4S7hLuEu4S7hLuEu4S7cMdduOMu3HEX7hLuEu4S7hLuEu4S7hLuwh134Y67cMdduEu4S7hLuEu4S7hLuEu4C3fchTvuwh134S7hLnXi/vYvpIRwVxJ3JzNy7o67cJdwl3CXcJdwl3CXcJe+LvYvrW0htayzk+wAAAAASUVORK5CYII=',
        grid: [
          [0, 3, 3, 34, 2],  // row 5   D5 world_gate_red | E5 goal
          [0, 3, 11, 0, 3],  // row 4   C4 prism_red
          [0, 3, 0, 3, 0],   // row 3
          [0, 3, 20, 3, 0],  // row 2   C2 cycle_dial
          [1, 0, 0, 0, 3]    // row 1
        ]
      },

      /* ================================================================ */
      /* BAND 3 — belts carry you for free                                 */
      /* ================================================================ */
      level_3: {
        name: 'Conveyor',
        goal: 'Belts carry you one tile per stroke, for free. Chains of belts are free travel.',
        width: 5, height: 5, golf_score: 6,
        grid: [
          [0, 0, 0, 0, 2],   // row 5   E5 goal
          [3, 3, 3, 3, 0],   // row 4
          [0, 0, 0, 0, 0],   // row 3
          [0, 0, 0, 0, 0],   // row 2
          [1, 0, 64, 64, 0]  // row 1   C1,D1 player_east belts
        ]
      },

      /* ================================================================ */
      /* BAND 4 — pushing crates, and the crate sensor (id 50)            */
      /* ================================================================ */
      level_4: {
        name: 'Loader',
        goal: 'Walk into a crate to push it. A receiver lights while a crate of its colour touches it from any side.',
        width: 6, height: 4, golf_score: 8,
        grid: [
          [3, 3, 3, 3, 3, 2],   // row 4   F4 goal
          [3, 0, 0, 3, 3, 0],   // row 3   B3,C3 open | D3,E3 wall | F3 open
          [3, 0, 0, 0, 50, 30],  // row 2   E2 receiver (link 1) | F2 gate (link 1)
          [1, 71, 0, 0, 0, 3]    // row 1   A1 start | B1 crate_red
        ],
        overrides: { 30: { link: 1, colour: 'wht' }, 50: { link: 1, colour: 'red' } }
      },

      /* ================================================================ */
      /* BAND 5 — switch scope: tagged vs global                          */
      /* ================================================================ */
      level_5: {
        name: 'Keys and masters',
        goal: 'A key latches the link it names. A master lock overrides every link at once — and it latches too.',
        width: 8, height: 5, golf_score: 9,
        grid: [
          [0, 0, 0, 0, 0, 0, 0, 0],  // row 5
          [0, 0, 0, 0, 0, 0, 0, 0],  // row 4
          [0, 44, 0, 0, 0, 0, 0, 0], // row 3   B3 master_lock
          [0, 0, 41, 0, 0, 0, 0, 30],// row 2   C2 link_key(1) | H2 aura_gate_wht(1)
          [1, 0, 0, 0, 0, 0, 3, 2]   // row 1   A1 start | G1 wall | H1 goal
        ],
        overrides: { 30: { link: 1 } }
      },

      /* ================================================================ */
      /* BAND 6 — momentary (plate) vs latched (key)                      */
      /* ================================================================ */
      level_6: {
        name: 'Hold and release',
        goal: 'A plate is live only while you stand on it. A key stays live. Walk back through a plate gate and watch it seal.',
        width: 8, height: 5, golf_score: 11,
        grid: [
          [3, 0, 0, 0, 0, 0, 3, 2],  // row 5   G5 wall | H5 goal
          [3, 0, 0, 0, 0, 0, 10, 0], // row 4   G4 phase_wall (link 1)
          [3, 0, 0, 0, 0, 0, 42, 30],// row 3   G3 link_plate(2) | H3 aura_gate_wht(2)
          [0, 0, 41, 0, 0, 0, 0, 3], // row 2   C2 link_key (link 1) | H2 wall
          [1, 0, 0, 0, 0, 0, 3, 0]   // row 1   G1 wall
        ],
        overrides: { 42: { link: 2 }, 30: { link: 2 } }
      },

      /* ================================================================ */
      /* BAND 7 — phase walls                                             */
      /* ================================================================ */
      level_7: {
        name: 'Hinges',
        goal: 'A phase wall is solid only while its link is unsatisfied. Same lock law, no colour test.',
        width: 8, height: 5, golf_score: 11,
        grid: [
          [0, 0, 0, 0, 0, 0, 3, 2],   // row 5   G5 wall | H5 goal
          [0, 0, 0, 0, 0, 0, 0, 10],  // row 4   H4 phase_wall (link 1)
          [0, 0, 0, 0, 0, 0, 3, 3],   // row 3   G3,H3 walls
          [0, 41, 0, 0, 0, 0, 0, 0],  // row 2   B2 link_key (link 1)
          [1, 0, 0, 0, 0, 0, 0, 0]    // row 1
        ]
      },

      /* ================================================================ */
      /* BAND 8 — portals                                                 */
      /* ================================================================ */
      level_8: {
        name: 'Short cuts',
        goal: 'Portals are always paired. Walking into one exits from its twin.',
        width: 8, height: 6, golf_score: 12,
        grid: [
          [3, 3, 3, 3, 3, 3, 3, 2],    // row 6   H6 goal
          [3, 3, 3, 3, 3, 3, 3, 34],   // row 5   H5 world_gate_red
          [3, 3, 0, 0, 0, 0, 0, 0],    // row 4   C4..H4 open
          [3, 80, 20, 11, 0, 0, 0, 0], // row 3   B3 portal | C3 dial | D3 prism_red
          [0, 0, 3, 3, 3, 3, 3, 0],    // row 2   A2,B2 open | H2 open
          [1, 0, 0, 80, 0, 0, 0, 0]    // row 1   A1 start | D1 portal
        ],
        overrides: { 80: { link: 1 } }
      },

      /* ================================================================ */
      /* BAND 9 — crate belts                                             */
      /* ================================================================ */
      level_9: {
        name: 'Push chain',
        goal: 'A crate belt shoves whatever sits in front of it, one tile, for free — then carries you along.',
        width: 8, height: 5, golf_score: 12,
        grid: [
          [0, 0, 0, 0, 0, 0, 3, 2],   // row 5   G5 wall | H5 goal
          [0, 0, 0, 0, 0, 0, 0, 30],  // row 4   H4 aura_gate_wht (link 1)
          [0, 0, 71, 60, 0, 50, 3, 3],// row 3   C3 crate_red | D3 crate_east | F3 receiver
          [0, 0, 0, 0, 0, 0, 0, 3],   // row 2   H2 wall
          [1, 0, 0, 0, 0, 0, 0, 0]    // row 1
        ],
        overrides: { 30: { link: 1 }, 50: { link: 1, colour: 'red' } }
      },

      /* ================================================================ */
      /* BAND 10 — the 16x9 tutorial maze (immovable walls + crates)      */
      /* ================================================================ */
      level_10: {
        name: 'The long way round',
        goal: 'Walls never move. Crates do — push one down a corridor to open a route, or walk around it.',
        width: 16, height: 9, golf_score: 27,
        grid: [
          // row 9  A9..P9
          [3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
          // row 8
          [3, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0],
          // row 7
          [3, 0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 3],
          // row 6
          [3, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
          // row 5
          [3, 0, 3, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 3, 0, 3],
          // row 4
          [3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 3, 0, 3],
          // row 3
          [3, 3, 3, 0, 71, 0, 3, 0, 0, 0, 3, 3, 3, 3, 0, 3],
          // row 2
          [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
          // row 1  A1 start
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3]
        ],
        overrides: { 71: { colour: 'wht' } }
      },

      /* ================================================================ */
      /* BAND 11 — the 2x16 corridor                                     */
      /* ================================================================ */
      level_11: {
        name: 'Corridor',
        goal: 'Two rows, sixteen columns, one obstruction. The long way round is sometimes the only way.',
        width: 16, height: 2, golf_score: 16,
        grid: [
          // row 2
          [0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 30, 0, 0, 2],
          // row 1  A1 start
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0]
        ],
        overrides: { 30: { link: 1 }, 41: { link: 1 } }
      },

      /* ================================================================ */
      /* BAND 12 — capstone                                               */
      /* ================================================================ */
      level_12: {
        name: 'Colophon',
        goal: 'Everything at once: a set dial instead of a cycling one, two links, and a master lock that can undo your work.',
        width: 16, height: 9, golf_score: 27,
        grid: [
          // row 9
          [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],  // P9 goal
          // row 8
          [3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 3, 0, 0],  // I8..M8 | O8 | P8
          // row 7
          [3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 3, 34, 3], // I7..M7 | N7 wall | O7 world_gate_red
          // row 6
          [3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 3],  // I6..O6
          // row 5
          [3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 44, 0, 0, 3], // I5..L5 | M5 master_lock | N5,O5
          // row 4
          [3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3],   // H4..O4
          // row 3
          [70, 0, 3, 11, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 3], // A3 crate | D3 prism_red
          // row 2
          [0, 0, 3, 22, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3],  // D2 set_dial
          // row 1  A1 start
          [1, 41, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 3] // B1 link_key(1) | H1 phase_wall(1)
        ]
      }

    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
