ticket: 016-blow-every-lamp
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
`fuse:blown` gains `lamps`: every lamp whose load counted toward the blown fuse, each with its path from the fuse (A, grid). The renderer then sends one shared-speed streak from the fuse to every one of those lamps, so the farthest arrives at 0.4 s. Each lamp crackles and flares when its streak arrives, then the fuse pops as it does now (B, render).

## Does the branch do it?
Reviewed commits 33a436e (interface), 6d82b13 (A) and 1e9a676 (B) via `git diff main...HEAD`. `npm run typecheck` is clean. `npx vitest run`: 16 files, 298 tests, all pass.

**Interface (33a436e).** `BlownLamp` and the optional `lamps` field in `src/core/events.ts` match the ticket text. The `puzzles/SCHEMA.md` events line documents the field. Both are additive.

**A: grid-simulator**
- *ladder-08 repaired at the start → mill, home, market, lantern, paths from `l_fb`, sum 5.* Met. `blownlamps.test.ts`, "ladder-08 repaired at the start…", asserts the ids, the full paths, the sum of file loads against `e.load`, and `load === 5`.
- *Second trap → home, shrine, sum 3.* Met, in "the ladder-08 second trap…". It asserts `load` 3 and the ids. It doesn't add up the file loads, but with `load` checked that is enough.
- *Dead lamp and lamp behind an open breaker excluded.* Met, in "a dead lamp (bulb fault) and a lamp behind an open breaker…". `blownLamps` uses the same `loadOf` closure that builds `sub` (powered, not faulted, load > 0), so the list matches the summed load by construction. That implements the rule. It doesn't approximate it.
- *Inline map: a blow with no earlier settle (`culprit: null`, `path: []`) still lists `lamps`.* **Not met.** The test "with no earlier settle (culprit null, path empty)…" never asserts `culprit === null`, and the blow it makes has a culprit. Construction runs `settle` and sets `m.prevUnder`, so `repairAt("fb")` is not a blow without an earlier settle. I ran that exact map: the event is `culprit: "a", path: ["la"]`. The first half of the test (`p`, `bus`, `log`) is dead code; it only asserts that construction emits nothing. In `grid.ts`, `blownLamps` doesn't read `before`, so the code very likely handles the null case. The criterion asks for a test of it, and this test is mislabelled.
- *Culprit's entry has the same path as `path`.* Met, in "the culprit's entry has the same path as the event's path".
- *Existing culprit tests pass without edits.* One assertion was edited (`culprit.test.ts:46`). **This edit is acceptable.** The assertion compares the whole payload with `toEqual`, so adding any field to the event breaks it unavoidably. The edit only appends `lamps: [a, b]`. `culprit: "b"` and `path: ["l1","l2","lb"]` are unchanged, and no other culprit test was touched. The rule under test (culprit = newly fed lamp, largest load) is still pinned. The new expectation is also correct: the already-lit `a` is listed, as the "lamps already lit are included" rule says. The ticket's wording didn't foresee the exact-match assertion. The edit doesn't weaken the test.

**B: renderer**
- *`arrivalTime`, `lampFlare`, pop at `SHOCK_SECONDS`, `sequenceTotal` unchanged.* Met, in `shock.ts` and `shock-lamps.test.ts` ("arrivalTime", "lampFlare", "sequence length is unchanged"). `headDistance`/`streakLength` are tested too.
- *`notify()` uses `p.lamps`, else falls back to `[{id: culprit, path}]`, tested by a pure helper.* Met: `blowTargets`, tested by "blowTargets". For an old payload the flare is the same as today: one lamp arrives at `SHOCK_SECONDS`, and `lampFlare` equals the old `culpritFlare`. The crackle differs a little (see Could improve 2).
- *Up to `MAX_BLOW_LAMPS` (8) branches preallocated; lamps past the cap still flare but get no streak (test). No per-frame allocation.* The code meets it: `branchN/X/Y` are sized `SLOTS * MAX_BLOW_LAMPS`, the flare loop runs over `slotLampCount` (up to `MAX_FLARE_LAMPS` = 32), and `drawSequences` doesn't allocate. **The test is missing.** "caps" only asserts `MAX_BLOW_LAMPS === 8` and `MAX_FLARE_LAMPS > MAX_BLOW_LAMPS`. Nothing tests the behaviour "the 9th lamp flares and gets no streak". That split lives inline in `rebuildSlotPath` and the `draw` loop, with no pure function a test could call.
- *One path and one `stroke()` per pass for all branches of a slot.* Met. `drawSequences` builds every branch slice into one `beginPath()`, then strokes the glow pass once and the core pass once. The heads go into one `fill()`.
- *Crackle on arrival and flare from `lampFlare` for each lamp.* Met. The crackle is gated on `age ∈ [arrive, arrive+0.25)` per lamp, and `lampGlow` (renamed from `culpritGlow`) takes the max `lampFlare` across slots. The culprit gets no extra emphasis, as the cut decided.
- *Josh checks in the browser.* Not mine to judge.

