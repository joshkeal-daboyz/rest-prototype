# City style guide: how the 3D town looks and is assembled

Written 17 Nov 2026 for ticket 043 section A, against `main` after ticket 042 section A (commit 32544f2). Owner: the renderer agent, who owns the code this guide describes.

How to read it:

- Every rule below starts with one tag.
  - **Decided**: a ticket decided it. The ticket number is beside it, and Josh's words where he gave them.
  - **Default**: an open-question default in an approved ticket that Josh did not comment on.
  - **Pending**: work that is approved or planned and not built. What it waits for is written beside it.
  - **Open**: a question Josh has not answered. The guide does not pick.
  - **Info**: a fact about the code or the packs, not a rule.
- Numbers are not retyped in the prose. They live in the [Numbers](#numbers) table at the end, which `src/render3d/styleguide.test.ts` checks against the code on every test run. The prose names constants.
- A change to a rule is a ticket. From ticket 043 section C on, a ticket that changes a constant or a rule here changes this guide in the same branch.

## 1. Purpose and status

- **Decided (043, Josh, 17 Nov 2026: "We should create a city style guide.")**: this guide is the one written record of how the 3D town looks and is assembled. It records decisions and decides nothing.
- **Info**: it covers `src/render3d/` only. The 2D view (`src/render/`) is not described and is not changed by anything here.
- **Default (043 Q2)**: the renderer writes and keeps it. Rule changes still come only through tickets.
- **Info (043 section B)**: a building gallery (`gallery=<pack-id>`) shows every building-sized entry of a pack so its door sides are settled in one look (chapter 15).
- **Pending (043 section C)**: the Pending markers below are replaced as 042 B to E and the pack adoptions land.

## 2. Scale

- **Default (041 Q3)**: one scale, `WORLD_PER_METRE`, for every building. One map unit is about 5.6 m. The constant is defined in both `town.ts` and `models.ts`, and the drift test keeps the two equal.
- **Decided (041, Josh, 17 Nov 2026: "The buildings are also scaled variably. I can see the same building copied and pasted multiple times and scaled at different sized.")**: no building model is ever shrunk or grown to fit a lot. A model is its true size in metres times `WORLD_PER_METRE`. Lots are sized to buildings, not the reverse. This undid 039's shrink-to-lot.
- **Default (041 Q3)**: poles and lamp posts are the exception. They are fitted to `POLE_HEIGHT`, because the wires attach there (about 9 m at building scale).
- **Info**: the circuit is dense, so inside the ring buildings are sparse and low. Most of the city is in the blocks round it.
- **Info**: placing a place model (042 B) may scale it below `WORLD_PER_METRE`, down to `PLACE_MIN_SCALE`. That is Pending (chapter 8).

## 3. Streets and blocks

- **Default (041 Q1)**: a road runs beside a wire, on the camera side (the side of the line's normal that points toward +z; a line parallel to z puts its road on +x). If that road would cover another node's square it takes the other side; if both sides are blocked the line has no road. The road's near kerb is `KERB_OFFSET` from the line, so the wire, its poles and its nodes stand on the pavement.
- **Default (041 Q1)**: a road is `ROAD_W` wide, with a kerb of height `KERB_H` along both edges and a pavement band `PAVE_W` wide outside each kerb. Kerbs and pavements are clipped where another road or a pad lies over them. Where roads end at one node, or meet the ring or the grid, a junction pad covers their ends (the convex hull of the end edges).
- **Default (041)**: a line shorter than `STREET_MIN_LEN` is a service run: pavement only, no road. Decor segments and feed lanes become streets by the same rules.
- **Default (041)**: a ring road runs at `RING_MARGIN` outside the circuit's bounds. One ring of city blocks (`OUTER_RINGS`) surrounds it, on a grid of streets at about `BLOCK_PITCH` (each block side between 11 and 15, nearest `BLOCK_PITCH`; `gridCount`). The town's window is the ring plus that one ring of blocks.
- **Decided (041 A-Q1, Josh, 17 Nov 2026: "Pitch 12, pinwheel")**: outer blocks are filled pinwheel-fashion. Each side's row starts at its own corner, clockwise, and stops `LOT_GAP` short of the next side's band. Each side reserves its band first, sized to the deepest lot type allowed there. A side takes `large` lots only where a row beside its band still holds `ROW_MIN_SMALLS` small lots.
- **Default (041 Q2)**: the 3D town builds its own streets and lots. It does not follow the 2D backdrop. Places may sit a little apart from where 2D draws them.
- **Default (041)**: a dashed centre line is drawn on ring and grid roads only (roads wider than 1). Yards (what frontage fill cannot use) are dark ground.
- **Default (042 Q7)**: odd-angled junction pads stay code-drawn, even when roads come from a pack (Pending 042 C, chapter 10).
- **Default (041 Q8)**: no street furniture (trees, bins, hydrants, traffic lights, parked cars) yet. A later ticket may add it.

## 4. Lots

- **Default (041)**: a lot is one of four types in `LOT_TYPES` (frontage x depth x height cap, metres; see Numbers), exactly that size times `WORLD_PER_METRE`. Its front edge lies on its pavement's outer edge plus `SETBACK`, and its yaw turns its front to its road.
- **Default (041)**: frontage fill goes along every road side in a fixed order. First the ring road's inside, then the outer blocks (pinwheel), then the circuit's streets in file order (a line's road has frontage on its far side only), then decor. At each step the lot type is chosen by `stableHash` of the road side and slot index from the types allowed there. If no type fits, the cursor moves on by `FILL_STEP`.
- **Default (041)**: the types allowed on a ring or grid side are those whose depth, plus the `small` depth and `LOT_GAP`, fits the block's inside. `tall` lots are outside the ring only, and are never on circuit streets.
- **Default (041)**: a lot is kept only if it clears these.
  - Every road, pad, pavement and node square.
  - Every other lot, by `LOT_GAP`, and every place.
  - Every wire span, by `WIRE_CLEAR` horizontally.
  - The occlusion rule. For every wire point, node top (`NODE_TOP_Y`) and lamp head (`LAMP_HEAD_Y`) north of the lot, the distance must be at least (the lot's height cap minus the point's height) times `OCCLUDE_SLOPE`. `OCCLUDE_SLOPE` follows the camera (`ELEVATION`, `FOV_DEG`), and `town.test.ts` pins it to `camera.ts`.
- **Default (041)**: a model's lot type is computed from its bounds by `lotTypeOf` (the first type in `small`, `house`, `large`, `tall` order that holds its front-turned footprint and height). It is never hand-set. A model that fits no type is not used.
- **Info**: placeholder buildings (no model for a type, or no `assets/private/`) are boxes with storeys of `STOREY_M`, a roof and one of four dark tints, never over the lot's cap. Nothing in them is lit. They follow the same neighbour rule as models.

## 5. Choosing a building

- **Default (042 A, from 041)**: a lot's building is chosen by family first, then by variant. A family is one mesh under several names: models of one pack whose bounds agree to 1 cm and whose triangle counts are equal (`meshFamily`). Each family has equal weight, so a mesh with three names is not three times as likely.
- **Default (041 B4, 042 A)**: neighbours (lots within `NEIGHBOUR_GAP`) never share a family. Along one road side a family does not return within `STREET_REPEAT_GAP` lots. On a map no family takes more than `FAMILY_SHARE_MAX` of its type's lots when the type has four or more families. A pick that breaks a rule takes the next family; if every family breaks one, the cap goes first, then the street rule, then the neighbour rule.
- **Decided (042, Josh, 17 Nov 2026: "There are too many video rental stores.")**: the variety rules above exist because of these words.
- **Default (042 Q3, keys by 045 A)**: `BUILDING_EXCLUDE` drops models outright. It lists `pack:name` keys (for example `simple-town:store_small_mesh`), because names repeat across packs. A named store would go there. It is empty today. In a dev build, models Josh shift-clicked in the gallery (ticket 045) are excluded too, from a file on his PC; a fresh checkout and CI use the code's list only.
- **Pending (043 Q6, 042 Q3; waits for Josh)**: the video rental store. It is named (`store_small_mesh`, which Josh calls the video rental store), and `BUILDING_EXCLUDE` is empty. Whether to exclude it, give it a lower weight, or keep it is Josh's decision and is open. SIMPLE Town being a test makes it low priority, but nothing is decided.
- **Info**: the guide's check of this chapter: `BUILDING_EXCLUDE` is empty, so the guide lists no excluded key.
- **Default (041 Q4)**: when no model fits a lot type (or there is no manifest), the lot keeps its placeholder building.

## 6. Facing

- **Info**: a model's door side is the axis, in the GLB's own frame, that its door faces (`ModelFront`: "+z", "-z", "+x", "-x"). `BUILDING_FRONTS` holds it, one line per `pack:name` (names repeat across packs: `SM_Bld_Shop_01` is in more than one). `frontYaw` gives the turn (0, pi, -pi/2, pi/2), so a clone's yaw is `lot.yaw + frontYaw(front)`. A quarter-turn front swaps the model's width and depth in `lotTypeOf`.
- **Info**: nothing in a converted pack records a door side, because the converter centres every pivot. A new pack's door sides are therefore settled by eye. A model listed nowhere in `BUILDING_FRONTS` is drawn at the "+z" guess. In a dev build a saved calibration file (`assets/private/calibration/fronts.json`, never committed) is laid over the table: its front replaces the code's, and a key the code lacks is added (ticket 045).
- **Decided (042 A, Josh, 17 Nov 2026, calibrating SIMPLE Town with `fronts=1`: "all reversed 180 degrees")**: every SIMPLE Town building is "-z" except `store_small_mesh`, which was right at "+z". The exceptions are the table below. `memorial_mesh` (042 B's, not placed yet) is still the "+z" guess, because Josh has not seen it.
- **Info**: any `pack:name` whose front is not "-z", and every corner model, is listed in this chapter or the next. The drift test compares these two tables with `BUILDING_FRONTS`.

| Name | Front | Note |
| --- | --- | --- |
| `simple-town:store_small_mesh` | +z | calibrated by Josh, 042 A |
| `simple-town:memorial_mesh` | +z | the starting guess, not yet seen (042 B) |

- **Default (042 Q2)**: the way to calibrate a model is the `fronts=1` overlay (`/?puzzle=09-shrine-circuit&view=3d&fronts=1`). It draws a red arrow along each building's declared front and a caption with its name, family and corner sides. Each correction is a one-line edit to `BUILDING_FRONTS`, keyed `pack:name`.
- **Info (043 section B)**: the gallery (`/?puzzle=09-shrine-circuit&view=3d&gallery=<pack-id>`) shows every building-sized entry of a pack, declared front and all, so a pack's door sides are one look. See chapter 15.
- **Info (045 section C, dev builds only)**: the gallery takes clicks. Click the copy whose door faces you: that side becomes the model's front and the choice is written at once to the saved file (`assets/private/calibration/fronts.json`) through the dev server; the copy's caption then reads `current, saved`. Clicking another copy changes your mind. Clicking the `current` copy when its front is only the code's table or the "+z" guess saves it as it stands; clicking one that is already `saved` does nothing. Shift+click sets that side and toggles `excluded` (a model you never want placed). Delete (or Backspace) clears the last-clicked model, so the code's table applies again. A press and release within 5 px is a click; further is a pan. If the dev server cannot write, the mark stays on screen with `not saved: <reason>` under the model's caption and in the title, and the next click retries. The line never reorders when you mark a model. A click does not reach the town, and none of this is in `npm run build`.

## 7. Corner buildings

- **Decided (042 A, Josh, 17 Nov 2026)**: "Corner buildings should only be placed on corners. They must also have two sides facing the street. Only corner buildings have this restriction. Other buildings can be placed on corners normally."
- **Decided (042 A, implemented)**: a lot is a corner lot if a side edge of it lies within `CORNER_GAP` of another road's pavement (not its own road's), and that road's centreline lies toward that side, within `CORNER_ANGLE_MAX` degrees of the side's outward axis (a road behind the lot is not a cross street). `Lot.cornerSides` lists each such side ("+x" or "-x" in the lot's own frame) with the cross road's id; `Lot.corner` is true when it is not empty. A row end that meets no other road is not a corner, and a service strip is not a road.
- **Decided (042 A, implemented)**: a corner model (`corner: true` in `BUILDING_FRONTS`) goes only on a lot whose `cornerSides` has the side of its `open` frontage. It faces its own road, with its second frontage toward the cross street. A yaw cannot mirror, so a model only goes where its open side is a lot side that meets a cross street. Every other model is unrestricted on corners.
- **Info**: the only corner model is `store_corner_mesh`, in the table below. It is rarely placed, because few lots qualify. Its `open` side was flipped when the fronts were turned, and it is still an uncalibrated guess: Josh has not checked that its second face lands on the cross street.

| Name | Front | Open |
| --- | --- | --- |
| `simple-town:store_corner_mesh` | -z | -x |

- **Pending (a POLYGON adoption ticket)**: the City Pack's modular `_Corner_` pieces (chapter 13) will need their own corner handling when assembled. Not decided.

## 8. Lit places

- **Info**: today a place (what a lamp lights) is a warm box in the place's size (`PLACE_SIZES`, each `PLACE_STOREYS` storeys), placed before the ordinary lots, within `PLACE_REACH` of its lamp and nearer it than any other lamp. A place that finds no room is a pool of light on the lamp's lane. A streetlight is always a pool.
- **Default (041)**: a place, but not an ordinary lot, may also front either side of a service run. A gate's posts may both stand on the free side of the wire if one on each side fails. (041 A-Q2, no objection from Josh.)
- **Decided (042, Josh, 17 Nov 2026: "The objects being lit are still just squares. Can we light up buildings from the asset pack instead?")**: lit places become real buildings.
- **Pending (042 B, approved, not built)**: a place is a model chosen by kind from `PLACE_MODELS`, fitted inside its box at a scale between `PLACE_MIN_SCALE` and 1 times `WORLD_PER_METRE`, warmed by an emissive tint over its own texture (`PLACE_GLOW_MAX` times the place's glow), on its own material clones. With no model that fits, the warm box stays.
- **Pending (042 E, gated on a landmark pack)**: landmark buildings (a church, a bell tower, an inn) for sacred and hall places.

## 9. Power lines

- **Decided (041, Josh, 17 Nov 2026: "Currently they are just lines and they don't look like 'power lines'." The quotation marks inside his sentence are changed to single ones here.)**: lines are wooden poles of one style on the pavement, each carrying three conductors on a cross-arm.
- **Default (041 Q6)**: poles are spaced at most `POLE_SPACING` apart, evenly along a run. Three conductors sit at minus `PHASE_OFFSET`, 0 and plus `PHASE_OFFSET` along the cross-arm, which runs across the run, at `POLE_HEIGHT`. A run with no intermediate pole draws one conductor.
- **Default (041 Q5)**: sag is `SAG_RATIO` of the span, and a conductor's radius is `WIRE_RADIUS`. This reversed the 12% sag of 037 C-Q2, because heavy sag on short spans made the wires read as lines.
- **Default (041 Q9, C5)**: insulators, transformer cans and service drops are code-drawn (neither pack had them; drops are 041 C5). An insulator sits under each conductor on every intermediate pole. A can hangs `CAN_OFFSET` from its pole's axis, toward the pole's first drop, and `CAN_DROP` under the wire's height. A pole carries a can only if it has a drop.
- **Default (041 C5)**: a service drop goes from an intermediate pole to a building (not a place) whose front is within `DROP_REACH` of it. It leaves the pole `DROP_DROP` under the wire's height and lands `DROP_END_Y` high on the building's front (two thirds of the building's height if that is lower). Drops are thin, always dull, never pick targets, and are scenery.
- **Info**: the code uses a `DROP_REACH` of 2.5, where 041 C5 wrote 2. At 2 almost no lot is reachable (the reason is in the `layout.ts` comment). The 041 C review raised the difference, and 041 merged with 2.5.
- **Decided (042, Josh, 17 Nov 2026: "The cut game looks ok, good for testing (not a final product)" and "Relight looks good")**: the cut on a damaged cable and the Relight keep their looks. The cut cuts all three conductors in the same span, their ends hang by `HANG_DROP`, and the gap is `BREAK_GAP` wide. Every ticket that touches the town keeps `live.test.ts`, `relight3d.test.ts` and the break and conductor tests passing unchanged.
- **Default (041 C6)**: clicking any of the three conductors picks the line (`WIRE_PICK_RADIUS`). Node priority is unchanged.
- **Default (042 Q9)**: conductors stay code-generated. Packs supply pole, arm, insulator and can hardware only. Pack line meshes (`*_Lines_*`, `*_Preset_*`) are never used.
- **Pending (042 D, gated on a power pack)**: pack pole hardware. `PHASE_OFFSET` follows a pack arm's insulator tops if they differ, and `WIRE_PICK_RADIUS` is re-checked.
- **Info**: today the pole is `SM_Prop_Powerpole_01` and the lamp post `SM_Prop_LightPole_01`, both from `apocalypse-power`.

## 10. Roads from packs

- **Decided (042, Josh, 17 Nov 2026: "You don't have to make your own curbs. Rely on the asset agent to tell me to download road asset packs from the subscription I purchased." and "Powerlines can be generated from the asset packs too.")**: roads, kerbs and pavements come from a road pack, not code-drawn. This supersedes 041 Q7 ("roads code-drawn everywhere") for 042 C.
- **Decided (042 C amendment, Josh, 17 Nov 2026: "the city pack has road tiles" and "no it's fine if it's in c, continue")**: the POLYGON City Pack (`city-pack`, converted with `"scale": 100`) is the first-choice road pack. SIMPLE Town's kit is the fallback.
- **Default (042 Q7)**: straight tiles run along every road at its own angle, repeated at true length times `WORLD_PER_METRE` and scaled across to `ROAD_W`. Pack junction pieces stand only where the ring and grid cross at right angles. The circuit's odd-angled pads stay code-drawn, with the pack's road material. `Town`'s geometry is unchanged.
- **Pending (042 C, gated on Josh's converted road pack)**: the road, junction, kerb and pavement slots in `MODEL_TABLE`, each falling back, per slot, to the code-drawn part.

## 11. Palette and light

- **Info**: it is a night scene. The values are in the Numbers table (colours as `0x` hex, pinned exactly). The scene's background, ambient light and moon light are written inline in `buildScene`, so the table's last section pins their source text instead.
- **Info**: ground colours: `GROUND` (the town's dark edge), `YARD` (open ground inside a block, a little lighter), `STREET` (asphalt), `PAVEMENT` (mid-grey, lighter than the asphalt), `KERB` (the pale lip) and `CENTRE_LINE`.
- **Info**: pole and hardware colours: `POLE_WOOD`, `FOOT`, `METAL`, `INSULATOR`, `CAN` and `DROP_COLOR`.
- **Info**: wire looks: `LIVE_WIRE` (with `LIVE_GLOW`), `DEAD_WIRE` and `REPAIRED_WIRE` (a mended cable that is not live: 2D's "new cable"). `SCORCH` is a blown fuse or a faulted body. `RIBBON` marks a fault.
- **Info**: light: `WARM` is a lit place's and lamp's glow, `TARGET` the target lamp's. `PLACE` is an unlit place box.
- **Default (041)**: placeholder walls use four dark tints (`TINTS`), and the roof is `ROOF_SHADE` of the wall, so a town of boxes stays dark. A storey is `STOREY_M`; a flat roof's parapet is `CAP_M`, a pitched roof rises `PITCH_M`.
- **Info**: `DEAD_WIRE` and `REPAIRED_WIRE` match 2D's colours, and `live.test.ts` holds a drift guard for the repaired one.

## 12. Accessibility

- **Decided (037, the GDD's accessibility rule)**: state never reads by colour alone. Every new look must meet this, and its ticket must test it.
- **Decided (037, 041 C)**: a live wire differs from a dead one by more than colour. A live wire is brighter, glows and breathes, and carries a bead that moves away from the feed. A dead wire is dull and still. A damaged cable shows a visible break and a spark. All three conductors of a line share the line's look.
- **Decided (037)**: a lit lamp has a light pool and a halo, and flickers in a brownout. Breakers and switches read by lever shape and position (a breaker's lever is up when closed and flat or dropped when open; a switch's points down the selected line, with a chevron). The target star is filled or hollow. The fuse reads by its bar as well as its caption tone.
- **Decided (037)**: poles are painted at least 3:1 in luminance against the street (`POLE_WOOD` against `STREET`), so they read by brightness. The drift test repeats this check on the pinned colours.
- **Info**: the tests that enforce it today are in `scene.test.ts` (lamps and brownout; breaker, switch and fuse bar; poles 3:1), `live.test.ts` (breaker, lamp, fuse and damaged-cable looks; "gives all three conductors the line's look", which checks the bead and breathing), and `look.test.ts` (looks from state).
- **Pending (042 B to D)**: a pack model or hardware must keep these looks. A lit place model still warms by emission over its own texture and keeps its pool and star.

## 13. Packs in the mix

- **Decided (043 Q4, Josh, 17 Nov 2026: "SIMPLE town was a test, the city stuff is higher detail")**: the target style is the POLYGON City Pack and Town Pack. SIMPLE Town is the placeholder and fallback until POLYGON buildings are in. This overtakes 041 Q4's "SIMPLE Town only", which stays the working set until a ticket adopts POLYGON buildings.
- **Open (043 Q4, until Josh has seen the gallery)**: the exact mix. POLYGON only, or City Pack by district (for example in the outer blocks) with Town Pack elsewhere. Whether SIMPLE Town stays anywhere. Which styles may share a street.
- **Info**: the pack table, from the manifest read on 17 Nov 2026 (`assets/private/out/manifest.json`; the converter's `scale` is each pack's `pack.json` value, which the drift test checks when the manifest is present).

| Pack id | Style | Converter scale | Status | What it supplies |
| --- | --- | --- | --- | --- |
| apocalypse-power | POLYGON Apocalypse (the power subset) | 1 | in use | pole `SM_Prop_Powerpole_01`, lamp post `SM_Prop_LightPole_01` |
| simple-town | SIMPLE Town | 100 | in use | every building today (placeholder style); `scaleOverrides` for two stations and one road tile |
| town-pack | POLYGON Town Pack | 1 | converted, not used | houses, a church, a garage, a shed, props (Pending adoption) |
| city-pack | POLYGON City Pack | 100 | converted, not used | roads, pavements, modular apartments and offices, a city hall (Pending adoption) |

- **Info (manifest, 17 Nov 2026)**: `town-pack` has 704 entries and 9 failures (character files with duplicate names). Of its entries, 2 are `scale-suspect` (`SM_Bld_House_DeckSteps_01`, 0 x 0 x 0, and `POLYGON_Town_Demo`) and 62 carry `missing-texture`. Preassembled buildings: `SM_Bld_House_Preset_01` to `_11` (from 5.7 m to 18.2 m wide, 4 to 9.4 m high), `SM_Bld_House_Preset_Garage_01`, `SM_Bld_Church_01` (10.4 x 16.5 x 14.4 m) and `SM_Bld_GardenShed_01` (2.3 x 2.8 x 2.5 m, prop-sized). It also holds many loose wall, deck and door pieces that are not buildings.
- **Info (manifest, 17 Nov 2026)**: `city-pack` has 355 entries and 2 failures. Its 30 `scale-suspect` entries are the characters (`SK_Char*`), the vehicles (`SM_Veh_*`) and the skyline (`SM_Env_Skyline_*`), about 100 times too big at `"scale": 100`. A `scaleOverrides` factor of 0.01 would be needed for any of them. Its buildings are right at 100. Its roads are flat 5 m tiles (`SM_Env_Road_*`), with pavements `SM_Env_Sidewalk_*`. Its buildings are mostly modular: Base, Floor, Roof, Glass and Corner pieces of one tower (`SM_Bld_OfficeSquare_*`, `_OfficeRound_*`, `_OfficeOld_*`, `_OfficeOctagon_*`, `SM_Bld_Apartment_*`) that need assembling, with a few whole variants (for example `SM_Bld_OfficeSquare_01`) and one whole `SM_Bld_CityHall_01` (20.1 x 8.7 x 17.6 m). None of this is in `MODEL_TABLE`, `BUILDING_FRONTS` or any test yet.
- **Pending (a POLYGON adoption ticket)**: `MODEL_TABLE` rows for `town-pack` and `city-pack` buildings, their door sides, their lot types from bounds, any modular assembly, and any exclusions. These steps are a renderer ticket (chapter 15, steps 5 to 8).

## 14. Licence handling

- **Decided (039, Josh, 16 Nov 2026: "I have confirmed #4 is fine as long as the assets aren't available to the end user and I place the site behind a password" and "Testers may fetch it")**: GLBs reach a web build only if end users cannot get them and the site is behind a password. Josh copies `assets/private/out/` to the site himself. No script, workflow or agent uploads a GLB.
- **Decided (038, 039)**: everything under `assets/private/` is gitignored and never committed. `git ls-files assets/private` is empty. No `.glb`, `manifest.json` or `private` path appears in `dist/` (039's check). The loader fetches the manifest and GLBs at run time and never bundles them.
- **Info**: model names are not licensed content and may appear in code and in this guide. Meshes, textures and the manifest are not.
- **Info**: the subscription ends access for new work when it lapses (the asset-scout's note in `assets/candidates/synty-store.md`).
- **Default (039)**: with no manifest, or any missing or broken file, the view falls back to the placeholder shapes with one console info line and no error.

## 15. Adding a pack, step by step

- **Info**: steps 1 to 4 are Josh's. Steps 5 to 9 are a renderer ticket.
  1. Unpack the FBX source under `assets/private/in/<pack-id>/`.
  2. Write `pack.json` (`scale`, `scaleOverrides`, `textures`, `textureAliases`), per `tools/blender/README.md`.
  3. Run `npm run assets:convert <pack-id>`.
  4. Read the manifest for `scale-suspect`, `missing-texture` and failures. Fix them in `pack.json` and convert again.
  5. Calibrate every building's door side: click each door in the gallery (ticket 045). `fronts=1` still works over a whole town. Until a pack is promoted into code, its door sides live in the saved file on Josh's PC.
  6. Check the families (`meshFamily`).
  7. Add rows to `MODEL_TABLE`. Lot types are computed from bounds, never hand-set.
  8. Add any exclusions to `BUILDING_EXCLUDE` (as `pack:name` keys).
  9. Update this guide's pack table in the same branch (the drift test fails if `MODEL_TABLE` and the table disagree).
- **Info (043 section B)**: the gallery is `/?puzzle=09-shrine-circuit&view=3d&gallery=<pack-id>` (an empty value is `simple-town`). It loads only that pack's GLB and shows every building-sized entry in one straight line along x, seen from a low camera. Each model stands four times side by side, turned so its side `+z`, `+x`, `-z` and `-x` faces you in turn, each captioned `door: f`. The copy whose real door faces you is the model's true front: name it (for example "Preset_03: -x") and that becomes its `BUILDING_FRONTS` line (`pack:name`). The copy that matches the front in force now is captioned `current` (the code's table), `current, saved` (the saved file) or `current ?` (no line anywhere: the "+z" guess), and has a green outline. The title says how many models of the pack are marked ("N of M marked"). Each group has one caption with the name, size in metres, lot type and any `corner` or `excluded` mark. Whole-looking buildings come first, modular parts after. Drag, the arrow keys, Home and End move along the line and the wheel zooms. `&page=N&per=N` pages it, off by default. It is off unless the flag is there, never a pick target and never part of a playtest.
- **Info**: gotchas found converting the POLYGON packs (17 Nov 2026).
  - City Pack needed `"scale": 100` in its `pack.json`.
  - Town Pack needed `textureAliases` (its materials point at Photoshop files and renamed images that are not in the pack). Alias keys are normalised, so give one key per file-name stem: a `.png` and a `.psd` of the same stem collide, and the converter refuses the pair.
  - The converter has no include filter. It converts every FBX under the pack folder, so `town-pack` is a GLB of about 110 MB. To get a buildings-only GLB, copy only the buildings (and their `Textures/`) into a smaller pack folder.
  - City Pack buildings are modular (Base, Floor, Roof, Corner and Glass pieces) and need assembling from parts, unless a whole variant is used.
  - `SM_Bld_Station_01.fbx` and `SM_Env_Flower_01.fbx` in the City Pack are ASCII FBX, which Blender cannot import. They do not convert.
  - Duplicate file names across subfolders fail to convert (the Town Pack's characters).
  - A converted pack's pivots are centred, so a door side is never in the data.

## Numbers

The drift test (`styleguide.test.ts`) reads this table. Each row names an export of the file in its last column. A value is a number (within 1e-9), a colour as `0x` hex (exactly), or `a x b x c` for a record, in the record's field order. `LOT_TYPES` is frontage x depth x cap in metres and `PLACE_SIZES` is width x depth in metres. `TINTS[i]` is the i-th wall tint. Changing a constant in code or a value here fails the test.

| Constant | Value | File |
| --- | --- | --- |
| `WORLD_PER_METRE` | 0.18 | town.ts |
| `WORLD_PER_METRE` | 0.18 | models.ts |
| `STREET_MIN_LEN` | 2.5 | town.ts |
| `ROAD_W` | 1.1 | town.ts |
| `KERB_OFFSET` | 0.4 | town.ts |
| `KERB_H` | 0.03 | town.ts |
| `PAVE_W` | 0.45 | town.ts |
| `RING_MARGIN` | 4 | town.ts |
| `BLOCK_PITCH` | 12 | town.ts |
| `OUTER_RINGS` | 1 | town.ts |
| `SETBACK` | 0.15 | town.ts |
| `LOT_GAP` | 0.1 | town.ts |
| `WIRE_CLEAR` | 0.25 | town.ts |
| `FILL_STEP` | 0.25 | town.ts |
| `PLACE_STEP` | 0.1 | town.ts |
| `CORNER_GAP` | 0.5 | town.ts |
| `CORNER_ANGLE_MAX` | 45 | town.ts |
| `ROW_MIN_SMALLS` | 2 | town.ts |
| `PLACE_REACH` | 2.5 | town.ts |
| `STOREY_M` | 3.2 | town.ts |
| `PLACE_STOREYS` | 2 | town.ts |
| `OCCLUDE_SLOPE` | 2.1445069205 | town.ts |
| `NODE_TOP_Y` | 1.6 | town.ts |
| `LAMP_HEAD_Y` | 1.65 | town.ts |
| `LOT_TYPES.small` | 12 x 13 x 12 | town.ts |
| `LOT_TYPES.house` | 16 x 19 x 15 | town.ts |
| `LOT_TYPES.large` | 25 x 28 x 16 | town.ts |
| `LOT_TYPES.tall` | 14 x 16 x 28 | town.ts |
| `PLACE_SIZES.whole` | 10 x 10 | town.ts |
| `PLACE_SIZES.quarter` | 6 x 6 | town.ts |
| `PLACE_SIZES.home` | 6 x 8 | town.ts |
| `NEIGHBOUR_GAP` | 0.5 | models.ts |
| `STREET_REPEAT_GAP` | 3 | models.ts |
| `FAMILY_SHARE_MAX` | 0.25 | models.ts |
| `POLE_HEIGHT` | 1.6 | layout.ts |
| `POLE_SPACING` | 3 | layout.ts |
| `SAG_RATIO` | 0.04 | layout.ts |
| `WIRE_RADIUS` | 0.03 | layout.ts |
| `PHASE_OFFSET` | 0.22 | layout.ts |
| `BREAK_GAP` | 0.3 | layout.ts |
| `HANG_DROP` | 0.6 | layout.ts |
| `WIRE_PICK_RADIUS` | 0.3 | layout.ts |
| `DROP_REACH` | 2.5 | layout.ts |
| `DROP_DROP` | 0.2 | layout.ts |
| `DROP_END_Y` | 0.5 | layout.ts |
| `CAN_OFFSET` | 0.1 | layout.ts |
| `CAN_DROP` | 0.3 | layout.ts |
| `ELEVATION` | 0.7853981634 | camera.ts |
| `FOV_DEG` | 40 | camera.ts |
| `GROUND` | 0x0e131d | scene.ts |
| `YARD` | 0x141c29 | scene.ts |
| `STREET` | 0x1a2331 | scene.ts |
| `PAVEMENT` | 0x3d4658 | scene.ts |
| `KERB` | 0x9aa4b6 | scene.ts |
| `CENTRE_LINE` | 0x7a7863 | scene.ts |
| `PLACE` | 0x3a4a68 | scene.ts |
| `POLE_WOOD` | 0x8b6b4a | scene.ts |
| `FOOT` | 0x080b11 | scene.ts |
| `METAL` | 0x5d6b84 | scene.ts |
| `DEAD_WIRE` | 0x2a3445 | scene.ts |
| `LIVE_WIRE` | 0x4fd1ff | scene.ts |
| `LIVE_GLOW` | 0x2aa9d8 | scene.ts |
| `REPAIRED_WIRE` | 0x5a6f92 | scene.ts |
| `WARM` | 0xffd37a | scene.ts |
| `TARGET` | 0xffe9a8 | scene.ts |
| `SCORCH` | 0x1a0f0c | scene.ts |
| `RIBBON` | 0xff3df0 | scene.ts |
| `INSULATOR` | 0x8fa99a | scene.ts |
| `CAN` | 0x7d8794 | scene.ts |
| `DROP_COLOR` | 0x39414f | scene.ts |
| `TINTS[0]` | 0x4a566e | placeholders.ts |
| `TINTS[1]` | 0x5a5472 | placeholders.ts |
| `TINTS[2]` | 0x4a6478 | placeholders.ts |
| `TINTS[3]` | 0x686678 | placeholders.ts |
| `ROOF_SHADE` | 0.6 | placeholders.ts |
| `CAP_M` | 0.3 | placeholders.ts |
| `PITCH_M` | 1.8 | placeholders.ts |

Inline in `buildScene` (`scene.ts` has no named constant for these, and this ticket may not add one, so the test looks for the exact source text):

| Part | Source text |
| --- | --- |
| background | `scene.background = new Color(0x0b0f17)` |
| ambient light | `new AmbientLight(0x4a5a7a, 1.1)` |
| moon light | `new DirectionalLight(0x8fa6d0, 0.7)` |
