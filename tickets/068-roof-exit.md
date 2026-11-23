# 068 · The roof exit opens onto the roof, on a blind or court-side column where it can

**Superseded by ticket 070** (`tickets/070-city-pipeline.md`) on Josh's approval of 070 (19 Nov 2026, in chat). Not to be built as written. Where its content went (070's "What happens to the other tickets"): the roof exit to 070 H3.

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: superseded by 070 (Josh's approval of 070, 19 Nov 2026). Was: open. Moved from 063 section G on 19 Nov 2026, with the grammar's rule 11 added. It is covered by Josh's goal waiver; the main session records the start.
branch: `ticket/068-roof-exit`

## Josh's words (19 Nov 2026, in chat)
> "roof top exists shouldn't open to the street. They should be on the roof."

## What the code does today
- **The piece.** `SM_Bld_Roof_Access_01` (2.76 x 2.74 x 2.85 m), `ROOF_ACCESS` in `dressing.ts`, is one of the "big roof props" (at most one per block, `P_ROOF_LARGE`).
- **Where it goes.** `onRoof(ROOF_ACCESS, …, "front", …)` sets its front edge on the roof cell's front (`ROOF_EDGE_M`, 0.3 m in), with its door side, "+z" by default, toward the street. So the door opens over the façade with no deck in front of it.
- **What the model does not settle.** The face areas (−z 5.9 m², +z 7.0 m²) do not tell which face is the door. Josh's screenshot fits "+z".

## Goal
Every roof exit stands wholly on its roof. Its door faces away from every open side of its column, with clear deck in front. Where its building has a blind or court-side column, it stands there (grammar rule 11).

## Checks this ticket builds (grammar)
- M9's roof-exit part: 063 G's criterion 40.

## Acceptance criteria (Vitest unless marked)
**CI-safe:** typed-in fixtures; GLB reads only inside `it.skipIf(!have)`, lazily; no Windows paths.

1. [ ] **The rule** (`dressing.ts`):
   - `SM_Bld_Roof_Access_01` stands wholly inside its roof cell, at `ROOF_EDGE_M` inside the body's edge, not the cornice's.
   - Its door faces away from every open side of its column (a street, lane, drive, court, plaza or park edge). With the housing at the cell's street side, that is a half-turn.
   - A clear deck at least `ROOF_ACCESS_CLEAR_M` (1.2 m) deep, and as wide as the door, lies in front of the door inside the roof, with no other roof prop on it.
   - The column is chosen in this order: a blind column of the building, then a court-side (ring-2) column, then a mid column.
   - If no column can hold the housing and its deck, the block takes another big prop, as today when a prop does not fit.
2. [ ] **The door side.** It is `DRESS_FRONTS`'s for the key, "+z" today. The builder confirms it from the GLB in an `it.skipIf` (the recessed door face), or lists it for Josh's gallery check.
3. [ ] **The test, pure.** For every `ROOF_ACCESS` placement on the default city, seeds 1 to 10 and the three protocol maps:
   - its footprint is inside the cell;
   - the door's outward normal has a non-positive component along every open side's outward normal;
   - the deck is clear;
   - on the tile city, a blind or court-side column is used whenever its building has one.
   - **Failing fixture:** today's placement.
4. [ ] **The ladder.** This fixes the ladder maps' roof exits too: 063's Q-E default, adopted under the waiver. Only `ROOF_ACCESS` placements change, and a test diffs every dressing placement of the three protocol maps against `ab09d01`'s and finds only those. `packpin.test.ts` and `townpin.test.ts` are untouched.
5. [ ] **Guide.** 16.5 gains the rule, with Josh's words as **Decided**, and `ROOF_ACCESS_CLEAR_M` gets a Numbers row.
6. [ ] (Main session, screenshot) a roof exit on the tile city and one on `09-shrine-circuit`: the door faces the roof deck.
7. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) The gate, the playtest with no change, the diff in Files, and `git ls-files assets/private` empty.

## Files
- **The code:** `src/render3d/dressing.ts` (the access placement only).
- **Tests:** `dressing.test.ts`, `dressdraw.test.ts`.
- **The guide:** `docs/city-style-guide.md`.
- **Must not touch:** everything else, including `src/core/`, `src/grid/`, `src/night/`, `tests/`, `puzzles/`, `tools/`, `assets/`, `tickets/` and `docs/city-grammar.md`.

## Dependencies
- **Needs:** 066 merged, so blind and court-side columns exist. It shares `dressing.ts` with 066 and 067, so merges go one at a time.
- **Without 066:** 068 can be built against 063's tree alone if needed. Criterion 1's column order then falls through to a mid column.

## Interfaces
- `dressing.ts`: `ROOF_ACCESS_CLEAR_M = 1.2`.
