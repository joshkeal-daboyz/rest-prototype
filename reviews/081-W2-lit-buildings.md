ticket: 081-W2-lit-buildings
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
When current lights a building, every storey glows: glass-bearing pieces, the ground storey and shopfront included, take the window level, and the roof takes none. Additive glow cards stand on street faces, and the street light moves to half the building's height with a longer reach. E2's lamp post sphere and disc go. A dead lamp on a building reads as a live drop into dark windows, within S4's frame budget.

## Does the branch do it?
Round 2. Round 1 is archived as this file's earlier version on the branch (690aa4f). I checked the builder's fix commit 1857d2b (`windows.ts`, `windows.test.ts`, `cityview.ts`) against round 1's one must-fix.

1. **Why storeys stay dark (reply, no test).** This is in the builder's reply, which I don't have, so I can't judge it. The main session should confirm the reply named the cause. Nothing on the branch touches `plan3d.ts`, so the builder did not hit the stop rule.
2. **Every storey takes the window level and the roof none (test: 1 case).** Met; this was round 1's must-fix. `roofOffsets` (in `windows.ts`, pure) lists each building's roof offsets from `dimBuildings`' piece order. `setBuildingGlow` takes an optional `skip` set and leaves those slots alone. `cityview.ts` builds `roofSkip` once at build and passes it on every lit frame. The new case, "a lit building's ground storey, shopfront and every floor carry its window level and its roof none", uses floor, floor (2 parts), roof, then the ground slot. It runs through `roofOffsets` and `setBuildingGlow` and asserts `[1, 1, 1, 0, 1]`. If the roof skip is lost or the ground slot stops being written, this test fails. The rule is in the test's name.
3. **Glow cards and a higher light.** Met, as in round 1 (case "every glass-bearing storey ... glow card ...": bands `[1.5, 4.5, 7.5]` on +z, light y 4.5, reach formula with `STOREY_REACH_DIV` 4).
4. **No lamp posts, no disc.** Met, as in round 1. No existing test asserted a post glow.
5. **Dead-lamp signature.** Met. The case now asserts `cards.mesh.count` is 0 instead of `visible` false, which follows the fix in item 6.
6. **Budget (browser).** Round 1 flagged a possible new program on first light. The card mesh now stays visible with `count` 0 and is never hidden. In the installed three, `renderBufferDirect` calls `setProgram` before it looks at the draw range, so the program compiles on the first frame after the city loads, not inside the Relight. The cost may be one empty instanced draw per frame, which is within the "+1 draw call" allowance. The `perf=1` numbers are still the browser's to confirm.
7. **Josh plays (browser).** Josh's to judge.

Tests: 3 cases added by W2 (criteria 2, 3 and 5), which is the ticket's count. `npx vitest run --maxWorkers=2 src/render3d/windows.test.ts` passed 14 of 14 in 5.7 s. Nearly all of that is L1's existing 2.8 s case; the W2 cases are fixtures or reuse the cached city.

## Rule conflicts and risks
- No hard-rule break. Only the three allowed files changed; `src/grid/`, `src/night/`, `src/core/` and `plan3d.ts` are untouched; there is no new dependency.
- `roofOffsets` assumes `dimBuildings`' piece order matches `plan3d`'s instance order, with the ground slots after them. L3's `setDimWindows` already depends on the same assumption. If a multi-column building lists its columns in a different order from its instances, the wrong slot would stay dark. This may occur, not checked; a browser look at a two-column lit building's roof and top floor would show it.
- The round 1 notes on cards still stand: neighbouring cards overlap by 30% on multi-column faces, and grey-box columns still get cards.

## Must fix
none

## Could improve
1. Write criterion 1's finding into the ticket or a code comment, so W3 (which shares `windows.ts`) knows why storeys were dark.
2. Narrow card width at shared column edges (or use one card per face run) to avoid additive seams.
3. Skip cards on columns drawn as grey boxes, if Josh finds them odd.
