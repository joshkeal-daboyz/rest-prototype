ticket: 081a2a-kit-units
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section A2a: move the shared kit's constants and types out of the ladder files (`town.ts`, `terrace.ts`, `scene.ts`, `layout.ts`, `streetcam.ts`) into a new pure `src/render3d/kitunits.ts`, with values unchanged and no re-exports. Every importer reads from there. Test files change only their import lines, except the five pins on where a name lives. The Numbers table names `kitunits.ts` for the moved rows. Nothing Josh can see changes.

## Does the branch do it?
Reviewed `git diff origin/main...ticket/081a2a-kit-units` (HEAD 777a3fa, merge base 14c8a4e). Typecheck is clean. `vitest run --changed origin/main --maxWorkers=2`: 56 files, 1423 tests, all pass.

1. **Moved, values unchanged, one definition, no re-exports.** Met. `kitunits.ts` holds every listed name: the town constants and the types `Lot`, `LotSpec`, `LotType`, `Pt`, `OpenLot`, `TerraceRun`; `ALLEY_MIN_M`, `ALLEY_MAX_M` and `alignOf`; `GROUND`, `YARD`, `YARD_H`, `PAVEMENT_Y`; `POLE_HEIGHT` and `Vec3`; and the four `STREET_CAM_*`. It also holds the extra names the move needed: `CornerSide` (inside `Lot`), `TERRACE_SEAM_M` (read by `citymetrics.ts`), `WIRE_PICK_RADIUS` (read by the kept `pick.ts`), and `STREET`, `PAVEMENT`, `KERB` (read by the kept `tilecity3d.ts`). I compared each moved line in the diff with the line it replaced: same values, same doc comments. No ladder file re-exports a moved name. Each moved name now has one definition in the five ladder files and `kitunits.ts`. `ModelSlots` and `SceneBundle` stayed in `scene.ts`. The ticket allowed that ("if models3d.ts's kept half still needs them"), and they are used only by `furnitureInput` and `applyModels`, which criterion 6 already lists as unreached.
2. **Import lines only in the test files.** Met, apart from the case edits listed under criterion 4. I read every test hunk. The only other edits are import lines (`dressing`, `escapes`, `facade`, `facing`, `furniture`, `gallery`, `layout`, `polygon`, `sills`, `stacktown`, `terrace`, `town` and the others). `WALL_MIN_AREA_M2` and `DOOR_MIN_AREA_M2` look removed in the diff stat, but they are still there: those import blocks were folded onto one line.
3. **Every other test passes unedited.** Passes (see the gate run above). Some cases were edited beyond the five named; see criterion 4.
4. **The location pins follow the move and keep their strength.** Met in substance:
   - `models.test.ts`: the allow-list gains `./kitunits`, as the ticket says.
   - `powerkit.test.ts`: `./layout` becomes `./kitunits` in the list and in the `{ Vec3 }` check. Still an exact-equality pin.
   - `styleguide.test.ts`: `REQUIRED` maps each moved name's old `@town.ts`, `@layout.ts`, `@terrace.ts` or `@scene.ts` key to `@kitunits.ts`, so `POLE_HEIGHT@kitunits.ts` is required again. `kitunits.ts` is added to `MODULES`. In the "every numeric export" case, the moved names are still counted: the filter on `kitunits.ts` admits `TERRACE_|PARKING_|PLAZA_|ALLEY_|STREET_CAM_`. That is 11 constants: `TERRACE_DEPTH_M`, `PARKING_W_M`, `PARKING_D_M`, `PLAZA_W_M`, `TERRACE_SEAM_M`, `ALLEY_MIN_M`, `ALLEY_MAX_M` and the four `STREET_CAM_*`. Exactly 11 left the counted sets in `town.ts`, `terrace.ts` and `streetcam.ts`, so the count is the same as before the move, and the `> 80` floor is not lowered.
   - **More cases changed than the ticket names.** In `styleguide.test.ts` five case bodies changed, not three: "covers every lot type" (`town.` becomes `kit.LOT_TYPE_NAMES`), "one scale", the pole-wood contrast case (`scene.STREET` becomes `kit.STREET`), "every numeric export" and "pins CITY_CHECK". The `REQUIRED` rewrite is at `describe` level. `streetcam.test.ts`'s import allow-list case also gains `./kitunits`. The ticket's list missed that pin: the moved `STREET_CAM_*` must now be imported into `streetcam.ts`, so the case cannot pass unedited. Each edit only changes a module reference, and each is forced by the move, because those names no longer exist on `town`, `scene` or `streetcam`. By my count that is about 8 rewritten cases and 0 added, under the policy's 15. Counting `it(` in the added lines gives 3, the renamed titles.
