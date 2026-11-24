ticket: 081-K3-circuit-drawn
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Draw stage 6 on the city, dead: every pole on its `poleModels` model, every span and drop as the 071 wire piece at `SAG_RATIO`, the street lights, and a structure with a code arm on every corner roof. Given an optional job, the new `circuitdraw.ts` also stands each node's picked model at its place, swaps the feed's pole for the feed pick, adds only the mid roofs and roof spans the job uses, and hangs the damaged-line prop at a cut only while it is readable. R12 allows the wire piece on circuit spans and drops only, and `planKeys()` gains the circuit's keys.

## Does the branch do it?
Reviewed `git diff origin/main...ticket/081k3-circuit-drawn`. The builder's commit (7dda8bb) touches only `src/render3d/`. The `src/core/citycircuit.ts` change in the diff is the architect's cut commit (3f68b10, `CityPuzzleView`), not the builder's. I ran `circuitdraw.test.ts` (5 passed, 1.86 s of tests, 4.4 s wall; case 3(a) takes 1.83 s through the module cache) and the three changed cases of `plan3d.test.ts` (3 passed).

1. **Poles and spans.** This is met. `circuitDraws` stands each pole with `placePole` on `poleModels[id]` and hangs every span and drop with `fitLine(POWER_LINES[POWER_LINE], ..., SAG_RATIO, S)`. Each pole end is at `lowestAttach`, the minimum of `attach_m[].up`. PK2 pins that to `GROUND_POLE_ATTACH_UP_M`, so it is the same reading as stage 6's `poleEndHeight`. The test is case 1, "draws every pole on its poleModels model…". It checks against `Math.min(...GROUND_POLE_ATTACH_UP_M[key])`, so the expected value comes from stage 6's rule and not from the code under test.
2. **Roof structures and roof spans.** This is met. Every corner roof gets `COMPONENT_MODELS.roofMast.key`. The arm's underside is at `deck_y_m + ROOF_MAST_ATTACH_MIN_M` and the wire seats on its top, at 2.1 m. That is higher than the 2.0 m floor, which the criterion allows. Mid roofs and roof spans are drawn only when a place or a `runs[*].spans` entry uses them, and with no job none is drawn. The test is case 2: with no job, corner only; with a job, exactly one mid roof and one roof span are added.
3. **Component models.** Partly met. The rest of this criterion holds:
   - **On a pole:** under the lowest attachment, 0.35 m toward the street, facing it.
   - **Building lamp:** at the drop's wall point.
   - **Lamp post:** at its `posts` place, looked up correctly by span id.
   - **The feed:** its pick replaces the feed pole's model, and `poleModels` is left unchanged.
   - **Placeholders:** a null key or an unloaded model gives a placeholder (`circuitGroup`).
   - **Tests:** case 3(a) is on K2c's fixture on 6 x 6 seed 1: one model per node of its component's key, and the feed's pole drawn as `FEED_POLE_KEY`. It also checks that the feed's spans clear 4.2 m. Case 3(b) is "draws a placeholder for a null key and for a model that did not load".

   The gap is **"On a roof: at the structure, below its arm"**. In the roof branch the base is fixed at `deck_y_m + ON_ROOF_BASE_M` (0.3 m), plus 1.0 m for each extra node on the roof. The top is never checked against the arm at deck + 2.0 m. With `COMPONENT_H_M`, a switch's top lands at 0.3 + 2.752 = 3.05 m and a breaker's at 2.18 m, both above the arm. A second node on the same roof starts at 1.3 m. Neither the fixture nor any test has a roof node, so the case is untested. I read this from the code and constants. It is not on a city: `city-two-ways-round` has no roof node.
4. **Damaged-line prop.** This is met. The prop is drawn only for a fault id in `readable`, at the midpoint of `cuts[faultId]`, hung so its top is at the wire's low point. The low-point formula matches `fitLine`'s parabola at t = 0.5 (`chain`, `powerkit.ts:299`). An unreadable cut stays an ordinary `span` wire. The test is case 5.
5. **Street lights.** This is met. `STREET_LIGHT_KEY = "town-pack:SM_Prop_Streetlamp_01"` is a different key from the `lampPost` pick (`sci-fi-city-pack:SM_Prop_Streetlight_01`).
6. **R12.** This is met. `planAudit` reads `circuitKeyUses()` whenever the plan has a circuit layer. `PLAN_AUDIT_CIRCUIT_WIRE` allows `POWER_LINE` only on layer `circuit`, lists `spans` and `drops`, and no other never-used key is let through. The new case "R12 knows the circuit…" asserts that `POWER_LINE` is never-used and that the default plan, which has a circuit, audits clean, so the allowance is exercised. It also asserts that the same key on a facades dressing piece is refused. The ticket said to rewrite the existing allowance case. The builder added one case covering both halves instead, and the coverage is the same.
7. **Loads.** This is met as far as code goes. `planKeys()` gains `circuitKeys()`: the mix, the feed pick, `POWER_LINE`, the roof structure, every non-null component key and the street light. Missing assets give placeholders, including the code polyline for a missing wire piece. The load times before and after are in the builder's reply, which I did not see.
8. **Reported, not tuned.** This goes in the builder's reply, which I did not see. The feed pick's attachments are at 8.38 m, and case 3(a) asserts the feed spans' low points clear 4.2 m, so a "stop 081 K3" was not due.
9. The browser check is skipped as instructed (the main session checked it).

