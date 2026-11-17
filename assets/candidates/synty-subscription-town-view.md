# Candidates: what to download from the Synty subscription for the 3D town view

Date: 17 Nov 2026. Four needs in one file (roads, power lines, landmark buildings, building variety) because the same packs answer several of them.

## Josh's words (17 Nov 2026)

"You don't have to make your own curbs. Rely on the asset agent to tell me to download road asset packs from the subscription I purchased. Powerlines can be generated from the asset packs too." and "The objects being lit are still just squares. Can we light up buildings from the asset pack instead?"

## Read this first: how far to trust the page details

- **Synty's product pages could not be opened.** syntystore.com answered every `/products/...` fetch (about 15 tries over the session, three URL variants) with HTTP 429. Pack contents, counts and formats below come from search-engine summaries of those pages (searches limited to syntystore.com), plus the Fab listing for the City Pack and the Unity Asset Store listings (both opened, both thin). Every such line is marked "summary". Prices are not shown because the subscription makes them moot. Open the page, or the pack's own documentation after download, before relying on a name.
- **What I did open and read:** Synty's [Standard Subscription Licence](https://syntystore.com/pages/standard-subscription-licence), the [licences overview](https://syntystore.com/pages/licences-overview), the [Fab City Pack listing](https://www.fab.com/listings/d38cfdd2-8dcf-4dd8-b9d4-83663129bb02), and the Unity Asset Store pages for Fantasy Village and Simple Buildings.
- **What is already converted (read from `assets/private/out/manifest.json`, so these numbers are real):** SIMPLE Town in full (about 190 meshes) and a subset of POLYGON Apocalypse (`apocalypse-power`, 90 meshes). I do not repeat them as new downloads. Where they already answer a need I say so.
- Earlier file `assets/candidates/synty-store.md` assumed the one-time-purchase licence. Josh has the subscription, so the licence section below replaces that part. Its format findings still hold. Its list of one-time prices no longer matters.

## Subscription, licence, formats (apply to every pack below)

