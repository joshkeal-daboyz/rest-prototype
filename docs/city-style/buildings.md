# City style: Buildings

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
- **Info**: the only whole corner model is `store_corner_mesh`, in the table below. It is rarely placed, because few lots qualify. Its `open` side was flipped when the fronts were turned, and it is still an uncalibrated guess: Josh has not checked that its second face lands on the cross street. The City Pack's eight corner pieces (050 C) are in the same table; their `open` side is measured from the GLB (063 E1, below), not guessed.

| Name | Front | Open |
| --- | --- | --- |
| `simple-town:store_corner_mesh` | -z | -x |
| `city-pack:SM_Bld_Shop_Corner_01` | +z | -x |
| `city-pack:SM_Bld_Shop_Corner_02` | +z | -x |
| `city-pack:SM_Bld_Apartment_Corner_01` | +z | -x |
| `city-pack:SM_Bld_Apartment_Corner_02` | +z | -x |
| `city-pack:SM_Bld_Apartment_Corner_03` | +z | -x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_01` | +z | -x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_02` | +z | -x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_03` | +z | -x |

- **Default (048 Q5)**: no POLYGON model is a corner model. A gallery click sets only a door, and `open` lives in code, so a Town Pack house gets `corner: true` and `open` only if Josh names one with two street faces and says which side. Until then a Town Pack house goes on any lot, corner or not, as an ordinary model.
- **Decided (050, Josh, 18 Nov 2026: "the shop corners are intended to be base units for the larger structures.")**: a stack's ground floor on a corner takes the shop corner piece, and its upper floors and roof take the matching `_Corner_` pieces.
- **Decided (063 E1, Josh, 19 Nov 2026: "The building roof tiles aren't properly scaled and the corner peices aren't being used properly" and "corner store is not angled on the corner")**: a corner piece's second street face stands on the cross street, and its angled face (a shop corner's chamfer and glass) is on the corner, toward the junction. The roof corner's trim runs along its two street faces and turns the corner with them.
- **Info (063 E1, measured 19 Nov 2026)**: the "+x" the eight City Pack corner pieces had was the 050 C recipe's guess ("no data says which end"). `measureOpenSide` (facade.ts) compares each side's profile with the front's: a street face is modelled like the front (the same window reveals, shop openings or cornice steps at the same depths), a party wall is a plain slab. On all eight pieces the street faces are **+z and -x** and the party walls **+x and -z**; the nearer side is 9 or more times nearer (`OPEN_MARGIN` is 4). The pack's `Shop_Corner_01_Glass`, `Shop_Corner_02_Glass` and the L awning `Shop_Cover_05` have their faces on +z and -x too, so they follow the corner's turn. `OPEN_SIDE_MEASURED` holds each piece's side and the reason; `facade.test.ts` re-measures it when the GLB is on the machine.
- **Default (063 E1)**: `BUILDING_FRONTS`, the recipes' `open` and `OPEN_SIDE_MEASURED` agree (a test holds them to it). At the row's -x end a corner column keeps its piece unturned (its open side is the lot's -x side, on the cross street); at the +x end it turns a quarter, so its open side is on the row's street and its front on the cross street. `WALL_SIDE_M`, the wall of the open face, was measured on +x (the blank party wall) and is re-measured on -x (chapter 19.1); `wallOffset` reads the open side whichever it is, and gives 0 for a side other than the measured one, as a recalibrated front does.
- **Info (063 E1)**: this changes the ladder maps' corner stacks too (Josh's answer to the ticket's Q-E, the architect's default): only corner pieces' turn, x and z (and what is dressed on them) move. `packpin.test.ts` is re-pinned for it and lists every field that moved.
- **Default (050 C, from the corner rule above)**: a stack has a corner column (shop corner base, corner floors, corner roof, never a `_Stack_` piece) on each side in its lot's `cornerSides` and on no other. It is built for its lot, so it stands only where that side meets a cross street and never mid-row, and its second street face is on the cross street. A stack with no corner column, and any style with no corner pieces (the offices), is an ordinary building and may stand on a corner lot as any model may. A corner piece's `open` side is read in the lot frame after its front is turned: at the other end of the row the corner column turns a quarter, so one piece serves both ends. A corner stack that cannot be assembled on its lot (it does not fit with the corner columns in) falls back to the same style mid-row. `open` comes from `BUILDING_FRONTS` first, then the recipe's (`OPEN_SIDE_MEASURED`), then "+x"; a value Josh saves in the gallery still wins over both.
- **Info (053)**: corner blocks on a terrace, and the check that they stand only on true corners (R9), are in chapter 16 (16.3 and 16.8).


### 16.4 Variety

- **Default (051)**: neighbours in a run never share a style, and they differ in floor count wherever the cap allows a choice, and from the block before that where it can. Among the choices that close a run, the style least used so far in the run comes first, then a hash of the run id. This is what makes R2 hold on every pair.
- **Info**: the street-repeat rule and the share cap of chapter 5 do not bound a terrace (three styles are fewer than the families they apply to). The terrace's own bound is that each apartment style is a fifth to a half of a ladder's terrace blocks (`terracepack.test.ts`).
- **Default (050 C)**: stacks on the circuit's own large and tall lots, outside the terraces, follow the neighbour, street-repeat and share rules of chapter 5 unchanged (`NEIGHBOUR_GAP`, `STREET_REPEAT_GAP`, `FAMILY_SHARE_MAX`).
- **Default (052)**: the dressing varies by hash, not by order. One awning key per block (the awnings of a block match), no sign key twice in a block, at most one blade sign, one ATM, one fire-escape column and one big roof prop per block, at most `ATM_PER_RUN` ATMs, one billboard and one novelty sign per run, and no fire escape on two neighbouring blocks of a run.
- **Info (054)**: colour variety in the city comes from the three apartment styles and, since 054, from the colourway each block is drawn in (16.9): neighbours in a run never share one (R13). The awnings are fixed shapes and colours of one texture atlas, and the roof props are one colour each (16.6).


### 16.7 Fallbacks

- **Default (050)**: with no City Pack in the manifest, or its GLB failed, no stack is offered and the terrace is the abutting placeholder boxes of 051 B, as on a fresh checkout and in CI. The town is then exactly what chapter 5's chain gives.
- **Default (051)**: a run that packs no block keeps its placeholders. A stack piece whose root did not load, or whose key is excluded, drops the styles that need it and nothing else; if every style drops, the type falls down the chain of chapter 5.
- **Default (052)**: a dressing or furniture key missing from the manifest drops only its own placements. With no stack there is no dressing, and with no dressing or no packed run there is no furniture: each is drawn only when the layer under it is.
- **Default (054)**: with no `colourways` field in the City Pack's manifest entry, no colourway image loaded, or a fresh checkout or CI, no texture is fetched and every block keeps the cached materials: the scene is exactly what it was before 054. An image that fails to load drops its own id only (16.9).
- **Info**: the circuit and the play view are not touched by any of this: the 3D play view must read exactly as on `main` (R12).


#### From 16.9 (the colourway rule)

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

