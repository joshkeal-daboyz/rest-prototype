ticket: 084-a3-p0-fixture
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Copy P0 (`city-two-ways-round`, its city file and note) and the 12 schematic panels the M sections' tests still read into a new `puzzles/fixtures/` folder, byte for byte, with a one-paragraph README. No code changes, and nothing that lists puzzles may reach the folder.

## Does the branch do it?
The diff against `origin/main` (4b50bf2) is 27 files, all new, all under `puzzles/fixtures/`. No code, no tests, nothing in `puzzles/city/` or `puzzles/locked/`.

- **Criterion 1 (P0 copied, README).** I ran `cmp` on every fixture against its original and all 26 are identical: `city-two-ways-round.city.json` matches `puzzles/city/city-two-ways-round.city.json`, and `city-two-ways-round.city.md` matches `puzzles/city/city-two-ways-round.md`. The originals are still in place. `README.md` says test fixtures only, never a stage or a Map menu entry, not swept by `npm run check`, the fit sweep or the playtest harness, and why P0 is here (084 A). It also lists who reads each file, which criterion 3 asks for. Met.
- **Criterion 3 (schematic fixtures).** `06`, `09`, `10`, `11`, `12`, `16`, `20`, `21`, `49`, `61`, `city-two-ways-round` (`.json` + `.md`) and `lamp-row.grid.json` + `lamp-row.md` are all present, and `cmp` matches each against `puzzles/<file>`. Nothing extra was copied. Met.
- **Criterion 2 (nothing lists it).** I checked each sweep's path and glob:
  - `src/main.ts:37`: `import.meta.glob("../puzzles/city/**/*.city.json")`. This is rooted at `puzzles/city/`, so it cannot reach `puzzles/fixtures/`. (`src/render3d/title3d.ts:435` globs one named file under `puzzles/city/`.)
  - `cityPuzzlesWithBlocks` (`tools/check.ts:94`): a flat `readdirSync(join(PUZZLES_DIR, "city"))`.
  - The fit sweep (`tools/fit.test.ts:253`): a flat `readdirSync(join(PUZZLES_DIR, "city"))`.
  - `cityIds` (`tests/playtest/ladder.ts:14`): a flat `readdirSync(CITY_DIR)`, where `CITY_DIR` is `puzzles/city`.
  - `puzzlesWithBlocks` (`tools/check.ts:80`): reads only `puzzles/` and `puzzles/locked/`, each flat, keeping `.json` entries. `fixtures` is a directory without a `.json` suffix, so it is not picked up.
  - The other sweeps are flat too: `feeds.test.ts:372` (`puzzles/`) and `analyze.test.ts:58` (`puzzles/`, `^\d\d-.*\.json$`).

  No `recursive: true` read and no `puzzles/**` glob exists in `src/`, `tools/` or `tests/`. Met.

**The `.city.md` name.** It is sound. The ticket is self-contradictory here: criterion 1 names the city note `city-two-ways-round.md`, but criterion 3 puts the schematic's note at that same path. Since both must be byte copies, one of them has to take another name, and the schematic note is the one `convert.test.ts:117` reads by its exact name. I checked what this means for the readers once A5 and M2 change their paths:
- `noteFor` (`tools/check.ts:28`) and `fit.test.ts:230` both derive the note as `x.city.json` → `x.md`. In `puzzles/fixtures/` that resolves to the schematic note, not `.city.md`.
- That is harmless: the two notes' ```` ```check ```` blocks are identical (I diffed them, lines 106-117 vs 111-122, no difference). So `check.test.ts`'s criterion 6 case and `fit.test.ts`'s note comparison will replay the same block.
- No reader derives or names `.city.md`, so the file is kept as the city puzzle's design record only.

**Tests.** The branch adds and changes no test file, so there was nothing of its own to run (0 cases, under the cap).

## Rule conflicts and risks
- None found. There is no code, no dependency, no `puzzles/locked/` or `puzzles/city/` edit, and no GDD rule is touched.
- Risk for A5, not this branch: `tools/check.test.ts:255` asserts `expect(cityPuzzlesWithBlocks()).toContain(p0)`. Once A5 points `p0` at `puzzles/fixtures/`, that assertion fails, precisely because criterion 2 holds. A5's "only the path changes" cannot hold for that line as written. A5 needs a re-cut, or a ruling that the line changes.

## Must fix
none

## Could improve
1. `puzzles/fixtures/README.md`: add one clause saying that the tools' `noteFor` (and `fit.test.ts`) read `city-two-ways-round.md` beside the `.city.json`, and that its check block is identical to `.city.md`'s. That way the next editor knows that a change to either note's block must be made in both.
2. Tell the lead-architect about the A5 risk above (`check.test.ts:255`) before A5 is built, so the builder doesn't stop on it.
