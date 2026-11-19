# 064 · The tile-city lattice: rows cut in 5.0 m bays on a 5.0 m band, columns on their bodies, no passages

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open. Cut from 063 section I on 19 Nov 2026, re-cut on `docs/city-grammar.md` (rules 1 and 6). It is covered by Josh's goal waiver (see Josh's words); the main session records the start.
branch: `ticket/064-lattice`

## Josh's words (19 Nov 2026, in chat)
> "the buildings are intended to be butted up against eachother. You can see this illustrated in the screenshot and you can compare to the gap in the screenshot I provided"

> "This doesn't mean the buildings need to be the same height. They can have gaps but those caps must be intentional (alley ways... etc)"

> On the grammar's Q4 (retire the gated passage) he gave no answer of his own. It takes the recommendation under his goal waiver: "I don't want to constantly approve all of these improvments."

Law that holds: chapter 2, Decided (041): no building model is ever shrunk or grown. 19.1, Decided: "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."

## What the code does today (`goal/city-style` at `ab09d01`)
- **Rows.** The tile city lays its rows with `terraceBlockRows` (town.ts), whose bays are `TERRACE_BAY_M` (5.2 m) and band `TERRACE_DEPTH_M` (6 m), both hard-coded. `tilecity.ts` reads `TERRACE_DEPTH_M` for its band (`bandW`, about line 963).
- **Columns.** `stacks.ts` makes a column as wide as its floor piece's bounds (`w = floorMid.w`), and checks depth against `spec.depth` from bounds (`depthOf`). `terrace.ts` lays blocks flush by `Stack.width_m` and measures far gaps from bounds (`overhang`).
- **Gaps and passages.** Every piece's wall body is 5.00 by 5.00 m, and its trim reaches 0.05 to 0.14 m past the sides (grammar appendix A). So neighbouring walls stand 0.09 to 0.28 m apart at every joint, and 50 of the default city's 52 rows end in a gated passage.
- **The re-assembly.** `bandPacked` (models3d.ts, 062 B) re-assembles with `depth: TERRACE_DEPTH_M` hard-coded.

## Goal
On the tile city:
- every building column stands on one 5 m cell with its four wall planes on the cell's edges;
- neighbouring walls touch;
- every row closes exactly, with no seam, overshoot, gated passage or sliver.

The ladder maps are unchanged.

## Checks this ticket builds (grammar)
- **M1, lattice fit**, in full.
- **M5's passage line:** `TileCity.passages` is empty on the tile city. The rest of M5 is 065.

## Acceptance criteria
**CI-safe:** typed-in fixtures; GLB reads only inside `it.skipIf(!have)`, lazily; no Windows paths; no timer under 1 s.

1. [ ] **Row options in town.ts.** `TerraceRowOpts` gains `bay_m` and `depth_m`, defaulting to `TERRACE_BAY_M` and `TERRACE_DEPTH_M`.
   - `townpin.test.ts` passes untouched, because the defaults are today's values.
   - `tilecity.ts` passes 5.0 and 5.0, and reads its band depth from the same value, not `TERRACE_DEPTH_M`.
2. [ ] **Columns on bodies.**
   - **The option.** `assembleStack(..., { columns: "body" })` (stacks.ts; the default is "bounds") makes each column as wide as its floor piece's body (E2's `BODY_M`). `Stack.width_m` is the bodies' total, and `depthOf` measures the body's depth when the option is on.
   - **Trim.** Trim may reach past the body by what the piece carries, up to `OVERLAP_MAX_M`.
   - **Nothing is scaled.**
   - **Shop_04.** Its 0.27 m deeper back (grammar rule 1, Open) is allowed: a base piece may stand deeper at the back. The builder confirms it from `BODY_M`.
3. [ ] **The packer on bodies.** `terrace.ts` lays blocks by body widths and measures every gap from wall planes, never trim. With 5.0 m bays and bodies, every run between corners and openings is a whole number of columns.
   - On the tile city the far end never needs a seam, overshoot or passage. A run that does not close is reported as a failure, never hidden.
   - The ladder's packing is unchanged (`packpin.test.ts` untouched).
