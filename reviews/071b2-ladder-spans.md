ticket: 071b2-ladder-spans
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A follow-up to 071 section B. The kit test "every ladder span, at LADDER_LINE_SCALE, is one piece stretched 0.29x to 0.88x and never chains" read every `puzzles/*.json`. It went red on `goal/city-style` once K1 added `puzzles/city-two-ways-round.json`, an off-ladder city map whose `pos` is metres / 5, because its shortest span came out at 0.2481x, under `LINE_STRETCH_MIN` 0.25. The fix should make the test check what its name says, the ladder, and must not loosen the bounds.

## Does the branch do it?
- **The change.** `src/render3d/powerkit.test.ts` line 363 swaps the filter `n.endsWith(".json")` for `/^\d\d-.*\.json$/`, and a comment gives the reason. 3fe4aeb wrote the regex without its escapes (`/^dd-.*.json$/`), which would have matched nothing. 73a3123 fixes that, and `expect(spans).toBeGreaterThan(1000)` would have caught it. No other file changes.
- **Narrowing or loosening?** It narrows the test to its stated intent and loosens nothing. Every bound is unchanged: one piece per span, `lo >= LINE_STRETCH_MIN`, `lo > 0.28`, `hi < 0.9`, `LADDER_LINE_SCALE === 0.254`, and more than 1000 spans. The 0.29x to 0.88x figures in the name were always measured on the ladder, at ladder units with `LADDER_LINE_SCALE`. A city map in metres / 5 is a different unit system, so its spans were never part of that claim. The filter is the same one the playtest harness uses to say what the ladder is (`tests/playtest/ladder.ts` lines 11 to 14), so "ladder" has one definition across the repo. The new filter also drops `lamp-row.grid.json` (a street, not a map). The old filter read it, but it is not a ladder map either, so dropping it is correct.
- **Run.** `npx vitest run src/render3d/powerkit.test.ts`: 40 of 40 pass. I did not run the full suite or typecheck, as asked. The diff is one line in a test file.
- **Did the city map show a real fault?** No. In the failing run, the per-span `toHaveLength(1)` inside the loop passed for the city map, so none of its spans chained. The only failure was the `lo` floor. `powerkit.ts` line 144 says the floor "is not enforced: a shorter span is still one piece", and `fitLine` follows that. In the ladder 3D view (`main.ts` globs every puzzle, so the city map can be opened there), a 0.2481x span draws as one compressed piece. That is 0.002 under a soft floor and nothing a player would see.

## Rule conflicts and risks
- None found. The change is test-only and inside `src/render3d/`. It adds no dependency, and it does not touch `src/grid/`, `src/night/` or `puzzles/locked/`.
- Risk, noted only: the city map's spans now have no check on stretch or chaining. That is a coverage gap, not a fault in this branch. The right scale to check them at is the city's own `WORLD_PER_METRE`, true size, which is K3's job (071 ticket, "K3 (renderer)"). Checking them at the ladder's scale would test a view the city map is not made for.

## Must fix
none

## Could improve
1. When K3 lands, give it the city map's twin of this test: every span of `city-two-ways-round.json` (and any later `city-*.json`), fitted at `WORLD_PER_METRE` with true-size strands, is one piece within `LINE_STRETCH_MIN` to `LINE_STRETCH_MAX`. 071's own figures predict 0.93x along a 12.5 m pavement span and 1.22x on a 16.5 m crossing. That belongs in K3's ticket, not here.
2. Optional, here: one more line in this test, or a sibling test, asserting that every non-ladder `*.json` map still fits as one piece at `LADDER_LINE_SCALE` (`toHaveLength(1)`) with no stretch bound. The ladder 3D view can open the city map, and this would keep the "never chains" guard on it there without forcing the ladder's floor on it.
