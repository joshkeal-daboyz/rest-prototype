ticket: 07x-cleanup
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Three things on one branch. 073 E2c adds barricade regression tests only, with no stage change, because the reported bug turned out to be a misreading. 074's `PIECE_NOTES` are brought back in step with the updated `docs/design/073-pack-intended-use.md`, plus a new row for the ruin tree crowns ruling. And tickets 073 and 074 get statuses that match what is merged, with each answer labelled by whose it is.

## Does the branch do it?
- **E2c, tests only.** The diff from 7ce351e touches `src/city/holdout/testcities.ts`, `stage.test.ts` and `named.test.ts`. No stage code, pin or digest changes.
  - `acrossProblems` reads the arm axis from each barricade id and finds the junction's street on that axis. It checks two things: each wall's long axis is perpendicular to the street, and the walls of a line together cover the street's `carriage.lo_m..hi_m`.
  - The test is a real one. `stage.test.ts` "every wall line lies across its street…" asserts there are no problems, at least 5 streets along x and at least 5 along z. It also has a failing fixture: swapping every wall's x and z sizes gives more than 50 problems, so a line turned the wrong way would be caught.
  - `named.test.ts` repeats the check over the 20 named runs (more than 200 lines, both axes). I did not run it because of the load limit.
  - The wall's size is derived from `wallLine`'s yaw through `turned(w, d, yaw)`, and the kit's wall is 5 x 0.577 (long along local x). So the size check also stands in for the yaw.
- **074 notes sync.** The rows in `src/render3d/assetcatalogue.ts` now match the note's bullets word for word, apart from backticks and bold:
  - the sapling row is cut to "Never on a junction or crossing; never scaled.";
  - the roof growth rows say "Ruin roof growth is on (RUIN_ROOF_GROWTH, ticket 073 F1b2)" and "F1g's street screenshot", and name the relay;
  - the Vines_06 row says "one of F1g's screenshots".
  - The new crowns row covers `Tree_(?:Birch|Round)_.*|Tree_Large_01|Tree_Generic_Giant_01`. Those are the ruin kit's saplings and the park trees (`src/city/ruin/constants.ts:42`), and the row carries all five of Josh's quoted phrases and T-2.
  - Tests pin each of these: "shows the ruin tree crowns ruling on the saplings and the park trees only" (it also checks that dead and pine trees do not get the row), the changed sapling and roof assertions, and a new lazy manifest pattern entry.
- **Statuses and labels.**
  - 073's header lists each merged section with its merge commit. I checked every hash against `git log --first-parent 7ce351e`: A 4a5077f through F1g 2207244 all match.
  - It also says "No section is done", lists what each unbuilt section waits for, and records the stop on pass work in Josh's words.
  - In 074, A is merged at f46c481 and B and C at 5d31586, both correct, and the ticket is marked "Not done".
  - In 074, Q3 and Q4 are labelled as Josh's (his cards), and Q1, Q2, Q5 and Q6 as answered by the Fable session on his delegation. The E2g and F1g build approval is labelled as taken by the main session, and Josh may reverse it.
  - The note's intro now names the three rulings that are Josh's.
- **Tests.** `npx vitest run --maxWorkers=1 src/city/holdout/stage.test.ts src/render3d/assetcatalogue.test.ts` gives 68 passed in 2 files. I did not run typecheck or the whole suite; the main session's gate did.

## Rule conflicts and risks
- None found.
  - No `src/grid/` or `src/night/` change and no new dependency.
  - The code changes stay in their owners' folders: `src/city/holdout/` for the holdout-pass, `src/render3d/` for the renderer.
  - No GDD rule changed.
- The 073 header says E2c "is merging now". It goes stale the moment this branch merges.

## Must fix
none

## Could improve
1. The crowns row (`src/render3d/assetcatalogue.ts:204`) puts the ruling in `text` with `departure` empty. Every other row from "Uses taken that the images do not show" puts the bullet in `departure` (for example the Overhang and Container rows). The inspect panel then shows the ruling as a plain "Not shown" note, not under "Departure:". Moving the text to `departure`, with the section's "not shown" line as `text`, would match the convention.
2. `tickets/073-city-transformations.md`: once this branch merges, change "E2c is merging now" and "(merging 22 Nov 2026…)" to "merged" with the merge commit.
3. `tickets/074-asset-gallery.md`, criterion B2, still says "the sapling row has Josh's words and T-2". Those words now sit in the crowns row, which also matches the saplings. A short note under the criterion would keep the ticket honest.
4. `acrossProblems` judges the walls' sizes, not `placement.yaw_deg`. One more assertion, that `turned(5, 0.577, yaw_deg)` equals each wall's size, would pin the yaw the renderer actually draws. That is what the branch name `barricade-yaw` is about.
