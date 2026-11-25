ticket: 081-P1-fit-tool
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A `tools/` fit tool (`npm run fit`) that embeds a schematic puzzle on 6 x 6 seed 1 in a district of 1 to 4 blocks and writes a draft `puzzles/city/<id>.city.json`, or says why it can't. Also: `npm run check` covering city puzzles, with the mid-row clearance check (B1b K2 check 11), and section S's `raiseForScenery`, which writes the raised capacities and ratings into every draft and, through `--raise`, into P0 and hand reworks.

## Does the branch do it?
**This is round 2.** Round 1 is in commit 38c59a4; no `.round1.md` copy was made, and this file replaces it. Round 1 found criteria 1 to 9 and 11 met, and criterion 10 partly met. It had 1 must-fix: `npm run fit -- --raise` raised every file from its schematic's numbers, so it would overwrite a hand rework's own capacities and ratings. The builder's fix is 8145bff, which touches only `tools/fitrun.ts` `raiseFile`. I checked that fix and nothing new.

**The fix.** `raiseFile` now uses the schematic's numbers as the base only in two cases. Either the file's numbered nodes and numbers (`numbersOf`) equal the schematic's (an unraised draft), or raising from the schematic gives exactly the file's numbers (already raised). Otherwise it raises from the file's own numbers. It prints which base it used. For a rework it also warns that running it again raises the numbers again. That is the reading round 1 asked for, and it takes the "warn" option for the second run. Both effects round 1 named are gone:
- A rework's hand-set numbers are kept as the base.
- A feed or fuse box that the rework adds and the schematic lacks now finds its own `was`. Its feed's load no longer goes into the top-level `capacity`, and the fuse box is raised.

**What I ran.** I ran `npx tsx tools/fitrun.ts --raise` on copies of P0's files in a scratch folder. The repo was not touched, and I deleted the scratch folder afterwards.
- P0 as S1 left it (`capacity 25`): "raised from city-two-ways-round's numbers", and the after-number is 25. The file is byte-identical to `HEAD`, so criterion 11 still holds through the CLI.
- P0 set back to the schematic's `capacity 3`: from the schematic's numbers, 3 to 25.
- A stand-in rework (`capacity` hand-set to 30): "raised from its own numbers", 30 to 52. Run again: 52 to 74, with the warning printed both times. The scenery load (22) is the same each time, as expected.

**Tests.** I ran `tools/fit.test.ts` and `tools/check.test.ts` with 2 workers: 33 passed, in 3.9 s and 9.9 s, the same as round 1. The test count stays at 12, which is the ticket's count.

**No test for the fix: acceptable.** `raiseFile` is CLI glue: file paths, reading the note, picking the base, writing the file, printing. The rule it applies is `raiseForScenery`, which criterion 10's fixture case and criterion 11's P0 case already hold. Criterion 10 asks for exactly 1 case, and round 1 said no new test was needed. Adding a case would cost a city build and a file write to pin one comparison of `numbersOf` keys. Under `docs/test-policy.md` that is not worth its time.

## Rule conflicts and risks
- None new. The fix is in `tools/fitrun.ts` alone. It adds no dependency and does not touch `src/grid/` or `src/night/`. Round 1's notes on the phantom target lamp, the embeddings for 09, 12 and 14 that the search passed over, and the reads of `src/city/facades/` still stand. None of them is a conflict.
- **The classification works on numbers, not structure.** A rework that keeps the schematic's numbered nodes and numbers (and changes only lines, loads or targets) is labelled "the schematic raised". That gives the same result either way, because the two bases are equal, so only the label is wrong. A rework whose hand-set numbers happen to equal the schematic's numbers plus that rework's own scenery load is taken as already raised and left unchanged. Both cases are unlikely, and the printed base shows the designer which way the tool took the file. Could improve 1.

## Must fix
none

## Could improve
1. `tools/fitrun.ts` `raiseFile`: add a `--rework` (or `--own`) flag that forces raising from the file's own numbers, for the coincidence case above. Also make the "schematic raised" label say "numbers match the schematic's", not that the file is the schematic.
2. `tools/fitrun.ts` header comment, line 3, still says `--raise` rewrites the numbers "from its schematic's numbers". Update it to the new rule.
3. Round 1's could-improve items 1 to 6 still apply, unchanged: count the embeddings the fit passed over; use a numeric timeout in the CLI case of `check.test.ts`; pin the exact "district has N" in criterion 2; drop the unused `terminals` in `shortfall`; drop the sweep's `console.log` once its time is reported; and the extra flags (`--unraised`, `--max-blocks`, `--out`), which are harmless.