5. **Numbers table.** Met. In `docs/city-style/numbers.md`, only the File column of the moved rows changes to `kitunits.ts`. Values and other rows are untouched. The `styleguide.test.ts` cases read it and pass.
6. **The report.** I don't have the builder's report. The ticket records the reach findings at a8596fe. The code agrees with them: the only kept-file imports left from ladder files are `models3d.ts` (`ModelSlots`, `SceneBundle`, `packTown`, `PackedBlock`, `PackResult`) and `citymetrics.ts` (`PackResult`, `PackedBlock`), all for the ladder-only functions. `renderer.ts`, the router, still imports `buildScene`, `streetcam` and `townLayout`. That is A2c's work.
7. **`kitunits.ts` is pure.** Met. Its only import is `import type { StackAlign } from "./stacks"`, which is erased at compile time. There is no three and no DOM.

## Rule conflicts and risks
- None of the hard rules is touched: no change to `src/grid/`, `src/night/`, `src/core/` or `src/city/`, no new dependency, and nothing in `puzzles/`.
- Formatting churn. Many multi-line import blocks whose names did not change were folded onto one long line with a trailing `, }`. Examples: the `three` imports in `gallery.ts`, `plan3d.ts`, `scene.ts` and `tilecity3d.ts`, the `./models` and `./tileslots` imports, and several test files. Behaviour is the same, but the diff is larger and harder to read than the move needs. Removed lines are inflated (877).
- `WORLD_PER_METRE` is still defined twice, in `kitunits.ts` and `models.ts`. This was already so on main (`town.ts` and `models.ts`), and the "one scale" case keeps the two equal. Read literally, criterion 1 ("No name is defined in two places") is not met for this one name. The ticket's intent (no ladder re-export, no copy between a ladder file and `kitunits.ts`) is met. I put it under Could improve rather than as a blocker.
- Several files import twice from `./kitunits` (`scene.ts`, `terrace.ts`, `streetcam.ts`, `town.ts`). This is harmless, and the ladder files go in A2c.
- This branch is one merge behind `origin/main`: PR #28 changed pipeline docs only and touches none of these files. The ticket file diff on this branch is the architect's re-cut, not the builder's work.

## Must fix
none

## Could improve
1. Undo the folding of untouched multi-line imports in `gallery.ts`, `models3d.ts`, `plan3d.ts`, `scene.ts`, `tilecity3d.ts` and the test files. Only the lines that change a source module need to change.
2. Have `models.ts` import `WORLD_PER_METRE` from `kitunits.ts` instead of defining its own copy. The scale would then be defined once, and the "one scale" case could go, here or in A2c. That case's title still says "town.ts and models.ts".
3. The builder's report (or the main session's note to Josh) should list `streetcam.test.ts`'s allow-list case and the two extra `styleguide.test.ts` cases as rewritten, so the count of about 8 rewritten cases matches the ticket's record.
4. `models.test.ts`'s allow-list still admits `./layout` and `./town`, though `models.ts` no longer imports either. Dropping them would make the pin stricter. The ticket said only "gains `./kitunits`", so this is optional.
