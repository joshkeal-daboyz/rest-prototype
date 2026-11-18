# 043 · A city style guide: one written record of how the 3D town looks and is assembled, pinned to the code, with a building gallery

owner: renderer
status: section A done (merged 17 Nov 2026; Josh: "merge it, it's a good first shot, do section b"); B in progress. Approved (G1, Josh, 17 Nov 2026: "I approve ticket 43"; every open-question default applies, Q4 answered: POLYGON City and Town packs are the target style). Sections build in order A, B; C waits.
branch: `ticket/043-city-style-guide` (one branch per section: `-a`, `-b`, ...)

## Josh's words (17 Nov 2026)
> "We should create a city style guide."

Earlier words the guide records (all 17 Nov 2026 unless marked):
> "Corner buildings should only be placed on corners. They must also have two sides facing the street. Only corner buildings have this restriction. Other buildings can be placed on corners normally."

> "You don't have to make your own curbs. Rely on the asset agent to tell me to download road asset packs from the subscription I purchased." / "Powerlines can be generated from the asset packs too." / "The cut game looks ok, good for testing (not a final product)" / "Relight looks good" (all from ticket 042)

## Findings (checked against `main` at `a4e4ac2` and the 042 A branch at `2a6fc1d`, 17 Nov 2026; no browser)

### 1. The rules exist, but only scattered through four tickets and the code comments
- **Scale, lots, streets, blocks:** ticket 041 (A, B, C) and `town.ts`.
- **Fronts, families, variety, corner lots:** ticket 042 A and `models.ts` on the 042 A branch. That branch isn't merged yet.
- **Lit places, roads and pole hardware from packs:** ticket 042 B to E. B is approved but not built; C, D and E wait for downloads.
- **Pipeline, licence, packs:** tickets 038, 039 and 040, `tools/blender/README.md`, `assets/candidates/*.md` and Josh's licence ruling of 16 Nov 2026.
- **The accessibility rule:** 037. Live differs from dead by more than colour.
- An agent that adds a pack or a building has to read all of that. Nothing pins any of it together.

### 2. Constants the guide must state, and where they live now
- **`WORLD_PER_METRE` 0.18 is defined twice:** in `town.ts` and in `models.ts`, on `main` and on the 042 A branch. No test says the two are equal. The guide's drift test closes this (section A).
- **Street and lot numbers** (`town.ts`): `ROAD_W` 1.1, `KERB_OFFSET` 0.4, `KERB_H` 0.03, `PAVE_W` 0.45, `SETBACK` 0.15, `LOT_GAP` 0.1, `RING_MARGIN` 4, `BLOCK_PITCH` 12, `OUTER_RINGS` 1, `STREET_MIN_LEN` 2.5, `PLACE_REACH` 2.5, `STOREY_M` 3.2, `LOT_TYPES` and `PLACE_SIZES`. On the 042 A branch it also has `CORNER_GAP` 0.5.
- **Wire numbers** (`layout.ts`): `POLE_HEIGHT` 1.6, `POLE_SPACING` 3, `SAG_RATIO` 0.04, `WIRE_RADIUS` 0.03, `PHASE_OFFSET` 0.22, `BREAK_GAP` 0.3, `HANG_DROP` 0.6, `WIRE_PICK_RADIUS` 0.3, `DROP_REACH` 2.5.
- **Model numbers** (`models.ts`): `NEIGHBOUR_GAP` 0.5. On the 042 A branch it also has `STREET_REPEAT_GAP` 3, `FAMILY_SHARE_MAX` 0.25, `BUILDING_EXCLUDE` (empty), `BUILDING_FRONTS` and `MODEL_TABLE`.
- **Palette and light** (`scene.ts`): `POLE_WOOD`, `LIVE_WIRE`, `DEAD_WIRE` and `REPAIRED_WIRE` are exported. `GROUND`, `YARD`, `STREET`, `PAVEMENT`, `KERB`, `WARM`, `TARGET`, `INSULATOR`, `CAN` and the background, ambient and moon light colours are module-local. Placeholder `TINTS` are in `placeholders.ts`.
- **Camera** (`camera.ts`): `ELEVATION` 45 degrees and `FOV_DEG` 40. These give `OCCLUDE_SLOPE`, which `town.ts` already drift-tests.

