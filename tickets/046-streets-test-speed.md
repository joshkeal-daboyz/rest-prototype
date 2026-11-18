# 046 · CI is red on every push: a wall-clock limit in the streets test

owner: renderer (src/render3d/)
status: open
branch: `ticket/046-streets-test-speed`

## Josh's words (17 Nov 2026)
> "yes fix the streets speed test"

## Finding
- Every push to `main` since commit `0636d5b` fails CI on one test: `src/render3d/streets.test.ts` > "centre lines" > "is pure and deterministic on every map and fast".
- The test times a loop over every map (`townLayout(load(f))` then `dashLayout` twice) and asserts `performance.now() - t0 < 3000`. It takes about 4.2 s on the GitHub runner and 3.4 to 3.9 s on Josh's loaded PC.
- The timer covers `townLayout` as well as `dashLayout`; ticket 042 A added a corner computation to the layout, which may be part of the growth.
- A tight wall-clock limit in a unit test breaks under load (see the CI-safe tests rule: no tight timers). The game and the 3D view are not affected.

## Goal
`npm test` is green on GitHub's Linux runner and on Josh's PC under load, with the streets test still proving the centre-line layout is pure and deterministic on every map.

## Acceptance criteria
- [ ] (Vitest) The wall-clock assertion is removed from the test. If the builder keeps any timing check, it is a loose ceiling of at least 30 000 ms and says in a comment that it only catches a runaway loop. Default: remove it, and rename the test to drop "and fast".
- [ ] (Vitest) The purity and determinism checks stay as they are: for every map, `dashLayout(town)` called twice gives equal results.
- [ ] (Vitest) The test count of `streets.test.ts` does not shrink; no other test changes meaning.
- [ ] (Builder report) One-off timing of `townLayout` over every map in `puzzles/` (a scratch script or temporary test, NOT committed): the time per map and the total, in ms, on Josh's PC, and the same for `dashLayout`. Absolute numbers only; no comparison checkout of older commits is needed. Say whether any single map stands out.
- [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/streets.test.ts` and one `npx tsc --noEmit`. No dev server, no browser.
- [ ] (Main session, after Josh's merge word) The GitHub Actions run for that push is green.

## Files
- **May touch:** `src/render3d/streets.test.ts` only.
- **Must not touch:** everything else, including every source file in `src/render3d/`. The timing script lives in the scratchpad or is deleted before the report.

## Interfaces
None. No new types, events or dependencies.

## Open questions
None. If the timing shows `townLayout` has become slow enough to matter in play (say over 100 ms on one map), the builder reports it and a separate ticket is cut; this ticket does not change source.

## Within approved scope?
Yes. A test fix on merged work; no Decided rule, dependency or schema is touched.
