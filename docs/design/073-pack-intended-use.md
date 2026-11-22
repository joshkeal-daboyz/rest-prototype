# 073 · How the packs' makers show their pieces in use

Research note for the 073 transformation passes (sections 4 to 6 of `073-transformations.md`). The city agents see only piece names and bounding boxes. This note records how Synty's own product images show each planned piece family in use, so a later agent can check a placement against it.

**Method.** Each pack's product page on syntystore.com, every scene image ("Screenshot", "SS_") and every environment, building and prop layout sheet, opened at 1600 px and zoomed where detail mattered. Piece names were matched to what the images show by shape and by the sizes in `assets/private/out/manifest.json` (for Apocalypse, the converted `apocalypse-power` and `apocalypse-ruin` subsets). Nothing was downloaded or saved.

**Confidence words.** *Seen clearly*: the piece is plainly visible in use and the match to the name is solid. *Inferred*: something matching the piece's shape and size is visible, but the name match or the detail of the mounting is my reading. *Not shown*: I could not find it in any image.

**What the images cannot settle.** Product shots are composed for looks. They show what the makers did, not a rule. Where the images and Josh disagree (the power pole, below), Josh's word stands and this note only reports what is visible.

`073-D1-precheck.md` does not exist yet, so only sections 4 to 6 were checked.

---

## 1. POLYGON Sci-Fi City (`sci-fi-city-pack`)

**Page:** https://syntystore.com/products/polygon-sci-fi-city

**Images looked at:** Screenshot_01 to 08, 09a, 10 to 15 (15 scenes); Layout_01 to 11. Layout_01 to 04 are characters, 05 and 07 vehicles, 10 weapons. Layout_06 (buildings), 08 (props), 09 (ground, greebles) and 11 (signs) were the useful sheets.

