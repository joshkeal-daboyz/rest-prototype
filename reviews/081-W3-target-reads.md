ticket: 081-W3-target-reads
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section W3 of `tickets/081-puzzles-on-the-city.md`: a target building's windows, glow cards and light burn in a pale gold `TARGET_PANE` while scenery stays amber (W-Q2, "Gold windows + icon"), and every pole or roof node's overlay icon sits on its model's attachment point. Criteria 3 and 4 are checked in the browser. The ticket allows 2 test cases.

This is round 2. Round 1 (commit a3eedff, same file) gave partly with one must-fix: criterion 2's test had no roof half. The builder's fix is commit 7146335, on top of W3's commit cf9e038.

## Does the branch do it?
1. **The target's mark: met, unchanged since round 1.**
   - `windows.ts` adds `TARGET_PANE`, `paneColour()` and `targetBuildings()`. A target's window level is written negative, and the shader turns it gold.
   - `litGlass`, `glowCardMesh` and `setStreetLights` all take their colour from `paneColour`.
   - `cityview.ts` sets `target` from `puzzle.target`.
   - Test: `windows.test.ts`, the "(081 W3)" case.
2. **Icons on their pieces: met.**
   - The round 1 must-fix is done. `overlay.test.ts`, inside the same W3 `it`, now builds a layer with a roof `{ id: "r1", x_m: 4, z_m: 5, deck_y_m: 12.5 }` and checks that `placePoint({ roof: "r1" })` gives `[4, 12.5, 5]`. That is the roof branch at `overlay.ts:98-99`. If the anchor broke, the test would fail. The case count stays at 2.
   - The pole half is as in round 1: `poleTopM` takes the highest `GROUND_POLE_ATTACH_UP_M` height, and other models fall back to `OVERLAY_POLE_Y_M`.
   - The builder reported icon heights per pole model, which the main session passed on: apocalypse pole 5.862 m (the old fixed 7 m was 1.14 m too high), palm _01 8.548 m (1.55 m too low), palm _02 8.731 m (1.73 m too low), feed pole and unknown models unchanged. These match the attach table the test reads from. I have not seen them on screen.
3. **Pulses run outward:** browser check. This branch does not change `lineFlow`.
4. **Josh plays P0:** browser check.

**Tests:** 2 cases added against main, the ticket's count. I ran `overlay.test.ts` and `windows.test.ts` with 2 workers: 32 passed, 8.6 s in all. The only slow case, `loadCityView` at 4.7 s, was there before this branch.

## Rule conflicts and risks
- Every change is in `src/render3d/overlay.ts`, `overlay.test.ts`, `windows.ts`, `windows.test.ts` and `cityview.ts`, the files the ticket lists. `src/grid/` and `src/night/` are not touched. No new dependency. No GDD rule changed.
- From round 1, still open: a pole missing from `poleModels` is drawn as `GROUND_POLE_MIX[0]` but its icon goes to 7 m. Not checked on a real city.

## Must fix
none

## Could improve
1. `windows.test.ts`: in the same case, also check one target `glowCardMesh` card's (or `litGlass`'s) colour, since the case's title names the glow card.
2. `overlay.ts` `poleTopM`: for a pole with no model, fall back to the model `circuitdraw` draws (`GROUND_POLE_MIX[0]`) rather than 7 m, so the icon meets the drawn pole in every case.
