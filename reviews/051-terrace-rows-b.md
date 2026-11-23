ticket: 051-terrace-rows-b
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B: the rows of the outer city blocks become runs of abutting terrace lots (2 to 4 bays of 5.2 m, 6 m deep, each under the highest cap of 16/13/10 m that clears the lot rules), with at most one parking lot per long run and one corner plaza per outer block as open ground. Terrace placeholders fill their lot. `townLayout(p, { terraces: false })` must be exactly today's town, and with terraces on everything except the outer-block lots (roads, places, pools, picks) must stay unchanged.

## Does the branch do it?
I judged the builder's own commits 7677aa0, ac30ad5 and ac9fd3e (diff against 48fa9a3, the last commit to touch `town.ts` before them). I ran no full suite; the gate is reported green.

**Hard guard: `terraces: false` is today's layout (criterion 6, first sentence).** `terrace.test.ts` pins a 12-hex sha1 of every Town field (roads, kerbs, pavements, pads, blocks, lots, places, ring, window, numbers rounded to 1e-9) for all 65 maps. The table lands in the same commit as the `town.ts` change, so git history can't show it was taken first. I checked it independently instead. In a throwaway detached worktree at `ec7c11a` (goal/city-style before 051 B; its `town.ts` is the pre-change file), I hashed the old `townLayout(puzzle)` the same way. All 65 hashes match the GOLDEN table exactly. The test also asserts `terraces` and `openLots` are empty and that no lot carries `terrace` when the option is off. The cache keys on the option, and the default is on (tested). The claim holds.

**Nothing else moves (criterion 6).** "keeps roads, kerbs, pavements, pads, blocks, places, ring and window deep-equal, and every lot that is not on an outer block row" runs on every map. It also checks that every lot inside an outer block is a terrace lot and no terrace lot is outside one. The pool-count test in `town.test.ts` has no diff. Met.

**Picks unchanged (criterion 7).** "pick targets are unchanged with terraces on" builds the scene with terraces on and off on 01, 09 and 64. It compares pickId, pickKind, the world matrix (rounded to 1e-9) and the geometry bounds, in order, and needs more targets than nodes. `scene.ts` gains only the test-only `terraces` option on the `townLayout` call (plus the placeholder group, see risks). `pick.test.ts`, `live.test.ts` and `relight3d.test.ts` are untouched. 041 B's ray test (`scene.test.ts`, "lets no building or place stand between the camera...") is untouched, and its solids are the placeholder root, which now holds the terrace group, so terrace boxes are in it. Met.

**Terrace runs (criterion 5).**
- Runs, abutment and sizes: met. Every lot's start equals the previous lot's end within 1e-6 on the run's front line. Width is `bays x BAY` with bays in 2..4, depth is `DEPTH`, type is `large` and the cap is one of `TERRACE_CAPS_M`. Every outer block has runs on all four roads. Every bay count appears.
- Last lot ends at the next row's band within 1e-6: met only as `run.len`. The run's end reaches the band (or the plaza edge) within 1e-6, tested. The last lot ends under one bay short of it (builder's flag 2). As written, this bullet can't hold alongside the first bullet: whole bays of 5.2 m can't fill an arbitrary row length exactly. Design item 4 gives the remainder to the 051 C packer (`TERRACE_SEAM_M`), so `TerraceRun.len` closing the run is the only consistent reading. I accept it.
- Lot rules: met. The lot-rules test re-derives roads, pavements, pads, node squares, place boxes, `WIRE_CLEAR` and the occlusion rule with its own geometry. It checks every terrace lot and open lot on every map (over 5000 checked), checks no overlap within a block, and checks that each lot's cap is the highest that clears (the tier above would hide something). "lot spacing" keeps `LOT_GAP` between terrace and non-terrace lots, but on the first 8 maps only.
- "Cap tiers differ somewhere on the ladder, and each tier appears": not met, and it can't be met (builder's flag 1). Every terrace lot on all 65 maps gets 16 m. Of the clears rules, only the occlusion rule depends on height, and `RING_MARGIN` keeps the outer blocks clear of it. The test says so in its name and asserts only that 16 appears and every seen cap is a tier. The 13 and 10 m tiers are dead code on today's ladder. The ticket's Q5 default ("blocks step down where the circuit is near") assumed otherwise. This belongs to Josh and the architect: keep the three tiers for future maps, or take Q5's alternative of one cap. The code can't fix it without changing a lot rule.

