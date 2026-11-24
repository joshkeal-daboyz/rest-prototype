# 081 D4 · The wall fitting shortlist, and the drop wire's gauge

Ticket 081, section D4. Josh, 24 Nov 2026, on cards (as relayed by the main session): "Shortlist (Recommended)" for the wall fitting, then "Approve all (Recommended)". This note serves those answers. It is for two cards: `wallFitting` and `dropWire`.

**This note picks nothing and ranks nothing.** Candidates are in manifest order: pack order in `manifest.json`, then the piece's index. A question card holds four options. So each card carries the first four in manifest order, and its question names the rest for a free answer. Any other piece can still be named that way.

## First: what no wire pick can fix (premise check)

The drop investigation found "a wire of about 6 cm". `POWER_LINE` is 6.4 cm across. Every true-size pack strand is 3.1 to 8.1 cm across. From the opening cameras, every one of them is **under 1.1 px wide**:

| Wire | Across | px at the nearest street-camera drop, 1920 x 1080 |
| --- | --- | --- |
| `POWER_LINE` (today) | 6.4 cm | 0.8 |
| thinnest pack strand | 3.1 cm | 0.4 |
| thickest pack strand (Frontier hose) | 8.1 cm | 1.1 |

A thicker-looking drop at true size is not in the packs. A scaled-up wire is not listed, as the ticket says. Only Josh's words can ask for one.

## How it was measured

- **Sizes, triangles and flags** come from `assets/private/out/manifest.json` (generated 22 Nov 2026). Sizes are width x height x depth in metres, as the gallery shows them. **No candidate below has a flag.**
- **Where the wire meets the fitting** is read from the GLB vertices: the pack's node, unscaled, read by a scratch script outside the repo. "Up" is the height over the piece's base. "Out" is the distance from its back (the face that goes on the wall).
- **Pictures** were drawn by a small scratch rasteriser from the GLB triangles. Nothing came from Blender, a browser or a page. The geometry is flat-shaded and untextured. Two sheets are in `D:\rest-prototype-main\assets\private\081-D4\` (git-ignored, never committed):
  - `01-wall-fitting.png`: A to F, front and side, on a stand-in wall. The wire point (red) is at 5.5 m (yellow). Grey lines mark 3.2 m storeys (`kitunits` `STOREY_M`). A 1.8 m figure stands beside each. Josh's `lampBuilding` pick (Palm `Light_Wall_01`) hangs 0.6 m (`ON_POLE_GAP_M`) under each fitting, as K3b places it. A drop wire leaves each one.
  - `02-drop-wire.png`: each wire whole on the left, and 1.5 m of its middle at 400 px a metre on the right. The red bar is 10 cm.

  These are framing sketches, not the city.
- **Reads at 5.5 m?** This is measured on 6 x 6 seed 1 in a probe: the 102 x 107-cell city, 250 drops, and the cameras' own maths copied from `createCityRig` and `planStreetPose`.

  | Camera | 1280 x 720 | 1920 x 1080 | Notes |
  | --- | --- | --- | --- |
  | Default, at the fit | 0.9 px/m | 1.3 to 1.4 px/m | At every drop |
  | `cam=street`, nearest drop in frame | 8.8 px/m | 13.2 px/m | 143 drops are in frame. The nearest is 99 m away, the median 315 m (2.5 / 3.7 px/m). |

  The street camera's lens is taken at its narrowest (50°), so these are upper bounds. Zooming the default camera in to its limit (0.06 of the fit distance) gives about 15 to 23 px/m (*estimate*).

  **From the default camera, no fitting reads without zooming in.** The largest is about 5 px.
- **What the makers show.** I could not reach the store pages: syntystore.com answered HTTP 429 ("local_rate_limited") on 24 Nov 2026, and I did not retry it. So each row quotes `docs/design/073-pack-intended-use.md`. That note covers only some families. "Not in the note" means it says nothing about the piece, which is not approval.
- **Gallery link:** `/?assets=<pack>&piece=<name>`, with `npm run dev` (074's gallery).

## The wall fitting

Every candidate stands unscaled, its back on the wall, with its wire point at the drop's 5.5 m (K3b criterion 2). The columns are:

- **Spans:** the height the fitting covers on the wall.
- **Lamp under it:** where `lampBuilding` (0.72 m) lands, 0.6 m under the fitting's foot.
- **px at the street camera:** its height, at the nearest in-frame drop, 1920 x 1080.

| | `pack:name` | Size (m) | Tris | What it is (from the geometry) | Where the wire meets it: up / out | Spans | Lamp under it | 073 / store | px at the street camera | Load | Gallery |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **A** | `apocalypse-power:SM_Prop_PowerBoxes_02` | 0.16 x 2.99 x 0.70 | 216 | Three conduits with meter boxes. Its boxes face +x, so it needs a quarter turn (as D1). | The open top of a conduit: **2.99 / 0.06** (three tops, 0.24 m apart) | 2.51 to 5.50 m | 1.19 to 1.91 m | Not in the note | 39 | Loaded today | `/?assets=apocalypse-power&piece=SM_Prop_PowerBoxes_02` |
| **B** | `city-pack:SM_Prop_Pipe_Small_01` | 0.15 x 4.00 x 0.39 | 288 | A wall pipe on clips, its top turned out from the wall with the mouth facing the street (a service-head shape). The clips mark the back (+z). | The mouth of the turned-out top: **3.95 / 0.39** | 1.55 to 5.55 m | 0.23 to 0.95 m | Not in the note. City Pack is not covered. | 53 | Loaded today | `/?assets=city-pack&piece=SM_Prop_Pipe_Small_01` |
| **C** | `city-pack:SM_Prop_Sign_Attachment_02` | 0.21 x 0.67 x 0.34 | 44 | A wall plate with two arms (a sign bracket). | The upper arm's tip: **0.53 / 0.34** | 4.97 to 5.64 m | 3.65 to 4.37 m | Not in the note. City Pack is not covered. | 9 | Loaded today | `/?assets=city-pack&piece=SM_Prop_Sign_Attachment_02` |
| **D** | `palm-city-pack:SM_Prop_PowerBox_03` | 0.26 x 0.93 x 0.17 | 120 | A small box on a conduit whose top bends into the wall. | The crown of the bend: **0.93 / about 0.10** | 4.57 to 5.50 m | 3.25 to 3.97 m | Not in the note (Palm: vines only) | 12 | Joins 071 D's Palm subset | `/?assets=palm-city-pack&piece=SM_Prop_PowerBox_03` |
| E | `palm-city-pack:SM_Prop_PowerBoxes_03` | 0.47 x 2.20 x 0.20 | 248 | A fuse cluster on two conduits, both bending into the wall at the top. | The crown of the taller bend: **2.20 / about 0.10** (the other at 2.09) | 3.30 to 5.50 m | 1.98 to 2.70 m | Not in the note (Palm: vines only) | 29 | Joins 071 D's Palm subset | `/?assets=palm-city-pack&piece=SM_Prop_PowerBoxes_03` |
| F | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_06` | 0.42 x 1.17 x 0.26 | 76 | A keypad box with a cable stub at its foot. | The stub, under the box: **0.04 / 0.18** | 5.47 to 6.63 m (above the wire point) | 4.15 to 4.87 m | "Wall boxes ... on façades at and above the ground storey" (inferred) | 15 | Sci-Fi City is already in the component picks' load | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_06` |