### 3. Door sides: calibrated for SIMPLE Town, by eye, once
- **On the 042 A branch (`2a6fc1d`), Josh calibrated the fronts with `fronts=1`:** "all reversed 180 degrees". Only `store_small_mesh` was right at `"+z"`. So every other SIMPLE Town building is `"-z"`. `memorial_mesh` is still the `"+z"` guess, because Josh hasn't seen it yet (042 B places it).
- **The same comment names `store_small_mesh` as the video rental store.** `BUILDING_EXCLUDE` is still empty. Under 042's Q3 default it would go there once named. That belongs to 042 A's settle round, not this ticket. The guide records it as pending.
- **Nothing in a converted pack records a door side.** The converter centres every pivot, so a new pack has to be calibrated by eye. Today the only way is the `fronts=1` overlay over a whole town, where a model may not appear at all.
- A gallery that lays out every building of a pack, including ones not yet in `BUILDING_FRONTS`, makes calibration one look per pack (section B).

### 4. Packs: what is in the mix now, and what is pending
- **Converted** (`assets/private/out/manifest.json`, read 17 Nov 2026; conversion is still running, so these counts may change):
  - `simple-town` (scale 100);
  - `apocalypse-power` (scale 1, the power subset);
  - `town-pack` (POLYGON Town Pack: scale 1, 704 entries, 9 failures).
- **Unpacked, not yet converted:** `city-pack` (POLYGON City Pack, 333 FBX files in `assets/private/in/city-pack/FBX`).
- **In use today:**
  - SIMPLE Town buildings, one style (041 Q4 default, approved);
  - Apocalypse `SM_Prop_Powerpole_01` and `SM_Prop_LightPole_01` (041 C).
  - Nothing from `town-pack` or `city-pack` is in `MODEL_TABLE`.
- **POLYGON and SIMPLE are two styles.** The asset-scout calls POLYGON "flat-colour low-poly" and SIMPLE "simpler, more cartoon". 041 Q4's "one style" default was set before Josh downloaded POLYGON packs. Whether they mix, and how, is open (Q4). The guide must not decide it.

### 5. Corner buildings: Josh's rule and the code differ slightly
- **Josh's rule, in his words above:** a corner model has two sides on the street.
- **042 A's `Lot.corner` is broader.** It is true for the first or last lot of any row, or for a lot whose side edge is within `CORNER_GAP` of another road's pavement. The first or last lot of a row can sit beside a yard or another lot, with only one side on a street.
- That work is being built on the 042 A branch now. The guide states Josh's rule as **decided**, and the implementation as **pending 042 A**. Section C updates it when 042 A merges.

## Goal
- **Every agent and every new asset pack follows one written guide,** `docs/city-style-guide.md`. It says how the 3D town is meant to look and be assembled:
  - the one scale, lot types and sizes;
  - street and block rules;
  - how a building is chosen and turned to its road, and the corner rule;
  - lit places;
  - roads and power lines;
  - palette, light and the accessibility rule;
  - which packs are in the mix and under what licence handling;
  - a step-by-step for adding a pack.
