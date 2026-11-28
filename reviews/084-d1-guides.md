ticket: 084-d1-guides
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section D1 of `tickets/084-first-play.md` (read from `origin/main`, with section T): put a `guide` of 3 to 6 steps in each of s01, s02 and s03. Every step names buildings as `buildingNames` numbers them, is at most 140 characters, never acts for the player, and the last waits for `complete`. Each note gets a *Guide* section and `puzzles/SCHEMA.md` gets the field. The layout, the check blocks and the analyzer numbers stay as they are.

## Does the branch do it?
**Criterion 1, the guides.**
- **Step counts and lengths.** s01 has 6 steps, s02 has 5, s03 has 5. Every text is at most 116 characters (I counted the code points of each). Every guide ends on `{ "complete": true }`. No step's `until` throws or repairs anything for the player: they are only `next`, `throw` (the player's own throw) and `complete`.
- **Building numbers.** I checked these against the A1 rule (`target`, then `priority`, then other file lamps in `nodes` order) on each file:
  - s01: `shrine` is Building 1 and `home` is Building 2. The texts name only Building 1. Correct.
  - s02: `pump_house` is 1, `home` is 2 and `store` is 3. The store is the only other lamp in `nodes`, coming after `home`. Correct as quoted: "Now it feeds Building 2" (`sw_corner` has `selected: 0`, i.e. `l_home`), "Building 2 went dark", and "This one feeds Building 3" (`sw_pump` has `selected: 0`, i.e. `l_store`).
  - s03: `infirmary` is 1, `home` is 2, `kiln` is 3, `shed` is 4 and `stall` is 5. "Building 5 went dark" after `br_stall` is the stall, the only lamp on `l_stall`. Correct.
  - No text uses a lamp id or a place name.
- **On-screen numbers.** I checked them against `overlayLabels` and `signedDelta` in `src/render3d/overlay.ts`, and against the notes' own walkthroughs and analyzer lines:
  - **s01.** The feed label is "2 of 5" at the start (note line 64). `br_shrine` reads "+2" (note line 95: the shrine and the house on its pole). The win is "4 of 5" (`npm run check`: "feed: load 4 of 5").
  - **s03.**
    - The start is "9 of 6" (note line 152).
    - `br_stall` reads "−1". `signedDelta` draws a true minus (U+2212), and the file uses the same character.
    - After `br_stall` the feed reads 8 of 6, so "1 was too little" holds on the intended path.
    - "Red ... not enough, white ... is" matches the preview's `over` (red when some feed is still over after the move) and the cream label colour `#f2ead7` in `cityview.ts`.
    - "6 or less" matches the capacity of 6.
  - **s02** quotes no numbers.
- **The lessons named.** s01 covers the goal marker (step 1), the feed (step 2), "x of y" (step 3), the breaker (step 4) and "+n" (step 5). s02 covers the switch (steps 2 to 5). s03 covers the brownout (step 1) and shedding (steps 3 to 5).
- **Nothing else changed.**
  - The `.city.json` diffs add only `"guide"`, plus the comma after `"faults": []`.
  - The `.md` diffs add only the *Guide* section, so the check blocks are untouched.
  - `npm run check` passes on all three files on the branch, and every trap holds and recovers.
  - `npm run analyze` gives the same output on each file with and without its `guide`. I compared each file against a copy with the guide removed, in the scratchpad.
- **Validation.** The existing fit sweep covers it. CI is green. `npm run check` loads each file through validation without a complaint.

**Criterion 2, the notes and the schema.** Each note has a *Guide (ticket 084 D1)* section with a table: the steps in order, the text and its length, what it waits for, and why it is there. The `guide` entry in `puzzles/SCHEMA.md`'s city section has the shape A1 checks, the five `until` kinds, "s01 to s03 only for now", the numbering rule and an example.

**Criterion 3, Josh reads the steps.** This is his, and comes before D2 ships. It does not block this merge. There is no *What it taught us* entry yet.

**Tests.** The branch adds or changes no test file, matching the ticket's count of 0, so there was nothing of its own to run. I ran `npm run check` and `npm run analyze` on the three files in the foreground.

## Rule conflicts and risks
- No code is touched, and nothing goes into `src/grid/` or `src/night/`. All the files are on D1's list, and no dependency is added.
- No GDD rule is changed. s03 step 1's "none counts as lit" is the brownout rule as the brief states it.
- **Risk: s03 step 3 makes the player take a wrong move on purpose.** "This one reads −1 ... Click it" waits only for `{ "throw": "br_stall" }`, a shed the note itself calls the first half of the trap (8 of 6, still flickering).
  - **The letter of the ticket.** No step throws for the player, and the player still has to make the real choice in step 5.
  - **Josh's words for s01 to s03.** They are "point at the control, explain, let the player try" (decision 5). He asked for the "tempting wrong move that visibly fails" in s04 to s10 (E2), not here. Steering the player into the wrong move turns s03's trap from a choice into a scripted step.
  - **My reading.** This is a design call within the ticket's wording, not a broken criterion. It is Josh's to make under criterion 3, so it is flagged under Could improve, not Must fix.
- **Risk: s03 step 4 can be wrong off the intended path.** The note says step 4 "does not go stale if they have opened something else as well". The file's lines show otherwise. `l_stall0` runs from `j_shed`, so `br_stall` sits behind `br_shed`.
  - A player who opens `br_shed` during steps 1 to 3 has already darkened the stall. Throwing `br_stall` then darkens nothing, yet step 4 says "Building 5 went dark, and 1 was too little".
  - After `br_inf` the load is 3 of 6, so "too little" is false there as well.
  - I read this from the file's lines and did not play it.
- **Risk: s01 step 1 says "under the gold marker".** Section B has not built the marker. Its spec says "the target star and the name in a small dark pill" and gives no colour. The word may not match what B draws.

## Must fix
none

## Could improve
1. **s03 step 3 (Josh's call).** Put to Josh whether s03's guide should steer the player into `br_stall`. The alternative is to explain "−n", then let the player choose freely, ending on `complete`. For example, a `next` step on `br_stall` ("This one reads −1: opening it takes 1 off. Red means it would not be enough."), so the player still meets the trap on their own. The note's *Guide* table should then say which he chose.
2. **`puzzles/city/s03-not-enough-for-all.md`, step 4 row.** Either drop the claim that step 4 "does not go stale", or word step 4 so it holds whatever was opened first (for example, "Red means that breaker alone is not enough. White means it is."). D2 may also want to know that `throw: br_stall` can be met by a throw that changes nothing.
3. **`puzzles/city/s01-first-light.city.json`, step 1.** Re-read "gold marker" against B's marker once B lands, or say "the marker" without the colour.
4. **`puzzles/SCHEMA.md`.** The `lit` kind is glossed as "and nothing is browned out". That is D2's semantics (A1 only checks that the id is a file lamp). It is fine, but it should be named as D2's so a later D2 change edits the schema with it.
