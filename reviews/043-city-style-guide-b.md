ticket: 043-city-style-guide-b
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A debug-only page, `/?puzzle=<any>&view=3d&gallery=<pack-id>`, that shows every building-sized entry of one converted pack on its lot outline. Each entry is turned so its declared `BUILDING_FRONTS` door faces the camera, with 042 A's red arrow and a caption. The layout is pure and Vitest-tested, the flag is read only in `renderer.ts`, nothing in the gallery can be picked, the town is unchanged when the flag is absent, and with no manifest the page shows "no converted packs" and throws nothing. The guide's step 5 points at the gallery.

## Does the branch do it?
I ran `npx vitest run --maxWorkers=2 src/render3d/gallery.test.ts` on tip 3514cd3: 47 passed, including the four real-manifest cases on this machine (simple-town 45, city-pack 49, town-pack 18, apocalypse-power 10 building-sized entries).

- **Every building of a pack is shown.**
  - The B2 rule is pinned by "which entries are buildings" (`gallery.test.ts` l.139-173), using named cases on a fixture copied from the real names and bounds:
    - in: CityHall, Base, Stairs, Church, GarageDoor, Mall_A;
    - out: Prop, Env, Veh, SK, SM_Generic, Env_/Prop_/Vehicle_/ST_Veh_;
    - the boundary: 5 x 3 x 6 counts, 3 x 5 x 3 does not;
    - case-insensitive prefixes;
    - a listed name bypasses the size and prefix rule;
    - a scale-suspect entry never counts.
  - "One slot per entry" (l.204) compares the slots with `galleryEntries`, the implementation's own output. That is fine only because the test above pins `galleryEntries` against the rule.
  - No-overlap is checked over every pair of outlines, on all three fixture packs (l.212) and on every real pack (l.693). Caption boxes are also checked against every outline and every other caption at 1 to 5 columns (l.217).
  - Family adjacency: Large_01 and Large_02 (city), and Shop_01 and Shop_02 (simple), are neighbours in both the entry order and the grid (l.175, l.229). These are real `meshFamily` pairs (equal bounds and triangles), not hand-ordered.
- **Turned to the camera.**
  - The marker test (l.314) is independent of the yaw maths. A child Object3D is put one unit along `frontAxis(front)` in the model's own frame. The real `buildGalleryScene` is built, and three's world matrices give the direction, which must be within 0.5 degrees of +z. The fronts cover all four faces (`SCRAMBLED` plus a `-z`). A wrong `frontYaw` or a wrong sign would fail it.
  - The l.297 test uses `declaredFrontDirection`, so it is a consistency check rather than an independent one. The marker test carries the criterion.
  - The camera really looks from +z: `camera.ts` l.63 puts the town camera at `tz + dist*COS_E`, and the gallery rig does the same (`gallery.ts` l.500). Test l.514 asserts the position. So +z is the right target, and the ticket's "-z toward the viewer" was a slip in the wording, not a different rule.
  - Uncalibrated `Building_Mall_A` gets `"+z"`, `guessed` and "door: +z ?". Excluded gets "excluded", and corner gets "corner, open -x" (l.341).
- **Deterministic and isolated.**
  - Determinism (l.383) compares two JSON runs. That is weak in form, but the code has no randomness, no clock and no Map-order dependence (it sorts by explicit keys).
  - The flag is read only in `renderer.ts`. The test at l.659 checks the `galleryRequested(location.search)` call, that it comes before `buildScene(puzzle`, and that `main.ts` and `src/render/index.ts` don't mention it. `gallery.ts` never reads `location`.
  - The `renderer.ts` change is an early return that is taken only when `location` exists and the flag is present. In Node and the playtest `location` is undefined, so the town path is byte-for-byte as before.
  - No existing test file is edited (the diff touches only `gallery.test.ts` among tests).
  - Not pickable:
    - `noRay(scene)` runs over the whole gallery scene, `frontArrow` already disables raycast, and `hitTest` returns null;
    - test l.444 raycasts every object, and the scene recursively, and expects no hits.
- **No manifest.** `loadGalleryPack` resolves without rejecting on every path (no manifest, wrong version, missing pack, missing GLB) with one info line each (l.612-655). `buildGalleryScene(galleryLayout(null, ...))` builds one sprite reading "no converted packs" and doesn't throw (l.470).
- **Josh checks.** Left to him, as the ticket says.

