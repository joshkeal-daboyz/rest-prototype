ticket: 081k2b-circuit-places
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081, section K2b: stage 6 also lays drops (CK9), street lights (CK10) and lamp-post places (CK11), with fixture checks for each. It adds `nodePlaceProblems(layer, places)` for CK12's table (roof places wait for K2d), re-takes the stage 6 pin and the three era-pass pins, makes `keep` hold every pole and light, and deletes the two duplicate CK9 and CK10 cases. Files: `src/city/circuit/`, plus the pin lines of the hold-out, ruin and tech `named.test.ts`.

## Does the branch do it?
This is round 2. I reviewed `git diff origin/main...HEAD` at 751b16f and checked the changes since my round 1 review (373f9cd). I ran the four changed test files with `npx vitest run --maxWorkers=2`: 4 files, 46 tests, all green. Round 1 had 48; the two deleted cases account for the difference.

Round 1's must-fix items are both done:
- **Must-fix 1 (scope).** The ticket's K2b **Files** line now lists the pin lines of `src/city/holdout/named.test.ts`, `src/city/ruin/named.test.ts` and `src/city/tech/named.test.ts`. Criterion 5 now counts 4 rewritten. I checked the diff of those three files: only the pin values, the ruin pin's doc comment and the tech case title changed, which is what the Files line allows.
- **Must-fix 2 (near-duplicates).** "CK9: every drop is pole-side…; seed 1's pass" and "CK10: seed 1's lights keep 3 m…" are deleted from `src/city/circuit/circuit.test.ts`. R-1's `circuitProblems(layer, input)` equals `[]` assertion still covers both.

Per criterion:
1. **CK9. Met.** `layDrops` is in `places.ts` and `placeProblems` in `checkplaces.ts`. The remaining case, "CK9: a drop from a pole across the street fails…", covers three fail lines: the cross-street drop, the length and the missing drop. The second case named in criterion 1 is the one criterion 7 deleted.
2. **CK10. Met.** `layLights` is in `places.ts`. "CK10: a light at a crossing pole's spot fails, and so does one on the pole pavement" covers both fail lines. The second case is the one criterion 7 deleted.
3. **CK11. Met.** `layPosts` is in `places.ts`. The CK11 case covers a post moved off the midpoint and a post on a short span.
4. **CK12. Met.** `nodePlaceProblems` has three cases: a switch on 2 attachments fails and on 3 passes; a breaker on a building fails and a lamp on a building with a drop passes; two nodes on one place fail.
5. **Pins. Met, with 4 rewritten.**

   | Pin | Old | New |
   |---|---|---|
   | stage 6 (R-1) | `973fef66` | `a6b0af56` |
   | hold-out settle | `1d4f5972` | `d9948fee` |
   | ruin growth | `24c55727` | `f75f2d1b` |
   | tech criterion 9 (title updated) | `365c9ce6` | `1873844c` |

   The ruin run printed `growth f75f2d1b`, which matches the new pin.
6. **`keep`. Met.** The "keep holds every pole and every street light, for stages 8 and 9" case covers it.
7. **Duplicates deleted. Met**, as above.

**Test count against main:** 7 cases added in `circuit.test.ts`. 4 rewritten: the R-1 pin, the hold-out pin, the ruin pin and the tech pin with its title. That is 11, under 15.

**Purity:** `src/grid/` and `src/night/` are untouched. The new `src/city/circuit/` modules import only `../../core` and their own folder. There is no new dependency, and no GDD Decided rule is changed. The CK9, CK11 and CK12 numbers stay as proposed constants.

## Rule conflicts and risks
- `circuitProblems` judges CK9 to CK11 only when the layer carries drops, lights and posts. A caller with a `Pick<…, "poles" | "spans">` silently skips those rules. This is unchanged from round 1 and fine for the K2a fixtures.

## Must fix
none

## Could improve
1. Criteria 1 and 2 in `tickets/081-puzzles-on-the-city.md` still say "2 fixture cases", but the branch now has one case each, because criterion 7 deleted the other. The architect could change both to "1 fixture case" so the ticket matches the branch.
2. The CK11 case still opens with a whole-layer `filter(rule === "CK11")` pass assertion that R-1 already covers. It could drop that line, or test the note's own fail line instead: a puzzle lamp at a street light's place (round 1, item 2, still open and optional).
