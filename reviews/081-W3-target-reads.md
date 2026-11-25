ticket: 081-W3-target-reads
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section W3 of `tickets/081-puzzles-on-the-city.md`: a target building's windows, glow cards and light burn in a pale gold `TARGET_PANE` while scenery stays amber (W-Q2, "Gold windows + icon"), and every pole or roof node's overlay icon sits on its model's attachment point. Criteria 3 and 4 are checked in the browser. The ticket allows 2 test cases.

I reviewed W3's own commit cf9e038. The merge dd9bbe9 only brings in goal-branch cleanup notes.

## Does the branch do it?
1. **The target's mark: met.**
   - `windows.ts` adds `TARGET_PANE = 0xfff0a0`, `paneColour()` and `targetBuildings()`, plus an optional `BuildingGlow.target`.
   - `setBuildingGlow` writes a target's window level as a negative number. The `windowLit` shader reads the minus sign as "gold": it swaps the emissive for gold at the same brightness, then multiplies by `abs(level)`.
   - `litGlass`, `glowCardMesh` (window cards and W2's ground pools) and `setStreetLights` all take their colour from `paneColour`.
   - `cityview.ts` builds `targetOf` from `puzzle.target` and sets `bg.target` and `lg.target` each frame.
   - The dark-target icon mark is E4's existing `specOf` `target` flag, which is unchanged.
   - Test: `windows.test.ts`, "a target building's window, light and glow card are TARGET_PANE gold and a scenery building's the amber (081 W3)". It names the rule and would fail if the sign, the light colour or the target set broke. One gap: it does not check the glow card or shop-glass colour, though its title names the glow card.
2. **Icons on their pieces: code met, test half there.**
   - `overlay.ts` adds `poleTopM`: the highest of the pole model's three `GROUND_POLE_ATTACH_UP_M` heights. Any other model falls back to `OVERLAY_POLE_Y_M`.
   - The roof branch of `placePoint` already used `r.deck_y_m`, so roof nodes were already at the mast's deck.
   - The ticket's test is to cover both "a pole node's icon point at its pole model's top attachment height, **and a roof node's at its mast's deck**". The new overlay case checks only the pole half (plus the fallback). No test in `overlay.test.ts` covers the roof deck (checked: `deck_y_m` appears only in `circuitdraw.test.ts`).
   - The builder's report of screen distances on P2a's 03 and P0 is not in the branch, so I can't tell whether it was made. The main session should have it from the builder's reply.
3. **Pulses run outward:** browser check. Nothing in this branch changes `lineFlow`.
4. **Josh plays P0:** browser check.

**Non-target look stays as W2 left it.** For a positive level the shader takes the same path as before (`abs` of a positive number is the same number). Lights with no glow entry keep their amber colour. Lit non-targets get amber copied back each frame, which is the colour `streetLights` creates them with. Glow cards, ground pools and shop glass keep the same `AMBER` values for non-targets. W2's gain of 0.06 and its ground pools are not touched.

**Tests:** 2 cases added, the ticket's count. Both files pass locally: `windows.test.ts` has 15 cases and `overlay.test.ts` 17. The new cases are fast; the slow cases in both files were there before.

## Rule conflicts and risks
- Every change is in `src/render3d/overlay.ts`, `overlay.test.ts`, `windows.ts`, `windows.test.ts` and `cityview.ts`, the files the ticket lists. `src/grid/` and `src/night/` are not touched. No new dependency. No GDD rule changed.
- `overlay.ts` now imports `src/core/powerpoles`. A `src/render3d` file importing `src/core` is allowed.
- A dark target (level 0) writes -0, so it takes the amber path at zero brightness. It looks the same as dark, which is fine.
- When a pole is missing from `poleModels`, `circuitdraw.ts` draws it as `GROUND_POLE_MIX[0]` (5.862 m), but `poleTopM` puts its icon at 7 m. I have not checked whether this happens on a real city. A feed pole listed in `poleModels` would also take a ground pole's height, although it is drawn as the feed model (also not checked).

## Must fix
1. `src/render3d/overlay.test.ts`, the W3 case: add the roof half that criterion 2's test names. With a `roofs` entry in the fixture layer (for example `deck_y_m: 12.5`) and a node placed `{ roof }`, `placePoint`'s y should equal `deck_y_m`. Put it in the same `it` so the count stays at 2. Expected effect: breaking the roof anchor fails a test, as the ticket asks.

## Could improve
1. `windows.test.ts`: in the same case, also check one `glowCardMesh` card's (or `litGlass`'s) colour for a target, since the case's title names the glow card.
2. `overlay.ts` `poleTopM`: fall back to the same model `circuitdraw` draws (`GROUND_POLE_MIX[0]`) rather than 7 m, and leave feed poles at the feed's height, so the icon meets the drawn pole in every case.
