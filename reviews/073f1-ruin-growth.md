ticket: 073f1-ruin-growth
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section F1 of ticket 073 asks for stage 13, the ruin's growth, as a pure era stage in `src/city/ruin/`. It covers spread from soil by `wild`, then patches, clumps, saplings, park trees, vines and tree-vines, with roofs held behind `RUIN_ROOF_GROWTH`. Every add keeps 0.3 m clear of every standing piece. T-1 and T-2 (option G) hold. The ticket also asks for the three switches, a kit pin in `src/render3d/` and the growth digest pinned on the four pin cities. This is round 2. Round 1 raised one must-fix: the growth did not keep clear of stage 7's facade pieces.

## Does the branch do it?
I ran `npx vitest run --maxWorkers=1 src/city/ruin/ src/render3d/ruinpin.test.ts`: 7 files, 94 tests, all pass (91 in round 1). I did not run the whole suite or the typecheck, as the load note asked. The main session's gate ran them, and its one failure (`powerkit.test.ts` fitLine) is also on the base.

Criteria 1 to 13 stand as in round 1: nothing round 1 found met has been undone. Round 2 changes only `world.ts`, `grow.ts`, `kit.ts`, two tests in `src/city/ruin/` and `ruinpin.test.ts`.

**Round 1's must-fix 1 (0.3 m clear of every standing piece): fixed.**
- `world.ts` now puts the facades layer's pieces in `obstacles`, each with its height range:
  - `dressing` except glass;
  - `novelty`, through `CLEAN_ROOF_BOUNDS`;
  - `walls`: kit pieces with `scaleY` and their ladder boxes rotated by quarter yaw, plus code escapes at `CODE_ESCAPE_W_M` x `CODE_ESCAPE_D_M` up to their highest box.
  
  The party-wall kit is left out, and a comment gives the reason. Every ruin slot tests against `obstacles` with `CLEAR_M` through `free`, so the margin applies to all of them.
- The bounds are a typed copy in `kit.ts` (`FACADE_BOUNDS`, `CODE_ESCAPE_*`). `ruinpin.test.ts` pins them equal to `DRESS_BOUNDS` (non-glass) and `WALL_BOUNDS`, and pins the code escape's key and footprint to `wallkit`.
- A vine draped over an awning or canopy ignores only its host, through the `at` tag (`spot` of the host's placement x/z). `world.ts`'s `hostOf` uses the same placement, so the tags match.
- An unknown dressing, wall, novelty or roof key now throws a `CityStageError` (R-6). This also takes round 1's could-improve 3.
- New named-run test in `named.test.ts`: "no non-patch add meets a stage 7 piece…". It checks every add against the tech pass's own `s7Boxes`, which is an independent oracle and not the ruin's copy. It also checks against ground props, traffic pieces and earlier era adds. It passes on all 20 named runs. `PIN_GROWTH` is re-taken on seeds 1/2/3/8.

The test imports `../tech/boxes`. That is a test file, which `kit.test.ts`'s purity scan leaves out on purpose, and no source file in `src/city/ruin/` imports another stage folder.

**Could-improves taken:**
- 1: `stage.test.ts` "and never fewer pieces placed" checks placed patches, saplings and clumps across 0.2/0.5/0.9.
- 2: the dead mound condition is gone.
- 4: the leftover `void blockOfBuilt` is gone.
- 5: a placed park tree no longer adds to `underSpanSpots`.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. The non-test files in `src/city/ruin/` still import only `./`, `src/core/` and `src/city/pipeline/`.
- All files are within the ticket's list. There is no new dependency, nothing changes in `src/core/` or `puzzles/locked/`, and no GDD Decided rule changes. Roof growth stays behind `RUIN_ROOF_GROWTH = false`.
- Risk: `FACADE_BOUNDS` is a hand copy. If stage 7 gains a new key, `world.ts` throws, and if its sizes change, `ruinpin.test.ts` fails. But `ruinpin.test.ts`'s comparison sits on facades kit modules that need no assets, so it always runs. That is the right failure mode.

## Must fix
none

## Could improve
1. The new named-run test checks for overlap at zero gap, not the `CLEAR_M` margin that criterion's wording asks for. The code applies the margin through `free`, but the test would not notice if the margin were dropped. Grow each add's rect by `CLEAR_M` for saplings, clumps and park trees, the slots that keep it, so the test checks the rule as worded.
2. The same test skips host vines' stage 7 check entirely (`hostVine`). The code only lets a host vine ignore its own host. Checking host vines against every stage 7 box except the one at their host's spot would cover that case too.
3. Tree-vines and post vines are exempt from every check in that test. That is right for their own tree or post. A short comment, or a check against stage 7 boxes other than their host, would make the exemption narrower.