| Piece family (manifest names) | How the images show it used | Image | Sure? |
| --- | --- | --- | --- |
| `Prop_Powerpoll_01/02` (1.5 to 1.8 x 5.1 x 1.2) | A square-section pole about 5 m high with a crossarm and transformer or meter boxes. Cables run from it to building walls and to the next pole. **In the images the poles stand on the pavement at the kerb, at street corners and along the street.** One clear case: the base sits directly on the paving with a small square foot. In one more image the pole rises behind a market stall and its base is hidden. No image shows one standing on a roof or fixed to a wall. | Screenshot_11 (two poles, both bases on the pavement, clearly visible), Screenshot_13 (several at corners, aerial view), Screenshot_14 (along the street, distant), Screenshot_07 (behind a stall, base hidden) | Seen clearly that crossarm poles stand on the pavement. The name match is **inferred**: it is the only crossarm pole in the pack at that size, but the images carry no labels. |
| `Prop_Streetlight_01` (5.4 high) | Not used in 073, listed for contrast. Thin lamp poles on the pavement. | Screenshot_03, 13 | Inferred |
| `Prop_Cables_01..03` (73 m long), `Prop_Cable_Crossing_*` | Long sagging cable bundles strung across the street between building façades at upper-floor height, and between façades and the crossarm poles. | Screenshot_01, 02, 03, 07, 10, 11, 15 | Seen clearly (cables); name match inferred |
| `Prop_Bridge_01` (5.0 long, 0.9 high, 1.9 wide) | Open lattice truss beams span the street from one building face to the other, roughly 6 to 10 m up. Cables are draped over them and signs hang from them. Nobody walks on them, and there are no railings or deck. | Screenshot_01/02 (across the street, signs hung under it), Screenshot_03, 10, 15 | The truss spans are seen clearly. That they are `Prop_Bridge_01` is **inferred** from the 5 m length and the 0.9 m lattice depth. |
| `Env_Railing_01/02` (5.0 x 1.3) | Railings run along the edges of a raised deck that stands on chunky pillars at street level, and along balcony and roof edges. | Screenshot_06 (raised deck), Screenshot_03 (balcony) | Seen clearly |
| `Bld_Raised_01/02` (5.0 x 6.0 x 4.8 to 5.2) | The only raised building section shown is a deck on heavy pillars at ground level, with railings, a car parked on top and pavement beneath. Nothing like it is stacked on a roof. | Screenshot_06 | **Inferred**: matched by name and the 5 m footprint. Not seen on a roof. |
| `Building_Shack_01/02`, `Bld_Roof_Pagoda_02` | Pagoda roofs cap shopfront buildings: a tiled overhang over a shop at about the first-floor line. Small shacks were not identified. | Screenshot_01, 02, 03 (pagoda over shops) | Pagoda inferred; shack not shown |
| `Prop_SatDish_*`, `Prop_Vent_*`, `Prop_AirConditioningGrid_01`, `Prop_Antenna` | Dishes and large vent or fan machinery sit on roofs and roof edges. Dishes are also on balconies and on a wall bracket. | Screenshot_03 (roof machinery), 11, 12 (dish on a balcony edge), 13 (roofs, aerial) | Inferred |
| `Prop_AirConditioningUnit_01/02` | Small AC boxes are fixed to building walls high up, in clusters, and on roof edges. | Screenshot_11 (wall clusters) | Seen clearly |
| `Prop_WallAttach_Electronics_*`, `_Vent_*`, `Prop_Pipes_*` | Wall boxes and pipes on façades at and above the ground storey. Vertical pipes run down to the pavement. | Screenshot_04 (pipe down the wall), 03, 11 | Inferred |
| `Prop_Security_Camera_01/02` | **Mounted high on building walls**, at upper-corner and ceiling height, outdoors and indoors. Never free-standing on the pavement. | Screenshot_04 (outside corner, about 4 m up), Screenshot_08 (interior walls near the ceiling), Screenshot_12 (two on a façade) | Seen clearly |
| `Prop_VendingMachine_01`, `Prop_Atm_01`, `Prop_ChargingStation_01` | Machines stand against shopfronts on the pavement, backs to the wall. ATM-like terminals also appear indoors. | Screenshot_03 (terminal on the pavement), 08 (indoors), 11 | Inferred |
| `Prop_Advertisement_Pillar_01` (1.5 x 2.6) | A round poster pillar on the pavement, free-standing. | Screenshot_03, 07 (covered in posters) | Seen clearly |
| `Prop_Hologram_*` (bottle, burger, noodles, pizza) | Big hologram food and bottle signs **on top of low buildings and roof corners**. The noodle sign is on a roof. | Screenshot_13 (burger on a low roof, bottle on a roof), Screenshot_14 (noodle box on a roof) | Seen clearly |
| `Sign_*`, `Sign_Billboard_Border_*`, neon | Shop signs fixed to façades above doors, vertical blade signs on corners, billboards on upper walls. Neon is shown glowing. | Screenshot_01 to 04, 11, Layout_11 | Seen clearly |
| `Bld_Advanced_01/02` (5.0 or 10.0 x 3.0 x 0.7 façades) | Shopfront façade strips are laid out on the building sheet. In scenes, shopfronts form the ground storey. | Layout_06 (top rows), Screenshot_03, 11 | Inferred |
| `Bld_Power_01/02/04` | Not identified in any scene. Layout_06 has cylindrical tank or plant blocks that may be these. | Layout_06 | Not shown in use |
| `Bld_Large_*` (towers) | Free-standing towers on their own plots, forming the skyline. | Screenshot_13, 14 | Seen clearly (out of v1 anyway) |
| `Bld_LandingPad_01` | Cars parked on rooftops and on raised pads. | Screenshot_13 | Inferred |

## 2. POLYGON Sci-Fi Frontier (`sci-fi-frontier-pack`)

**Page:** https://syntystore.com/products/polygon-sci-fi-frontier (found with the store search for "frontier"; "Western Frontier" is a different pack and was not used)

**Images looked at:** SS_Outback, SS_Farm, SS_Harvester, SS_Grub_Hub, SS_Mechanic, SS_Pad, SS_Bar, SS_Bar_Booth, SS_Bar_Boss, SS_Town_Sunset, SS_Chase, SS_Farmlife, SS_Ravine, SS_Market_01, SS_Market_02_Night, SS_DropPod, SS_Camp_Gathering, SS_Jungle, SS_Moist, SS_LifeMoving, SS_Alien_Artifact (21 scenes); Layouts_Buildings_01, Layouts_Buildings_02, Layouts_Props_01, Layouts_Props_02, Layouts_Environment_01. The character, vehicle, weapon and decal layout sheets were not opened, because 073 uses none of those pieces.

