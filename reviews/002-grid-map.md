ticket: 002-grid-map
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session, since project agent types load only at session start); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
A pure, deterministic map-scope simulator in `src/grid/` (`createGrid` → `Grid`/`GridState`/`RepairResult`, names as given). From a puzzle plus throws and repairs it derives power, flowFrom, lit, readable faults, sparking, fuse blows, brownout and completion, with undo/reset and the events. Each rule has its own Vitest test against the shrine-circuit and lamp-row fixtures and small inline maps.

## Does the branch do it?
`npm run typecheck` is clean. `npm test`: 57/57 pass (47 in `src/grid/grid.test.ts`). The diff touches only `src/grid/` (grid.ts, types.ts, index.ts, grid.test.ts).

- **Power flow / blocking / flowFrom.** `flow()` in `src/grid/grid.ts` is a BFS from the feed. A faulted junction or fusebox is reached but doesn't conduct. A damaged cable is marked powered, but its far node is not. `flowFrom` is set per line. Tests: "a node or line with an unrepaired blocking fault conducts nothing past it", "a damaged cable…", "a blown fuse…", "flowFrom records…", "current also flows along a line against its from/to direction". Met.
- **Lamps are leaves.** Lamps never conduct, whatever their fault. "a dead-lamp never changes power anywhere else" compares powered and flowFrom against a healthy twin. Met.
- **Breaker / switch.** A breaker conducts only while closed. A switch sends only on `outputs[selected]`, and no line is followed into a switch through one of its outputs, so the unselected output stays dead even when back-fed. Tests: "a breaker conducts only while closed", "a switch passes current only to outputs[selected]…", "current may enter a switch from any non-output line, and never through an output line". Met.
- **Readability / sparking.** A fault is readable when `powered.has(fault.at)`; sparking is its readable damaged-cable lines. Shrine start = {f1}; Lamp Row start = {f1,f2,f7}; after repairing fb_A = {f1,f3,f4,f7}; sparking tested. Met.
- **Fuse rating.** `settle()` sums would-be-lit load down the BFS tree, blows one overloaded fusebox per pass, and loops until stable. It emits `fuse:blown` with node, fault id, load and rating. An absent rating falls back to `DEFAULTS.fuseRating` (Infinity in core), and an absent load counts as 1. The fuse check runs before brownout. Tests: "fuse:blown fires…", "an absent rating never blows", "an absent lamp load counts as 1", "a load equal to the rating does not blow", plus the nested-fuse tests. Met.
- **Capacity.** `brownout = capacity !== null && load > capacity`. `grid:brownout` fires only when the value changes. `capacity: null` is tested with 50 lamps. Met.
- **repairAt.** Refusals return `no-fault`, `unreadable`, or `needs-parts` with `{part, count, have}`. A successful repair splices out `count` parts and emits `repair:completed`. Each case is tested, including the dead-junction wire×2 case with one wire. Met.
- **Completion.** `complete = targets.every(lit) && !brownout`. An absent or empty target means every lamp. `job:completed` fires once behind a `finished` latch, and afterwards throws and repairs return false. Tested. Met.
- **Shrine in three actions.** Tested with the file's own parts: load 6 and browned out after step 2, load 3 and complete after step 3. The event order is asserted. Met.
- **undo / reset / actions.** Undo restores a snapshot of breakers, switches, faults, parts and actions, including a fuse the undone action blew. Reset restores the file's state and clears history. `actions` counts only accepted throws and repairs. Tested. Met.
- **Determinism / purity.** No timers, randomness or DOM. Imports come only from `../core`. A source-scan test guards against render/play/ui and DOM globals. Met.

GDD rules: lamps are leaves, current reaching a fault makes it readable, faults hide faults, and the Relight can't be interrupted (the `finished` latch). All are implemented as rules, not approximated. The night/street rules (letting go, death rollback, dawn, pause) are out of this ticket's scope.

## Rule conflicts and risks
- `src/grid/` imports values (`EventBus`, `DEFAULTS`, `FAULT_RULES`), not just types, from `src/core/`. Read literally, the hard rule bans any import from another `src/` folder. The ticket sanctions core ("Types you need beyond `src/core/`…"), and `core/events.ts` says it is safe to use from `src/grid`. So not a blocker, but the 3D game must take `src/core/` along with `src/grid/`.
- "Downstream" for a fuse is the BFS spanning tree. On a map with a loop (the brief's puzzle 6, Ring main), a lamp reachable through two fuseboxes is charged only to whichever the BFS reaches first, which depends on line order in the file. The ticket doesn't define loop semantics. Flag it before the Ring main map is built.
- `lit` includes lamps during brownout, as the ticket's interface says. SCHEMA.md says a lamp is "lit when … the section isn't browned out". The renderer must check `brownout` itself, and SCHEMA wording should be reconciled later (not by this branch).
- `GridState` hands out live `Set`/`Map` objects typed readonly. A caller that casts could mutate the simulator's derived state. Low risk.

## Must fix
none

## Could improve
1. `src/grid/grid.test.ts`: the test "repeat until stable: after the outer fuse is replaced, an overloaded inner fuse then blows" asserts the opposite of its name (the outer fuse re-blows; the inner never blows). Rename it, or change the map so the inner fuse really blows after the outer is repaired.
2. No test shows "repeat until stable" blowing two fuses in one settle (e.g. two overloaded sibling fuseboxes). The loop handles it; add a test so the rule is covered.
3. The first fuse test's name says it "emits fuse:blown", but it asserts no events (it blows silently at construction). Rename it. The emission is covered by the next test.
4. `repairAt` after `job:completed` returns `no-fault`, which misreports why it was refused. Consider a distinct reason, which would need a ticket change to `RepairResult`, or document it.
5. `undo()` is also refused after completion, and undo emits `grid:changed` with reason `"reset"`. Both are reasonable, but neither is in the ticket. Note them for the renderer and session log, or add an `"undo"` reason in core via the architect.
6. The determinism test runs the same sequence twice in one process. It would be stronger to compare against a fixed expected snapshot, or to create two grids from separately loaded puzzles.

## Main session's response
agree. Clean review; no must-fix items. Could-improve 1 and 3 (misnamed tests) are worth a follow-up ticket; 4 and 5 are architect items (an `"undo"` reason and a `"finished"` refusal in `src/core`) and go on the next architect pass. The ring-main loop semantics are noted in `puzzles/SCHEMA.md` as an open point before map 6 is built.