- **Tier.** The Synty Pass / All Access Pass is described (summary of the store page, which I could not open) as covering the whole Synty library of 130+ packs, every POLYGON pack included, with the Sidekick character creator. Neither the POLYGON nor the SIMPLE pack pages, as summarised, carry any per-pack tier label. So treat every pack named here as inside the subscription, and confirm on the pack page when you open it.
- **Licence.** [Standard Subscription Licence](https://syntystore.com/pages/standard-subscription-licence), read today (summarised by the fetch tool, not word for word):
  - Commercial games allowed. No credit requirement mentioned.
  - Forbidden: AI training or generation, stock-art redistribution, NFTs, content-creation systems, selling assets standalone.
  - **Source files, public repositories and web builds: the page does not address them.** It only says the licence is non-transferable and non-sublicensable and that standalone distribution of the assets is prohibited. Synty's own answer would be licensing@syntystudios.com. Josh's 16 Nov ruling stands in the meantime: nothing from these packs goes in the public repo, and no deployed build serves the GLBs without the password gate.
  - Seats: one login per authorised user (anyone who touched the assets or product in the last 30 days). Whether the agent crew counts is not addressed.
  - **When the subscription ends:** you lose the assets, may not use them in new IP, and may only do minor fixes to a shipped product. Keep it active while the town view is being built, or buy the few packs you keep outright (one-time licence is perpetual).
- **Formats.** Every pack page lists, per the summaries, a Unity package, an Unreal project, **FBX source files** and on newer packs a Godot project. **No GLB anywhere.** The existing Blender conversion pass already does this for SIMPLE Town and Apocalypse (manifest says Blender 5.3.0, per-pack `pack.json` with scale and texture overrides), so each new pack is another entry for that pass, not new tooling. Scale will need a per-pack value (SIMPLE Town needed 100, Apocalypse 1; POLYGON packs not confirmed).
- **Style.** POLYGON is flat-colour low-poly on one atlas per pack. SIMPLE is a simpler, more cartoon version of the same idea. Apocalypse is a weathered POLYGON pack. None is a baked-daylight look that I know of; none states it.

## Order to download (the answer)

First batch, all inside the subscription:

1. **POLYGON - Town Pack.** Largest set of distinct small-town buildings (need 4) and the only POLYGON pack described as shipping road and pavement tiles for a town (need 1).
2. **POLYGON - City Pack.** Its "Modular Road Set" (need 1) and modular shop fronts, apartments, offices, city hall (need 4). The Construction Pack's page says its pieces mix with City and Town, which suggests they share a scale and atlas style; not confirmed.
3. **SIMPLE Buildings - Cartoon City.** Church and town hall, 14 buildings, in the same SIMPLE style as the SIMPLE Town already in the scene (need 3, and a little of need 4).

Second batch, only if the first leaves gaps:

4. **POLYGON - Fantasy Village** if the shrine, well and bell tower must be real models (need 3). It is the only pack whose summary names a bell tower.
5. **POLYGON - Adventure Pack** for market stalls and a well (need 3).

**Do not download anything for power lines.** What the game needs is already converted from Apocalypse (see need 2).

**Roads: nothing is strictly required from a new pack.** The converted SIMPLE Town has a kerbed road kit and separate pavement strips; Apocalypse has flat 5 m road tiles. Packs 1 and 2 add more variety and, in Town Pack's case, pavement tiles, but none gives odd-angle junctions (need 1, below).

One check to run on every first import before downloading the next pack: do the windows exist as separate meshes or as paint on the atlas (see "Lighting buildings")?

---

## Need 1: Roads (straight, curve, T, four-way, kerbs, pavements, crossings, markings, grid, odd angles)

### What is already converted and what it gives

From the manifest (sizes are metres after conversion, read as bounding boxes, not seen on screen):

| Piece | Size (m) | Tris | Notes |
| --- | --- | --- | --- |
| SIMPLE Town `road_straight_mesh` | 5 wide x 10 long, 0.19 high | 25 | Raised, so it carries a kerb edge. Lane markings are in `Road.png`. |
| SIMPLE Town `road_corner_mesh` | 10 x 10, 0.19 high | 14 | 90 degree corner |
| SIMPLE Town `road_t_mesh` | 20 x 20, 0.19 high | 85 | T junction |
| SIMPLE Town `road_square_mesh` | 5 x 5, flat | 2 | Plain tile; usable as junction filler |
| SIMPLE Town `road_cornerLines_mesh` | 20 x 20, 0.19 high | 172 | Lines for a corner or junction; I could not tell which from the bounds |
| SIMPLE Town `road_bend_left_mesh` / right | 5 x 10, 0.19 high | 34 | A bend within one tile; turn angle not stated |
| SIMPLE Town `road_Roundabout`, `road_LaneTransition_Left/Right`, `road_crossing_center_mesh`, `roadLane_*_Centered`, `road_divider_mesh` | various | 14 to 176 | Roundabout, lane change, zebra crossing, dividers |
| SIMPLE Town `path_straight_mesh` | 2.8 wide x 10 long, 0.19 high | 16 | **Separate pavement strip.** This is the "kerb" Josh means. |
| SIMPLE Town `path_cross_mesh`, `path_driveway` | 10 x 10 | 128 | Pavement crossing, driveway |
| Apocalypse `SM_Env_Road_01..04`, `_Crossing_01..03`, `_Lines_01/02`, `_YellowLines_01/02`, `_Median_01/02`, `_Parking_*`, `_Corner_End_02`, `_Bare_01` | 5 x 5, **flat (height 0)** | 2 to 84 | No kerb geometry; markings and edges are painted on `PolygonApocalyse_Road_01.png`. `SM_Env_Street_Divider_01` is 0.2 m high. |

No four-way road piece is named in either set. Nothing in the manifest is a Apocalypse sidewalk; the pack's page says it has sidewalks (summary), so they are in the part of the pack not converted.

### How odd-angle streets would work (my judgement, not tested)

- Every kit above is a 90 degree grid kit built on 5 m tiles. No Synty pack I found offers a piece that turns by an arbitrary angle.
- **A straight piece can face any direction** (rotate about the vertical axis). **Stretching it along its length is safe**; stretching its width distorts the kerb and lane lines, so keep width at 1.
- **At a junction of streets that meet at odd angles:** lay the straights so they overlap, put a flat tarmac tile (`road_square_mesh` or `SM_Env_Road_Bare_01`, 2 triangles each) under the overlap, and run `path_straight` strips along both sides for the kerb and pavement. The overlap will show where road markings cross. That is a visual compromise to judge on screen, not a solved case.
- For gentle changes of direction, the SIMPLE Town bends may help; check their turn angle on import.
- If the overlaps look bad, the fallback is a road-surface mesh generated in code from the street's line, with the pack's pavement strips as the kerbs. That keeps "no hand-made curbs" true.

### Packs

1. **Already owned: SIMPLE Town road and path kit.** No download. Best fit now: a real raised kerb and a separate pavement strip, on the same atlas as the buildings already in the scene.
2. **POLYGON - Town Pack** (https://syntystore.com/products/polygon-town-pack). Summary: "garden, pavement and road tiles"; a version 1.8.5 fix for a sidewalk tiling problem implies sidewalks exist. 99 environment assets in total. Names, dimensions and kerb height not confirmed. Formats Unity 2022.3, Unreal, Godot, FBX source files (summary). Style: POLYGON flat colour. Download for the buildings (need 4); the roads are a bonus to check.
3. **POLYGON - City Pack** (https://syntystore.com/products/polygon-city-pack). "Modular Road Set" and a "bridge road" (summary and Fab page, which I opened). Fab page lists 331 unique assets with 4 alternative colours each, 8 traffic-light props, a bus stop, 2 subway entrances. Sidewalk and crossing pieces not itemised; I could not tell if kerbs are modelled. Formats Unity 2022.3, Unreal 5.3, FBX source files (summary).
4. **Apocalypse sidewalks and highways (already in Josh's account).** Summary of the store page: about 240 environment pieces including roads, sidewalks, tunnels, highways. Only the flat road tiles are converted. Converting the sidewalk pieces needs no new download if the full pack is on his machine; the local `in/apocalypse-power` folder holds only the subset, so he would have to re-extract. Weathered look.

### Looked at and not worth a download for roads

| Pack | Why not |
| --- | --- |
| POLYGON - Shops Pack | Environment (67 pieces) lists roads, crossings, dividers, sidewalks, car-park tarmac (summary), but the pack is mostly interior shop stock. Revisit only if Town and City lack pavements. |
| POLYGON - Palm City, Police Station, Military | Roads and sidewalks listed (summary); wrong look (tropical resort, police compound, military). |
| POLYGON - Construction Pack | Dirt roads only (summary). |
| POLYGON - Street Racer / Pro Racer | Race-track environments; no town street kit. |
| SIMPLE Roadwork | Vehicles and props only (summary). |

---

## Need 2: Power lines (poles, cross-arms, insulators, transformers, wires)

### Already converted: this need is mostly met

From the manifest, Apocalypse `apocalypse-power` (metres, triangles read from the file):

| Mesh | Size | Tris | Use |
| --- | --- | --- | --- |
| `SM_Prop_Powerpole_01` | 6.3 m tall, 2.6 m cross-arm span | 621 | The main pole with cross-arm. |
| `SM_Prop_Powerpole_Single_01` | 6.3 m tall, 0.43 m wide | 112 | Plain pole, no cross-arm; cheap to instance. |
| `SM_Prop_Pole_01` | 7.7 m tall | 240 | Plain tall pole. |
| `SM_Prop_Powerpole_Preset_01/02/03` | 30.8 m span, 6.3 m tall | 2107 to 2563 | Poles with their wires already strung. |
| `SM_Prop_Powerpole_Line_01`, `_Lines_01` | 14.95 m span, sag 0.88 m | 216 | A fixed wire span, bundle of three-ish wires. |
| `SM_Prop_Powerpole_Single_Line_01/02` | 14.95 m span, sag 0.70 / 0.58 m | 36 / 68 | A single wire span. |
| `SM_Prop_Powerpole_Broken_01..04`, `_Single_Broken_01` | like the intact ones | 1084 and up | Fallen or snapped poles for the broken-cable moment. |
| `SM_Prop_Transformer_01/02` | about 2.1 x 3.2 x 2.5 m and 2.9 x 3.2 x 2.5 m | 2750 / 1436 | By size these are **ground-standing** units, not pole-mounted. A pole-mounted transformer is not in the subset. |
| `SM_Prop_PowerBoxes_01/02` | 3 m tall, thin | 528 / 216 | Cabinets; the lever and load bar still have to be code. |
| `SM_Bld_Pylon_01`, `_Lines_01`, `_Broken_*` | tower pylon | not read | Large transmission pylon for the feed edge. |

### Answers to Josh's questions

- **Do poles exist in the packs?** Yes, already converted. No further download is needed for poles.
- **Cross-arms and insulators:** they are part of the pole mesh, not separate pieces. I found no pack that ships them separately.
- **Wires:** the pack's wire spans are fixed 15 m pieces with the sag baked in. They are **not useful** for this game. The game draws its own live and dead wires in code (`wireLayout`, per `synty-store.md`), at spans that vary, with colour and break states. Use the poles and cross-arms only, and keep the code wires. (If the poles are all spaced exactly 15 m apart the span meshes could fit; the streets are not that regular.)
- **Pole-mounted transformers, insulators as separate objects:** not found in a pack I could verify. Palm City and Military list "powerboxes, powerlines" (summary) but no transformers by name. Gap: if a transformer on a pole is wanted, build it in code from a box and a cylinder, or use `SM_Prop_Transformer_02` on the ground beside a pole.
- **Style risk:** these are the weathered Apocalypse atlas. Beside the clean SIMPLE Town buildings the pole may look scruffy. Judge in a test scene; if it clashes, the substitute is a pole from a cleaner pack I could not name from the pages.

### Packs to download for power lines

None. Optional only: POLYGON - Palm City ("Powerboxes, Powerlines" in the props list, summary) and POLYGON - Military Pack (same, summary). Both are the wrong look and Apocalypse already covers the need.

---

## Need 3: Landmark buildings that must read as shrine, chapel/church, well, gate, bell tower, market stall, house

Already converted, relevant: Apocalypse `SM_Bld_Church_01` (16.5 x 12.3 x 17 m, 7071 triangles, heavy) and SIMPLE Town `town_hall_mesh` (23.5 x 28 x 14.8 m, 1378 triangles), `memorial_mesh` (124 triangles), `grave_*`, `Building_House_01..15`, `fence_*`. So "church" and "house" are covered; the rest is shrine, well, gate, bell tower, market stall.

### Recommended (best first)

**1. SIMPLE Buildings - Cartoon City** (https://syntystore.com/products/simple-buildings-cartoon-city)
- Publisher: Synty Studios. Licence: subscription, above. Formats: Unity 2021.3 package, Unreal 4.25 project, FBX source files (summary).
- Covers: 14 buildings including a **church** and **town hall** (the town hall and petrol station in two colours each), police and fire stations, burger, ice cream and donut shops, a shop with apartments above, five generic buildings in three colours each (summary). Mobile-ready.
- Missing: shrine, well, gate, bell tower, market stall.
- Weight: Unity Asset Store listing shows 1.3 MB; triangle counts not stated. Style: SIMPLE cartoon low-poly, the same family as the SIMPLE Town already in the scene.
- Above the next because it is cheap, tiny, and should drop into the existing pipeline and look; the next pack is the only one with a bell tower, but it is a different style and a large download.

**2. POLYGON - Fantasy Village** (https://syntystore.com/products/polygon-fantasy-village)
- Publisher: Synty Studios. Formats: Unity 2022.3 package (Unity listing: 301.6 MB, version 1.0.2, 18 Sep 2026), Unreal, FBX source files (summary).
- Covers (summary): **bell tower, well, water pump, shrines and a shrine set, windmill, fountain, towers**, a town centre, cottages, farmland; "15+ preset modular buildings", "1,000+ prefabs" (one summary; not confirmed).
- Missing: market stall and gate not named in the summary.
- Style: POLYGON period-fantasy low-poly, new (Sep 2026). A medieval look beside a modern town; Josh to judge from the page screenshots.
- Above the next because it names the most of the list (bell tower, well, shrine) in one place.

**3. POLYGON - Adventure Pack** (https://syntystore.com/products/polygon-adventure-pack)
- Publisher: Synty Studios. Formats not seen; the Synty pattern is Unity, Unreal, FBX source files.
- Covers (summary): **market stalls**, farm stalls, **a well**, modular village buildings (13 building entries), homesteads, sheds, fences.
- Missing: church, shrine, bell tower, gate not named.
- Style: POLYGON fantasy-adventure low-poly, older.
- Last of the three because it covers the fewest of the missing landmarks, but it is the one that names market stalls.

### Also looked at

| Pack | Link | One line |
| --- | --- | --- |
| POLYGON - Knights Pack | https://syntystore.com/products/polygon-knights-pack | "Modular Church pieces x18", a well, 56 modular house pieces, 38 castle pieces, 204 assets; market area in screenshots (summary). Best if the church should be modular and a chapel size. Medieval. |
| POLYGON - Samurai Empire | https://syntystore.com/products/polygon-samurai-empire | Torii gates, wells, lanterns, shrines, gates, bridges, 775+ prefabs (summary). The only literal "gate" and "shrine"; strongly Japanese. |
| POLYGON - Western Pack | https://syntystore.com/products/polygon-western-pack | Church x1, well x1, water tower, windmill, saloon, jail (summary). Small-town feel; frontier look. |
| POLYGON MINI - City Pack | https://syntystore.com/products/polygon-mini-city-pack | Hall, church, houses, stores, road tiles in hex and cube shapes, 272 assets; mobile scale (summary). Different scale from the full packs. |
| POLYGON - Dark Fantasy | https://syntystore.com/products/polygon-dark-fantasy | Cathedral demo scene, bells, church organs (summary). Grim gothic. |
| POLYGON - Fantasy Kingdom | https://syntystore.com/products/polygon-fantasy-kingdom | 600+ castle and house pieces, 794 props including market and shop props, 2,100 prefabs; no church, gate, bell tower or well line item in the summary. |
| SIMPLE Fantasy | https://syntystore.com/products/simple-fantasy-cartoon-assets | Summary mentions a monastery and shrines in cartoon style; not otherwise checked. |

### Gaps

- **Gate:** nothing verified for a town gate apart from Samurai torii gates and a Western town arch (MINI Fantasy, summary).
- **Chapel:** church pieces exist (Apocalypse, SIMPLE Buildings, Knights); a small chapel is not named anywhere.
- **Shrine:** only in Fantasy Village, Samurai Empire (summary). A shrine in a modern tribe-run town may be best as a small prop plus the game's own marker.

---

## Need 4: More building variety for a modern small-town street

Already converted: SIMPLE Town has 15 numbered houses (`Building_House_01..015`, 788 triangles for the first), 5 shops (`Building_Shop_01..05`, 278 triangles for the first), plus garage, mall, cinema, police and petrol station and various `*_mesh` offices and apartments. The video-rental complaint comes from repeats of the same few shop meshes.

### Recommended

**1. POLYGON - Town Pack** (https://syntystore.com/products/polygon-town-pack)
- Publisher: Synty Studios. Formats: Unity 2022.3, Unreal 5.3, Godot 4.5.1, FBX source files (summary). Unity download 133.5 MB (installed size, not browser weight).
- Covers (summary of the page): **125 building assets**, a **modular house kit with preset houses**, suburban homes with front gardens, a convenience store, 412 props, 99 environment pieces including pavement and road tiles, home interiors, vehicles, townspeople.
- Missing: poles, street lights, church not confirmed.
- Style: POLYGON flat colour atlas; modular kits give variety by combining pieces. Triangle counts not stated.
- Above the next because it is the only pack built around ordinary houses.

**2. POLYGON - City Pack** (https://syntystore.com/products/polygon-city-pack) (Fab page opened)
- Publisher: Synty Studios. Formats on Synty's page (summary): Unity 2022.3, Unreal 5.3, FBX source files.
- Covers: Modular Apartment Set, Modular Shop Fronts (5 shop covers), Modular Modern Office and Vintage Office Buildings, Modular Park Set, City Hall, a station building, 33 billboards and signs, 7 modular vents, 4 air-conditioning units, 3 fire escapes. 331 assets with 4 alternative colours each.
- Missing: houses (it is a city, not a suburb).
- Style: POLYGON flat colour, older pack, rather urban. Shop fronts that are modular and recolourable should break up the rental-store repetition.
- Above the next because it is cheap and varies colour for free; the next has more houses but is heavier.

**3. POLYGON - Apocalypse Pack, buildings not yet converted** (https://syntystore.com/products/polygon-apocalypse-pack)
- Already in the subscription, no new download; only conversion. Summary: about 30 complete buildings including apartments, church, diner, motel, three house variants, a burnt house, shops (small x3, medium x2, large x2), house trailers, warehouses, and about 150 modular pieces.
- Converted subset only has Apartment_01, Cafe_01, Church_01, Commercial_Large_01 (and pylons). Triangle counts of those are high (3,380 to 7,071 each), which is heavy for a browser if many are shown.
- Weathered and damaged look; Josh to judge.

### Also looked at

| Pack | Link | One line |
| --- | --- | --- |
| POLYGON - Palm City | https://syntystore.com/products/polygon-palm-city | 309 building pieces, 419 props; tropical resort look. |
| POLYGON - Construction Pack | https://syntystore.com/products/polygon-construction-pack | "26 house exterior presets", modular high-rise and house systems; works with City and Town (summary). Construction-site props are off theme. |
| POLYGON - Shops Pack | https://syntystore.com/products/polygon-shops-pack | Shop interiors mostly. Not for the street. |
| SIMPLE City - Cartoon Assets | https://syntystore.com/products/simple-city-cartoon-assets | Buildings, landmarks, demo scene; "landmarks from the United States". No roads. Unchecked beyond the summary. |

---

## Lighting buildings (Josh's second request): what the packs tell us

- **Apocalypse buildings arrive with separate window meshes**: `SM_Bld_Apartment_Glass_01` (260 triangles), `SM_Bld_Cafe_01_Glass_01` (202), `SM_Bld_Commercial_Large_01_Glass_01`. A separate glass mesh can be given its own emissive material and switched on and off. That is the cleanest route to "this building is lit". The church has no separate glass mesh in the manifest.
- **SIMPLE Town buildings are one mesh with windows painted on the shared atlas** (`SimpleTown.png`). Lighting them means an emissive copy of the atlas, a window overlay, or a point light near the building, a rendering decision for the lead-architect, not a pack property.
- **POLYGON Town and City packs:** I could not find whether windows are separate meshes. Check on first import: a building that has a separate "glass" or "window" material or mesh is a better candidate than one that doesn't.

## Gaps (all four needs)

- A road piece at an arbitrary angle, and a junction where streets meet at odd angles: no pack has one.
- Separate cross-arms and insulators; a pole-mounted transformer.
- A town gate and a chapel: nothing verified.
- All page-derived contents above are unverified by me against the live pages (429 block).

## Josh's decision