| Piece family | How the images show it used | Image | Sure? |
| --- | --- | --- | --- |
| `Prop_Power_Pole_01..03` (7.9 to 9.1 high, thin) | Tall thin poles stand in the ground of the settlement, between buildings and along the main street. Cables sag from pole to pole and to rooftop signs and roofs. One thin pole rises from the top of a domed building instead of the ground. A thicker pole stands on the ground beside the Grub Hub. | SS_Grub_Hub (ground pole and a pole on a building), SS_Town_Sunset (row along the street), SS_Market_01/02 (pole in the market square, cables to the stall roofs) | Seen clearly |
| `Prop_Cable_12..16` (12 m spans), `Prop_Cable_17/18` | Sagging spans between poles and buildings, some hung with bunting. The 12 m spans are laid out as loose hanging cables on Layouts_Buildings_02. | SS_Grub_Hub, SS_Town_Sunset, Layouts_Buildings_02 (top row) | Seen clearly |
| `Prop_Cable_01..06`, `Prop_Cable_Stand_01`, `Prop_Cable_Junction_01` | Cables lie on the ground and snake across it between small stands and boxes, out in the open. | SS_Moist (glowing ground cables between tripod stands), SS_DropPod (cables from a ground unit) | Seen clearly (ground cables); stand match inferred |
| `Prop_Solar_Panel_02..05` | Large tilted panels on a post or rotating base. One stands on **top of a round building** in the town, one is on a post beside a building at about 4 m, and one is built onto a small building (Layouts_Buildings_01). Star-shaped ground arrays stand in open fields beside a farm. | SS_Town_Sunset (on a building), SS_Grub_Hub (beside a building), SS_Farmlife (ground arrays), Layouts_Buildings_01 | Seen clearly (they are used both on roofs and on the ground) |
| `Prop_Windmill_01` (13.4 high) | Stands alone on open ground at the edge of the settlement, beside a tent. | SS_Outback | Seen clearly |
| `Prop_Silo_01..04` (7 to 12 high) | Grouped in a row at the edge of the farm fields, on open ground. | SS_Farmlife | Inferred (matched by the domed and lattice shapes on Layouts_Props_01) |
| `Prop_Generator_01`, `Prop_Battery_*`, `Prop_Battery_Charger_01` | Small power boxes and charger units stand on the ground next to pods and stalls, with cables to them. | SS_DropPod, SS_Camp_Gathering | Inferred |
| `Bld_Tent_01..03`, `Prop_Fabric_01..03` | Tents stand on open ground. A fabric awning is stretched on poles off a tent's side, and fabric is draped over a building's top. | SS_Outback (tent with an awning on poles), Layouts_Buildings_01 (orange fabric on a building top), Layouts_Buildings_02 | Seen clearly (tents); fabric inferred |
| `Bld_Pod_01..04` | Dome huts on open ground in a ring around a camp. | SS_DropPod, SS_Camp_Gathering | Seen clearly |
| `Env_Farm_Circle_*`, `Env_Farm_Straight_01`, `Prop_Irrigator_01/02` | Large circular and rectangular fields on open land outside the settlement. Irrigator booms stand across the fields, spraying. | SS_Farm, SS_Farmlife | Seen clearly |
| `Bld_Market_Stall_01..03` | Stall rows facing a market square, with cables strung overhead from a pole. | SS_Market_01, SS_Market_02_Night | Seen clearly |
| `Prop_Container_01..07` | Not identified with certainty in any scene. Crates and boxes near stalls may be smaller pieces. | — | Not shown |
| `Bld_Wall_01/02`, `Bld_Wall_Large_01`, `Bld_Wall_Tower_01` | Low wall segments and an arch are on Layouts_Buildings_02. No scene shows a barricade line across a street mouth. | Layouts_Buildings_02 | Inferred (sheet only) |
| `Bld_WaterTower_01` (14.2 high) | A tower on legs in the settlement, on the ground. | Layouts_Buildings_01; SS_Town_Sunset (in the background) | Inferred |
| `Prop_Greeble_*`, `Prop_Crate_*`, `Prop_Fuel_Tank_*` | Clutter on the ground around stalls, garages and pads. | SS_Mechanic, SS_Pad, SS_Market | Inferred |

