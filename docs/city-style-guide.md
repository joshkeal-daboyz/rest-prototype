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
- **Info (053)**: terrace pavements now carry street furniture, and the outer blocks are terraces: the whole procedural city, from lot to prop, is chapter 16.

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
- **Default (051, with 041's lot rules)**: the rows of the outer blocks are terraces. This replaces the outer-block step of frontage fill above: the pinwheel order, each row starting at its own corner, and the bands stay, but every side's band is `TERRACE_DEPTH_M`, and a row runs on to the next row's corner block with no gap on the street (short of it by under one bay at most; the packer of 051 C closes the rest). A row is a run of lots that abut (gap 0). Each lot is `bays` x `TERRACE_BAY_M` wide, `bays` in `TERRACE_BAYS` by `stableHash` of its key, and `TERRACE_DEPTH_M` deep. It is type `large` and takes the highest of `TERRACE_CAPS_M` (5, 4 and 3 storeys) that clears the rules above at that cap. A slot that clears no cap ends the run, and the next run starts `FILL_STEP` on. The ring road's inside, the circuit's streets and decor are filled as before.
- **Default (051, with 041's lot rules)**: terrace rows have open ground. A run of at least `PARKING_MIN_RUN_BAYS` nominal bays has one parking lot, `PARKING_W_M` x `PARKING_D_M`, about its middle where `stableHash` of the run id modulo `PARKING_ONE_IN` is 0; the run ends at it and a new one starts after it. One outer block in `PLAZA_ONE_IN` (by `stableHash` of its id) has a plaza, `PLAZA_W_M` square, at one row's start in place of that row's corner block. Open lots are in `Town.openLots` and never in `Town.lots`, so no building, drop or pick uses them. They clear the rules above at height 0. A later ticket (052 C) dresses them; until then they are bare yard.
- **Default (051, with 041's lot rules)**: a terrace row's far end closes **seam, or alley, never a slit**. The packer (`terrace.ts`) lays unscaled stacks flush from the row's start and first looks for a choice of styles and column counts that leaves a gap of at most `TERRACE_SEAM_M` to the next row's corner block's real back wall (that block's own stack depth, 5.62 to 5.92 m by the shops and roof corners it draws, not the style's deepest piece; `packTown` packs a block's runs together so each row closes to the corner block the next row really got; or a plaza's or parking lot's edge). Where the pieces cannot (N unscaled columns span only 5.0 N to about 5.28 N metres, so most row lengths fall in a dead band), it aims for a gap from `ALLEY_MIN_M` to `ALLEY_MAX_M`, which reads as an alley between blocks (dressed in 052 C), and never for a 0.3 to 0.5 m slit; only if neither is possible does it take the smallest gap above `ALLEY_MAX_M` (within `TERRACE_SLACK_M` of the smallest, the first in the preference order: least-used style first). Neighbours never share a style or a floor count; no building model is scaled to close a gap (041).
- **Info**: a terrace lot's placeholder fills its whole lot (no 0.8 or 0.9 footprint), so the boxes of a run touch. With the City Pack absent (CI, a fresh checkout) the terrace is those boxes. With the City Pack present (051 D) each run's boxes give way to its packed stacks, one `stack:<style>` group per block, and no whole model ever stands on a terrace lot (`pickBuildings` does not see one, so the terrace blocks are not among `large`'s families; the terrace's own bound is that each apartment style is 20% to 50% of its blocks).
- **Info (053)**: the packer, the dressing of the open lots and the alleys, and the checklist a generated street is judged by are in chapter 16 (16.2 and 16.8); the "bare yard" above was true until 052 C.

## 5. Choosing a building

- **Default (042 A, from 041)**: a lot's building is chosen by family first, then by variant. A family is one mesh under several names: models of one pack whose bounds agree to 1 cm and whose triangle counts are equal (`meshFamily`). Each family has equal weight, so a mesh with three names is not three times as likely.
- **Default (041 B4, 042 A)**: neighbours (lots within `NEIGHBOUR_GAP`) never share a family. Along one road side a family does not return within `STREET_REPEAT_GAP` lots. On a map no family takes more than `FAMILY_SHARE_MAX` of its type's lots when the type has four or more families. A pick that breaks a rule takes the next family; if every family breaks one, the cap goes first, then the street rule, then the neighbour rule.
- **Decided (042, Josh, 17 Nov 2026: "There are too many video rental stores.")**: the variety rules above exist because of these words.
- **Default (042 Q3, keys by 045 A)**: `BUILDING_EXCLUDE` drops models outright. It lists `pack:name` keys (for example `simple-town:store_small_mesh`), because names repeat across packs. A named store would go there. In a dev build, models Josh shift-clicked in the gallery (ticket 045) are excluded too, from a file on his PC; a fresh checkout and CI use the code's list only.
- **Decided (047, Josh, 18 Nov 2026: "what about the video rental store, ignore it... it's part of the small package. The polygon buildings are much higher quality")**: the video rental store, `simple-town:store_small_mesh`, is excluded through `BUILDING_EXCLUDE`. Its small lots go to the other small-lot families. It stays in `MODEL_TABLE` and in the gallery, which marks it `excluded`.
- **Info**: the guide's check of this chapter: `BUILDING_EXCLUDE` lists `simple-town:store_small_mesh`, so the guide names that key.
- **Default (041 Q4)**: when no model fits a lot type (or there is no manifest), the lot keeps its placeholder building.
- **Default (048 Q1; the reason is Josh's 18 Nov 2026 "The polygon buildings are much higher quality")**: POLYGON buildings come first, type by type. `MODEL_TABLE` lists the Town Pack's twelve whole houses ahead of SIMPLE Town's rows, which are marked `fallback`. A lot type uses its POLYGON models when, after `BUILDING_EXCLUDE`, they make at least `POLYGON_MIN_FAMILIES` mesh families for that type (4 for `small`, `house` and `large`, 3 for `tall`: the variety rules' own counts). Otherwise it uses its SIMPLE Town models. The two never mix within a type, though different types on one street may differ. A type with no SIMPLE Town model loaded keeps its POLYGON ones however few.
- **Default (050 Q1, on Josh's 18 Nov 2026 "the city stuff is higher detail")**: City Pack stacks come first, then the Town Pack, then SIMPLE Town, type by type: a three-step chain per lot type. A type in `STACK_LOT_TYPES` (`large` and `tall`; small and house keep the Town Pack's houses) uses City Pack stacks when the styles that can stand on it, after `BUILDING_EXCLUDE` and the pieces that loaded, make at least `POLYGON_MIN_FAMILIES` for that type (each style is one family, `city-pack:stack:<style>`). Otherwise the type follows the 048 rule above (Town Pack whole houses, else SIMPLE Town). The three never mix within a type. The neighbour, street-repeat and share rules above apply to stacks unchanged. A piece whose root did not load, or whose key is excluded, drops the styles that need it; if every style drops, the type falls down the chain.
- **Info (050 C)**: with the fixture sizes, `large` offers six styles (the three apartment styles, `office-old-small`, `office-old-large`, `office-octagon`) and `tall` four (the three apartment styles and `office-old-small`). A stack's floors over its base are picked by hash from the range the cap allows (`STACK_FLOORS` is the minimum), so heights vary from lot to lot and never change. With no City Pack in the manifest, or its GLB failed, no stack is offered and the town is exactly what the 048 rule gives (a fresh checkout and CI).
- **Info (048)**: with Josh's fronts the Town Pack fills `small` (`SM_Bld_House_Preset_01`, `_02`, `_09` and `SM_Bld_House_Preset_Garage_01`) and `house` (`_03` to `_07` and `_10`). `_08` and `_11` are `large` (two families, under 4), so `large` and `tall` stay SIMPLE Town. With no Town Pack in the manifest, or its GLB failed to load, every type is SIMPLE Town and the town is as it was before 048 (a fresh checkout and CI).
- **Info (053)**: how stacks are used on a terrace, and the variety and fallback rules that apply to them, are in chapter 16 (16.3, 16.4 and 16.7).

## 6. Facing

- **Info**: a model's door side is the axis, in the GLB's own frame, that its door faces (`ModelFront`: "+z", "-z", "+x", "-x"). `BUILDING_FRONTS` holds it, one line per `pack:name` (names repeat across packs: `SM_Bld_Shop_01` is in more than one). `frontYaw` gives the turn (0, pi, -pi/2, pi/2), so a clone's yaw is `lot.yaw + frontYaw(front)`. A quarter-turn front swaps the model's width and depth in `lotTypeOf`.
- **Info**: nothing in a converted pack records a door side, because the converter centres every pivot. A new pack's door sides are therefore settled by eye. A model listed nowhere in `BUILDING_FRONTS` is drawn at the "+z" guess. In a dev build a saved calibration file (`assets/private/calibration/fronts.json`, never committed) is laid over the table: its front replaces the code's, and a key the code lacks is added (ticket 045).
- **Decided (042 A, Josh, 17 Nov 2026, calibrating SIMPLE Town with `fronts=1`: "all reversed 180 degrees")**: every SIMPLE Town building is "-z" except `store_small_mesh`, which was right at "+z". The exceptions are the table below. `memorial_mesh` (042 B's, not placed yet) is still the "+z" guess, because Josh has not seen it.
- **Info**: any `pack:name` whose front is not "-z", and every corner model, is listed in this chapter or the next. The drift test compares these two tables with `BUILDING_FRONTS`.

| Name | Front | Note |
| --- | --- | --- |
| `simple-town:store_small_mesh` | +z | calibrated by Josh, 042 A |
| `simple-town:memorial_mesh` | +z | the starting guess, not yet seen (042 B) |
| `town-pack:SM_Bld_Church_01` | +z | calibrated by Josh, 048; in no building row (held for 042 E) |
| `town-pack:SM_Bld_House_Preset_01` | -x | calibrated by Josh, 048 |
| `town-pack:SM_Bld_House_Preset_03` | -x | calibrated by Josh, 048 |
| `town-pack:SM_Bld_House_Preset_04` | -x | calibrated by Josh, 048 |
| `town-pack:SM_Bld_House_Preset_05` | -x | calibrated by Josh, 048 |
| `town-pack:SM_Bld_House_Preset_06` | +x | calibrated by Josh, 048 |
| `town-pack:SM_Bld_House_Preset_08` | -x | calibrated by Josh, 048 |
| `town-pack:SM_Bld_House_Preset_09` | -x | calibrated by Josh, 048 |
| `town-pack:SM_Bld_Shop_01` | +z | calibrated by Josh, 048; in no building row |
| `city-pack:SM_Bld_Shop_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Shop_02` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Shop_03` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Shop_04` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Shop_05` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Shop_06` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_Door_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_Door_02` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_Stack_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_Roof_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_02` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_Stack_02` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_Roof_02` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_03` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_Stack_03` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_Apartment_Roof_03` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOld_Small_Base_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOld_Small_Floor_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOld_Small_Roof_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOld_Large_Base_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOld_Large_Floor_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOld_Large_Roof_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOctagon_Base_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOctagon_Floor_01` | +z | provisional, 050 C: a first-click guess, not confirmed |
| `city-pack:SM_Bld_OfficeOctagon_Roof_01` | +z | provisional, 050 C: a first-click guess, not confirmed |

- **Info (048)**: the Town Pack's other five lines are "-z", the default, so they are not in the table: `SM_Bld_House_Preset_02`, `_07`, `_10`, `_11` and `SM_Bld_House_Preset_Garage_01`. All fourteen were promoted by hand from Josh's saved file (`savedAt` 2026-11-18T03:10:05.703Z). The City Pack's stack pieces are the next bullet.

- **Info (050 C, provisional)**: the 34 City Pack stack pieces in `STACK_STYLES` have a `BUILDING_FRONTS` line each: 26 here and the 8 corner pieces in chapter 7. Josh's saved file (`savedAt` 2026-11-18T03:50:16.193Z) has 25 of them, every one "+z". A gallery click on the first copy saves "+z", so these are not shown to be doors he saw. The other nine (`Apartment_Corner_01`, `_03`, `Apartment_Door_01` and the six roofs) were not in the file and take the same "+z" guess. All 34 are provisional until Josh confirms them in the stack gallery (chapter 15); a fix is one line in `BUILDING_FRONTS`, and a saved front still overrides it in a dev build.
- **Default (042 Q2)**: the way to calibrate a model is the `fronts=1` overlay (`/?puzzle=09-shrine-circuit&view=3d&fronts=1`). It draws a red arrow along each building's declared front and a caption with its name, family and corner sides. Each correction is a one-line edit to `BUILDING_FRONTS`, keyed `pack:name`.
- **Info (043 section B)**: the gallery (`/?puzzle=09-shrine-circuit&view=3d&gallery=<pack-id>`) shows every building-sized entry of a pack, declared front and all, so a pack's door sides are one look. See chapter 15.
- **Info (045 section C, dev builds only)**: the gallery takes clicks. Click the copy whose door faces you: that side becomes the model's front and the choice is written at once to the saved file (`assets/private/calibration/fronts.json`) through the dev server; the copy's caption then reads `current, saved`. Clicking another copy changes your mind. Clicking the `current` copy when its front is only the code's table or the "+z" guess saves it as it stands; clicking one that is already `saved` does nothing. Shift+click sets that side and toggles `excluded` (a model you never want placed). Delete (or Backspace) clears the last-clicked model, so the code's table applies again. A press and release within 5 px is a click; further is a pan. If the dev server cannot write, the mark stays on screen with `not saved: <reason>` under the model's caption and in the title, and the next click retries. The line never reorders when you mark a model. A click does not reach the town, and none of this is in `npm run build`.

## 7. Corner buildings

- **Decided (042 A, Josh, 17 Nov 2026)**: "Corner buildings should only be placed on corners. They must also have two sides facing the street. Only corner buildings have this restriction. Other buildings can be placed on corners normally."
- **Decided (042 A, implemented)**: a lot is a corner lot if a side edge of it lies within `CORNER_GAP` of another road's pavement (not its own road's), and that road's centreline lies toward that side, within `CORNER_ANGLE_MAX` degrees of the side's outward axis (a road behind the lot is not a cross street). `Lot.cornerSides` lists each such side ("+x" or "-x" in the lot's own frame) with the cross road's id; `Lot.corner` is true when it is not empty. A row end that meets no other road is not a corner, and a service strip is not a road.
- **Decided (042 A, implemented)**: a corner model (`corner: true` in `BUILDING_FRONTS`) goes only on a lot whose `cornerSides` has the side of its `open` frontage. It faces its own road, with its second frontage toward the cross street. A yaw cannot mirror, so a model only goes where its open side is a lot side that meets a cross street. Every other model is unrestricted on corners.
- **Info**: the only whole corner model is `store_corner_mesh`, in the table below. It is rarely placed, because few lots qualify. Its `open` side was flipped when the fronts were turned, and it is still an uncalibrated guess: Josh has not checked that its second face lands on the cross street. The City Pack's eight corner pieces (050 C) are in the same table and are guesses too.

| Name | Front | Open |
| --- | --- | --- |
| `simple-town:store_corner_mesh` | -z | -x |
| `city-pack:SM_Bld_Shop_Corner_01` | +z | +x |
| `city-pack:SM_Bld_Shop_Corner_02` | +z | +x |
| `city-pack:SM_Bld_Apartment_Corner_01` | +z | +x |
| `city-pack:SM_Bld_Apartment_Corner_02` | +z | +x |
| `city-pack:SM_Bld_Apartment_Corner_03` | +z | +x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_01` | +z | +x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_02` | +z | +x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_03` | +z | +x |

- **Default (048 Q5)**: no POLYGON model is a corner model. A gallery click sets only a door, and `open` lives in code, so a Town Pack house gets `corner: true` and `open` only if Josh names one with two street faces and says which side. Until then a Town Pack house goes on any lot, corner or not, as an ordinary model.
- **Decided (050, Josh, 18 Nov 2026: "the shop corners are intended to be base units for the larger structures.")**: a stack's ground floor on a corner takes the shop corner piece, and its upper floors and roof take the matching `_Corner_` pieces.
- **Default (050 C, from the corner rule above)**: a stack has a corner column (shop corner base, corner floors, corner roof, never a `_Stack_` piece) on each side in its lot's `cornerSides` and on no other. It is built for its lot, so it stands only where that side meets a cross street and never mid-row, and its second street face is on the cross street. A stack with no corner column, and any style with no corner pieces (the offices), is an ordinary building and may stand on a corner lot as any model may. A corner piece's `open` side is read in the lot frame after its front is turned: at the other end of the row the corner column turns a quarter, so one piece serves both ends. A corner stack that cannot be assembled on its lot (it does not fit with the corner columns in) falls back to the same style mid-row. `open` comes from `BUILDING_FRONTS` first, then the recipe's guess, then "+x"; every one is a guess until Josh confirms it.
- **Info (053)**: corner blocks on a terrace, and the check that they stand only on true corners (R9), are in chapter 16 (16.3 and 16.8).

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
- **Default (048 Q1 to Q4, 050 C, on Josh's 17 and 18 Nov 2026 words above)**: the mix for now is City Pack stacks on `large` and `tall` lots, the Town Pack's twelve whole houses on the types they fill (chapter 5), and SIMPLE Town on the types neither fills and wherever the packs are absent. No whole City Pack building is placed, because Josh named none. The Church and the City Hall are held back for 042 E's landmark places. Lots are not resized for either pack (a later ticket does that: "lots are sized to buildings", 041; the terrace is 051).
- **Open (043 Q4, what 050 C leaves open)**: whether `small` and `house` lots go City Pack stacks too (050 Q1's alternative), whether the outer blocks and the circuit's streets may differ, and whether SIMPLE Town stays anywhere once POLYGON covers every type. The stacks' doors and corner sides are still provisional (chapters 6 and 7), and the terrace and the dressing are later tickets (chapter 15).
- **Info**: the pack table, from the manifest read on 17 Nov 2026 (`assets/private/out/manifest.json`; the converter's `scale` is each pack's `pack.json` value, which the drift test checks when the manifest is present).

| Pack id | Style | Converter scale | Status | What it supplies |
| --- | --- | --- | --- | --- |
| apocalypse-power | POLYGON Apocalypse (the power subset) | 1 | in use | pole `SM_Prop_Powerpole_01`, lamp post `SM_Prop_LightPole_01` |
| simple-town | SIMPLE Town | 100 | in use | every building today (placeholder style); `scaleOverrides` for two stations and one road tile |
| town-pack | POLYGON Town Pack | 1 | in use | twelve whole houses and a garage (048: `SM_Bld_House_Preset_01` to `_11`, `SM_Bld_House_Preset_Garage_01`); a church, a shed and props are not placed |
| city-pack | POLYGON City Pack | 100 | in use | stacked buildings (050 C): shops, apartment and office floors and roofs, assembled from `STACK_STYLES`; roads, pavements and a city hall are not used |

- **Info (manifest, 17 Nov 2026)**: `town-pack` has 704 entries and 9 failures (character files with duplicate names). Of its entries, 2 are `scale-suspect` (`SM_Bld_House_DeckSteps_01`, 0 x 0 x 0, and `POLYGON_Town_Demo`) and 62 carry `missing-texture`. Preassembled buildings: `SM_Bld_House_Preset_01` to `_11` (from 5.7 m to 18.2 m wide, 4 to 9.4 m high), `SM_Bld_House_Preset_Garage_01`, `SM_Bld_Church_01` (10.4 x 16.5 x 14.4 m) and `SM_Bld_GardenShed_01` (2.3 x 2.8 x 2.5 m, prop-sized). It also holds many loose wall, deck and door pieces that are not buildings.
- **Info (manifest, 17 Nov 2026)**: `city-pack` has 355 entries and 2 failures. Its 30 `scale-suspect` entries are the characters (`SK_Char*`), the vehicles (`SM_Veh_*`) and the skyline (`SM_Env_Skyline_*`), about 100 times too big at `"scale": 100`. A `scaleOverrides` factor of 0.01 would be needed for any of them. Its buildings are right at 100. Its roads are flat 5 m tiles (`SM_Env_Road_*`), with pavements `SM_Env_Sidewalk_*`. Its buildings are mostly modular: Base, Floor, Roof, Glass and Corner pieces of one tower (`SM_Bld_OfficeSquare_*`, `_OfficeRound_*`, `_OfficeOld_*`, `_OfficeOctagon_*`, `SM_Bld_Apartment_*`) that need assembling, with a few whole variants (for example `SM_Bld_OfficeSquare_01`) and one whole `SM_Bld_CityHall_01` (20.1 x 8.7 x 17.6 m). The City Pack's stack pieces are in `BUILDING_FRONTS` (chapters 6 and 7, provisional) and its stacks in `STACK_STYLES`; none of it is in `MODEL_TABLE`, so the pack table's "in use" for it comes from the recipes. Its roads, pavements and city hall are still not used.
- **Info (048)**: the Town Pack's whole houses are in `MODEL_TABLE` (chapter 5) with their doors in `BUILDING_FRONTS` (chapter 6); `polygon.test.ts` pins both.
- **Pending (a POLYGON adoption ticket)**: whole-building `MODEL_TABLE` rows for any other pack, their door sides, their lot types from bounds and any exclusions (chapter 15, steps 5 to 8). For a modular pack the stack recipes (chapter 15, step 10) replace the rows.
- **Info (053)**: which pieces of the City Pack are used, which are never used and why, and which are missing against the reference are in chapter 16 (16.6).

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
  5. Calibrate every building's door side: click each door in the gallery (ticket 045). `fronts=1` still works over a whole town. Until a pack is promoted into code, its door sides live in the saved file on Josh's PC. A pack is promoted by hand (ticket 048): the renderer reads the saved file (read only), copies each of the pack's entries into `BUILDING_FRONTS` as a `pack:name` line and each Shift+clicked one into `BUILDING_EXCLUDE`, writes the file's `savedAt` in a code comment and in chapter 6, and lists every line in its report for Josh to check. The Town Pack was promoted this way from the file saved 2026-11-18T03:10:05.703Z. The saved file keeps overriding in a dev build with identical values.
  6. Check the families (`meshFamily`).
  7. Add rows to `MODEL_TABLE`. Lot types are computed from bounds, never hand-set.
  8. Add any exclusions to `BUILDING_EXCLUDE` (as `pack:name` keys).
  9. Update this guide's pack table in the same branch (the drift test fails if `MODEL_TABLE` and the table disagree).
  10. A modular pack (Base, Floor, Roof, Corner pieces) is assembled instead of listed whole: write a recipe in `stacks.ts` (a `StackStyle` per look, by role, with its `pitch_m`), check its floor ranges against `STACK_LOT_TYPES` and `STACK_FLOORS`, look at it in the stack gallery and fix any door or `open` side by clicking, then promote the pack's fronts (step 5). The town takes it from there: a type uses the stacks when enough styles reach `POLYGON_MIN_FAMILIES` (chapter 5).
- **Info (043 section B)**: the gallery is `/?puzzle=09-shrine-circuit&view=3d&gallery=<pack-id>` (an empty value is `simple-town`). It loads only that pack's GLB and shows every building-sized entry in one straight line along x, seen from a low camera. Each model stands four times side by side, turned so its side `+z`, `+x`, `-z` and `-x` faces you in turn, each captioned `door: f`. The copy whose real door faces you is the model's true front: name it (for example "Preset_03: -x") and that becomes its `BUILDING_FRONTS` line (`pack:name`). The copy that matches the front in force now is captioned `current` (the code's table), `current, saved` (the saved file) or `current ?` (no line anywhere: the "+z" guess), and has a green outline. The title says how many models of the pack are marked ("N of M marked"). Each group has one caption with the name, size in metres, lot type and any `corner` or `excluded` mark. Whole-looking buildings come first, modular parts after. Drag, the arrow keys, Home and End move along the line and the wheel zooms. `&page=N&per=N` pages it, off by default. It is off unless the flag is there, never a pick target and never part of a playtest.
- **Info (050 B)**: the stack gallery is `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1` (dev only, never in `npm run build`, never a pick target, never part of a playtest; the code is `stackgallery.ts` and `stacks.ts`). It shows every recipe assembled on each lot type it serves, at its most floors, as a mid-row stack and as a corner stack at each end, seen from the street. Each stack is captioned with its style, lot type, floors, height against the cap and every piece's key and front, marked `guess` unless the code's table or the saved file has the key. Below it, the click line shows the recipe's pieces (roofs included) four ways, and a click saves a front exactly as in the pack gallery. A saved "+z" counts as saved even when it came from a first click, so an unmarked piece still needs a look.
- **Info**: gotchas found converting the POLYGON packs (17 Nov 2026).
  - City Pack needed `"scale": 100` in its `pack.json`.
  - Town Pack needed `textureAliases` (its materials point at Photoshop files and renamed images that are not in the pack). Alias keys are normalised, so give one key per file-name stem: a `.png` and a `.psd` of the same stem collide, and the converter refuses the pair.
  - The converter has no include filter. It converts every FBX under the pack folder, so `town-pack` is a GLB of about 110 MB. To get a buildings-only GLB, copy only the buildings (and their `Textures/`) into a smaller pack folder.
  - City Pack buildings are modular (Base, Floor, Roof, Corner and Glass pieces) and need assembling from parts, unless a whole variant is used.
  - `SM_Bld_Station_01.fbx` and `SM_Env_Flower_01.fbx` in the City Pack are ASCII FBX, which Blender cannot import. They do not convert.
  - Duplicate file names across subfolders fail to convert (the Town Pack's characters).
  - A converted pack's pivots are centred, so a door side is never in the data.

## 16. Procedural city

- **Decided (053, Josh, 18 Nov 2026: "leverage the city pack and establish a style guide that will allow you to build procedural cities by leveraging the city pack... a city guide that is able to yield similar quality results to that city in the image excluding the humans, animals and vehicles.")**: this chapter is that guide. It is a grammar: read from the top, it says how a City Pack city is generated from a map, which rule makes each part, and how to check the result against the reference. Approvals for this goal were waived by Josh in the same chat.
- **Info**: the reference is a city street with these parts: continuous terraces of 3 to 5 storey blocks; shopfront ground floors with glass, awnings and signs; apartment floors in varied colours; fire escapes on street faces; props on every roof; a corner plaza; a parking lot; alleys between blocks; street furniture along the pavement. People, animals and vehicles are left out.
- **Info**: the pipeline, in order. Everything up to the last step is pure (no three, no DOM, no assets in the tests), and every choice is a hash of a key, so one map gives one city every time.
  1. `townLayout` (`town.ts`): streets, outer blocks, terrace runs, open lots.
  2. `packTown` (`terrace.ts`): each run becomes exact blocks, with `assembleStack` (`stacks.ts`) building each from the pack's pieces.
  3. `dressTown` (`dressing.ts`): the dressing of each block.
  4. `furnitureLayout` (`furniture.ts`): the pavements, the open lots and the alleys.
  5. `applyModels` (`models3d.ts`): draws all of it, and only when the City Pack GLB is there.
  6. `citymetrics.ts` measures steps 1 to 4 against the checklist of 16.8.

### 16.1 Grammar

| Level | What it is | Made by | Chosen by |
| --- | --- | --- | --- |
| Town window | the ring road and one ring of outer blocks (`OUTER_RINGS`) | `townLayout` | the circuit's bounds (chapter 3) |
| Outer block | the ground inside four streets, four rows pinwheel-fashion | `townLayout` | the grid (`BLOCK_PITCH`) |
| Row | one side of an outer block, a band `TERRACE_DEPTH_M` deep | `townLayout` | the pinwheel (chapter 4) |
| Run | a stretch of abutting lots in a row, `TerraceRun`, with a start (a corner or not) and an end (a corner, a plaza, a parking lot, or "end") | `townLayout` | where the lots clear their height cap |
| Open lot | a parking lot or a plaza in a row, in `Town.openLots` | `townLayout` | `stableHash` of the run and the block, `PARKING_ONE_IN`, `PLAZA_ONE_IN` |
| Block | one stack standing on a run: a style, columns, floors | `packTerrace` and `assembleStack` | the least-used style, the neighbour rule, the far-gap rule |
| Column (a bay) | one floor piece's width along the street | `assembleStack` | the style's floor piece |
| Storey | the base (the ground row), the floors, the roof | `assembleStack` | `STACK_FLOORS`, the cap, a hash of the block key |
| Slot | a place on a piece where dressing may stand, per role | `DRESS_SLOTS` | the piece's role (`dressRoleOf`) |
| Prop | a pack piece standing in a slot, or an item of furniture on a pavement line | `dressBlock`, `furnitureLayout` | a hash of the lot key (dressing) or the run id (furniture), under the caps of 16.5 |
| Alley | the gap of `ALLEY_MIN_M` to `ALLEY_MAX_M` at a run's far end | `packTerrace` | the far-gap rule |

### 16.2 Lots and runs

- **Default (051)**: a row becomes runs. A run starts at a corner (the row's start, when a cross street meets it), after a plaza, or after a parking lot, and it ends at the next row's corner block, at a plaza, at a parking lot, or where the next slot clears no height cap ("end"). The details of the pinwheel and the corner block are chapter 4 and chapter 7; this chapter does not repeat them.
- **Default (051)**: a run is cut into nominal lots first (`TERRACE_BAYS` bays of `TERRACE_BAY_M` each, `TERRACE_DEPTH_M` deep), and each takes the highest of `TERRACE_CAPS_M` that clears the occlusion rule of chapter 4. The nominal lots fix only the heights and the extent. The packer replaces them.
- **Info**: only the highest height tier ever occurs on the ladder, so every block's cap lets it have three to five storeys.
- **Default (051)**: open lots are part of the grammar, not leftovers. A run of at least `PARKING_MIN_RUN_BAYS` nominal bays has a parking lot (`PARKING_W_M` by `PARKING_D_M`) about its middle when its hash says so (`PARKING_ONE_IN`); one outer block in `PLAZA_ONE_IN` has a plaza (`PLAZA_W_M` square) at one row's start. A plaza is recorded against the run that starts after it, a parking lot against the run it ends, so one run can carry one of each.
- **Default (051)**: blocks are packed flush. The packer lays each block from the run's start, as wide as its columns, and the next starts where the last ends: blocks abut exactly. No model is scaled to close a gap. Whole columns span only a little more than the nominal bay, so most runs cannot close to the wall exactly.
- **Default (051)**: the far end of a run closes by one rule: seam, or alley, never a slit. A gap up to `TERRACE_SEAM_M` is a seam; a gap from `ALLEY_MIN_M` to `ALLEY_MAX_M` is an alley that 052 C dresses; a gap between the two is a slit and is never chosen; only if no choice gives a seam or an alley is a wider gap left, within `TERRACE_SLACK_M` of the smallest. The packer measures to the next row's corner block's real back wall (chapter 4), so the corner block it closes to is searched, not taken from the hash.

### 16.3 Blocks

- **Default (050)**: a block is one stack of one style from `STACK_STYLES`. A terrace uses the three apartment styles (a style whose `depth` is "bay"); the offices are one footprint column and stay on the tall lots (chapter 5). A block is 2 to 4 columns (`TERRACE_BAYS`).
- **Default (050)**: a stack is columns side by side, each as wide as its floor piece. In each column the ground row is the base piece, then the floors, then the roof piece. Floors take `STACK_STYLES[i].pitch_m`, so a stack's height is the base pitch plus its floors plus the roof.
- **Decided (050, Josh, 18 Nov 2026: "the shop corners are intended to be base units for the larger structures.")**: a corner column's ground floor is a shop corner, and its floors and roof are the style's corner pieces.
- **Default (050)**: the ground row of a mid column is a shop picked by hash from the six shop pieces; the two-column shop spans two free columns. Each block has one residents' door bay in a mid column, never in a corner column. So every ground bay is a shopfront, a shop corner or that one door (R3).
- **Decided (042, Josh, 17 Nov 2026: "Corner buildings should only be placed on corners. They must also have two sides facing the street. Only corner buildings have this restriction. Other buildings can be placed on corners normally.")**: on a terrace the first block of a run that starts at a corner is the corner block, with its corner column on the corner side, and no other block has a corner column (R9). Its second street face is on the cross street. A run that starts at a plaza or a clearance gap starts with an ordinary block.
- **Default (050)**: the floors over the base are `STACK_FLOORS` at least and as many as the cap allows, picked by a hash of the block key, so heights vary and never change. With the highest cap that is 2 to 4 floors, so 3 to 5 storeys with the ground floor (R2).
- **Default (050 C)**: a stack's doors, and a corner piece's `open` side, come from `BUILDING_FRONTS` first, then the recipe's guess. All 34 City Pack stack pieces are provisional "+z" guesses (chapter 6). A wrong door is one line in `BUILDING_FRONTS`, and it moves nothing else.

### 16.4 Variety

- **Default (051)**: neighbours in a run never share a style, and they differ in floor count wherever the cap allows a choice, and from the block before that where it can. Among the choices that close a run, the style least used so far in the run comes first, then a hash of the run id. This is what makes R2 hold on every pair.
- **Info**: the street-repeat rule and the share cap of chapter 5 do not bound a terrace (three styles are fewer than the families they apply to). The terrace's own bound is that each apartment style is a fifth to a half of a ladder's terrace blocks (`terracepack.test.ts`).
- **Default (050 C)**: stacks on the circuit's own large and tall lots, outside the terraces, follow the neighbour, street-repeat and share rules of chapter 5 unchanged (`NEIGHBOUR_GAP`, `STREET_REPEAT_GAP`, `FAMILY_SHARE_MAX`).
- **Default (052)**: the dressing varies by hash, not by order. One awning key per block (the awnings of a block match), no sign key twice in a block, at most one blade sign, one ATM, one fire-escape column and one big roof prop per block, at most `ATM_PER_RUN` ATMs, one billboard and one novelty sign per run, and no fire escape on two neighbouring blocks of a run.
- **Info (054)**: colour variety in the city comes from the three apartment styles and, since 054, from the colourway each block is drawn in (16.9): neighbours in a run never share one (R13). The awnings are fixed shapes and colours of one texture atlas, and the roof props are one colour each (16.6).

### 16.5 Dressing and furniture

- **Default (052)**: dressing is a pure function of the block's stack, its lot key, its run and the manifest entries (`dressBlock`). A key missing from the entries drops only its own placements. When a column is full (`DRESS_PER_BAY_MAX`), the pieces left are dropped in this order: glass, awnings, the big roof prop, the fire escape, signs, the door canopy, small roof props, the ATM, wall props. The whole town stops at `DRESS_MAX` pieces.
- **Default (052)**: attachment is a rule, not data, because the converter centres every pivot. A front-face prop's back face lies on the front face of the piece that stands behind it at its base height, plus a per-key `DRESS_NUDGE_M`, and no prop reaches past `KERB_FROM_FRONT_M`. A roof prop's base lies on the roof's top, inset `ROOF_EDGE_M` from every roof edge and inside its column. A prop's own door side is "+z" unless `DRESS_FRONTS` or the fronts table says otherwise.
- **Default (052)**: glass. Every shop with a `_Glass` key in `SHOP_GLASS` has it, sunk `GLASS_INSET_M` into the shop's face with its base at `GLASS_SILL_M` (a corner shop's glass wraps the corner). The one shop without glass takes none (R4).
- **Default (052)**: awnings. Each shop bay takes one with probability `P_AWNING`, all of one key within a block, only if the awning stops `AWNING_KERB_M` short of the kerb; a corner bay takes the L-shaped one. The base is `AWNING_BASE_M` or the glass's top (R5). The door bay takes a canopy with probability `P_CANOPY` at `DOOR_CANOPY_Y_M`.
- **Default (052)**: signs and the ATM. A shop bay takes a fascia sign with probability `P_SIGN`, over the awning or the glass, at `SIGN_BASE_M` at the lowest. One block in `P_BLADE` hangs a blade sign over a bay with no awning, `BLADE_INSET_M` in from its edge. An ATM goes beside a residents' door with probability `P_ATM` per block, `ATM_PIER_M` in from the door bay's edge and at `ATM_Y_M` high (R6). The ticket put it on a shop pier; a shop's glass leaves none.
- **Default (052)**: fire escapes. An apartment block of at least `ESCAPE_MIN_BAYS` columns and two floors takes one with probability `P_ESCAPE`, on a mid column that is not a door column, from the first floor to the roof (the tall first landing, a middle piece for each floor, a top piece). That column's ground row stays plain. No two neighbouring blocks of a run both have one, which caps the share of qualifying blocks below "most" (R7; chapter 16.9).
- **Default (052)**: wall props. From floor `WALL_MIN_LEVEL` up, each column and floor takes a wall AC unit with probability `P_WALL_AC` or a window planter with `P_PLANTER`, at most `WALL_PROPS_PER_BLOCK` in a block, never on the escape column; the AC stands `WALL_AC_LIFT_M` up and `WALL_AC_OFFSET_M` off the column's axis, the planter `PLANTER_LIFT_M` up.
- **Default (052)**: roofs. Each roof column takes one small prop (an AC unit, a satellite dish, a vent) with probability `P_ROOF_SMALL`, and a second with probability `P_ROOF_SECOND`, never more than `ROOF_SMALL_PER_BAY`, at a hashed place inside the inset; the dish keeps facing the street and the rest may turn a half-turn. A block takes one big prop with probability `P_ROOF_LARGE`: a water tower, the roof stair hut, a billboard (a structure and a face, counted as one), or a novelty sign (one per run, on its lowest block), and only where the roof's top plus its height stays under the lot's cap. A column with the big prop gets no small ones (R8).
- **Default (052)**: furniture stands only on the pavements in front of terrace runs, never on the circuit's streets or the ring's inside, so nothing new stands near a node or a wire. A run has two lines: a wall line (an item's back edge `FURN_WALL_M` in from the pavement's wall edge) and a kerb line (its front edge `FURN_KERB_M` in from the kerb). Items on a line are `FURN_PITCH_M` apart centre to centre (trees `TREE_PITCH_M`), with a hashed gap of up to `FURN_GAP_SPAN_M` after that, `FURN_GAP_M` clear between footprints, and a candidate place is filled with probability `P_FURN` (busy, not cluttered; R10).
- **Default (052)**: the keep-outs. Nothing within `FURN_CORNER_M` of a run's end, `FURN_KEEP_M` of a pole, lamp post, node, junction pad or service drop, nothing taller than `FURN_MAX_H_M` within `WIRE_CLEAR` of a wire span, and an item taller than a dressing piece stays out from under it. Bins, planters, pot plants, benches, a mailbox and newspaper boxes go on the wall line; parking meters, trees, a hydrant and a bus stop on the kerb line; a bollard just beyond each corner keep-out with probability `P_BOLLARD`. Per-run caps: `HYDRANT_PER_RUN`, `MAILBOX_PER_RUN`, `NEWSPAPER_PER_RUN`, `BUS_STOP_PER_RUN` (on a run of at least `BUS_STOP_MIN_RUN_M`), `BOLLARD_PER_RUN`.
- **Default (052)**: open lots and alleys are dressed. A parking lot gets two tiles of lines that cover it, two or three barriers along its back edge, a meter (sometimes two) and, with probability `P_PARKING_BILLBOARD`, a pole billboard whose board stands `BILLBOARD_BOARD_LIFT_M` up and only under its run's lowest cap; it has no cars. A plaza gets four paving panels, one or two trees, benches, a planter, pot plants, and a picnic table with an umbrella or a hot-dog stand. An alley gets one or two bins with probability `P_ALLEY` (`P_ALLEY_SECOND` for the second) against its walls. The pack has no gate that fits an alley, so there is none. A piece lower than `SLAB_MAX_M` is ground: things stand on it.
- **Info (054)**: dressing and furniture keep the base atlas whatever colourway their block is drawn in; why is in 16.9.
- **Default (052)**: drawing. Each key is one `InstancedMesh` per sub-mesh (at most `DRESS_DRAW_CALLS_MAX` draw calls for the dressing and `FURN_DRAW_CALLS_MAX` for the furniture on the largest map). No dressing or furniture object raycasts (it is never picked), and none is lit: a material that carries emission is swapped for a dark clone, and all shop glass shares one dark, see-through material.

### 16.6 Exclusions and gaps

- **Default (052)**: the City Pack's people, vehicles and everything in the table below are never used, each for the reason given. `CITY_NEVER_USED` holds the same list in code, and `styleguide.test.ts` checks the two agree and that no rule table names one. A stem ending in a star is a prefix of the pack's piece names.

| Never used | Reason |
| --- | --- |
| `SK_*` | people |
| `SM_Veh_*` | vehicles |
| `SM_Env_Skyline_*` | a skyline, about a hundred times too big at the pack's scale |
| `SM_Env_PalmTree_*` | 13.7 m high: through the wires |
| `SM_Prop_LightPole_*` | a lamp reads as a puzzle lamp |
| `SM_Prop_TrafficLight_*` | red and green read as puzzle state |
| `SM_Prop_PowerBox_*` | reads as a puzzle part |
| `SM_Prop_Power_Cables_*` | conductors stay code-generated (042 Q9) |
| `SM_Bld_Apartment_Stairs_*` | 5.5 to 10.3 m deep: past the kerb |
| `SM_Prop_Sign_XXX_*` | wrong for a shop |
| `SM_Prop_Sign_Police_*` | wrong for a shop |
| `SM_Prop_Sign_Hospital_*` | wrong for a shop |
| `SM_Prop_Sign_FireDepartment_*` | wrong for a shop |
| `SM_Prop_ShopInterior_*` | interiors: nothing sees them |
| `SM_Prop_Buger_*` | junk-sized prop |
| `SM_Prop_Soda_*` | junk-sized prop |
| `SM_Prop_SmartPhone_*` | junk-sized prop |
| `SM_Prop_Paper_*` | junk-sized prop |
| `SM_Prop_Police_Baton_*` | junk-sized prop |
| `SM_Prop_Pipe_Present_*` | back walls only |
| `SM_Env_Bridge_*` | not a street piece |
| `SM_Env_WaterEdge_*` | not a street piece |
| `SM_Env_SubwayEntrance_*` | 8 to 15 m deep: past the kerb |

- **Info**: the pack has no animal models, so nothing needs excluding for them.
- **Open (waits for a pack that has glass windows, or a ticket that draws them in code)**: no glass for apartment windows and no lit-window variant: the windows are baked into the floor pieces. Josh's rule that nothing but lit places and live wires glows (chapter 12) means a lit window would be a ticket of its own, not a dressing.
- **Open (waits for a pack that has them, or a ticket that draws them in code)**: no balconies, cornices or separate parapets; no roof railings or ladders; no roller shutters.
- **Open (waits for a second model of each, or a ticket that varies them in code)**: one water tower, one satellite dish and one ATM model only, so variety there comes from placement, not models.
- **Open (waits for a recolouring ticket, or a pack with more awnings)**: awnings come in five fixed shapes and colours of one texture atlas, and the roof props are one colour each. Variety of rooftops and awnings by colour is deliberately not built: it would mean new materials, and the pack's own atlas is what keeps the instancing cheap.
- **Open (waits for a ticket that adds a sign pole)**: no sign pole for street-name signs, so `Sign_Street_*` and the traffic signs are not used.
- **Open (waits for Josh's word on lit places, ticket 049)**: dressing never lights and is never picked, so a lit shop window, a glowing sign or a lit billboard is not in this chapter.

### 16.7 Fallbacks

- **Default (050)**: with no City Pack in the manifest, or its GLB failed, no stack is offered and the terrace is the abutting placeholder boxes of 051 B, as on a fresh checkout and in CI. The town is then exactly what chapter 5's chain gives.
- **Default (051)**: a run that packs no block keeps its placeholders. A stack piece whose root did not load, or whose key is excluded, drops the styles that need it and nothing else; if every style drops, the type falls down the chain of chapter 5.
- **Default (052)**: a dressing or furniture key missing from the manifest drops only its own placements. With no stack there is no dressing, and with no dressing or no packed run there is no furniture: each is drawn only when the layer under it is.
- **Default (054)**: with no `colourways` field in the City Pack's manifest entry, no colourway image loaded, or a fresh checkout or CI, no texture is fetched and every block keeps the cached materials: the scene is exactly what it was before 054. An image that fails to load drops its own id only (16.9).
- **Info**: the circuit and the play view are not touched by any of this: the 3D play view must read exactly as on `main` (R12).

### 16.8 Evaluation protocol

- **Default (053)**: the protocol judges a generated city against the reference with three maps, a fixed set of views and the checklist R1 to R13. Most checklist items are checked by a test on every `npm test`; the rest are judged by eye from screenshots.
- **Default (053)**: the maps, all in `puzzles/`:

| Map | Why |
| --- | --- |
| `09-shrine-circuit` | the map 050 to 052 were built and tested on |
| `64-the-whole-chain` | the largest town: the most runs, and the map that must have a parking lot and a plaza |
| `01-first-light` | the smallest map, the other end of the range |

- **Default (053)**: the views are all `npm run dev`, with `view=3d`. Open each URL, wait for the console line `street camera:` (it appears after the models are applied and one frame is drawn through the street camera), then take the screenshot. `run=0`, `run=1` and `run=2` are the three longest rows (rows are sorted longest first), at the middle (`at=0.5`); `run=0` with `at=0` is the start of the longest row, a corner block where the row starts at a cross street. Each street view is judged at night and again with `light=day`: the reference is daylight, so form, density and variety are judged in day light, and the night views make sure the city still reads dark around the circuit. The play view must read exactly as on `main`. The stack gallery shows every recipe dressed.

| Map | View | URL |
| --- | --- | --- |
| `09-shrine-circuit` | play view | `/?puzzle=09-shrine-circuit&view=3d` |
| `09-shrine-circuit` | longest row, night | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0&at=0.5` |
| `09-shrine-circuit` | second row, night | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=1&at=0.5` |
| `09-shrine-circuit` | third row, night | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=2&at=0.5` |
| `09-shrine-circuit` | corner block, night | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0&at=0` |
| `09-shrine-circuit` | longest row, day | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0&at=0.5&light=day` |
| `09-shrine-circuit` | second row, day | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=1&at=0.5&light=day` |
| `09-shrine-circuit` | third row, day | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=2&at=0.5&light=day` |
| `09-shrine-circuit` | corner block, day | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0&at=0&light=day` |
| `09-shrine-circuit` | stack gallery, dressed | `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1&dress=1` |
| `64-the-whole-chain` | play view | `/?puzzle=64-the-whole-chain&view=3d` |
| `64-the-whole-chain` | longest row, night | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=0&at=0.5` |
| `64-the-whole-chain` | second row, night | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=1&at=0.5` |
| `64-the-whole-chain` | third row, night | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=2&at=0.5` |
| `64-the-whole-chain` | corner block, night | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=0&at=0` |
| `64-the-whole-chain` | longest row, day | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=0&at=0.5&light=day` |
| `64-the-whole-chain` | second row, day | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=1&at=0.5&light=day` |
| `64-the-whole-chain` | third row, day | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=2&at=0.5&light=day` |
| `64-the-whole-chain` | corner block, day | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=0&at=0&light=day` |
| `01-first-light` | play view | `/?puzzle=01-first-light&view=3d` |
| `01-first-light` | longest row, night | `/?puzzle=01-first-light&view=3d&cam=street&run=0&at=0.5` |
| `01-first-light` | second row, night | `/?puzzle=01-first-light&view=3d&cam=street&run=1&at=0.5` |
| `01-first-light` | third row, night | `/?puzzle=01-first-light&view=3d&cam=street&run=2&at=0.5` |
| `01-first-light` | corner block, night | `/?puzzle=01-first-light&view=3d&cam=street&run=0&at=0` |
| `01-first-light` | longest row, day | `/?puzzle=01-first-light&view=3d&cam=street&run=0&at=0.5&light=day` |
| `01-first-light` | second row, day | `/?puzzle=01-first-light&view=3d&cam=street&run=1&at=0.5&light=day` |
| `01-first-light` | third row, day | `/?puzzle=01-first-light&view=3d&cam=street&run=2&at=0.5&light=day` |
| `01-first-light` | corner block, day | `/?puzzle=01-first-light&view=3d&cam=street&run=0&at=0&light=day` |

- **Default (053)**: the checklist. **auto** items are checked by `citymetrics.test.ts` on the plan the game stands for each of the three maps (the thresholds are `CITY_CHECK`, `CITY_ATM_BLOCKS_MIN`, `CITY_BIG_ROOF_RUNS_MIN` and `CITY_STOREYS`, in the Numbers table), and each threshold is also shown to fail on a plan made to break it. **eye** items are judged from the screenshots above.

| Item | What the reference shows | How it is checked |
| --- | --- | --- |
| R1 | continuous frontage: no gap between neighbours, one open lot of each kind to a run, most of the frontage covered | auto: blocks abut, at most one parking lot and one plaza per run, the covered share of the map's frontage; eye: no gap in any street view |
| R2 | 3 to 5 storeys, neighbours differ | auto: the storey range, and every neighbour pair differs in style and floor count; eye: the skyline of each row looks varied |
| R3 | every ground bay is a shopfront, or the one door bay | auto: every base piece is a shop, a shop corner or a door, at most one door per block, no column without a base |
| R4 | glass in every shop | auto: every shop that has a glass key has its glass |
| R5 | awnings over most shop bays, one kind to a block | auto: the share of shop bays with an awning, and no block with two awning keys; eye: they read as awnings, not floating |
| R6 | a sign over most shopfronts, an ATM on some blocks | auto: the share of shop bays with a sign, and the share of blocks with an ATM |
| R7 | fire escapes on the street faces of most blocks of three bays or more | auto: the share of qualifying blocks with one; eye: they stand on the face, not through it |
| R8 | every roof dressed, a big roof prop on many rows | auto: the share of blocks with a roof prop, and of runs with a big one; eye: nothing floats, nothing is inside a wall |
| R9 | corner blocks on true corners only, with two street faces | auto: no corner column off a true corner; eye: the second face is on the cross street |
| R10 | street furniture spaced along the pavement, not cluttered | auto: pitch, corner and keep-out violations are none; eye: it reads busy, not noisy |
| R11 | a parking lot and a corner plaza on the map | auto: on `64-the-whole-chain` there is at least one of each |
| R12 | no people, animals or vehicles; nothing glows; the circuit reads as on `main` | auto: no never-used key in the plan, no emissive material in the drawn dressing; eye: the play view and the circuit are unchanged |
| R13 | neighbouring blocks differ in colour: red, green, cream-tan and teal side by side | auto: the share of adjacent block pairs in a run with different colourway ids, over the plan with a fixed fake set of 8 ids; eye: in the `cam=street&run=0&light=day` screenshot of each map at least four wall colours are visible |

- **Default (053)**: what "matches the reference" means: every auto item passes on all three maps, and every eye item passes on every screenshot listed. A fail names the item, the URL and what is wrong. The main session records the result as a table in the review it shows Josh, one row per item and map: the auto value, and for each eye item pass or fail with the URL.
- **Default (053 Q3)**: the eye items are judged by the main session, from screenshots, and recorded for Josh.
- **Open (waits for Josh's own verdict on the match)**: when Josh gives a verdict on how close a generated street is to his reference, it goes here as **Decided** with his words.

### 16.9 What matches the reference, and what does not yet

- **Info**: measured by `citymetrics.test.ts` on 18 Nov 2026 over the three maps (the numbers move when a rule does; the test, not this line, is the record). All three maps have 44 to 58 runs and 111 to 161 blocks; every auto item passes on all three. Blocks abut exactly. 3, 4 and 5 storeys are about a third each. Every neighbour pair differs in style and in floor count. Every ground bay is a shop or the one door; every shop with glass has it. Of the shop bays about 0.6 have an awning, about 0.5 a sign and about a third of blocks an ATM. A little over half of the qualifying blocks have a fire escape. More than nine blocks in ten have a roof prop. Every corner block is on a true corner. Furniture runs about one item in eight metres of frontage, with no spacing or keep-out violation. The largest map has 10 parking lots and 4 plazas. Nothing never-used is placed and nothing drawn glows.
- **Info**: the far gaps over the three maps: about one run in five closes to a seam, six to eight in ten to an alley, and none to a slit; the rest end in a wider gap of up to about 5 m.
- **Open (waits for a re-cut of ticket 051 C's packer)**: short runs close badly. The ticket asked every run to cover at least `CITY_RUN_FRONTAGE` of its frontage outside open lots. On the three maps 3 to 8 runs fall under it: short rows, 11 to 23 m, where one block is all that fits and 1.3 to 5.2 m is left. R1 is therefore checked as the map's covered share, which holds.
- **Open (waits for a re-cut of ticket 052 A's roof rules)**: roofs. The ticket asked every roof to be dressed and a big roof prop on every run. A few blocks in a hundred have no prop (the small prop is a probability per column), and only about three runs in five have a big one. R8 is checked at the lower thresholds in `CITY_CHECK` and `CITY_BIG_ROOF_RUNS_MIN`.
- **Open (waits for a re-cut of ticket 052 A's awning rule)**: the ticket asked 0.6 of shop bays to have an awning. One map measures a little under it (the escape column and the awnings that would pass the kerb are plain), so R5 is checked at the lower number in `CITY_CHECK`.
- **Open (waits for a re-cut of ticket 052 A's fire-escape rule)**: the alternate-block cap keeps the share of qualifying blocks near a half. The reference has them on most 3-bay blocks.
- **Open (waits for Josh's check in the stack gallery)**: the 34 City Pack fronts are unconfirmed "+z" guesses (chapter 6), and so are the corner pieces' `open` sides. A wrong door would show on the street views as a shop facing the wrong way; nobody has confirmed them by eye except the main session from screenshots.
- **Open (waits for the eye items of 16.8)**: none of the eye items has been judged by the builder of this chapter (no browser was run). The table of results in the review is where they are recorded.
- **Info**: what is deliberately not built: variety of awnings and rooftops by colour, lit windows, balconies and cornices, and every piece the pack lacks (16.6). None blocks the look; each is a line in 16.6 that a later ticket can close.

**Colourways (ticket 054).** Every City Pack block is drawn in one of the pack's colourway atlases, so neighbours differ in wall colour as they do in the reference. A colourway is an alternate texture of the same 1024 x 1024 layout: only cell colours change, so a block keeps its shape and its walls change. `colourway.ts` holds the rules (pure, no three); `models3d.ts` does the drawing.

- **Default (054)**: the pool is `COLOURWAY_POOL`, in the order of the table below, and only these ids are ever fetched. `base` is the atlas the GLB embeds (today's look: it needs no file and no clone). The B tones (about 8% darker, and a night scene is already dark) and 01_A (the same as the base) are left out.

| Id | Series | Tone | Brick wall |
| --- | --- | --- | --- |
| base | 01 | as the GLB embeds it | red, #956257 |
| 01_C | 01 | C, brighter and more saturated | warmer orange-red, #a16458 |
| 02_A | 02 | A, as drawn | dark green, #475343 |
| 02_C | 02 | C | a brighter green |
| 03_A | 03 | A | cream-tan, #ac8f79 |
| 03_C | 03 | C | a brighter tan |
| 04_A | 04 | A | teal, #497d7e |
| 04_C | 04 | C | a brighter teal |

- **Default (054)**: the neighbour rule (R13). A block's start index is a hash of its lot key (`assignColourways`, through a murmur-style finaliser because FNV's low bits are weak on short keys) modulo the number of ids available; if that is the id of the block before it in the same run, it steps to the next. So two neighbours in a run never share a colourway while two or more are available. A stack on a lone lot (no run) takes its hash's id. The available ids are `base` plus the pool ids that loaded, in pool order; with `base` alone every block is `base`.
- **Default (054 Q3)**: neighbours across a corner (the last block of one run and the corner block of the next) are not forced to differ; a match is one in eight. R13 counts within a run only.
- **Default (054)**: only a stack's pieces are painted, and only a material whose map is the base atlas (the texture or image is named for the base, or for the base followed by a colourway id). Glass, the replaced glass and any material with no map keep the very same objects. Each painted material is a clone, cached per source material and id, so no cached model is ever touched; the new map copies the old one's flip, colour space and wrap, uses the nearest filter and has no mipmaps. An emissive map is never set from a colourway.
- **Default (054 Q1)**: dressing and furniture keep the base atlas. Each dressing key is one `InstancedMesh` shared by every block (16.5), and matching the block would split every key into up to eight meshes and break the draw-call cap `DRESS_DRAW_CALLS_MAX`. The reference's awnings and escapes also contrast with their walls: they do not match them.
- **Default (054)**: loading is lazy and optional (16.7). The City Pack entry's `colourways` field is read only when stack keys were asked for; the pool's ids load in parallel; one that fails is dropped with one console line and the rest are used. The export that makes the files and the field is `tools/assets/colourways.ts` (a table of file names only; the images are Synty content, gitignored and fetched by URL at dev time, never bundled).
- **Info (054)**: what changes on a block. 85.7% of the pack's building triangles sample the wall gradient block, where series 02 to 04 recolour the brick and the warm-brown trim columns; 6.5% sample blue panels that turn grey in 02 and 04 (likely door and window panels, accepted as more variety); none sample a sign. Cost: each atlas is 4 MiB decoded, 28 MiB for the 7 that load; materials grow by the distinct base-atlas materials on stack pieces times 7; draw calls and shader programs do not change.
- **Info (054)**: the colour judgement is made with `light=day`: the hue difference is subtle in the night scene.
- **Open (waits for a generated-recolour ticket, if the eye check finds too few colours)**: not every wall changes. The colourways recolour only some gradient columns (the brick, the warm browns, one tan); the grey-walled styles and the shopfront ground floors are the same in every colourway, so the variety is mostly the brick upper floors. Judged by eye by the main session on 18 Nov 2026: neighbouring blocks render in red, dark green, cream-tan and teal, and shopfronts and the grey styles look the same in every colourway. The follow-up, if wanted, is a per-column hue remap of the base made by the converter, not more of this pool.
- **Info (054)**: R13 is measured by `citymetrics.test.ts` on the three maps of the protocol with a fixed fake set of 8 ids, not the real files (CI has none): it passes at 1 because the rule steps off a repeat. The eye half is in 16.8.

## Decided, not yet built (the tile city, 18 Nov 2026)

Josh's rulings from the tile-city work, in his own words, each with the ticket that builds it.

**These are not chapters yet.** As each ticket lands, its builder writes the real chapter or section named beside it, with the ruling as its **Decided** line, Numbers rows for its constants and a drift check. In the same branch, the builder removes the entry here or points it to that chapter. Nothing below changes the chapters above until then.

### Roads and the grid (ticket 055; chapter 17 and chapter 10 when 055 D lands)
- **Default (055, Josh 18 Nov 2026)**: roads on a 90 degree grid only, because the packs' road tiles allow nothing else: "In order for those tiles to work we are going to have to fix the power lines. Currently, the powerline puzzles define the map structure and distort the style of the city in such a way that the city pack doesnt allow."
- **Default (055, Josh 18 Nov 2026)**: angled roads are deferred: "Maybe in the future, we could fix the city to accommodate for all roads that aren't 90*, but for now the map packs don't support that."
- **Default (057, Josh 18 Nov 2026)**: 90 degrees is not a uniform square grid. The tile city's streets and everything on them are at 90 degrees, but blocks vary in width and depth, with alleys and parks: "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc" (057 F and G; chapter 19.5 and 19.6).
- **Default (055, Josh 18 Nov 2026)**: build the road tiles first, without power lines, and put parking in the map: "Build out the use of the road tiles first. If you don't have that built out without the power lines in place, you won't be able to test and verify that things look right when they are placed on the map. You're going to have to figure out a way to integrate things like parking lots into the map as well or else it will feel. A city with no place to park is strange."
- **Default (055, Josh 18 Nov 2026)**: the puzzles are rebuilt later, to the new style: "The puzzles are going to have to be rebuilt in order to conform to the new style. These puzzles were built to demonstrate a skill. They aren't the final puzzles anyway. We can start with 10 puzzles and move from there." This is a puzzle-designer ticket after the circuit-on-the-grid ticket (059 stage B).
- **Default (055, Josh 18 Nov 2026)**: R7 (fire escapes) has a floor of 0.4 on the tile city, and the ladder's 0.5 is unchanged: "Just choose the recommended option for now" (chapter 17).

### Corners and frontage (tickets 055 B, then 057; chapter 19)
- **Default (055, Josh 18 Nov 2026)**: the corner inset was kept at first: "Keep the inset". Each row's first block stood up to 2.5 m back from its corner.
- **Default (057, Josh 18 Nov 2026)**: buildings meet the pavement with no gap, and overlap is allowed. This overrides the inset wherever the inset leaves a strip, so corners are flush: "This is a great start. There are gaps between the buildings and the sidewalk. It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them." (19.1 and 19.2)
- **Default (057, Josh 18 Nov 2026)**: blank block interiors are filled: "There are blank open areas where the buildings don't exist. Those need to be filled in with something. You could fill that with parking lots, parks, or you could have those squares of buildings be thinner so that the buildings are butted up right against each other." Then: "Grass and pavement should fill the blank areas." (19.4)

### Parking (ticket 056; chapter 18)
- **Default (056, Josh 18 Nov 2026)**: there was too much parking. Rules now set the street against the lots for homes and shops: "Roads look good, parking spaces are overwhelming. Too many parking spaces. We should create rules in the style sheet that indicate how much parking should be available on the streets vs parking lots for residential and business style units."
  - Shoppers get kerb bays, residents get lots: 1 bay per 3 shops, 0.15 stalls per home.
  - From 057 on, residents' lots are interior courts.

### Buildings (tickets 055 F and 058; sections 16.10 and 16.11)
- **Default (055 F, Josh 18 Nov 2026; F awaits his G1 on its Q10 to Q13)**: each building's door sill is measured, and the building is sunk to the walk or given steps: "That's going to have to be a variable that we measure for each individual building." (16.10)
- **Default (058, Josh 18 Nov 2026)**: fire escapes connect, and their platforms are level with the windows: "There are gaps on the fire escapes. Additionally, fire escapes should always be level with windows or else people can't get out of the building." (16.11)

### Poles, wires and lights (ticket 059; chapter 20, with lines in chapters 8 and 12)
- **Default (059, Josh 18 Nov 2026)**: street lights and power lines go on the tile city: "There are no streetlights either, or power lines." Also, from 055: "There are also models inside the city pack to showcase power lines."
  - Poles stand in the reserved slots, with code-drawn wires and Town Pack street lights distinct from puzzle lamps.
  - No never-used model is lifted unless Josh asks.

### Testing daylight (ticket 060, awaiting Josh's G1; section 16.12)
- **Default (060, Josh 18 Nov 2026)**: a dev-only day mode, for testing only. The game's night look (chapter 11) is unchanged: "please create a day light mode so it's easy to see" and "the purpose of the day mode is for testing".

## Numbers

The drift test (`styleguide.test.ts`) reads this table. Each row names an export of the file in its last column. A value is a number (within 1e-9), a colour as `0x` hex (exactly), or `a x b x c` for a record, in the record's field order. `LOT_TYPES` is frontage x depth x cap in metres and `PLACE_SIZES` is width x depth in metres. `STACK_STYLES[i].pitch_m` is base x floor x roof in metres (the storey heights a recipe counts floors by; the roof is the height reserved under the cap), in the order `apartment-01`, `-02`, `-03`, `office-old-small`, `office-old-large`, `office-octagon`. `STACK_FLOORS` is the fewest floors over the base. `TINTS[i]` is the i-th wall tint. `CITY_CHECK` is the threshold of R1 to R13 in that order (a share to reach, or a count not to pass, chapter 16.8) and `CITY_STOREYS` is the fewest and most storeys. Changing a constant in code or a value here fails the test. Since ticket 053 the test also fails when `stacks.ts`, `terrace.ts`, `dressing.ts`, `furniture.ts`, `streetcam.ts` or `citymetrics.ts` exports a number that has no row here, and when `town.ts` does for a `TERRACE_*`, `PARKING_*` or `PLAZA_*` name. Since ticket 054 the test also fails when `colourway.ts` exports a constant (not a function) that has no row here; `COLOURWAY_POOL` is pinned by its length, and its ids are the table in 16.9.

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
| `TERRACE_BAY_M` | 5.2 | town.ts |
| `TERRACE_DEPTH_M` | 6 | town.ts |
| `TERRACE_BAYS` | 2 x 4 | town.ts |
| `TERRACE_CAPS_M[0]` | 16 | town.ts |
| `TERRACE_CAPS_M[1]` | 13 | town.ts |
| `TERRACE_CAPS_M[2]` | 10 | town.ts |
| `PARKING_W_M` | 10 | town.ts |
| `PARKING_D_M` | 10 | town.ts |
| `PARKING_MIN_RUN_BAYS` | 8 | town.ts |
| `PARKING_ONE_IN` | 3 | town.ts |
| `PLAZA_W_M` | 10.4 | town.ts |
| `PLAZA_ONE_IN` | 4 | town.ts |
| `TERRACE_SEAM_M` | 0.1 | terrace.ts |
| `TERRACE_SLACK_M` | 0.15 | terrace.ts |
| `ALLEY_MIN_M` | 1 | terrace.ts |
| `ALLEY_MAX_M` | 1.5 | terrace.ts |
| `STACK_FLOORS.small` | 1 | stacks.ts |
| `STACK_FLOORS.house` | 1 | stacks.ts |
| `STACK_FLOORS.large` | 2 | stacks.ts |
| `STACK_FLOORS.tall` | 5 | stacks.ts |
| `STACK_STYLES[0].pitch_m` | 3 x 3 x 0.5 | stacks.ts |
| `STACK_STYLES[1].pitch_m` | 3 x 3 x 0.75 | stacks.ts |
| `STACK_STYLES[2].pitch_m` | 3 x 3 x 0.75 | stacks.ts |
| `STACK_STYLES[3].pitch_m` | 6 x 3.19 x 4.22 | stacks.ts |
| `STACK_STYLES[4].pitch_m` | 6 x 3.19 x 4.23 | stacks.ts |
| `STACK_STYLES[5].pitch_m` | 3.9 x 3 x 5.38 | stacks.ts |
| `NEIGHBOUR_GAP` | 0.5 | models.ts |
| `STREET_REPEAT_GAP` | 3 | models.ts |
| `FAMILY_SHARE_MAX` | 0.25 | models.ts |
| `POLYGON_MIN_FAMILIES.small` | 4 | models.ts |
| `POLYGON_MIN_FAMILIES.house` | 4 | models.ts |
| `POLYGON_MIN_FAMILIES.large` | 4 | models.ts |
| `POLYGON_MIN_FAMILIES.tall` | 3 | models.ts |
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
| `P_AWNING` | 0.75 | dressing.ts |
| `P_SIGN` | 0.6 | dressing.ts |
| `P_ATM` | 0.3 | dressing.ts |
| `ATM_PER_RUN` | 2 | dressing.ts |
| `P_CANOPY` | 0.5 | dressing.ts |
| `P_ESCAPE` | 0.6 | dressing.ts |
| `ESCAPE_MIN_BAYS` | 3 | dressing.ts |
| `P_WALL_AC` | 0.15 | dressing.ts |
| `P_PLANTER` | 0.1 | dressing.ts |
| `WALL_PROPS_PER_BLOCK` | 4 | dressing.ts |
| `P_ROOF_SMALL` | 0.7 | dressing.ts |
| `ROOF_SMALL_PER_BAY` | 2 | dressing.ts |
| `P_ROOF_LARGE` | 0.5 | dressing.ts |
| `DRESS_PER_BAY_MAX` | 6 | dressing.ts |
| `DRESS_MAX` | 6000 | dressing.ts |
| `ROOF_EDGE_M` | 0.3 | dressing.ts |
| `AWNING_KERB_M` | 0.3 | dressing.ts |
| `GLASS_INSET_M` | 0.05 | dressing.ts |
| `GLASS_SILL_M` | 0.3 | dressing.ts |
| `DRESS_DRAW_CALLS_MAX` | 120 | dressing.ts |
| `P_BLADE` | 0.25 | dressing.ts |
| `P_ROOF_SECOND` | 0.4 | dressing.ts |
| `KERB_FROM_FRONT_M` | 3.3333333333 | dressing.ts |
| `GLASS_WRAP_DEPTH_M` | 1 | dressing.ts |
| `AWNING_BASE_M` | 2.85 | dressing.ts |
| `SIGN_BASE_M` | 2.85 | dressing.ts |
| `DOOR_CANOPY_Y_M` | 2.3 | dressing.ts |
| `ATM_Y_M` | 0.6 | dressing.ts |
| `ATM_PIER_M` | 0.35 | dressing.ts |
| `WALL_MIN_LEVEL` | 2 | dressing.ts |
| `WALL_AC_LIFT_M` | 1 | dressing.ts |
| `PLANTER_LIFT_M` | 0.9 | dressing.ts |
| `WALL_AC_OFFSET_M` | 1.5 | dressing.ts |
| `BILLBOARD_SIGN_Y_M` | 0.9 | dressing.ts |
| `BLADE_INSET_M` | 0.1 | dressing.ts |
| `FURN_KERB_M` | 0.5 | furniture.ts |
| `FURN_WALL_M` | 0.4 | furniture.ts |
| `FURN_PITCH_M` | 7 | furniture.ts |
| `TREE_PITCH_M` | 12 | furniture.ts |
| `BUS_STOP_MIN_RUN_M` | 40 | furniture.ts |
| `FURN_KEEP_M` | 1.5 | furniture.ts |
| `FURN_CORNER_M` | 4 | furniture.ts |
| `FURN_MAX_H_M` | 3.2 | furniture.ts |
| `P_FURN` | 0.7 | furniture.ts |
| `FURN_GAP_SPAN_M` | 6 | furniture.ts |
| `FURN_GAP_M` | 0.3 | furniture.ts |
| `P_BOLLARD` | 0.5 | furniture.ts |
| `BOLLARD_PER_RUN` | 2 | furniture.ts |
| `HYDRANT_PER_RUN` | 1 | furniture.ts |
| `MAILBOX_PER_RUN` | 1 | furniture.ts |
| `NEWSPAPER_PER_RUN` | 2 | furniture.ts |
| `BUS_STOP_PER_RUN` | 1 | furniture.ts |
| `P_ALLEY` | 0.85 | furniture.ts |
| `P_ALLEY_SECOND` | 0.5 | furniture.ts |
| `P_PARKING_BILLBOARD` | 0.6 | furniture.ts |
| `BILLBOARD_BOARD_LIFT_M` | 4.55 | furniture.ts |
| `SLAB_MAX_M` | 0.2 | furniture.ts |
| `FURN_DRAW_CALLS_MAX` | 80 | furniture.ts |
| `WALL_EDGE_M` | 0.8333333333 | furniture.ts |
| `KERB_M` | 3.3333333333 | furniture.ts |
| `STREET_CAM_BACK_M` | 26 | streetcam.ts |
| `STREET_CAM_EYE_M` | 9 | streetcam.ts |
| `STREET_CAM_LOOK_M` | 6 | streetcam.ts |
| `STREET_CAM_YAW_DEG` | 35 | streetcam.ts |
| `STREET_CAM_FOV_DEG` | 50 | streetcam.ts |
| `STREET_CAM_FOV_MAX_DEG` | 85 | streetcam.ts |
| `STREET_CAM_SKY` | 0xcfe0ff | streetcam.ts |
| `STREET_CAM_GROUND` | 0x6b5a48 | streetcam.ts |
| `STREET_CAM_DAY_INTENSITY` | 2.2 | streetcam.ts |
| `CITY_CHECK` | 0.9 x 1 x 1 x 1 x 0.55 x 0.5 x 0.5 x 0.9 x 0 x 0 x 1 x 0 x 1 | citymetrics.ts |
| `CITY_ATM_BLOCKS_MIN` | 0.15 | citymetrics.ts |
| `CITY_BIG_ROOF_RUNS_MIN` | 0.5 | citymetrics.ts |
| `CITY_RUN_FRONTAGE` | 0.9 | citymetrics.ts |
| `CITY_STOREYS` | 3 x 5 | citymetrics.ts |
| `COLOURWAY_POOL.length` | 8 | colourway.ts |

Inline in `buildScene` (`scene.ts` has no named constant for these, and this ticket may not add one, so the test looks for the exact source text):

| Part | Source text |
| --- | --- |
| background | `scene.background = new Color(0x0b0f17)` |
| ambient light | `new AmbientLight(0x4a5a7a, 1.1)` |
| moon light | `new DirectionalLight(0x8fa6d0, 0.7)` |
