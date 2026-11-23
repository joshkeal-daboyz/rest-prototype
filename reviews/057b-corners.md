ticket: 057b-corners
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B of 057: every row starts flush at its corner (no inset; `tileRowInset_m` and `TILE_INSET_MAX_M` removed). The length left over goes to the row's far end, which closes as a seam, then an overshoot of at most 1.0 m into the next corner block, then a gated passage of 1.0 to 5.3 m recorded in `TileCity.passages`. Check G2 proves the pavement's back edge is covered along every block side, and fails on the old inset layout. The 056 A temporary far-gap floors are retired, and the ladder is unchanged.

## Does the branch do it?
Round 2. I reviewed `1b9d3f9` against `a684c47`, the round 1 head. Only `src/render3d/frontage.ts` (+25/-3) and `src/render3d/frontage.test.ts` changed. `frontage.test.ts` passes here (18 tests, up from 16). The gate was reported green (tsc clean, 2323 passed, 8 skipped).

Criteria 4 and 5 were met in round 1, and this round does not touch them. Round 1's reasoning for them stands.

**Round 1 Must fix 1 (G2 and the passages use the corner flank's street-level wall): done.**
- **`groundDepth_m(stack)`** takes the corner column (`columns.findIndex(c => c.corner !== null)`) and its `role === "base"` pieces, and returns `max(d/2 - z)`. That matches the sign of `depthOf` under `align: "wall"`, which returns `-minBack` of `z - d/2`. A stack with no corner column or no ground piece falls back to `depth_m`.
- **Cover:** in `edgeCoverage`, a corner block's rectangle is now `groundDepth_m` deep, not `depth_m`. So the flank covers only as far as the ground piece's back.
- **Classify:** each corner end's real opening is `farGap_m - farOvershoot_m + flank`, where `flank = depth_m - groundDepth_m` of the next run's first block when that block is a corner. Seam, overshoot, passage, slit and wide are all decided on that value. The covered stretch, the passage's `w_m` and the mouth middle all use `g = max(0, real)`. `tilePassages` reads the same list, so `TileCity.passages` gets the real width.
- **Failing fixture, real and not self-referential:** "fails a seam, and a 0.2 m overshoot...". On 6 corner ends, a 0.05 m seam and a 0.2 m overshoot, both measured to the roof's wall, each give `uncovered > 0` and fail G2. The seam case also counts a `slit`. The same end passes when the opening is really 0.05 m at street level, and when the overshoot really reaches 0.3 m past the ground piece. `withGap` changes the last block's lot and `width_m` and keeps the run's start on its corner, so the fixture drives the real coverage code.
- **Pin:** "measures a corner block's flank from its corner column's ground piece" checks two things. All 34 corner blocks have a flank of 0.35 to 0.76 m. Every recorded passage has `w_m = farGap_m + flank` (to 9 places) and is at most 5.3 m.
- **The 13 cities** still pass the unchanged test with `uncovered` 0, `slit + wide` 0 and G2 value 0, now with the stricter flank. So the "if a city then fails, re-cut `wallTo`" branch of Must fix 1 is not needed.

**Round 1 Could improve 1 and 2: done.**
- The vacuous `toBeGreaterThanOrEqual(0)` is gone. The 5.3 m case now asserts `wide` 0, `uncovered` 0, a passage of 5.3 m recorded for that run, and G2 passing. The 5.4 m case asserts `wide` 1 and `uncovered > 0`.
- The uniform-inset fixture now says in its name and in a comment that it has the shape of 793bbf7's layout, not its exact per-row insets.

**My own re-measure on the default city** (3 x 3, seed 1, the test's fixture entries). I used a throwaway tsx script outside the repo that projects actual piece extents in world space. It does not reuse `groundDepth_m`. For each of the 34 corner-ending runs, I measured from the far end of the last block's base pieces to the back of the next corner block's corner-column base pieces:
- 28 are passages, with real street-level openings of 2.42 to 4.08 m, all inside 1.0 to 5.3 m;
- 6 are overshoots that still reach the ground piece, by 0.21 to 0.35 m;
- 0 seams, and 0 openings under 1.0 m or over 5.3 m;
- `frontageMetrics` agrees: `uncovered` 0, `slit` 0, `wide` 0.

No corner-ending run leaves a bare strip at street level.

**Criterion 6 is now met.**

## Rule conflicts and risks
- **The near side of a far-end opening is still measured to the last block's widest piece, not its ground piece.** The mouth starts at `t0 + s0 + farOverhang_m`, and `farOverhang_m` is the overhang of all pieces.
  - On the default city, the last block's base piece ends 0.03 to 0.24 m inside its column on 28 ends, where `farOverhang_m` is 0.014 or 0.041.
  - On the 6 overshoot ends it overhangs by 0.0 to 0.09 m, where `farOverhang_m` is 0.155.
  - So the real street-level passages are about 0.06 to 0.26 m wider than the recorded `w_m`, which D will gate. The overshoots are about that much shallower than G2 counts.
  - Nothing is bare today: there are no seams, and the shallowest overshoot still reaches 0.21 m. This is the same class as round 1's must-fix, on the other side of the opening. I don't block on it in round 2: round 1 could have raised it, and it opens nothing on any of the 13 cities. It is Could improve 1.
- `groundDepth_m` takes the first corner column. A stack with corner columns on both sides would measure the "-x" one. That makes no difference for one style with symmetric corner pieces, and it does not occur in the 34 cases.
- Round 1's other notes still stand:
  - About 9 in 10 row ends are gated passages, now 2.4 to 4.1 m at street level on the default city.
  - `terrace.ts` imports from `tilecity.ts`.
  - D must build `withPassages(city, tilePassages(city, packed))`.

## Must fix
none

## Could improve
1. Measure the near side of a far-end opening at street level too: the last block's base-piece overhang instead of `farOverhang_m` of all pieces, in `edgeCoverage` (`src/render3d/frontage.ts`). Then a passage's `w_m` and mouth are the real ground-level opening on both sides, and a seam or shallow overshoot cannot hide a slit behind a wide roof. That may need the packer to report the base overhang, which goes beyond B's Files line, so it is a note for D or a later re-cut.
2. Round 1's Could improve 3 to 5 still apply:
   - D must build `withPassages(..., tilePassages(...))`;
   - move the passage constants so `terrace.ts` does not import `tilecity.ts`;
   - tell Josh how many row ends are passages, and remind him of Q5's other choice.
