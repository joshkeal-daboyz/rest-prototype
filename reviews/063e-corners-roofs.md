ticket: 063e-corners-roofs
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
E1: measure from the GLB which side of each corner piece is its second street face, pin it (`OPEN_SIDE_MEASURED`), and have `BUILDING_FRONTS`, the recipes, `WALL_SIDE_M` and `wallOffset` use it. Then show that every corner column (tile city, seeds, the three protocol maps) has its front on the row's street, its open face on the cross street and its chamfer toward the junction. Re-pin the ladder and list every field that moved. E2: measure every stack piece's body (`BODY_M`), seat each column's pieces on the floor piece's body (tile city only), and check with `STOREY_ALIGN_TOL_M` that the storeys and the roof line up. Roof mismatches are reported, not re-paired.

## Round history
- **Round 1** (at 99efe18): partly, must-fix 1. The criterion 25 corner-turn and chamfer check did not run on the three protocol maps. There were four could-improves: (1) pass `footprint` outright from `cityApplyOptions`; (2) no blind band between `STOREY_ALIGN_TOL_M` and `BODY_REPORT_M`; (3) dressing checks on seated blocks; (4) name the `Roof_Corner_02`/`_03` swap.
- **Round 2** (at 9987f89): this review. The fix commit only adds to round 1's work. The rest of the diff (`git diff goal/city-style...ticket/063e-corners-roofs`, 11 files) is what round 1 reviewed. I re-read it against the criteria and the hard rules below.

## Does the branch do it?
I ran these one at a time in `D:\rest-prototype-063e` at 9987f89, which has the GLB:
- `packpin.test.ts`: 21 passed.
- `stacks.test.ts`: 41 passed.

The main session's gate is green (2667 passed, 20 skipped).

**Round-1 must-fix 1: fixed.** `packpin.test.ts` has a new describe, "every corner column of the three protocol maps turns the corner (063 E1, criterion 25)". For each of `01-first-light`, `09-shrine-circuit` and `64-the-whole-chain`, `turns()` does the following on every corner-column piece:
- It reads the piece's open face from `OPEN_SIDE_MEASURED`, not from the table the packing used.
- It rotates the front (+z) and the open face by the piece's yaw. It requires one of them to point at the road (+z) and the other at the column's corner side.
- It checks that `Shop_Corner_02`'s chamfer normal, the model's -x+z diagonal, has its x sign on the corner side and z > 0.5.
- It asserts that more than 20 corner pieces were checked per map. One test asserts that the chamfer check found the piece at least once.
- With `packOf(file, undefined, true)` (the old "+x" packing), it asserts that every corner piece and every chamfer fails.

That is the criterion checked directly, with the fixture failing it.

The check accepts "front on road, open face on cross street" or the reverse. I accept that because a turn cannot mirror a piece. At the +x end, a "-x"-open piece must turn its front onto the cross street and its open face onto the road. The chamfer test pins the side that matters, the diagonal toward the junction, either way.

**E1**
- **Criterion 23, met.** `measureOpenSide` uses a cumulative area-by-depth profile for each side, compared with the front's. Its margin is `OPEN_MARGIN`, and it gives null for mid pieces. The results are pinned in `OPEN_SIDE_MEASURED` with reasons. The GLB re-measure covers every corner piece of `STACK_STYLES`, and there are synthetic tests for -x, +x, null, an index list and a translated mesh. This is an equivalent reading of "062 A's recessed-face method", as round 1 noted.
- **Criterion 24, met.** `BUILDING_FRONTS` and the recipes read the measured side, and a test holds them together. `WALL_SIDE_M` is re-measured on -x within 0.02 m. `wallOffset` compares with the measured side, and a side saved in the gallery still wins, with tests.
- **Criterion 25, met.**
  - Default city and seeds 1 to 10: `stacks.test.ts`, "the angled face is on the corner".
  - The three protocol maps: the new `packpin.test.ts` block above.
  - Glass and the L awning follow `bay.b.yaw` in the existing `dressing.ts`, so no dressing change was needed.
  - The "+x" fixture fails on both the city and the maps.
- **Criterion 26, met in substance.** The digests are re-pinned in the same commit, and `townpin.test.ts` is untouched. The changed-field test is a full tree diff. It lets corner pieces' x, z, yaw, street, w and d change, and lets the neighbouring pieces and the block fields move by at most 0.02 m (0.013 m measured). This is wider than the ticket's "only yaw, x and z", but the turn forces it and the test names and bounds it. See risks.
- **Guide, met.** Chapter 7's E1 lines are Decided with Josh's words. 19.1 is corrected, and Numbers rows are added.

