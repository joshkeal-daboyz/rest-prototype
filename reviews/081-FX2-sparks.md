ticket: 081-FX2-sparks
assessment: meets
must-fix: 0

Round 3. This review covers FX2 as Josh amended it on 25 Nov 2026, at HEAD 49248a5, judged against `origin/main`. Round 2 at 7a546bb was "partly", with 1 must-fix: criterion 7's as-played and after-Relight runs were missing. Since then, commits 1ba38e0 and 49248a5 added only a block to `docs/design/081-F-measurements.md`. No code changed, so this round checks that block and repeats the round-2 findings without re-raising them.

## What the ticket asked for, as I understood it
In normal play, a live break should look violent: dense, big, white-hot sparks that fly far and bounce, with pops, a glow and warm crackle arcs. A repaired or unreached cut stops on that frame. `fx=all` stays the measure-only worst case and is labelled as such. The 60 fps budget is measured again with the pack's own textures and meshes.

## Does the branch do it?
1. **Textures. Met** (`fxTextures`, `fxFallback`). Test: "fxTextures: a manifest listing two ids ...".
2. **Pool. Met** (`createParticlePool`, with the optional floor on `step`). Test: "the pool: particles fall under gravity ...", not rewritten.
3. **Draw meshes and pool sizes. Met** (`createFxLayer(emitters)`).
   - The six instanced layers are additive with `depthWrite` off.
   - Pools are sized per cut as the ticket says.
   - The lightning layer has a colour per instance.
   - Unchanged since round 2.
3b. **Pack meshes. Met** (`fxMeshes`). Test: "fxMeshes: with the spark loaded and the shard missing ...".
4. **Live-break sparks, extreme. Met** in `breakAt`. The bursts, pops, speeds, lives, sizes, colour by age, glow, smoke and the one bounce with its split are as listed in round 2. `sparkingCuts` keeps E2's rule. Test: "sparkingCuts: a live cut sparks; an unreadable cut, and a cut whose fault is repaired, do not".
4b. **Crackle arcs. Met** (`cutArcs`: pure, hashed, at most 2, warm). Test: "cutArcs: over 2 s every arc lies on the span within 1.5 m ...".
4c. **A repaired cut stops at once. Met** in code:
   - `cityview.ts` feeds only the cuts `sparkingCuts` returns.
   - `update` resets an unfed emitter's timers and skips its glow and arcs that frame.
   - Test: "createFxLayer: a cut that stops being fed shows no glow or arc on the next frame ...".

   The in-pane part is not written down on its own. The new block does say Josh repaired the break in every run.
5. **Repair flashes. Met** (`repairedFaults`, `repairAt`). Test: "repairedFaults: ...".
6. **Dev switches. Met.** `fx=0` and `fx=all` are behind DEV. `fx=all`'s "measure only" notice shows in the console line, the `perf=1` label and the canvas corner.
7. **Budget. Met** (round 2's must-fix is done). The new block "FX2 amended, criterion 7 completed" was taken in one session, at the puzzle's framing, with Josh playing (throw `sw`, repair the break). It has all three runs:

   | Run | Draw calls | Programs | CPU before power | CPU after the Relight | Whole frame |
   | --- | --- | --- | --- | --- | --- |
   | `fx=0` | 1,774 | 11 | 10.50 ms | 10.30 ms | 16.70 ms |
   | normal play | 1,778 | 12 | 8.80 ms | 8.30 ms | 16.70 ms |
   | `fx=all` | 1,779 | 12 | 8.70 ms | 8.90 ms | 16.70 ms |

   - **CPU time.** `fx=all` adds nothing over `fx=0` before power or after the Relight, and both medians are well under 16.7 ms. The block says the `fx=0` run sat about 2 ms high from agent load, so that comparison is generous. Against the quiet `fx=0` of the block above it (8.20 ms), `fx=all` after the Relight is +0.70 ms, still under the 1.5 ms limit. The pass does not rest on the noisy row.
   - **Frame time.** The whole frame is 16.70 ms in every run, which is the vsync.
   - **Draw calls.** At most 5 more (cap 6).
   - **Programs.** The count holds at 12 from the first frame after the models load to the end of the Relight in both effect runs. The one extra over `fx=0` is the effects material, as in the first block.
   - **Peaks.** The peak alive counts per layer are in the earlier amended block.
8. **Josh plays it.** For Josh.

**Tests.** `npx vitest run --maxWorkers=2 src/render3d/fx.test.ts`: 7 passed, 146 ms of tests, 2.36 s in all, including transform and collect. That is 7 `it(` cases added against `origin/main`, within the ticket's 8 and the cap of 15. Each is named for a rule, uses fixtures only and builds no city. None is report-only or a near-duplicate.

**Files.** The new commits touch only `docs/design/081-F-measurements.md`, which is listed. The rest of the branch is as in round 2:
- The builder's files are `fx.ts`, `fx.test.ts` and `cityview.ts`.
- `tickets/` and `reviews/` changes are the main session's.
- No dependency is added.
- `src/grid/` and `src/night/` are untouched.

## Rule conflicts and risks
- None against the hard rules or the GDD. Sparks show only at a live, readable break. The arcs are warm and stay on the cut span.
- Carried from round 2, not raised again as blockers:
  - The sprite fallback for sparks steps at the sparkle layer's gravity and drag (only without the pack).
  - On a span under about 3 m, an arc's end could clamp to the span's end (may occur, not checked).
  - The glow flickers at 0.54 to 0.9 rather than 0.6 to 1.0.

## Must fix
none

## Could improve
1. `docs/design/081-F-measurements.md`: re-take the `fx=0` row on a quiet machine. The pass holds either way, as shown above, but a clean baseline would make the table read on its own.
2. Add one line to the same block recording criterion 4c's pane check: on repairing `l_e2` in normal play, the spray, glow and arcs stopped within a frame and nothing was left within 1.5 s.
3. Round 2's could-improve items 1 to 4 still stand: the `sparkOut` fallback flight, the `cutArcs` reach on short spans, lightning in `peaks()`, and the four carried from round 1.
