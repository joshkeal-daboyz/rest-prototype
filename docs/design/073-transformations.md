# 073 · The city's transformations: technology, the hold-out, the ruin

A plan, written by the Fable planning session on 21 Nov 2026 for Josh and the lead-architect. It is not a ticket. Nothing here is built, and nothing here is a ruling until Josh answers in chat. "073" is the next free number; the architect may change it.

- **Status.** Every rule below is **Proposed**. Lines marked **Josh's** quote him.
- **Numbers.** Piece sizes are read from `assets/private/out/manifest.json` (bounds, metres, one decimal). No threshold is set here: each pass's pre-check measures and proposes its own.
- **Scope.** No code, no `src/core/` type, no pack key table. Those are the architect's and the builders'.

## 1. Josh's words

| When | Words | What it fixes |
| --- | --- | --- |
| 21 Nov 2026, chat | "Eventually we are going to augment this city with technology from the sci-fi city pack. The city should showcase the integrated of technology followed by the desperate attempts to maintain power within districts (these changes will break rules). [...] transform this city into an apocalyptic ruin, littered with the remnants of a dying species." | Three passes, in this order: technology, the hold-out, the ruin. Rules may break; each break needs his words. |
| 21 Nov 2026, chat | "The fable session will plan all of these transformations. Not just the apocalyptic one." | This note covers all three. |
| 21 Nov 2026, chat | "The scifi power poles are intended to be atop buildings and other objects they are not intended to come out of the ground" | Sci-Fi City poles stand on roofs and objects. They belong to the technology pass. |
| 21 Nov 2026, chat | Sci-Fi City: "the iterative process on which humans build upon their city. So imagine the city as it exists today but augmented with the sci-fi city assets." | The technology pass adds to the city. It does not replace it. |
| 21 Nov 2026, chat | Sci-Fi Frontier: "the ad hoc structures that the extinct human civilization would have applied to the existing city structures"; "the way that humans might live in a post-apocalyptic world for a short period of time with the technology that they had" | The hold-out pass sits on the existing city: its roofs, courts, parks, streets. |
| 21 Nov 2026, chat | Nature: "nature growing over the roads and growing over the buildings and the existing structures in many places"; "areas of the city where nature has just taken over to some degree" | The ruin pass varies by place. It is not an even sprinkle. |
| 21 Nov 2026, chat | Palm City: "additional modern day assets that just didn't exist in the standard city pack" | Palm City is not a pass. It fills gaps in the clean city's stages. |
| 21 Nov 2026, K1 card 5 | "There are no cars anymore, if they are in use at a crossing its fine." | No traffic. Road clearance does not bind. |

## 2. The one idea

**The city has a history, and every district has its own.**

- The clean city (stages 1 to 9) is the city as it was built. It stays exactly as it is: same layers, same checks, same pinned digests.
- Three new plan stages each add one era on top: `tech`, `holdout`, `ruin`.
- One new stage before them, `history`, cuts the city into districts and gives each district a short story. The three passes read that story, so they agree with each other.

**A district's story is three numbers (0 to 1):**

| Field | Means | Drives |
| --- | --- | --- |
| `tech` | how much technology was built into it | the technology pass's density |
| `held` | how long its people kept the power on | the hold-out pass's density |
| `wild` | how long it has been left | the ruin pass's density |

- `wild` is high where `held` is low. A district abandoned early has little makeshift kit and is deep in growth. A district that held out is full of makeshift kit and only lightly overgrown.
- `tech` is highest in a few districts next to each other (a centre) and falls off outward.
- This is what makes the city read as a place with a past, rather than three sprinkles of props.

**Why districts.** K1's CK14 already makes a job's district 1 to 4 blocks that touch. Josh's words name "power within districts". If `history` cuts the city into groups of 1 to 4 touching blocks, a job can sit on one district with one story, and its feed can be that district's makeshift plant (section 6).

## 3. How it fits the pipeline

### The stage order

`streets, land, mass, edge, buildings, circuit, facades, ground, traffic,` **`history, tech, holdout, ruin,`** `assemble`

- The four new stages come after `traffic`. No clean stage reads them, so no clean digest moves (R-4) and the clean city's named runs stay green.
- Each is a pure stage like the others: own folder under `src/city/`, own sub-seed, own digest, own flat picture (R-1 to R-7 hold as written).

