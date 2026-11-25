ticket: 081-FX2-sparks
assessment: partly
must-fix: 1

Round 2: this review is of FX2 as Josh amended it on 25 Nov 2026 (criteria 3, 4, 4b, 4c, 6, 7, 8 and the count). It replaces the round-1 review (meets, must-fix 0), which judged the first build, commit 106764f. The amended work is commits 60b2bc9 (code) and 716bb3a (the measure). Judged against `origin/main`. Local `main` is stale, so `main...` shows the whole goal branch.

## What the ticket asked for, as I understood it
Make a live break look violent in normal play: dense, big, white-hot sparks that fly metres and bounce, with pops, a flickering glow and warm crackle arcs across the cut. A repaired cut, or one current no longer reaches, must stop on that frame, with only the sparks already in flight left to fall. `fx=all` stays the worst case, labelled "measure only". The budget is measured again with the pack's own textures and meshes.

## Does the branch do it?
1. **Textures.** Met, unchanged from round 1 (`fxTextures`, `fxFallback`). The fallback line now also names `lightning`. Test: "fxTextures: a manifest listing two ids ...".
2. **Pool.** Met. `step` gains an optional `bounces` argument, and the round-1 pool case still stands without a rewrite (`fx.ts` `createParticlePool`). Test: "the pool: particles fall under gravity ...".
3. **Draw meshes and pool sizes.** Met. `createFxLayer(emitters)` sizes each layer from `n = emitters.length`:
   - sparkle 512n+256, soft spot 48n+16 (+n glow slots), smoke 24n, spark 512n, shard 128n+32, lightning 8n. These match the ticket's numbers.
   - There are 6 instanced meshes: sparkle, soft spot, smoke, lightning, spark and shard. All are additive with `depthWrite` off, start at count 0, and have their colour attribute from build. The lightning layer has a colour per instance, so FX3's arcs can share its call.
   - Per frame, only the pool arrays, the matrices, the colours and `count` are written.
3b. **Pack meshes.** Met, unchanged (`fxMeshes`, `unitGeometry`). Test: "fxMeshes: with the spark loaded and the shard missing ...".
4. **Live-break sparks, extreme.** Met in `breakAt`:
   - A burst every 0.05 to 0.12 s gives 18 to 26 sparks, 4 to 6 chips and a 2.5 m flash over 0.12 s.
   - A pop every 0.6 to 1.2 s gives 50 to 70 sparks at 1.5 times the speed and a 5 m flash over 0.25 s, white to amber.
   - Sparks leave at 3 to 8 m/s sideways and 2 to 7 m/s up, a fifth of them 0 to -3. They live 0.7 to 1.4 s. The spark layer has gravity 9.8 and drag 0.6.
   - Sparkle sprites are 0.9 m. A streak is 0.15 m thick and 0.5 to 1.5 m long, set by speed (`paint`).
   - `hotColour` gives white-hot to 30 % of life, then yellow-orange, then orange-red. Blue never goes above half of red.
   - A steady flickering glow is 1.5 m across. Smoke comes about twice a second, 1.5 m across, rising at 1 m/s.
   - Bounce: in `step`, a fall below the floor is reversed at 0.35 and the sideways speed cut to 0.6. One in three splits into two at half size. The second touch kills it.
   - The floor is the lower pole foot of the cut span (`poleFoot` from `draws.pieces`), or else the top of the ground plane (`cityview.ts`).
   - `sparkingCuts` is unchanged, and brownout is not read. Test: "sparkingCuts: a live cut sparks; an unreadable cut, and a cut whose fault is repaired, do not".
4b. **Crackle arcs.** Met. `cutArcs` is pure and allocation-free. It works from a hash of the cut id and time slot, using two channels, with the second on only half its slots, so at most 2 arcs.
   - Arcs flick for 0.05 to 0.12 s, with a period of 0.08 to 0.25 s.
   - Each end is 0.3 to 1.5 m either side of the span's arc-length middle, clamped to the span. The arc is 0.25 to 0.4 m wide and flipped at random.
   - Colour is r 1, g 0.95 to 0.7, b 0.8 to 0.3, so blue is at most 0.8 of red.
   - `update` draws arcs only for an emitter fed this frame, with a 1 m flash on each new slot.
   - Test: "cutArcs: over 2 s every arc lies on the span within 1.5 m ...". It checks the ends, the count of at most 2, blue at most 0.8 of red, the width, and that it repeats.
4c. **A repaired cut stops at once.** Met in code:
   - `cityview.ts` calls `breakAt` only for cuts `sparkingCuts` returns. A cut that has been repaired, or that current no longer reaches (a switch thrown back), is not fed.
   - In `update`, an emitter that was not fed has its burst, pop, smoke and arc timers reset, and is skipped for the glow and the arcs that frame. Sparks in flight finish.
   - Test: "createFxLayer: a cut that stops being fed shows no glow or arc on the next frame, spawns nothing more, and is empty within 1.5 s". The ticket's "no layer's count rises" is checked on soft spot and smoke only, because the ticket's own split rule lets the spray layers grow by a split. The final all-zero check after 1.5 s still fails if emission went on.
   - The in-pane part ("repair `l_e2`'s cut in normal play") is browser work and is not recorded on the branch.