**E2**
- **Criterion 28, met.** `BODY_M` covers 33 of 34 keys. The Octagon roof is the only key missing, and a test asserts that. Every face is re-measured within 0.02 m from the GLB. Roofs use `measureRoofBase` (grammar rule 11) rather than "the parapet's outer faces". That is the better reading, and the synthetic tests show why.
- **Criterion 29, met.**
  - `footprint` is off by default and ignored on a back-aligned stack.
  - `seatOnBody` follows the rule:
    - the front wall line is unchanged;
    - mid columns are centred;
    - corner columns have the outer flank on the footprint's;
    - a roof's back sits on the floor body's back;
    - a base may only be deeper.
  - New since round 1: `cityApplyOptions` passes `footprint: "body"` outright, and a test in `stacks.test.ts` asserts that.
- **Criterion 30, met as read.**
  - `storeyAlignment` holds within 0.03 m:
    - each piece's reference plane;
    - a floor's two side planes;
    - the floor and roof backs;
    - that no base is shallower.
  - The sweep covers the default city, seeds 1 to 10 and 6 x 4 seeds 1 to 3, with 0 misfits on seated blocks and many on raw packing.
  - The red-building fixture is named.
  - New since round 1: the planes between the tolerance and `BODY_REPORT_M` are returned as `slight`, so there is no blind band. The test pins today's 13 entries, and each lies in (0.03, 0.1]. They are roof feet at 0.078 m, corner-roof party flanks at 0.046 to 0.078 m and the turned `Shop_Corner_01`'s flank at 0.072 m. The test checks that no plane is in both lists, and that `misfits` stays empty.
- **Criterion 31, met.** Overhangs over 0.1 m are reported, and a test pins them. The guide lists them, and nothing is re-paired. New: a guide Info line names the possible cross-pairing of `Roof_Corner_02` and `_03` for Josh (round-1 could-improve 4).
- **Criterion 32, met.** E2 does not change `packpin.test.ts`'s pins. The new block only adds checks. The footprint has no effect on back-aligned runs, and G1, sills and escapes pass in the gate.

## Rule conflicts and risks
- **Hard rules.** `src/grid/`, `src/night/`, `src/core/`, `terrace.ts`, `dressing.ts`, `tests/`, `puzzles/` and `package.json` are untouched, and there is no new dependency. The fix commit only adds assertions, and no threshold moved. The tests are CI-safe: the GLB is read lazily in `it.skipIf`, the paths are portable, and there are no tight timers. The new packpin and alignment tests need no assets.
- **`tilecity3d.ts` is outside E's Files list.** The E1 list is `facade.ts`, `models.ts`, `stacks.ts` and their tests. The E2 list is `facade.ts`, `stacks.ts`, `models3d.ts`, `facade.test.ts`, `stacks.test.ts` and `tilecity.test.ts`. The fix adds one option, `footprint: "body"`, to `cityApplyOptions` in `tilecity3d.ts`, and `stacks.test.ts` now imports `cityApplyOptions`.
  - This came from my round-1 could-improve 1. I said there that the file had to be named first, so the builder went one step past what I wrote.
  - It is the same folder, and the file is named for sections C2, D, F and H, not under "must not touch". The change is behaviour-neutral, because `bandPacked` already defaulted to "body" on wall-aligned runs. Criterion 29 also says "the tile city passes it".
  - I do not block on it. The main session should name it to Josh as a Files deviation, or revert those two hunks; criterion 29 still holds through the default if they go.
- **Criterion 26's "only" is wider than its wording** (carried from round 1). Corner pieces' w, d and street change. Neighbours and the block's lot, width, columns, depth and far gap move by at most 0.013 m. The turn forces this, and the test names and bounds it. Name it to Josh.
- **Corner shop flank steps back 0.02 to 0.13 m from the cross street until section I** (carried from round 1). This conflicts with 19.1's recess law. It is now written in the guide as an Info line, and G2 tolerates it. Name it before the criterion 27 screenshots.
- **Guide slips in the new 16.3 lines.**
  - The step-back Info line says "Ticket 064 section I". It should be ticket 063 section I.
  - The sentence "It does not re-pair roofs across styles ..." moved from the Default bullet to the end of that step-back Info line, where it has nothing to do with the flank. The roof Info line above it already says the same thing.

## Must fix
none

## Could improve
1. `docs/city-style-guide.md` 16.3, the "Info (063 E2, until section I)" bullet: change "Ticket 064 section I" to "section I" (of this ticket, 063). Drop the trailing "It does not re-pair roofs across styles ..." sentence. It belongs to the roof-pairing line and is already said there.
2. The `tilecity3d.ts` hunk and the `cityApplyOptions` test: either have the main session name it to Josh as outside E's Files, or revert it and let it ride with section I, whose files include the city plumbing. The behaviour is identical either way.
3. (Carried, optional.) Run `dressing.test.ts`'s front-face checks (inside the column, the wrap pane on its host) on seated blocks too. E2 moves corner bases in x, and the dressing sweep still uses unseated stacks.
