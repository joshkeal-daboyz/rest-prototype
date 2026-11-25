ticket: 081-FX4-fuse-blow
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
FX4: when a fuse blows on the city, a cold-white bolt runs along each served lamp path towards the fuse box, landing on `BLOW_TIMING.popAt`, then a `BLOW_SPARKS` burst (twice a live break's) at the box; undo/reset stop it; `fx=all` blows the first rated box every 2 s. FX3, folded in: Relight bursts at each **target** lamp as it lights, and cold blue-white brownout arcs (at most 3) at the insulators of the poles of an over feed. 3 test cases, in `fx.test.ts`; files `fx.ts`, `fx.test.ts`, `cityview.ts` (notify and frame-loop FX calls).

Reviewed: commit 6522162 only (the branch's merges of `main` and the goal branch are not this section's). `npx vitest run --maxWorkers=2 src/render3d/fx.test.ts`: 10 passed, 1.51 s (3 new).

## Does the branch do it?
**FX4**
1. The bolt: met. `notify` keeps each `fuse:blown` (`cityview.ts`, `blows`, start stamped on the first frame). `blowBolts(routes, t, out)` in `fx.ts` takes routes that `routeOf` builds from `wiresOfLine` (the signature is `routes`, not `(blow, wiresOfLine)`, which is fine). The head runs from `len_m` at t=0 to 0 at `popAt` (= run + glow = 0.7), then the tail shrinks over `pop`. Nothing is given at or after `popAt + pop`, or with no routes. `lamps` paths are used, else `path`. It draws through `arcAt` into FX2's lightning layer (lightning pool `8n + DIRECT_MAX`, no new mesh) and is tinted (0.9, 1.1, 1.6), so cold white. The test is "a blow: each bolt runs from its lamp's end..." (two routes, one with a reversed piece).
2. The burst: met. `blowAt` gives 140 sparks at `sparkOut(e, 2.2)`, against the pop's 70 at 1.5, so it is twice as many and faster. It adds 12 chips and two soft-spot flashes, the long one for `BLOW_TIMING.pop`, all from FX2's pool. `blowBurstDue` fires once, at `popAt`, or at 0 with no path. The test counts one burst on a 60 fps clock for both cases. The burst's place is `nodeCentre` of the box, not asserted (fine).
3. The served wires stay dead: `lineFlow` is untouched, so this is browser-only, as written.
4. Undo, reset, a new blow: met in code. The frame loop drops a non-synthetic blow once its `faultId` leaves `state.faults` (the grid's id is `blown-<fuse>`, so in 13 an undo of the re-blow back to the file's `f1` drops it correctly). Each event pushes its own blow. The test's "undo clears it" part asserts `layer.clear()` only, not this rule (Could improve 1).
5. `fx=all`: met, a synthetic blow on the first rated `fusebox` along one of its lines every 2 s.
6, 7, 8: browser.

**FX3**
1. Relight bursts: met in code. `relightBursts(plan, lit, lamps, prevT, t, out)` gives lamps whose `nodeArrive` falls in `(prevT, t]`, in arrival order. `burstLamps` is built from `puzzle.target` only (FX-Q4's targets-only reading), at L2's `lightPlaces` point, else the lamp's place. Bursts come from the clock, not clicks. `bloomAt` is a soft flash and 14 amber sparkle. The test is a fixture plan rather than "P0's file through `relightFrame`'s plan" as the criterion specified. It still fails if order or once-only breaks, and rule 2 favours fixtures, but the targets-only and no-hidden-lamp selection in `cityview.ts` is untested (Could improve 2).
2. Brownout arcs: **partly**. `arcSpots` is correct: only while `brownout`, only on powered lines whose `feedOf` feed is `over`, at most `max`, and a 0.08 to 0.15 s window hashed from port and slot. Ports are the insulator to 0.6 m along each non-cut job wire, tinted (0.8, 1.0, 1.4), blue at least red, drawn in the lightning layer. The test "brownout arcs: ..." holds two feeds with one over, plus a dead pole, and is a real test of the rule. **But the criterion's "It has a small soft-spot flash" is not built.** The `arcSpots` calls in `drawFx` (normal and `fx=all`) call `fx.arcAt` only, and `arcAt` queues a quad with no flash (Must fix 1).
3. `fx=all`: bursts every 0.5 s round the target lamps, and arcs with `every`, capped at 24 ports (`fxAllArcs`). The ticket says "on every job pole". The cap is a measure-only switch, so I only note it.
4, 5: browser.

**Count:** 3 added, as the ticket allows. No report-only test, no city build, and the file runs in 1.5 s.

## Rule conflicts and risks
- No GDD Decided rule touched: the effect plays over the state the grid already set, and input is not blocked. `src/grid/` and `src/night/` are not touched, and there is no new dependency.
- Files: only `fx.ts`, `fx.test.ts`, `cityview.ts`. The `cityview.ts` additions sit beside `drawFx` (route, port and lamp tables, then the calls) and in `notify`, which is within "notify and the frame loop's FX calls".
- `fx.ts` now does `import type { RelightPlan } from "../render/relight"`. `relight3d.ts` and `windows.ts` already do the same, so this is not new coupling. But X1 will delete most of `src/render/`, so the import may need moving then.
- `blowAt` passes `blowAtE as unknown as FxEmitter`. This is safe today, because `sparkOut` and `chipOut` read only `x y z ground`, but a later read of `e.span` or `e.id` there would crash at runtime with no type error.
- In 13, the repair that blows again at once gives both a repair flash (`repairedFaults`: `f1` leaves, parts shorter) and the blow at the same box. That is probably right, but Josh should see it.

## Must fix
1. `src/render3d/cityview.ts` (`drawFx`, the normal-play `arcSpots` loop; optionally the `fx=all` one): give each brownout arc its small soft-spot flash, as FX3 criterion 2 says ("It has a small soft-spot flash"). For example, an `FxLayer` method or a flag on `arcAt` that spawns a small, short `flash` at the insulator. It should fire when an arc starts, not every frame it shows, so the soft pool is not flooded. Effect: brownout arcs read as a flick of light at the insulator, as cut. No new test needed.

## Could improve
1. `fx.test.ts`, the blow case: the "undo clears it" clause asserts `layer.clear()`, which is not criterion 4's rule (a blow stops when its fault leaves `state.faults`). Either move that check into a small pure helper that the test can reach, or drop the clause from the case's name, so the name does not claim coverage it lacks. `expect(BLOW_SPARKS).toBeGreaterThanOrEqual(140)` asserts a constant and can go.
2. FX3 criterion 1's test was specified on P0 through `relightFrame`'s plan, with no hidden lamp bursting. The fixture version is policy-friendly. If the builder keeps it, say so in the reply so the main session can tell Josh the spec'd test was swapped.
3. `fx=all` arcs: drop the 24-port cap, or say in the reply that it is under "every job pole", so the budget measure is the worst case the ticket meant.
4. `blowAt`: pass a plain `{x, y, z, ground}` type to `sparkOut`/`chipOut` instead of the `unknown` cast.
