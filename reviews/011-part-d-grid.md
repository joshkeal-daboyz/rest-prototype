ticket: 011-readable-failures (part D)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 2; round 1 is in `011-part-d-grid.round1.md`.*

## What the ticket asked for, as I understood it
When a fuse blows, `fuse:blown` should name a `culprit` and a `path`. The culprit is the lamp that is downstream of this fuse now but was not before the action. If several qualify, the one with the largest load is named. The path is the line ids from the fuse to that lamp, in order. It must be tested on an inline map and on `battery-run` (breaker first → `mill`), and `src/grid/` must stay pure.

## Does the branch do it?
Round 2 checks commit `3f67dc2` against `65cbf88`.

**Round-1 must-fix: the culprit rule (fixed).**
- `Mutable.prevFed` is now `prevUnder: ReadonlyMap<fuseId, Set<lamp>>`. On each settle that ends without a blow, it is rebuilt as an empty set for every powered, unfaulted fusebox. Each feed-lit lamp is then added to every fuse on its parent chain.
- `nameCulprit` now checks a lamp against this fuse's own set (`before.get(fuseId) ?? empty`), so "new" means new under this fuse.
- A blown fuse has no entry in the map, so when it is repaired every lamp under it counts as new. That is correct.
- A lamp lit only by the battery is never in any set, so it still counts as new to the feed's fuse, as SCHEMA's battery rules require.
- `null` before the first settle still keeps a blow at construction silent. Undo and reset still settle with `emit=false`, and `cloneMutable` carries the map, which is never mutated after it is built.
- The new test "a lamp rerouted from one fuse onto another is new under the second fuse" is my round-1 reroute probe. It asserts `fbB`, `m`, `["jb","lm"]`.

**Could-improve 2: re-blow after repair (done).** Repairing `fb_east` on battery-run blows it again. The second event names `mill` with path `["l_e2","l_mill"]`, and a new test covers it.

**Could-improve 3: doc comment (done).** It now describes what is stored, the lamps lit by the feed's own flow downstream of each fuse.

**Rest of the round-1 checks.** Payload type, path in flow order, largest load wins, both battery-run tests and purity are unchanged from round 1 and still hold. `npm run typecheck` is clean and `npm test` passes 156 of 156 across 9 files, run on a detached worktree at `3f67dc2`.

## Rule conflicts and risks
None found. Only `src/grid/` changed, it imports nothing beyond `../core`, and there is no new dependency.

## Must fix
None.

## Could improve
1. Could-improve 1 from round 1 is still open but optional. No test in `culprit.test.ts` asserts that undo and reset emit no `fuse:blown`, though my round-1 probe confirmed they don't.

## Main session's response
agree. Merged into `main`.