**Both:** the gate is green and the test count grew (two new test files).

## Rule conflicts and risks
- None found against the hard rules. `src/grid/` gains no DOM, timer or cross-folder import: `grid.ts` only adds a closure over the existing `Flow`. A stays in `src/grid/`, B stays in `src/render/`, and the interface commit touches `src/core/events.ts` and `puzzles/SCHEMA.md`, as the ticket's Interfaces section planned. No new dependency, and no GDD rule or number changes.
- The ticket said parts A and B go on separate branches (`…-a`, `…-b`), with B branching after A merges. Both are on `ticket/016-blow-every-lamp-a` as separate commits. This is about process, not the code. The commits are cleanly split, so the main session can still merge them as one unit or separately.
- 3D portability: `blownLamps` is in `grid.ts` and depends only on `Flow`. 015 A (multi-feed) needs to carry it over to the merged flow, as the ticket's Order section already notes.
- `MAX_FLARE_LAMPS` = 32 is a second, unrequested cap. A fuse feeding more than 32 lamps drops the extra lamps silently: no streak, no flare. No current panel comes near that, but it quietly qualifies the criterion "lamps past the cap still flare".

## Must fix
1. **`src/grid/blownlamps.test.ts`, the "no earlier settle" test.** The test has to produce the event the criterion names. Either make a blow that really emits `culprit: null, path: []` and assert those two fields along with `lamps`, or, if `culprit: null` can't be reached from an emitted blow (construction always settles first), say so in the test name and comment and assert what the event really carries (`culprit: "a"`) along with `lamps: [a, b]`. Either way, remove the dead first half (`p`, `bus`, `log`). Effect: the test stops claiming coverage it doesn't have.
2. **`src/render/shock.ts` and `shock-lamps.test.ts`, cap behaviour.** Pull the per-lamp "gets a streak?" / "gets a flare?" decision into a pure helper, e.g. `lampRole(k) → "branch" | "flare-only" | "dropped"`, or `branchCount(n)` / `flareCount(n)`. Use it in `rebuildSlotPath`, `notify` and the `draw` loop, and test that with 9+ lamps, lamps 0..7 get a branch and lamp 8 gets a flare but no branch. Effect: the "(test)" in that acceptance criterion is covered by a test of the behaviour, not of the constants.

## Could improve
1. `src/render/map-renderer.ts`, `notify`: `MAX_FLARE_LAMPS` = 32 drops lamps past 32 entirely. Either mention it in the ticket's notes, or size the flare arrays to the map's lamp count once at creation, which is still preallocated.
2. Old-payload fallback crackle: before, the crackle started at shock progress > 0.55 (about 0.22 s, before the streak arrived). Now it starts on arrival (0.4 s). The new timing is what the ticket asks for ("crackle when its streak arrives"), but strictly it isn't "plays exactly as today" for an old payload. Nothing emits old payloads any more, so this is cosmetic. Note it rather than change it.
3. `blownlamps.test.ts`, second trap: also sum the file loads of `lamps` against `load`, as the first test does, so "their loads sum to `load`" is pinned for both ladder-08 cases.
4. `src/render/shock.ts`: `culpritFlare` is now unused by the renderer. Keep it only if other tests still rely on it, otherwise delete it.
