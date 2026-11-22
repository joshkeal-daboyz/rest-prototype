# 071 A pre-check: the power kit (poles and wire pieces from the packs)

21 Nov 2026, pipeline-designer, on `ticket/071a-power-kit-precheck` at 7e999bb. Not committed. Nothing here is decided until Josh says so in chat.

**This is a sketch.** A throwaway probe outside the repo read the converted GLBs in `assets/private/out` (files dated 21 Nov 2026, 19:51 to 19:57, after 072's texture-alias runs). For each key it read the node's triangles, split them into connected parts (post, arm, insulators, strands), and sampled every triangle's colour from its atlas at its UV centre. Luminance is area-weighted, relative (sRGB to linear), the same formula as `scene.test.ts`. Spans come from `wireLayout` over the 64 ladder maps, and camera scales from `createCameraRig`, on a copy of `src/`. B's re-measure is the record. The probe was deleted after the run.

Keys are `pack:name`. Sizes are metres. "u" is ladder world units.

## 1. What holds, and what does not

- **Three-wire poles: four candidates.** These have a cross-arm or crossbar with three attachment points: Apocalypse `Powerpole_01`, Palm `Powerpole_01` and `_02`, and Sci-Fi City `Powerpoll_01/02`.
  - **No Sci-Fi Frontier pole can carry three on a cross-arm.** `Power_Pole_01` and `_02` are bare masts. `_03` has four short one-sided brackets at four heights.
  - **Palm `Powerpole_03`** is an H-frame transformer platform: 3,454 tris and 87 parts. Its conductors are only ±0.45 m apart.
  - This corrects the ticket's "Palm City and Sci-Fi Frontier have real utility poles". Only Palm's are.
- **Q15 holds (contrast).** Every pole that can carry three is under the Decided 3:1 against `STREET`: 2.14 to 2.46.
  - Only the Frontier masts pass (3.7 and 4.1), and they cannot carry three.
  - **The ladder has been under the bar since 042.** Its pack pole, Apocalypse `Powerpole_01`, measures 2.41:1. The existing test checks only the code colour `POLE_WOOD` (3.24:1), which is the no-pack fallback.
  - Against the City Pack carriageway (`Road_Bare_01`, #454545), even `POLE_WOOD` gives only 1.96:1.
- **Q16, as worded, holds for two poles, but nothing needs stretching.**
  - Apocalypse `Powerpole_01`'s upper arm is 0.57 u wide and Sci-Fi City's crossbar 0.45 u, both against the 0.44 u of 2 x `PHASE_OFFSET`. But their attachment points sit at ±0.235 u and ±0.226 u, within 0.015 u of the wires.
  - **The real mismatch is the other way.** Palm's outer insulators are narrower than the wires: ±0.16 u against ±0.22 u, a 0.32 m gap at true size. That is new question Q17.
- **Wire pieces.** Q11 asked for single strands. These four are clean single strands with a sag curve close to `sagSpan`'s:
  - City Pack `Power_Cables_03`
  - Apocalypse `Powerpole_Single_Line_02`
  - Palm `Powerline_02`
  - Frontier `Cable_16`

  These are not single strands: Palm `Powerline_03` to `_08` (bundles, tangles, drops), Frontier `Cable_12`, `_13`, `_14`, `_17` and `_18` (multi-strand or hoses), and Apocalypse `Line_01` / `Lines_01` (one identical six-strand mesh). Palm `Powerline_01` is dead straight, with no sag to fit.
- **On the ladder, a pack strand at true thickness is too thin to see.** It is 0.1 to 1.2 px across at the opening pose, against 0.6 to 4 px for today's code wire. On `cam=street` at true size it is 1.4 to 2.8 px, which is fine. That is new question Q18.
- **Spans fit.** City spans need no chaining with `Cables_03` (0.93x along a pavement, 1.22x on a crossing). A Palm piece chains as **two** pieces at 1.07x on a 16.5 m crossing, not three as the ticket says.
- **Load is small.** The picks' subset GLBs would be about 2.5 MB for Palm and 3.8 MB for Frontier, against 103 MB each. The atlas is almost all of it.

## 2. Poles, measured

The axis is the centre of the foot. "Along" is along the run (the wires' direction), "across" is along the arm, and "up" is the height of the insulator's top.

| Key | Top | Arm axis | Attachments (across @ up) | Along offset | Own insulators | Carries 3 | Foot (origin at base) | Tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `apocalypse-power:SM_Prop_Powerpole_01` | 6.30 | z | upper arm: −0.88, +0.84 @ 5.86; lower arm: −1.16, −0.54, +0.55, +1.18 @ 5.33. No centre insulator | +0.17 | yes, 6 | yes: upper pair plus a centre on the upper arm (a code insulator there) | 0.23 x 0.23, axis at x +0.17 (off-centre) | 621 |
| `palm-city-pack:SM_Prop_Powerpole_01` | 8.99 | x | −0.83, +0.22, +0.88 @ 8.53 to 8.55 (centre off-axis) | +0.17 | yes, 3 | yes | 0.24 x 0.23, centred | 232 |
| `palm-city-pack:SM_Prop_Powerpole_02` | 9.01 | x (tilted 0.3 m) | −0.89 @ 8.41, −0.46 @ 8.47, +0.79 @ 8.73 | +0.05 | yes, 3 | yes (makeshift: crooked) | 0.23 x 0.23 | 232 |
| `sci-fi-city-pack:SM_Prop_Powerpoll_02` (`_01` alike) | 5.07 | x | crossbar ends ±0.71 and centre @ 5.02 (also bars at 4.34 and 3.75) | +0.22 | no | yes, on the top crossbar | 0.32 x 0.33 | 644 (`_01`: 1,016) |
| `palm-city-pack:SM_Prop_Powerpole_03` | 10.83 | z, H-frame | −0.45, 0, +0.44 @ 8.38 (pairs) | 0 | yes | narrow only (±0.45) | 0.44 x 2.43, two posts | 3,454 |
| `sci-fi-frontier-pack:SM_Prop_Power_Pole_03` | 7.86 | brackets ±x | −0.32 @ 4.49 and 5.17; +0.54 @ 5.09 and 5.51 | 0 | no | not on a cross-arm | 0.27 x 0.28 | 498 |
| Frontier `Power_Pole_01` / `_02` | 8.72 / 9.14 | none | none | | no | no | centred | 578 / 754 |
| `apocalypse-power:SM_Prop_Powerpole_Single_01` | 6.30 | none | two insulators at ±0.15 @ 5.40 | | yes | no (±0.04 u on the ladder) | centred | 112 |

- **The arm axis differs between packs.** Apocalypse runs along z, and Palm and Sci-Fi City along x. B's `placePole` needs a yaw per pole.
- **The insulators sit 0.17 m to 0.22 m in front of the post** along the run, so the kit offsets the pole behind its attachments.

### On the ladder (item 3): each pole scaled so its centre attachment is at `POLE_HEIGHT` 1.6 u

| Key | Centre attach | Scale (u/m) | Top (u) | Height at building scale 0.18 | Outer attach (u) vs ±0.22 | Centre off the run's line |
| --- | --- | --- | --- | --- | --- | --- |
| Apocalypse `Powerpole_01` | 5.86 (upper arm) | 0.273 | 1.72 | 9.6 m (8.9 m today, scaled by its top) | ±0.235 (+0.015) | 0 |
| Palm `Powerpole_01` | 8.54 | 0.187 | 1.69 | 9.4 m | ±0.160 (−0.060) | 0.037 u |
| Palm `Powerpole_02` | 8.47 | 0.189 | 1.70 | 9.4 m | ±0.159 (−0.061), ends 0.06 u apart in height | 0.077 u |
| Sci-Fi City `Powerpoll_02` | 5.02 | 0.319 | 1.62 | 9.0 m | ±0.226 (+0.006) | 0 |

- **A mixed run reads as one line on the ladder.** The wires meet every pole at 1.6 u, and the tops spread only from 1.62 to 1.72 u (6%; 2% across Apocalypse and the two Palms).
- **In the city, at true size, the attachments differ by up to 3.5 m:** Palm 8.5 m, Apocalypse 5.9 m, Sci-Fi City 5.0 m.
  - B2's test cases (an end 1 m and 2 m higher) understate this. Apocalypse beside Palm is 2.7 m, and Sci-Fi City beside Palm is 3.5 m.
  - Even so, the lowest point on a 16.5 m crossing is 4.4 m (Sci-Fi City at both ends), above a bus.

### Contrast (item 4): area-weighted texel luminance against the bar

| Key | Main texels | vs ladder `STREET` (Decided bar 3:1) | vs City Pack road #454545 | Linear tint to reach 3:1 (estimate) |
| --- | --- | --- | --- | --- |
| Apocalypse `Powerpole_01` | #6b5e4e 63%, #7b7b79 11% | **2.41** | 1.46 | x1.36 |
| Palm `Powerpole_01` | #6b5e4e 58%, #4f453b 34% | **2.17** | 1.32 | x1.59 |
| Palm `Powerpole_02` | #6b5e4e 53%, #4f453b 34% | **2.14** | 1.30 | x1.62 |
| Sci-Fi City `Powerpoll_02` | #655f56, #3c3c3c, #525257 | **2.46** | 1.49 | x1.32 |
| Sci-Fi City `Powerpoll_01` | adds #1b1c1e cable mass | 2.21 | 1.34 | x1.55 |
| Palm `Powerpole_03` | | 2.28 | 1.38 | |
| Frontier `Power_Pole_01` / `_02` | pale concrete, orange bands | 4.13 / 3.73 | 2.50 / 2.26 | |
| Frontier `Power_Pole_03` | | 2.05 | 1.24 | |
| `POLE_WOOD` (code, for reference) | #8b6b4a | 3.24 | 1.96 | |

- **Palm's texture alias colours these poles correctly.** Their wood and insulator texels are the very same values as the Apocalypse pack's (#6b5e4e, #35383c), from the shared Synty palette.
- **Sci-Fi City `Powerpoll_01/02` carry yellow, blue and red cable bundles** (#bda248, #405394, #824439) and sign boxes on the pole. On a puzzle line they could be read as state colours. That is a picture question, not a measured fail.

### Broken poles (item 5): dressing only, as the Default says

| Key | Can carry wires? |
| --- | --- |
| `Powerpole_Broken_01` | yes: both arms and all 6 insulators intact, with cut wires hanging |
| `_Broken_02` | the arms are intact but tilted, and the post leans 0.4 m |
| `_Broken_03` | no: the arm is collapsed and askew, top 4.63 |
| `_Broken_04` | no: fallen, 2.63 tall |
| `_Single_Broken_01` | no: no arm, a cable tangle |

## 3. Wire pieces, measured

The sag is the centre strand's mid-span drop below its chord, as a fraction of its length. The residual is the largest gap to the 4t(1−t) parabola after a vertical scale fit, at nine evenly spaced points. The radius is half the cross-section.

| Key | Strands | Length | Ends (up, across, from origin) | Sag / L (`SAG_RATIO` 0.04) | Residual | Radius | Tris | Texel | Dead? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `city-pack:SM_Prop_Power_Cables_03` | 1 | 13.49 (along z) | 0.575, 0; level | **0.0404** | 0.019 | 0.032 | 56 | #414549 | yes |
| `apocalypse-power:SM_Prop_Powerpole_Single_Line_02` | 1 | 14.95 (x) | 0.562, −0.04; level | 0.0365 | 0.003 | 0.013 to 0.016 | 68 | #25272a | yes |
| `apocalypse-power:SM_Prop_Powerpole_Single_Line_01` | 1 | 14.95 | 0.687 | 0.0426 | 0.037 | 0.013 to 0.016 | 36 | #25272a | yes |
| `palm-city-pack:SM_Prop_Powerline_02` | 1 | 7.70 (z) | 0.227 / 0.239 (a 0.012 tilt), 0 | 0.0269 | 0.017 | 0.023 to 0.025 | 20 | #2a2c2f | yes |
| `sci-fi-frontier-pack:SM_Prop_Cable_16` | 1 | 12.01 (x) | 0.602, 0 | 0.0418 | 0.028 | 0.040 to 0.047 | 420 | #35383c 62%, beige bands #897e73 21% | mostly |
| Frontier `Cable_15` | 1 | 12.01 | 0.671 | 0.0417 | 0.027 | 0.040 to 0.047 | 624 | adds orange bands #d2632b | orange may read warm |
| City Pack `Power_Cables_01` | 3, at ±0.50 | 12.16 | 0.68 / 0.65 | 0.041 / 0.050 | 0.011 / 0.023 | 0.019 | 168 | #383b3f | multi-strand |
| Apocalypse `Powerpole_Line_01` (= `_Lines_01`) | 6 | 14.95 | at ±0.55 and ±1.17 @ 0.32, ±0.86 @ 0.86 | 0.0204 | 0.016 | 0.014 | 216 | #25272a | multi-strand |
| Frontier `Tether_Line_01/02` | 1 | 5.00 / 10.00 | 0.294 | 0.056 / 0.028 | 0.002 | 0.013 | 110 | #678aaf pale blue | no: reads as lit |

- **Item 7, do the ends meet the poles?**
  - Apocalypse `Line_01`'s six ends meet `Powerpole_01`'s six insulators within 0.01 m (across ±0.55, ±0.86, ±1.17; the two levels 0.54 m apart, against the insulators' 0.53). It is one mesh made for that pole, but it is six strands, not three.
  - Palm `Powerline_*` are single strands with their ends on the origin's axis. They meet any insulator by placement, and none carries a spacing that could clash with Palm's poles.
- **Item 9, thickness against `WIRE_RADIUS`:**

| Strand | Radius | Ladder: diameter in px at the opening pose (desktop 1280 x 720 / phone 390 x 844) | Factor to reach `WIRE_RADIUS` (0.118 m at 0.254) | `cam=street`, true size, at 26 m (720 px tall) |
| --- | --- | --- | --- | --- |
| code wire (0.03 u) | | 1.5 to 4.0 / 0.6 to 1.5 | 1 | 9.9 px (a 0.33 m cable in the city) |
| `Cables_03` | 0.032 | 0.3 to 1.2 / 0.1 to 0.4 | x3.7 | 1.9 px |
| `Single_Line_02` | 0.014 | 0.1 to 0.5 / under 0.2 | x8.7 | 0.8 px |
| `Powerline_02` | 0.024 | 0.2 to 0.8 / under 0.3 | x4.9 | 1.4 px |
| `Cable_16` | 0.045 | 0.4 to 1.5 / 0.2 to 0.6 | x2.6 | 2.8 px |

  - The ladder's opening pose ranges from 25.7 to 67.4 px/u on desktop and 9.4 to 24.3 on phone, from map 56 to map 01. The ladder poles are at 0.19 to 0.32 u/m.
  - **C3's cap.** C3 needs the live overlay (radius `WIRE_RADIUS` x 1.12 = 0.0336 u) to be at least the fitted strand's radius plus 0.005 u. So a ladder strand can be fattened to at most **0.0286 u**. That is `Cables_03` at x3.3 on an Apocalypse pole, or x4.8 on a Palm one.
- **Item 11, the dead look.** Every candidate strand is a neutral dark grey (luminance 0.020 to 0.059; `DEAD_WIRE` is 0.034), so all of them read as dead.
  - The live overlay is a code tube of larger radius, drawn over the strand, so it is unaffected.
  - `Cables_03` against the City Pack road is 0.99:1. Seen from above against the asphalt it disappears, but from `cam=street` it is seen against the buildings and sky. This is information, not a bar.

## 4. Spans and load

**Ladder spans (item 12).** `wireLayout` gives 1,711 spans over 64 maps, from 1.00 to 3.00 u (median 2.15, p10 1.80). At 0.254 u/m that is 3.9 to 11.8 m.

| Piece | Stretch at 0.254 u/m (Apocalypse today) | Stretch at 0.187 u/m (Palm) | Chained (over 1.25x) |
| --- | --- | --- | --- |
| `Cables_03` 13.49 | 0.29 to 0.88 | 0.40 to 1.19 | none |
| `Single_Line_02` 14.95 | 0.26 to 0.79 | 0.36 to 1.07 | none |
| `Powerline_02` 7.70 | 0.51 to 1.23 | 0.63 to 1.25 | 700 of 1,711 spans at 0.254 (41%), 1,415 at 0.187 (83%) |
| `Cable_16` 12.01 | 0.33 to 0.98 | 0.44 to 1.24 | 0 at 0.254, 336 at 0.187 |

- **The 0.5x floor in B2 and the K1 line is not met by the long pieces on short ladder spans** (down to 0.26x).
  - A single strand with one flat texel has nothing to distort when it is compressed: it only steepens. So the kit should accept a lower bound of about 0.25x on the ladder.
  - The architect sets that number; it is not a rule of Josh's.

**City spans (item 13; K1 has given none yet).** Taken at 12.5 m along a pavement and 16.5 m across a street between junctions.

| Piece | 12.5 m | 16.5 m crossing |
| --- | --- | --- |
| `Cables_03` | 1 piece, 0.93x | 1 piece, **1.22x** |
| `Single_Line_02` | 1, 0.84x | 1, 1.10x |
| `Powerline_02` | 2, 0.81x | **2, 1.07x** (the ticket said three) |
| `Cable_16` | 1, 1.04x | 2, 0.69x |

**Draw calls and triangles (item 10).** Every candidate is one primitive. As one `InstancedMesh` per key, the kit adds **one draw call per picked key**, on the ladder and on the 6 x 6 seed 1 city alike, however many spans there are.
- The hidden code `whole` tubes stop drawing, so on a busy ladder map the count probably falls. That is an estimate.
- The busiest ladder map, `48-the-old-arrangement`, has 34 runs, 66 spans (198 strands) and 32 pole spots:
  - `Cables_03`: 11.1k tris. `Single_Line_02`: 13.5k. `Powerline_02`: 4k to 8k. `Cable_16`: 83k.
  - Apocalypse poles: 19.9k. Palm `_01`: 7.4k.
- The city's span count waits on K1. Per 100 spans, `Cables_03` is 16.8k tris.

**Load (item 14).** The estimate is geometry plus every image the picked materials use.

| Pack (whole GLB) | Picks | Estimated subset GLB |
| --- | --- | --- |
| `palm-city-pack` (103 MB) | `Powerpole_01`, `_02` (+ `Powerline_02`) | **2.5 MB** (atlas 2.2 MB, geometry 0.03 MB; `_03` would add 0.26) |
| `sci-fi-frontier-pack` (103 MB) | `Cable_16` only, if picked | **3.8 MB** (atlas 3.8 MB) |
| `sci-fi-city-pack` (35 MB) | `Powerpoll_02`, if picked | 0.55 MB. D's scope names only Palm and Frontier, so this pick needs this pack in D too, or 35 MB on every page. |
| `city-pack` (23 MB) | `Cables_03` | no D run. The pipeline city loads the pack already, and the ladder seems to already, for its City Pack stack buildings (`models.ts`). |
| `apocalypse-power` (9.8 MB) | `Powerpole_01` | loaded today |

## 5. Recommendation

- **Poles (the mix):** `apocalypse-power:SM_Prop_Powerpole_01`, `palm-city-pack:SM_Prop_Powerpole_01` and `palm-city-pack:SM_Prop_Powerpole_02`.
  - All three are wood with their own insulators.
  - They stand within 2% of each other on the ladder.
  - `_02`'s crooked arm is the makeshift note.
  - D runs for Palm only (about 2.5 MB).
  - "Wooden" in Decided 041 stays true.
- **Wire piece:** `city-pack:SM_Prop_Power_Cables_03`, one kind for every line.
  - It is the only single strand whose sag matches `SAG_RATIO` (0.0404 against 0.04).
  - It fits both city spans unchained (up to 1.22x).
  - It is the thickest neutral strand, and its pack is already loaded.
  - **It lifts `SM_Prop_Power_Cables_*` off the never-used list (C6). Only Josh's pick does that.**
  - The runner-up is `Single_Line_02`: smooth and already loaded, but 2.4x thinner.
- **What it costs:**
  - It changes Decided 037 "poles 3:1 against the street" (Q15), unless Josh tints.
  - The ladder's poles grow from 8.9 m to 9.6 m (Apocalypse wires meet its insulators, 042 D's pending item).
  - The Palm poles need Q17.
  - The ladder strands need Q18.
  - No merged section, digest pin or approved number moves.

## 6. Questions for Josh (recommended answer first)

- **Q15.** Every pack pole that can carry three wires is 2.1 to 2.5:1 against the street, under the 3:1 you Decided in 037. Today's ladder pole has been at 2.41 since 042. Keep them as they are (the overlay now tells the parts apart), tint them about x1.4 to x1.6 lighter, or drop them? **Recommended: keep.** It changes Decided 037's bar, so it needs your words.
- **Q16.** It does not arise in practice. The two arms wider than the wire spacing (Apocalypse, Sci-Fi City) already have their attachments within 0.015 u of the wires. **Recommended: no change** (no stretch).
- **Q17 (new).** On the ladder, Palm's outer insulators sit inside the wires: ±0.16 u against ±0.22 u, a 0.32 m gap. Stretch the Palm poles across by x1.37 so the wires land on them, leave the gap, or drop Palm from the ladder? **Recommended: stretch.**
- **Q18 (new).** On the ladder a true-thickness pack wire is under 1 px, nearly invisible. Fatten ladder strands to 0.0286 u (just under the live glow, about x3.3 to x4.8), or keep them true size? **Recommended: fatten on the ladder, true size in the city** (1.9 px at `cam=street`).
- **Picks.** Poles: Apocalypse `Powerpole_01` and Palm `Powerpole_01` and `_02`. Wire: City Pack `Power_Cables_03`. Yes, or your own from the sheet?

## 7. What the orchestrator does for each answer

- **Q15 keep:** C rewrites Decided 037's pole line in chapter 9 with Josh's words. The `POLE_WOOD` test stays for the fallback. **Tint:** B's table gains a tint per pole, and C asserts 3:1 on the tinted colour. **Drop:** there is no pack pole, and C draws code poles only.
- **Q17 stretch:** B's `placePole` takes an across factor per pole, and B4 asserts the outer attachments at ±`PHASE_OFFSET` within 0.01 u. **Gap:** B4 reports the 0.06 u and C keeps code insulators at the wire ends. **Drop:** Palm is city-only, and the ladder's list is Apocalypse alone.
- **Q18 fatten:** B's `fitLine` takes a radius target (0.0286 u on the ladder, none in the city), and C3's overlay check holds. **True size:** C3 is unchanged, and Josh judges in the browser (C7).
- **Picks:**
  - D runs `palm-city-pack-power` only. If Josh picks `Powerpoll_02`, D's scope gains `sci-fi-city-pack`: the architect re-cuts D's files line.
  - C lifts `SM_Prop_Power_Cables_*` only if `Cables_03` is picked.
- **The architect's notes (not Josh's):**
  - B2 adds a 3.5 m height-step case.
  - The fit floor becomes about 0.25x on the ladder.
  - `placePole` needs a yaw per pole (the arm axis is z or x by pack) and an along offset (0.05 to 0.22 m).
  - Correct the inventory: Frontier poles carry no cross-arm, and a Palm piece chains as two pieces on a 16.5 m crossing, not three.

## 8. The picture sheet (for the main session to render from the GLBs)

These are the framings, used by every picture below:
- **F1, pole beside the reference.** Each pole at true size on a #454545 ground, with `apocalypse-power:SM_Prop_Powerpole_01` 3 m to its left and a 1.8 m box figure 1.5 m to its right.
  - The camera looks along the run, square to the arm. It stands at 2 x the tallest top, with the eye at 0.6 x the top, FOV 40, in day light.
- **F2, the head close-up.** An inset on the pole's F1 picture: the camera is 3 m from the attachments along the run, 10 degrees above them. The three measured attachment points are marked with r 0.05 m spheres.
- **F3, the strand.** A side view of the whole piece at true size, with `sagSpan`'s 0.04 parabola drawn dashed through its ends.
- **F4, the street run.** One per pole, strung with `Cables_03`, and one per wire piece, on Apocalypse poles. At `cam=street` framing (back 26 m, eye 9 m, look 6 m, yaw 35, FOV 50), four poles of one key 12.5 m apart along a pavement, then one 16.5 m crossing.
  - Three conductors per span, using the piece fitted (stretched or chained as in section 4).
- **F5, the mixed run.** F4 with the three recommended poles in hash order, strung with `Cables_03`.

| Group | Key | Frames | Numbers beside it |
| --- | --- | --- | --- |
| Poles | `apocalypse-power:SM_Prop_Powerpole_01` | F1, F4 | top 6.30, attach 5.86, ±0.86, 6 own insulators, 2.41:1, 621 tris |
| | `palm-city-pack:SM_Prop_Powerpole_01` | F1, F4 | top 8.99, attach 8.54, −0.83/+0.22/+0.88, 2.17:1, 232 tris |
| | `palm-city-pack:SM_Prop_Powerpole_02` | F1, F4 | top 9.01, tilted arm 8.41 to 8.73, 2.14:1, 232 tris |
| | `sci-fi-city-pack:SM_Prop_Powerpoll_02` | F1, F4 | top 5.07, crossbar ±0.71 @ 5.02, no insulators, coloured bundles, 2.46:1, 644 tris |
| | rejected, one strip in F1: Palm `Powerpole_03`, Frontier `Power_Pole_01/02/03`, Apocalypse `Powerpole_Single_01` | F1 | H-frame ±0.45; no cross-arm; 2 insulators ±0.15 |
| Cross-arms (no pack has a loose cross-arm; these are the poles' heads) | the four poles above | F2 | the attachment table in section 2 |
| Wire pieces | `city-pack:SM_Prop_Power_Cables_03` | F3, F4 | 13.49 m, sag 0.0404, r 0.032, 56 tris |
| | `apocalypse-power:SM_Prop_Powerpole_Single_Line_02` | F3, F4 | 14.95 m, sag 0.0365, r 0.014, 68 tris |
| | `palm-city-pack:SM_Prop_Powerline_02` | F3, F4 (crossing chained, 2 x 1.07) | 7.70 m, sag 0.027, r 0.024, 20 tris |
| | `sci-fi-frontier-pack:SM_Prop_Cable_16` | F3, F4 (crossing chained, 2 x 0.69) | 12.01 m, sag 0.042, r 0.045, 420 tris |
| Mixed | the recommended three poles plus `Cables_03` | F5 | |

That is 18 pictures: 5 F1 (the four poles' F2 insets on them), 4 F3, 4 F4 for the poles, 4 F4 for the wires and 1 F5. Load one large GLB at a time.

## 9. The probe

It was a scratch folder under the system temp directory (`071a-probe`): a GLB reader with a PNG decoder (node only, no new dependency) and a `tsx` script over a copy of `src/`. It was deleted after the run, as the main session asked. It can be rebuilt from this note.
