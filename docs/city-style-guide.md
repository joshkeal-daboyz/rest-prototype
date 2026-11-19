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
- **Decided (063 B, Josh, 19 Nov 2026, looking at the tile city in daylight)**: "The streets do not need to be 4 tiles wide." The tile city (`city=tiles`) has no avenues: every street line is the 5-cell street profile (pavement, parking band, two lanes, pavement: 25 m across, a 3-cell carriageway of 15 m), and a junction is 3 x 3 cells. The grammar's Q7 (no avenues) is an adopted recommendation under his goal waiver, "I don't want to constantly approve all of these improvments."
- **Default (063 B)**: `AVENUE_ONE_IN` is 0, an off switch (0 is none; before, one interior line in 3 by hash, and at least one on every axis, was a 6-cell avenue with a 4-cell carriageway and a parking band on both sides). The avenue profile, 056's avenue-first bay order and `KERB_BAY_SHARE_MAX.avenue` stay in `tilecity.ts`, unused. Tests pin every carriageway at 15 m and the largest junction at 3 x 3 (`tilecity.test.ts`, "street width: no avenues"). The ladder's maps and `town.ts` are not touched.

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
- **Decided (063 A, Josh, 19 Nov 2026: "Make the side walk one uniform color.")**: every plain pavement and build-out cell of the tile city is the same piece. `TILE_SLOTS` gives the pavement `SM_Env_Sidewalk_Straight_02` and the grate `SM_Env_Sidewalk_Grate_01` (one cell in `GRATE_ONE_IN`, variant `PAVEMENT_GRATE`), and the build-out `Straight_02` alone: one key, so one geometry, one opaque material and one InstancedMesh, and every plain cell is the same texels under the same light.
- **Info (063 A, measured 19 Nov 2026)**: the two straights were the same mesh and the same colour (the slab `#8c8987`, the lip and joints `#7b7b79`). The difference was the material: `Sidewalk_Straight_01` is the only piece the tile view used whose material is BLEND. The converter put it on the City Pack's second atlas copy, `PolygonCity_Texture_01_A`, whose alpha channel is mostly under 255 (102 and 44 of 255 at the slab), so it drew at 17 to 40% opacity and the sage ground or the asphalt showed through: the pale sage slabs and the dark build-outs. `Straight_01` is now in no role and is not loaded. A test reads the GLB and fails on any piece the tiles or the interiors load whose material is BLEND. The converter's handling of that atlas copy is a `tools/` matter (ticket 063's open item A1).
- **Decided (063 D, Josh, 19 Nov 2026: "Are these tiles supposed to represent plots where trees should be planted? It looks like the textures aren't being used properly")**: the interior paving is the plain slab `SM_Env_Sidewalk_01`, in place of `SM_Env_Sidewalk_Panel_02`, which has two inset plates 0.04 m below its slab (3.8 m2 of dark green-grey, with studs) that read as plots; they are service covers the pack drew, not tree plots, and the texture was used correctly. Where it is drawn is in 19.8.
- **Decided (063 H, Josh, 19 Nov 2026: "If you're going to have an inlet to areas between buildings it needs to be paved")**: a court's drive and an alley's mouth are paved with that slab, from the kerb cut to where the opening meets the interior (19.8).
- **Default (063 A, 063 H, the architect's recommendations adopted under Josh's goal waiver, 19 Nov 2026)**: the 1-in-6 grates stay (`GRATE_ONE_IN`: the same colour, opaque, on the same atlas), and only the inlet through the row is paved, not the whole court (the court's stalls, aisle and the alley lane beyond ring 1 keep the bare road). Josh did not answer these two in words; he said he does not want to approve each improvement ("I don't want to constantly approve all of these improvments."). If he objects on seeing them, each is one constant or one line.
- **Decided (063 F, Josh, 19 Nov 2026: "It's ok to have curbs that stretch out like this in spots but the curb structures have to follow the crub.", and, of an inlet between two buildings, "Here is an example of how the curbs may flow in this case scenario")**: the tile city's kerb runs as one line (`kerbline.ts`: along each street side's pavement band; out round every stretch of build-outs, along the first build-out's flank, its outer edge and back along the last flank; and at every inlet in at a return on each side, along that side of the opening to the building line). It stops at a corner or a crossing. Josh's drawing is the rule: at an inlet the kerb turns in on each side of the opening and runs along it to the building line, with the dropped kerb of the mouth between the two returns. What is drawn on the line is in 19.8.
- **Info (063 F, measured 19 Nov 2026)**: the pack's sidewalk pieces have the kerb face 0.66 m inside the cell's edge, not on it (`KERB_FACES_M`: `Straight_02` 0.66 m, `Grate_01` 0.65 m, `Dip_01` 0.66 m; the lip is 0.30 m above the road, 0.07 m above the walk, and 0.39 m wide), and the 0.65 m outside the face is the piece's own gutter and ramp at road level. A straight has no face on its two ends: the open, unkerbed edge of every build-out stretch. The layout's kerbs (`Town.kerbs`, `TileStreet.carriage`) stay on the cell edge, and a pole slot (`POLE_SLOT_FROM_KERB_M`, 0.75 m from the edge) stands 0.09 m behind the pack's face: 059 reads it and keeps it. `Sidewalk_Dip_Corner_01` is a pedestrian ramp, not a kerb return: each of its two legs has only about 1.1 m of full-height kerb, at the leg's far end, and the rest of the corner falls to the road on a diagonal ramp, so it cannot carry the kerb round an inlet. A test reads the GLB and re-measures every face within 0.02 m.
- **Default (063 F)**: the pack's kerb is not changed and nothing is scaled. A pavement cell with a build-out in front of it (`PAVEMENT_FLUSH`) is drawn as the plain slab `SM_Env_Sidewalk_01` at the walk (or a code box in the pavement colour), with no kerb and no gutter, so the pavement runs on, level, to the build-out and the 0.65 m trench between them is gone. The flank of each build-out stretch and the side of each opening are code-drawn kerb strips (`KERB_LIP_W_M` wide, `KERB_LIP_TOP_M` above the road, colour `KERB_STRIP_COLOUR`, the pack's own lip and joints) on the line.
- **Default (063 F, the architect's recommendation adopted under Josh's goal waiver, 19 Nov 2026)**: the return stops at the building line (the pavement's back edge). It does not go on along the building walls through ring 1 to the interior: that is a kerb against a wall. The returns are squared, not rounded (19.8).
- **Pending (042 C, gated on Josh's converted road pack)**: the road, junction, kerb and pavement slots in `MODEL_TABLE`, each falling back, per slot, to the code-drawn part.

## 11. Palette and light

- **Info**: it is a night scene. The values are in the Numbers table (colours as `0x` hex, pinned exactly). The scene's background, ambient light and moon light are in `LIGHT_MODES.night` (`lighting.ts`, section 16.12), and the table's last section pins their source text there too.
- **Default (060)**: the testing daylight of 16.12 is a dev tool and not part of the game's look: the game is night, and no player toggle ships.
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
| town-pack | POLYGON Town Pack | 1 | in use | twelve whole houses and a garage (048: `SM_Bld_House_Preset_01` to `_11`, `SM_Bld_House_Preset_Garage_01`); a church, a shed and props are not placed, except the house concrete steps (055 F, 16.10) |
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
- **Default (052, 058)**: fire escapes. An apartment block of at least `ESCAPE_MIN_BAYS` columns and two floors takes one when its block is among the map's chosen escape blocks (16.11: by hash rank, so the share is guaranteed and not chance), on a mid column that is not a door column, from the first floor to the roof: one platform on every storey, level with its windows, joined by flights, with a drop ladder that reaches the walk (16.11). That column's ground row stays plain. No two neighbouring blocks of a run both have one, which caps the share of qualifying blocks below "most" (R7; chapter 16.9).
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
- **Info (055 F)**: one model of a pack that is otherwise not placed is in use: the Town Pack's `SM_Bld_House_Concrete_Steps_01` (`STEPS_KEY`, 1.2 x 0.5 x 0.9 m), the door steps of 16.10. Its sibling `SM_Bld_House_DeckSteps_01` converts to 0 x 0 x 0 (`scale-suspect`), so it is broken and not used. The City Pack's only steps, `SM_Bld_Apartment_Stairs_*`, are in the never-used table above (2.4 to 4 m high and 5 to 10 m deep, far too big for a door).
- **Default (057 D)**: the tile city places no Town Pack piece. The gate and posts that close a gated passage (19.2) are code-drawn boxes, so the Town Pack's `SM_Env_Fence_Wood_Gate_01` and `_Post_01`, which the 057 draft named, are not placed. No piece of `CITY_NEVER_USED` is lifted, and the interiors of 19.4 use the City Pack and code only.
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

### 16.10 Door sills (ticket 055 F)

How high a building's door stands over the walk in front of it, and what is done about it. `sills.ts` holds the measured table, the plan and the measuring function, `models3d.ts` draws the result (the sink, the dressing's offset, the steps), and `sills.test.ts` pins every value and re-measures them from the converted GLBs where they are on the machine.

- **Decided (055 F, Josh 18 Nov 2026: "That's going to have to be a variable that we measure for each individual building.")**: a building's door sill is measured, one number for each model, and a building whose sill is out of reach of the walk is sunk until its door meets it. Josh said this when house foundations stood higher than the street, so that no one could walk in. The rest of this section is the defaults the ticket chose to meet it (approved with "Approved and confirmed", Q10 to Q13 at their defaults).
- **Default (055 F, Q10)**: the rule applies everywhere, on the tile city and on the ladder maps alike: they are the same buildings, and a door nobody can reach is wrong on both. On the ladder maps only building and stack heights, the dressing's heights on the blocks that sink, and the added steps change; the layout, the packer, the furniture, the open lots, the tiles, picking, the Relight and the playtest snapshots are as they were. The sink is applied when drawing (`applyModels`), never in the plans.
- **Default (055 F, Q11)**: a sill up to `SILL_MAX_M` is left alone: a door step.
- **Default (055 F, Q12)**: sink first. A house (a whole model) sinks by its sill, but no further than leaves its lowest ground-floor window `SILL_WINDOW_CLEAR_M` over the walk; if that leaves more than `SILL_MAX_M` to climb, the Town Pack's concrete steps stand at its door, outside its front face and tucked `STEPS_TUCK_M` into it, scaled in y alone (`STEPS_SCALE_Y`) until their top (`STEPS_RISE_M` at scale 1) meets the door to within `STEPS_FIT_M`. A rise under the steps' smallest is made by sinking less, so the steps still meet the door. A stack (a City Pack building, a terrace block or a tall-lot stack) always sinks, as one, by the largest sill of its ground pieces (the base, door and corner pieces, role "base"), never takes steps (a terrace's front is the walk, and steps there would stand in the walkers' way), and takes its dressing (glass, awnings, signs, fire escapes, roof props) down with it. Its ground pieces are then lifted one by one so each door meets the walk (062 B, below). Furniture, open lots, tiles and lot placeholders do not move.
- **Default (055 F, Q13)**: the steps are `STEPS_KEY`, the Town Pack's `SM_Bld_House_Concrete_Steps_01`, 1.2 x 0.5 x 0.9 m (`STEPS_W_M` x `STEPS_RISE_M` x `STEPS_D_M`; 1.19 x 0.513 x 0.871 in the GLB): a second texture atlas beside the houses that already use it, drawn as one InstancedMesh and never picked. With the model absent (a fresh checkout, CI), the steps are one InstancedMesh of plain boxes of the same size in the lot's ground colour (`YARD`). Puzzle pages ask for the steps with the town; the tile city does not, because it has no house and would otherwise fetch the Town Pack's 110 MB for nothing. The Town Pack's `SM_Bld_House_DeckSteps_01` is broken (16.6).
- **Info (055 F)**: how a sill is measured (`measureDoor`, from the converted GLB's geometry). The front face is the model's furthest vertex along the front `BUILDING_FRONTS` names; `v` is the depth behind it. A door floor is a horizontal, upward-facing surface up to `SILL_CEIL_M` high that starts within `SILL_DEPTH_M` behind the front face. Surfaces within `SILL_LEVEL_GAP_M` in height are one level, and those on a level within `SILL_JOIN_GAP_M` along the front are one cluster; a cluster under `DOOR_MIN_AREA_M2` is a fitting (a door's kick plate, a stair nosing), not a floor. The door is at the front's centre when a floor cluster covers it, else at the centre of the nearest floor cluster (a house's threshold slab, an office's lobby). The sill is the highest floor cluster within `SILL_DOOR_HALF_M` either side of the door's centre. `window_m` is the lowest vertex of the glass triangles within `SILL_DEPTH_M` of the front face; a model with no glass material takes the window method of the 062 A rule below. A model the geometry cannot settle has an entry typed in or a reason in `NO_STREET_DOOR` (below).
- **Decided (055 F, 062, Josh 18 Nov 2026: "Merge 055 F (Recommended)")**: with that answer he merged 055 F and chose ticket 062 to settle the gaps it left (the 22 keys with no sill, the stoops and the windows of the single-material models). Mixed-sill stacks are section B of the same ticket.
- **Default (055 F, 062 A)**: every placeable building has a sill. A key whose first door floor starts further back than `SILL_DEPTH_M` (a recessed porch, a set-back shop door) is measured with its own search depth, `SILL_DEPTH_BY_KEY` (a depth and a reason each, rounded up from the floor's measured start to a tenth of a metre, never over `SILL_DEPTH_MAX_M`). That settles `SM_Bld_House_Preset_10` and `_11` (2.57 m back, 3 m search, 1.05 m), the SIMPLE Town shops, stores, `Building_House_05` to `_08`, the gym, the coffee shop (1.08 to 3.49 m back) and the stoop houses `Building_House_09`, `_010` and `_011` (their door floor, 0.64 m, is 1.24 m back behind two stoop steps).
- **Default (055 F, 062 A)**: beyond `SILL_DEPTH_MAX_M`, or where there is no front floor, the sill is typed in with its reason (the `why` of its entry): `SM_Bld_House_Preset_04` (its 1.15 m threshold, 5.05 m back in a deep porch) and the Town Pack's `SM_Bld_House_Preset_Garage_01` (1.052 m: it sinks like its houses, by the same sill, so no plinth is left beside them). Or the key is in `NO_STREET_DOOR` with a reason, sill 0, drawn unchanged: the SIMPLE Town garages (vehicle bays at ground level), `Building_PetrolStation` (a forecourt), `house_mesh` (its door is at the back) and the City Pack's `SM_Bld_Shop_06` (a flat front with no floor).
- **Default (055 F, 062 A)**: a window is read from the model where it has no glass material. `window_m` is the lowest front-facing face that is recessed at least `RECESS_MIN_M` behind the front plane, of at least `RECESS_AREA_M2` (faces on one plane within `RECESS_FLAT_M`, touching within `RECESS_JOIN_M`, are one surface), no deeper than `WINDOW_DEPTH_M`, with its lowest edge at least `RECESS_ABOVE_FLOOR_M` above the door floor, and not wholly within `RECESS_DOOR_HALF_M` either side of the door's centre (that is the door's leaf). Where none can be read, the entry has no front window and is listed in `NO_FRONT_WINDOW` with a reason. A City Pack ground piece is a stack's and has no window check; its window is the first floor's (`WINDOW_SILL_M`).
- **Default (055 F, 062 A)**: a front step is never buried. `step_m` is the top of the lowest upward-facing level in front of the door floor (at least `STEP_MIN_M` high and `STEP_BELOW_FLOOR_M` under the floor, no further back than the floor starts). A house sinks no further than leaves that step at the walk, and the rest is made up by the concrete steps by 055 F's rule (the same rule: the steps are scaled in y alone, and a rise under their smallest is made by sinking less). On the table this holds for `Building_House_01` to `_04` (a 0.60 m step before a 1.04 m floor), `Building_House_09` to `_011`, `Building_House_012` to `_015` and the three SIMPLE Town offices.
- **Info (055 F, 062 A)**: `NO_STREET_DOOR` and the typed-in entries are the only keys that are not measured within `SILL_DEPTH_MAX_M`. A City Pack ground piece's `step_m` is not kept in the table (a stack never takes steps).
- **Info (055 F, 062 A)**: the table (`DOOR_SILLS`, in metres in the model's own frame, from the GLBs of 18 Nov 2026; the door's centre is along the front, to the right as seen from outside). 57 entries, 6 more keys with a reason in `NO_STREET_DOOR`; every placeable key is in one or the other. A window of `none` is in `NO_FRONT_WINDOW`.

| Key | Sill | Lowest window | Front step | Door's centre |
| --- | --- | --- | --- | --- |
| `city-pack:SM_Bld_Shop_01` | 0.106 | none | none | 0 |
| `city-pack:SM_Bld_Shop_02` | 0.071 | none | none | 0 |
| `city-pack:SM_Bld_Shop_03` | 0.043 | none | none | 0 |
| `city-pack:SM_Bld_Shop_04` | 0.077 | none | none | 0 |
| `city-pack:SM_Bld_Shop_05` | 0.361 | none | none | 0 |
| `city-pack:SM_Bld_Apartment_Door_01` | 0.029 | none | none | 0 |
| `city-pack:SM_Bld_Apartment_Door_02` | 0.206 | none | none | 0 |
| `city-pack:SM_Bld_Shop_Corner_01` | 0.159 | none | none | 0 |
| `city-pack:SM_Bld_Shop_Corner_02` | 0.376 | none | none | 0 |
| `city-pack:SM_Bld_OfficeOld_Small_Base_01` | 0.915 | none | none | 2.5 |
| `city-pack:SM_Bld_OfficeOld_Large_Base_01` | 0.915 | none | none | 0 |
| `city-pack:SM_Bld_OfficeOctagon_Base_01` | 0.085 | none | none | 0 |
| `town-pack:SM_Bld_House_Preset_01` | 1.151 | 1.851 | none | 0 |
| `town-pack:SM_Bld_House_Preset_02` | 1.052 | 1.752 | none | 1.271 |
| `town-pack:SM_Bld_House_Preset_03` | 1.151 | 1.851 | none | -2.479 |
| `town-pack:SM_Bld_House_Preset_04` (typed in) | 1.151 | 1.851 | none | -2.5 |
| `town-pack:SM_Bld_House_Preset_05` | 1.166 | 1.866 | none | -2.479 |
| `town-pack:SM_Bld_House_Preset_06` | 1.052 | 1.752 | none | 0 |
| `town-pack:SM_Bld_House_Preset_07` | 1.052 | 1.752 | none | 2.521 |
| `town-pack:SM_Bld_House_Preset_08` | 1.102 | 1.802 | none | -4.979 |
| `town-pack:SM_Bld_House_Preset_09` | 1.052 | 1.752 | none | -1.229 |
| `town-pack:SM_Bld_House_Preset_10` (3 m search) | 1.052 | 1.752 | none | -2.666 |
| `town-pack:SM_Bld_House_Preset_11` (3 m search) | 1.052 | 1.752 | none | 0 |
| `town-pack:SM_Bld_House_Preset_Garage_01` (typed in) | 1.052 | none | none | 0 |
| `simple-town:Building_Shop_01, _02` | 0.337 | 6.352 | none | 0 |
| `simple-town:Building_Shop_03, _04, _05` (2.4 m search) | 0.199 | 5.515 | none | 0 |
| `simple-town:Building_BaberShop` (1.4 m search) | 0.333 | 1.299 | none | 2.461 |
| `simple-town:Building_Gym` (2.5 m search) | 0.337 | 6.352 | none | 0 |
| `simple-town:store_small_mesh` (1.4 m search) | 0.212 | none | none | 0 |
| `simple-town:store_corner_mesh` (1.2 m search) | 0.212 | 4.295 | none | -3.799 |
| `simple-town:apartment_small_mesh, apartment_large_mesh` | 0.212 | 2.137 | none | 0 |
| `simple-town:Building_House_01 to _04` | 1.035 | 1.721 | 0.601 | 0 |
| `simple-town:Building_House_05 to _08` (2.5 m search) | 0.330 | 1.201 | none | 0 |
| `simple-town:Building_House_09, _010, _011` (1.3 m search) | 0.639 | 2.832 | 0.213 | 0 |
| `simple-town:Building_House_012 to _015` | 1.053 | 1.330 | 0.682 | 0 |
| `simple-town:office_small_mesh, office_medium_mesh, office_large_mesh` | 0.505 | 1.959 | 0.245 | -2.991 |
| `simple-town:Building_AutoRepair` | 0.138 | 1.182 | none | -5.965 |
| `simple-town:Building_StripClub` | 0.138 | 0.765 | none | 0 |
| `simple-town:Building_PoliceStation` | 0.402 | 0.529 | none | 0 |
| `simple-town:Building_CoffeeShop` (3.6 m search) | 0.333 | 5.954 | none | 0 |

- **Info (055 F, 062 A)**: what it does on the real table. The Town Pack houses (now eleven and the garage) stand 1.05 to 1.17 m over their base with their lowest window 0.70 m over their sill, so each sinks by its whole sill and none takes steps: `Preset_10` and the garage now sink like the rest, so the plinths of 16.8 are gone. The SIMPLE Town houses with a front step sink to that step and take the concrete steps for the rest; `Building_PoliceStation` (a reveal 0.53 m up, sill 0.40) is limited by its window and takes the smallest steps. No building leaves a rise out of reach (`leavesGap`). A stack still sinks by its largest ground sill (a block with a `Shop_05` sinks 0.361 m, the `OfficeOld` bases 0.915 m).
- **Default (055 F, 062 B)**: a mixed-sill stack gets a per-piece lift. The block still sinks as one, by its largest ground sill (`stackSill`), so the floors and the roof line stay level along the terrace. Each ground piece with a measured sill is then lifted by (the block's sink less its own sill) (`stackLift`, pure, in `sills.ts`; the lift is keyed by column, and a two-bay shop is in both), so every door's sill meets the walk: a shop's, a corner's and the residents' door. A lifted piece's bottom stays at less its own sill, under the walk, so no gap opens under it; its top rises into the first floor's lower band by at most the lift (0.35 m at most with today's pieces, `Door_01` in a `Corner_02` block). A piece with no measured sill (`Shop_06`) is not lifted. A block that does not sink lifts nothing.
- **Default (055 F, 062 B)**: the window rule. A lifted piece's top (its height over the first floor's base plus the lift) stays `LIFT_CLEAR_M` under the first floor's measured window sill (058's `WINDOW_SILL_M`, by `sillOf`; the lowest over the columns a piece covers). Where the full lift would break that, the lift is held back to what the rule allows; the door then stands under the walk by what is left, which is accepted up to `SILL_UNDER_M` (a sunk threshold) and a problem beyond it. Every door ends within `SILL_MAX_M` over and `SILL_UNDER_M` under the walk, and `stackLift` lists the ones that do not.
- **Default (055 F, 062 B)**: the sill band. When a stack's ground pieces would break the window rule, its ground row keeps to one sill band (`sillBands`, `SILL_BAND_M`): the low band holds the keys with a sill of at most `SILL_BAND_M` (`Shop_01` to `_04`, `Door_01` and `Corner_01`), the high band the rest (`Shop_05`, `Door_02` and `Corner_02`). `Shop_06` has no sill, no door and no glass, so it is in neither band: banding a block never trades its shops for blank fronts (a banded block has no more `Shop_06` than it had). The band is a new option of `assembleStack` (`sillBand`: the keys the ground row may be picked from), default off, so a stack that has no problem is exactly what it was. `fitSillBand` tries the band the lot's hash picks first, then the other, and keeps the first with no problem. The terrace packer (`terrace.ts`) is not given the option, so `bandPacked` (`models3d.ts`, pure) runs on what `packTown` gave: a block with a problem is assembled again within a band (same lot, floors and columns), taken only where the columns, floors, width, reach past the columns and the x and y of every piece above the ground row are the same (`sameAboveGround`). `applyModels` draws these blocks, lays the furniture by them and hands them back as `applied.packed`, and the pure plan (the metrics, the frontage, the passage floors) is made from them, so what is checked is what is drawn. The lone stacks of the ladder maps do the same in `buildingPlacements`.
- **Default (055 F, 062 B)**: the dressing follows. A lifted ground piece's glass, awning, sign, door canopy and the ATM beside a door rise with it (`liftDressing`: the slots `glass`, `awning`, `sign` and `wall`, by the piece's column). Nothing else moves: the floors' dressing, the roof props and the fire escapes (058's escapes stand on mid, non-door columns, and their joints and ladder foot still pass `escapeCheck`) are as they were.
- **Info (055 F, 062 B)**: what it does with today's pieces. `Door_01` in a `Corner_02` block is inside the window rule (a 0.347 m lift against apartment 02's window sill of 0.417 m, which allows 0.367 m), so it needs no band. The pieces that need one are the 3.17 to 3.30 m shops (`Shop_02`, `Shop_04`, and `Shop_03` on apartment 02) beside a high-sill piece: `Shop_02` may be lifted only 0.067 m under apartment 02's window sill, so beside a `Shop_05` its door would end 0.22 m under the walk. In the low band the same shop's door ends at most 0.021 m under the walk. On the default tile city 10 of 97 blocks are assembled again within a band; on `01-first-light` 30 of 111, `09-shrine-circuit` 27 of 122 and `64-the-whole-chain` 32 of 163. Layout, the lots, the furniture and the pieces above the ground row, in x and y, are as they were. In z they are as they were on the tile city (wall-aligned: the wall plane is on the lot's line whatever stands under it). On the ladder maps (back-aligned: every back face on one line and the frontmost face on the lot's front line) a ground piece of another depth moves the floors and the roof of the block back or forward by up to 0.4 m: 21 of the 30 banded blocks on `01-first-light`, 18 of 27 on `09-shrine-circuit` and 19 of 32 on `64-the-whole-chain`. The metrics now count the banded ground rows (`shopsGlassed` and `dressPieces`, before and after): default tile city 139 and 878 to 145 and 884, `01-first-light` 172 and 1046 to 179 and 1052, `09-shrine-circuit` 184 and 1117 to 189 and 1121, `64-the-whole-chain` 242 and 1467 to 247 and 1472; the verdicts of R1 to R13 are as they were.
- **Info (055 F, 062 B)**: considered and not chosen: sinking each column by its own sill with the floors above following. That breaks the terrace's level window rows and roof line by up to 0.35 m from column to column.
- **Info (055 F, 062 B)**: what 062 closed. The 22 keys with no sill each have one (a per-key depth, a typed value) or a reason in `NO_STREET_DOOR`; the stoop houses `Building_House_09` to `_011` read their door floor at 0.639 m, sink no further than their stoop's lowest step (0.213 m) and take the concrete steps for the rest; and a mixed-sill terrace block has every door at the walk. The plinths of 16.8 on `Preset_10` and the garage are gone.
- **Open (waits for Josh's eye on ticket 062 criterion 11)**: nothing was seen in a browser by the builder. The eye check is the tile city on `cam=street`, `09-shrine-circuit` and `64-the-whole-chain`, looking for a shop door below the pavement, a plinth and a lifted shopfront whose sign or awning has come up against the first floor's window.

### 16.11 Fire escapes (ticket 058)

Where a fire escape's platforms stand against its block, and how they join. `escapes.ts` holds the measured numbers, the pure placement and the check, `dressing.ts` places the escape of a block (16.5 says which blocks get one), and `models3d.ts` draws it.

- **Decided (058, Josh 18 Nov 2026: "There are gaps on the fire escapes. Additionally, fire escapes should always be level with windows or else people can't get out of the building.")**: every fire escape, on the tile city and on the ladder maps, reads as one connected steel stair with a platform at each storey that a person can step out onto from a window. The rest of this section is the defaults the ticket chose to meet that (approved with "Approve 057, 058 and 059").
- **Default (058)**: one platform per storey. Every floor over the base gets exactly one, the top floor included. A platform's deck is at that floor's measured window sill (`WINDOW_SILL_M`) less `ESCAPE_DECK_BELOW_SILL_M`, within `ESCAPE_DECK_TOL_M`: a person steps out over the sill onto a deck no more than a hand's height lower. A floor piece's sill is the lowest point of the window openings on its front (the glass of its lowest window), one number per storey (three on a `Stack` piece). A piece with no measured sill takes its style's median (`sillOf`).
- **Default (058)**: one continuous run. The first piece (the tall landing, with the drop ladder), a middle piece for each storey between, and the top piece. Pieces are placed by their measured deck and flight heights (`ESCAPE_GEOMETRY`), never by their bounds. A piece's bound runs from its lowest leg to its highest rail, so stacking by bounds (3.802 and 3.609 m against a 3.0 m storey, ticket 052) left each platform higher than its floor by 0.80 m and then 1.41 m, left each flight short of the deck above, and left the top storey of a four-storey block with no platform. A flight rises exactly one storey, from the surface of its own deck to the surface of the deck above, so a piece is scaled in y about its base until its flight's top meets the deck above within `ESCAPE_JOINT_TOL_M`, and shifted in x until the flight arrives at the hatch in that deck. The flights then stand one over the other, the first landing 1.08 m to one side of them, 4.84 m across in all, centred on its 5 m column.
- **Default (058)**: the drop ladder reaches the walk. The first piece's ladder starts 0.099 m above the piece's base, which put its foot 3 m in the air. Boxes run from the walk (y 0 of the lot frame) up to the pack ladder's foot: two rails `LADDER_RAIL_M` thick and rungs `LADDER_RUNG_M` thick every `LADDER_RUNG_PITCH_M`, in the escape's dark steel, within `ESCAPE_GROUND_TOL_M` of the walk. A real drop ladder hangs about 2.5 m up; this one touches down, because a ladder that ends in the air reads as a gap.
- **Default (058)**: when the pack's piece does not fit. A piece is scaled in y only within `ESCAPE_SCALE_Y` (steeper or shallower stairs still read as stairs). Outside that range, or when any of the three pieces is missing from the manifest or flagged scale-suspect, the escape is drawn in code (`codeEscape`): a deck of three slabs round a hatch, a rail and four posts, a flight of two stringers with treads between decks, and the ladder, as one piece with the key `CODE_ESCAPE_KEY` and the sizes of `CODE_ESCAPE`. A style is never skipped, so R7's count stays. With nothing loaded at all (no City Pack) there is no dressing, escapes included. On today's City Pack no piece is scaled: the three apartment styles' storeys are all 3.0 m and each style's sill is the same on every storey, so every scale is 1.
- **Default (058, 061)**: eligibility is 052's: an apartment block of at least `ESCAPE_MIN_BAYS` columns and two floors, a mid column that is not a door or corner column and has a roof piece. Which column is unchanged. Which blocks get one is no longer a per-block chance (see the next rules).
- **Decided (061, Josh 18 Nov 2026: "Yes, cut it (Recommended)")**: the share of fire escapes is guaranteed, not left to chance. This replaces 052's escape chance (0.6, a coin toss per block), which left R7 at 0.43 to 0.50 on the tile city and 0.53 to 0.58 on the ladder, moving in ninths with nine blocks, and made 057 F try several hash keys in `blockLens` to keep every seed over the floor.
- **Default (061)**: how many. For each map, exactly `ceil(share x qualifying)` blocks get an escape. `qualifying` is R7's count (`citymetrics.ts`: an apartment style with at least `ESCAPE_MIN_BAYS` columns and two floors over the base). `share` is the map's R7 floor, which the caller passes: `ESCAPE_SHARE_LADDER` (0.5, `CITY_CHECK.R7`) on the ladder, `TILE_CITY_R7_MIN` (0.4) on the tile city (`cityApplyOptions`, `ApplyOptions.escapeShare`, `dressTown`'s `escapeShare`). The count never depends on a hash key or on how many blocks there are, only on the qualifying count. If Josh wants today's density back, the share is one constant each (for example 0.55 and 0.45).
- **Default (061)**: which blocks. `escapeBlocks` (`escapes.ts`, pure) runs first in `dressTown`, on the blocks that can host one (the eligibility above, and the escape fits its storeys and the kerb: a probe of `dressBlock` that stops after the escape). They are ranked by `stableHash(lot.key + "escape")`; escapes go in rank order, skipping a block when the block before or after it in its run already has one (so no two neighbouring blocks of a run both have one, as before; a block that cannot host breaks the run). If that stops short of the target, each run that holds fewer than ceil(k / 2) of its k hostable blocks in a row is re-laid alternating (first, third, fifth, from its better-ranked end), best-ranked run first, until the target is met; a surplus is trimmed from the worst-ranked end. The target can always be met at a share of 0.5 or less: k hostable blocks in a row hold ceil(k / 2), and those sum to at least ceil(qualifying / 2) when every qualifying block can host.
- **Default (061)**: a shortfall is reported, not hidden. If fewer blocks can host than the target needs, every hostable block the neighbour rule allows gets one and `escapeBlocks` returns the rest as `escapeShort`; the tests name it and R7's check fails on such a map.
- **Default (061)**: chosen escapes are placed before the rest. A chosen block's escape takes its column's room first against `DRESS_PER_BAY_MAX` (it still joins the block's pieces where it did), and a chosen block keeps its escape past `DRESS_MAX` (the cap is on the rest of the dressing). A block dressed alone (`dressStack`) counts as chosen. How an escape is built (058) is unchanged.
- **Info (061)**: what changed on the ladder. Which blocks have an escape changes on the three maps, which is the intended change; R7 there is ceil(0.5 x qualifying) / qualifying (0.508 on 01-first-light) where chance gave 0.53 to 0.58. With and without its escape, a block differs only in its escape pieces and its escape column's pieces. The tile city's R7 is ceil(0.4 x qualifying) / qualifying (0.400 to 0.415 on the seeds checked), at its floor by construction, and `blockLens`' key (057 F) no longer matters to R7. Playtest snapshots are not affected: the harness replays the puzzle grid, not the 3D dressing.
- **Default (058, a change to a 052 default)**: the column cap counts an escape by its old piece count. The ticket's criteria 3 (a platform, so a piece, on every storey) and 7 (every other piece of dressing unchanged on the three maps) cannot both hold under 052's cap of `DRESS_PER_BAY_MAX` pieces per column: a block of four or five storeys has one piece more than 052's stacking by bounds used, and the column's small roof props would be dropped to make room. So against the cap an escape counts the pieces 052 used (the tall landing, a middle piece while it and the top still fit under the roof, the top piece), and nothing else on the block moves. The cost is that the escape column of a four or five storey block draws 7 pieces where `DRESS_PER_BAY_MAX` is 6. A code-drawn escape counts as one.
- **Info (058)**: what was measured, from `city-pack.glb` of 18 Nov 2026, in metres in the piece's own centred frame (y up, x along the road). The deck is the largest upward-facing horizontal surface; the flight is the run of tread faces (small, narrow and deep, above the deck), its foot the deck's surface and its top the highest vertex over the treads (the stringer's end, level with the deck above); the ladder is whatever stands past the deck's front edge; a hatch is the hole in the deck where a flight from below arrives. Every flight rises 3.000 m, the storey pitch of every apartment style.

| Piece | Deck top | Flight foot to top | Flight x, foot to top | Hatch x | Ladder foot | Rail top |
| --- | --- | --- | --- | --- | --- | --- |
| `SM_Bld_FireEscape_01` (top) | 0.609 | none | none | -0.939 | none | 1.492 |
| `SM_Bld_FireEscape_02` (middle) | 0.609 | 0.609 to 3.609 | 0.867 to -0.939 | -0.939 | none | 1.492 |
| `SM_Bld_FireEscape_03` (first landing) | 0.609 | 0.609 to 3.609 | -0.215 to -2.02 | none | 0.099 | 1.492 |

- **Info (058)**: the window sills, from the front-facing planes of each floor piece of at least `SILL_MIN_AREA_M2`, cut where they stop overlapping along x. A cut piece is window glass when no deeper piece stands over any of its x extent (a window's frame and reveal stand in front of its glass; the wall and a pilaster in front of both), so a shallower window beside a deeper one still counts. The sill of a storey is the lowest point of the glass in that 3 m band (`measureSills`), the lowest window opening of the front. Where each style's first piece then stands: a piece's deck is 0.609 m over its base, so the base is the floor's start plus the sill less 0.15 less 0.609.

| Style | Sill over the floor | Deck over the floor | First piece's base against its floor |
| --- | --- | --- | --- |
| apartment 01 | 0.756 | 0.606 | 0.003 m under |
| apartment 02 | 0.417 | 0.267 | 0.342 m under (its legs hang in front of the shop's top) |
| apartment 03 | 0.517 | 0.367 | 0.242 m under |

- **Info (058)**: the check (`escapeCheck`, pure, run by `escapes.test.ts` on the default tile city, seeds 1 to 10 at 3 x 3, and the three maps of 16.8) reports per escape the worst deck-to-sill offset, the worst flight joint (a flight top's height from the deck above and its x from that deck's hatch), the height of the ladder's foot above the walk, and the storeys with no platform. It passes when none is missing, every deck is within `ESCAPE_DECK_TOL_M`, every joint within `ESCAPE_JOINT_TOL_M` and the foot within `ESCAPE_GROUND_TOL_M`. It fails on the placement of ticket 052 (decks 0.80 and 1.41 m up, a storey missing), on a flight 0.1 m short, and on a ladder foot 0.5 m up.
- **Info (058)**: what changed. Only the escape pieces and how they are drawn: the pieces of every other kind of dressing, `packTown`, the furniture and `evaluateCity` are as they were on the three maps, and so is every block that has an escape, so R7 is as it was (0.404 to 0.500 on the tile city against its floor of 0.4, 0.529 to 0.580 on the three maps against 0.5). The code-drawn boxes are one InstancedMesh for the whole town, hung under the first landing's mesh in the dressing group.
- **Open (waits for Josh's eye on the street views of ticket 058 criterion 9)**: that every platform is just under a window sill, no flight ends in mid air, the ladder reaches the pavement and the top floor has its platform. Nothing here was seen in a browser by its builder.
- **Default (058)**: Apartment_03 has a wide central window (1.72 m, sill 0.517) and two narrow side windows (0.49 m each, sill 0.854). The deck is under the lowest, the central window's sill, 0.15 m, which puts it 0.49 m under the side windows' sills: a person still climbs out of those, and the slab never crosses the bottom of the style's biggest window.
- **Open (waits for a ticket that may edit the gallery)**: the stack gallery's `&dress=1` draws the pack's pieces, scaled, but not the code-drawn boxes (the ladder's last metres, a code-drawn escape): its dressing group is built in `gallery.ts`, outside ticket 058's files.

### 16.12 The testing daylight (dev only)

- **Decided (060, Josh 18 Nov 2026: "please create a day light mode so it's easy to see")**: the 3D view gets a day mode for judging the city by eye.
- **Decided (060, Josh 18 Nov 2026: "the purpose of the day mode is for testing")**: it is a developer testing aid, not a game lighting feature. It is dev only (behind `import.meta.env.DEV`, absent from `npm run build`), ships no toggle to players, changes no puzzle map's look unless `light=day` is asked in a dev build, and leaves the game's night look of chapter 11 unchanged. It is a tool for the eye checks of 16.8.
- **Default (060)**: two modes, one owner. `LIGHT_MODES` in `lighting.ts` is a pure table of both modes; `lightrig.ts` is the only code that adds or removes a scene's global lights, background and fog, or sets a renderer's tone mapping and exposure. `scene.ts` and `buildCityScene` ask it for night, `streetcam.ts` and the tile view add no light of their own, and a test reads the source to hold this. Two views keep lights of their own: the building gallery (`gallery.ts`) and the tile sheet. A lamp's point light, glow and pool stay with their owner (`scene.ts`) and are switched by one rig flag.
- **Default (060)**: night is today's, value for value: the background, the ambient light, the moon, no tone mapping, no fog, no shadows, and the code-drawn surfaces `GROUND`, `YARD`, `STREET`, `PAVEMENT` and `KERB` (chapter 11). A test holds the three protocol maps' lights, background and every material colour equal to a snapshot taken before the rig existed.
- **Default (060)**: day is a flat sky (no gradient, no fog), a soft sun from the south-east at a fixed elevation (key light, azimuth 135 degrees, elevation 55), a strong even fill (a hemisphere light, no ambient and no moon) so shaded faces keep their detail, and filmic tone mapping at exposure 1, set and restored by the rig. The code-drawn surfaces take their day colours from `LIGHT_MODES` (ground, yard, street, pavement, kerb and 057's grass) and return to night's exactly. The packs' textures are unchanged. In day the lamps' lights are at 0 and their glows, pools and flares are hidden. Values are in the Numbers table.
- **Default (060)**: shadows are off in both modes. The rig has a `shadows` switch, off in both, which a later ticket can turn on for the tile city only.
- **Open (waits for Josh asking for shadows, and a measured draw-call count on the default tile city)**: sun shadows (`&shadows=1`, dev only). They cost about one extra pass over every building and Josh's PC froze under load on 17 Nov 2026, so the opt-in is not built.
- **Default (060)**: switching, all dev only. The URL flag is `light=day` or `light=night` (anything else is ignored). In the tile view the L key and a small "Day / Night" button each flip the mode through the rig; both are removed with the view. The sheet has nothing to flip. The ladder maps have no key or button.
- **Default (060)**: what each view opens in. This replaces 055 Q9's night default for the tile view: Josh asked for day "so it's easy to see".

| View | Opens in |
| --- | --- |
| the tile city (`city=tiles`: overhead, street camera, fallback to overhead) | day; `light=night` opens night |
| the tile sheet (`sheet=1`) | its own lights, the same in both modes |
| a puzzle map, overhead or play | night; `light=day` gives day in a dev build only |
| a ladder map's street camera (`cam=street`) | night; `light=day` gives day in a dev build only |
| the building gallery | its own lights |

- **Info (060)**: the earlier dev-only daylight (055 E) added one hemisphere light to a night scene, owned twice (`tilecity3d.ts` and `streetcam.ts`), and left the sky and the surfaces near black. Its three constants (the street camera's daylight sky, ground and intensity) are retired with it; their rows are gone from the Numbers table.
- **Info (060, 057 D)**: the grass colour (`surfaces.grass` of each light mode, a Numbers row) was held for a drawer. Since 057 D the greens of the block interiors are drawn (19.4): the City Pack's `SM_Env_Grass_01` tiles, sunk 0.11 m so the blades stand a hair over the walk, or, where the piece is absent, flat quads in the mode's grass colour. The tile view brings a material it swaps in later (the pack's tiles arriving) to the mode it is in.
- **Info (060)**: brightness of a rendered frame is not tested headless; the table and the screenshots of 16.8 are the measure.

## 18. Parking

How many parking spaces the tile city (`city=tiles`) gives a home and a shop, which go on the street and which in lots, and the caps. The layout is in `tilecity.ts`, the checks P1 to P6 are in `parkmetrics.ts`, and the build-outs are drawn by `tilecity3d.ts` (ticket 056 A, B and C). Nothing on the ladder maps changes: the ladder's town (chapter 4) keeps its hash lots, and `town.ts` gained only the option that switches them off for the tile city.

- **Info (056)**: chapter 17 (ticket 055 D) does not exist yet. When it does, its parking paragraph defers to this chapter and says nothing that disagrees with it, and 055 D's check T6 ("parking on every block") is satisfied by P1 and P2 of 18.8.

### 18.1 Who parks where

- **Decided (056, Josh 18 Nov 2026, after looking at the tile city of 055 A to C)**: "Roads look good, parking spaces are overwhelming. Too many parking spaces. We should create rules in the style sheet that indicate how much parking should be available on the streets vs parking lots for residential and business style units."
- **Default (056)**: shoppers park at the kerb, residents park off the street.
  - A **shop** gets `PARK_PER_SHOP` (one third) short-stay kerbside bays, on its own block's sides.
  - A **home** gets `PARK_PER_HOME` (0.15) stalls in a parking lot, in its own block or across one street.
  - Residents never count on kerb bays, and shoppers never count on lot stalls.
- **Info (056)**: these are drawn spaces, about half of what a real dense terraced core provides. A real core has about 0.3 spaces per home, and about 1 per 40 m2 of shop, which here is about 0.7 per 31 m2 shop bay. The camera reads every drawn stall at full size, and Josh found the full count overwhelming.
- **Info (056, Josh 18 Nov 2026, "I approve one through three")**: Josh approved ticket 056 with its six open questions at their defaults, so each default below stands as written: the ratios of 18.1 (the alternative, double both, is not taken); build-outs in the parking band (18.5); a space record for every lot stall as well as every bay (`TileCity.lotStalls`); no residents at the kerb; and a home of two column-floors (18.2).
- **Default (056, 057 C)**: from 057 on, a block's lots are interior courts in place of frontage lots (19.4), where each court fits. The quota of 18.4 and every check stay, and chapter 19 takes over the placement. This replaces 056 Q3's answer (rear courts: no), which Josh approved with the others at their defaults before he gave the 057 rulings.

### 18.2 Units

- **Default (056)**: units are counted per block from the nominal terrace lots of its finished rows (after the parking lots took their frontage), so the layout can place parking before anything is packed. `TileBlock.units` holds them.
  - Columns are the lots' 5.2 m bays.
  - Shops are the columns minus one door column per terrace lot.
  - Homes are floor(columns x `UNIT_FLOORS_NOMINAL` / `HOME_COLUMN_FLOORS`): a home is two column-floors (2 x 5.2 m x 6 m, about 62 m2), and a block's upper floors are nominally 3 over the base.
  - A shop is one ground bay that is a shop or a shop corner (the `groundRow` kinds of `citymetrics.ts`); the two-column shop counts once.
- **Default (056)**: the layout's numbers stay within 10% of the packed plan's. The test packs the fixture stacks and compares the city-wide shop count and the homes (column-floors over `HOME_COLUMN_FLOORS`) with the layout's sums, on the default city and seeds 1 to 10 at 3 x 3.
- **Info (056, measured 18 Nov 2026 on the merged layout; the test, not this line, is the record)**: the default city packs 95 stacks of 255 columns and 775 column-floors, 3.04 floors over the base on average. The layout counts 255 columns, 160 shops (the plan has 152, 5% under) and 379 homes (the plan has 387.5, 2% over). Per block that is 15 to 21 shops and 34 to 49 homes. Seeds 1 to 10 at 3 x 3 have 255 to 285 columns, 160 to 180 shops and 379 to 424 homes.

### 18.3 Kerbside bays (shoppers)

- **Default (056)**: a block's quota is `max(BAY_TILES_PER_BLOCK_MIN, round(shops x PARK_PER_SHOP / BAYS_PER_PARKING_TILE))` `ParkingLines_01` tiles, each of `BAYS_PER_PARKING_TILE` bays (10 m of kerb). That is one to three tiles per block, three to nine bays.
- **Default (056)**: where the bays go.
  - They go on the block's own sides that have a parking band: the hash side of a street (and, before 063 B, both sides of an avenue: the tile city has no avenue now).
  - Avenue sides fill first, then longer sides, with ties by id. With no avenue (063 B) that is the longer sides first.
  - The fill is round-robin: one run per side before any side takes a second.
  - A run is centred on its side's free stretch, offset by hash.
- **Default (056)**: run and gap limits.
  - A run is at most `BAY_RUN_TILES_MAX` tiles (20 m, 6 bays).
  - Two runs on one side have at least `KERB_GAP_MIN_M` of kerb without bays between them.
  - The `BAY_JUNCTION_CLEAR` cell next to each crossing never holds a bay, and neither does the cell in front of a kerb cut.
- **Default (056)**: caps.
  - A side's bay length is at most `KERB_BAY_SHARE_MAX` of its kerb: the first field for an avenue, the second for a street. Every street is a street since 063 B, so the first field is unused.
  - The city has at most `BAYS_PER_100M_MAX` bays per 100 m of block kerb.
- **Default (056)**: the outer side of an edge street faces yard. It holds no bay, and its parking band is plain.

### 18.4 Lots (residents)

- **Default (056)**: a block wants `clamp(round(homes x PARK_PER_HOME / LOT_STALLS), 1, LOTS_PER_BLOCK_MAX)` parking lots. `LOT_STALLS` is twice `BAYS_PER_PARKING_TILE`: a lot is two `ParkingLines_01` tiles. From 057 C each lot is the mouth of a residents' court inside the block (19.4), and an alley block's own court answers one of its lots (19.6).
- **Default (056)**: every lot is placed by demand, through the lot runs of 055 B. The terrace fill's hash lot (`PARKING_ONE_IN`, chapter 4) is switched off in the tile city (`parkByHash` false in the terrace options; the ladder's town keeps it).
- **Default (056, 057 C)**: a lot's 10 m opening in the row stays on the tile grid with a kerb cut (055 B), and the cut's parking cells stay plain asphalt so cars can turn in. From 057 C the opening is the court's drive, and the lot's stalls are in the court behind it (19.4); a lot whose court does not fit keeps 056's 10 x 10 m frontage lot. A run shorter than `TILE_PARK_MIN_RUN_M` cannot hold a lot.
- **Default (056, 057 C)**: every lot stall is a record, so a later cars ticket has every space: `TileCity.lotStalls` holds `LOT_STALLS` per lot (from 057 C, per court) in the same shape as a kerb bay.
- **Info (057 C)**: the court's drive is as wide as 056's lot, so the frontage that parking lots cost stays about 90 m of the 1,800 m; the saving of about 45 m that the 057 draft counted would need a one-cell drive (19.4).

### 18.5 The parking band without bays

- **Default (056)**: a parking-band cell that holds no bay and is not in front of a kerb cut becomes a **build-out**: pavement level, a sidewalk tile (the role `buildout`, the one plain straight `Straight_02` the pavement uses, 063 A), with a street tree on every `BUILDOUT_TREE_EVERY`th build-out cell along a stretch, which is one every 10 m.
  - The kerb follows the build-out's edge.
  - A build-out next to a crossing is the classic corner bulb-out, and it shortens the crossing.
  - No tree stands on a cell next to a crossing.
  - In front of a kerb cut the cell stays `parkingPlain`, and so does every cell on an edge street's outer side.
- **Info (056)**: so every parking-band cell is exactly one of three things: half of a `ParkingLines_01` tile, `parkingPlain` (in front of a kerb cut, or on an outer side), or a build-out. Check P5 measures it. Pole slots do not move.

### 18.6 Too little, too much

- **Default (056)**: too little room for lots. This is a block where no run of at least `TILE_PARK_MIN_RUN_M` can take a lot.
  - Its lot quota moves to the neighbour across its longest street, up to that neighbour's `LOTS_PER_BLOCK_MAX`.
  - If no neighbour can take it, the shortfall is recorded on the block (`TileBlock.parkingShort`).
  - At most one block in nine (`ceil(blocks / 9)`) may be short.
- **Default (056)**: too little room for bays. This is a block with no parking side, or one where every side is at its cap.
  - Its shoppers' bays go in the parking band across its longest street, and are recorded as serving it (`ParkingBay.serves`).
  - Each run there still obeys 18.3's limits.
- **Default (056)**: too much. Bays past a block's quota, or past a cap, are never laid, and their cells are build-outs. A block never holds more than `LOTS_PER_BLOCK_MAX` lots, its own and borrowed together.

### 18.7 The tile city's R6 floor

- **Decided (056, Josh 18 Nov 2026, "Lower it to 0.45 (Recommended)")**: R6 (the share of shop bays with a sign, 16.8) has a floor of `TILE_CITY_R6_MIN` on the tile city, as R7 has its own. The ladder's `CITY_CHECK` and `citymetrics.ts` are unchanged (R6 stays 0.5 there).
- **Info (056 B)**: R6 sits at 0.49 to 0.55 on the tile city whatever the layout, by the dressing's own sign chance. The floor lets a later layout change pass without a re-tune, so the lot-run salt that 056 A had tuned to hold R6 at 0.5 is gone.

### 18.8 The checks, and what they measured

- **Default (056)**: `parkingMetrics(city)` measures a tile city from its cells, bays, lot stalls and blocks (never from the code that laid them), and `evaluateParking(m)` gives one verdict per check, as `evaluateCity` does for the buildings. `PARK_CHECK` holds what each allows: 0 violations, and for P6 the most bays per 100 m of block kerb.

| Check | What it holds |
| --- | --- |
| P1 | shoppers at the kerb: city kerb bays within `PARK_SUPPLY_BAND` x shops x `PARK_PER_SHOP` (the first field is the floor, the second the ceiling), every block with at least `BAY_TILES_PER_BLOCK_MIN` tiles serving it, its own or across one street |
| P2 | residents in lots: city lot stalls within `PARK_SUPPLY_BAND` x homes x `PARK_PER_HOME`; every block has a lot or a neighbour's across one street; none has more than `LOTS_PER_BLOCK_MAX`; at most ceil(blocks / 9) blocks are short |
| P3 | kerb share: every side within its profile's `KERB_BAY_SHARE_MAX`, and no bay on an outer side |
| P4 | runs: every run at most `BAY_RUN_TILES_MAX` tiles, every gap between runs on a side at least `KERB_GAP_MIN_M`, no bay in a cell next to a crossing |
| P5 | the band: the three-way rule of 18.5, and the tree pitch |
| P6 | not overwhelming: bays per 100 m of block kerb at most `BAYS_PER_100M_MAX` |

- **Default (056)**: each check passes on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4 (`parkmetrics.test.ts`). P1, P2, P3, P4 and P6 fail on a city laid by 055's rule (every parking cell paired); P5 fails on a city with one build-out turned to `parkingPlain` away from any kerb cut.
- **Info (056, measured 18 Nov 2026 on the merged layout; the tests, not these lines, are the record)**: the default city (3 x 3, seed 1) under 055's rule (today, before 056) and under these rules. Today's column is `parkmetrics.test.ts`'s copy of 055's pairing laid on the same cells, so its units are the same.

| | Today (055's pairing, 3 bays per tile) | Under these rules |
| --- | --- | --- |
| `ParkingLines_01` tiles | 122 | 18 |
| Kerb bays | 366 | 54 |
| Bays on the outer side of an edge street, facing yard and serving nobody | 66 | 0 |
| Bays per block (the bays at its sides) | 30 to 39, mean 33 | 6 for every block (2 tiles) |
| Block kerb, both sides of every street | 1,800 m | 1,800 m |
| Bays per 100 m of block kerb | 20.3 (one bay every 4.9 m) | 3.0 (cap 6) |
| Share of a side's kerb that is bay | 0.40 to 0.83 | 0.17 to 0.25 on the 18 sides that take a run; 0.10 over all the kerb (caps 0.4 and 0.3) |
| Longest run of bays | 5 tiles, 15 bays unbroken | 1 tile |
| Parking lots (10 x 10 m, 6 stalls each) | 3, so 18 stalls | 9, so 54 stalls |
| Units | 160 shops, 379 homes | the same |
| Shoppers' bays against demand (160 shops x 1/3 = 53) | 366, 6.9 times too many | 54 |
| Residents' stalls against demand (379 homes x 0.15 = 57) | 18, 0.32 of it | 54, 0.95 of it |
| Total spaces | 384, 95% at the kerb | 108, half at the kerb and half in lots: 72% fewer |
| Spaces per unit (539 units) | 0.71 | 0.20 |
| Lot frontage | 30 m | 90 m of the 1,800 m |
| Build-out cells, and their trees | 0 | 226 cells with 82 trees (plus 68 plain cells in front of kerb cuts and on outer sides) |

- **Info (056, measured 18 Nov 2026)**: the ranges over seeds 1 to 10 at 3 x 3, then seeds 1 to 3 at 6 x 4, under these rules:
  - 3 x 3: 18 or 19 tiles, 54 to 57 bays, 9 lots with 54 stalls, 2.9 to 3.1 bays per 100 m of block kerb, 1 to 3 tiles of bays per block, no side over 0.40 of its kerb, no bay on an outer side, no short block, 196 to 247 build-outs with 73 to 98 trees. Today's rule laid 110 to 132 tiles, 330 to 396 bays (66 to 78 of them outer), 18.0 to 21.0 bays per 100 m, and 18 stalls.
  - 6 x 4: 46 to 51 tiles, 138 to 153 bays, 23 or 24 lots with 138 to 144 stalls (one block short in one seed, within the one in nine allowed), 3.0 to 3.1 bays per 100 m. Today's rule laid 248 to 290 tiles, 744 to 870 bays and 18 stalls.
  - Per block both sizes hold about 42 homes and 18 shops, so the 6 x 4 city lands where the 3 x 3 does: one to three tiles of bays and one lot per block.
- **Info (057 E, measured 19 Nov 2026)**: the two tables above were measured on 056's layout, with block sides of 40 to 60 m. Since 057 F the blocks are 30 to 80 m and 057 G's alleys and parks change the blocks' quotas. On the default city (3 x 3, seed 1) the layout now has 57 bays and 11 courts with 66 court stalls (two blocks ask two lots, seven ask one), and no block keeps a frontage lot. P1 to P6 still pass on it (`parkmetrics.test.ts`); the tests, not these lines, are the record.

- **Info (063 B, measured 19 Nov 2026 with the avenues out; the tests, not these lines, are the record)**: what moved on the default city (3 x 3, seed 1), 063 A's layout against 063 B's.
  - The city is 51 x 57 cells (255 x 285 m), was 53 x 58. The nine blocks are the same sizes.
  - Kerb bays are 57 against 57 (demand 57), court stalls 66 against 66 (demand 60.15), P6 2.794 against 2.794. Build-outs fall from 259 to 158 cells and their trees from 105 to 64, because an avenue's second parking band was almost all build-out; the pole slots are 227 against 227.
  - Junction cells are 144 (16 boxes of 3 x 3), were 182; crossing cells 192, were 216.
  - Across 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 3, P1 to P6 all pass (kerb bays 51 to 66 against a demand of 49 to 68 at 3 x 3, and 150 to 165 against 154 to 167 at 6 x 4), with no threshold changed. `PARK_SUPPLY_BAND` is unchanged.
- **Info (063 B, measured 19 Nov 2026, before at e23a494 and after)**: the tile city's R-checks hold on the default city and the seeds, at their tile floors (R1 `TILE_CITY_R1_MIN` 0.88, R6 `TILE_CITY_R6_MIN` 0.45, R7 `TILE_CITY_R7_MIN` 0.4).
  - Default city: R1 0.897 before, 0.899 after; R6 0.529 and 0.520; R7 0.509 and 0.509. Its nine blocks are 14 x 13, 11 x 13, 6 x 13, 14 x 9, 11 x 9, 6 x 9, 14 x 15, 11 x 15 and 6 x 15 cells before and after: no block moves in size.
  - Over 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 3: R1 0.897 to 0.916 (the same before), R6 0.491 to 0.557 (was 0.491 to 0.551), R7 0.500 to 0.509 (was 0.500 to 0.510).
  - Kerb bays and court stalls on the default city are 57 and 66 before and after. On 3 x 3 seeds 2, 5, 9 and 10 the bays fall by 3 (60 to 54, 57 to 54, 60 to 57, 54 to 51), and on 6 x 4 seeds 1 and 2 by 9 and 3 (159 to 150, 159 to 156), because a block's shop count follows a hash that reads cell coordinates and the demand moves with it; P1 to P6 pass.
- **Info (063 B)**: P1 is less robust without avenues, so the layout has a weakness the named cities do not show. An avenue gave a block a second parking band and a cap of 0.4. A street gives one band to each side of its two blocks, and a side of up to 12 cells (60 m) holds one tile (the 0.3 cap). A block with no parking side of its own asks the bands across its streets, and its neighbours may take their only tile first. P1 then fails by one block ("no tile of bays serves it"). Over seeds 1 to 20 it fails on 6 x 4 seeds 5, 7, 11, 12, 15, 16 and 18, and on 3 x 3 seeds 12, 15, 17, 18 and 19; before B it failed on 6 x 4 seed 18 only, and on no 3 x 3 seed. The cities the ticket names pass. A first tile for every block by matching (a re-cut of 056's allocator) would mend it; B did not touch the allocator.

## 19. Frontage and block interiors

How the tile city's buildings meet the pavement, how a row of them ends, what fills the inside of every block, and how blocks differ from one another (ticket 057, sections A to G, in `facade.ts`, `frontage.ts`, `tilecity.ts` and `terrace.ts`). The layout and the checks (G1 to G4, V1 to V4) are pure data and are built; the drawing of the interiors is section D (`tilecity3d.ts`, `tileslots.ts` and `models3d.ts`), also built, and 19.8 records it. Nothing on the ladder maps changes.

- **Info (057)**: the ladder keeps chapter 4's rules: back-aligned stacks, and a far end that closes at a seam or at an alley of `ALLEY_MIN_M` to `ALLEY_MAX_M`. Every new option of this chapter defaults to today. The two defaults that are not zero (`alignOf` in `terrace.ts`: "wall"; `farOverlapOf`: `END_OVERLAP_MAX_M`) follow from a run having a pavement `frame`, which every tile-city run has and no ladder run has, so a ladder stack, run and town are as they were.
- **Info (057)**: the draft of this chapter was written before sections A to G were built. Where the code differs from the draft, the line says "as built", and the code is the record.

### 19.1 The wall line

- **Decided (057, Josh 18 Nov 2026, after playing the tile city at `793bbf7`)**: "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
- **Default (057 A)**: in the tile city a terrace stack is aligned on its **wall plane**, not on its back faces (`TILE_STACK_ALIGN`, "wall"; the ladder keeps "back").
  - Each column's ground and floor pieces put their measured wall plane (`WALL_FRONT_M`: how far behind the piece's front bound its wall stands, read from the GLB per key) on the lot's front line, which is the pavement's back edge.
  - A street-level wall may stand up to `OVERLAP_MAX_M` onto the pavement, and none stands behind the edge (`RECESS_MAX_M`, with `FRONTAGE_TOL_M` of tolerance).
  - Sills, frames, cornices and signs may stand further out than the wall, by up to `WALL_REACH_M` (the same number, because the reach is what sets the limit).
  - The backs of the stacks are then ragged: each piece's back stands where its own depth puts it. They face the inside of the block, and 19.4 fills it.
- **Default (057 Q4)**: the overlap limit is 0.6 m. The first draft said 0.5 m, and it was raised after the 057 A review because the real City Pack shop pieces stand up to 0.557 m (`Shop_04`), 0.529 m (`Apartment_Door_01`) and 0.520 m (`Shop_06`) in front of their wall.
- **Info (057 A, as built; measured by 057 E on 19 Nov 2026 on the default city)**: with "wall" alignment every street-level wall plane stands exactly on the pavement's back edge (within 1e-15 m), so the walls rest on the edge and never behind it, and what overlaps the pavement is the pieces' own sills and signs: the furthest bound stands 0.557 m onto it, inside `OVERLAP_MAX_M`.
- **Info (057 A, as built)**: how `WALL_FRONT_M` was measured (`measureWallPlane`, run on the converted `city-pack.glb`).
  - The wall of a **ground** piece (a base, shop, door or corner) is the frontmost front-facing plane that reaches the ground (its lowest vertex at most `WALL_GROUND_Y_M` up), within `WALL_REACH_M` of the piece's front bound.
  - The wall of a **floor** piece is the largest front-facing plane within `WALL_FLOOR_REACH_M` of the bound, with no ground test: an office floor is set back on purpose.
  - A plane counts only from triangles below `WALL_BAND_M`, within `WALL_FACE_COS` of the face's direction, grouped when their centroids are within `WALL_PLANE_TOL_M`, and with an area of at least `WALL_MIN_AREA_M2`.
  - This replaced the draft's "largest front-facing planar area below 3.5 m", which picked the back wall of a shop's interior (1.0 to 2.8 m behind the front) or a sign band.
  - `WALL_SIDE_M` is the same for a corner piece's open side. A roof has no wall and no entry, and its pieces align on their front bound. A front that Josh recalibrated in the gallery makes a key's entry not apply (`wallOffset` gives 0), so that piece also aligns on its bound.
- **Info (057 A)**: `facade.test.ts` pins every value of both tables as a typed-in fixture and, where the converted GLB is on the machine, re-measures each key within 0.02 m. The tables hold a distance per piece, so the Numbers table pins their constants and not their entries.
- **Default (057 D)**: `SM_Bld_OfficeOctagon_Base_01` is pinned by hand to its 0.174 m face (`WALL_OCTAGON_BASE_M`, in `WALL_FRONT_M`), before any office style is aligned on "wall". The rule of 19.1 finds two ground planes on its front, 0.174 m behind the bound (4.87 m2) and 0.595 m behind it (5.01 m2), and picks the bigger, which stands 0.42 m further back; the 057 A review took the 0.174 m plane for the building's face. `WALL_PINNED` lists the keys pinned this way, and `facade.test.ts` checks in the converted GLB that both planes are there and that the table holds the front one. No tile-city run uses an office style yet.
- **Default (057 D)**: the tile city passes "wall" to `packTown` explicitly (`TILE_STACK_ALIGN`, through the scene options of `models3d.ts`), so it does not lean on the default that `alignOf` reads from the runs' pavement frame. `packpin.test.ts` pins `packTown` on the three protocol maps by a digest, taken at the merge of 057 G, so the ladder's "unchanged" is checked on every run and not only at review.

### 19.2 Corners and far ends

- **Default (057 B)**: this re-cuts Josh's earlier "Keep the inset" (055 design item 8), because his words above forbid the strip it leaves.
  - Every row's first block stands **flush** with its corner: the inset is `TILE_ROW_INSET_M` (0), and the corner block's flank meets the cross street's pavement. 055 B's inset function and its 2.5 m cap are gone.
  - Every first lot keeps its `cornerSides`, so the Decided corner rule of chapter 7 holds.
  - The leftover length goes to the row's far end, which closes in one of three ways, tried in this order.
    1. A **seam**: a gap of at most `TERRACE_SEAM_M`.
    2. An **overshoot**: one more column when that ends at most `END_OVERLAP_MAX_M` inside the next row's corner block, where the two walls meet and nothing shows. It applies only where the far wall is a real corner block (the packer's `farOverlap_m`; `farOverlapOf` gives `END_OVERLAP_MAX_M` to a run with a frame and 0 to a ladder run).
    3. A **gated passage**: whatever gap is left, from `PASSAGE_W_M`'s first number (1.0 m) to its second (one column, 5.3 m), closed at the wall line by a gate and posts. The passage leads to the interior (19.4).
- **Default (057 B)**: nothing else is allowed. Every metre of a block side's pavement back edge is one of a building wall, a corner flank, a seam, a gated passage, or a deliberate opening: a parking lot or a plaza, a court's drive (with its kerb cut where cars cross), or an alley's one-cell mouth (19.6). A side that is the rear of a block part (beside an alley) is not a frontage and is not held to this.
- **Default (057 B)**: this replaces, for the tile city only, 055's far-gap share ("seam or alley on at least the ladder's share"), and retires 056 A's temporary far-gap floors. The run after a parking lot or a court drive closes like any other run.
- **Info (057 B, as built; measured by 057 E on 19 Nov 2026)**: passages are not the rare third choice the draft pictured, because most row lengths fall in the packer's dead band (N unscaled columns span only 5.0 N to about 5.28 N metres) and a seam needs a gap of 0.1 m or less. On the default city, 52 runs close as 50 passages and 2 overshoots (0.415 m at most), with no seam, no slit and no wide gap; seeds 1 to 5 at 3 x 3 close 44 to 52 runs as 44 to 50 passages and 2 to 4 overshoots; 6 x 4, seed 1 closes 138 runs as 130 passages and 8 overshoots. So nearly every row's end is a gate onto the interior.
- **Info (057 B and C, as built)**: the passages are known only once the runs are packed, so `tileCity` returns none and `withPassages(city, tilePassages(city, packed))` is the city with them. Each is `{ x_m, z_m, w_m, yaw, run, floor }`. The `floor` is apron pavement, `PASSAGE_FLOOR_DEPTH_M` (one cell) deep from the back edge inward and the passage wide: nothing else in the city lays a surface on that ground, and G3 credits only what is recorded there.
- **Default (057 D)**: the gate. Each gated passage has a gate at its wall line, built in code from boxes: a post at each side (`GATE_POST_W_M` wide, `GATE_POST_EXTRA_H_M` taller than the gate) and a panel between them, `GATE_H_M` high and `GATE_THICK_M` thick, standing on the walk, in one fixed dark brown (`GATE_COLOUR`, not a lit surface, so it reads in both light modes). A passage too narrow for two posts is one panel. A passage that opens on an alley's mouth (within `GATE_ALLEY_REACH_M` of the lane) gets the small gate, `GATE_SMALL_H_M` high.
  - As built, not as drafted: the gate is always code-drawn, so no Town Pack piece is placed (16.6), the run's colourway is not applied to it, and it is 2.2 m high, not one storey.
  - The passage's floor (`TilePassage.floor`, 19.2 above) is drawn in code as apron pavement.

### 19.3 Thinner blocks: considered, not the default

- **Info (057)**: blocks whose terraces butt back to back would be about 12 m deep, two stacks of 5.2 to 5.9 m. On the 5 m grid that is 15 m, with a 3 m service strip. With 25 to 30 m streets between them, roads would take about three quarters of the city along that axis. They already took about 65% of the area (about 105 m of street to 150 m of blocks per axis on the default city at `793bbf7`).
- **Info (063 B, re-measured 19 Nov 2026)**: with no avenues the default city has 100 m of street on each axis (was 105 m and 110 m), and streets take 60.5% of its area (was 62.7%, over 53 x 58 cells). Over seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4 the share is 55.2% to 62.6% (was 56.6% to 64.1%).
- **Default (057 Q2)**: keep blocks of the sizes of 19.5 and fill their interiors (19.4). Thinner blocks, with one axis of 15 m rowhouse blocks, are an alternative for a later ticket.

### 19.4 The block interior

- **Decided (057, Josh 18 Nov 2026)**: after "There are blank open areas where the buildings don't exist. Those need to be filled in with something. You could fill that with parking lots, parks, or you could have those squares of buildings be thinner so that the buildings are butted up right against each other.", he said: "Grass and pavement should fill the blank areas."
- **Default (057 C)**: nothing inside a block is left unfilled. `frontage.ts` rasterises each block at `VOID_RASTER_M` (0.25 m); at most `VOID_MAX_SHARE` of it may be unfilled, in no square over `VOID_PATCH_MAX_M` on a side (check G3).
- **Info (057 C, as built)**: the interior is laid on the 5 m grid (`TILE_M`). Ring 1, the outer band of cells, is the terraces' and is not an interior cell. The cells inside it are `TileCity.interior`, each with a role of `InteriorRole`: `apron`, `court`, `drive`, `green`, `greenPath`, and from 19.6 `alley` and `parkEdge`. The draft said `TileRole` would gain these; as built they are kept apart, because a court's drive and its first row of stalls are also the `lotSurface` cells of 056 and `tileslots.ts`'s table is exhaustive over `TileRole`.
- **Default (057 C)**: the interior is, in this order:
  1. **The rear apron (pavement).** Ring 2, the strip the terraces' backs stand over (`variant` `APRON_STRIP`, the plain slab `Sidewalk_01` like the rest of the apron since 063 D; a code quad only when the piece is missing), and `APRON_CELLS` more rings (1) of whole cells. This is a continuous paved apron round the inside of the block, joining the backs, the gated passages, the court drive and the court.
  2. **The residents' court**, which takes over 056's 18.4 (below), on the apron.
  3. **The green** is every other interior cell: grass.
     - A path one cell wide (`greenPath`) runs along the green's longer axis, and cross paths cut it wherever a row of green would run past `GREEN_SPAN_MAX_CELLS`, so the green never stretches further than that without a path.
     - Benches beside each path and trees on one green cell in `GREEN_TREE_ONE_IN` (by hash, at a cell's middle, a bench `BENCH_FROM_PATH_M` from its path's edge) are optional dressing, in `TileCity.greenProps`. Nothing else (no playground, fountain or hedge) is required.
  4. **Plazas** (055 B's corner plazas) stay as they are, on the street.
- **Default (057 C)**: the residents' court. A block's lot quota (056: 18.4) becomes interior courts in place of frontage lots.
  - A court unit is `COURT_CELLS` (2 x 3 cells, 10 m wide and 15 m deep): a row of three stalls (a `ParkingLines_01` tile), a 5 m aisle (`COURT_AISLE`) and a second row of stalls (`COURT_STALLS`), six stalls (`LOT_STALLS`). The aisle's two ends open on the apron beside the court, so a car reaches it over pavement.
  - It is reached by a **drive**: `DRIVE_CELLS` cells (2, 10 m) through the terrace row, with 056's kerb cut on the street and plain parking cells in front, laid by demand as 056 does.
  - `TileCity.courts` holds each court's cells, and `TileCity.lotStalls` (056) now lists the courts' stalls.
  - A lot whose court would leave its block part or cross another keeps 056's frontage lot, and its block is in `TileCity.frontLots`. At most `CITY_FRONT_LOT_BLOCKS_MAX` (one in nine) of a city's blocks may be there. Measured: none on the default city and on four of the five seeds at 3 x 3; one block on seed 5.
- **Default (057 Q3)**: 056's 0.15 stalls per home (`PARK_PER_HOME`) is kept, so six stalls per court and one or two courts per block.
- **Default (057 Q1)**: the apron is `APRON_CELLS` 1 deep, so the interiors are mostly pavement. If Josh finds them too grey, 0 drops the apron to the strip alone and gives about half the interior to grass: one constant.
- **Default (057 Q6, as built by 057 D)**: the fill uses the City Pack and code only, each with a code-drawn fallback: `SM_Env_Grass_01` for the greens, `SM_Env_Sidewalk_01` for the apron, paths and park edges, `SM_Env_Tree_01` to `_03` and `SM_Prop_ParkBench_01` for the dressing. The draft named `Sidewalk_Panel_01` for the paving, but that piece has a kerb on one edge (a 0.23 m drop to the road level every 5 m), which would cross an apron; 057 D drew `Sidewalk_Panel_02`, the flat slab with two inset service plates, and 063 D replaced it with the plain `Sidewalk_01` (19.8). No Town Pack piece is used: the passage gate is code-drawn (19.2).
- **Info (057 C, as built)**: the drive is two cells, not the drafted one. 056's parking lot is a fixed 10 m opening laid by `terraceBlockRows` in `town.ts`, which 057 may not touch, so the drive takes the whole opening. One cell needs a `parkW_m` option in `town.ts` (a re-cut). So the frontage does not gain the drafted 45 m: the nine 10 m lots of 056 are nine 10 m drives, and the frontage cost of the parking lots stays about 90 m.
- **Info (057 C and G, measured by 057 E on 19 Nov 2026)**: what the interiors are made of on the default city (3 x 3, seed 1), in m2 of block area (28,675 m2 in all). The remaining 8,225 m2 (28.7%) is the terrace band: buildings, plazas and frontage lots.

| Interior role | m2 | Share of interior |
| --- | --- | --- |
| `apron` | 11,225 | 54.9% |
| `court` | 1,650 | 8.1% |
| `drive` | 550 | 2.7% |
| `green` | 2,725 | 13.3% |
| `greenPath` | 1,375 | 6.7% |
| `parkEdge` | 1,800 | 8.8% |
| `alley` | 1,125 | 5.5% |
| All | 20,450 | 100% (71.3% of block area) |

- **Info (057 C, measured by 057 E)**: over seeds 1 to 5 at 3 x 3 and 6 x 4 seed 1, the interior is 70.7% to 73.1% of block area, grass is 12.0% to 14.5% of the interior (8.5% to 10.5% of block area), and pavement in all its roles is the rest. At most 0.28% of any block is unfilled, in squares of 0.25 m at most.
- **Default (057 D)**: every interior role is drawn (19.8).

### 19.5 Block variety: 90 degrees, not a grid of squares

- **Decided (057, Josh 18 Nov 2026)**: "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc"
- **Info (057 F)**: what `tilecity.ts` varied before: every street line ran the city's full length, each column of blocks took one width and each row one depth from 8 to 12 cells (40 to 60 m, nine footprints on the default city, one of them square), and one interior line in `AVENUE_ONE_IN` was an avenue. But every block in a column shared its width, the range was a 1.5 to 1 ratio at most, and no block was split, so it still read as a regular grid.
- **Default (057 F)**: a wider range, from `BLOCK_TILES` (a block side is 6 to 16 cells, 30 to 80 m).
  - Neighbouring lines on one axis differ by at least `BLOCK_STEP_MIN_CELLS` cells, by hash, and no size is repeated on an axis while a free one exists (with 11 sizes and at most 6 blocks, one does), so every column and every row is its own width.
  - Every street keeps its profile along its whole length (055 design item 3), because the lines stay straight and continuous: a block's size changes the spacing between lines, never a street's cross-section. Streets that end at a T-junction are not built (057 Q8; a later ticket could let an interior line stop and merge two blocks into one long one).
  - Alleys and parks (19.6) split or replace parts of blocks, so blocks in one column no longer look alike.
- **Default (057 F)**: block types by size (`TileBlock.type`, from `blockType`):

| Type | Both or one side | Constants |
| --- | --- | --- |
| small | both sides at most `BLOCK_SMALL_MAX_M` | 40 m |
| long | one side at least `BLOCK_LONG_MIN_M` and the other at most `BLOCK_LONG_SHORT_MAX_M` | 60 m and 45 m |
| large | both sides at least `BLOCK_LARGE_MIN_M` | 55 m |
| medium | the rest | |

- **Info (057 F, as built)**: the block draw has three rules the draft did not have. They are tuning choices, and they narrow the effective spread of the 6 to 16 cell range.
  - A block whose longer side is under 7 cells (35 m) is rejected, because the kerbside bays of 056 (P1) cannot be laid on a 6 x 6 block on streets.
  - The mean block size on each axis is at least `BLOCK_MEAN_MIN_CELLS` (10 cells, 50 m), because R1 was borderline (0.887 to 0.90) on cities of mostly short sides.
  - A draw that misses the variety rules (V1 and V2 of 19.7) or cannot be laid is redrawn by hash, at most `BLOCK_DRAWS_MAX` times; if every draw misses, a known-good layout is used (`BLOCK_FALLBACK_WIDTHS` and `BLOCK_FALLBACK_DEPTHS`, cut to the city's size; `alleys.test.ts` forces the miss).
  - The hash key `"width"` in `blockLens` was chosen among a few tried, because R7 (the tile city's fire-escape floor) is noise on the dressing's own escape chance and moves in ninths with nine blocks. Ticket 061 (R7 by rank, 16.11) made it a guarantee: R7 no longer depends on that key.
- **Info (057 F, measured by 057 E on 19 Nov 2026)**: on the default city the columns are 70, 55 and 30 m wide and the rows 65, 45 and 75 m deep: nine different footprints, none square, a coefficient of variation of 0.32 along x and 0.20 along z. On 6 x 4, seed 1, 24 blocks have 24 different footprints.

### 19.6 Alleys and parks

- **Default (057 G)**: an **alley** is a one-cell (`ALLEY_CELLS`, 5 m) service lane across a block, parallel to its short side, from street to street.
  - It enters through a one-cell gap in each row it crosses, with a kerb cut at each end and a plain parking cell in front of it, as a lot's cut has. The rows it crosses end flush on the lane. The gap is a deliberate opening under 19.2.
  - A block it splits is laid as two **parts** (`TileCity.parts`), each as a block of its own: its rows face the streets, and the side beside the alley is a rear (`TilePart.alleySide`), an apron and not a frontage. Quotas stay per street block, not per part (056 counts them on the block the alley splits).
  - The lane is the interior role `alley`. It is dressed as a lane: bins (`TileCity.alleyBins`) on the aprons beside it every `ALLEY_BIN_EVERY_M`, alternating sides, at `ALLEY_BIN_OFFSET_M` from its centre line, and never in the lane, in an end cell or on a court. No furniture stands in the lane.
  - Rear doors and rear fire escapes are not drawn: the City Pack has no rear-door piece, and fire escapes are 058's.
  - Each alley block's first court opens on its alley lane: a two-cell drive beside the lane, then stalls, an aisle and stalls, in the wider part of the split block. The part must be at least `ALLEY_COURT_PART_MIN_CELLS` wide and the lane at least `ALLEY_COURT_LANE_MIN_CELLS` long. This court's `run` is "" (it belongs to no terrace run), its `street` is `alley:<block>`, it has no kerb cut (the lane is its way in), and it answers one lot of the block's quota, so the street rows are asked for one less.
- **Default (057 G)**: alley rates.
  - Every **long** block, and every block with a side of `ALLEY_SIDE_LONG_M` (70 m) or more, gets one at its middle, if a side is at least `ALLEY_SIDE_MIN_CELLS` cells (45 m), so each part has room for a court.
  - Every city has at least one alley per `ALLEY_ONE_IN_BLOCKS` (4) blocks: where too few blocks qualify, the longest blocks take one, in id order.
- **Default (057 G)**: **parks**, under Josh's grass-and-pavement fill (19.4). The planner `planBlocks` chooses them from the blocks' own types and sides and the seed, so one size and seed give one city.
  - **Whole-block park:** a **small** block can become all green with crossing paths, benches, trees on one cell in `GREEN_TREE_ONE_IN`, and a pavement edge of `PARK_EDGE_CELLS` (the role `parkEdge`) round all four sides. It has no rows, so no units.
  - **Half-block park:** a **large** block whose short side is at least `PARK_HALF_SIDE_MIN_CELLS` can give half its short side, rounded down, on one long side to green. The other half is laid as a part of its own, whose park-facing row faces the park's pavement edge (`TilePart.parkSide`), so those buildings front the park. A park edge counts as a frontage where buildings face it.
  - Rate: at least one park per `PARK_ONE_IN_BLOCKS` (6) blocks. Small blocks go first, as whole parks by hash, then large blocks, as half parks, those with no claim to an alley first. A block never has both an alley and a park.
  - A park's green has a cross path as well wherever it is at least three cells each way, so its paths cross.
- **Info (057 G, as built)**: a whole-block park carries no units, but it still asks its neighbours across a street for a tile of kerb bays and one lot, as 056 serves any block with no side of its own that has room (`parkmetrics.ts` expects every street block to have both). A neighbour that cannot host leaves it unserved, which P2 allows for ceil(blocks / 9) blocks.
- **Default (057 G)**: the mix by type.

| Block type | Default treatment |
| --- | --- |
| small | terraces with the interior fill; a whole-block park by hash until the park quota is met |
| medium | terraces with the interior fill of 19.4 |
| long | terraces split by an alley |
| large | terraces with the interior fill, or half of it a park by hash until the quota is met; an alley if a side is at least `ALLEY_SIDE_LONG_M` |

- **Info (057 G, measured by 057 E on 19 Nov 2026)**: the default city has five alleys and two parks, both half-block (it has no small block: its narrowest, 30 x 45 m, has a side over 40 m); seeds 1 to 5 at 3 x 3 have 4 to 7 alleys and 2 parks; 6 x 4, seed 1 has 13 alleys and 4 parks, with 32 bins in all.
- **Default (057 D)**: the alley lanes and their bins, the park edges, the court cells whose run is "" and the small gate at an alley mouth are drawn (19.8).

### 19.7 The checks, and what they measured

- **Default (057)**: `frontageMetrics(city, packed)` measures a packed tile city from its cells, interior and packed stacks (never from the code that laid them), `evaluateFrontage(m)` gives a verdict per check (G1 to G4, against `FRONTAGE_CHECK`), and `blockVariety(city)` with `evaluateVariety(m)` gives V1 to V4 (against `VARIETY_CHECK`). Every check allows 0. Each holds on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4, and each fails on a fixture.

| Check | What it holds | Fails on |
| --- | --- | --- |
| G1, no recess | every street-level wall plane is between the pavement's back edge and `OVERLAP_MAX_M` onto it (no recess over `RECESS_MAX_M`, with `FRONTAGE_TOL_M`); a second, independently pinned table of the ground faces is read as well | the same city packed "back"-aligned |
| G2, no gap in the frontage | along every block side the back edge is covered by a wall, flank, seam, overshoot (within `END_OVERLAP_MAX_M`), gated passage, parking lot, plaza or court drive | the layout of `793bbf7` (today's insets and alleys) |
| G3, no void | each block rasterised at `VOID_RASTER_M`: at most `VOID_MAX_SHARE` unfilled, no square over `VOID_PATCH_MAX_M` | the layout of `793bbf7` (55 to 67% void) |
| G4, courts reached | every court touches a drive, every drive has its kerb cut (or opens on an alley lane), and every alley end has its kerb cut | a drive with its kerb cut removed |
| V1, block sizes vary | on each axis the sizes' coefficient of variation is at least `BLOCK_CV_MIN`, and the city has at least ceil(blocks / 2) distinct footprints | a uniform 10 x 10 cell grid |
| V2, not square | at least `BLOCK_NONSQUARE_MIN` of the blocks are not square | the same |
| V3, alleys | at least ceil(blocks / `ALLEY_ONE_IN_BLOCKS`) alleys, counted from the interior's `alley` cells | the same |
| V4, parks | at least ceil(blocks / `PARK_ONE_IN_BLOCKS`) parks, counted from the `parkEdge` cells | the same |

- **Decided (057, Josh 19 Nov 2026, "Tile-city R1 floor 0.88 (Recommended)")**: R1 (the frontage share, 16.8) has a floor of `TILE_CITY_R1_MIN` on the tile city, beside `TILE_CITY_R6_MIN` (0.45, 18.7) and `TILE_CITY_R7_MIN` (0.4). The alleys cut R1 to 0.897 to 0.903 on 3 x 3 cities against the ladder's 0.90, which stays in `CITY_CHECK` (`citymetrics.ts` is unchanged).
- **Info (057 E, measured on 19 Nov 2026, with the fixture stacks of `frontage.test.ts`, no browser)**: the default city (3 x 3, seed 1) before 057 (the architect's baseline of 18 Nov on `793bbf7`, bounds and not walls) and now (`goal/city-style` with 057 A, B, C, F and G merged). The tests, not these lines, are the record.

| | Before (`793bbf7`) | Now |
| --- | --- | --- |
| Street-level wall behind the pavement's back edge | up to 0.80 m, mean 0.26 m (by bounds; 11% of the frontage flush) | none: every wall plane on the edge; the furthest sill or sign 0.557 m onto the pavement |
| Corner inset at every block corner | 1.0 to 1.8 m, up to 2.5 m | 0 |
| How rows' far ends close | 81 to 85% a 1.0 to 1.5 m alley, 8 to 9% a seam, 5 to 9% a 1.5 to 4 m gap, 0 to 3% over 4 m | 50 of 52 gated passages and 2 overshoots (0.415 m at most); no seam, slit or wide gap |
| Uncovered stretches of a block side's back edge | many (the insets and far ends) | 0 of 46 sides |
| Empty yard in each block | 1,015 to 2,146 m2, 56 to 65% of the block | none: at most 0.28% of a block unfilled, in squares of 0.25 m at most |
| Blocks | 40 to 60 m each way, nine footprints, one square | 30 to 70 m by 45 to 75 m, nine footprints, none square |
| Alleys and parks | none | 5 alleys, 2 half-block parks |
| Residents' parking | 9 frontage lots, 54 stalls (056's layout on the old block sizes) | 11 courts with 66 stalls (the blocks' quotas on the new sizes), none on the frontage |

- **Info (057 E, measured on 19 Nov 2026)**: over seeds 1 to 5 at 3 x 3 and seed 1 at 6 x 4 every check above passes, every wall stands on the edge, 70.7% to 73.1% of block area is interior, 44 to 52 runs close as 44 to 50 passages and 2 to 4 overshoots at 3 x 3, and the frontage covers every block side. Seed 5 is the one city with a block that kept a frontage lot.

### 19.8 What the drawing does (ticket 057 D)

- **Default (057 D)**: `tilecity3d.ts` draws every interior role from `interiorItems` (`tileslots.ts`), one `InstancedMesh` per key and sub-mesh, in a group of its own beside the street tiles', with a code-drawn fallback per kind of surface when its key is absent (CI and a fresh checkout). Interior ground is at level 0, flush with the pavement's walk. It reads `TileCity.interior`, `courts`, `passages`, `greenProps` and `alleyBins` and nothing else, and takes no input.
  - **Grass:** `SM_Env_Grass_01` cells, turned a quarter at a time by hash so a lawn is not one tile repeated, with the origin 0.11 m down so the blades stand 0.01 m over the walk; or flat quads in `lighting.ts`'s `surfaces.grass` colour.
  - **Pavement** (the apron, the paths, the park edge, and since 063 D the ring-2 strip `APRON_STRIP`): `SM_Env_Sidewalk_01`, the plain flat slab, with its origin 0.01 m down so its top is the walk's; or flat quads in the slab's colour (`PAVING_SLAB_COLOUR`). **The passage floors** are the same slab, one whole 5 m cell at a time laid from the floor's low corner, and a part cell (under 5 m) is a code quad in the slab's own colour, `PAVING_SLAB_COLOUR` (`#8c8987`, sampled from the pack's atlas at the slab's walking faces by a test), so a floor drawn in code reads the same as one laid from the slab; nothing is scaled. A passage is 1.0 to 5.3 m wide, so nearly every real floor is a part cell. The code quad is not a light-rig surface key, so it takes the day and night light as the textured slab does.
  - **The court:** `SM_Env_Road_Bare_01` (the bare road) under the cells, with `SM_Env_Road_ParkingLines_01` over each row of stalls, lifted by `STALL_LINES_LIFT_M` so the two do not fight for the pixel; the aisle is bare road. With no lines piece the dividers are drawn in code. **The drive:** the kerb cut and lot surface of 056, which the street layer already draws, so it is not drawn twice; the drive's two cells are paved (below).
  - **The alley lane:** `SM_Env_Road_Bare_01`, or street-coloured quads, except its two mouth cells in ring 1, which are paved (below). **The gates** (19.2) are code-drawn.
  - **Props** (optional dressing, pack pieces only): the trees and the bench of the greens and the bins of the alleys (`SM_Prop_Trashbin_01` and `_02`), each chosen by a hash of the city's seed and its point, so the same city gives the same props. A prop whose piece is missing, or lost to the draw-call cap, is not drawn.
  - **Pad cells** beside an alley court's aisle are apron cells and are drawn as apron.
- **Default (057 D, changed by 063 D)**: the interior paving is one plain slab. `INTERIOR_KEYS` gives the apron, the paths, the park edge and the ring-2 strip the one key, `SM_Env_Sidewalk_01` (5 x 0.034 x 5 m, opaque, only the walk's slab and joint colours), and `PASSAGE_FLOOR_KEYS` is the same key. The strip and the floors were code-drawn flat quads in `PAVEMENT` colour, which read near-white in the sun, paler than the apron beyond; they are now the same tiles as the apron, with the code quad as their fallback only. The draw is one InstancedMesh for all of them, so the interiors take no more draw calls than before.
- **Default (057 D, changed by 063 H)**: the inlets are paved. A residents' court's drive (`TileCourt.drive`, the two ring-1 cells of a court that opens on a street) and the first and last cell of an alley's lane are `SM_Env_Sidewalk_01` at the walk, from the kerb cut to where the opening meets the interior, in place of the bare road (`inletCells` in `tileslots.ts`). The court's first row of stalls (ring 2) keeps the bare road and `ParkingLines_01`, the alley lane beyond ring 1 keeps the bare road, and a frontage lot of `TileCity.frontLots` and an alley block's own court (whose drive is beside the lane, not through a row) are not inlets and keep their asphalt. The kerb cut (`Sidewalk_Dip_01`) on the pavement band is unchanged, so the dropped kerb meets paving. `TileCity` is not changed: the street layer draws the drives (a `lotSurface` cell whose key is the slab when it is loaded, the bare road when it is not) and the interiors draw the alley mouths. The kerb's return along each side of the opening (063 F) is not drawn yet.
- **Default (057 D, changed by 063 F)**: the kerb line (`kerbLine` in `kerbline.ts`, pure) is one path per stretch of walk of each street side, from corner to corner, on the cell edges: the pavement band's carriageway edge; a flank at each end of a build-out stretch and the build-out's outer edge; and at each inlet (a kerb cut: a court drive or a frontage lot of `TileCity.frontLots`, 2 cells, or an alley's mouth, 1 cell; a gated passage has none) a return up the near side of the opening to the building line, the opening (no kerb), the return down the far side, and the dipped mouth (`Sidewalk_Dip_01`, as before) between the two. `tileKerbPlan` is what the drawing puts on it, from the finished city: each pack piece's own face at its measured inset (`KERB_FACES_M`), and the code strips. Every face is on the line within `KERB_TOL_M` in plan and `KERB_HEIGHT_TOL_M` in lip height, and no part of the line is uncovered for over `KERB_GAP_MAX_M`; a fallback strip for a pavement or build-out cell drawn in code stands on the same inset line (`KERB_INSET_M`), at the same lip height, so fallback and pack agree.
  - **The cells** (`tilecity.ts` lays them as bits of a pavement cell's `variant`, never on a grate): `PAVEMENT_RETURN_NEAR` on the pavement cell just before an inlet's first kerb-cut cell along its street and `PAVEMENT_RETURN_FAR` on the one just after its last, and `PAVEMENT_FLUSH` on a cell with a build-out in front of it. The return cell is the plain straight, with its own street kerb, and a code strip down its side edge from the street kerb face to the building line. `TILE_SLOTS` is unchanged. A return cell and a flush cell are never a grate, so the 1-in-6 grates are a little fewer; the pole slots are unchanged.
  - **The returns are the straight and a strip, not `Sidewalk_Dip_Corner_01`** (measured: a ramp, see chapter 10), and the strip is squared at the corner, not rounded: the pack's lip along the street edge runs on to the cell's edge and cannot be carved, so a rounded corner would stand beside a square one. The strip stands behind its face, on the walk side, so it is a 0.07 m ridge on the pavement and the 0.30 m kerb where it meets the road.
  - **Draw calls:** one more InstancedMesh, `tile:kerb-strips`, for every code strip (a city drawn wholly from the pack has them too, so it is not named as a cell's fallback); it counts in `TILE_DRAW_CALLS_MAX`. The slab's mesh also holds the flush cells.
- **Default (057 D)**: draw calls. The interiors have their own cap, `INTERIOR_DRAW_CALLS_MAX`, on top of `TILE_DRAW_CALLS_MAX` for the street's tiles: if the usable keys would take more, the keys with the fewest instances are dropped first. The dev view logs a "tile city interiors" line once its models are applied (what stands inside the blocks, from the pack and in code, and the draw calls); the main session reports 12 draw calls on the default city, which 057 E did not re-measure.
- **Default (057 D)**: furniture. A lot that became a court is no longer dressed as a frontage lot (`courtLotPieces` in `tilecity3d.ts`): the town still holds each court's mouth as a 10 m parking lot, so `furnitureLayout` would put a second lines tile 5 mm under the interiors' own and barriers across the near stalls' opening. The drive is a kerb cut and a lot surface only. A block in `TileCity.frontLots` keeps its frontage lot's furniture.
- **Default (057 D)**: `&sheet=1` shows each new piece once, labelled with the interior roles it serves. The two new pieces made the wide sheet five columns at a 14 m pitch (it was four), and the tall sheet's row pitch went from 12 m to 14 m.
- **Info (057 D)**: `puzzle=09-shrine-circuit&view=3d` is unaffected: the interiors, passages and the explicit alignment are the tile view's, and a puzzle map's `packTown` call is as it was (`packpin.test.ts`).

## Decided, not yet built (the tile city, 18 Nov 2026)

Josh's rulings from the tile-city work, in his own words, each with the ticket that builds it.

**These are not chapters yet.** As each ticket lands, its builder writes the real chapter or section named beside it, with the ruling as its **Decided** line, Numbers rows for its constants and a drift check. In the same branch, the builder removes the entry here or points it to that chapter. Nothing below changes the chapters above until then.

### Roads and the grid (ticket 055; chapter 17 and chapter 10 when 055 D lands)
- **Default (055, Josh 18 Nov 2026)**: roads on a 90 degree grid only, because the packs' road tiles allow nothing else: "In order for those tiles to work we are going to have to fix the power lines. Currently, the powerline puzzles define the map structure and distort the style of the city in such a way that the city pack doesnt allow."
- **Default (055, Josh 18 Nov 2026)**: angled roads are deferred: "Maybe in the future, we could fix the city to accommodate for all roads that aren't 90*, but for now the map packs don't support that."
- **Info (057 F and G, Josh 18 Nov 2026)**: built, now 19.5 and 19.6: 90 degrees is not a uniform square grid. The streets and everything on them are at 90 degrees, but blocks vary in width and depth, with alleys and parks: "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc"
- **Default (055, Josh 18 Nov 2026)**: build the road tiles first, without power lines, and put parking in the map: "Build out the use of the road tiles first. If you don't have that built out without the power lines in place, you won't be able to test and verify that things look right when they are placed on the map. You're going to have to figure out a way to integrate things like parking lots into the map as well or else it will feel. A city with no place to park is strange."
- **Default (055, Josh 18 Nov 2026)**: the puzzles are rebuilt later, to the new style: "The puzzles are going to have to be rebuilt in order to conform to the new style. These puzzles were built to demonstrate a skill. They aren't the final puzzles anyway. We can start with 10 puzzles and move from there." This is a puzzle-designer ticket after the circuit-on-the-grid ticket (059 stage B).
- **Default (055, Josh 18 Nov 2026)**: R7 (fire escapes) has a floor of 0.4 on the tile city, and the ladder's 0.5 is unchanged: "Just choose the recommended option for now" (chapter 17). Built: both floors are now guaranteed by construction, not met by chance (ticket 061, 16.11: "Yes, cut it (Recommended)").
- **Info (057 G, Josh 19 Nov 2026)**: built, now 19.7: R1 (the frontage share) has a floor of 0.88 on the tile city, because its alleys cut R1 to about 0.90, and the ladder's 0.90 is unchanged: "Tile-city R1 floor 0.88 (Recommended)". It is `TILE_CITY_R1_MIN`, beside the tile-city floors for R6 (0.45) and R7 (0.4).

### Corners and frontage (ticket 055 B, then 057; built, now chapter 19)
- **Default (055, Josh 18 Nov 2026)**: the corner inset was kept at first: "Keep the inset". Each row's first block stood up to 2.5 m back from its corner. Replaced by 057: corners are flush (19.2).
- **Info (057 A and B, Josh 18 Nov 2026)**: built, now 19.1 and 19.2: buildings meet the pavement with no gap, and an overlap of up to 0.6 m onto it is allowed (the City Pack shop pieces reach the ground up to 0.557 m in front of their walls). This overrode the inset, so corners are flush: "This is a great start. There are gaps between the buildings and the sidewalk. It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
- **Info (057 C, Josh 18 Nov 2026)**: built, now 19.4: blank block interiors are filled: "There are blank open areas where the buildings don't exist. Those need to be filled in with something. You could fill that with parking lots, parks, or you could have those squares of buildings be thinner so that the buildings are butted up right against each other." Then: "Grass and pavement should fill the blank areas."

### Buildings (ticket 055 F is built, now section 16.10; ticket 058 is built, now section 16.11)
- **Info (055 F, Josh 18 Nov 2026; F approved with Q10 to Q13 at their defaults: "Approved and confirmed")**: built, now section 16.10: each building's door sill is measured, and the building is sunk to the walk or given steps: "That's going to have to be a variable that we measure for each individual building."
- **Info (058, Josh 18 Nov 2026)**: built, now section 16.11: fire escapes connect, and their platforms are level with the windows: "There are gaps on the fire escapes. Additionally, fire escapes should always be level with windows or else people can't get out of the building."

### Poles, wires and lights (ticket 059; chapter 20, with lines in chapters 8 and 12)
- **Default (059, Josh 18 Nov 2026)**: street lights and power lines go on the tile city: "There are no streetlights either, or power lines." Also, from 055: "There are also models inside the city pack to showcase power lines."
  - Poles stand in the reserved slots, with code-drawn wires and Town Pack street lights distinct from puzzle lamps.
  - No never-used model is lifted unless Josh asks.

### Testing daylight (ticket 060; built, now section 16.12)
- **Info (060, Josh 18 Nov 2026)**: a dev-only day mode, for testing only, is built and is section 16.12. The game's night look (chapter 11) is unchanged: "please create a day light mode so it's easy to see" and "the purpose of the day mode is for testing".

## Numbers

The drift test (`styleguide.test.ts`) reads this table. Each row names an export of the file in its last column. A value is a number (within 1e-9), a colour as `0x` hex (exactly), or `a x b x c` for a record, in the record's field order. `LOT_TYPES` is frontage x depth x cap in metres and `PLACE_SIZES` is width x depth in metres. `STACK_STYLES[i].pitch_m` is base x floor x roof in metres (the storey heights a recipe counts floors by; the roof is the height reserved under the cap), in the order `apartment-01`, `-02`, `-03`, `office-old-small`, `office-old-large`, `office-octagon`. `STACK_FLOORS` is the fewest floors over the base. `TINTS[i]` is the i-th wall tint. `CITY_CHECK` is the threshold of R1 to R13 in that order (a share to reach, or a count not to pass, chapter 16.8) and `CITY_STOREYS` is the fewest and most storeys. Changing a constant in code or a value here fails the test. Since ticket 053 the test also fails when `stacks.ts`, `terrace.ts`, `dressing.ts`, `furniture.ts`, `streetcam.ts` or `citymetrics.ts` exports a number that has no row here, and when `town.ts` does for a `TERRACE_*`, `PARKING_*` or `PLAZA_*` name. Since ticket 054 the test also fails when `colourway.ts` exports a constant (not a function) that has no row here; `COLOURWAY_POOL` is pinned by its length, and its ids are the table in 16.9. Since ticket 060 the same holds for `lighting.ts`: every number in `LIGHT_MODES` and every numeric export has a row (the mode's words, `toneMapping`, `shadows` and `nightLights`, are in 16.12). Since ticket 056 the test also fails when a constant of chapter 18 (the rows for `tilecity.ts` at the end of the table) is missing or changed, and when `parkmetrics.ts` exports a constant (not a function) that has no row; `KERB_BAY_SHARE_MAX` is avenue x street, `PARK_SUPPLY_BAND` is floor x ceiling and `PARK_CHECK` is P1 to P6 in that order. Since ticket 058 the test also fails when `escapes.ts` exports a number or a record of numbers that has no row here; `ESCAPE_SCALE_Y` is min x max, and `CODE_ESCAPE` is `w`, `d`, `deck`, `rail`, `bar`, `tread`, `riser`, `hatch0`, `hatch1`, `stair0`, `stair1`, `ladderX0`, `ladderX1`, `ladderZ`, in metres (16.11). Since ticket 055 F the test also fails when `sills.ts` exports a number or a record of numbers that has no row here; `STEPS_SCALE_Y` is min x max (16.10; the constants of ticket 062 A and B, from `SILL_DEPTH_MAX_M` to `RECESS_DOOR_HALF_M` and `SILL_BAND_M`, `SILL_UNDER_M` and `LIFT_CLEAR_M`, are rows too). Colours are `0x` hex. Since ticket 057 D the rows for `tileslots.ts` (the draw-call caps and the gate's size and colour) are checked as well. Since ticket 057 the test also fails when `facade.ts` or `frontage.ts` exports a number or a record of numbers that has no row here (a constant that `frontage.ts` re-exports from `tilecity.ts` is covered by the `tilecity.ts` row), and when a constant that chapter 19 names from `tilecity.ts` has none. `WALL_FRONT_M` and `WALL_SIDE_M` are the exceptions: they hold a distance per piece, which `facade.test.ts` pins as a fixture, so only their constants are rows. `BLOCK_TILES` is min x max, `PASSAGE_W_M` is min x max, `COURT_CELLS` is w x d, and `FRONTAGE_CHECK` and `VARIETY_CHECK` are G1 to G4 and V1 to V4 in that order. The `tilecity.ts` rows from `TILE_M` to `PARK_HALF_SIDE_MIN_CELLS` are the constants of chapter 19.

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
| `ESCAPE_SHARE_LADDER` | 0.5 | dressing.ts |
| `ESCAPE_MIN_BAYS` | 3 | dressing.ts |
| `P_WALL_AC` | 0.15 | dressing.ts |
| `P_PLANTER` | 0.1 | dressing.ts |
| `WALL_PROPS_PER_BLOCK` | 4 | dressing.ts |
| `P_ROOF_SMALL` | 0.7 | dressing.ts |
| `ROOF_SMALL_PER_BAY` | 2 | dressing.ts |
| `P_ROOF_LARGE` | 0.5 | dressing.ts |
| `DRESS_PER_BAY_MAX` | 6 | dressing.ts |
| `DRESS_MAX` | 6000 | dressing.ts |
| `NO_USED` | 0 x 0 x 0 | dressing.ts |
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
| `CITY_CHECK` | 0.9 x 1 x 1 x 1 x 0.55 x 0.5 x 0.5 x 0.9 x 0 x 0 x 1 x 0 x 1 | citymetrics.ts |
| `CITY_ATM_BLOCKS_MIN` | 0.15 | citymetrics.ts |
| `CITY_BIG_ROOF_RUNS_MIN` | 0.5 | citymetrics.ts |
| `CITY_RUN_FRONTAGE` | 0.9 | citymetrics.ts |
| `CITY_STOREYS` | 3 x 5 | citymetrics.ts |
| `COLOURWAY_POOL.length` | 8 | colourway.ts |
| `LIGHT_MODES.night.background` | 0x0b0f17 | lighting.ts |
| `LIGHT_MODES.night.ambient.color` | 0x4a5a7a | lighting.ts |
| `LIGHT_MODES.night.ambient.intensity` | 1.1 | lighting.ts |
| `LIGHT_MODES.night.moon.color` | 0x8fa6d0 | lighting.ts |
| `LIGHT_MODES.night.moon.intensity` | 0.7 | lighting.ts |
| `LIGHT_MODES.night.moon.position[0]` | -6 | lighting.ts |
| `LIGHT_MODES.night.moon.position[1]` | 12 | lighting.ts |
| `LIGHT_MODES.night.moon.position[2]` | 4 | lighting.ts |
| `LIGHT_MODES.night.exposure` | 1 | lighting.ts |
| `LIGHT_MODES.night.surfaces.ground` | 0x0e131d | lighting.ts |
| `LIGHT_MODES.night.surfaces.yard` | 0x141c29 | lighting.ts |
| `LIGHT_MODES.night.surfaces.street` | 0x1a2331 | lighting.ts |
| `LIGHT_MODES.night.surfaces.pavement` | 0x3d4658 | lighting.ts |
| `LIGHT_MODES.night.surfaces.kerb` | 0x9aa4b6 | lighting.ts |
| `LIGHT_MODES.night.surfaces.grass` | 0x141c29 | lighting.ts |
| `LIGHT_MODES.day.background` | 0xa9c7e6 | lighting.ts |
| `LIGHT_MODES.day.key.color` | 0xfff6ea | lighting.ts |
| `LIGHT_MODES.day.key.intensity` | 1.4 | lighting.ts |
| `LIGHT_MODES.day.key.elevation_deg` | 55 | lighting.ts |
| `LIGHT_MODES.day.key.azimuth_deg` | 135 | lighting.ts |
| `LIGHT_MODES.day.hemi.sky` | 0xe6efff | lighting.ts |
| `LIGHT_MODES.day.hemi.ground` | 0x9a8c78 | lighting.ts |
| `LIGHT_MODES.day.hemi.intensity` | 1.8 | lighting.ts |
| `LIGHT_MODES.day.exposure` | 1 | lighting.ts |
| `LIGHT_MODES.day.surfaces.ground` | 0x7d8471 | lighting.ts |
| `LIGHT_MODES.day.surfaces.yard` | 0x7d8471 | lighting.ts |
| `LIGHT_MODES.day.surfaces.street` | 0x55595f | lighting.ts |
| `LIGHT_MODES.day.surfaces.pavement` | 0xa7abb1 | lighting.ts |
| `LIGHT_MODES.day.surfaces.kerb` | 0xd0d4da | lighting.ts |
| `LIGHT_MODES.day.surfaces.grass` | 0x6f8f4e | lighting.ts |
| `SUN_DISTANCE` | 20 | lighting.ts |
| `PARK_PER_SHOP` | 0.333333333333 | tilecity.ts |
| `PARK_PER_HOME` | 0.15 | tilecity.ts |
| `HOME_COLUMN_FLOORS` | 2 | tilecity.ts |
| `UNIT_FLOORS_NOMINAL` | 3 | tilecity.ts |
| `BAY_TILES_PER_BLOCK_MIN` | 1 | tilecity.ts |
| `BAY_RUN_TILES_MAX` | 2 | tilecity.ts |
| `KERB_GAP_MIN_M` | 10 | tilecity.ts |
| `KERB_BAY_SHARE_MAX` | 0.4 x 0.3 | tilecity.ts |
| `BAYS_PER_100M_MAX` | 6 | tilecity.ts |
| `LOTS_PER_BLOCK_MAX` | 2 | tilecity.ts |
| `LOT_STALLS` | 6 | tilecity.ts |
| `PARK_SUPPLY_BAND` | 0.75 x 1.5 | tilecity.ts |
| `BUILDOUT_TREE_EVERY` | 2 | tilecity.ts |
| `BAYS_PER_PARKING_TILE` | 3 | tilecity.ts |
| `BAY_JUNCTION_CLEAR` | 1 | tilecity.ts |
| `TILE_PARK_MIN_RUN_M` | 35 | tilecity.ts |
| `TILE_CITY_R6_MIN` | 0.45 | tilecity.ts |
| `TILE_M` | 5 | tilecity.ts |
| `AVENUE_ONE_IN` | 0 | tilecity.ts |
| `TILE_CITY_R7_MIN` | 0.4 | tilecity.ts |
| `TILE_CITY_R1_MIN` | 0.88 | tilecity.ts |
| `TILE_ROW_INSET_M` | 0 | tilecity.ts |
| `END_OVERLAP_MAX_M` | 1 | tilecity.ts |
| `PASSAGE_W_M` | 1 x 5.3 | tilecity.ts |
| `PASSAGE_FLOOR_DEPTH_M` | 5 | tilecity.ts |
| `COURT_CELLS` | 2 x 3 | tilecity.ts |
| `DRIVE_CELLS` | 2 | tilecity.ts |
| `PAVEMENT_GRATE` | 1 | tilecity.ts |
| `PAVEMENT_RETURN_NEAR` | 2 | tilecity.ts |
| `PAVEMENT_RETURN_FAR` | 4 | tilecity.ts |
| `PAVEMENT_FLUSH` | 8 | tilecity.ts |
| `POLE_SLOT_FROM_KERB_M` | 0.75 | tilecity.ts |
| `GRATE_ONE_IN` | 6 | tilecity.ts |
| `APRON_CELLS` | 1 | tilecity.ts |
| `APRON_STRIP` | 1 | tilecity.ts |
| `COURT_STALLS` | 0 | tilecity.ts |
| `COURT_AISLE` | 1 | tilecity.ts |
| `GREEN_SPAN_MAX_CELLS` | 6 | tilecity.ts |
| `GREEN_TREE_ONE_IN` | 3 | tilecity.ts |
| `BENCH_FROM_PATH_M` | 1 | tilecity.ts |
| `CITY_FRONT_LOT_BLOCKS_MAX` | 0.111111111111 | tilecity.ts |
| `BLOCK_TILES` | 6 x 16 | tilecity.ts |
| `BLOCK_STEP_MIN_CELLS` | 2 | tilecity.ts |
| `BLOCK_CV_MIN` | 0.15 | tilecity.ts |
| `BLOCK_NONSQUARE_MIN` | 0.7 | tilecity.ts |
| `BLOCK_DRAWS_MAX` | 64 | tilecity.ts |
| `BLOCK_MEAN_MIN_CELLS` | 10 | tilecity.ts |
| `BLOCK_SMALL_MAX_M` | 40 | tilecity.ts |
| `BLOCK_LONG_MIN_M` | 60 | tilecity.ts |
| `BLOCK_LONG_SHORT_MAX_M` | 45 | tilecity.ts |
| `BLOCK_LARGE_MIN_M` | 55 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[0]` | 13 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[1]` | 9 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[2]` | 15 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[3]` | 11 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[4]` | 16 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[5]` | 12 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[0]` | 10 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[1]` | 14 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[2]` | 8 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[3]` | 13 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[4]` | 15 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[5]` | 9 | tilecity.ts |
| `ALLEY_ONE_IN_BLOCKS` | 4 | tilecity.ts |
| `ALLEY_CELLS` | 1 | tilecity.ts |
| `ALLEY_BIN_EVERY_M` | 10 | tilecity.ts |
| `ALLEY_BIN_OFFSET_M` | 3.3 | tilecity.ts |
| `ALLEY_SIDE_LONG_M` | 70 | tilecity.ts |
| `ALLEY_SIDE_MIN_CELLS` | 9 | tilecity.ts |
| `ALLEY_COURT_PART_MIN_CELLS` | 6 | tilecity.ts |
| `ALLEY_COURT_LANE_MIN_CELLS` | 6 | tilecity.ts |
| `PARK_ONE_IN_BLOCKS` | 6 | tilecity.ts |
| `PARK_EDGE_CELLS` | 1 | tilecity.ts |
| `PARK_HALF_SIDE_MIN_CELLS` | 9 | tilecity.ts |
| `PARK_CHECK` | 0 x 0 x 0 x 0 x 0 x 6 | parkmetrics.ts |
| `ESCAPE_DECK_BELOW_SILL_M` | 0.15 | escapes.ts |
| `ESCAPE_DECK_TOL_M` | 0.05 | escapes.ts |
| `ESCAPE_JOINT_TOL_M` | 0.02 | escapes.ts |
| `ESCAPE_GROUND_TOL_M` | 0.02 | escapes.ts |
| `ESCAPE_SCALE_Y` | 0.8 x 1.2 | escapes.ts |
| `LADDER_RUNG_PITCH_M` | 0.3 | escapes.ts |
| `LADDER_RAIL_M` | 0.04 | escapes.ts |
| `LADDER_RUNG_M` | 0.03 | escapes.ts |
| `CODE_ESCAPE` | 3.25 x 1.64 x 0.08 x 0.9 x 0.05 x 0.25 x 0.2 x -0.9 x 1 x 0.07 x 0.67 x 0.853 x 1.303 x 0.83 | escapes.ts |
| `SILL_MIN_AREA_M2` | 1 | escapes.ts |
| `SILL_MAX_M` | 0.15 | sills.ts |
| `SILL_WINDOW_CLEAR_M` | 0.3 | sills.ts |
| `STEPS_RISE_M` | 0.5 | sills.ts |
| `STEPS_SCALE_Y` | 0.5 x 1.5 | sills.ts |
| `STEPS_W_M` | 1.2 | sills.ts |
| `STEPS_D_M` | 0.9 | sills.ts |
| `STEPS_TUCK_M` | 0.05 | sills.ts |
| `STEPS_FIT_M` | 0.05 | sills.ts |
| `SILL_DEPTH_M` | 1 | sills.ts |
| `SILL_CEIL_M` | 1.5 | sills.ts |
| `DOOR_MIN_AREA_M2` | 0.2 | sills.ts |
| `SILL_DOOR_HALF_M` | 0.45 | sills.ts |
| `SILL_LEVEL_GAP_M` | 0.03 | sills.ts |
| `SILL_JOIN_GAP_M` | 0.1 | sills.ts |
| `SILL_DEPTH_MAX_M` | 4 | sills.ts |
| `SILL_BAND_M` | 0.16 | sills.ts |
| `SILL_UNDER_M` | 0.05 | sills.ts |
| `LIFT_CLEAR_M` | 0.05 | sills.ts |
| `STEP_MIN_M` | 0.05 | sills.ts |
| `STEP_BELOW_FLOOR_M` | 0.1 | sills.ts |
| `RECESS_MIN_M` | 0.05 | sills.ts |
| `RECESS_AREA_M2` | 0.3 | sills.ts |
| `RECESS_FLAT_M` | 0.02 | sills.ts |
| `RECESS_JOIN_M` | 0.03 | sills.ts |
| `WINDOW_DEPTH_M` | 4 | sills.ts |
| `RECESS_ABOVE_FLOOR_M` | 0.05 | sills.ts |
| `RECESS_DOOR_HALF_M` | 0.75 | sills.ts |
| `WALL_REACH_M` | 0.6 | facade.ts |
| `WALL_FLOOR_REACH_M` | 0.5 | facade.ts |
| `WALL_GROUND_Y_M` | 0.3 | facade.ts |
| `WALL_BAND_M` | 3.5 | facade.ts |
| `WALL_MIN_AREA_M2` | 0.5 | facade.ts |
| `WALL_PLANE_TOL_M` | 0.02 | facade.ts |
| `WALL_FACE_COS` | 0.99 | facade.ts |
| `WALL_OCTAGON_BASE_M` | 0.174 | facade.ts |
| `OVERLAP_MAX_M` | 0.6 | frontage.ts |
| `RECESS_MAX_M` | 0 | frontage.ts |
| `FRONTAGE_TOL_M` | 0.01 | frontage.ts |
| `VOID_MAX_SHARE` | 0.01 | frontage.ts |
| `VOID_PATCH_MAX_M` | 1 | frontage.ts |
| `VOID_RASTER_M` | 0.25 | frontage.ts |
| `FRONTAGE_CHECK` | 0 x 0 x 0 x 0 | frontage.ts |
| `VARIETY_CHECK` | 0 x 0 x 0 x 0 | frontage.ts |
| `TILE_DRAW_CALLS_MAX` | 40 | tileslots.ts |
| `INTERIOR_DRAW_CALLS_MAX` | 24 | tileslots.ts |
| `PAVING_SLAB_COLOUR` | 0x8c8987 | tileslots.ts |
| `STALL_LINES_LIFT_M` | 0.01 | tileslots.ts |
| `GATE_H_M` | 2.2 | tileslots.ts |
| `GATE_SMALL_H_M` | 1.3 | tileslots.ts |
| `GATE_POST_W_M` | 0.2 | tileslots.ts |
| `GATE_POST_EXTRA_H_M` | 0.25 | tileslots.ts |
| `GATE_THICK_M` | 0.12 | tileslots.ts |
| `GATE_ALLEY_REACH_M` | 1 | tileslots.ts |
| `GATE_COLOUR` | 0x6b4b32 | tileslots.ts |
| `KERB_INSET_M` | 0.66 | tileslots.ts |
| `KERB_LIP_TOP_M` | 0.3 | tileslots.ts |
| `KERB_LIP_W_M` | 0.39 | tileslots.ts |
| `KERB_STRIP_COLOUR` | 0x7b7b79 | tileslots.ts |
| `KERB_TOL_M` | 0.03 | tileslots.ts |
| `KERB_HEIGHT_TOL_M` | 0.02 | tileslots.ts |
| `KERB_GAP_MAX_M` | 0.05 | tileslots.ts |

Night's global lighting as written in the table of `lighting.ts` (the rig reads it; since ticket 060 `scene.ts` holds no light literal of its own), pinned by the exact source text as well:

| Part | Source text |
| --- | --- |
| background | `background: 0x0b0f17,` |
| ambient light | `ambient: { color: 0x4a5a7a, intensity: 1.1 },` |
| moon light | `moon: { color: 0x8fa6d0, intensity: 0.7, position: [-6, 12, 4] },` |
