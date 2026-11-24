ticket: 081-P0-two-ways-round-city
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Move K2c's test fixture `city-two-ways-round.city.json` unchanged to `puzzles/city/`, repoint the one path line in `src/city/circuit/convert.test.ts`, delete the empty `fixtures/`, and add a short city-form design note (from, district, place table, carriers, intended read from the default camera, the schematic's check block, an empty "What it taught us"). No test added or rewritten; the schematic and its note untouched. Read against the ticket as it stands on `ticket/081-puzzles-on-the-city` (c0cb55e), with Josh's 24 Nov "full 3D" answers at the top of the open questions.

## Does the branch do it?
1. **The move: met.** The builder's commit 38ac27a shows `src/city/circuit/fixtures/city-two-ways-round.city.json` → `puzzles/city/city-two-ways-round.city.json` at similarity 100%, so the content is unchanged. `src/city/circuit/fixtures/` no longer exists in the worktree. `convert.test.ts` changes only line 24, the `beforeAll` path, which now goes through the file's existing `ROOT` constant. No `it(` body is touched. Nothing else in `src/`, `tests/`, `tools/` or `docs/` still points at the old path. `npx vitest run --maxWorkers=2 src/city/circuit/convert.test.ts`: 10 passed, 1.5 s. The "plays the same" case is among them.
2. **The note: met.** `puzzles/city/city-two-ways-round.md` points to the schematic note for the element, the trap and the numbers. I checked its facts against the JSON:
   - `from` `city-two-ways-round`; city 6 x 6, seed 1, one-way on; district `block:6:6`; capacity 3; starting parts `wire`; targets shrine and infirmary; priority homes.
   - All 8 node places (poles and building ids) match.
   - Span counts per line match the table (1, 2, drop, 13, drop, 8, drop, 7).
   - Fault `y` on `l_e2` at `z:7:lo:277.50~289.17` and fault `x` on `l_x` at `z:6:hi:264.33~274.50` match.

   The carriers table follows answer 5. The intended-read section describes the default camera and "Straight, piece to piece", which fits the full-3D answer. Its check block is byte-identical to the schematic note's (diffed). "What it taught us" is present and empty.
3. **Schematic untouched: met.** `git diff origin/main...HEAD` lists no change to `puzzles/city-two-ways-round.json` or `puzzles/city-two-ways-round.md`.

Test count: 0 added, 0 rewritten, as the ticket says.

## Rule conflicts and risks
- No hard-rule break. No change to `src/grid/` or `src/night/`, no `puzzles/locked/`, no new dependency, no GDD rule touched.
- PR #43's diff against `main` is larger than P0 because the branch was cut from `ticket/081-puzzles-on-the-city` at 3f68b10, which is not on `main`. That commit brings in:
  - the architect's ticket re-cut;
  - `reviews/081-K2d2-roof-jobs.md`;
  - the type-only `CityPuzzleView` in `src/core/citycircuit.ts`.

  These are the architect's and the main session's work, not the builder's, and the builder's own commit stays inside P0's files. Merging #43 still lands them on `main` before E2 uses `CityPuzzleView`, which does no harm (one unused exported interface). The main session should know the PR carries them.
- The P0 branch's copy of the ticket predates c0cb55e (the full-3D re-cut). P0's text is the same in both. The note already quotes the full-3D answer, so nothing on this branch disagrees with it.

## Must fix
none

## Could improve
1. `puzzles/city/city-two-ways-round.md`'s last paragraph of the read ("the break icon sits at the line's midpoint, but the cut span is at one end of each line ... about 30 m apart") is a useful watch item for Josh's play. It belongs to K3/E2's drawing, so consider repeating it in K3's report so it isn't only in a puzzle note.
