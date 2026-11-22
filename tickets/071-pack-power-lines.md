# 071 · Power lines and poles from the packs: one pole and wire kit for the ladder and the pipeline city

owner: per section (pipeline-designer for A; renderer for B, C and E; grid-simulator for D)
status: open. G1 given (Josh, 21 Nov 2026, in chat: "Start 071,K1&L2"). Re-cut the same day for the four packs of ticket 072. Sections D and E are proposed in this re-cut and start only on Josh's answers to Q13 and Q14.
branch: `ticket/071a-power-kit-precheck` (A, a design note only), `ticket/071b-power-kit` (B), `ticket/071c-ladder-pack-lines` (C), `ticket/071d-power-glbs` (D), `ticket/071e-ladder-overlay` (E)

## Josh's words (21 Nov 2026, in chat)
> "I would like to replace all the power lines with the power lines from the city pack. Same with the power poles."

Later in the same chat, on reading the puzzle from the city camera:
> "Seeing as how the camera hovers over the city, my thought is that the player will not be able to tell the difference between different components of the puzzles unless they zoom in up close. So the HUD will showcase the components as a 2D overlay on top of the 3D City"
>
> "The 2D overlay will showcase the icons that represent each component type"

He also said he will look over the models in the packs himself and pick the ones that fit the puzzle components.

**G1:** "Start 071,K1&L2" (21 Nov 2026, in chat).

**Josh's direction since the first cut** (relayed in `docs/handoff-2026-11-21.md`, item 2):
- The City Pack has no power poles. Its own look strings its `Power_Cables_*` from `SM_Prop_LightPole_*` street lights.
- A "makeshift mix" of poles and lines from several packs suits the post-apocalyptic setting. That breaks Decided 041 "one pole style", so it is his call (Q10).
- The player reads the components from a 2D icon overlay (070 K4). He is choosing the component models himself.

**How this ticket reads them.** Poles and wires are how the city looks. Telling the puzzle's components apart is the overlay's job: one icon per component type, drawn over each component's 3D position. With the overlay doing the reading, the poles may vary. The wires keep their Decided live, Relight and cut looks, because those show state.

## What changed in this re-cut (21 Nov 2026)
- **Four more packs are converted** (ticket 072). Palm City and Sci-Fi Frontier have real utility poles and line pieces. Sci-Fi City has two short poles. The inventory below lists them, and A measures them alongside the Apocalypse and City Pack pieces.
- **The four new packs' textures may still change.** 072's texture-alias re-runs are in progress. Sizes are final. A's luminance and colour items, and its picture sheet, wait for those re-runs to end.
- **L1 has merged** (78e66f9). C no longer waits on it.
- **A load fact the first cut missed.** Pages load each GLB whole (`models3d.ts`, `GLTFLoader`). `palm-city-pack.glb` and `sci-fi-frontier-pack.glb` are 103 MB each. A pole from either would cost that file on every page load, phones included. That is why D is proposed (Q13).
- **The mix (Q10).** B's kit now holds a list of poles and lines, and a pure rule for which stands where. It is no longer one pole key.
- **The overlay on the ladder (Q14).** With varied poles, the ladder's reading should move to the overlay when the poles change. E is proposed as 071's own section. It would build the overlay module that 070 K4 reuses on the city.
- **Questions.** The first cut's Q1 to Q9 were never answered. Q10 to Q14 below replace them. The rest became defaults (see "Defaults"), or are asked only if A finds a problem (Q15, Q16).

## Where poles and wires are drawn today (read on `goal/city-style` at 12fc1f9; unchanged at cf7d78c)
**The ladder's 3D view** (`?puzzle=<id>&view=3d`, tickets 037 and 041) is the only place that draws any:
- **Layout, pure: `src/render3d/layout.ts`.**
  - `wireLayout(puzzle)` gives one `WireRun` per line. Poles are evenly spaced at most `POLE_SPACING` (3 units) apart. Each run with an intermediate pole has three conductors at `PHASE_OFFSET` (0.22). Attachments are at `POLE_HEIGHT` (1.6).
  - `sagSpan` draws a parabola with `SAG_RATIO` 0.04 and `SAG_SEGMENTS` 8.
  - `breakOf` and `WireBreak` make the cut: every conductor is cut in one span, the ends hang by `HANG_DROP`, and the gap is `BREAK_GAP`.
  - `shadowOf`, `dropLayout` and `canLayout` give the shadows, the service drops and the transformer cans.
- **Drawing: `src/render3d/scene.ts`** (the "poles, conductors and drops" block, about lines 540 to 845).
  - **Poles.** The code-drawn placeholder poles and cross-arms are one `InstancedMesh` each (`POLE_WOOD`). Insulators, cans and drops are code-drawn (`PoleHardware`).
  - **Wires.** Every conductor is a code tube (`WIRE_RADIUS` 0.03). The drawing has:
    - a dead `whole` mesh;
    - a live `overlay` whose draw range grows for the Relight;
    - a `bead` and a `spark`;
    - two hanging `halves` for a damaged cable;
    - flat black `shadows` strips at `SHADOW_Y`;
    - an invisible pick line on the centre conductor (`pickKind: "wire"`, `WIRE_PICK_RADIUS`), plus break pick boxes.
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