## 3. POLYGON Palm City (`palm-city-pack`), the vines only

**Page:** https://syntystore.com/products/polygon-palm-city

**Images looked at:** Polygon_Palm_City_Screenshot_01 to 22 and 24 to 27 (there is no Screenshot_23 in the gallery); Layout_Env_01, Layout_Env_02, Layout_Bld_01, Layout_Props_01 to 05. The character, vehicle, weapon and decal sheets were not opened.

| Piece family | How the images show it used | Image | Sure? |
| --- | --- | --- | --- |
| `Env_Vines_01..08` | Leafy vines **drape over the eaves of a roof or pergola and hang down from them**, wrap round posts and columns, and trail down the faces of arches. They also hang from a high balcony or parapet edge on the mansion, and from a tower wall by a pool deck. Outdoors, on resort, leisure and garden structures. The look is sparse trailing strands, not a full wall cover. On the layout sheet they are sheets, clumps and a single column-wrap strand. | Screenshot_06 (over the bar's eave and down its posts), Screenshot_10 (up a colonnade column and over the arches), Screenshot_12 (over the mansion's upper edge), Screenshot_22 (pergola eave, tower wall), Layout_Env_01 (top-left group) | Seen clearly |

Manifest note, which the images agree with: only `Env_Vines_01/04/05` are flat sheets (0.7 to 0.8 m deep). `02/03/07/08` are 2.1 to 4 m deep (corner or roof-edge drapes). `06` is a 0.6 x 3.0 x 0.6 column wrap.

## 4. POLYGON Nature (`nature-pack`)

**Page:** https://syntystore.com/products/polygon-nature-pack

**Images looked at:** Screenshot_00, Screenshots_01 to 10; Layout_01, Layout02 (terrain textures), Layout_03, Layout03.

| Piece family | How the images show it used | Image | Sure? |
| --- | --- | --- | --- |
| `Tree_*` (Birch, Round, Large, Generic_Giant) | Wild woodland and riverbank on natural ground, with trees clustered by kind and colour. The giant tree stands alone as a centrepiece over a clearing. | Screenshot_00, Screenshots_04, 08, 09, 10 | Seen clearly |
| `Tree_Dead_*` (1.2 to 3.5 high) | Bare snags in a swamp, standing in mud and water among fallen logs. | Screenshots_02, 06 | Seen clearly |
| `Tree_Vines_01..04` (hanging) | **Moss or vine strands hang from the branches of dead and swamp trees.** None hang on walls (the pack has no buildings). On the sheet they stand alone as thin hanging strands. | Screenshots_06, Layout03 | Seen clearly (from branches) |
| `Tree_Log_*`, `Tree_Stump_*` | Fallen logs lie across the forest floor and in water. Stumps sit among trees. | Screenshots_02, 06, 08 (a log by the stream), Layout03 | Seen clearly |
| `Plant_Fern_*`, `Plant_Bush_*`, `Plant_Grass_*`, `Plant_Undergrowth_01` | Ground cover in forest clearings, path edges and riverbanks. | Screenshot_00, Screenshots_01, 07 | Seen clearly |
| `Plant_Hedge_Bush_*` | Rounded bushes on open grass. | Layout_01, Screenshots_04 | Inferred |
| `Terrain_Ground_Mound_*`, `Terrain_Rubble_Pebbles_*`, `Terrain_DustPile_*` | Grass mounds and pebble scatters on natural ground. Rubble pebbles sit at the foot of rocks and ruins. | Layout_03 (sheet), Screenshots_03 (pebbles at ruins) | Inferred |
| Ruins (`Prop_*Pillar*`, arches, stone walls) | Broken stone arches and pillars stand in a grassy clearing as a ruin. | Screenshots_03, Layout_01 | Seen clearly |

