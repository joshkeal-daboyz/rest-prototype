ticket: 081-W2-lit-buildings
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
When current lights a building, every storey glows: glass-bearing pieces (ground storey and shopfront included) take the window level, additive glow cards stand on street faces, and the street light moves to half the building's height with a longer reach. E2's lamp post sphere and disc go. A dead lamp on a building reads as a live drop into dark windows, within S4's frame budget.

## Does the branch do it?
I reviewed W2's own commit (23668ba: `src/render3d/windows.ts`, `windows.test.ts`, `cityview.ts`). The merge 4d786f4 only brings in the goal branch's docs.

1. **Why storeys stay dark (reply, no test).** This goes in the builder's reply, which I don't have, so I can't judge it. From the code: `plan3d.ts` `buildingBoxes` already puts a building's ground pieces in its `instances` (floors first, then ground), so `setBuildingGlow` already reaches the ground storey when it is drawn. A column whose models above the ground did not all load is a grey box, and nothing on it glows. The main session should confirm the reply named the cause. The branch changes nothing in the window mask or in `setBuildingGlow`, so whatever was dark is now covered by the cards, not fixed in the windows.
2. **Every storey takes the window level (test asked: 1 case).** The behaviour mostly comes from F1b, not from this branch: every instanced piece of the building, the roof included, gets the level. The test asked for is missing. The first W2 case ("every glass-bearing storey ... has a glow card ...") checks `glowCards` bands, not `windowLevel` slots. If a later change dropped the ground pieces from `instances`, which is exactly what this criterion guards, no test on this branch would fail. The "roof none" half is also not true of the window level today: `setBuildingGlow` writes the roof's instances too. This may be invisible behind `WINDOW_UV`; I did not check.
3. **Glow cards and a higher light.** Met. `glowCards` gives one card per column, per `faces: "street"` side, per ground or floor band, and none for roofs or yard faces. `glowCardMesh` makes one `InstancedMesh` sized at build, additive, with brightness taken from `buildingGlow`'s level and flare through `instanceColor`, so there is no new timing. `lightPlaces` puts the light at half the tallest roof's base when the plan has columns. `streetLights` reach is `STREET_LIGHT_REACH_M x (1 + storeys / STOREY_REACH_DIV)` with the divisor 4. Test: case 1 asserts the bands `[1.5, 4.5, 7.5]` all on +z, no card for another building, light y 4.5, and the reach formula.
4. **No lamp posts, no disc.** Met in `cityview.ts`. The `LampGlow` sphere and pool, their constants, the per-frame loop and the `FLARE_SECONDS` import are gone. No existing render3d test asserted a post glow (I grepped for `lampPost` and `LampGlow` in `src/render3d/*.test.ts` and found none), so nothing was to be removed.
5. **Dead-lamp signature.** Met. Case 2 adds a `dead-lamp` on `homes` in P0 on the shared default city. It asserts `lineFlow` 1 on the drop's line, `buildingGlow` level 0, the card mesh hidden, and the street light at intensity 0.
6. **Budget (browser).** Not checked here; see risks. +1 draw call is within the limit. A new program at first light is the risk.
7. **Josh plays (browser).** Josh's to judge.

Tests: 2 cases added (the ticket allowed 3). `windows.test.ts` passed 13 of 13 at `--maxWorkers=2`, in 7.5 s total, mostly the existing L1 case's 3.8 s city build. The W2 cases reuse the cached `sharedCity` and add little. Both test names state the rule.

## Rule conflicts and risks
- No hard-rule break. Only the three allowed files changed; `src/grid/`, `src/night/` and `src/core/` are untouched; there is no new dependency. The `cityview.ts` edits stay in the build step, the live layer, the post glow's removal and the perf roots map.
- **Criterion 6, new program during the Relight: may occur, not checked.** The card material is a `MeshBasicMaterial` with a `map` on an `InstancedMesh` with `instanceColor`. It is hidden until a building lights, and nothing calls `gl.compile`, so Three would compile its program on the first lit frame, inside the Relight. The `perf=1` "programs" count before power and after the Relight will show it. If it rises, keeping the mesh visible at black (additive, one call) or precompiling at build would fix it without shrinking the cards.
- Cards are `CELL x GLOW_CARD_SPILL` wide per column, so on a multi-column face neighbouring cards overlap by 30% and add up. That can show as brighter seams.
- Cards come from the plan's columns, not from loaded models, so a grey-box column still gets cards.
- `glowCards` treats every non-roof piece as glass-bearing and assumes 3 m per storey of `span`.

## Must fix
1. `src/render3d/windows.test.ts`: add criterion 2's case (the ticket's third budgeted case). Use a fixture building with a ground storey, two floors and a roof. After `setBuildingGlow`, every glass-bearing piece's `windowLevel` slot, ground and shopfront included, carries the level, and the roof carries none (`plan3d.ts` is read-only here, but its draw output may be used). If the roof must carry none, `setBuildingGlow` or the instance list must skip roof pieces. Effect: dropping the ground storey from the window level fails a test, which nothing on the branch does now.

## Could improve
1. Have the reply's criterion 1 finding written into the ticket or a code comment, so W3 (which shares `windows.ts`) knows why storeys were dark.
2. Narrow card width at shared column edges (or one card per face run) to avoid additive seams.
3. Skip cards on columns drawn as grey boxes, if Josh finds them odd.