What each candidate brings with it. These are bounds sums, not a count of clashes (that is K3b criterion 5's job):

- **A and B reach below `SIGN_BASE_M` 2.85 m** (facades), A to 2.51 m and B to 1.55 m. That is the shop-sign and awning band. They also push the building lamp down to eye height (A) or to the knee (B).
- **C is the smallest:** 9 px at the street camera, and under 1 px from the default camera.
- **F is the only one that sits above the wire point,** with the wire entering its foot. It is also the same wall-box family as five of Josh's component picks (breaker, switch, relay, spring and fusebox are `WallAttach_Electronics_01` to `_05`). On every building it may read as a component, and telling components apart is the overlay's job (071).
- **D and E bend into the wall.** The wire meets the bend's crown, about 0.1 m out. B's mouth faces the street, 0.39 m out.

Looked at and left out, from the geometry:

- **Sci-Fi City `Cable_Crossing_Machine_01` and `_Rail_01`** are ground cable ramps. `_Pillar_01` is a 3.96 m column. 073 inferred `Cable_Crossing_*` to be façade cable anchors by their name, and the shapes do not bear that out.
- **Apocalypse `Poles_01`** is a stack of poles lying down.
- **City `Light_Attachment_01`** is a lamp on an arm.
- **Sci-Fi City `Meter_01`** stands on a post.
- **Frontier `Cable_Stand_01` and `Cable_Group_01`** are ground stands.
- **Palm `PowerBoxes_01`, `_02` and Apocalypse `PowerBoxes_01`** are larger kin of E and A (2.45 to 2.99 m). Each can be named on the card's free answer.
- **No pack has a wall insulator, hook or weatherhead as a piece of its own.**

## The drop wire

`fitLine` hangs one piece along one axis, stretched 0.25 to 1.25 times and chained beyond that, with its sag fitted. A drop is one conductor. **Thickness** below is measured across the strand at mid-length, from the triangles.

| | `pack:name` | Length (m) | Across (cm) | Sag in the piece (m) | Tris | What it is | Load | Gallery |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Keep `POWER_LINE`** | `city-pack:SM_Prop_Power_Cables_03` | 13.49 | **6.4** round (`radius_m` 0.0318) | 0.61 | 56 | Today's wire, on every span and drop | Loaded | `/?assets=city-pack&piece=SM_Prop_Power_Cables_03` |
| 1 | `apocalypse-power:SM_Prop_Powerpole_Single_Line_01` | 14.95 | **3.1 x 2.6** | 0.70 | 36 | One strand, a coarse five-segment curve (sheet row 2) | Loaded | `/?assets=apocalypse-power&piece=SM_Prop_Powerpole_Single_Line_01` |
| 2 | `apocalypse-power:SM_Prop_Powerpole_Single_Line_02` | 14.95 | **3.1 x 2.6** | 0.58 | 68 | One strand with a smooth curve. 071 listed it as a clean single strand. | Loaded | `/?assets=apocalypse-power&piece=SM_Prop_Powerpole_Single_Line_02` |
| 3 | `palm-city-pack:SM_Prop_Powerline_02` | 7.70 | **4.6 x 4.9** | 0.27 | 20 | One strand (071's list). Chains two pieces past about 9.6 m. | Joins 071 D's Palm subset | `/?assets=palm-city-pack&piece=SM_Prop_Powerline_02` |
| 4 | `sci-fi-frontier-pack:SM_Prop_Cable_15` | 12.01 | **8.1 x 9.3**, collars to 26 | 0.72 | 624 | One hose with ring collars along it | Frontier subset run | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Cable_15` |
| 5 | `sci-fi-frontier-pack:SM_Prop_Cable_16` | 12.01 | **8.1 x 9.3**, collars to 22 | 0.65 | 420 | One hose with fewer collars. 071 listed it as a clean single strand. | Frontier subset run | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Cable_16` |

Not listed, because they cannot hang as one drop conductor:

- Palm `Powerline_01` is dead straight, with no sag to fit (071).
- City `Power_Cables_01` / `_02` are three strands of 3.8 cm.
- Palm `Powerline_03` to `_09` and Frontier `Cable_12` to `_14`, `_17` and `_18` are bundles, tangles, drops or hoses (071).
- Apocalypse `Powerpole_Line_01` / `_Lines_01` are six strands.

Any pick other than `POWER_LINE` needs a `POWER_LINES` entry (its ends, sag and radius, measured as 071 B did) before `fitLine` can hang it. That is K3b's job.

## The cards (one line per option)

**`wallFitting`**: "Which fitting meets each drop on the wall, at 5.5 m? (E: Palm PowerBoxes_03, 2.2 m, or F: SciFi Electronics_06, a keypad box above the wire, can be named as Other.) Sheet: assets/private/081-D4/01-wall-fitting.png"

- **A: Apocalypse PowerBoxes_02.** Meter boxes on three conduits, 3 m down the wall; the wire enters a conduit top.
- **B: City Pipe_Small_01.** A 4 m wall pipe whose top turns out to the street; the wire meets its mouth, 0.39 m out.
- **C: City Sign_Attachment_02.** A 0.67 m wall bracket; the wire ties to its upper arm, 0.34 m out.
- **D: Palm PowerBox_03.** A 0.93 m box on a conduit bending into the wall; the wire meets the bend.

**`dropWire`**: "Which wire do drops hang with? Spans keep POWER_LINE. At true size every option is under about 1 px from the opening cameras. (Apocalypse Single_Line_01, coarse, or Frontier Cable_15, more collars, can be named as Other.) Sheet: assets/private/081-D4/02-drop-wire.png"

- **Keep `POWER_LINE`.** Today's City wire, 6.4 cm.
- **Apocalypse Single_Line_02.** A thinner single strand, 3.1 cm, already loaded.
- **Palm Powerline_02.** A single strand, 4.7 cm; joins the Palm subset.
- **Frontier Cable_16.** A hose, 8.1 cm with collars; needs a Frontier subset run.

The wire card shows one piece per pack: the one 071 measured as a clean single strand. The fitting card shows the first four in manifest order.

## What the main session does with each answer

- His words and the date go into the new **Scenery** table of `docs/design/081-component-picks.md`, one row each for `wallFitting` and `dropWire`. K3b transcribes it.
- **Any `wallFitting`:** K3b places it with this note's "up / out" as the wire point. A or B: K3b criterion 5 should report shop-sign meetings first, since both reach below 2.85 m. F: the wire enters from below.
- **`dropWire` other than "Keep":** K3b adds its `POWER_LINES` entry. A Palm pick joins 071 D's subset. A Frontier pick needs a subset run before K3b draws it. After merge, the game pack is stale until `npm run assets:game` (082 B).
- **"Keep `POWER_LINE`":** the key stays null and drops keep today's wire. No load change.
- **No merged section, digest pin or approved number moves** on any answer here. K3b is the only section that reads it.

## The probe

`C:\Users\Josh\AppData\Local\Temp\claude\56b8fba0bedb55d2\e6d4a7bc-955b-468c-bf48-de3abac7abd6\scratchpad\d4\`. It holds:

- `glb.js`: the GLB reader.
- `fit.js`, `cut.js` and `wire.js`: the wire points and thicknesses.
- `mount.js` and `wires.js`: the sheets.
- `probe/cam.ts`: the camera numbers, on a copy of `src/core` and `src/city` from this branch.

It is a sketch. The builder's numbers are the record.
