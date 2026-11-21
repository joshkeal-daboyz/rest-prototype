# 071 · Power lines and poles from the packs: one pole and wire kit for the ladder and the pipeline city

owner: per section (pipeline-designer for A; renderer for B and C)
status: open (first cut, 21 Nov 2026; waits for Josh's G1 and his answers to the questions below)
branch: `ticket/071a-power-kit-precheck` (A, a design note only), `ticket/071b-power-kit` (B), `ticket/071c-ladder-pack-lines` (C)

## Josh's words (21 Nov 2026, in chat)
> "I would like to replace all the power lines with the power lines from the city pack. Same with the power poles."

Later in the same chat, on reading the puzzle from the city camera:
> "Seeing as how the camera hovers over the city, my thought is that the player will not be able to tell the difference between different components of the puzzles unless they zoom in up close. So the HUD will showcase the components as a 2D overlay on top of the 3D City"
>
> "The 2D overlay will showcase the icons that represent each component type"

He also said he will look over the models in both packs himself and pick the ones that fit the puzzle components.

**How this ticket reads them.** Poles and wires are how the city looks. Telling the puzzle's components apart is the 2D overlay's job: one icon per component type, drawn over each component's 3D position. That overlay is not in this ticket. It goes in ticket 070's K4 (see "The overlay" below). The 3D models of breakers, switches and fuse boxes become set dressing at city scale. Which pack keys stand for them waits for Josh's picks (the open table below).

## Where poles and wires are drawn today (read on `goal/city-style` at 12fc1f9)
**The ladder's 3D view** (`?puzzle=<id>&view=3d`, tickets 037 and 041) is the only place that draws any:
- **Layout, pure: `src/render3d/layout.ts`.**
  - `wireLayout(puzzle)` gives one `WireRun` per line. Poles are evenly spaced at most `POLE_SPACING` (3 units) apart. Each run with an intermediate pole has three conductors at `PHASE_OFFSET` (0.22). Attachments are at `POLE_HEIGHT` (1.6).
  - `sagSpan` draws a parabola with `SAG_RATIO` 0.04 and `SAG_SEGMENTS` 8.
  - `breakOf` and `WireBreak` make the cut: every conductor is cut in one span, the ends hang by `HANG_DROP`, and the gap is `BREAK_GAP`.
  - `shadowOf`, `dropLayout` and `canLayout` give the shadows, the service drops and the transformer cans.
- **Drawing: `src/render3d/scene.ts`** (the "poles, conductors and drops" block, about lines 540 to 845).
  - **Poles.** Code-drawn placeholder poles and cross-arms are one `InstancedMesh` each (`POLE_WOOD`). Insulators, cans and drops are code-drawn (`PoleHardware`).
  - **Wires.** Every conductor is a code tube (`WIRE_RADIUS` 0.03). The drawing has:
    - a dead `whole` mesh;
    - a live `overlay` whose draw range grows for the Relight;
    - a `bead` and a `spark`;
    - two hanging `halves` for a damaged cable;
    - flat black `shadows` strips at `SHADOW_Y`;
    - an invisible pick line on the centre conductor (`pickKind: "wire"`, `WIRE_PICK_RADIUS`) plus break pick boxes.
- **Pack swap: `src/render3d/models.ts` `MODEL_TABLE` and `src/render3d/models3d.ts` `applyModels`.**
  - When the pack is present, slot `pole` is **`apocalypse-power:SM_Prop_Powerpole_01`**, scaled uniformly to `POLE_HEIGHT` by `modelScale`. That is 1.6 / 6.303 = 0.254 units per metre, against the buildings' 0.18, so the ladder's poles stand about 8.9 m.
  - The pole is turned by `poleYaw`. It replaces the placeholders at every `PoleSpot`.
  - Slot `lamp` is `apocalypse-power:SM_Prop_LightPole_01`, the puzzle lamp's post. This ticket does not touch it.
  - **The wires are code-drawn in every case.** No pack line piece is used anywhere (guide 9, 042 Q9).
- **Behaviour that depends on the wires.** All of these read `WireRun` and the code meshes:
  - wire picking (`pick.ts`);
  - the live look, which is brighter, glows, breathes and carries a bead (Decided, guide 12);
  - the cut and its spark (Decided, guide 9: "the cut on a damaged cable and the Relight keep their looks");
  - the Relight cascade (`relight3d.ts`, the overlay's draw range);
  - sag and shadows;
  - the drops and cans.
  - These tests must pass unchanged: `live.test.ts`, `relight3d.test.ts`, and the break and conductor tests.

**The old tile city (`city=tiles-old` after L1) and the pipeline city (`city=plan`, `city=tiles` after L1) draw no pole and no wire.**
- `tilecity.ts` only reserves `poleSlots`, at a 12.5 m pitch chosen as "one `Power_Cables_01` span (12.45 m) and a pole".
- `tilecity3d.ts`'s scene has empty wire, pole and hardware lists.
- `plan3d.ts` draws nothing for stage 6, and `CityCircuitLayer` is a stub.
- Ticket 059 was approved but never built. Stage 6's drawing is 070 K3.

**The 2D view** (`src/render/`) is out of scope. Josh's words name the 3D models.

## What the packs have (`assets/private/out/manifest.json`, read 21 Nov 2026)
**The City Pack (`city-pack`) has no utility pole.**
- Its power pieces are `SM_Prop_Power_Cables_01` (12.45 x 0.74 x 1.49 m), `_02` (6.36 m, half a span) and `_03` (a single strand, 13.49 m long and 0.064 m thick).
- It also has `SM_Prop_PowerBox_01`.
- Its only other poles:
  - `SM_Prop_LightPole_Base_01/02` and `_Arm_01`: traffic-signal masts;
  - `SM_Prop_Billboard_Pole_01`;
  - `SM_Prop_SidewalkPoles_01/02`: bollards.

**Every `SM_Prop_Powerpole_*` name is in POLYGON Apocalypse (`apocalypse-power`).** The ladder already uses this pack. Its pieces:
- `_01` (6.30 m, a 2.61 m arm);
- `_Single_01` (6.30 m, no arm);
- `_Broken_01..04` (6.31, 6.33, 4.63 and 2.63 m high);
- `_Single_Broken_01`;
- `_Line_01` and `_Lines_01` (both 14.95 x 0.88 x 2.37 m);
- `_Single_Line_01/02` (14.95 m, one strand);
- `_Preset_01..03` (30.8 m: poles with lines strung);
- `SM_Prop_Pole_01` (7.68 m, a bare post), `SM_Prop_Poles_01` (0.75 m, a barrier);
- `SM_Prop_PowerBoxes_01/02`, `SM_Prop_Transformer_01/02`;
- `SM_Prop_LightPole_01` (the puzzle lamp post).

The Town Pack has `SM_Prop_ElectricalCover_01` and `SM_Prop_PowerPlug_01`. Neither is a pole or a line.

So "the power poles from the city pack" cannot be followed literally (Q1).

## The cut, in short
- **One kit, two views.** Section B writes a pure module, `src/render3d/powerkit.ts`, with the measured pole and line pieces in metres.
  - It fits a line piece to any span between two attachment points, with the sag the view asks for.
  - It also says which pole stands where (plain, end, broken).
  - The ladder (C) and the pipeline city (070 K3) both draw with it. Each view supplies only its scale and its spans:
    - the ladder: its `WireRun`s, at the pole scale of 0.254 units per metre;
    - the city: `CityCircuitLayer`'s spans, at `WORLD_PER_METRE`.
- **Poles: pack poles.** On the ladder, `SM_Prop_Powerpole_01` stays (it is the POLYGON power pole, Q1).
  - It is placed so that its measured insulator tops meet the wires at `POLE_HEIGHT`. This is 042 D's pending item: the scale is set from the insulator height, not the pole's top.
  - The code-drawn insulators are hidden where the pole model has its own (A measures whether it does).
  - The code placeholder pole stays as the fallback when there is no pack (CI).
- **Wires: three single-strand pack pieces per span.** This is the default, option 1 below. Each conductor of each span is one pack strand instance, stretched along its length to the span's chord and scaled vertically so that its lowest point meets `sagSpan`'s.
  - The default piece is the City Pack's `SM_Prop_Power_Cables_03`. That honours "from the city pack" and the Decided "three conductors on a cross-arm" (guide 9), at any arm spacing.
  - Fixed lengths are handled by stretching. Every ladder span is at most 3 units (11.8 m at pole scale), so one piece covers it at a stretch of 0.9 or less.
  - A city span across a junction (25 to 30 m in 059's measure) is two pieces end to end, or one stretched about 2 times. A measures which looks right (Q3).
  - **What stays code-drawn**, because its behaviour is Decided:
    - the live overlay, which glows, breathes, and grows for the Relight;
    - the bead and the spark;
    - the two hanging halves at a cut (the cut span's pack pieces are hidden);
    - the pick line;
    - the flat shadow strips;
    - the drops and cans.
  - The dead look becomes the pack strand instead of the code `whole` tube. Pack strands cast no shadow, and nothing new raycasts.
  - With no pack, today's code tubes draw, so CI and the ladder's tests see today's scene.
- **The options for wires, for Josh (Q2):**
  1. **Pack strands fitted per span, code overlay for state** (the default above). It looks like the pack wherever a wire is dead. The live, Relight and cut looks keep their Decided code shapes over or instead of it.
  2. **Code catenary wires with the pack's cable material and thickness.** All behaviour is untouched and it is the cheapest. The wire's shape stays the code's, so Josh may not see "the city pack's lines".
  3. **A fixed pack span piece per span** (`Power_Cables_01` or apocalypse `Powerpole_Line_01`, three conductors in one mesh). Its conductor spacing is fixed: 1.49 m for `Cables_01` against `Powerpole_01`'s 2.61 m arm (A measures the insulators). It fits the pipeline city's 12.5 m pitch unscaled, but needs stretching and a z-scale on the ladder. A cut cannot cut one conductor of it, so the whole piece is hidden in the cut span.
- **Faults.**
  - The cut keeps its Decided look (all three conductors cut in one span, `HANG_DROP`, `BREAK_GAP`, the spark).
  - The pack's broken poles (`Powerpole_Broken_01..04`, `_Single_Broken_01`) are **not** used for a puzzle fault in this cut. A damaged cable is a span, not a pole. A pole on a puzzle line that looks broken would read as a fault the player cannot repair, and `Broken_03` and `_04` are too short to carry wires.
  - Q4 offers Josh two uses: as city dressing off the puzzle's lines, or beside the cut span as an extra cue (a change to a Decided look, so his to make).
- **K3 (070) uses this kit.** 070's K3 outline now says so: stage 6's poles and wires are drawn through `powerkit.ts`, so the ladder and the city share one pole and one wire.

## Guide rules this touches (Josh's to change; nothing here changes them until he says)
- **16.6, the never-used list (Default 052).** `SM_Prop_Power_Cables_*` is listed: "conductors stay code-generated (042 Q9)". Options 1 and 3 need it lifted: one line in 16.6 and in `CITY_NEVER_USED` (`citymetrics.ts`), in section C.
  - Josh's words ask for the city pack's lines, which reads as that lift. It is still put to him as Q5 because 059 recorded that any change to this list needs his explicit word.
- **Guide 9, Default 042 Q9:** "conductors stay code-generated ... Pack line meshes (`*_Lines_*`, `*_Preset_*`) are never used." Josh's new words overtake this Default. C rewrites the line, quoting him.
- **Guide 9, Decided 041:** "wooden poles of one style on the pavement, each carrying three conductors on a cross-arm." The default keeps it: one pole key, three strands. Option 3 keeps it only if A finds three conductors in the piece.
- **Guide 9 and 12, Decided 042 and 037:**
  - "the cut on a damaged cable and the Relight keep their looks";
  - "a live wire differs from a dead one by more than colour";
  - "poles are painted at least 3:1 in luminance against the street" (`POLE_WOOD`).
  - The cut, the Relight and the live look stay code-drawn and unchanged.
  - **The 3:1 pole contrast** was pinned on a code colour. A must measure the pack pole's texel luminance against the pipeline city's carriageway and the ladder's `STREET`. If it is under 3:1, that is Q6, not a silent pass.
- **16.6, `SM_Prop_LightPole_*` ("a lamp reads as a puzzle lamp") and `SM_Prop_PowerBox_*` ("reads as a puzzle part")** are not touched. Josh asked for poles and lines, not lamp posts or boxes.
  - Josh's coming component picks may want a power box for a fuse box or breaker. With the overlay doing the reading, "reads as a puzzle part" may stop being a reason to exclude it. That is his to lift, in the component table's own ticket.
- **The brief's "Rules carried over"** are grid rules. None is touched, so `tickets/rules-coverage.md` is unchanged.

## The overlay (Josh's later words; owned by 070 K4, not this ticket)
- **Owner: the renderer, in 070's K4** ("play on the plan"). The overlay is drawn by the 3D map renderer over its own canvas, through the same `MapRenderer3d` interface. So `src/play/` and `src/ui/` do not change, and `hitTest` picks an icon before a 3D object.
  - **What `ui` owns:** the HUD's DOM (parts, targets, prompts). `ui` would own the overlay only if Josh wants it as DOM HUD elements rather than drawn by the view. The recommendation is the view, because it moves with the camera every frame.
  - **Placement:** the overlay belongs on the ladder's 3D view as well, since the same camera problem holds there. That can be cut as soon as Josh says (Q8), with no wait on stage 6.
- **Icons to reuse.**
  - **Component glyphs.** `src/render/map-renderer.ts` draws each component type's glyph in canvas code: the feed's bolt, the breaker, the switch and its chevron, the fuse bar, the junction, the battery (`battery.ts`), the lamp circle with its load, the target star and the tribe's ribbon (`drawNode`, `drawLamp`, `drawRibbon`). They live inside `createMapRenderer`'s closure, so the overlay needs them first moved into an exported pure module (for example `drawNodeGlyph(ctx, type, state, x, y)`). The renderer owns `src/render/` too, so that is K4's own first step and needs no second owner.
  - **Part icons.** `src/ui/` has `PART_ICON_SVG` (bulb, fuse, wire; ticket 021) and the control icons. These are parts, not components, so they are not reused for the overlay.
- **Decided rules the overlay touches:**
  - **Guide 12 (037):** state never reads by colour alone; breakers and switches read by lever shape and position; the target star is filled or hollow; the fuse reads by its bar.
    - At city scale those reads move to the overlay. So the overlay's icons carry state as well as type: the breaker's lever up or down, the switch's chevron, the fuse's bar, the lamp lit or dark, the target filled or hollow. Each icon carries this by shape as well as colour, as the 2D glyphs already do.
    - Whether the icons carry state, or only type with state left in 3D, is Q7.
  - **The brief's "What the player sees"** describes the 2D schematic. That is description, not a Decided rule. The overlay is the same vocabulary on the 3D view and changes no rule.
- **The component model table (open; waits for Josh's picks).**

  | Component | 3D model (pack key) | Josh's pick |
  | --- | --- | --- |
  | feed | code-drawn today | open |
  | breaker | code-drawn today | open |
  | switch | code-drawn today | open |
  | fuse box | code-drawn today | open |
  | junction | code-drawn today | open |
  | battery | code-drawn today | open |
  | lamp | `apocalypse-power:SM_Prop_LightPole_01` post, code head | open |
  | pole | `apocalypse-power:SM_Prop_Powerpole_01` | this ticket, Q1 |
  | wire | code tubes | this ticket, Q2 |

## Sections, and the order against L1
L1 (`ticket/070l1-switch`) touches `renderer.ts`, `plan3d.ts`, `planview.ts`, `tileslots.ts`, the header comments of `tilecity3d.ts`, `docs/city-style-guide.md`, `docs/city-grammar.md` and `styleguide.test.ts`.
- **A** writes only a design note. It can run now, alongside L1.
- **B** creates two new files. It can run now, alongside L1, once A's numbers are in.
- **C** edits the guide and `styleguide.test.ts`. It **branches from `goal/city-style` after L1 merges**.
- **070 K3** draws stage 6 with B's kit. It needs B merged, and K2.

Order: **A → Josh's answers → B (alongside L1) → L1 merges → C → (K1, K2) → K3.**

### A · The asset pre-check (pipeline-designer; a note, no code). Branch `ticket/071a-power-kit-precheck`
It writes `docs/design/071-power-kit-precheck.md` and measures from the GLBs, outside the repo (as its instructions say), for every candidate piece. Pieces: `SM_Prop_Powerpole_01`, `_Single_01`, `_Broken_01..04`, `_Single_Broken_01`, `_Line_01`, `_Lines_01`, `_Single_Line_01/02`, `_Preset_01..03`, and the City Pack's `SM_Prop_Power_Cables_01/02/03`.

**Poles:**
1. Height to the top. Height of each insulator top or attachment point. Each attachment point's offset along the arm from the pole's axis, and its offset from the axis across the arm. Which axis the arm runs along. Whether the model carries its own insulators.
2. The pole's foot: its footprint, and where the origin is (at the base, and centred?).
3. The broken poles: which of them can still carry wires (attachment height, arm still there), and how each reads from the ladder camera and from `cam=street`.
4. Each pole's texel luminance against the ladder's `STREET` and the City Pack carriageway, and the ratio. The Decided bar is 3:1.

**Line pieces:**

5. Conductors per piece, and their spacing across the piece.
6. Length end to end. Where the ends are relative to the origin: their height and their across offset. Do the ends of `_Line_01` and `_Lines_01` meet `Powerpole_01`'s insulators exactly, and how do the two differ?
7. The sag profile of the centre strand: its lowest point under the chord, as a fraction of the length, at nine evenly spaced points. Compare it with `sagSpan`'s parabola at `SAG_RATIO` 0.04: the residual after a vertical scale fit, in metres.
8. Cable thickness, as a cross-section radius in metres, against `WIRE_RADIUS` at each view's scale:
   - the ladder: 0.03 units = 0.118 m at pole scale;
   - the city: 0.03 units = 0.167 m at 0.18.
   Is the true thickness visible from the ladder camera and from `cam=street`? If not, by how much must the cross-section be scaled up?
9. Triangles per piece. The draw calls the ladder's longest map and the 6 x 6 seed 1 city would add as one `InstancedMesh` per key.
10. Material: the atlas texel colour of the cable, and whether it is dark enough to read as dead against `DEAD_WIRE` (0x2a3445) while the live overlay is drawn over it.

**Spans:**

11. The ladder's span lengths, from `wireLayout` over every ladder map: their spread in units and in metres at pole scale. The stretch factor each candidate piece would need, with its smallest and largest.
12. The pipeline city's span lengths, if K1 has not given them, from 059's measure: 12.5 m along a pavement and 25 to 45 m across a junction. Whether one stretched piece or two chained pieces read better across a junction (a look question for Josh, with a picture if the probe can make one).

**Not measured:** the overlay, the component models, the 2D view.

### B · The kit, pure (renderer). Branch `ticket/071b-power-kit`
**Goal.** One pure module says how a pack pole stands and how a pack line piece hangs between any two attachment points. The ladder and the pipeline city draw from the same tables.

**Acceptance criteria (Vitest, new `src/render3d/powerkit.test.ts`).**
1. [ ] **Measured tables.** `POWER_POLES` and `POWER_LINES` (typed-in, in metres, from A's note) each have the fields A measured: attachment points, height, conductor count and spacing, length, end points, sag fraction and radius. Inside `it.skipIf(!have)`, each is re-measured from the GLB within 0.02 m (0.005 m for the radius).
2. [ ] **A span is fitted.** For any `a` and `b` with `sagSpan`'s lowest point, `fitLine(piece, a, b, sagRatio, scale)` gives a transform. Its ends land on `a` and `b` within 0.01 m, and its lowest point on `sagSpan`'s within A's residual plus 0.01 m. It is tested on level spans of 0.5x, 1x and 2x the piece's length, a span with one end 1 m higher, and a span along each axis and a diagonal.
3. [ ] **Long spans.** A span longer than `LINE_STRETCH_MAX` (from Q3; default 1.25 x the piece length) is fitted as the fewest pieces end to end that each fit. The joins are continuous within 0.01 m and the whole follows one `sagSpan`.
4. [ ] **The pole meets the wire.** `placePole(pole, spot, attachY, scale)` gives a transform. Its measured centre attachment is at `attachY` above the spot within 0.01 m, and its arm runs across the run within 0.5 degrees. Each outer attachment is at `±PHASE_OFFSET` within A's measured difference (reported, not asserted, if A finds the arm wider than `2 x PHASE_OFFSET`; that is Q6's re-check of `WIRE_PICK_RADIUS`).
5. [ ] **Failing fixtures.** A piece fitted backwards, a span of length 0, a pole whose attachment is off by 0.1 m: each fails its check or throws a named error.
6. [ ] **Pure.** `powerkit.ts` imports only `./layout` (types and `sagSpan`). No three, no DOM, no other `src/` folder. It is copyable as `layout.ts` is.

**Files.** New `src/render3d/powerkit.ts` and `src/render3d/powerkit.test.ts`. Nothing else.
**Tests the builder runs:** `npx vitest run --maxWorkers=2 src/render3d/powerkit.test.ts` and one `npx tsc --noEmit`.

### C · The ladder drawn with the kit (renderer; after L1 merges). Branch `ticket/071c-ladder-pack-lines`
**Goal.** Josh opens any ladder map at `?puzzle=<id>&view=3d` with the packs present. The poles are the pack's and the dead wires are the pack's line pieces. Live wires, the Relight and a cut cable look and play exactly as today.

**Acceptance criteria.**
1. [ ] **Pack wires when the pack is there (Vitest, `scene.test.ts` or a new `packlines.test.ts`).**
   - With a fake model set holding the line piece, every span of every conductor of every `WireRun` has one instance of the piece. The instances are one `InstancedMesh` per key.
   - Each instance's fitted ends equal the run's attachment points within 0.01 units.
   - Each line's `whole` code tube is hidden.
   - Nothing new has `pickKind` or raycasts.
   - Pack instances cast no shadow, and the flat strips stay.
2. [ ] **Code wires without it (Vitest).** With `NO_MODELS`, the scene is deep-equal to today's in its wire, pole and hardware objects.
3. [ ] **Decided looks unchanged (Vitest).** These pass unedited: `live.test.ts`, `relight3d.test.ts`, the break and conductor tests in `layout.test.ts` and `scene.test.ts`, and `pick.test.ts`.
   - On a damaged cable the cut span's pack instances are hidden and the code halves and spark show.
   - The live overlay is drawn over the pack piece (radius at least the piece's fitted radius + 0.005 units).
   - If an existing test asserts `whole.visible` on a dead wire, the builder stops and reports. That is a re-cut, not an edit to the test.
4. [ ] **The pole (Vitest).** `applyModels` places `Powerpole_01` through `placePole`, so its centre attachment is at `POLE_HEIGHT`. Code insulators are hidden on a pack pole if A found the model carries its own; otherwise they stay.
5. [ ] **The guide (Vitest `styleguide.test.ts`; the reviewer reads the diff).**
   - Guide chapter 9: the 042 Q9 Default line becomes Josh's words of 21 Nov 2026 as **Decided**, naming the piece and the kit.
   - 16.6 and `CITY_NEVER_USED` lose `SM_Prop_Power_Cables_*` **only if Josh answered Q5 yes**.
   - The pack table's `city-pack` row gains the piece in use.
   - The Numbers rows cover `powerkit.ts`'s constants.
   - No other line changes meaning.
6. [ ] **Josh in the browser** (`npm run dev`):
   - `/?puzzle=01-first-light&view=3d`, `/?puzzle=09-shrine-circuit&view=3d` and a map with a damaged cable, each with and without `light=day`;
   - poles and wires read as the pack's;
   - a live wire still glows, breathes and carries its bead;
   - the Relight still runs down the wires;
   - the cut still hangs and sparks;
   - a click on any conductor still picks the line.
7. [ ] **The playtester:** `npm run playtest` shows no ladder change (no grid file is touched).

**Files.**
- `src/render3d/scene.ts` (the wire and pole block only);
- `src/render3d/models.ts` (`MODEL_TABLE`: a `line` slot, and `modelScale` for it);
- `src/render3d/models3d.ts` (`applyModels`: the line instances and `placePole`);
- `src/render3d/citymetrics.ts` (`CITY_NEVER_USED`, only on Q5 yes);
- their tests, new cases only;
- `docs/city-style-guide.md` (chapter 9, 16.6, the pack table, Numbers) and `src/render3d/styleguide.test.ts`.

**Must not touch:**
- `layout.ts`, `relight3d.ts`, `pick.ts`, `town.ts`, `terrace.ts`, `tilecity*.ts`, `plan3d.ts`, `renderer.ts`;
- `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/city/`;
- `puzzles/`, `tests/`, `tools/`, `package.json`, `assets/`, `tickets/`.

**Tests the builder runs:** `npx vitest run --maxWorkers=2 src/render3d/scene.test.ts src/render3d/live.test.ts src/render3d/relight3d.test.ts src/render3d/pick.test.ts src/render3d/models.test.ts src/render3d/styleguide.test.ts` plus its new test file, and one `npx tsc --noEmit`.

**CI-safe (every section):** typed-in fixtures; GLB reads only inside `it.skipIf`, lazily; no Windows paths; no timer under 1 s.

## Interfaces
- **No `src/core/` change.** The kit is internal to `src/render3d/`. The overlay's types (an icon per component type, its state, its screen position) are written into `src/core/` by the architect when K4 is cut, if `src/ui/` or `src/play/` must read them. The recommended design keeps them inside the renderer.
- `powerkit.ts` (B; the builder may rename):
  - `POWER_POLES: Record<string, { height_m; attach_m: { along: number; across: number; up: number }[]; ownInsulators: boolean }>`;
  - `POWER_LINES: Record<string, { length_m; conductors: number; spacing_m; radius_m; sag: number; ends: ... }>`;
  - `LINE_STRETCH_MAX`;
  - `fitLine(...)`, `placePole(...)`.
- **No new dependency.**

## Open questions (for Josh, most important first)
1. **The poles: the City Pack has no power pole.** Every `SM_Prop_Powerpole_*` is POLYGON Apocalypse's, and the ladder already uses its `Powerpole_01`. The City Pack's only poles are traffic-signal masts (never used: "a lamp reads as a puzzle lamp"), a billboard pole and bollards.
   - Recommended: keep `Powerpole_01` and fit it to the wires properly (B4, C4).
   - Ask: "The City Pack has no utility pole. Its 'poles' are traffic-signal masts. The power poles you may have seen are from the Apocalypse pack we already use. Keep the Apocalypse power pole (`Powerpole_01`), or use another of its poles (`_Single_01`, no cross-arm)?"
2. **The wires: which option?**
   - Recommended: option 1, three City Pack single strands (`Power_Cables_03`) fitted per span, with the live and Relight looks drawn over them in code.
   - The alternatives:
     - option 2: code wires with the pack's cable colour and thickness;
     - option 3: one three-conductor piece per span, either the City Pack's `Power_Cables_01` or the Apocalypse `Powerpole_Line_01`, which is made for that pole.
3. **Long spans.** Across a city junction (25 to 30 m): chain two pieces, or stretch one? Recommended: chain above 1.25 x the piece length, after A's picture.
4. **Broken poles.**
   - Recommended: not on puzzle lines, so a cut stays the one fault look.
   - The alternatives:
     - as city dressing off the puzzle's lines (a new guide rule);
     - beside a damaged cable as an extra cue (changes a Decided look).
5. **Lift `SM_Prop_Power_Cables_*` from the never-used list?** Options 1 and 3 need it. Your words read as yes. Ask: "Lift the City Pack cables from the never-used list, yes or no?"
6. **If A finds the pack pole under the Decided 3:1 contrast, or its arm wider than the wires' spacing:** keep the pack pole as it is, or tint it? A reports first, so this is asked only if it is needed.
7. **The overlay icons.** Do they carry state as well as type? Recommended: yes, by shape as the 2D glyphs do (breaker lever, switch chevron, fuse bar, lamp lit or dark, target filled or hollow). Then the Decided "state never reads by colour alone" holds at city scale.
8. **The overlay on the ladder's 3D view too?** Recommended: yes, cut now as K4's first part (the ladder has the game state today). The city follows when stage 6 has nodes.
9. **The component models.** The table above stays open until you have looked over both packs.