- **Each item is marked decided** (with the ticket and Josh's words that decided it) **or open/pending.**
- **A test fails when a number in the guide stops matching the code,** so the guide can't drift.
- **Josh can open a gallery of every building in a pack** (section B): each with its declared front, family, lot type, corner flag and name. A new pack's door sides are then settled in one look.
- Play is unchanged.

## Sections, order and size
| Section | What | Needs | Size | Starts |
|---|---|---|---|---|
| **A**: the guide and its drift test | `docs/city-style-guide.md`, a test that pins its numbers to the code | 042 A merged (default, Q1) | about ½ day | on G1, after 042 A merges |
| **B**: the building gallery | a debug page in `src/render3d/` | A; 042 A's `BUILDING_FRONTS`, `meshFamily` and `debug3d.ts` | about ¾ day | after A |
| **C** (gated): bring the guide up to date | the pending chapters filled in | 042 A's corner rule merged, Town Pack and City Pack converted, Josh's Q4 answer | about ¼ day | when those land |

- Each section is its own build, review and playtest.
- A and B are independent of the pack conversions. The pending parts are written as pending.

## The design (defaults; the real choices are the open questions)

### Section A: the guide (`docs/city-style-guide.md`, new) and its drift test (`src/render3d/styleguide.test.ts`, new)
1. **Chapters**, each a short list. Every rule is tagged **Decided** (ticket, and Josh's words where he gave them), **Default** (an approved open-question default Josh didn't comment on), or **Pending** (what it waits for):
   1. *Purpose and status.* The guide records decisions; it decides nothing. A change to a rule is a ticket.
   2. *Scale.* One scale, `WORLD_PER_METRE` 0.18 (1 unit is about 5.6 m), for every building. No model is ever shrunk to fit a lot (041, over 039's Q1). Poles and lamp posts are fitted to `POLE_HEIGHT` 1.6 (041 Q3).
   3. *Streets and blocks.*
      - Roads run beside wires, on the camera side (041 Q1), at `ROAD_W` and `KERB_OFFSET`, with kerbs, pavements and junction pads.
      - Service runs are pavement only.
      - The ring road is at `RING_MARGIN`.
      - Outer blocks are at `BLOCK_PITCH` 12, pinwheel fill (041 A-Q1, Josh: "Pitch 12, pinwheel").
      - Odd-angled junctions stay code-drawn (042 Q7).
   4. *Lots.*
      - `LOT_TYPES` table (frontage × depth × height cap, metres), `SETBACK`, `LOT_GAP`.
      - The clearance rules: wires, nodes, places, and the occlusion rule with `OCCLUDE_SLOPE`.
      - `tall` lots are outside the ring only.
      - How a model's lot type is computed from its bounds (`lotTypeOf`), never hand-set.
   5. *Choosing a building.*
      - Families (`meshFamily`: same pack, bounds within 1 cm, equal triangles).
      - Family first, then variant.
      - The neighbour rule (`NEIGHBOUR_GAP`), the street repeat rule (`STREET_REPEAT_GAP`) and the cap (`FAMILY_SHARE_MAX`).
      - `BUILDING_EXCLUDE`.
      - Placeholders when no model fits.
      - The video rental store (`store_small_mesh`) and its exclusion: Pending, 042 A.
   6. *Facing.*
      - The front table (`BUILDING_FRONTS`, `ModelFront`, `frontYaw`). A clone's yaw is `lot.yaw + frontYaw(front)`.
      - SIMPLE Town calibration: every building is `"-z"` except `store_small_mesh` (`"+z"`), Josh, 17 Nov 2026. `memorial_mesh` is uncalibrated.
      - How a new model is calibrated: the gallery (section B, Pending), or `fronts=1` until then.
   7. *Corner buildings.*
      - Josh's rule, verbatim, Decided.
      - What counts as a corner lot in code: Pending, 042 A.
      - Which models are corner models (`corner: true`, `open` side): `store_corner_mesh` only, so far.
   8. *Lit places.*
      - Lit places are real buildings, chosen by kind (`PLACE_MODELS`).
      - Fitted between `PLACE_MIN_SCALE` and 1 × `WORLD_PER_METRE` inside 041's place boxes.
      - Warmed by an emissive tint over their own texture, with their own material clones.
      - A box when nothing fits.
      - Pending 042 B (approved, not built); landmarks Pending 042 E.
   9. *Power lines.*
      - One pole style.
      - Three code-generated conductors, sag `SAG_RATIO` 0.04, at `PHASE_OFFSET` on the cross-arm.
      - Code-drawn insulators, cans and drops.
      - The cut on a damaged cable and the Relight's look are approved and kept (Josh, 042).
      - Pack line meshes (`*_Lines_*`, `*_Preset_*`) are never used.
      - Pack pole hardware: Pending 042 D.
   10. *Roads from packs.* Josh's words (042). The default use (042 Q7): straight tiles at any angle, junctions only at right-angle crossings, odd pads code-drawn in the pack's material. Pending 042 C.
   11. *Palette and light.*
       - A night scene: background, ambient and moon colours.
       - Ground, yard, street, pavement and kerb colours.
       - Wire looks: live, dead and repaired.
       - The warm place glow and the target colour.
       - Placeholder tints.
       - Each as a hex value with the constant's name.
   12. *Accessibility.* The GDD's rule, as 037 applies it: state never reads by colour alone. Live wires differ from dead ones by brightness and motion. Lit lamps have a halo and a pool. Breakers and switches read by lever shape. The star is filled or hollow. Pole wood is at least 3:1 luminance against the street (037). Every new look must meet this, and its ticket must test it.
   13. *Packs in the mix.* A table with one row per pack:
       - pack id, style (SIMPLE or POLYGON), converter `scale`, status (in use, converted not used, not converted) and what it supplies;
       - SIMPLE Town, Apocalypse power subset, POLYGON Town Pack (converted, not used: Pending), POLYGON City Pack (not converted: Pending);
       - which styles may share a street: Open, Q4.
   14. *Licence handling.*
       - Everything under `assets/private/` is gitignored and never committed.
       - No GLB, manifest or `private` path in `dist/` (039's check).
       - Josh's ruling of 16 Nov 2026: GLBs reach a web build only if end users can't get them and the site is password-gated.
       - Model names are not licensed content and may appear in code.
       - The subscription ends access to the assets when it lapses (asset-scout note).
   15. *Adding a pack, step by step:*
       1. unpack the FBX source under `assets/private/in/<pack-id>/`;
       2. write `pack.json` (`scale`, `scaleOverrides`, textures), per `tools/blender/README.md`;
       3. run `npm run assets:convert <pack-id>`;
       4. check the manifest for `scale-suspect` and failures;
       5. open the gallery (section B) and record every building's door side in `BUILDING_FRONTS`;
       6. check families;
       7. add rows to `MODEL_TABLE`, with lot types computed from bounds;
       8. add any exclusions;
       9. update this guide's pack table.

       Steps 5 to 8 are a renderer ticket; steps 1 to 4 are Josh's.
2. **A "Numbers" table** in the guide: constant name, value and file, one row per constant in finding 2 that is exported. This is what the test reads. Prose elsewhere refers to the constants by name, not by retyping the number. Palette hex values are listed in the same table.
3. **The drift test** (`styleguide.test.ts`, Vitest, reads the doc with `fs`, as `town.test.ts` already reads source files):
   - it parses the Numbers table;
   - for each row, it imports the named constant from the named `src/render3d/` file and checks the value (numbers within 1e-9; hex colours exactly; `LOT_TYPES` and `PLACE_SIZES` row by row);
   - it checks that `town.ts`'s and `models.ts`'s `WORLD_PER_METRE` are equal;
   - it checks that every pack id in the guide's pack table marked "in use" appears in `MODEL_TABLE`, and that every `MODEL_TABLE` pack appears in the pack table;
   - it checks that every name in `BUILDING_FRONTS` whose front is not `"-z"` is listed by name in the facing chapter. The calibration exceptions are then always written down.
4. **Palette constants that are module-local** (`GROUND`, `STREET`, `WARM`, ...): A may add the word `export` to those in `scene.ts`, changing no value, so the test can pin them. Default: yes (Q3).

### Section B: the building gallery (`src/render3d/gallery.ts`, new; `renderer.ts` reads the flag; `debug3d.ts` reused)
1. **The page.** `/?puzzle=<any>&view=3d&gallery=<pack-id>` (default pack `simple-town`). Instead of the town, it shows every building-sized entry of that pack's manifest, in rows on a plain ground, at `WORLD_PER_METRE`.
   - Each model stands on its own lot outline, sized by `lotTypeOf` (or a dashed outline when it fits no type).
   - It is turned by its `BUILDING_FRONTS` entry so its declared door faces the camera. A name with no entry is drawn at the `"+z"` guess, with `?` in its caption.
   - It shows 042 A's red front arrow and a caption: name, family, lot type, `corner`/`open` when set, and "excluded" when in `BUILDING_EXCLUDE`.
   - Members of one family stand side by side. The camera is the existing rig framed on the gallery's extent.
   - `location.search` is read in `renderer.ts` only. `main.ts` is untouched. It is never a pick target and never in a playtest. With no manifest, the page shows one caption, "no converted packs", and no error.
2. **What counts as building-sized:** entries whose names are in `MODEL_TABLE` building rows or `BUILDING_FRONTS`, plus any other entry of the pack whose bounds are at least 4 m on both ground axes and 3 m high. Excluded are names matching the pack's prop and road prefixes (`road_`, `path_`, `SM_Prop_`, `SM_Env_`, `SM_Veh_`). The builder reports the count per converted pack.
3. **Pure layout:** `galleryLayout(manifest, packId, fronts, exclude): GallerySlot[]` (position, yaw, lot outline, caption lines) has no three and is Vitest-tested. `gallery.ts`'s three part only places clones at those slots.

### Section C (gated): bring the guide up to date (`docs/city-style-guide.md`, `styleguide.test.ts`)
- Replace each Pending marker whose work has landed:
  - 042 A's corner-lot definition (and whether it now requires two street sides, per Josh's rule);
  - 042 B's place models;
  - the Town Pack and City Pack rows (scale checked, style, what is used), with Josh's Q4 answer.
- Add new constants to the Numbers table.
- **From then on, every ticket that changes a constant or a rule in the guide updates the guide in the same branch.** The drift test enforces the numbers, the reviewer the prose.

## Acceptance criteria

### Section A
- [ ] **The guide exists** (reviewer checks): `docs/city-style-guide.md` has the fifteen chapters above. Every rule in it carries Decided (with ticket, and Josh's quoted words where he gave them), Default, Pending or Open. Josh's corner rule is quoted verbatim.
- [ ] **No new rules** (reviewer checks): every Decided or Default item traces to a ticket or Josh's words cited beside it. Nothing in the guide is a rule no ticket made. Anything the builder thinks is missing goes in its report as a proposal.
- [ ] **Numbers pinned** (Vitest, `styleguide.test.ts`): every row of the guide's Numbers table matches the named export (within 1e-9; colours exactly). Changing any one constant in code, or any one value in the table, fails the test. The builder shows this by temporarily editing one value and reporting the failure message.
- [ ] **One scale** (Vitest): `town.ts`'s and `models.ts`'s `WORLD_PER_METRE` are equal.
- [ ] **Packs and fronts listed** (Vitest):
  - every `MODEL_TABLE` pack id is in the guide's pack table and every "in use" row is in `MODEL_TABLE`;
  - every `BUILDING_FRONTS` name whose front is not `"-z"`, or that has `corner`, is named in the facing or corner chapter.
- [ ] **Accessibility restated** (reviewer checks): the accessibility chapter names the 037 and 041 C tests that enforce it.
- [ ] **Josh checks:** he reads the guide (GitHub or editor). He names any rule he doesn't recognise as his, and answers the Open items or leaves the defaults.

### Section B (Vitest without WebGL, except "Josh checks")
- [ ] **Every building of a pack is shown:** `galleryLayout` on a manifest fixture (copied from the real manifest's names and bounds) returns one slot per building-sized entry, by the rule in B2. No two slots' lot outlines overlap. Family members are adjacent.
- [ ] **Turned to the camera:**
  - each slot's yaw turns its declared front toward the camera (−z of the gallery's frame toward the viewer, within 0.5 degrees, by the same marker test as 042 A);
  - an uncalibrated name gets the `"+z"` guess and a `?` caption;
  - an excluded name is captioned "excluded".
- [ ] **Deterministic and isolated:**
  - `galleryLayout` is deterministic;
  - with `gallery` absent the scene is exactly as before (the existing scene tests pass unedited);
  - no gallery object is a pick target.
- [ ] **No manifest:** the gallery shows its "no converted packs" caption and throws nothing.
- [ ] **Josh checks:** `/?puzzle=09-shrine-circuit&view=3d&gallery=simple-town`. Every SIMPLE Town building faces him with its arrow on its door. He names any that doesn't. Then `&gallery=town-pack` once it is converted: he names every door side, and those become `BUILDING_FRONTS` lines in the ticket that adopts the pack (not this one).

### Section C
- [ ] Every Pending marker whose work has merged is replaced by the rule as built, with its ticket. The drift test covers any new constant. The pack table lists Town Pack and City Pack with their real scale and status.

### Nothing else moves (the main session checks, every section)
- [ ] `npm run gate` is green and the test count grew. `npm run playtest` is green with no snapshot change.
- [ ] `git diff main -- src/render/ src/core/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts tests/ puzzles/ tools/ package.json public/ index.html` is empty, and `git ls-files assets/private` is empty.
- [ ] A: no `src/render3d/` source change apart from adding `export` to existing `scene.ts` constants (values unchanged). B: `npm run build` puts no `.glb`, no `manifest.json` and no `private` path in `dist/` (039's check).

## Files
- **May touch:**
  - A: new `docs/city-style-guide.md`; new `src/render3d/styleguide.test.ts`; `src/render3d/scene.ts` and `placeholders.ts` (the word `export` on existing constants only).
  - B: new `src/render3d/gallery.ts` and `gallery.test.ts`; `renderer.ts` (reads `gallery=`); `debug3d.ts` (reuse of the arrow and caption, no behaviour change to `fronts=1`); and `docs/city-style-guide.md` (step 5 of chapter 15 points at the gallery).
  - C: `docs/city-style-guide.md`, `src/render3d/styleguide.test.ts`.
- **Must not touch:**
  - `src/render/`, `src/core/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/` and `src/main.ts`;
  - `town.ts`, `models.ts`, `layout.ts` and `camera.ts`: read only, so the guide records the code and never changes it;
  - `tests/`, `puzzles/`, `tools/`, `assets/`, `package.json`, `vite.config.ts`, `index.html`, `public/`;
  - the other `docs/` files.

  If the builder finds a rule it thinks is wrong, it writes it in its report. It doesn't change the code or the rule.
- **Owner note:** `docs/` has no owner in the brief's table. This ticket gives `docs/city-style-guide.md` to the renderer, which owns the code it describes. See Q2.

## Interfaces
- **No `src/core/` change, no schema change, no new dependency.** The drift test uses Node's `fs`, as `town.test.ts` already does. The gallery uses Three and the GLTFLoader already approved (037, 039).
- **Local to `src/render3d/`** (the builder writes them):
  - B: `gallery.ts`: `GallerySlot { name, x, z, yaw, lot: { w, d } | null, caption: string[] }`, `galleryLayout(manifest, packId, fronts, exclude): GallerySlot[]`, `galleryRequested(search): string | null`.
  - A: none beyond `export` on existing constants.

## Open questions for Josh (defaults apply if you just approve)
1. **Order with 042 A.** Default: A starts once 042 A (with your front calibration) is merged, so the guide records what is on `main`. The alternative: stack 043 A on the 042 A branch now; it can't merge before 042 A.
2. **Who owns the guide.** Default: the renderer writes and keeps it, because it owns every file the guide describes. The alternative is the lead-architect, which would then also edit it at every cut. Either way, rule changes still come only through tickets.
3. **Pin the palette.** Default: yes. A exports the module-local colour constants in `scene.ts` (no value changes) so the test pins them. The alternative: the guide lists colours as informative only, unpinned.
4. **Styles in one town. ANSWERED by Josh, 17 Nov 2026: "SIMPLE town was a test, the city stuff is higher detail".** The target style is the POLYGON City Pack and Town Pack (higher detail); SIMPLE Town was a test and is the placeholder and fallback until the POLYGON buildings are in. The guide records that as Decided, and which exact mix (POLYGON only, or City by district) stays Open until he has seen the gallery. Original question, for the record. POLYGON Town and City Pack are a different style from SIMPLE Town. Options were:
   - (a) SIMPLE only;
   - (b) POLYGON only (replace SIMPLE);
   - (c) mixed by district (for example POLYGON in the outer blocks, SIMPLE inside the ring, never on one block side);
   - (d) mixed freely.

   This is your call. The guide won't pick.
5. **Corner rule wording.** Default: the guide quotes your rule and marks the code's corner-lot definition Pending 042 A. If 042 A's "first or last lot of a row" stays (a lot with only one street side can count), that's a gap against your words "two sides facing the street". It goes back to 042 A's settle round, not here.
6. **The video rental store.** `store_small_mesh` is named in the 042 A branch's comments, but `BUILDING_EXCLUDE` is still empty. Default: the guide records it as Pending 042 A. Say if you want it excluded, kept at a lower weight, or kept as is.
7. **Gallery scope.** Default: buildings only. The alternative: a later section adds road tiles and pole hardware rows for 042 C and D.
8. **Decided rules.** None is touched; this is documentation and a debug page. There is no `rules-coverage.md` change. The accessibility rule is restated in the guide and still tested where 037 and 041 C test it.

## Within approved scope?
**Yes.**
- A is a document plus a test, with no behaviour change. B is a debug-only page behind a URL flag, in `src/render3d/`, the renderer's folder (as 042 A's `fronts=1`).
- No dependency, no schema, no `src/core/` type, and no edit to `src/render/`, `main.ts`, `tests/` or `puzzles/`.
- The guide records decisions and never makes one. Every Open item above, and any rule the builder thinks is wrong, comes back to you as a ticket.
- Pack models stay under the gitignored `assets/private/`, per your licence ruling of 16 Nov 2026.

Each section starts only on your G1.