## Rule conflicts and risks
- **Hard rules hold.**
  - The diff is `src/render3d/` (gallery.ts, gallery.test.ts, renderer.ts, debug3d.ts) and `docs/city-style-guide.md` only.
  - `camera.ts`, `town.ts`, `models.ts`, `layout.ts`, `main.ts`, `src/grid/` and `src/night/` are untouched.
  - No dependency. `git ls-files assets/private` is empty.
  - `gallery.ts` imports `../render/geometry` (ZOOM_STEP, Insets, Pan). `renderer.ts` already imports from there, so this is the existing practice for `render3d`, not a purity break.
- **The `frontArrow` extraction matches the old inline arrow.**
  - The defaults are the same: `FRONT_ARROW_LENGTH`, head 0.3 by 0.2, raycast no-op, `renderOrder` 9, `depthTest` false.
  - `frontsOverlay` still sets `userData.model`. `fronts=1` is unchanged.
- **The guide edits are accurate.**
  - Chapters 1 and 6 turn "Pending (043 section B)" into "Info (043 section B)". Chapter 15 step 5 now points at the gallery.
  - The new chapter 15 paragraph matches the code: an empty value means simple-town, only that pack's GLB is loaded, `?` marks no line, whole buildings come before parts, `&page`/`&per`, and the page is unpickable.
  - It doesn't mention the "copy of <family>" caption line (see Could improve). No number changed, so the drift test is unaffected (the main session's gate has it green).
  - Changing chapters 1 and 6 goes slightly past "step 5 of chapter 15", but the file is in B's list and leaving them Pending would be wrong.
- **Test fault (describe.skipIf).** At module and describe level the test only calls `existsSync(REAL)`, which never throws, and defines a lazy `readReal`. `readFileSync` of the manifest and of the source files (l.660, l.665, l.670) happens only inside `it` bodies. No other test file is in the diff, so no other test reads machine-only files at collection.
- **The builder's deviations are all acceptable.**
  - *Skipping scale-suspect entries.* It matches the town's own planner (`models.ts` l.218). On the real manifest the only building-named suspect is `SM_Bld_House_DeckSteps_01`, a part. The rest are characters, skylines, cars and the town demo scene. It does go against B2's letter for a listed name: a scale-suspect `MODEL_TABLE` name is dropped, and test l.159 asserts that. Harmless today.
  - *Extra prefixes.* I checked them against the real manifest. They drop only 29 SIMPLE Town scenery entries (beach, canal, seawall, bridges, road ramps, umbrellas, boats, trucks) and 6 Town Pack `SM_Generic_` mountains and tree patches. No building is hidden.
  - *A listed name bypasses the rule.* This is what B2 says.
  - *+z as the yaw target.* Correct for the camera (see above).
  - *Paging (12 per page).* This is extra scope, but needed for readability at 49 entries, and every entry is still reachable (test l.389 shows the pages cover each entry once).
  - *Its own rig.* `createCameraRig` takes a Puzzle, and `camera.ts` is read-only to this ticket. The rig uses the same `ELEVATION` and `FOV_DEG` and the same position formula. It is a small duplication of camera code that a later ticket could fold in.
- **Bare-name `BUILDING_FRONTS` keys.** This is a risk for the adopting ticket, not this one. Today `BUILDING_FRONTS` has only SIMPLE Town names, and none of the 52 names shared across packs is in it. The shared names include `SM_Bld_Shop_01..03` (city/town), `SM_Bld_Apartment_01` (apocalypse/city) and `SM_Bld_Church_01` (apocalypse/town). So every gallery page is correct now. Once one pack's `SM_Bld_Shop_01` is calibrated:
  - the other pack's gallery shows that front without `?`, hiding an uncalibrated door;
  - `galleryEntries` admits it whatever its size, because `listed` takes every `BUILDING_FRONTS` key whatever the pack (`gallery.ts` l.140);
  - the town has the same problem.

  The ticket that adopts a POLYGON pack should key fronts by pack, or the architect should note it in that ticket.

## Must fix
none

## Could improve
1. `gallery.test.ts` l.139: add an entry that is at least 4 m on one ground axis and under 4 m on the other (for example 6 x 5 x 2). That pins "both ground axes"; today both too-small fixtures fail on both axes.
2. `gallery.ts` `galleryTitle`: when the pack had scale-suspect entries, add a line such as "N scale-suspect entries not shown". A suspect building would then not vanish silently from a calibration page.
3. `docs/city-style-guide.md` chapter 15 Info line: mention the "copy of <family>" caption line. The ticket's caption has "family", and the guide's list of caption contents leaves it out.
4. Hand the bare-name `BUILDING_FRONTS` collision (above) to the lead-architect as a note for the ticket that adopts town-pack or city-pack.
