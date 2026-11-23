# City style: Exclusions and gaps

### 16.6 Exclusions and gaps

- **Default (052)**: the City Pack's people, vehicles and everything in the table below are never used, each for the reason given. `CITY_NEVER_USED` holds the same list in code, and `styleguide.test.ts` checks the two agree and that no rule table names one. A stem ending in a star is a prefix of the pack's piece names.

| Never used | Reason |
| --- | --- |
| `SK_*` | people |
| `SM_Veh_*` | vehicles |
| `SM_Env_Skyline_*` | a skyline, about a hundred times too big at the pack's scale |
| `SM_Env_PalmTree_*` | 13.7 m high: through the wires |
| `SM_Prop_LightPole_*` | `_Base_01`, `_Arm_01`, `_CrossLights_01`, `_CrossButton_01` and `_Box_01` stand at signal junctions only, dark; every other light pole stays never used (070 TR, Josh, Q33: "I will take all of the recommendations") |
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
| `SM_Prop_Pipe_Present_*` | `_03` stands on party walls (grammar rule 8; 070 J's R12 audit), `_01` and `_02` never |
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
- **Default (070 TR)**: no street-name signs: the City Pack's plates lie flat and the Town Pack is never fetched for the city (Josh, Q35). The stop sign (drawn from the `01_A` atlas, Q42) and the parking sign stand at junctions and bay stretches (stage 9).
- **Open (waits for Josh's word on lit places, ticket 049)**: dressing never lights and is never picked, so a lit shop window, a glowing sign or a lit billboard is not in this chapter.

