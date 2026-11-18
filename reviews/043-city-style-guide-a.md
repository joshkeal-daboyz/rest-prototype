ticket: 043-city-style-guide-a
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section A asks for `docs/city-style-guide.md`: fifteen chapters that record, and never make, the 3D town's rules, each tagged Decided, Default, Pending or Open with its ticket and Josh's words. It also asks for `src/render3d/styleguide.test.ts`, which pins the guide's Numbers, pack, front and corner tables to the code. The only source change allowed is adding `export` to existing `scene.ts` colour constants.

## Does the branch do it?
I ran `npx vitest run --maxWorkers=2 src/render3d/styleguide.test.ts` in the worktree: 20 tests passed. The worktree has `assets/private/out` as a symlink to `-main`'s ignored folder, so the manifest test ran here as well. `git ls-files assets/private` is empty, and the symlink is matched by `.gitignore:16`.

- **The guide exists.** Met, apart from Must fix 1.
  - There are fifteen numbered chapters plus `## Numbers`. The first test in `styleguide.test.ts` checks the order.
  - Every bullet carries a tag, and the test checks that each Decided or Default bullet names a ticket from 037 to 049.
  - Josh's corner rule is quoted verbatim in chapter 7. The test checks this string for string.
- **No new rules.** Partly met. I checked 25 claims against `town.ts`, `layout.ts`, `models.ts`, `placeholders.ts`, `scene.ts`, the manifest and tickets 037, 038, 039, 041, 042 and 043. All of these are correct:
  - Every Numbers row (the test proves this, and I read the `LOT_TYPES`, `PLACE_SIZES`, `TINTS` and drop/can lines myself).
  - Josh's quotes, each found word for word in its ticket: "scaled variably" (041), "Pitch 12, pinwheel" (041 status), "too many video rental stores", "just squares", the curbs, powerlines, cut and Relight lines (042), "the city pack has road tiles" and "no it's fine if it's in c" (042 C amendment), "#4 is fine..." and "Testers may fetch it" (039), and "SIMPLE town was a test..." (043 Q4).
  - "All reversed 180 degrees" (`models.ts:77`).
  - The front table (`store_small_mesh` +z, `memorial_mesh` +z) and the corner table (`store_corner_mesh` -z, open -x), which match `models.ts:92-124`.
  - The corner-lot definition, with `CORNER_ANGLE_MAX` and "a row end that meets no other road is not a corner" (`town.ts:167-176`, `1374-1406`). Calling it Decided is fair, because 042 A merged on Josh's "once the corners are fixed".
  - The family-choice fallback order "cap, then street, then neighbour" (`models.ts:457`).
  - `tall` lots outside the ring only (`town.ts:1287`).
  - The inline background, ambient and moon text (`scene.ts:616-618`).
  - The pack table: apocalypse-power scale 1, simple-town 100, town-pack 1, city-pack 100. City-pack is correctly "converted, not used", not the ticket's older "not converted".
  - The manifest facts: town-pack has 704 entries, 9 failures, 2 scale-suspect and 62 missing-texture; city-pack has 355 entries, 2 failures and 30 scale-suspect; `SM_Bld_CityHall_01` is 20.1 x 8.7 x 17.6. I read all of these from the manifest myself.
  - **Chapter 12, which the builder did not verify:**
    - Halo and pool for a lit lamp, none for a dark one: 037 lines 175-176 and 236, and `scene.ts:1022`.
    - The star filled when lit, hollow when dark: 037 lines 139 and 177.
    - Breaker lever up when closed and flat or dropped when open, and the switch lever with its chevron: `scene.test.ts:128,149`, `live.test.ts:42`.
    - The fuse bar: `scene.test.ts:174`.
    - The bead leaving the feed: 037 line 116.
    - Poles 3:1: `scene.test.ts:299`.
    - All correct. Chapter 12 names `scene.test.ts`, plus the 041 C tests (poles 3:1 and `live.test.ts`'s "gives all three conductors the line's look"). That meets "Accessibility restated".
  - **The 038/039 wording, which the builder did not verify:** "gitignored, never committed, `git ls-files assets/private` empty" (038 lines 51 and 58, 039 line 59), "no `.glb`, `manifest.json` or `private` path in `dist/`" (039 line 58), "fetched at run time, never bundled" (039 line 21), and "Josh copies `assets/private/out/` himself; no script, workflow or agent uploads a GLB" (039 line 22). All correct.
  - **One claim is invented** (Must fix 1). In chapter 5, the bullet "Decided (043 Q4 ...): no decision on `store_small_mesh` is needed ... It stays kept, under the family and cap rules only" makes a rule and credits Josh with it. His Q4 answer is about art style, not the video rental store. The ticket says the store and its exclusion are Pending (design 1.5; Q6 default). 042 Q3's default says a named store goes into `BUILDING_EXCLUDE`, which contradicts "stays kept".
  - Minor mis-citations (Could improve 1):
    - Chapter 5's neighbour rule is cited as "041 Q4" (that question is "which buildings"; the rule is 041 B4).
    - Chapter 9's picking rule is cited as "041 Q5" (the sag question; picking is 041 C6).
    - Chapter 9's "Default (041 Q9)" bullet includes drops, but Q9 covers only insulators and cans (drops are C5).
- **Numbers pinned.** Met. `matches every named export` looks up each row's `File`/`Constant` in a module map:
  - A changed value on either side fails, with a collected message.
  - A row renamed in the guide, or an export renamed in code, fails with "the code has no such export".
  - An unknown file name throws.
  - Records are compared field by field in field order.
  - The test does not catch everything (Could improve 2):
    - A row deleted from the table passes. Only the `> 60` row count and the `LOT_TYPES`, `PLACE_SIZES` and `TINTS` coverage would catch it, so deleting `ROAD_W` goes unnoticed.
    - A row with fewer than three cells is dropped by `filter((r) => r.length >= 3)` without a word.
    - The AC as written ("changing any one constant ... or any one value") is still met.
- **One scale.** Met by `one scale`: `town.WORLD_PER_METRE` and `models.WORLD_PER_METRE` must be equal, and both are also rows in the table.
- **Packs and fronts listed.** Met:
  - "has every MODEL_TABLE pack in the table, and every pack marked in use in MODEL_TABLE" checks both directions.
  - The facing and corner tests require exact two-way equality between the chapter 6 and 7 tables and `BUILDING_FRONTS`, for names that are not "-z" and for names marked `corner`.
  - The manifest test additionally checks each converter scale whenever the manifest is present.
- **The `scene.ts` change.** Met. The diff adds the word `export` to `GROUND`, `YARD`, `STREET`, `PAVEMENT`, `KERB`, `CENTRE_LINE`, `PLACE`, `FOOT`, `METAL`, `LIVE_GLOW`, `WARM`, `TARGET`, `SCORCH`, `RIBBON`, `INSULATOR`, `CAN` and `DROP_COLOR`. I compared each hex value line by line, and none changed. `placeholders.ts` is untouched; its constants were already exported.
- **Nothing else moves.** Met. `git diff main...HEAD --stat` shows only the three allowed files. `town.ts`, `models.ts`, `layout.ts` and `camera.ts` are read only.

## Rule conflicts and risks
- No GDD Decided rule is touched, `src/grid/` and `src/night/` are untouched, there is no new dependency, and nothing under `assets/private` is committed.
- `styleguide.test.ts` imports `../render/city`. `camera.ts`, `models.ts` and `captions.ts` already do this from `src/render3d/`, so it breaks no rule.
- **The builder's flags:**
  - **`DROP_REACH` 2.5 against 041's 2.** It is fair to record the code's value. The 041 C review raised the deviation, and 041 merged with it. The guide states it openly in chapter 9, though under a "Default (041 C5)" tag, which suggests 2.5 was the approved default (Could improve 3).
  - **The fifth "Info" tag.** Acceptable. It marks facts, not rules, and the AC's four tags govern rules. The risk is that Info becomes a way to state a rule without a citation. I read every Info bullet and none hides a rule.
  - **Three allowed 042 B names that do not exist yet** (`PLACE_MODELS`, `PLACE_MIN_SCALE`, `PLACE_GLOW_MAX`). Fair: all three are named in 042's approved design (lines 142, 148 and 238), and the guide calls them Pending. The set never fails once they do exist, so it can go stale (Could improve 4).

## Must fix
1. **`docs/city-style-guide.md`, chapter 5, the bullet "Decided (043 Q4 ...): no decision on `store_small_mesh` is needed ... It stays kept".** Re-tag this bullet Pending or Open, citing 043 Q6 and 042 Q3, as the ticket's design 1.5 and Q6 default say. Say that Josh named the store with `fronts=1`, that 042 Q3's default would then put it in `BUILDING_EXCLUDE`, that `BUILDING_EXCLUDE` is still empty, and that the choice (exclude it, give it a lower weight, or keep it) is Josh's. Once the bullet no longer credits Josh's Q4 words with a decision he did not make, the "No new rules" criterion is met.

## Could improve
1. Correct the three citations:
   - chapter 5, the neighbour rule: "041 Q4" becomes "041 B4" (with 042 A);
   - chapter 9, picking: "041 Q5" becomes "041 C6";
   - chapter 9, the code-drawn hardware bullet: cite drops to 041 C5, not Q9.
2. In `styleguide.test.ts`, list the required constant names (finding 2's exported list) and check that each one has a Numbers row. That makes a deleted row fail. Also fail on any `|` row in the Numbers table that has neither 3 nor 2 cells, instead of filtering it out.
3. In chapter 9, tag the 2.5 reach as Info ("as built; 041 approved 2; the 041 C review raised it and 041 merged with it") rather than inside the Default bullet.
4. In "names only constants that exist", fail when a `PENDING` name is already exported (`expect(known.has(p)).toBe(false)`). The set then has to be pruned when 042 B lands, instead of being left behind.

## Round 2 (05aa854)
assessment: meets
must-fix: 0

I read only `git diff 9504aa0..05aa854`. It changes two files, `docs/city-style-guide.md` and `src/render3d/styleguide.test.ts`. I ran no suite; the main session's gate is green.

- **Must fix 1 is done.** In chapter 5, the invented Decided bullet is gone.
  - The new bullet is "Pending (043 Q6, 042 Q3; waits for Josh)". It says that `store_small_mesh` is named, that `BUILDING_EXCLUDE` is empty, and that excluding it, weighting it lower or keeping it is Josh's open choice. That matches 043 design 1.5 and Q6 and 042 Q3.
  - The Default bullet above it now says "A named store would go there", which is 042 Q3's default.
  - "Which Josh calls the video rental store" is supported by the 042 A merge commit's words, "(except for the video rental)".
  - I checked every "Josh" in the guide. The only new one is this Pending bullet. Every Decided credit is still one I verified word for word in round 1. The Q5 bullet dropping "Josh's" before "12% sag of 037 C-Q2" is neutral.
- **The three citations are correct.**
  - "041 B4, 042 A" for the neighbour, street and cap rules: B4 is "No copy beside itself", and the street and cap rules are 042 A.
  - "041 C6" for picking: C6 is "Picking".
  - "041 Q9, C5" for the code-drawn hardware: Q9 is insulators and cans, and C5 is "Transformer cans and drops".
- **The `DROP_REACH` Info bullet is accurate.**
  - `layout.ts:40` is 2.5.
  - 041 C5 (ticket line 120) says "`DROP_REACH` 2".
  - The comment at `layout.ts:36-39` gives the reason: the 2.1 minimum front distance, 13 lots against 108.
  - `reviews/041-city-layout-and-power-lines-c.md:39,45` raised it.
  - 041 merged at `8d53335` with 2.5.
  - The C5 Default bullet now names `DROP_REACH` without asserting a value. This was Could improve 3.
- **The drift guard is now real.**
  - `REQUIRED` has 77 keys: town 30, models 4, layout 13, camera 2, scene 21, placeholders 7. I compared it list against list with the Numbers table's 77 Constant/File rows, and they match one to one in both directions.
  - Deleting any row now fails "has a row for every constant the guide must pin". A new row is allowed and is still value-checked.
  - The inline table is still held at exactly 3 rows.
- **The new `table()` behaves as claimed.**
  - It stops at the first line that does not start with `|`. The Numbers section has prose and a blank line between the Constant table and the Part table, so the first table cannot run into the second, or into the next section.
  - A row with fewer cells than the header throws instead of being dropped.
  - Two silent cases remain, and both are caught downstream:
    - A blank line inside a table ends it early. The Numbers table is caught by `REQUIRED`, and the pack, facing and corner tables by their two-way equality checks.
    - A row with extra cells shifts its cells. A shifted Value fails the value comparison.
  - The four `.filter((r) => r.length >= N)` calls are removed, so no caller drops rows anymore.
- **No other file changed.** `git diff --stat` lists only the two files. The worktree's other untracked files are this review and the playtest.

Must fix: none.

Could improve: round 1's item 4 (fail when a `PENDING` name already exists) is still open and still optional.
