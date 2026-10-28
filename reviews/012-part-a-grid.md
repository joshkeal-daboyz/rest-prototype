ticket: 012-fuse-load-bar (part A)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
`GridState.fuseLoad`: for each fusebox, the total load of lamps lit by the feed's own flow downstream of it. It must be the same number the blow check compares to `rating`, and 0 when the fuse is unpowered or blown. Tested on an inline map and on battery-run (1 after the win, 3 at the blow), and documented in the ticket-002 interface block and SCHEMA.md.

## Does the branch do it?
- **Same number as the blow check:** yes. `settle()` in `src/grid/grid.ts` reads `fuseLoad` from the same `sub` map that the blow loop compares to `rating`, in the same pass. Nothing is computed a second time. `sub` adds up `loadOf`, which counts only lamps with `f.powered`, the feed flow. So it covers feed flow only, and lamps lit by a battery add nothing.
- **0 when unpowered or blown:** the line is `f.powered.has(fid) && !faulted.has(fid) ? sub.get(fid) ?? 0 : 0`. `flow()` stops at faulted nodes, so a fuse nested under a blown fuse is unpowered and also reads 0.
- **Inline map:** `fuseload.test.ts` covers the load per fuse, an unpowered fuse at 0, a switch moving load between fuses, a fuse at exactly its rating (holds, carries 3), and a blown fuse at 0.
- **Battery-run:** fb_east carries 1 after the winning sequence, and a battery-only lit lamp adds 0. Both are tested.
- **Load the instant before the blow (rated-9 twin):** a fair proxy. Rating only decides whether a fuse blows; it doesn't change flow or `sub`. So the twin's `fuseLoad` equals the `sub` the real check reads, as long as no other fuse behaves differently, and here none does. The test is tighter than asserting 3: it checks that the `fuse:blown` event's `load` equals the twin's value (3), then that the blown fuse reads 0. It is limited to the instant before the blow, because a state is only ever returned after a blow has settled.
- **Shrine-circuit:** fb_A carries 3 at the start.
- **Docs:** `tickets/002-grid-map.md` line 45 and `puzzles/SCHEMA.md` line 77 already have the entry on main, so the branch rightly doesn't touch them.
- **Tests:** `npm test` passes, 197/197 across 11 files. `npm run typecheck` fails only at `src/render/render.test.ts:26`, which is the known part B issue.

## Rule conflicts and risks
- **Purity:** no DOM, timer or cross-folder import in `grid.ts` or `types.ts`. The test's `node:fs` fixture read has precedent in `grid.test.ts`, `battery.test.ts` and `culprit.test.ts`.
- **Files:** only `src/grid/` is touched. No new dependency.
- **Allocation:** one small Map per settle, with `fuseIds` worked out once at `createGrid`. That is in line with the dozen Sets and Maps `settle` already builds. Each state gets a fresh Map, so states don't share it.
- **Regressions:** none. All existing grid, render and play tests pass.

## Must fix
none

## Could improve
1. In the twin test, also assert `blown[0] === 3` outright, or name the 3 in a constant, so the ticket's "3 at the moment it blows" shows up directly.
2. Add a nested-fuse case (a fuse downstream of a blown fuse reads 0, and an upstream fuse's load includes the inner fuse's load) to the inline tests. The code is correct, but this isn't covered.

## Main session's response
agree. Already staged on `proto/012`; merges to `main` with the rest of ticket 012. Could-improve 2 joins ticket 006's test backlog.
