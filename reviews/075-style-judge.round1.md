ticket: 075-style-judge
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
Section A adds a style rubric (S1 to S10, verbatim), a read-only `style-judge` agent, its hook lines and a written protocol for an unattended judge-and-refine loop. Section B is the first run of that loop on seed 1, ruin era, at most three rounds. The refiners may change only which keys their pass picks, how many and where. Clean digests, clean checks, T-1/T-2 tests and kit pins stay unchanged. No test is skipped, deleted or loosened.

## Does the branch do it?
Reviewed `git diff goal/city-transformations...ticket/075-style-judge` (28 files). `npx tsc --noEmit` is clean on the branch. I did not run vitest: the main session's gate on this exact `src/` (identical to e3ec951) was green, 4877 of 4877. I confirmed that `git diff e3ec951 ticket/075-style-judge -- src` is empty.

**A1 (rubric).** `docs/style-rubric.md` holds S1 to S10 word for word against the ticket. I diffed the two blocks and the only difference is a trailing blank line. The first lines give the bar (7 of 10 on S1 to S9) and say S10 is reported, not barred. Met.

**A2 (judge agent).** `.claude/agents/style-judge.md` has `model: opus` and `tools: Read, Write`. Its input is limited to the rubric, the shots and the era, with "read nothing else". The output form matches the four header lines and the table, followed by must-fix lines with no code named and no pass/fail. Met.

**A3 (hook).** `.claude/hooks/pipeline_guard.py` adds `JUDGE = "style-judge"` and both deny rules. I piped the four inputs to the script myself:
- `style-judge` writing `judgements/x.md` is allowed.
- `style-judge` writing `src/x.ts` is denied ("writes only its judgement file").
- `ruin-pass` writing `judgements/x.md` is denied ("only the style-judge agent writes judgements").
- The main session writing `judgements/x.md` is allowed.

Met.

**A4 (protocol).** `docs/style-loop.md` holds the protocol in full. Two differences from the ticket:
- The listener is on port 5301, not 5300. Commit b8b2a2c gives the reason: 5300 is held by an older listener on this PC.
- CLAUDE.md gains the "loop for a style run" line, and the Hook paragraph is also updated to name judgements.

Both are reasonable. Met.

**A5 (gate with A only).** Commit c1d3963 touches no code. Met.

**B1 (rounds on file).** Three judgements exist (`judgements/075-seed1-ruin-r0/r1/r2.md`), each in the A2 form. Every rule has an integer score, a reason and evidence naming a shot and a place in it. The shots are outside the repo, so I can't check them, as expected. Met as far as the repo shows.

**B2 (run summary).** `judgements/075-run.md` has one row per round and a stop reason. The stop reason is "after round 2, the third judgement, as the protocol caps it". The ticket's wording points the other way in places:
- B2 says the reason is "bar met, or round 3".
- Protocol step 2 says "If this was round 3, the run ends".
- Step 6 says that after a lower round, "the next round routes the better round's below-bar list again".

The run stopped at r2 without that re-route. The goal and Q5 say "at most three rounds", which r0 to r2 satisfies, so the ticket contradicts itself. I'm treating this as a risk for Josh, not a blocker. It was a no-question run: there is no question to Josh between rounds in the record.

**B3 (pins unchanged except era layer digests).** Not met as written.
- `src/render3d/ruinpin.test.ts`: `KIT_KEYS.size` goes from 42 to 38, because the ruin pass deleted the four `Tree_Birch_*` rows from `KIT` in `src/city/ruin/kit.ts`. It also deleted their rows from the trunk-values pin in `src/city/ruin/kit.test.ts`.
- `src/render3d/holdoutpin.test.ts`: `CLUTTER_KEYS` goes from 18 to 17.
- These are kit pins, not era layer digests.
- The tech pass did the same job without moving a pin: it kept the table and skipped keys via `UNPICKED_KEYS` in `src/city/tech/kit.ts`. That shows the ruin and hold-out passes could have done so too.
- The era layer digest re-pins (settle, growth, tech) are allowed, and each commit gives the old and new values.

**B4 (diff scope; no test loosened; no camera/URL reads).** File scope is clean: only section A's files, the B table's folders and `judgements/`. Nothing reads `cam`, `at`, `dir` or `light`. Not met on loosening, though. Commit 83df52f, still on the branch, lowers two floors, and its message says so ("adds floor 300 -> 250 and roof floor 100 -> 40 (fewer pieces by design)"):
- `src/city/holdout/named.test.ts`: `toBeGreaterThan(300)` becomes `toBeGreaterThan(250)`.
- `src/city/holdout/stage.test.ts`: roofs `toBeGreaterThan(100)` becomes `toBeGreaterThan(40)`.