**Open lots (criterion 8).** Met. The tests cover: at most one parking lot per run and one plaza per outer block, at the metre sizes; a plaza sits in a block corner at a row's start, and the start-corner count is `blocks*4 - plazas`; a parking lot starts at its run's end, which has `endAbuts: "parking"`, with at least `TERRACE_BAYS.min` bays on each side; the hash rules hold; no open lot overlaps any lot; and open lots live in their own array. The ladder has 504 parking lots and 246 plazas (builder's flag 8); the test floors are only 50 and 20, which I accept. One weak spot: "is never in Town.lots" is proved by footprint (no overlap), not by identity. Since `OpenLot` is a separate type in a separate array, that is enough.

**Placeholders (criterion 9).** Met. On terrace lots, `placeholders.ts` uses factor 1 and no `FOOTPRINT_FACTORS`. The test checks w and d exactly and height under `hMax` on 12 maps, and other lots keep 0.8 or 0.9. On 09, neighbouring terrace boxes share an edge. `placeholders.test.ts` "draws one placeholder body per lot, in the group of its lot type" now runs with `terraces: false` (criterion 10 below).

**Criterion 10 (only the named `town.test.ts` lot tests switch).** In `town.test.ts` the builder switched exactly the five kinds of test the ticket names, six tests: exact types and sizes, LOT_GAP overlap, tall outside the ring, large in an outer block, pinwheel row end, `FILL_STEP`. In each, the only change is `maps` → `flatMaps`. But the ticket also says "every other existing test in `src/render3d/` passes unedited", and the builder edited seven other test files. I checked each diff:
- `facing.test.ts`, `polygon.test.ts`, `stacktown.test.ts`: the maps loader gains `{ terraces: false }`; `stacktown.test.ts` also gains `terraces: false` on three `buildScene` calls.
- `models.test.ts`: three tests gain the option.
- `placeholders.test.ts`: two places.
- `debug3d.test.ts`: `standIn`.
- `streetcam.test.ts`: `terraces: []` in two "no rows" stand-ins, and a changed `framable` filter (below).
Apart from `framable`, every change is only the option: no expectation, threshold or message changed. To judge whether the switches were needed, I re-ran those six files with the option stripped, at ac9fd3e in a CI-like throwaway checkout. 17 tests fail. Every failure follows from the ticket's own design:
- Terrace lots take no model (design item 2): placement counts drop, e.g. `toHaveLength(lots.length)` and facing's ">5000 clones", and the `large` placeholders are no longer hidden.
- Terrace placeholders fill their lot (item 5): `placeholders.test.ts` expects factor ≤ 0.9.
- There are fewer small lots per map, so `FAMILY_SHARE_MAX` and the "spread evenly" check fail on the non-terrace small lots of 52 and 37 (builder's flag 5).

Criterion 16 gives those variety tests "with terraces on" to section D. So criterion 10's "unedited" contradicts design items 2 and 5 and the B/D split, and the builder resolved it the way the design points. I accept the switches, but Josh should know (see risks).

**Criterion 11 (style guide).** Chapter 4 gains three bullets: two tagged `Default (051, with 041's lot rules)` and one Info. All 12 constants (`TERRACE_BAY_M`, `TERRACE_DEPTH_M`, `TERRACE_BAYS` as `2 x 4`, `TERRACE_CAPS_M[0..2]`, the four `PARKING_*`, the two `PLAZA_*`) have Numbers rows. "matches every named export" checks each row's value against the code, so a changed value fails. They are not in `REQUIRED`, so a deleted row would not fail. Adding them means editing `styleguide.test.ts`, which B did not list, so I'd leave that for now. On flag 6: when 7677aa0 was written, the tag regex allowed only 037 to 049. Since the merge of 050 C (d70ac02) it allows `05[0-9]`, so plain `Default (051)` would now pass. The current tag passes anyway. Met.

**CI-safety.** `terrace.test.ts` reads only `puzzles/` (committed), builds paths with `join`, and splits names on `/[\\/]/`. It never reads `assets/private/` and uses no timers; the 60 s vitest timeout on the lot-rules test is a limit, not a wait. `git ls-files assets/private` is empty in the worktree: the pack links there are untracked. No file under `assets/`, `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `tests/`, `puzzles/`, `tools/` or `package.json` is in the diff. There is no new dependency.

## Rule conflicts and risks
- **Three criteria are unmet as worded, each because of the ticket, not the code.** Josh or the architect should decide them; sending them back to the builder won't help:
  - Criterion 5, "each tier appears": only 16 m occurs on the ladder.
  - Criterion 5, "last lot within 1e-6 of the band": this contradicts whole-bay lots. `run.len` meets it, and 051 C's packer closes the gap.
  - Criteria 10 and 20: "every other test / polygon.test.ts and facing.test.ts unedited" contradicts design items 2 and 5. `facing.test.ts` and `polygon.test.ts` are named "Keep (unedited)" and were edited, though only by the option.
- **Coverage gap until 051 D.** With terraces on, which is the town the game shows, these are no longer exercised on the shipped layout: the facing, variety (`FAMILY_SHARE_MAX`, even spread), "inside their lots" and 050 C stacks-in-town tests. With the Town Pack present, a non-terrace small family already exceeds its share on 52 and 37 (6 of 20, 4 of 15). That is a small visible variety slip on the city-style goal branch, not on `main`. Section D's criterion 16 has to bring all of these back with terraces on, and the switched files should then drop the option.
- **Files beyond B's list.** `models3d.ts` (D's file) gains a two-line skip of `lot.terrace` in `buildingPlacements`. `scene.ts` gets more than the pass-through: terrace placeholders get their own group, outside `byType`, so a type's models never hide them. Both stay in `src/render3d/`, both are small, and both are needed for design item 2 ("a terrace lot never takes a whole model"). Without them, large models or stacks would land on 6 m deep lots, or the terrace would go bare. Not a hard-rule break, but the main session should note it.
- `pickBuildings` still gets the terrace lots and assigns them families before `buildingPlacements` drops them, so the neighbour and share bookkeeping counts lots that end up with no model. That is harmless for B (D replaces it), but D should filter the terrace lots out before picking.
- Purity: not applicable (no `src/grid/` or `src/night/` change). No GDD Decided rule touched.

## Must fix
none

## Could improve
1. `src/render3d/town.ts`: `const kindRank =(k: RoadKind)` lost its space in the edit. Restore `kindRank = (k`.
2. `docs/city-style-guide.md`: retag the two chapter-4 bullets as plain `Default (051)`, the tag criterion 11 names. The regex has allowed 05x since 050 C merged.
3. `src/render3d/terrace.test.ts`: run "lot spacing" (`LOT_GAP` between terrace and non-terrace lots) on every map, not `maps.slice(0, 8)`. Terrace lots clear `placed` at margin 0, so this is the only check that they keep `LOT_GAP` from other blocks' lots and from places.
4. `src/render3d/streetcam.test.ts`: the new `framable` filter keeps the "> 2 framable rows" floor, but nothing requires one of those rows to be a terrace run. A line asserting at least one terrace run is framable on 09 and 64 would keep criterion A2 covering the rows 051 is about.
5. When 051 D lands, drop `{ terraces: false }` from `facing.test.ts`, `polygon.test.ts`, `models.test.ts`, `stacktown.test.ts`, `placeholders.test.ts` and `debug3d.test.ts` wherever the test is about the shipped town, so criterion 20's "Keep" tests guard the terrace town again.
