# 059 · Poles, power lines and street lights on the tile city

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: approved (G1, Josh, 18 Nov 2026, in chat, relayed by the main session: "Approve 057, 058 and 059"; given on the main session's summary of the scope, before he saw this text). Every open question is at its default.
- **Exception, recorded as asked:** any change to the never-used list (16.6) is **not** decided by that approval. The default below lifts nothing. Each possible lift (Q4) is a recorded item: "default applies unless Josh objects when shown the ticket".

Stage A only (sections A1 and A2); stage B is outlined for a later ticket.
branch: `ticket/059a1-poles-wires-layout`, `ticket/059a2-poles-wires-draw`

## Josh's words
> 18 Nov 2026, on the merged tile city: "There are no streetlights either, or power lines."

Earlier, in 055:
> "Build out the use of the road tiles first. If you don't have that built out without the power lines in place, you won't be able to test and verify that things look right when they are placed on the map."
>
> "There are also models inside the city pack to showcase power lines."

## Measured (architect, 18 Nov 2026, `goal/city-style` at `793bbf7`, no browser)
**Pole slots** (055 A design item 10): one every `POLE_SLOT_PITCH_M` (12.5 m) on every pavement, `POLE_SLOT_FROM_KERB_M` (0.75 m) in from the cell edge (0.08 m behind the kerb face, E's measurement), and `POLE_SLOT_END_CLEAR_M` (2.5 m) from each block corner.

| | Default city (3 x 3, seed 1) | Seed 2 | Seed 3 |
| --- | --- | --- | --- |
| Slots | 197 | 197 | 213 |
| Street sides | 16 | 16 | 16 |
| Gaps of 12.5 m (one span) | 146 | 146 | 162 |
| Gaps across junctions | 25 to 45 m: eight each of 35, 37.5, 42.5 and 45 m | 25 to 45 m | 25 to 45 m |

**Pieces** (converted manifest; m, x by y by z):
- **City Pack:**
  - `SM_Prop_Power_Cables_01` (12.45 x 0.74 x 1.49, one fixed span), `_02` (6.36, half span), `_03` (one strand, 13.49);
  - `SM_Prop_LightPole_Base_01` (6.48 high), `_Base_02` (4.95), `_Arm_01` (a 6.28 m mast arm);
  - `SM_Prop_LightPole_Lights_01/02` and `_CrossLights_01`: traffic-signal and walk-signal heads, not lamps;
  - `SM_Prop_PowerBox_01` (1.97 x 1.90 x 0.83), `SM_Prop_SidewalkPoles_01/02` (bollards).
  - The City Pack has **no** utility pole, cross-arm, insulator, transformer or street-lamp head: its light-pole kit is a traffic-signal mast.
- **apocalypse-power** (in use today):
  - `SM_Prop_Powerpole_01`: 6.30 high, with a 2.61 m cross-arm. This is the 3D town's pole, slot `pole` in `MODEL_TABLE`.
  - `SM_Prop_LightPole_01`: 4.91 high. This is the 3D town's **puzzle lamp** post, slot `lamp`, with its head, light and pool code-drawn.
  - `SM_Prop_Transformer_01/02`, `SM_Prop_Powerpole_Line_01` (a 14.95 m span).
- **Town Pack:**
  - `SM_Prop_Streetlamp_01`: 4.37 high, a 1.72 m arm over the road; a street lamp.
  - `SM_Prop_Streetlamp_02`: 3.11 high, a post-top lamp.
  - Neither is on the never-used list (16.6 covers City Pack names).
- **Never used today** (16.6):
  - `SM_Prop_LightPole_*` ("a lamp reads as a puzzle lamp");
  - `SM_Prop_TrafficLight_*` ("red and green read as puzzle state");
  - `SM_Prop_PowerBox_*` ("reads as a puzzle part");
  - `SM_Prop_Power_Cables_*` ("conductors stay code-generated", 042 Q9).

**What the 3D town already draws** (reuse, not new code):
- `layout.ts`: `sagSpan(a, b)` (catenary, `SAG_RATIO` 0.04, `SAG_SEGMENTS` 8), `runPoints`, `shadowOf`;
- `scene.ts`: the wire tubes (`WIRE_RADIUS`), the cut-cable and Relight looks (Decided, chapter 9), the lamp head, its `PointLight` (warm) and its light pool.

## Stage A: decoration on the empty tile city (this ticket)
**Rules** (draft text for a new guide chapter 20, "Poles, wires and street lights on the tile city"; A2 writes it):
- **Decided (Josh, 18 Nov 2026):** "There are no streetlights either, or power lines." Also 041's Decided pole rule: "wooden poles of one style on the pavement, each carrying three conductors on a cross-arm".
- **Default (059): utility poles.** One `SM_Prop_Powerpole_01` (the 3D town's pole, so the one-style rule holds) stands in every pole slot of one side of each street.
  - Streets carry poles on the side **without** the parking band, so the poles stand clear of the parked bays and 056's build-outs.
  - Avenues carry them on the side whose hash says so.
  - The cross-arm runs across the street.
  - A code-drawn pole (today's fallback) stands in for it without the pack.
- **Default: wires.** Three conductors per pole, code-drawn as today's wires are: tubes on `sagSpan` catenaries between the measured cross-arm attachment points of neighbouring poles.
  - They are scenery: one dark colour, no pulses, no live or dead state.
  - The cut-cable and Relight looks are not used and not changed.
  - The pack's `Power_Cables_*` are not used (Q4).
- **Default: the corner pole rule across junctions.** The jump at a junction (25 to 45 m) is too long for the 12.5 m pitch.
  - A **corner pole** stands on each `pavementCorner` cell, 0.75 m in from both kerb faces, on the pole side.
  - The wires run last slot, then corner pole, then across the carriageway to the next corner pole, then the next block's first slot. Each span is at most 12.5 m along the pavement, and at most 25 to 30 m (one carriageway, 2 x 0.75 m in from the kerbs) across a junction.
  - A crossing span is a sagged catenary like the rest, at least `WIRE_CLEAR_ROAD_M` (5.5 m) above the carriageway at its lowest point.
  - Where two streets' pole lines meet at a corner, the corner pole is shared and its arm turns 45 degrees.
- **Default: street lights**, one model, distinct from puzzle lamps. Street lights are the Town Pack's `SM_Prop_Streetlamp_01`: an arm over the road, 4.4 m, cool white.
  - They stand in pole slots that hold no utility pole, on the far side of the street from the poles.
  - **Rate by profile:**
    - street: one light every 2 slots (25 m) on its light side;
    - avenue: one every 2 slots on both sides, staggered by one slot (so 12.5 m apart along the avenue);
    - none in a slot next to a kerb cut, a crossing landing or a bus stop, and none within `FURN_KEEP_M` of furniture.
  - **At night:** each light has a cool light pool on the road (a code-drawn decal like today's lamp pool, no `PointLight` per lamp, so the draw-call and light count stay flat), and its head glows.
  - **The rule that keeps puzzle lamps distinguishable** (for stage B):

    | | Puzzle lamp | Street light |
    | --- | --- | --- |
    | Model | the 3D town's `SM_Prop_LightPole_01` (4.9 m) with today's code head | `Streetlamp_01` with an arm |
    | Light | warm, its halo and target mark, flickers in a brownout, lit only by the circuit | cool white, no halo, no target mark, never flickers, always on at night |
    | Model shared? | never | never |

    This rule goes in chapter 8 ("Lit places") as well as chapter 20. It updates chapter 12's rule that nothing but lit places and live wires glows: street lights glow only at night, cool, and never in a puzzle's colours.
- **No pack in CI:** with no pack, poles, lights and wires are code-drawn (today's fallback shapes), and every test passes.

**Stage B (a later ticket, outline only):** the circuit and the puzzles on the 90 degree grid.
- Nodes sit on pole slots and corners, and the puzzle's wires are these wires, run along tile streets.
- Puzzle lamps follow the table above.
- The ten rebuilt puzzles follow, as 055 item 3 says.
- It inherits the slot pitch, the corner-pole rule and the attachment table from this ticket.

## Sections
- **A1. Layout, pure** (about 1 day). Poles, corner poles, spans and lights as data in a new `src/render3d/tilelines.ts`, with the checks.
- **A2. Drawing and the guide** (about 1 day). `tilecity3d.ts` draws them, reusing `sagSpan` and the 3D town's pole and wire drawing, plus the night pools, chapter 20, and the eye check. Needs A1.

## Acceptance criteria
**CI-safe (every section):** typed-in fixtures only; real-geometry checks inside an `it` that skips without `assets/private/out/`; no Windows paths; no timer under 1 s.

### A1 (Vitest, new `tilelines.test.ts`)
1. [ ] **Poles only at slots.** `tileLines(city)` returns `{ poles, spans, lights }`.
   - Every pole is at a `PoleSlot` or a corner-pole point (a `pavementCorner` cell, 0.75 m from both kerb faces), on its street's pole side.
   - Every slot on the pole side holds a pole, and no pole stands in a kerb cut, a crossing landing or a 056 build-out.
   - It holds on the default city and seeds 1 to 10 at 3 x 3 and 6 x 4.
2. [ ] **Spans join neighbours.**
   - Every span joins two neighbouring poles of one pole line: never two poles of one street side with a pole between them.
   - Its length is at most `POLE_SLOT_PITCH_M` + 1e-6 along a pavement, or at most one carriageway width + 1.5 m across a junction.
   - Each span is three conductors between measured attachment points.
   - The lowest point of each conductor's `sagSpan` is at least `WIRE_CLEAR_ROAD_M` above the carriageway over a road, and above the walk elsewhere.
   - The pole graph of each street line is one connected chain.
3. [ ] **Measured attachments.** `POLE_ARM: { arm_m: number; conductors_m: [number, number, number] }`: the `Powerpole_01` cross-arm height and the three conductor offsets along it, read from the GLB (re-measured inside an `it` within 0.02 m; pinned as a typed-in fixture).
4. [ ] **Lights.**
   - Lights stand only in non-pole slots, at the profile rates above.
   - Each is at least `FURN_KEEP_M` from furniture, kerb cuts and crossing landings.
   - No light stands within `LIGHT_POLE_MIN_M` (3 m) of a utility pole.
   - Every carriageway cell is within `LIGHT_REACH_M` (15 m) of a light, so no stretch of road is dark.
5. [ ] **Failing fixtures**, one per check:
   - a pole moved off its slot;
   - a span skipping a pole;
   - a 40 m span with no corner pole;
   - a conductor sagging under 5.5 m over a road;
   - a light in a kerb cut;
   - a road stretch out of reach.

   Each fails its check.
6. [ ] **Pure.** `tilelines.ts` imports nothing from three, the DOM, `src/grid/` or `src/night/`. The ladder maps are not touched: `layout.ts`'s functions are imported, not edited.

### A2 (Vitest unless marked)
7. [ ] **Drawn.**
   - Poles and lights are one `InstancedMesh` per key.
   - Conductors are one merged tube geometry per city, reusing `sagSpan`.
   - Night pools are one instanced decal.
   - Glowing heads come from the instanced emissive material, not lights.
   - The tile view adds at most `LINES_DRAW_CALLS_MAX` (8) draw calls and no `PointLight`.
   - With no pack, poles and lights are code-drawn.
   - Nothing raycasts.
8. [ ] **Day and night.** With 060's daylight (or `light=day`), the pools and head glow are off. At night they are on. The scene has no puzzle wire material, pulse or Relight object.
9. [ ] **Ladder maps unchanged.** The 3D view of the three protocol maps is deep-equal in its scene graph's wire, pole and lamp objects, and `npm run playtest` has no snapshot change.
10. [ ] **Guide.** `docs/city-style-guide.md`:
    - *Guide test (added 18 Nov 2026):* `styleguide.test.ts`'s "has the sixteen chapters" check lists the chapter numbers, so it must be extended to include chapter 20. That one edit to an existing check is allowed. Every constant the new text names must be exported by a module the test reads.
    - new chapter 20, with the rules above and Josh's words as **Decided**;
    - chapter 8 gains the puzzle-lamp versus street-light table;
    - chapter 12 gains the street-light glow rule;
    - 16.6 is unchanged unless Josh asked for a lift (Q4);
    - the pack table's Town Pack row gains `SM_Prop_Streetlamp_01` in use;
    - Numbers rows cover every `tilelines.ts` constant, with a drift check for it (a new check only).
11. [ ] (Main session, screenshots, `npm run dev`) Check these URLs:
    - `/?puzzle=01-first-light&view=3d&city=tiles` (night), and the same with `&light=day`;
    - `&city=tiles&cam=street&run=0` and `&run=1`, each night and day;
    - `&city=tiles&blocks=6x4&seed=3`.

    On them:
    - poles stand evenly on one side of each street, with sagging triple wires between them, crossing each junction from corner pole to corner pole;
    - street lights read as street lights, not puzzle lamps, and light the road at night;
    - nothing stands in a kerb cut or crossing.

    Then `/?puzzle=09-shrine-circuit&view=3d` reads exactly as on `goal/city-style`. Screenshots go to Josh.
12. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) `npm run gate` green and the test count grew, `npm run playtest` with no snapshot change, the diff only in Files, and `git ls-files assets/private` empty.

## Files
- **A1:** new `src/render3d/tilelines.ts`, `tilelines.test.ts`.
- **A2:**
  - `tilecity3d.ts` (drawing, the pools);
  - `tileslots.ts` (pole and light keys for the tile view);
  - `models3d.ts` (load `SM_Prop_Streetlamp_01` and the pole for the tile view only; the puzzle path unchanged);
  - `tilecity3d.test.ts`;
  - `docs/city-style-guide.md` (chapters 8, 12, 20, the pack table, Numbers);
  - `styleguide.test.ts` (the new drift check only).
- **Must not touch:**
  - `layout.ts`, `scene.ts`, `relight3d.ts`, `pick.ts`, `town.ts`, `tilecity.ts` (the slots are read, not changed), `dressing.ts`, `furniture.ts`, `citymetrics.ts` (`CITY_NEVER_USED` changes only if Josh asks, Q4, by a re-cut), `renderer.ts`;
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`.

## Dependencies
- **Needs only what is merged:** 055 A to E (slots, keep-outs, the walk level). A1 can start now.
- **056 A** adds build-outs in the parking band. Poles are on the non-parking side of streets, so they do not meet them. On avenues, A1 reads `buildout` cells as a keep-out once 056 A has merged; before that, there are none to avoid.
- **057** (varied blocks, alleys, drives) changes the slot positions, because slots follow the blocks. 059's checks are written against slots and roles, not counts, so they hold on 057's cities. Drives and alleys are kerb cuts, which slots and lights already avoid.
- **058**: none.
- **060** (daylight): 059 A2's night pools switch off in day mode. If 060 has not landed, A2 uses today's `light=day` flag.
- **Shared files:** `tilecity3d.ts` with 056 B, 057 D and 060; `models3d.ts` with 055 F, 058 B and 057 D. The main session merges one at a time, and the later branch rebases.
- No `src/core/` change, no schema or event change, no new dependency.

## Interfaces
- `tilelines.ts`:
  - constants: `POLE_ARM`, `WIRE_CLEAR_ROAD_M = 5.5`, `LIGHT_EVERY_SLOTS = 2`, `LIGHT_POLE_MIN_M = 3`, `LIGHT_REACH_M = 15`, `LINES_DRAW_CALLS_MAX = 8`, `STREET_LIGHT_COLOUR = 0xdfe8ff`;
  - `tileLines(city): { poles: { x_m; z_m; yaw; street; corner: boolean }[]; spans: { a: number; b: number; across: boolean }[]; lights: { x_m; z_m; yaw; street }[] }`.

The builder may rename any of these.

## Open questions (answered 18 Nov 2026: every default applies, "Approve 057, 058 and 059"; Q4 excepted as stated)
1. **Pole side.** Default: one side per street (the side without parking), and the hash side on avenues. Alternative: both sides of avenues.
2. **Street-light model.** Default: the Town Pack's `SM_Prop_Streetlamp_01` (an arm lamp, not on the never-used list). Alternatives:
   - its post-top `_02`;
   - code-drawn lamps.
3. **Lights per street.** Default: one every 25 m on one side of a street, and both sides, staggered, on avenues. Alternative: every slot (12.5 m), brighter and busier.
4. **Never-used list (recorded item: the default applies unless Josh objects when shown this ticket).** Default: **lift nothing**:
   - `Power_Cables_*` stay off, because conductors stay code-generated (042 Q9) and the cut and Relight are drawn on code wires;
   - `LightPole_*` stays off, because it is a traffic-signal mast and would read as a puzzle lamp;
   - `PowerBox_*` and `TrafficLight_*` stay off.

   If Josh wants any of them, each is a one-line lift in 16.6 and `CITY_NEVER_USED`, by a re-cut:
   - `Power_Cables_01` for the 12.5 m pavement spans only (they fit unscaled);
   - `PowerBox_01` as a ground cabinet at one corner per block.
5. **Transformers.** Default: none in stage A. Alternative: one `SM_Prop_Transformer_01` (apocalypse-power, in use) on a pole every few blocks.
