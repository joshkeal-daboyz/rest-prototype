ticket: 084-a2-goal-names
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A2 of ticket 084: the HUD's "Priests want lit" list names each target by A1's generic name ("Building 1: dark") instead of the lamp id. The names are built once per open from the city file in `main.ts` and passed through a new optional `UIDeps.names`. Clicking a row or pressing Enter on it still centres the camera on that building.

## Does the branch do it?
The diff against `origin/main` (4b50bf2, A1 merged) touches four files, all on the ticket's list: `src/ui/logic.ts`, `src/ui/logic.test.ts`, `src/ui/index.ts`, `src/main.ts`.

- **Criterion 1, `targetRows` takes the names: met.**
  - `targetRows(targets, lit, brownout, names?)` in `src/ui/logic.ts` writes `${names?.get(id) ?? placeName(id)}: lit|dark`, as specified. The parameter is optional, so the two other `targetRows` cases compile unedited and still cover the `placeName` fallback ("shrine: lit", "far lamp: dark").
  - `UIDeps.names?: ReadonlyMap<string, string>` is added in `src/ui/index.ts` with a doc comment, and the render loop passes `deps.names`.
  - `src/main.ts` calls `buildingNames(entry.city.target, entry.city.priority, <lamp node ids in nodes order>)` once per open, before `mountUI`, and passes `names`. Only file lamps are passed, so the conversion's hidden scenery lamps get no name, as A1's rule says.
  - `onShow` and `centreOn` are untouched and still keyed by lamp id (the row's `id` is unchanged, and the rewritten test asserts it), so click and Enter still centre the building.
  - The one rewritten case, "reads each target as its generic building name when one is given (084 A2)", passes a names map and expects "Building 1: dark" and "Building 2: lit". It also checks the ids. It would fail if the names were ignored. That is 1 rewritten, 0 added, which matches the ticket's count.
  - `npx vitest run --maxWorkers=2 src/ui/logic.test.ts`: 44 passed.
- **Criterion 2, it reads right on the city (browser): Josh's to see.** From the files, it should hold:
  - `s06-behind-the-fuse` has `target: ["bath_house"]`, so the bath house is Building 1 and the list reads "Building 1: dark".
  - `s23-the-priests-list` has `target: ["shrine","infirmary","granary","bath_house"]`. The grid keeps `puzzle.target` in order (`src/grid/grid.ts:67`, via `convert.ts:96`), so the rows read Building 1 to 4 in target order.
  - All 25 series files have a non-empty `target`.

## Rule conflicts and risks
- None found.
- Nothing in `src/grid/`, `src/night/`, `src/core/`, `src/render3d/` or `src/play/` is touched.
- No new dependency.
- No GDD rule is touched: names are words only, and no id, check block or fault changes.

## Must fix
none

## Could improve
none. The list is the only place a building name shows today: the hover prompt says only "Lv1 Lamp" and the overlay draws no names (ticket, *What exists*). So the branch leaves no id-style name behind.
