# City style: Exclusions and gaps

standard: yes
Scope: the City Pack pieces the town never uses, and what the packs cannot give.
Read by: facades, landscape, tech-pass
Depends on: `citymetrics.ts` (`CITY_NEVER_USED`), `docs/city-style/packs.md`, `docs/city-style/door-sills.md` (door steps, 16.10)

## Rules

### 16.6 Exclusions and gaps

- **Default (052)**: the City Pack's people, vehicles and everything in the table below are never used, each for the reason given. `CITY_NEVER_USED` holds the same list in code, and `styleguide.test.ts` checks the two agree and that no rule table names one. A stem ending in a star is a prefix of the pack's piece names.

| Never used | Reason |
| --- | --- |
| `SK_*` | people |
| `SM_Veh_*` | vehicles |
| `SM_Env_Skyline_*` | a skyline, about a hundred times too big at the pack's scale |
| `SM_Env_PalmTree_*` | 13.7 m high: through the wires |
| `SM_Prop_LightPole_*` | `_Base_01`, `_Arm_01`, `_CrossLights_01`, `_CrossButton_01` and `_Box_01` stand at signal junctions only, dark; every other light pole stays never used [D-070a] |
| `SM_Prop_TrafficLight_*` | red and green read as puzzle state |
| `SM_Prop_PowerBox_*` | reads as a puzzle part |
| `SM_Prop_Power_Cables_*` | conductors stay code-generated [D-042z] |
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

- The pack has no animal models, so nothing needs excluding for them.
- One model of a pack that is otherwise not placed is in use: the Town Pack's `SM_Bld_House_Concrete_Steps_01` (`STEPS_KEY`), the door steps of 16.10. Its sibling `SM_Bld_House_DeckSteps_01` converts to zero size (`scale-suspect`), so it is broken and not used. The City Pack's only steps, `SM_Bld_Apartment_Stairs_*`, are in the table above: far too big for a door.
- **Default (057)**: the tile city places no Town Pack piece. The gate and posts that close a gated passage (19.2) are code-drawn boxes, so the Town Pack's `SM_Env_Fence_Wood_Gate_01` and `_Post_01`, which the 057 draft named, are not placed. No piece of `CITY_NEVER_USED` is lifted, and the interiors of 19.4 use the City Pack and code only.
- **Rule [D-070b]**: no street-name signs: the City Pack's plates lie flat and the Town Pack is never fetched for the city. The stop sign (drawn from the `01_A` atlas) and the parking sign stand at junctions and bay stretches (stage 9).

## Open questions

- **Open**: no glass for apartment windows and no lit-window variant: the windows are baked into the floor pieces. Josh's rule that nothing but lit places and live wires glows (chapter 12) means a lit window would be a ticket of its own, not a dressing. Waits for: a pack that has glass windows, or a ticket that draws them in code.
- **Open**: no balconies, cornices or separate parapets; no roof railings or ladders; no roller shutters. Waits for: a pack that has them, or a ticket that draws them in code.
- **Open**: one water tower, one satellite dish and one ATM model only, so variety there comes from placement, not models. Waits for: a second model of each, or a ticket that varies them in code.
- **Open**: awnings come in five fixed shapes and colours of one texture atlas, and the roof props are one colour each. Variety of rooftops and awnings by colour is deliberately not built: it would mean new materials, and the pack's own atlas is what keeps the instancing cheap. Waits for: a recolouring ticket, or a pack with more awnings.
- **Open**: dressing never lights and is never picked, so a lit shop window, a glowing sign or a lit billboard is not in this chapter. Waits for: Josh's word on lit places (ticket 049).
