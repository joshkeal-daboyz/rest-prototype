ticket: 081-FX4-fuse-blow
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
FX4: when a fuse blows on the city, a cold-white bolt runs along each served lamp path towards the fuse box, landing on `BLOW_TIMING.popAt`, then a `BLOW_SPARKS` burst (twice a live break's) at the box; undo/reset stop it; `fx=all` blows the first rated box every 2 s. FX3, folded in: Relight bursts at each **target** lamp as it lights, and cold blue-white brownout arcs (at most 3) at the insulators of the poles of an over feed, each with a small soft-spot flash. 3 test cases, in `fx.test.ts`; files `fx.ts`, `fx.test.ts`, `cityview.ts` (notify and frame-loop FX calls).

Round 2. Round 1 reviewed commit 6522162 (partly, must-fix 1). This round reviews the fix commit 7566be9. Head 2ff7fc4 only merges `main` with V4 on top. `npx vitest run --maxWorkers=2 src/render3d/fx.test.ts`: 10 passed, 1.62 s. That is still 3 new cases; the fix added assertions, not cases.

## Does the branch do it?
**FX4**
1. The bolt: met. `notify` keeps each `fuse:blown` (`cityview.ts`, `blows`, start stamped on the first frame). `blowBolts(routes, t, out)` in `fx.ts` takes routes that `routeOf` builds from `wiresOfLine`. The head runs from `len_m` at t=0 to 0 at `popAt`, then the tail shrinks over `pop`. Nothing is drawn at or after `popAt + pop`, or with no routes. It draws through `arcAt` into FX2's lightning layer, tinted cold white (0.9, 1.1, 1.6). The test is "a blow: each bolt runs from its lamp's end...".
2. The burst: met. `blowAt` gives 140 sparks at `sparkOut(e, 2.2)` (the pop has 70 at 1.5), plus chips and two soft-spot flashes, all from FX2's pools. `blowBurstDue` fires once, at `popAt`, or at 0 with no path. The test counts one burst on a 60 fps clock for both cases.
3. The served wires stay dead: `lineFlow` is untouched. Browser only.
4. Undo, reset, a new blow: met in code. The frame loop drops a non-synthetic blow once its `faultId` leaves `state.faults`. The test's "undo clears it" part asserts `layer.clear()` only (Could improve 1).
5. `fx=all`: met. A synthetic blow on the first rated `fusebox` every 2 s.
6, 7, 8: browser.

**FX3**
1. Relight bursts: met in code. `relightBursts` gives lamps whose `nodeArrive` falls in `(prevT, t]`, in arrival order. `burstLamps` is built from `puzzle.target` only, so bursts follow the clock, not clicks. The test uses a fixture plan rather than P0 through `relightFrame` (Could improve 2).
2. Brownout arcs: met (round 2). `arcSpots` gives arcs only while `brownout`, only on powered lines whose `feedOf` feed is `over`, at most `max`, each for a hashed 0.08 to 0.15 s window. Arcs run from the insulator out along the job wires, are tinted cold (0.8, 1.0, 1.4) and are drawn in the lightning layer. The "brownout arcs: ..." test is a real test of the rule.
   - **Round 1's missing soft-spot flash is now built.** `FxLayer.arcFlashAt` in `fx.ts` makes a 1 m, 0.05 s cold flash (0.8, 1.0, 1.5). `drawFx` in `cityview.ts` calls it beside each brownout `arcAt`, in both the normal-play and the `fx=all` loops, at the arc's middle (0.3 m from the insulator).
   - The blow test now asserts `alive() === 1` after `arcFlashAt`, so it fails if the method stops spawning.
   - It is called on every frame an arc shows, not once at the arc's start as round 1 suggested (Could improve 5). That is a budget point, not the criterion.
3. `fx=all`: bursts every 0.5 s round the target lamps, and arcs capped at 24 ports (Could improve 3).
4, 5: browser.

**Count:** 3 added, as the ticket allows. No report-only test, no city build, and the file runs in under 2 s.

## Rule conflicts and risks
- No GDD Decided rule touched: the effects play over the state the grid already set, and input is not blocked. `src/grid/` and `src/night/` are not touched, and there is no new dependency.
- Files: only `fx.ts`, `fx.test.ts` and `cityview.ts` (`drawFx` and `notify`), within the ticket's list. The round-2 fix stays inside the same three files.
- `fx.ts` does `import type { RelightPlan } from "../render/relight"`, as `relight3d.ts` and `windows.ts` already do. X1's removal of `src/render/` may need it moved.
- `blowAt` passes `blowAtE as unknown as FxEmitter`. This is safe today, because `sparkOut` and `chipOut` read only `x y z ground`.
- In 13, a repair that blows again at once gives both a repair flash and a blow at the same box. That is probably right, but Josh should see it.

## Must fix
none

Round 1's item 1 (the brownout arc's soft-spot flash) is fixed in 7566be9, as described above.

## Could improve
1. `fx.test.ts`, the blow case: the "undo clears it" clause asserts `layer.clear()`, which is not criterion 4's rule (a blow stops when its fault leaves `state.faults`). Either move that check into a small pure helper the test can reach, or drop the clause from the case's name. `expect(BLOW_SPARKS).toBeGreaterThanOrEqual(140)` asserts a constant and can go.
2. FX3 criterion 1's test was specified on P0 through `relightFrame`'s plan. The fixture version suits the policy, but the reply should say it was swapped.
3. `fx=all` arcs: drop the 24-port cap, or say in the reply that it falls short of "every job pole", so the budget measure is the worst case the ticket meant.
4. `blowAt`: pass a plain `{x, y, z, ground}` type to `sparkOut`/`chipOut` instead of the `unknown` cast.
5. `cityview.ts` `drawFx`: `arcFlashAt` runs every frame an arc is on, as its doc says, so each arc keeps about 3 short flashes alive at 60 fps.
   - In play, with at most 3 arcs, that is about 9 soft spots.
   - Under `fx=all`, with up to 24 ports, it may take about 72 of the soft pool's `48n + 64` (may occur, not checked on a city). The pool reuses its oldest, so a blow's long flash could be cut short during the measurement.
   - Firing the flash once per arc window, on the first frame of its slot, would match FX2's "one flash on each new arc" and keep `fx=all`'s peak counts honest.
