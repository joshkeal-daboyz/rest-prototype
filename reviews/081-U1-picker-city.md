ticket: 081-U1-picker-city
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Add a pure `collectCityMaps(files)` and a `CityMapEntry` type to `src/ui/maps.ts`. It lists only `puzzles/city/**/*.city.json` files, checked by C1's `validateCityPuzzle`. A locked copy is keyed `locked/<id>`. Bad files and repeated keys each give one problem line. Open maps come first, then locked ones, each in path order, under the file's own name. This follows the full-3D re-cut (Josh, 24 Nov 2026: "I don't want 2D puzzles anymore..."; "Hide now, delete later (Recommended)"). `collectMaps` stays untouched, and nothing opens a city entry yet (that is U2).

## Does the branch do it?
I reviewed builder commit e5ba5fc against origin/main. The ticket-file changes in the diff come from the architect's re-cut commit c0cb55e on the base branch, not from the builder.

1. **City files only: met.**
   - `CITY_PATH` (`(^|/)puzzles/city/(?:.+/)?[^/]+\.city\.json$`) picks the files, and every other path is skipped with no problem line.
   - Each file goes through `validateCityPuzzle` (imported from `../core`, from `src/core/load.ts`).
   - The entry shape matches the ticket: `{ key, id, name, locked, path, city, from? }`. `from` is added only when the file has it.
   - The key is the id, or `locked/<id>` when the path matches `puzzles/city/locked/`. This mirrors `collectMaps`.
   - Test: "lists only city files: a schematic sharing the city file's id is left out, with no problem". It passes the real `09-shrine-circuit.json` schematic next to a city file with the same id, and asserts one entry `[key, locked=false, from]` and `problems = []`. Without the path filter, that schematic would fail city validation and add a problem line, so the test does fail on a broken filter.
2. **Bad file or repeated key: met.** A failed validation pushes `path: errors.join("; ")` (C1's messages), and a repeated key pushes `path: duplicate map key <key>`. Both `continue`, so the valid entries are kept. Test: "reports a bad city file and a repeated key as one line each, and keeps the valid entries". Its bad file is `scope: "street"` and its duplicate is `c-a`. It asserts exactly two lines in path order, and only `c-a` kept.
3. **Order and name: met.**
   - The paths are sorted first, then the list is open entries followed by locked ones.
   - `name` is `city.name`, with no suffix.
   - Test: "lists open city maps first, locked ones after, each in path order, under their own names". It gives the paths out of order, with a locked one first, and asserts `01-a`, `02-b`, `locked/01-old`, with names unchanged.

**Count:** 3 cases added, 0 rewritten, as the ticket's count says. The file ran in 828 ms (8 tests: 5 old, 3 new), all passing. The test puzzle is a small in-test object, not a whole city.

**Files:** only `src/ui/maps.ts` and `src/ui/maps.test.ts`. `collectMaps` and `MapEntry` are unchanged; only the import line was widened. Nothing in `src/main.ts`, `src/render3d/` or `src/core/` was touched.

## Rule conflicts and risks
- None found. No change to `src/grid/` or `src/night/`, no new dependency, no GDD rule touched. `src/ui/` importing from `src/core/` is allowed.
- Risk for U2, not a finding: the path patterns expect Vite glob keys containing `puzzles/city/`. K2c's fixture under `src/city/circuit/fixtures/` is not listed, which is what the ticket intends, because P0 moved the playable file to `puzzles/city/`.

## Must fix
none

## Could improve
1. Criterion 1 also names street files as left out silently. The test covers only the schematic. A street-scope file outside `puzzles/city/` goes down the same skip line, so I would not add a case for it. I mention it only so the criterion's wording is not read as fully tested.
