ticket: 016-blow-every-lamp
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
A: `fuse:blown` gains `lamps`, which lists every lamp whose load counted toward the blown fuse, each with its line path from the fuse. B, as amended by Josh: streaks run at one shared speed from the fuse to every lamp (0–0.4 s). Then every line on those paths glows together (0.4–0.7 s), every lamp sparks, flares and crackles at once (from 0.5 s), and the fuse pops at 0.7 s, for a total of 1.3 s. With no path, the fuse pops at once as before.

## Does the branch do it?
Round 2. I reviewed `git diff main...HEAD` at a4791dd (interface 33a436e, A 6d82b13, B 1e9a676, review fixes 0df4918, B amendment a4791dd).

I checked the branch out clean in a detached worktree. `npm run typecheck` is clean. `npx vitest run` gives **3 failed / 266 passed**. All three failures are in `src/grid/blownlamps.test.ts` and have the same cause: `ENOENT puzzles/ladder-08-why-it-blew.json`. That file is not committed on this branch or on `main`. It exists only as an untracked file in the main working tree, which is why the same tests pass there (88/88 for the ticket's test files). See Must fix 1.

**Round-1 must-fix items**
1. *"No earlier settle" test.* Fixed in a way round 1 accepted. The test is renamed to "a repair-triggered blow on a two-lamp box…". The dead first half is gone, and it now asserts what the event really carries (`culprit: "a"`, `lamps` a,b, and the culprit's path equals `path`). It has no comment saying `culprit: null` can't be reached from an emitted blow. That is acceptable, so the criterion "culprit null still lists lamps" counts as answered by the code, not by a test. `blownLamps` doesn't read `before`, so its result can't depend on the culprit.
2. *Cap behaviour.* Fixed. The pure `lampTreatment(index)` in `shock.ts` returns `LAMP_STREAK_AND_FLARE` / `LAMP_FLARE_ONLY` / `LAMP_DROPPED`. It is used in `notify` (to drop lamps) and in `rebuildSlotPath` (to decide which lamps get a branch). The draw loop's `min(count, MAX_BLOW_LAMPS)` agrees with it. The "lampTreatment caps" tests check lamps 0–7 get a streak, the 9th onward flare only, the 33rd onward are dropped, and 12 lamps split 8/4/0.

**A: grid-simulator.** Unchanged since round 1, where every item was met. The second-trap test still doesn't sum file loads (still could-improve). The `culprit.test.ts` edit was accepted in round 1.

**B, as superseded by the amendment**
- *Run 0–0.4 s, shared speed, early streaks wait at their lamp, no crackle yet.* Met. `headDistance`/`streakLength` give one speed. In `drawSequences`, `bh = min(head, len)` holds an early head at its lamp. The crackle is now gated only on `lampSpark`, so it can't fire on arrival. `arrivalTime` is tested but no longer drives anything (see Could improve).
- *Lines glow 0.4–0.7 s, envelope `lineGlow`, streaks fade as glow rises.* Met. `lineGlow` and `streakFade` in `shock.ts` are tested at 0, 0.4, 0.43, 0.46, 0.5, 0.6, 0.65, 0.7 and 1.3.
- *Lamps spark from 0.5 s for 0.3 s, all at once, with spark rays plus flare plus crackle.* Met. `lampSpark` is tested at 0, 0.46, 0.5, 0.65, 0.8 and 1.3. The draw loop iterates all `slotLampCount` lamps, so up to 32 lamps get rays from `sparkRay` and the hash crackle. The flare uses `lampFlare(age, LAMP_SPARK_AT)` in the slot loop.
- *Pop from 0.7 s for 0.6 s, `sequenceTotal` 1.3, no path unchanged.* Met. `popStart` drives `sequencePhase`, `fuseIntact` and `popFraction`. These are tested in `shock-lamps.test.ts` and in the updated `readable-failures.test.ts`. With `lamps: []`, `slotLineCount` is 0, so `hasPath` is false and the fuse pops at 0 with no run, glow or spark. `sequenceTotal(false)`, `sequencePhase(0.5,false)` and `fuseIntact(0,false)` are tested. The order (glow, then spark, then pop) is asserted in "order: glow starts, then spark, then pop".
- *Dedup glow-line helper, lines past `MAX_BLOW_LAMPS` still glow, `MAX_GLOW_LINES` 64 cap tested; one path, one stroke per pass.* Met. `collectGlowLines` has three tests covering the trunk listed once, lamps 9+ included, and the cap at 64 with extras dropped. `drawSequences` builds one path from `glowLines[s]` and strokes it twice (the soft pass and the core pass). The streak pass and the head pass are also each one path.
- *Deterministic spark geometry, no `Math.random`, up to `MAX_FLARE_LAMPS`.* Met. `sparkRay(lampIndex, ray, age, out)` is seeded by its indices. Its tests cover the window edges, determinism, distinct rays and lamps, outward motion, and 32 lamps × 12 rays with no NaN.
- *No per-frame allocation.* Met. `glowLines`, `glowN`, `sparkOut`, `lampNode/lampLines/lampLen` and `branchN/X/Y` are all allocated at creation. `blowTargets` allocates only in `notify`, once per blow.
- *Kept from B:* `blowTargets` with its fallback (tested), `MAX_BLOW_LAMPS`, and the one-stroke rule. These are kept as the amendment says.
- *Josh's browser check.* Not mine to judge.

**Both parts: gate green, test count grows.** **Not met on a clean checkout.** It passes only with the untracked ladder-08 file present.

## Rule conflicts and risks
- **The branch's tests depend on a file that isn't in git.** `src/grid/blownlamps.test.ts` reads `puzzles/ladder-08-why-it-blew.json`, which is untracked. Once merged, `npm test` on `main` fails on a fresh clone, in CI, or in a clean worktree gate.
- `src/grid/` purity is intact. `grid.ts` gains a closure over `Flow` with no DOM, timer or cross-folder import. The `node:fs` read is in a test file only. A stays in `src/grid/` and B in `src/render/`. `src/core/events.ts` and `puzzles/SCHEMA.md` changed only in the planned interface commit. No new dependency, and no GDD rule, number or payload meaning changed.
- 3D portability: `blownLamps` depends only on `Flow`. 015 A has to carry it to the merged flow, as the ticket notes.
- Process: A and B are on one branch (`…-a`) instead of two. The main session can still merge it as one unit. This does not block.
- `MAX_FLARE_LAMPS` = 32: lamps past 32 get no flare or spark, and because `notify` breaks before `collectGlowLines`, their lines don't glow either. The cap is tested and no panel comes near it.

## Must fix
1. **`src/grid/blownlamps.test.ts` must pass on a clean checkout.** Three tests read `puzzles/ladder-08-why-it-blew.json`, which isn't committed. Pick either:
   - (a) The builder replaces the file read with an inline fixture in the test that copies ladder-08's nodes, lines, loads, ratings and faults. That stays within `src/grid/`.
   - (b) The main session gets `ladder-08-why-it-blew.json` committed to `main` through the puzzle loop first, then rebases this branch on it.

   Expected effect: `npm run gate` is green in a detached worktree of the branch.

## Could improve
1. `src/render/shock.ts`: `arrivalTime` is tested but nothing in the renderer calls it any more. The streak waits through `min(head, len)` and the flare starts at `LAMP_SPARK_AT`. Keep it as documentation of the shared speed, or delete it along with its tests.
2. `src/render/map-renderer.ts`: the comment over the lamp draw still says "The lamp that blew a fuse flares". It now means every lamp that counted.
3. `shock-lamps.test.ts`: for no path, test `popFraction`, `sequencePhase` and `fuseIntact` at more of the listed boundaries (0.4, 0.6) to match the "for path and no-path" wording. The behaviour is already correct by construction.
4. `blownlamps.test.ts`, second trap: sum the lamps' file loads against `load`, as the first test does (carried from round 1).
5. `CULPRIT_FLARE_SECONDS` could be renamed `LAMP_FLARE_SECONDS`, since nothing is culprit-specific any more.