**Test count against main.** 6 cases added (5 in `circuitdraw.test.ts`, 1 in `plan3d.test.ts`) and 2 rewritten, 8 in all, under the cap of 15. The second rewrite is justified: the traffic case ("lists every traffic piece once…") pinned `planKeys()` exactly and could not pass once the circuit keys joined it. Both rewrites keep their original rule and only make room for the circuit keys. No report-only test and no 20-city check. The one whole-city case is the one the ticket asked for, on seed 1 through the cache, and the new file runs in under 2 s.

**The builder's choices where the ticket gave no numbers:**
- **`FEED_POLES` instead of a `POWER_POLES` entry.** This is right. `powerkit.test.ts:75` pins `Object.keys(POWER_POLES)` to `POWER_MIX`, so an entry there would have broken PK2's pin, which the ticket says stays unedited. `poleOfKey` looks up `FEED_POLES` first.
- **0.35 m out and 0.6 m under the lowest attachment, facing the street.** These are reasonable and named as constants. The models sit at most about 0.17 m off the post, from the poles' `along_m`.
- **A lamp on a pole or a roof uses the `lampBuilding` model.** This is reasonable. It is a wall light, it is never the street light, and only a `post` place is a lamp post.
- **Pack fronts assumed to face +z.** This can't be told from code. It is a browser question for Josh, see could-improve 3.

## Rule conflicts and risks
- **Purity.** `src/grid/` and `src/night/` are untouched, and nothing outside `src/render3d/` was edited by the builder. There is no new dependency.
- **No GDD rule is changed.** The street light and the puzzle lamp keep different models. The wire is the pack piece. Nothing is lit: emissive materials are cloned dark.
- **Collision with P0 (I checked `origin/ticket/081p0-two-ways-round-city`).** P0 moves `src/city/circuit/fixtures/city-two-ways-round.city.json` to `puzzles/city/`. Case 3(a) reads the old path through `readFileSync` (`circuitdraw.test.ts`, the `loadCityPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "city", "circuit", "fixtures", ...))))` line). Whichever of K3 and P0 merges second leaves this case failing with ENOENT. If P0 merges second, CI's `--changed` may not run `circuitdraw.test.ts` at all, because a file read is not an import, so `main` may go red unnoticed (not checked). The ticket allowed either file, so this is not a must-fix on the branch. It is a merge-order task for the main session (could-improve 1).
- **The feed pick's key appears twice.** `FEED_POLE_KEY` repeats `COMPONENT_MODELS.feed.key`. If Josh re-picks the feed, `poleOfKey` finds no frame for the new key. The pole then quietly gets the Apocalypse pole's attachment heights. It draws something, but at the wrong heights.
- **The asset catalogue's "circuit" list is not updated.** `assetcatalogue.ts:90` lists `Object.keys(POWER_POLES)`, so the feed pick is not in it. That file is outside K3's list, so this is noted only.

## Must fix
1. **`src/render3d/circuitdraw.ts`, the `"roof" in place` branch of `circuitDraws`: a node on a roof structure must stand below the structure's arm** (criterion 3, "On a roof: at the structure, below its arm").
   - **The fix:** set the base the way the pole branch does, `deck_y_m + ROOF_MAST_ATTACH_MIN_M - gap - h - slot`, clamped at the deck.
   - **Where a model is taller than the room under a 2.0 m arm** (a switch, 2.752 m), either raise that structure's arm and wire seat above it (criterion 2 allows "2.0 m or higher"), or leave it and report it to the main session as a question.
   - **The test:** add the check as an assertion to an existing case rather than a new one: one switch node placed on `roof:3:0` in case 2's job, with its top under the arm or under the raised arm.
   - **The effect:** no roof-mounted breaker or switch pokes up through or above the arm the wires hang on.