The ruin T-1/T-2 fixture change in `src/city/ruin/stage.test.ts` (e3ec951) is not a loosening. It adds a span through a placed tree so the under-span listing is still exercised, and every assertion is unchanged.

**B5 (commits trace to must-fix lines).**
- caba921 (ruin: S1, S2, S5, S8), 83df52f (hold-out: S2, S3, S4, S5) and 4772fb9 (tech: S2, S4, S8) each name round r0 and rule ids that are in r0's below-bar list. Each traces to the r0 must-fix wording: the lime saplings, the orange tarps and pods, the roof items, the grey wall in a, the sapling in c, and the poster columns, labels and screens.
- The r1 commits (9f0e355, 4ac7a53, 6221660) name r1 and S2, S3, S7, and trace to r1's must-fix lines. All three were reverted (be23d4d, e74c7cc, d325045) when r2 scored lower, as step 6 says.
- The re-pin commits name their round and their upstream cause. Met.

**B6.** Josh checks.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are untouched. No new dependency. No `src/core/` change. No file outside the ticket's lists.
- GDD Decided rules: none changed. The rubric scores against GDD §8 (Draft) and quotes §1 "What the player knows" (Decided) without altering it.
- **Independence of the judge.** The `style-judge` agent type was not loaded, so each judge was a general Opus subagent following the agent file. The main session saved its hand-back "word for word" (`judgements/075-run.md`, Notes). The repo can't show that the saved text equals what the judge said, and round 1's transcript "came back empty". It is documented honestly, but it is not the A2 set-up, in which the judge writes its own file.
- **Stop point.** As above, the run stopped after r2 rather than re-routing r1's list into a further round. That is defensible under "at most three rounds", but it is not what B2 and step 6 literally say. Josh should know the run had one more round available under one reading.
- **"Not fixable in the pass" for S1 at spots a, b and d** rests on X-6: a held district grows nothing. That is correctly not worked around in code, and it is correctly sent to Josh.
- Hold-out's `UNPICKED_KEYS` makes `CLUTTER_KEYS` and friends filtered lists. Any other code that read them as "the kit" now sees fewer keys. That is harmless today, but it is the source of the `holdoutpin` count change.

## Must fix
1. **Restore the kit pins (B3).**
   - In `src/city/ruin/kit.ts`, put the four `Tree_Birch_*` rows back in `KIT` and stop the sapling pick from choosing them, the same way `src/city/tech/kit.ts` does with an `UNPICKED_KEYS` set. Then `src/render3d/ruinpin.test.ts` goes back to 42 keys, and the Birch rows return to the trunk pin in `src/city/ruin/kit.test.ts`.
   - In `src/city/holdout/kit.ts`, keep `CLUTTER_KEYS` (or whatever `holdoutpin.test.ts` reads) as the kit's full list and filter at the pick site. Then `src/render3d/holdoutpin.test.ts` goes back to 18.
   - Expected effect: placements, and so the layer digests, are unchanged, and the kit pins pass unchanged as B3 requires.
2. **Undo the two loosened floors (B4).** These are `src/city/holdout/named.test.ts` (`> 250`, back to `> 300`) and `src/city/holdout/stage.test.ts` (roofs `> 40`, back to `> 100`).
   - If the refinement can't meet the old floors, there are two honest routes. One is to revert the count part of 83df52f (`P_ROOF`, `ROOF_PER_COLUMN_MAX`, `P_BARRICADE`) and record S4/S5 as "not fixable in the pass". The other is for the main session to put the lowered floors to Josh and record his words in the merge commit.
   - Expected effect: no test on the branch has a looser threshold than on `goal/city-transformations` without Josh's word.

## Could improve
1. `src/city/holdout/stage.test.ts`: the test name still reads "Solar_Panel_02 and Fabric_01 or _02 only", but the assertion is now Solar_Panel_02 only. Rename it.
2. The new rule in `src/city/ruin/grow.ts` that keeps saplings off a frontage pavement cell is covered only through the digest re-pin. A small fixture test would make it a named rule: a pavement cell against a built cell gets no sapling candidate, and one away from a building does.
3. Neither `src/city/tech/kit.ts` nor `src/city/holdout/kit.ts` has a test named for the rule "a key in `UNPICKED_KEYS` is never placed". Today that rests on the digests and the key-count lists.
4. In `judgements/075-run.md`, say in one line which reading of "at most three rounds" the run took, and that step 6's re-route was not run, so Josh can choose whether to run r3.
