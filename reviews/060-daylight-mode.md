ticket: 060-daylight-mode
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A dev-only testing daylight. It has one pure table of two modes (`lighting.ts`) and one rig (`lightrig.ts`) that alone owns the scene's global lights, background, fog and tone mapping. Night stays exactly as it is today on every puzzle map. The tile view opens in day, and L plus a "Day / Night" button flip the mode. None of the switching reaches `npm run build`. Guide 16.12 records it all.

## Does the branch do it?
I reviewed commit bbf9489 against its parent dcfeb1e (goal/city-style). The gate is green: tsc is clean, 2231 passed, 7 skipped.

1. **The table: met.** `lighting.ts` `LIGHT_MODES` matches the ticket value for value. `lighting.test.ts` "LIGHT_MODES, pinned value for value" types in every colour exactly and every intensity and angle within 1e-9. "night's code-drawn colours are the ones scene.ts draws with today" ties night to `GROUND`/`YARD`/`STREET`/`PAVEMENT`/`KERB`, and it also types them in. `sunPosition` is tested for direction (north is -z, azimuth 135 is +x,+z).
2. **One owner: met.** `lightrig.ts` `ensure()` adds, updates or removes each tagged light (`userData.lightRig`). `lightrig.test.ts` covers:
   - night gives exactly ambient and moon;
   - day gives exactly key and hemi, with no ambient;
   - a mode flip in both directions;
   - same-mode idempotence (the same objects and values);
   - a foreign PointLight left alone.
   The source test "no file but lightrig.ts, gallery.ts and the tile sheet ... makes an ambient, hemisphere or scene-level directional light" scans every non-test `.ts` in `src/render3d/`, and tilecity3d.ts is allowed lights only inside `buildSheetScene`. Further source tests confine tone mapping, exposure and fog to the rig. "day sets ACES at exposure 1, and night restores none" checks that tone mapping is restored to `NoToneMapping`.
3. **Night unchanged: met, and I verified the base snapshot independently.** I put the test's own `snapshot()` (background, fog, non-point lights, point-light count, and an FNV hash of every material's type, colour and emissive) in a throwaway worktree at dcfeb1e and ran it against the base `buildScene`. All three maps give exactly the values pinned in `lightrig.test.ts` `BASE`:
   - 01: 2 / 99 / e32248bc
   - 09: 5 / 235 / 94e10480
   - 64: 7 / 395 / e9863668

   The two lights' strings match too. So the snapshot really was taken on the base commit. I also read every night-path change in `scene.ts` and `renderer.ts`:
   - `buildScene` calls the rig for night before any surface is registered, so materials keep their constructor colours.
   - `renderer.ts` then applies night again with the renderer. That re-sets the same hexes and sets `NoToneMapping`, exposure 1 and `shadowMap.enabled = false`, all of which are three's defaults.
   - The junction pads share `padMat = flat(STREET)`, so registering `pads[0]` as "street" restores the same colour.
   - The lamp update now multiplies by `nb = nightLightsOn(scene) ? b : 0` and sets `flare.visible = flaring && nb > 0`. At night `nb === b`, and `lampIgnition` only gives `flareAge >= 0` when `on` (b = 1), so `nightFlaring === flaring`. Night behaviour is identical.
   - The only new difference is that the rig names its lights `rig:ambient` / `rig:moon`. Nothing looks lights up by name.

   The "no playtest snapshot change" half is the playtester's to confirm.
4. **Defaults per view: met.** `lightModeFor` returns night for any view when `dev` is false. The tile view is day unless `light=night`, and the other views are night unless `light=day`. `lighting.test.ts` "lightModeFor: what each view opens in" covers all five rows of the ticket's table, plus the ladder street camera and the tile city in production. "ignores values it does not know" covers `Day`, `dusk`, empty, and a duplicated param.
5. **Day colours and night-only parts: met.**
   - `buildScene` registers ground, yard, street (roads and pads), kerb and pavement. The test "buildScene registers ... day then night restores each colour exactly" checks every registered material through day and back.
   - "in day the lamps' lights are at 0 and their glows, pools and flares are hidden, even after an update" drives `b.update` three times in day, checks intensity 0, hidden parts and zero opacity, then checks night restores the visibility and the same intensities.
   - On the tile city, `tileGroup` exposes its road, pavement and kerb materials, and `syncTileSurfaces` re-registers them and brings them to the scene's mode after `setModels` swaps tiles. That is tested in daytoggle.test.ts "a material the tiles swap in after the models load".
   - Grass has a reserved key and no drawer yet (057 has not landed). The guide says so.
6. **The toggle: met.**
   - `daytoggle.ts` takes an injected host. `createCityRenderer3d` creates it only inside `if (import.meta.env.DEV && cityScene)`, flips through `applyLightMode` with the WebGLRenderer, and disposes it in `dispose`.
   - daytoggle.test.ts drives the real `createCityRenderer3d` with a fake host and a fake gl. "the L key and the button each flip the mode through the rig ..." checks the lights, background, tone mapping and road colour after each press. "removes the listener and the button on dispose ..." checks that a press after dispose changes nothing and that the renderer is back at `NoToneMapping`.