## 5. POLYGON Apocalypse (the ruin subset, `apocalypse-ruin` and `apocalypse-power`)

**Page:** https://syntystore.com/products/polygon-apocalypse-pack

**Images looked at:** Screenshot_01 to 19 and Church_01 (20 scenes); Layout_01 to 17. The six Screenshot_Characters images, the thirteen car_NN images and the two Gunlayout sheets were not opened. The vehicles are covered by Layout_07.

| Piece family | How the images show it used | Image | Sure? |
| --- | --- | --- | --- |
| `Env_RoadPiece_Damaged_*` | Craters and heaved, broken slabs in the carriageway, mostly at junctions and mid-road, with cracks running out from them. | Screenshot_11 (holes in a wide road), Screenshot_16 (crater at a junction) | Seen clearly |
| `Env_Overgrowth_*`, `Env_Overgrowth_Edge_*`, `_Wall_*` | Flat green patches spread over pavement edges, kerbs, car parks and **flat roofs**, and moss sits on ledges. On a tall building, long vine strands hang from balcony and roof edges down the façade. | Screenshot_11 (façade vines, roof moss), Screenshot_16 and 19 (patches on roads, pavements and roofs), Screenshot_05 (roof edge) | Seen clearly |
| `Env_Sidewalk_Overgrown_*` | Pavement runs with grass through them, along streets. | Screenshot_16, 19 | Inferred |
| `Prop_Car_Wrecked_*` (incl. bus, van, overgrown) | Abandoned in the carriageway at angles, in car parks and outside shops. Overgrown buses sit in the road. | Screenshot_05, 11, 16, 19; Layout_02 | Seen clearly |
| `Prop_Barricade_*`, `Prop_Road_Barrier_*`, `Prop_Barricade_Wired_*` | Plank, sheet-metal and wired barricades close a street behind a gated compound wall. Fences ring camps and yards. | Screenshot_08 (barricaded gate across the street), Screenshot_06, 14; Layout_02, 15 | Seen clearly |
| `Bld_Door_Barricaded_*` | Boards across doorways on house and shop fronts. | Screenshot_13, Church_01 | Inferred |
| `Prop_Rubble_Concrete_*` | Rubble piles at the foot of damaged buildings and by craters. | Screenshot_11, 16 | Inferred |
| `Prop_Powerpole_*` (6.3 high, wooden), `_Broken_*`, `_Lines_*` | Wooden crossarm poles stand **in the ground or pavement along streets and through suburbs**, with lines between them. | Screenshot_13 (row through a suburb), Screenshot_16 (along kerbs), Layout_01 (top-left) | Seen clearly (standing). Broken poles **not shown** in any scene. |
| `Bld_Pylon_01`, `Bld_Pylon_Broken_01` | Lattice pylons stand in open country with lines. One has fallen whole and lies across a car park and road. | Screenshot_15, 17 (standing), Screenshot_11 (fallen) | Seen clearly |

---

## Where the plan disagrees with the images