## Could improve
1. **The fixture path, at merge time.** Whichever of K3 and P0 merges second should point case 3(a) at `puzzles/city/city-two-ways-round.city.json` (`join(__dirname, "..", "..", "puzzles", "city", ...)`). If K3 merges first, it can be done in the P0 merge itself. Either way, run `circuitdraw.test.ts` by hand at that merge, because CI's `--changed` may not reach it.
2. **Tie `FEED_POLE_KEY` to the pick.** Derive `FEED_POLE_KEY` from `COMPONENT_MODELS.feed.key`, or add one assertion to case 3(a) that the pick's key has a frame in `FEED_POLES`. A re-picked feed would then fail loudly instead of drawing at the Apocalypse pole's heights.
3. **The +z front assumption.** Name it as one constant, for example `PACK_FRONT_YAW = 0`, used by `yawToward`'s callers. If Josh finds the wall-attach electronics facing the post on `cam=street`, the fix is then one number.
4. **Unused export.** `wireLow` is not used anywhere: `circuitDraws` repeats the formula inline, and the test has its own `lowOf` with 0.04 hard-coded. Use `wireLow` in both places, or delete it.
5. **Odd heights in the lamp-post branch.** It stands any component that is not a lamp post at a fixed 1.0 m. Only lamps reach that branch, so this never happens today. A `continue` would say so more plainly.

## Round 2

ticket: 081-K3-circuit-drawn
assessment: meets
must-fix: 0

Reviewed fix commits 4b6a598 and d1a93dd on `ticket/081k3-circuit-drawn`, and `git diff origin/main...HEAD`, which touches only `src/render3d/` (`circuitdraw.ts`, `circuitdraw.test.ts`, `plan3d.ts`, `plan3d.test.ts`, `powerkit.ts`). I ran `circuitdraw.test.ts` and `plan3d.test.ts` in the foreground: 2 files, 84 passed. Nothing was left running.

**Round 1 must-fix 1 (a roof component stands below its arm): fixed.**
- In `circuitDraws`, a first pass over the nodes works out `armUp` for each roof that holds a node: `max(ROOF_MAST_ATTACH_MIN_M, ON_POLE_GAP_M + COMPONENT_H_M[c] + slot * 1.0)`.
- That roof's arm and wire seat (`seatY_m`) are raised to it, which criterion 2's "2.0 m or higher" allows. A roof with no node keeps 2.0 m.
- The roof branch sets the base at `deck + armUp - ON_POLE_GAP_M - h - slot`, clamped at the deck. Each node's top is then `armUp - gap - slot` above the deck, so at most the arm's underside less 0.6 m, and its base is never under the deck.
- The slot order is the same in both passes, since both iterate `nodes` and count every roof node, including a feed.
- The test is an assertion added to case 2, not a new case. A switch and a breaker go on `roof:0:0`, and the case checks that each top is under the arm and each base is on or above the deck at 12.5 m. The switch needs 0.6 + 2.752 = 3.35 m, so the old code (base 0.3 m, arm at 2.0 m) would fail it. The expected value comes from the rule (under the arm), not from the code's output.

**The other changes since round 1:**
- **The fixture path (could-improve 1).** Case 3(a) now reads `puzzles/city/city-two-ways-round.city.json`, P0's location, and the branch has merged `origin/main` with P0 in it. The case passes.
- **`FEED_POLE_KEY` (could-improve 2).** It is a literal again in `powerkit.ts`. 4b6a598 had it importing `componentmodels`, and d1a93dd reverted that for the purity pin. Case 3(a) gains `expect(FEED_POLE_KEY).toBe(COMPONENT_MODELS.feed.key)`, so a re-picked feed now fails loudly. That is what the could-improve asked for.
- **`PACK_FRONT` (could-improve 3).** It is one named constant, used by `yawToward` and by the building fallback direction. Its value is +z as before, so nothing turns.

**Test count against main.** Still 8 `it(` lines added or rewritten, under 15. Round 2 added no new case. `src/grid/` and `src/night/` are untouched, and there is no new dependency.

**Could improve (round 2, optional)**
1. **Stacked models on one roof overlap.** Stacked nodes on one roof sit at the same x/z, 1.0 m apart in height. A switch is 2.752 m tall, so the second node's top sits about 1.75 m inside the first model. This was the same before round 1 (bases 0.3 and 1.3 m), so it is not new. A step of `max(h)` + a small gap, or an offset along the arm, would separate them. No current city puzzle puts two nodes on one roof (not checked beyond `city-two-ways-round`, which has no roof node).
2. **Raised arms move the wire seat above the checked height.** Raising an arm moves the drawn wire seat above the 2.0 m that `src/city/circuit` checks clearance against. It is higher, so clearance only improves, but the drawn and checked geometry differ on those roofs. One line in the ticket's report would say so.