**The pipeline city (`city=tiles`, `city=plan`) and the old tile city (`city=tiles-old`, until L2) draw no pole and no wire.**
- `tilecity.ts` only reserves `poleSlots`, at a 12.5 m pitch chosen as "one `Power_Cables_01` span (12.45 m) and a pole". L2b deletes it after K1.
- `plan3d.ts` draws nothing for stage 6, and `CityCircuitLayer` is a stub. Stage 6's drawing is 070 K3.
- `plan3d.ts`'s R12 audit (`planAudit`) **throws** on any key that `isNeverUsed` names. A city drawing of `SM_Prop_Power_Cables_*` or `SM_Prop_LightPole_*` fails it unless the key is lifted (Q11, Q12).

**The 2D view** (`src/render/`) is out of scope for poles and wires. E only moves its glyph code into an exported module. The 2D view's drawing does not change.

## What the packs have (`assets/private/out/manifest.json`, read 21 Nov 2026; width x height x depth, m)
| Pack (GLB size) | Poles | Line pieces | Other |
| --- | --- | --- | --- |
| `apocalypse-power` (9.8 MB; the ladder loads it today) | `SM_Prop_Powerpole_01` (6.30 m, a 2.61 m arm; **the ladder's pole today**), `_Single_01` (6.30 m, no arm), `_Broken_01..04` (6.31, 6.33, 4.63, 2.63 m), `_Single_Broken_01`; `SM_Prop_Pole_01` (7.68 m, a bare post) | `SM_Prop_Powerpole_Line_01`, `_Lines_01` (14.95 x 0.88 x 2.37), `_Single_Line_01/02` (14.95 m, one strand), `_Preset_01..03` (30.8 m, poles with lines strung) | `SM_Prop_PowerBoxes_01/02`, `SM_Prop_Transformer_01/02`, `SM_Prop_LightPole_01` (the puzzle lamp post) |
| `city-pack` (23 MB; the pipeline city loads it) | None. Its `SM_Prop_LightPole_Base_01/02` and `_Arm_01` are signal masts and street lights. Stage 9 (070 TR) lifted `Base_01`, `_Arm_01`, `_CrossLights_01`, `_CrossButton_01` and `_Box_01` for `traffic` pieces only, always dark. The rest stay listed (`docs/design/070-TR-traffic-precheck.md`). | `SM_Prop_Power_Cables_01` (12.45 x 0.74 x 1.49), `_02` (6.36 m), `_03` (one strand, 13.49 m long, 0.064 m thick). All three are on the never-used list. | `SM_Prop_PowerBox_01` (listed) |
| `palm-city-pack` (103 MB) | `SM_Prop_Powerpole_01` 2.22 x 8.99 x 0.35, `_02` 2.22 x 9.01 x 0.40, `_03` 2.62 x 10.83 x 3.06 | `SM_Prop_Powerline_01..08` (~7.7 m spans), `_09` 1.93 x 5.3 x 1, `SM_Prop_Powerline_Bundle_01..04` (~1 m) | `Powerbox_01`, `PowerBox_02..04`, `PowerBoxes_01..03` |
| `sci-fi-frontier-pack` (103 MB) | `SM_Prop_Power_Pole_01` 0.42 x 8.72 x 0.37, `_02` 0.52 x 9.14 x 0.52, `_03` 0.88 x 7.86 x 0.32; `Tether_Pole_01`; `Cable_Stand_01` | `SM_Prop_Cable_12..16` (~12 m spans), `_01..11` (short), `_17/18` 1.43 x 6.52 x 10.62; `Tether_Line_01/02` | `Cable_Junction_01` |
| `sci-fi-city-pack` (35 MB) | `SM_Prop_Powerpoll_01/02` ~1.6 x 5.07 x 1.16 | `SM_Prop_Cables_01..03` (73 m, `scale-suspect`) | |

The Town Pack has `SM_Prop_ElectricalCover_01` and `SM_Prop_PowerPlug_01`. Neither is a pole or a line. The Nature Pack has neither.

**Same names across packs.** Palm City's `SM_Prop_Powerpole_01` and Apocalypse's are different models with the same name. Every key in this ticket is `pack:name`.

## The cut, in short
- **One kit, two views.** B writes a pure module, `src/render3d/powerkit.ts`. It holds the measured pole and line pieces of the list Josh picks from A's sheet, in metres.
  - It fits a line piece to any span between two attachment points, with the sag the view asks for.
  - It says which pole stands at which spot (the mix rule, Q10).
  - The ladder (C) and the pipeline city (070 K3) both draw with it. Each view supplies only its scale, its spots and its spans:
    - the ladder: its `WireRun`s, each pole fitted to `POLE_HEIGHT` at its own attachment (041 Q3: poles are the scale exception);
    - the city: `CityCircuitLayer`'s spans, at `WORLD_PER_METRE`, each pole at its true size. Mixed pole heights then give spans with one end higher, which `fitLine` handles.
- **Poles: a mix, if Josh says so (Q10).** The recommended answer is a short list of poles that carry a cross-arm. Josh picks them from A's sheet, and each spot gets one by `stableHash` of the spot's id. Every puzzle line still carries three conductors on a cross-arm (Decided 041). An armless pole joins the list only if A finds three attachment points on it. With Q10 "no", the list is one pole and the rule is trivial.
  - Each pole is placed so that its measured attachment tops meet the wires. This is 042 D's pending item: the scale is set from the attachment height, not the pole's top.
  - The code-drawn insulators are hidden on a pole whose model has its own (A measures each).
  - The code placeholder pole stays as the fallback when there is no pack (CI).
- **Wires: pack single strands, three per span, one piece per line (Q11).** Each conductor of each span is one instance of a pack strand. It is stretched along its length to the span's chord and scaled vertically so that its lowest point meets `sagSpan`'s. All spans and conductors of one line use one piece, so a line reads as one line. Different lines may use different pieces if Josh picks more than one.
  - **What stays code-drawn**, because its behaviour is Decided:
    - the live overlay, which glows, breathes, and grows for the Relight;
    - the bead and the spark;
    - the two hanging halves at a cut (the cut span's pack pieces are hidden);
    - the pick line;
    - the flat shadow strips;
    - the drops and cans.
  - The dead look becomes the pack strand instead of the code `whole` tube. Pack strands cast no shadow, and nothing new raycasts.
  - With no pack, today's code tubes draw, so CI and the ladder's tests see today's scene.
- **Load (Q13, D).** Say Josh picks pieces from Palm City or Sci-Fi Frontier. D then converts only the picked models of that pack into a small GLB, `out/<pack>-power.glb`. Its manifest entry is `<pack>-power`, with the names unchanged, just as `apocalypse-power` is already a subset pack. `MODEL_TABLE` and the kit name those keys, never the 103 MB packs.
- **The overlay on the ladder (Q14, E).** One icon per component is drawn over each component's projected 3D position, on the ladder's 3D view, by the view itself. The glyphs come from `src/render/map-renderer.ts`, moved first into an exported module. 070 K4 reuses E's module on the city.

## Defaults (this cut takes them; Josh can overturn any)
- **Broken poles are never on a puzzle line.** A damaged cable is a span, not a pole. A broken-looking pole on a puzzle line would read as a fault the player cannot repair. `Broken_03` and `_04` are also too short to carry wires. Using them as city dressing off the lines would be a K or I question, not this ticket's.
- **The overlay's icons carry state as well as type**, by shape, as the 2D glyphs do: the breaker's lever, the switch's chevron, the fuse's bar, the lamp lit or dark, the target filled or hollow. That keeps Decided guide 12 ("state never reads by colour alone") true at overlay scale. It adds no new rule, so it is not a question.
- **Sci-Fi City's 73 m `SM_Prop_Cables_*` are out**, because they are `scale-suspect`.
- **Long city spans** (25 to 45 m across a junction) are chained from the fewest pieces that each fit within `LINE_STRETCH_MAX` (1.25 x the piece length). A shows a picture of chained and stretched spans, and Josh may choose otherwise on seeing it.
- **The pole contrast** (Decided 037, 3:1 against the street) is measured per pole by A. A pole under 3:1 goes to Josh (Q15). It is never a silent pass.

## Guide rules this touches (Josh's to change; nothing here changes them until he says)
- **Decided 041 (guide 9):** "lines are wooden poles of one style on the pavement, each carrying three conductors on a cross-arm."
  - With Q10 "yes", "of one style" becomes Josh's words of the mix, quoted.
  - "Three conductors on a cross-arm" stays under the recommended answer.
  - "Wooden": Sci-Fi Frontier's poles may be metal. If Josh picks one, C rewords "wooden", quoting his pick.
- **Default 042 Q9 (guide 9):** "conductors stay code-generated ... Pack line meshes (`*_Lines_*`, `*_Preset_*`) are never used." Josh's first words overtake this Default. C rewrites the line as Decided, quoting him and naming the pieces and the kit. `_Preset_*` (poles and lines in one mesh) stays unused, because the kit places poles and lines apart.
- **16.6, the never-used list (Default 052), and `CITY_NEVER_USED`:**
  - `SM_Prop_Power_Cables_*` is lifted only if Josh picks a City Pack cable (Q11).
  - `SM_Prop_LightPole_*` is lifted for circuit pieces only if Q12 is "street lights". That lift is separate from TR's traffic-only allowance and must not overlap it.
  - The new packs' power pieces match no stem on the list, so C adds nothing for them.
- **Decided 037 and 042 (guides 9 and 12):** the cut and the Relight keep their looks, and a live wire differs from a dead one by more than colour. These stay code-drawn and unchanged.
- **Decided 037, the 3:1 pole contrast**, was pinned on a code colour (`POLE_WOOD`). A measures each pack pole (Q15).
- **16.6, `SM_Prop_PowerBox_*`** ("reads as a puzzle part") is not touched. Josh's component picks may lift it in the component table's own ticket.
- **The brief's "Rules carried over"** are grid rules. None is touched, so `tickets/rules-coverage.md` is unchanged.

## How 071 lines up with 070 (070 is not edited here; its architect or the main session carries these)
- **K1 (being cut now, puzzle-designer).**
  - (a) The pole slot pitch need not stay 12.5 m. The kit fits any span from 0.5x to `LINE_STRETCH_MAX` x a piece's length, and chains above that. K1 may choose its pitch on the circuit's own grounds. A's note gives the candidate pieces' lengths: Palm `Powerline_*` ~7.7 m, Sci-Fi Frontier `Cable_12..16` ~12 m, City Pack `Cables_03` 13.49 m.
  - (b) Q12 decides whether a city line hangs from street lights, so that a pole slot is also a lamp, or from power poles with lamps apart. That changes K1's slot rules, so K1 should have Josh's answer before its rules are pre-checked.
- **The architect's `CityCircuitLayer` typing.** Each pole spot needs a stable id, because the mix rule hashes it. Its attachment height comes from the kit, not the layer: the layer gives spots and spans, and the kit gives poles and pieces.
- **K3 (renderer).** It draws through B's kit at `WORLD_PER_METRE`. It needs B merged, and D too if Q13 is "yes" and a picked piece is from a large pack. If a City Pack cable or a street light is used, K3 also needs its own R12 allowance (Q11, Q12) as a typed table, as TR2's is.
- **K4 (renderer).** With Q14 "yes", E builds the overlay on the ladder, and K4 reuses `overlay.ts` and `glyphs.ts` on the plan city. K4 then adds only the city's projected positions and its `hitTest`. With Q14 "no", the overlay stays wholly K4's, and C ships varied poles before any overlay exists.
- **TR (stage 9).** Its `SM_Prop_LightPole_*` allowance covers `traffic` pieces only. A circuit allowance (Q12 "street lights") must name different kinds. TR's digest re-pins when K types the circuit (TR's own note (a)).
- **L2b (renderer).** It edits `models3d.ts`, the guide's chapters 18 and 19, and `styleguide.test.ts`. C edits `models3d.ts`, chapter 9, 16.6 and `styleguide.test.ts`. They share files but not lines. L2b also removes the `city=tiles-old` route from `renderer.ts`, which E edits for the overlay canvas. Whichever of C (or E) and L2b merges second rebases onto the other, and its gate runs on the rebased branch.

## Sections, and the order
**Order: A, then Josh's picks and answers, then B and D side by side, then C, then 070 K3 and K4. E, if Q14 is "yes", may run at any time from now.**
- **A is the pre-check.** It starts first, after 072's texture-alias re-runs end, so that its colours and pictures are final and nothing heavy runs beside Blender. A is itself the pre-check, so B and C need no separate one.
- **D** runs only if Q13 is "yes" and a picked piece is in a large pack. It shares no file with B.
- **E** needs no pre-check, because it adds a view element, not a city rule or number. Josh checks the icons in the browser. It does not wait for A, and it shares no file with B, C or D.
- **C** waits for B, for D if D runs, and for Josh's picks.

### A · The asset pre-check (pipeline-designer; a note, no code). Branch `ticket/071a-power-kit-precheck`
A writes `docs/design/071-power-kit-precheck.md`. It measures from the GLBs, outside the repo, as its instructions say. It starts after 072's texture-alias re-runs end (the main session says when), and it loads one large GLB at a time.

**Candidates.** Every pole and line piece in the inventory table, except `_Preset_*` and Sci-Fi City's `Cables_*`. The broken poles are measured only for whether they can carry wires. The City Pack's `SM_Prop_LightPole_Base_01/02` and `_Arm_01` are measured as street-light supports, for Q12.

**The picture sheet (for Josh's picks).**
- One picture per candidate pole, standing beside `apocalypse-power:SM_Prop_Powerpole_01` and a 1.8 m figure.
- One picture per candidate line piece.
- One street view at `cam=street` scale of a short run strung with each candidate pole.
- One street view of a mixed run: three poles of the recommended list (Q10).

Each picture is titled with its key. The pictures go in the scratchpad, the note names them, and the main session sends them to Josh.

**Poles:**
1. Height to the top. Height of each attachment point. Each attachment point's offset along the arm from the pole's axis, and across it. Which axis the arm runs along. Whether the model carries its own insulators. **Whether it can carry three conductors** (three attachment points, or an arm that can take them).
2. The foot: its footprint, and where the origin is (at the base, and centred?).
3. On the ladder, the scale each pole needs to put its centre attachment at `POLE_HEIGHT`, and the height it then stands in metres at building scale (0.18). The spread of those heights over the recommended list: does a mixed run read as one line?
4. Each pole's texel luminance against the ladder's `STREET` and the City Pack carriageway, and the ratio. The Decided bar is 3:1.
5. The broken poles: which can still carry wires.

**Line pieces:**

6. Conductors per piece, and their spacing.
7. Length end to end. Where the ends are relative to the origin: their height and their across offset. Do the Palm `Powerline_*` ends meet the attachments of Palm `Powerpole_01/02`? Do Apocalypse `_Line_01`'s ends meet `Powerpole_01`'s?
8. The sag profile of the centre strand, at nine evenly spaced points. The residual against `sagSpan`'s parabola at `SAG_RATIO` 0.04, after a vertical scale fit, in metres.
9. Cable thickness, as a cross-section radius in metres, against `WIRE_RADIUS` at each view's scale: the ladder is 0.118 m at pole scale, the city 0.167 m at 0.18. Is it visible from the ladder camera and from `cam=street`? If not, by how much must the cross-section be scaled up?
10. Triangles per piece. The draw calls the ladder's longest map and the 6 x 6 seed 1 city would add, as one `InstancedMesh` per key.
11. Material: the cable's texel colour, and whether it reads as dead against `DEAD_WIRE` (0x2a3445) with the live overlay drawn over it.

**Spans and load:**

12. The ladder's span lengths, from `wireLayout` over every ladder map, in units and in metres at pole scale. The stretch factor each candidate piece would need, with its smallest and largest.
13. The pipeline city's spans: from K1 if it has given them, otherwise from 059's measure (12.5 m along a pavement, 25 to 45 m across a junction). A picture of a junction span chained and stretched, for each candidate piece.
14. The load: for each pack, the estimated size of a GLB holding only the recommended picks (from their triangles and textures), against the whole pack's size (for Q13).

**The note ends with** a recommended list of poles and lines, and the questions it raises: Q15 and Q16 only if their conditions hold, and any premise of this cut it found wrong.

**Not measured:** the overlay, the component models, the 2D view.

### B · The kit, pure (renderer). Branch `ticket/071b-power-kit`
**Goal.** One pure module says how each picked pole stands, which pole stands at which spot, and how each picked line piece hangs between any two attachment points. The ladder and the pipeline city draw from the same tables.

**Acceptance criteria (Vitest, new `src/render3d/powerkit.test.ts`).**
1. [ ] **Measured tables.** `POWER_POLES` and `POWER_LINES`, keyed `pack:name`, hold exactly Josh's picks from A's note, typed in, in metres. They have the fields A measured: attachment points, height, own insulators, conductor count and spacing, length, end points, sag fraction and radius. Inside `it.skipIf(!have)`, each is re-measured lazily from its GLB, within 0.02 m (0.005 m for the radius).
2. [ ] **A span is fitted.** For any `a` and `b`, `fitLine(piece, a, b, sagRatio, scale)` gives a transform. Its ends land on `a` and `b` within 0.01 m. Its lowest point lands on `sagSpan`'s within A's residual plus 0.01 m. The cases:
   - level spans of 0.5x, 1x and 1.25x the piece's length;
   - a span with one end 1 m higher, and one with an end 2 m higher (mixed true-size poles on the city);
   - a span along each axis, and a diagonal.
3. [ ] **Long spans.** A span longer than `LINE_STRETCH_MAX` (1.25 x the piece length, or Josh's number after A's picture) is fitted as the fewest pieces end to end that each fit. The joins are continuous within 0.01 m, and the whole follows one `sagSpan`.
4. [ ] **The pole meets the wire.** `placePole(pole, spot, attachY, scale)` gives a transform. Its measured centre attachment is at `attachY` above the spot within 0.01 m, and its arm runs across the run within 0.5 degrees. Each outer attachment is at `±PHASE_OFFSET` within A's measured difference. If A finds an arm wider than `2 x PHASE_OFFSET`, this is reported, not asserted (Q16).
5. [ ] **The mix (Q10).** `poleAt(list, spotId)` is a pure function of the list and the id, through `stableHash`: the same id always gives the same pole.
   - Over 1,000 ids, each listed pole's share is within 0.05 of an even share.
   - Over the ladder's maps, no two neighbouring spots on one run share a pole when the list has two or more (or the rule Josh gives in Q10).
   - With a one-pole list it returns that pole everywhere.
   - `lineOf(list, lineId)` gives one piece for a whole line.
6. [ ] **Failing fixtures.** A piece fitted backwards, a span of length 0, a pole whose attachment is off by 0.1 m, an empty pole list: each fails its check or throws a named error.
7. [ ] **Pure.** `powerkit.ts` imports only `./layout` (types and `sagSpan`) and `stableHash` from `../render/city` (as `models.ts` and `dressing.ts` already do). No three, no DOM, no other `src/` import.

**Files.** New `src/render3d/powerkit.ts` and `src/render3d/powerkit.test.ts`. Nothing else.
**Tests the builder runs:** `npx vitest run --maxWorkers=2 src/render3d/powerkit.test.ts` and one `npx tsc --noEmit`.

### C · The ladder drawn with the kit (renderer; after B, and D if it runs). Branch `ticket/071c-ladder-pack-lines`
**Goal.** Josh opens any ladder map at `?puzzle=<id>&view=3d` with the packs present. The poles are his picks, mixed if he said so, and the dead wires are pack line pieces. Live wires, the Relight and a cut cable look and play exactly as today.

**Acceptance criteria.**
1. [ ] **Pack wires when the pack is there (Vitest, `scene.test.ts` or a new `packlines.test.ts`).**
   - With a fake model set holding the picked line pieces, every span of every conductor of every `WireRun` has one instance of its line's piece, or a chain of them on a long span (B3). The instances are one `InstancedMesh` per key.
   - Each instance's fitted ends equal the run's attachment points within 0.01 units.
   - Each line's `whole` code tube is hidden.
   - Nothing new has `pickKind` or raycasts.
   - Pack instances cast no shadow, and the flat strips stay.
2. [ ] **Code wires and poles without the pack (Vitest).** With `NO_MODELS`, the scene's wire, pole and hardware objects are deep-equal to today's.
3. [ ] **Decided looks unchanged (Vitest).** These pass unedited: `live.test.ts`, `relight3d.test.ts`, the break and conductor tests in `layout.test.ts` and `scene.test.ts`, and `pick.test.ts`.
   - On a damaged cable, the cut span's pack instances are hidden, and the code halves and spark show.
   - The live overlay is drawn over the pack piece: its radius is at least the piece's fitted radius plus 0.005 units.
   - If an existing test asserts `whole.visible` on a dead wire, the builder stops and reports. That is a re-cut, not an edit to the test.
4. [ ] **The poles (Vitest).** `applyModels` places each spot's `poleAt` pick through `placePole`, so each centre attachment is at `POLE_HEIGHT`.
   - Code insulators are hidden on a pole that carries its own, and they stay on one that does not.
   - With a fake model set missing one listed pole, that pole is dropped from the list with one `info` line. The other poles do not fall back to code.
5. [ ] **The model table (Vitest, `models.test.ts`).** `MODEL_TABLE` names the picks by `pack:name`. If D ran, a pick from Palm City or Sci-Fi Frontier names `<pack>-power`, and no slot names `palm-city-pack` or `sci-fi-frontier-pack`.
6. [ ] **The guide (Vitest `styleguide.test.ts`; the reviewer reads the diff).**
   - Guide chapter 9: the 042 Q9 Default line becomes Josh's words of 21 Nov 2026 as **Decided**, naming the pieces and the kit.
   - Decided 041's "of one style" changes **only if Q10 is "yes"**, to his words. "Wooden" changes only if he picked a pole that is not wooden.
   - 16.6 and `CITY_NEVER_USED` lose `SM_Prop_Power_Cables_*` **only if Josh picked a City Pack cable** (Q11).
   - The pack table gains a row for each pack now in use.
   - The Numbers rows cover `powerkit.ts`'s constants.
   - No other line changes meaning.
7. [ ] **Josh in the browser** (`npm run dev`):
   - `/?puzzle=01-first-light&view=3d`, `/?puzzle=09-shrine-circuit&view=3d` and a map with a damaged cable, each with and without `light=day`;
   - poles and wires read as the packs', and each line reads as one line;
   - a live wire still glows, breathes and carries its bead;
   - the Relight still runs down the wires;
   - the cut still hangs and sparks;
   - a click on any conductor still picks the line;
   - if D ran, the page loads no 103 MB GLB (check the network panel).
8. [ ] **The playtester:** `npm run playtest` shows no ladder change (no grid file is touched).

**Files.**
- `src/render3d/scene.ts` (the wire and pole block only);
- `src/render3d/models.ts` (`MODEL_TABLE`: the `pole` slot as a list, a `line` slot, and `modelScale` for them);
- `src/render3d/models3d.ts` (`applyModels`: the line instances, `poleAt` and `placePole`);
- `src/render3d/citymetrics.ts` (`CITY_NEVER_USED`, only if a City Pack cable was picked);
- their tests, new cases only;
- `docs/city-style-guide.md` (chapter 9, 16.6, the pack table, Numbers) and `src/render3d/styleguide.test.ts`.

**Must not touch:**
- `layout.ts`, `relight3d.ts`, `pick.ts`, `town.ts`, `terrace.ts`, `tilecity*.ts`, `plan3d.ts`, `renderer.ts`, and `powerkit.ts` (B's; a change there is a re-cut);
- `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/city/`;
- `puzzles/`, `tests/`, `tools/`, `package.json`, `assets/`, `tickets/`.

**Tests the builder runs:** `npx vitest run --maxWorkers=2 src/render3d/scene.test.ts src/render3d/live.test.ts src/render3d/relight3d.test.ts src/render3d/pick.test.ts src/render3d/models.test.ts src/render3d/styleguide.test.ts`, plus its new test file, and one `npx tsc --noEmit`.

### D · Small power GLBs (grid-simulator; only on Q13 "yes"). Branch `ticket/071d-power-glbs`
**Goal.** Each large pack Josh picked from has its own `out/<pack>-power.glb`, a few MB at most. It holds only the picked models, with the same names, metre scale and textures as the full pack. `manifest.json` lists it as pack `<pack>-power`. The full pack's GLB and every existing manifest entry are unchanged.

**Acceptance criteria.**
1. [ ] **The settings (Vitest, `convert.test.ts`).** A pack folder's `pack.json` may name a source pack and an `"include"` list of FBX stems. For example, `in/palm-city-power/pack.json` = `{ "from": "palm-city-pack", "include": ["SM_Prop_Powerpole_01", ...], "textures": "SourceFiles/Textures" }`. Paths resolve inside the source pack.
   - `readPackSettings` throws a plain message for each of these: an unknown `from`; `include` beside `exclude`; a stem that is not in the source; an empty list; a duplicate stem.
   - The builder may choose a different mechanism if it keeps these checks and needs no new dependency. A mechanism that would need one is a re-cut.
2. [ ] **Nothing else changes (Vitest).** Without `from` and `include`, the arguments and behaviour are as today, and the existing `tools/assets` tests pass unchanged.
3. [ ] **The selftest (one Blender run).** The selftest fixture gains an included pack. `checkSelftest` fails if a model outside `include` reaches its GLB.
4. [ ] **The runs (the builder; one pack at a time, as in 072).** Back up the manifest first. Then run `npm run assets:convert -- <pack>-power` for each pack Josh picked from.
   - Afterwards, each existing entry is identical to its backup, and the full packs' GLBs keep their modified times.
   - The hand-back gives each new GLB's size and its model list, with each model's bounds equal to the full pack's within 0.001 m.

**Files.**
- `tools/assets/convert.ts`, `convert.test.ts`, `tools/assets/fixtures/`;
- `tools/blender/convert_fbx.py` (only if the include filter must live there) and `tools/blender/README.md`;
- not in git: `assets/private/in/<pack>-power/pack.json` and `assets/private/out/`.

Out of scope: `src/`, and every other pack's files.

### E · The overlay on the ladder's 3D view (renderer; only on Q14 "yes"). Branch `ticket/071e-ladder-overlay`
**Goal.** Josh opens any ladder map at `?puzzle=<id>&view=3d`. An icon of its type sits over each component: the feed, breakers, switches, fuse boxes, junctions, batteries, lamps and targets. The icon shows the component's state by shape, as the 2D map does, and follows it as the camera moves. A click on an icon acts on that component. `overlay=0` hides the icons, for comparison.

**Acceptance criteria.**
1. [ ] **The glyphs move, and the 2D view does not change (Vitest).** A new `src/render/glyphs.ts` exports the node, lamp and ribbon glyph drawing that `map-renderer.ts` does today (for example `drawNodeGlyph(ctx, type, state, x, y, size)`), and `map-renderer.ts` calls it.
   - The existing `src/render/` tests pass unedited.
   - A new `glyphs.test.ts` draws each type and state on a recording fake context. It compares the call list with the same draw made through `createMapRenderer`: the same calls, in the same order.
2. [ ] **Placement, pure (Vitest, new `src/render3d/overlay.test.ts`).** `overlayIcons(puzzle, state, project)` gives one icon per component, with its type, its state and its screen position from `project` (passed in; a fake in the test).
   - The state is the one `look.ts` gives the 3D view.
   - An icon whose point is behind the camera or off-screen is omitted.
   - If two icons are closer than one icon size, both are kept and the later one is offset by `OVERLAY_NUDGE`. Neither is dropped.
   - `overlay.ts` imports no three and no DOM.
3. [ ] **State by shape (Vitest).** Each state change that the 2D map reads by shape (breaker lever, switch chevron, fuse bar, lamp lit or dark, target filled or hollow) changes the icon's recorded draw calls in more than colour.
4. [ ] **Picking (Vitest, new cases in `pick.test.ts` or the overlay's own test).** `hitTest` returns an icon's component id before any 3D object under it. Off the icons, it falls through to the 3D pick. The existing `pick.test.ts` cases pass unedited.
5. [ ] **Off by query (Vitest).** With `overlay=0`, no icon is drawn and `hitTest` behaves as today.
6. [ ] **Josh in the browser:** at `/?puzzle=09-shrine-circuit&view=3d`, orbit and zoom.
   - The icons follow their components and read at phone size.
   - A click on a breaker icon throws the breaker.
   - The same map at `overlay=0` is today's view.
7. [ ] **The playtester:** no ladder change.

**Files.**
- New `src/render/glyphs.ts` and `glyphs.test.ts`;
- `src/render/map-renderer.ts` (the move only);
- new `src/render3d/overlay.ts` and `overlay.test.ts`;
- `src/render3d/renderer.ts` (an overlay canvas over the WebGL canvas, drawn each frame, and `hitTest` asking it first);
- `src/render3d/pick.ts` and `pick.test.ts` (new cases only).

**Must not touch:** `src/core/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/city/`, `scene.ts`, `models*.ts`, `plan3d.ts`, the guide.

**Tests the builder runs:** `npx vitest run --maxWorkers=2 src/render src/render3d/overlay.test.ts src/render3d/pick.test.ts` and one `npx tsc --noEmit`.

**CI-safe (every section):** typed-in fixtures; GLB reads only inside `it.skipIf`, and lazily; no Windows paths; no timer under 1 s.

## Interfaces
- **No `src/core/` change.** The kit, the mix rule and the overlay are internal to `src/render3d/` and `src/render/`. `AssetPack` and `AssetEntry` (`src/core/assets.ts`) are unchanged: a `<pack>-power` entry is an ordinary pack. If 070 K4 later needs overlay types that `src/play/` or `src/ui/` must read, the architect types them when K4 is cut.
- `powerkit.ts` (B; the builder may rename):
  - `POWER_POLES: Record<PackKey, { height_m; attach_m: { along: number; across: number; up: number }[]; ownInsulators: boolean }>`;
  - `POWER_LINES: Record<PackKey, { length_m; conductors: number; spacing_m; radius_m; sag: number; ends: ... }>`;
  - `LINE_STRETCH_MAX`;
  - `fitLine(...)`, `placePole(...)`, `poleAt(list, spotId)`, `lineOf(list, lineId)`.
- `overlay.ts` (E): `overlayIcons(puzzle, state, project): OverlayIcon[]` and `OVERLAY_NUDGE`. `glyphs.ts` (E): the glyph functions.
- D: the `pack.json` keys `"from"` and `"include"`, internal to `tools/`.
- **No new dependency** in any section.

## Open questions (for Josh; recommended answer first)
The first cut's Q1 to Q9 were never answered. These replace them.

10. **Poles: a makeshift mix, or one pole?** This changes Decided 041 "of one style". **Recommended: a mix.** You pick a short list from A's picture sheet, and each pole spot gets one of them by a fixed hash. Every puzzle line still carries three wires on a cross-arm, so the armless Sci-Fi poles join only if A finds they can carry three. *Reason:* it suits the setting, and the three-wire live and cut looks you Decided stay as they are.
11. **Wires: pack strands, or code wires?** **Recommended: pack single-strand pieces**, three per span and one kind of piece per line, from your picks on A's sheet. The live glow, the Relight and the cut stay drawn in code over them. If you pick a City Pack cable, it comes off the never-used list. *Reason:* the dead wires look like the packs' lines, and nothing you Decided about live and cut wires changes.
12. **In the city, do the wires hang from street lights (the City Pack's own look) or from power poles?** **Recommended: power poles, with street lights standing apart as lamps.** *Reason:* a puzzle lamp and a line support stay two things that the overlay and a click can tell apart, and stage 9's traffic-only use of the City Pack light poles stays clean. The answer goes to K1 before its rules are checked.
13. **Make small GLBs of just the power pieces (D)?** **Recommended: yes.** *Reason:* Palm City and Sci-Fi Frontier are 103 MB each, and a few poles should not load 200 MB on every page, phones included.
14. **Build the overlay on the ladder's 3D view now, as 071 E, and let 070 K4 reuse it on the city?** **Recommended: yes.** *Reason:* once the poles vary, the overlay is what tells the parts apart. The ladder already has the game state to test it on, while K4 waits on K1 and K2.

Asked only if A's note finds the problem:

15. A picked pole is under the Decided 3:1 contrast against the street. Keep it as it is, tint it, or drop it from the list?
16. A picked pole's arm is wider than the wires' spacing (`2 x PHASE_OFFSET`). Stretch the wire spacing to the arm (with a re-check of `WIRE_PICK_RADIUS`), or drop the pole?

The component model table (feed, breaker, switch, fuse box, junction, battery, lamp) stays open until Josh has looked over the packs. It is not part of this ticket.