5. **Repair flashes.** Met, unchanged (`repairedFaults`, `repairAt`). Test: "repairedFaults: ...".
6. **Dev switches.** Met:
   - With `fx=all`, every cut is fed every frame and every fault place flashes about once a second.
   - One console line at load: "3D effects: fx=all: every cut sparks whatever its state (measure only)."
   - The `perf=1` line carries the same words and the peaks.
   - The overlay canvas corner draws the notice.
   - In production, `fxSwitch` returns "on".
7. **Budget.** Partly. The amended block in `docs/design/081-F-measurements.md` has 2 rows, both before power:
   - `fx=0`: 8.20 ms, 1,774 calls.
   - `fx=all`: 8.10 ms, 1,780 calls (+6, cap 6), 12 programs, whole frame 16.60 ms.
   - The real textures and meshes were in, with no fallback line.
   - It gives the peak alive count per layer: sparkle 474 of 1,280, spark 731 of 1,024, shard 126, soft spot 13, smoke 8. Lightning is not in `peaks()`.

   What is there passes with a wide margin. But criterion 7 asks for three runs (`fx=0`, as played and `fx=all`), each with the CPU median before power **and after the Relight**, and for "no new program ... to the end of the Relight". The as-played run and both after-Relight medians are missing from the amended block. So the after-Relight pass line and the program check through the Relight are not shown for the amended effect.
8. **Josh plays it.** For Josh.

**Tests.** `npx vitest run --maxWorkers=2 src/render3d/fx.test.ts`: 7 passed, 144 ms of tests, 1.15 s in all. That is 7 cases added against `origin/main` and none rewritten, inside the ticket's 8 and the cap of 15. Each is named for a rule, runs on fixtures only and has no city build. There is no report-only test and no near-duplicate.

**Files.** The builder's commits touch only `src/render3d/fx.ts`, `fx.test.ts`, `cityview.ts` and `docs/design/081-F-measurements.md`. All four are listed. No dependency is added. `src/grid/` and `src/night/` are untouched, and `fx.ts` imports only a type from `../grid`.

## Rule conflicts and risks
- None against the hard rules or the GDD. Sparks still mean a live, readable break and only that: `sparkingCuts` uses E2's rule, and `state.sparking` holds only readable damaged cables. The arcs are warm and stay on the cut span.
- When the `spark` mesh is missing (CI, a fresh clone), sparks fall back to the sparkle layer. That layer steps with gravity 6 and drag 1.4, not the 9.8 and 0.6 of criterion 4, so the fallback spray flies shorter. Josh now has the meshes, so this matters only without the pack.
- The arcs' ends are clamped to the span. On a span under about 3 m, an end could sit at the span's end, which is a pole's insulator, and criterion 4b says never. I did not check whether `city-two-ways-round` has a cut span that short.
- The steady glow's flicker is `(0.6 + 0.4 r) * 0.9`, so 0.54 to 0.9 rather than 0.6 to 1.0. This is a look, for Josh's eye.

## Must fix
1. `docs/design/081-F-measurements.md`, the "FX2 amended" block: add the rest of criterion 7's runs for the amended effect, in the same session:
   - `fx=0` and `fx=all` after the Relight;
   - the as-played run (throw `sw`, repair `l_e2`), before power and after the Relight;
   - draw calls, programs, CPU median and whole frame for each.

   Then say whether the program count stayed at 12 from the first frame to the end of the Relight. This shows the after-Relight pass line and the no-new-program rule hold with the extreme sparks. No code change is expected. If a row fails, the stop rule applies.

## Could improve
1. `src/render3d/fx.ts` `sparkOut`: when the spark mesh is missing, the sparkle layer's gravity and drag (6 and 1.4) apply to the break sparks. Spawning them into a layer stepped at 9.8 and 0.6, or giving them their own fallback layer, would keep criterion 4's flight without the pack. It may cost a draw call, so check it against the cap first.
2. `src/render3d/fx.ts` `cutArcs`: on a span shorter than about 3.2 m, shrink the reach to stay 0.1 m or so inside the span's ends, so an arc never ends at an insulator.
3. `src/render3d/fx.ts` `peaks()`: add the lightning count (it is direct instances, so the most drawn at once), so the reply's "peak alive count per layer" covers all six.
4. Carried from round 1, still open:
   - `sharedFx()` starts while the city's `load()` is still running, not after it (criterion 3b's "after the city's models").
   - `resetSharedFx` and `FxLayer.clear()` have no caller.
   - The page-cached pack geometries are pushed into the layer's `geoms` and disposed with it.
   - The "a reset" check in the `repairedFaults` test is really the first frame.
5. The ticket's 4c browser check (repair `l_e2` in the pane in normal play, and nothing of the cut left within 1.5 s) is not recorded anywhere. A line beside the measure block would close it.
