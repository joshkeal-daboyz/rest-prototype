ticket: 081-V2-load-preview
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A pure `loadPreview(puzzle, state, known)` in `src/grid/`. For every breaker, every switch and every readable fault it gives the load the move would add ("+3"), counted before any fuse blows, and whether the move ends with a feed over or a fuse blown. Faults the player cannot read now and has never read count as sound; faults in `known` or readable now count as they are. Types are in `src/core/preview.ts`; 5 tests.

## Does the branch do it?
V2's own change (commits 2b9375e, 0c2d119 and its revert c92cc9c, so net 2b9375e) touches only `src/grid/preview.ts`, `src/grid/preview.test.ts` and one export line in `src/grid/index.ts`. The core types (`src/core/preview.ts`, exported from `src/core/index.ts`) come from the re-cut, and the implementation matches them. I ran `src/grid/preview.test.ts`: 5 passed in 78 ms.

1. **Breakers and switches: met.** Case "breaker and switch rule". The breaker reads +2 when open and −2 after `throwBreaker`. The switch (present line lamp 3, other line lamp 1) reads −2, which is the other line less the present one. "Changes no state" is `expect(g.state()).toBe(before)`. That check is weak (see Could improve 1), but the code backs it: `loadPreview` only builds fresh grids from copied nodes and faults, and only copies the state's maps.
2. **A readable fault: met.** Case "readable fault rule". `k1` (reached) reads repair +2, and `k2` (behind an open breaker) has no entry. In code, repair entries are made only for `state.readableFaults`, and `view` sets `startingParts: []`, so whether the parts hold a wire cannot change the number. The test does not vary the parts, but it doesn't need to, because the code ignores them.
3. **Unread faults stay hidden: met.** Case "Faults hide faults". The blown fuse's repair entry is +4 with the hidden dead lamp and equals the entry with the lamp sound. `dl` has no key.
4. **Known faults stay counted: met.** Case "known fault rule". With `kb` in `known`, the switch reads −1 (0 past the break, less the present 1). Without it, it reads +2 (the break counts as sound).
5. **Before the blow, and red: met as cut.** Case "over and blows rule". `brA` reads `{delta: 2, over: true, blows: ["fbA"]}`, and the delta comes from the unrated run, so it is counted before the blow. `brB` takes feed B over and reads red. Once B is over, `brB3` reads `over: true`, which covers a feed that was already over. `brC` on a third feed reads not red while A's move would blow a fuse, so each move is judged on its own. `over` uses `brownout`, which is true when any feed is over. So once a feed is over, every move reads red. That is Josh's card "Red if any over", and the builder reverted 0c2d119, the per-move alternative, to match it.
6. **V0's figures, once: can't tell from the branch.** This item is a printout in the builder's reply, with no test. The main session should check that reply against V0's table (10 of 17 red before made, and the "known" column).
7. **Purity: met.** `preview.ts` imports only types from `../core` plus `./grid` and `./types`, the same imports `grid.ts` already has. It has no DOM, no timer and no other folder. `grid.test.ts` "determinism and purity" is unedited. `createGrid` is unchanged.

**Count.** 5 new cases, against the ticket's 5 and the cap of 15. No report-only test and no city fixture; all five are small inline fixtures.

**3D game.** It is a plain function of `Puzzle`, `GridState` and a set, built only on `createGrid`, so it copies over unchanged.

## Rule conflicts and risks
- "Faults hide faults" holds by construction. Only faults that are readable now or in `known` enter the what-if. A hidden fault is never reached by current, so treating it as sound leaves the base run equal to the real state.
- Battery state (released, charge) is not carried into the fresh grids, so they start from the file's charge. Under SCHEMA, a released battery's far side carries no feed load, so `delta` should be unaffected, but `over` on a battery map is not tested. No city pilot has a battery (checked `puzzles/city/*.json`). Not a blocker for V.
- A relay switch that current does not reach still gets an entry, although it cannot be thrown then (SCHEMA). 12-which-fuse.city.json has relay or spring switches. The ticket asks for "every breaker and switch", so this is within the cut. V3 or V4 may want to hide such entries.

## Must fix
none

## Could improve
1. `src/grid/preview.test.ts` case 1: `toBe(before)` only checks that the grid hands back the same object. It would not catch `loadPreview` mutating that object's maps. Compare against a `structuredClone` of `before`, or check that `before.breakers` and `before.switches` are unchanged after the call.
2. `src/grid/preview.ts`: the comment "A repaired fuse that blows again carries the same id" applies only to a fuse that blew during play (`blown-${fuseId}`). An authored blown fault (for example `bf`) gets a new id when it blows again, and that case is caught by `!baseBlown.has`. Saying both would help the next reader.