7. **Build contents: plausibly met (main session's check).** All three entry points are gated:
   - `renderer.ts` reads `light=` only in `import.meta.env.DEV && ... ? lightModeFor(...) : "night"`.
   - `createCityRenderer3d` is reachable only through the existing DEV-gated `cityTiles`.
   - The toggle is behind its own DEV guard.

   Even if `lightModeFor` survived tree-shaking, it returns `"night"` on its first line when `dev` is false. So `light=day` in production cannot do anything, let alone break anything. `LIGHT_MODES` (both modes) stays in the bundle because the rig reads night from it, which is acceptable. When you grep `dist/`, check for `Day / Night`, `data-day-toggle` and `get("light")`. Expect the day *table values* (for example `0xa9c7e6` as a number) to be present.
8. **Guide: met.** The changes are:
   - 16.12 has both quotes as Decided (060), "two modes, one owner", the day values, the shadows Default and Open, the switching, and the defaults-per-view table.
   - It says it "leaves the game's night look of chapter 11 unchanged", and records 055 Q9 as replaced.
   - Chapter 11 gains the one Default (060) line.
   - Numbers rows cover every numeric leaf of `lighting.ts`, and the `STREET_CAM_SKY/_GROUND/_DAY_INTENSITY` rows are retired.

   styleguide.test.ts widens the pattern to `06[0-9]` and adds a non-vacuous drift check: it injects `NEW_TUNING` and expects it to be flagged. It also has 16.12 and chapter 11 text checks.
9. **Eye check: the main session's.** See the sheet note under risks.
10. **Files: met, with explained exceptions.** Every change is in `src/render3d/` and `docs/city-style-guide.md`. Nothing on the must-not-touch list is touched. The exceptions are judged below.

On the specific questions:
- **styleguide.test.ts, the inline-source test pointed at lighting.ts: accept.** The guide's "Part / Source text" table pinned `scene.ts`'s literal light lines. Criterion 1 and the Files line for `scene.ts` ("night lights replaced by the rig call") move those lines into `lighting.ts`, so the old check would fail on any correct implementation. Repointing it keeps the same guard (the guide pins the exact source text of night's background, ambient and moon) at the values' new home. It is a forced consequence of an allowed change, it weakens nothing, and the guide text was updated to match.
- **tileintegrate.test.ts: accept.** The ticket's Dependencies line allows replacing "055 E's criterion 30 tests" and calls that "an edit to `tilecity3d.test.ts`". Those tests actually live in `tileintegrate.test.ts` (describe "daylight on every tile-view URL (criterion 30)"), and they import `cityDaylightRequested` and `STREET_CAM_DAY_INTENSITY`, which the ticket retires. The edit is the one the ticket authorised, in the file where the tests really are. The replacement tests are stronger: they check rig kinds for day and `light=night` on four URLs, the sheet's own lights in both modes, and the no-row fallback.
- **streetcam.test.ts: accept.** It replaces the "adds one HemisphereLight on light=day" test, which the ticket's `streetcam.ts` change makes false, with "adds no light of its own", which backs criterion 2's one-owner rule.
- **The sheet keeps its own lights in both modes: supported by the ticket, but it reads a little differently from criterion 9.** Criterion 2's source rule names "the sheet in `tilecity3d.ts`" as one of the three places allowed lights of their own. The Measured section notes the sheet is already the readable view. So the exemption is the ticket's own design. The view table lists the sheet under "day", but `lightModeFor` does give day for `sheet=1`. The builder chose not to put that mode on the sheet's scene, and resets the renderer to night tone mapping for it. See the risk note on criterion 9.
- **daytoggle.ts not in Files: accept.** It is a new file in the owner's own folder. It holds the button and key code that the Files line puts in `tilecity3d.ts` ("the key, the button"), split out so the test can drive it with a fake host. It imports no three and no other folder. It is not extra scope.
- **CI safety: met.**
  - No asset reads.
  - The describe-level reads are `puzzles/*.json` and `src/render3d/*.ts`, both tracked in the repo, on forward-slash relative paths.
  - The only timer is one `setTimeout(…, 0)` macrotask to let the empty model load settle (the existing tileintegrate pattern). No timing is asserted.

## Rule conflicts and risks
- No hard-rule break.
  - `src/grid/` and `src/night/` are untouched.
  - There is no new dependency (`ACESFilmicToneMapping` comes from three).
  - No GDD Decided rule changes. The game's night is value-for-value today's, and day never reaches production.
  - No puzzle file is touched.
- **Criterion 9 vs the sheet.** Criterion 9 lists `&city=tiles&sheet=1` among the URLs where "L and the button flip between the two". On the branch the sheet has no toggle, and day and `light=night` look the same there, by the reading above. The main session should expect this during the eye check, and tell Josh if he wanted a day/night difference on the sheet.
- The branch is cut from dcfeb1e, and goal/city-style is now at 614b379. The two newer commits touch only tickets and two lines of the guide, so a rebase should be trivial. Check that `styleguide.test.ts` still passes after it.
- The rig sets `shadowMap.enabled = false` on every apply. That is harmless now (no light casts), but a later shadows ticket must route through `LIGHT_MODES.shadows`, not set it elsewhere. The guide's Default already says so.

## Must fix
none

## Could improve
1. `streetcam.ts`: `StreetCamOptions.day` and the `_scene` parameter of `createStreetView` are now unused. A later cleanup could drop them, along with the `{ ...asked, day: false }` in `tilecity3d.ts`. This is not needed for this ticket.
2. `daytoggle.test.ts` checks only the road colour on the tile city through a flip. One assertion over all registered tile-city surfaces would close the gap, using `cityScene.lightOwners.materials` for ground, yard, pavement and kerb against `LIGHT_MODES[mode].surfaces`. `buildScene` already has that full check.
3. The ticket's Files list should name `daytoggle.ts`. The Dependencies line should say `tileintegrate.test.ts` rather than `tilecity3d.test.ts`, and the B Files line should name the inline-source repoint in `styleguide.test.ts`. These are ticket-text fixes for the architect, not the builder.