1. **Sci-Fi City `Prop_Powerpoll_01/02` (Josh's known case).** Josh's ruling is that the pole goes on an existing structure, not out of the ground. The plan puts it on roofs ("the rooftop power net", section 4). **The product images do not show that.** In Screenshot_11 and Screenshot_13 the crossarm poles stand on the pavement at the kerb, at corners and along the street, with cables to the building walls. Screenshot_11 shows the base plainly on the paving. No image shows one on a roof or on a wall. The plan's rooftop use and Josh's ruling are both outside what the images show. That the images' poles are `Powerpoll_01/02` is inferred, not labelled. **Recommendation:** put this to Josh rather than settle it. If he keeps the roof net, it should be recorded as a deliberate break (section 7), not as intended use.
2. **`Prop_Security_Camera_01/02` as "street tech" on the pavement** (section 4, Pavement row). The images show them only fixed high on walls, outdoors and indoors (Screenshot_04, 08, 12). Move them to the Walls row, above the ground storey.
3. **`Prop_Bridge_01` as a walkway over lanes and alleys with `Env_Railing`** (section 4). The images show open lattice trusses spanning the street between façades, carrying cables and hung signs, with no deck, no railings and nobody on them (Screenshot_01, 03, 10). That `Prop_Bridge_01` is that truss is inferred. Railings in the images edge decks and balconies, not trusses. The truss reading suits the "wired up" idea better than a walkway.
4. **`Bld_Raised_01/02` as extra storeys on existing roofs** (section 4). The only raised section in the images is a pillared deck standing at street level (Screenshot_06). Nothing is stacked on a roof. This is inferred, but treat the roof placement as unconfirmed.
5. **Palm City `Env_Vines_01..08` described as "3.7 x 3.8 x 0.7 sheets" for walls** (section 6). The images use them to drape over eaves, pergolas, arches and parapets and to wrap columns (Screenshot_06, 10, 12, 22), never as a full sheet on a plain wall. Only 01, 04 and 05 are flat sheets. 02, 03, 07 and 08 are deep drapes, and 06 is a column wrap. Hang them from roof edges, canopies, balconies and posts, choosing the variant by its depth.
6. **Nature `Tree_Vines_01..04` on walls** (section 6, Walls row). The images hang them only from tree branches (Screenshots_06). On a building they would need something overhead to hang from: an eave, a sign arm, a balcony. They should not be stuck flat to a façade.
7. **Frontier `Prop_Solar_Panel_*` under "Roofs"** (section 5). The images use them both on buildings and as ground arrays in open fields (SS_Town_Sunset, SS_Farmlife). This is no conflict. It widens the plant's options: ground arrays suit the court or park plant, and `Solar_Panel_02` (5.6 high on a post) is a ground or edge piece more than a flat-roof one.
8. **Frontier `Prop_Power_Pole_01..03` "on whatever stands there", across streets, off light posts and traffic masts** (section 5). The images show these poles standing in the ground, or once on top of a building, with cables to other poles and to roofs. Lines tied off light posts and traffic masts are not shown. That use is the deliberate rule-break the plan already lists in section 7. Keep it there.
9. **Sci-Fi City `Prop_Hologram_*` "dead holograms" on roofs** (section 4). This agrees with the images (Screenshot_13, 14). The images favour low roofs and roof corners over the street, not tall towers.
10. **Apocalypse broken power poles (`Prop_Powerpole_Broken_*`)** (section 6, "toppled poles"). The intact poles are shown standing in the pavement along streets, which fits the street grid. No image shows a broken one in place, so how a toppled pole should lie (across the road or the pavement) is unconfirmed. The fallen pylon in Screenshot_11 lies whole, across a road and a car park.

## Not shown

Planned pieces I could not find in use in any image. Treat silence as "unknown", not as approval:

- Sci-Fi City: `Building_Shack_01/02`, `Bld_Power_01/02/04` (Layout_06 may show them, but no scene does), `Prop_Overhang_01/02`, `Env_Greeble_Cube` in place, `Prop_ChargingStation_01` (not told apart from the other terminals).
- Sci-Fi Frontier: `Prop_Container_01..07`, `Bld_Wall_01/02` used as a barricade line, `Bld_Wall_Tower_01`, `Prop_Battery_03/04` (not told apart), `Prop_Fuel_Tank_01/02`.
- Nature: `Terrain_Ground_Mound_Small_02` as a cell-sized patch on hard ground (all images are natural terrain, with no paving or roads), any plant on a roof, any Nature piece on a building.
- Apocalypse: `Prop_Powerpole_Broken_*` in a scene, `Env_Overgrowth_Wall_*` told apart from the other overgrowth pieces.
- Palm City: the vines on a plain flat wall with no eave or edge above.

## Could not check

- The pages showed no sign-in, challenge or terms prompt. None of the four packs was blocked.
- The images were checked by eye at up to 1600 px. Small pieces (cameras, vents, wall boxes) are matched to names by shape, and those rows say "inferred".
- Sheets of characters, vehicles, weapons and decals were skipped, as stated per pack.