### The era switch

- The plan always runs all stages. The draw stage takes an era and draws the city up to it: `era=clean`, `tech`, `holdout`, `ruin`.
- Josh can step one city through its four eras from one camera spot. That is also how each pass gets judged in the browser.
- Default era: `clean` until Josh says otherwise.

### Adding and changing (the R-1 problem)

R-1 says no stage edits an earlier layer. The passes need to: a ruin has to remove a bench, break a pavement tile, topple a pole.

- Each new layer holds two lists: **adds** (new pieces, like every other layer) and **changes** (typed edits to earlier pieces, by reference).
- A change is one of: `remove`, `swap` (another key in the same place), `state` (dark, boarded, broken, toppled, cut).
- Earlier layers stay frozen. One pure helper in `src/city/pipeline/` resolves "the plan at era N": every layer up to that era with its changes applied. The draw stage and the later passes read the resolved plan.
- **For the architect:** changes need stable references to earlier pieces. Today many layer lists have no id. K's ids (`pole:…`, `span:…`, `drop:…`) are the model. Typing K's layer with ids a later layer can change is cheap now and costly later; this should reach the architect before `CityCircuitLayer` is typed.

### Checks

- **The clean city's checks judge the clean layers only.** A pass never fails a clean check and is never counted in a clean budget (`DRESS_MAX`, the tower cap, P1, the kerb checks).
- Each pass has its own checks, set by its own pre-check, on the 20 named runs.
- Two checks hold across all eras (section 8).

## 4. Pass one: technology (`tech`), Sci-Fi City pack

**The read:** the same city, a generation later. Nothing was knocked down. Things were bolted on, built over and wired up.

The pack shares the city's 5 m module, which is why this works: `Bld_Advanced_01` is 5.0 x 3.0 m (one ground storey of one cell), `Bld_Raised_01/02` 5.0 x 6.0 m, `Env_Greeble_Cube` 5 m, `Env_Railing` and `Prop_Bridge_01` 5.0 m long.

