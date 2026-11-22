ticket: 074b-asset-viewer
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B makes three fixes to A's catalogue: the three store URLs from Card 2, every `PIECE_NOTES` row carried in full from `docs/design/073-pack-intended-use.md`, and every row matching only the pieces its note names, checked on near-miss fixtures and lazily on the real manifest. It then adds `createAssetGallery(canvas, deps?)` in `src/render3d/assetviewer.ts`: one renderer, one pack held at a time, a thumbnail queue that draws one per frame, pure framing and marker functions, a scene in metres, and an orbit that renders only on change.

## Does the branch do it?
This is round 2. I reviewed `ticket/074b-asset-viewer` at 19d0716 and checked the round-1 must-fix items in that commit (350be20..19d0716). I ran `src/render3d/assetcatalogue.test.ts`, `src/render3d/assetviewer.test.ts` and `src/render3d/lightrig.test.ts` at `--maxWorkers=1`: 95 passed, 0 failed. The real manifest is present in this worktree, so the lazy block ran and passed. I did not run `npm run typecheck` or the whole suite, because the main session's gate is running and Josh's PC must not take two heavy runs at once.

**Round-1 must-fix 1 (no row shortened): done.**
- `PIECE_NOTES` in `assetcatalogue.ts` now carries each row in the note's own words: the table text, each image with its description, the sureness line, and the departure with Josh's words.
- I spot-checked these rows against the note and they read the same:
  - the Powerpoll table row and its "Allow both" departure
  - Vines_01..08, with "on the mansion", "Outdoors, on resort ..." and the layout-sheet sentence
  - roof growth, with the "reads silly" fallback, Josh's parenthetical words and the F1b2 line
  - the mound's "(road, parking band, open paving)"
  - Generator, Streetlight, Windmill, WaterTower, RoadPiece_Damaged, Car_Wrecked
- New test "carries every row's text, images and departure exactly as docs/design/073-pack-intended-use.md has them". It checks every row's text lines, images and departure against the note, with the markdown marks stripped, so a paraphrase now fails the test. The note is committed, so the test is CI-safe.
- New test "keeps the limits a pass relies on". It pins the roof-growth fallback, Josh's words, the F1b2 line, the mound's hard-ground list, the pole's single clear case and the vines' layout-sheet sentence.
- My round-1 could-improve 4 is also done: the Vines_06 row now uses the manifest note's sentence and the "Uses taken" departure, not the builder's words.

**Round-1 must-fix 2 (real-manifest check on the split rows): done.** The lazy block now has the test "each split note row matches only the pieces its note names". It runs each narrowed row over the real manifest pack and lists any name outside the note's named set. The rows it covers:
- `Tree_Dead_0[12]` and the remaining `Tree_Dead_*`
- `Plant_Bush_01`
- `Terrain_Ground_Mound_Small_02`
- the saplings
- `Bld_Wall_02`
- Vines_06 and Vines_01..08
- Powerpoll_01/02

It passed here against the real file.

**Criteria met in round 1, unchanged since:**
- the store URLs (`PACK_PAGES`)
- the near-miss fixture test
- `packs()`, `loadPack()` and the thumbnail queue
- `thumbCamera` and `inspectMarkers`
- metres, unscaled, GLB orientation and `nearestTextures`
- `inspect` and `closeInspect` with `OrbitControls`

The diff touches only those areas through the new `configureRenderer` call in `WebGLSurface.ensure()`.

**Lighting.** The main session ruled on this: the asset scene uses the city's light rig in day mode, so `lightrig.test.ts` keeps one owner of scene lights and Josh sees pieces as the city shows them. I do not judge it against the ticket's "neutral daylight" wording. The round-1 risk about exposure is fixed. `configureRenderer` calls `setRendererMode(gl, "day")` on the WebGL renderer. The test "exposes pieces as the city shows its day view" pins the day mode's tone mapping, exposure and shadow flag, and checks that they differ from night.

**Josh, browser.** Not mine to judge.

**Licence.** The diff touches only the B file list. Nothing from the packs is committed. Thumbnails are still in-memory object URLs.

## Rule conflicts and risks
- Ticket 074's B text still says "one ambient, one directional, a mid-grey background". The code follows the main session's ruling instead, so the ticket and the code disagree until the ticket records that ruling.
- `configureRenderer` turns the renderer's shadow map on if the day mode has shadows. Shadow passes on each thumbnail and orbit frame add GPU work on Josh's machine. That matters little with one piece in the scene, but it is worth watching on Palm City.
- Framing and markers still assume a piece's base is centred on the origin (`sizeOf`). An off-centre pivot would sit off the 5 m square. This was could-improve in round 1 and is still open.
- No hard-rule break. `src/grid/` and `src/night/` are untouched, there is no new dependency, and no file outside the ticket's B list changed.

## Must fix
none

## Could improve
1. Record the main session's lighting ruling (the day rig and its exposure instead of neutral grey) in ticket 074's B criterion, so the ticket and the code say the same thing.
2. Frame the thumbnails and place the markers from `entry.bounds` (min/max) rather than from `sizeOf` about the origin, and add a test fixture with an off-centre pivot (carried from round 1).
3. If the day mode's shadows show up as load in the browser, turn `shadowMap.enabled` off for the viewer after `setRendererMode`. Pieces on a flat grey ground gain little from shadows.
4. The note's "Not shown" asides, such as "`Prop_Battery_03/04` (not told apart)", are not carried onto their rows. The criterion's sources don't include that section, so this is optional, but it would help Josh read the Generator/Battery row.
