# 070 TR pre-check: stage 9, traffic control

## Answer (Josh, 21 Nov 2026, in chat)

> "I will take all of the recommendations"

He was answering this list (the main session's wording, the recommended answer first). Every item is now answered as recommended. Ticket 070 records them as Q32 to Q35 and Q36 to Q44 (the lead-architect, TR re-cut).

| # | Question | Answer | Ticket 070 |
| --- | --- | --- | --- |
| 1 | Traffic keeps right (DS) | yes | Q36 |
| 2 | Masts on the far-left corner, heads where `Arm_01` puts them (not moved to build-outs) | yes | Q37 |
| 3 | Signals only at inner crossroads of two two-way streets (SJ) | yes | Q38 |
| 4 | Every other inner crossroads an all-way stop; at a T only the ending street stops (AS) | yes | Q39 |
| 5 | Stop sign on the kerbside pavement at the near corner, facing traffic; no give-way signs (ST) | yes | Q40 |
| 6 | No one-way signs: `Sign_Arrow_01` does not read as a sign (the main session's gallery screenshot shows a bent arrow). Firmer than section 4's "only if the gallery shows it reads": the check was done, it does not read, and OW is dropped | yes | Q41 |
| 7 | The stop sign draws its STOP-on-red face from the pack's `01_A` atlas (TR2) | yes | Q42 |
| 8 | No street-name signs | yes | Q35 |
| 9 | `SIGN_KERB_M` 0.5, `SIGN_CORNER_M` 1.0, `MAST_INSET_M` 0.75, `SIGNAL_HEAD_MIN_M` 4.6 | yes | Q43 |
| 10 | Q33 narrowed: lift only `SM_Prop_LightPole_Base_01`, `_Arm_01`, `_CrossLights_01`, `_CrossButton_01`, `_Box_01` off the never-used list, always drawn dark | yes | Q33 |
| 11 | TR1b: a parking sign at the start of each bay stretch, skipped where there is no room | yes | Q44 |
| 12 | Signals are scenery only, never powered or in the puzzle | yes | Q34 |
| 13 | No no-entry signs or stop lines; stage 9 after ground, streetscape owns `src/city/traffic/` | yes | Q35, Q32 |

What this settles, for the re-cut: no `signalHead` piece (the arm carries its heads), no give-way and no one-way sign, no street names, no option E (`Base_02` is not used). TR1's criterion 3 reads "the arm crosses its approach over the carriageway, heads facing it". The rest of this note is unchanged below.

21 Nov 2026, pipeline-designer, on `goal/city-style` at a95e118 (TR's first cut). Not committed. Nothing here is decided until Josh says so in chat. (The ticket names this note `070-TR-precheck.md`; the main session asked for this name.)

**This is a sketch.** A throwaway probe outside the repo builds each city through stage 8 with the merged code (read-only), then places stage 9 as TR1 words it: IN, SJ (a, b, c), AS, T, C, MA, ST, OW and CL, plus TR1b's parking signs. Every grounded piece is checked against stage 8's props (`FURN_GAP_M`), stage 7's boxes (I's AV and EL rule, with I's own bounds) and the build-out trees, and must lie inside its cell. The kit was read from `city-pack.glb` (node bounds, a vertex profile per 0.25 m of height, and each triangle's colour sampled from its atlas). The builder's numbers are the record.
- **Runs:** the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on). Outside: 3 x 3 and 6 x 4 seeds 1 to 20, off and on, report only.
- **Not done:** no gallery screenshots. The instructions allow no browser or dev server, so every "how it looks" below is read from the geometry. The main session should look at `?gallery=city-pack` before TR1 is re-cut (section 0, items 2 and 4).
- **Stage 6** is not typed, so CL's keep list is empty. That is a note only.

## 0. Premises the measurements change

1. **The heads are part of the arm.** `SM_Prop_LightPole_Arm_01` is a 6.28 m tapered truss with its pole clamp at one end. It has two yellow signal heads already hung on it, 4.26 m and 6.0 m from the pole's axis, and a green name plate. So MA needs no separate `signalHead` piece. `Lights_01/_02` and `TrafficLight_01..03` are only needed for heads fixed to a pole, and Q33's lift gets shorter (Q9).
2. **The arm only fits a pole on the driver's left.** Seen from the lens side, the clamp is on the viewer's left. So with its heads facing the traffic, the arm reaches to the driver's right. A pack piece is never mirrored, and the GLB is not mirrored either: the stop sign's STOP reads the right way round from its front, +z. So TR1's MA ("the corner at the approach's far side", as a US mast arm is hung) cannot be built under keep right. The mast that works stands on the **far-left** corner. From there, the heads land over the driver's own lane on only half the approaches (section 2, Q1 and Q2).
3. **`SM_Prop_LightPole_Base_01` is a lamp post with collars.** It is a 6.48 m pole whose top hooks 2.3 m sideways to a downward-facing lamp head (light grey, at 6.26 m). It has dark collars at 3.13 to 3.20 m and 5.35 to 5.42 m. With the arm's clamp on the upper collar, the arm sits at 4.81 m, so its heads hang 4.81 to 5.71 m up (an estimate: the GLB keeps no fixing points). `Base_02` is a 4.95 m post with a 1.10 m cross-bar at 4.0 to 4.95 m, no collar and no lamp. Q33's worry ("a lamp reads as a puzzle lamp") applies to `Base_01` itself, not only to street lamps.
4. **Two signs may not read as drawn.**
   - Stage 8's drawing (`dressGroup`) uses the base atlas, with no colourway. On that atlas the stop sign's face samples a single grey (#818181): no red and no STOP. On the `01_A` atlas the same faces show white STOP on red (#ac3e2c). The give-way signs are grey on the base atlas too. The parking sign's blue face shows on both.
   - `SM_Prop_Sign_Arrow_01` has one grey colour on both atlases and no post. Its lowest point is a single vertex. Its outline is a 0.4 m wide strip that zig-zags up to 2.28 m: 72 triangles and no plate. It does not measure like a ONE WAY plate on a post. This is TR2's drawing, but it decides whether OW is worth placing (Q6).
5. **No key is emissive.** None of the 363 materials in `city-pack.glb` has an emissive factor or map. The pack's own material list gives each of these keys an `Emissive_01.png` that the converter did not carry. The unlit lenses are red #772323, amber #775323 and green #337723: all three equally dull, all three on every head, in a yellow #d1a44c housing (`TrafficLight_03`: black). The walk head shows a dull red hand and a dull green walker together. No head shows one colour lit, so none reads as a state.

## 1. What holds

On all 20 named runs, at the recommendation (SJ (a), far-left masts, ST, OW at a street's start, the four numbers in Q8):

| Holds | Measured (20 runs) |
| --- | --- |
| Required pieces clear of stages 4, 7 and 8 (CL) | 0 failures: masts, stop signs, one-way signs |
| Closest stage 8 prop | 3.01 m |
| Closest stage 7 box below a piece's top | 2.35 m |
| Closest build-out tree | 6.95 m |
| Arms over a stage 7 box | 0 |
| Arms past the far kerb | 0 (all on 15 m carriageways) |
| Stop-sign cell is `pavement` (never a kerb cut or a dip; ST's fallback never used) | 1,054 of 1,054 |
| Every signal junction has 4 `pavementCorner`s | 221 of 221 |
| Stage time (the sketch) | 15 to 43 ms a city (the build through stage 8: 0.75 to 1.46 s) |
| Outside cities | 73 of 80 build through stage 8, 0 traffic failures. The 7 others fail earlier (6 on R6, facades; 1 on S5, streets) |

With the signs 1.0 m from the kerb and 2.0 m from the corner, the required pieces still have 0 failures (closest prop 2.01 m).

**Junctions, 20 runs (1,218):**

| Kind | Where | Sections that meet | Count |
| --- | --- | --- | --- |
| corner | edge | two-way + two-way | 80 |
| T | edge | two-way + two-way / one-way / bare | 341 / 57 / 11 |
| T | inner | two-way + two-way / one-way / bare | 317 / 63 / 13 |
| T | inner | one-way + one-way / bare | 5 / 1 |
| crossroads | inner | two-way + two-way | 221 |
| crossroads | inner | two-way + one-way / bare | 77 / 11 |
| crossroads | inner | one-way + one-way / bare | 16 / 5 |

- **Approaches:** 3,904 arms, of which 3,678 are inbound and 226 are one-way arms leaving the junction.
- **Ts:** 60 Ts have an ending street that leaves one-way, so they get no stop sign.
- **Every crossroads is inner.** No edge street is crossed.

## 2. The questions, measured

**SJ: which junctions get signals** (a city: one-way on / off):

| Option | Junctions (20 runs) | A city, on | A city, off | Masts | What goes wrong |
| --- | --- | --- | --- | --- | --- |
| **(a) inner crossroads, both two-way** | **221** | **2 to 16** | **9 to 18** | **884** | nothing |
| (b) every inner crossroads | 330 | 11 to 26 | 9 to 18 | 1,320 | 16 arms on bare one-way streets reach 0.2 to 0.7 m past the far kerb |
| (c) (a) plus inner Ts of two two-way streets | 538 | 4 to 27 | 29 to 42 | 1,518 | 634 T approaches have no corner for their mast (the far side is a dip) |

**Pieces under (a):** 4 masts with arms, 8 walk heads, 4 push buttons and 1 box a junction. Stop signs: 48 to 82 a city with one-way on, 34 to 52 off.

**AS:** the other inner crossroads, 109 (5 to 18 a city with one-way on; none with it off, because every one has a one-way arm). Every inbound arm stops. Along with the Ts' ending arms, that is 1,054 stop signs.

**Give way** (the cut's option): only 9 Ts, 20 runs, have an inbound bare one-way ending street.

**DS and MA: where the heads land.** The arm is fixed: its heads are 4.26 and 6.0 m from the pole (premise 2). On a two-way street the inbound lane is one 5 m cell. Whether that lane is next to the kerb depends on which side the street's parking band is on.

| Reading (on the 884 approaches of (a)) | One head over the inbound lane | None |
| --- | --- | --- |
| **Keep right, mast on the far-left corner (the kit as built)** | **442** | **442** (parking on the driver's left: the heads hang over the parking band and the oncoming lane) |
| Keep right, far-left mast; where parking is on the left, the mast moves onto the far-left build-out (E) | 884 | 0 (442 masts off the corners; those build-outs have no tree; the two bare corners need a walk-head post, `Base_02`) |
| Keep left, far-left mast | 884 | 0 |
| Keep right, far-right mast (the cut's MA) | needs a mirrored arm; the pack has none | |

An inset of 0.5, 0.75 or 1.0 m from the kerb corner gives the same counts. Both heads over one lane never happens: the heads are 1.74 m apart, but no inbound lane lies 3.3 to 6.0 m from the pole.

**ST:** 1,054 signs, every one on the kerbside pavement cell next to the near-right corner. 472 of them have a build-out in front: there the cell's edge is flush and the kerb is the build-out's, 5 m further out.

**OW: one-way signs:**

| Reading | Signs (20 runs) | A city | Spot |
| --- | --- | --- | --- |
| **(ii) only where a one-way street starts** | **60** | **3 to 9** | all on a `pavementCorner` |
| (i) at every junction a one-way arm leaves | 226 | 8 to 40 | 18 land on a dip on the far side of a T, not a corner |

**TR1b: parking signs and street names:**
- **Parking:** 1,277 bay stretches. 1,147 take a sign and 130 are skipped for room (meters 50, hydrants 28, kerb trees 26, bus stops 21, bollards 5). That is 44 to 70 signs a city.
- **Street names:** the `Sign_Street` plates are 0.023 m high and lie flat, so a yaw alone cannot stand one up. The `Attachment` brackets carry no plate either. The only standing name plate is the blank green one built into `Arm_01`.

**Draw calls (an estimate: one instanced call per key, each key is one mesh).** At the recommendation, TR1 uses 7 keys (`Base_01`, `Arm_01`, `CrossLights_01`, `CrossButton_01`, `Box_01`, `Sign_Stop_01`, `Sign_Arrow_01`) and TR1b one more (`Sign_Parking_01`). With stage 8's 24 that is 32 of `FURN_DRAW_CALLS_MAX` 80. Option E adds `Base_02` (33).

## 3. Recommendation, and what it costs

- **SJ (a), AS and T as cut. Keep right. Masts on the far-left corner, with the heads hung where the kit puts them.** It holds on 20 of 20 runs with 0 clearance failures.
  - **Cost:** half the approaches' heads hang over the parking band and the oncoming lane, not their own lane. So TR1's criterion 3 ("every inbound approach has its head over its inbound lanes") is reworded to "the arm crosses its approach over the carriageway, heads facing it".
  - The signals are dark scenery (Q34), and the street camera sees a mast on every corner with its arm over the road. E fixes the lanes, at the price of masts off the corners and a fifth key.
- **ST as cut. OW at a street's start only.** Before TR1 is built, the main session looks at `Sign_Arrow_01` in the gallery. If it does not read as a one-way sign, OW is dropped: the painted road arrows already show the flow.
- **Q33 lifts five keys, not eleven:** `LightPole_Base_01`, `_Arm_01`, `_CrossLights_01`, `_CrossButton_01` and `_Box_01`. The `Lights_*` and `TrafficLight_*` keys stay on the never-used list.
- **TR2 (a note for its cut, not a rule):** stop and give-way faces are grey on the base atlas, so the signs need the `01_A` atlas or they will not read.
- **Nothing merged moves.** No digest of stages 1 to 8, no pin and no approved number changes. No check is loosened.

## 4. Questions for Josh (recommended answer first)

1. **DS.** "Traffic keeps right: yes or no?" **Yes.** The City Pack is a US kit (STOP octagon, yellow centre lines). Keep left would let the arm's heads land over every lane, but it contradicts the kit.
2. **MA.** "Masts on the far-left corner, heads where the arm puts them: yes, or move them to the build-outs?" **Yes.** It holds everywhere on the corners. The build-out version (E) gets every lane a head but moves 442 masts off the corners.
3. **SJ.** "Signals only at inner crossroads of two two-way streets: yes?" **Yes.** 2 to 18 a city, all clear. (b) overhangs bare streets, and (c) leaves 634 T approaches with no corner.
4. **AS.** "Every other inner crossroads an all-way stop, and at a T only the ending street stops: yes?" **Yes.** The grid has no street hierarchy, so no street can have priority. That gives 1,054 stop signs, all clear.
5. **ST.** "Stop sign on the kerbside pavement next to the near corner, facing the traffic; no give-way signs: yes?" **Yes.** Every spot is a plain pavement cell. A give-way would fit only 9 Ts, and its face is grey as drawn.
6. **OW.** "One-way sign only where a one-way street starts, and only if the gallery shows `Sign_Arrow_01` reads as one: yes?" **Yes.** 3 to 9 a city, all on corners. The piece has no post and no arrow plate by its geometry.
7. **Q35.** "No street-name signs: yes?" **Yes.** The pack's plates lie flat and cannot stand by a turn alone.
8. **The four numbers.** "`SIGN_KERB_M` 0.5, `SIGN_CORNER_M` 1.0, `MAST_INSET_M` 0.75, `SIGNAL_HEAD_MIN_M` 4.6: yes?" **Yes.**
   - 0.5 is stage 8's own kerb line (`FURN_KERB_M`).
   - Any value tried (0.5 to 1.0, and 1.0 to 2.0) clears.
   - 4.6 m is the US 15 ft clearance under a head; the arm as read hangs its heads at 4.8 m.
9. **Q33 narrowed.** "Lift only `LightPole_Base_01`, `_Arm_01`, `_CrossLights_01`, `_CrossButton_01` and `_Box_01`, drawn dark: yes?" **Yes.** The heads come with the arm. Note that `Base_01` carries an unlit lamp head on its top.
10. **TR1b parking.** "A parking sign at the start of each bay stretch, skipped where there is no room: yes?" **Yes.** 1,147 signs; the 130 skipped are spots taken by meters, hydrants and trees.

## 5. What the orchestrator does for each answer

- **All yes:**
  - The architect re-cuts TR1 with Josh's words: DS, MA (far-left corner, arm and heads as one piece, no `signalHead` piece on the arm), SJ (a), AS, T, ST, OW (ii) and the four numbers. Criterion 3 is reworded as in section 3.
  - Q33's allowance becomes the five keys.
  - If the gallery shows `Arrow_01` does not read, OW and its TC3 fixture leave TR1.
  - TR1b's re-cut drops street names and keeps parking signs. TR2's cut adds the `01_A` question for the signs.
  - The builder starts at TR1's criterion 0.
- **Q2 "build-outs" (E):** the architect adds `Base_02` (a walk-head post) to the kit and Q33, and MA's rule says which corners take a mast. The pre-check numbers in section 2 stand. No re-measure is needed.
- **Q1 "keep left":** MA and ST turn to the left-hand corners. The counts are the same by symmetry (measured for MA: 884 of 884 approaches get a head over their lane). The architect re-cuts.
- **Q3 (b) or (c):** the architect adds an arm-length rule for bare streets (b), or a far-side mast rule for Ts (c). A short re-check of those rules comes before the builder.
- **Q34 "puzzle parts"** (not asked here): the signals move to K1, as the cut says.

## 6. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\8da2687087e415bb\9cf5888a-b312-4c92-b17e-ffb264f4fbe5\scratchpad\tr-probe\` (copies of `src/core` and `src/city`, `probe/tr.ts` for the runs, `probe/geo.mjs`, `arm.mjs` and `r2.mjs` for the GLB). Deleted after this note, as the main session asked. Nothing of it is in the repo.