| Where | What | Pieces (size in m) |
| --- | --- | --- |
| Roofs | extra storeys built on top of existing roofs | `Bld_Raised_01/02` (5.0 x 6.0 x 5.0), `Building_Shack_01/02` (2.8 x 2.8 x 2.5), `Bld_Roof_Pagoda_02` (4.9 x 2.3 x 4.0) |
| Roofs | plant and antennas | `Prop_SatDish_01..03` (1 to 1.9), `Prop_Vent_01..04`, `Prop_Antenna` (2.0 high), `Prop_AirConditioningGrid_01` (4.9 x 2.4) |
| Roofs | the rooftop power net (Josh's ruling) | `Prop_Powerpoll_01/02` (5.1 high), spans roof to roof |
| Roofs | dead holograms | `Prop_Hologram_*` (up to 5.2 high) |
| Walls | bolt-ons above the ground storey | `Prop_WallAttach_Electronics_01..06`, `Prop_WallAttach_Vent_01..04` (0.8 x 2.2 to 3.0), `Prop_Pipes_01..03`, `Prop_AirConditioningUnit_01/02`, `Prop_Overhang_01/02` |
| Walls | new shopfronts over old ones | `Bld_Advanced_01` (5.0 x 3.0 x 0.7), `Bld_Advanced_02` (10.0 x 3.0) |
| Walls | signs and neon, dark | `Sign_01..09`, `Sign_Billboard_Border_*`; `Sign_Neon_*` once textured (all 25 are untextured today) |
| Pavement | street tech | `Prop_VendingMachine_01`, `Prop_ChargingStation_01`, `Prop_Security_Camera_01/02`, `Prop_Advertisement_Pillar_01`, `Prop_Atm_01` |
| Between roofs | walkways over lanes and alleys | `Prop_Bridge_01` (5.0 long), `Env_Railing_01/02` |
| Courts, plazas | district power units | `Bld_Power_01/02` (7.6 x 5.0 x 4.9 to 7.5), `Bld_Power_04` (1.5 x 5.5) |

**Proposed rules, in outline (the pre-check sets the numbers):**
- Density follows the district's `tech`. A low-tech district gets wall bolt-ons only. A high-tech one gets roof storeys, the roof net and walkways.
- A roof storey stands only on a flat roof run it fits, and never where stage 7 put a water tower, a roof exit or a billboard.
- The roof net: poles on roofs, spans from roof to roof, one net per high-tech district. It is separate from stage 6's street poles. Where it meets them is the hold-out's business (section 5).
- Nothing in this pass stands on the carriageway or moves a clean piece. It changes almost nothing; its changes are `swap` of a shopfront and `remove` of a roof prop it builds over.
- **Whole Sci-Fi towers are out of version one.** `Bld_Large_01..06` are 18 to 34 m high on footprints that are not the module (6.8 to 12.7 m). Placing them means replacing a building, which the grammar does not cover ("office towers").

**Known gaps:**
- 108 Sci-Fi City models are untextured (signs, ads, neon, the background buildings). The pass may only pick textured pieces until a texture ticket fixes them.
- The converter carries no emissive textures, and the plan's draw is "nothing emissive". So neon cannot glow today. That suits a dead city. Lighting signs on a relit circuit is a later ticket (section 9).

## 5. Pass two: the hold-out (`holdout`), Sci-Fi Frontier pack

**The read:** the power failed district by district. People pulled in, fortified what they could hold, and kept a little power going with whatever they had. It did not last.

| Where | What | Pieces (size in m) |
| --- | --- | --- |
| A court, park or lot in each held district | **the district's plant**: its last power source | `Prop_Generator_01` (0.8 x 1.6 x 3.1), `Prop_Solar_Panel_02..04` (3.5 to 5.6), `Prop_Battery_03/04`, `Prop_Windmill_01`, `Prop_Silo_01..04` (7 to 9.6) |
| From the plant outward | makeshift lines | `Prop_Power_Pole_01..03` (7.9 to 9.1 high, thin), ground cables `Prop_Cable_01..06` (1 to 4 long) |
| Roofs | water and power | `Prop_Solar_Panel_*`, `Bld_WaterTower_01` (7.8 x 14.2; courts only), `Prop_Fabric_01..03` |
| Courts, parks | camps | `Bld_Tent_01..03` (5 to 9 x 7.5 to 10), `Bld_Pod_01..04` (5.5 to 8.4) |
| Parks | farms | `Env_Farm_Circle_01` (13 m), `Env_Farm_Straight_01` (24 x 11), `Prop_Irrigator_01/02` |
| Front lots, plazas | markets | `Bld_Market_Stall_01..03` (5 to 10 x 4 to 6) |
| Parking stalls | stores | `Prop_Container_01..05` (2.2 to 2.7 x 3.2 to 4.5: one stall each) |
| Street mouths at the district's edge | barricades | `Bld_Wall_01/02` (2.5 and 5.0 x 1.7), `Bld_Wall_Large_01`, `Bld_Wall_Tower_01` (3.4 x 6.3) |
| Anywhere held | clutter | `Prop_Greeble_*`, `Prop_Crate_*`, `Prop_Fuel_Tank_01/02` |

**Proposed rules, in outline:**
- Density follows the district's `held`. A district with `held` near 0 gets nothing: it was left at once.
- **One plant per held district**, in its largest open place. This is the pass's centre: everything else in the district is laid out from it.
- **Makeshift lines** run from the plant to the district's street poles and roof poles, by the shortest way, on whatever stands there. This is where rules break (section 7): lines across streets, over junctions, off light posts and traffic masts.
- **Barricades** close some of the streets into a held district at its edge. A district always keeps at least one way in.
- A park in a held district becomes a farm. Its trees and benches go (`remove`).
- Excluded from the pack: its alien plants, sand, cliffs, weapons, character parts and the cantina interior.

## 6. Pass three: the ruin (`ruin`), Nature pack plus the Apocalypse ruin pieces

**The read:** everyone is gone. What they left is breaking, and the ground is taking it back.

| Where | What | Pieces (size in m) |
| --- | --- | --- |
| Carriageway | soil, grass, saplings through the road | `Terrain_Ground_Mound_Small_02` (5.1 x 5.0: one cell), `Plant_Grass_02/03`, `Plant_Undergrowth_01`, `Tree_Birch_*`, `Tree_Round_*` (3.8 to 5.4 high) |
| Pavement | growth along walls and kerbs, pebble rubble | `Plant_Fern_*`, `Plant_Bush_01/02`, `Terrain_Rubble_Pebbles_01..03`, `Terrain_DustPile_*` |
| Parks, greens | the park spills past its kerb; big trees | `Tree_Generic_Giant_01` (12.6 x 11.2), `Tree_Large_01`, `Plant_Hedge_Bush_*` |
| Walls | climbing growth | Palm City `Env_Vines_01..08` (3.7 x 3.8 x 0.7 sheets), Nature `Tree_Vines_01..04` (hanging, 1.7 to 5.1) |
| Roofs | grass and small trees on flat roofs | `Plant_Grass_*`, `Plant_Bush_*`, `Tree_Dead_*` |
| Everything left behind | the remnants | wrecks, fallen signs, dead logs (`Tree_Log_*`, `Tree_Stump_*`) |
| The grid | toppled poles, cut spans, hanging wires | `state` changes on circuit, tech and hold-out pieces |

**Proposed rules, in outline:**
- Density follows the district's `wild`.
- **Growth starts from where soil already is** (parks, greens, build-out trees, planters, farms) and spreads outward cell by cell, further where `wild` is higher. That gives edges and patches rather than noise.
- **This pass changes the most.** It removes or breaks clean street furniture, tech and hold-out pieces: benches gone, signs fallen, tents collapsed, panels broken.
- **Buildings stand in version one.** They are boarded, vined and stripped, not collapsed. A fallen building opens a gap, and the grammar's rule 6 says openings are the only gaps (section 7, a later break).
- **The broken grid is the puzzle's ground.** A cut span or a toppled pole is what a `damaged-cable` fault looks like. Outside a job's district these are dead scenery, as CK14 already says.

**The gap: damage.** The four new packs have almost none: rubble pebbles, three flat rubble decals, two broken pillars. The full Apocalypse pack has been in `assets/private/in/apocalypse-pack/` since 16 Nov (3,126 FBX) and only its power subset is converted. Its names include damaged road pieces (24), overgrowth and overgrowth edges and walls (16), an overgrown pavement (3), wrecked cars, vans and buses, barricades (15), barricaded doors (9), concrete rubble (6) and broken power poles (4). **Recommended:** convert a ruin subset of it as its own pack (as `apocalypse-power` was), before the ruin pass's pre-check.

## 7. Rules these passes break

Each needs Josh's own words before any builder acts on it. None is assumed.

| # | Rule today | Where | What the passes want | Pass |
| --- | --- | --- | --- | --- |
| B1 | Vehicles are never used | guide 16.6 | Wrecked and abandoned vehicles as remnants | ruin |
| B2 | Lamps and light posts are never used as dressing: "a lamp reads as a puzzle lamp" | guide 16.6 | Dark Sci-Fi lamps, neon and holograms as scenery | tech |
| B3 | Power boxes are never used: "reads as a puzzle part" | guide 16.6 | Generators, solar panels and batteries as each held district's plant | hold-out |
| B4 | Lines hang from power poles only; no line from a street light (071 Q12) | K1 section 1 | Makeshift lines off light posts, traffic masts and walls | hold-out |
| B5 | A line crosses a street only between junctions, never over one (Q45) | K1 CK6 | Makeshift lines by the shortest way, over junctions too | hold-out |
| B6 | Drops stay on the pole's side of the street (K1 cards 3 and 6) | K1 CK9 | Makeshift drops across a street | hold-out |
| B7 | A pavement keeps its clear walk; furniture keeps 1.5 m from poles | grammar rule 10, `FURN_KEEP_M` | Growth, rubble and barricades on the walk and beside poles | hold-out, ruin |
| B8 | Nothing taller than 3.2 m under a wire span | `FURN_MAX_H_M` | Trees growing up through dead lines | ruin |
| B9 | Street trees only in build-outs; parks keep their kerb | stage 4, stage 8 | Trees in the carriageway; parks past their kerbs | ruin |
| B10 | Rooftop items are capped (water towers 1 per 16 buildings; roof dressing counts) | H3, H3b | Many more roof items | tech, hold-out |
| B11 | Openings are the only gaps in a row (rule 6); heights follow rule 8 | grammar | Fallen buildings; Sci-Fi towers | **not in version one** |

**Not broken, on purpose:**
- **Conductors stay code-generated** (042 Q9). Makeshift and roof-net spans are drawn as today's wires are. Pack cable pieces are ground clutter only.
- **The clean city's checks, thresholds and pinned digests.** Untouched.
- **The ladder and the GDD's Decided rules.** Untouched. The architect checks the "extinct" framing against the GDD's setting at the cut; this session has not read the GDD.

## 8. What must hold in every era

Two rules the passes may never break, because the game is read from above:

- **T-1, the circuit stays readable.** No piece of any pass covers a stage 6 pole, node place or street light from above, and no canopy closes over a pole line. A tree may grow beside a line, not over it. (The palm tree is on the never-used list for this reason.)
- **T-2, every node place stays reachable.** From any pole a job could use, there is a way on foot along pavement or road to every other pole of its district. Barricades and growth never seal a pole in.

Both are measured on the resolved plan at each era, on the 20 named runs.

## 9. What else it needs

| Need | Why | Owner |
| --- | --- | --- |
| A ruin subset of the Apocalypse pack converted | section 6's gap | grid-simulator (`tools/`) |
| The untextured Sci-Fi City and Palm City pieces fixed, or a list of textured pieces to pick from | 108 and 188 untextured | grid-simulator (`tools/`) |
| Instancing (J2), on hold by Josh's word | the city is about 10,360 draw calls at 27 to 33 fps today; three passes add thousands | renderer |
| Emissive textures through the converter and the draw | only if neon should glow on a relit circuit | later ticket |
| Palm City pieces in the clean city's own tables | Josh's purpose for the pack; a matter for stages 7, 8 and 9, not for this plan | their owners |

## 10. Sections and order

Each pure section gets a pre-check first (the pipeline-designer), then its builder; each drawn section is checked in the browser at its era.

| # | Section | Owner | Waits for |
| --- | --- | --- | --- |
| A | Types: the four layers, adds and changes, references, the era option, the resolver's contract | lead-architect | Josh's answers |
| B | `history`: districts and their stories; the flat picture | planner | A |
| C | The resolver and the era switch in the draw stage and the viewer | planner, renderer | A |
| D1 | `tech` walls and pavement | new owner | B |
| D2 | `tech` roofs: storeys, plant, the roof net | new owner | B, K2 |
| D3 | `tech` drawn | renderer | D1, D2, C |
| E1 | `holdout` plants and makeshift lines | new owner, with the grid-simulator | D2, K2, the breaks Josh allows |
| E2 | `holdout` camps, farms, markets, stores, barricades | new owner | B |
| E3 | `holdout` drawn | renderer | E1, E2, instancing |
| F0 | Apocalypse ruin subset converted | grid-simulator | Josh's word |
| F1 | `ruin` growth: ground, walls, roofs | new owner | E2, F0 |
| F2 | `ruin` remnants and the broken grid | new owner, with the grid-simulator | E1, K2 |
| F3 | `ruin` drawn | renderer | F1, F2 |

- B, C, D1 and E2 need nothing from the circuit and can start as soon as A is typed.
- D2, E1 and F2 need K2's typed circuit layer.
- **Owners.** Three new agents are proposed, one per pass, each with one folder (`src/city/tech/`, `holdout/`, `ruin/`). New agents need Josh's word, as the first five did.

## 11. Questions for Josh (recommended answer first)

1. **Districts with stories.** Cut the city into districts of 1 to 4 blocks, each with its own `tech`, `held` and `wild`, so held-out districts are full of makeshift kit and early-abandoned ones are deep in growth? **Yes.** The other way is the same density everywhere.
2. **The era switch.** Keep the clean city untouched and add the eras on top, with a switch to view clean, technology, hold-out or ruin? **Yes.**
3. **The breaks.** Which of B1 to B10 do you allow? **B1 to B6 and B10 as written; B7 to B9 for the ruin and hold-out passes only, under T-1 and T-2.**
4. **The Apocalypse ruin pieces.** Convert a ruin subset of the Apocalypse pack? **Yes.**
5. **Buildings stand.** No fallen buildings and no Sci-Fi towers in version one (B11)? **Yes, later.**
6. **Districts and jobs.** Should a puzzle's district be one of these history districts by default, and its feed that district's plant? **Yes.**
7. **Instancing.** Lift the hold before the hold-out is drawn? **Yes.**
8. **Three new owner agents**, one per pass? **Yes.**
9. **Neon.** Dark in every era for now; glowing on a relit circuit as a later ticket? **Yes.**