4. [ ] **The re-assembly agrees.** `bandPacked` passes the run's own band depth and the `columns` option to its re-assembly, instead of `TERRACE_DEPTH_M`. A banded fixture keeps its columns and widths.
5. [ ] **M1** (new `latticeFit(city, packed)` in `src/render3d/lattice.ts`, pure).
   - It runs on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4.
   - Every column's four body planes lie on its cell's edges within `WALL_JOINT_TOL_M` (0.02 m).
   - Neighbours of different heights pass; heights are free.
   - **Failing fixture:** today's bounds packing. A three-column `Apartment_02` building is 15.51 m wide, so its walls stand 0.17 m off its neighbours'.
6. [ ] **No passages.** On the same cities, `tilePassages` finds none, so `TileCity.passages` is empty.
   - G2 passes with its code and numbers unchanged: each side is covered by walls and recorded openings only.
   - **Failing fixture:** a run with one column removed leaves a 5 m stretch that is neither wall nor a recorded opening, and the check names it. An opening has to be laid to count.
7. [ ] **Units follow the cells.** The layout's units are counted from the 5.0 m bays (18.2 said 5.2 m).
   - P1 to P6, G1, G3, G4, V1 to V4, R1 at `TILE_CITY_R1_MIN`, R2 to R13 and the tile floors hold, with no threshold changed.
   - The builder reports R1 and the parking numbers before and after. R1 should rise as the passages go.
   - If any check cannot hold, the builder stops and reports.
8. [ ] **Sills, escapes and footprint.** The sill checks (062), `escapeCheck` and E2's `STOREY_ALIGN_TOL_M` check hold.
9. [ ] **Guide.**
   - 16.2 and 19.2 gain the lattice rule.
   - 19.2's far-end order (seam, overshoot, passage) is marked as the ladder's only. The tile city's passage, `PASSAGE_W_M`, `END_OVERLAP_MAX_M` and the gate constants retire there, with a Numbers row note.
   - Josh's words above, and the waiver for Q4, are recorded.
   - The drift checks cover the new constants, and no existing check is edited.
10. [ ] (Main session, screenshots, street camera, `&light=day`) along a mixed row, no ground shows between buildings, and no gate stands at a row end. Compare with Josh's reference.
11. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) `npm run gate` green with a larger test count, `npm run playtest` with no snapshot change, the diff only in Files, and `git ls-files assets/private` empty.

## Files
- **The code:**
  - `src/render3d/town.ts`: authorised exception, the `bay_m` and `depth_m` options only, defaults today's;
  - `src/render3d/terrace.ts`: authorised exception, block widths and gap measure on bodies only;
  - `src/render3d/stacks.ts`: the `columns` option and body depth;
  - `src/render3d/models3d.ts`: passing the option, and `bandPacked`'s depth;
  - `src/render3d/tilecity.ts`: passing 5.0 and 5.0, band depth, units.
- **New:** `src/render3d/lattice.ts` and `lattice.test.ts`.
- **Tests, re-measured numbers only** (never a threshold): `stacks.test.ts`, `terrace.test.ts`, `terracepack.test.ts`, `tilecity.test.ts`, `frontage.test.ts`, `alleys.test.ts`, `parkmetrics.test.ts`, `sills.test.ts`, `tileintegrate.test.ts`.
- **The guide:** `docs/city-style-guide.md` (16.2, 19.2, Numbers).
- **Must not touch:**
  - `citymetrics.ts`, `parkmetrics.ts`, `frontage.ts` (read, not edited), `sills.ts`, `escapes.ts`, `dressing.ts`;
  - `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`, `docs/city-grammar.md`.

## Dependencies
- **Needs:** 063 E1 and E2 merged (`BODY_M`, the corner turn), and 063 B merged (no avenues, so the row lengths are final).
- **Before:** 065, which lays ring 2 on this ticket's cells.
- **Shared files:** `stacks.ts` and `models3d.ts` with 063 E2 and with 065 to 067. The main session merges one at a time.
- No `src/core/` change, no new dependency.

## Interfaces
All in `src/render3d/`; the builder may rename any of them.
- `town.ts`: `TerraceRowOpts.bay_m?: number` and `TerraceRowOpts.depth_m?: number`.
- `stacks.ts`: `AssembleOptions.columns?: "bounds" | "body"`.
- `lattice.ts`: `latticeFit(city, packed): readonly { run: string; column: number; plane: "front" | "back" | "-x" | "+x"; off_m: number }[]` (empty when M1 holds).
- `WALL_JOINT_TOL_M = 0.02`.

## Open items
- Whether neighbouring trims that now overlap shimmer is for the screenshot (grammar rule 2, Not verified).
- The ladder keeps bounds packing. Making the lattice the ladder's default too is a later ticket.
