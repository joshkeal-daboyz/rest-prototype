# 081 D1 · The component shortlist

Ticket 081, section D1 (approved, G1, Josh, 23 Nov 2026: "Approve 081"). Josh's answers it serves: 8, **"Yes, a picked prop"** (the damaged line gets a model at the cut, and the wire stays code-drawn), and 9, **"A card per component"**.

**This note picks nothing and ranks nothing.** On each card the candidates are in manifest order (pack order in `manifest.json`, then the piece's index). The ticket allows up to six candidates. This note gives four, because a question card holds four options. Any other piece in the converted packs can still be named through the card's free answer.

## How it was measured

- **Sizes, triangles and flags** come from `assets/private/out/manifest.json` (generated 22 Nov 2026). Sizes are width x height x depth in metres, as the gallery shows them, and nothing is rescaled. "Flags" are the gallery's flag labels (untextured, missing texture, warnings, never used). **No candidate below has a flag.**
- **Every candidate's origin is at its base, centred.** Its depth runs from −d/2 to +d/2. So a piece mounted on a pole or wall must be moved out by half its depth (K3's job).
- **Pictures.** One sheet per component. It was rendered with headless Blender from the converted GLBs and written to `D:\rest-prototype-main\assets\private\081-D1\` (git-ignored, never committed). Each candidate is at true size, beside a 1.8 m figure, in its place:
  - pole parts on `apocalypse-power:SM_Prop_Powerpole_Single_01`, a bare 6.3 m pole;
  - building lamps on a stand-in wall, with a yellow mark at 5.5 m;
  - the cut prop under a stand-in wire at 6.0 m;
  - roof structures on a 3 m block standing in for a roof.

  These are framing sketches, not the city.
- **"Fits its place"** is measured from the bounds against the place's numbers in `070-K1-circuit.md` and this ticket:
  - poles stand 0.75 m from the kerb on a 5 m pavement cell;
  - the Apocalypse pole is 6.30 m high, with its wires at 5.86 m;
  - drops meet the wall at 5.5 m;
  - the lowest crossing hangs at 5.20 m;
  - the walk's floor is 4.2 m;
  - `FURN_KEEP_M` is 1.5 m.

  Anything that is not a bounds sum is marked *estimate*.
- **What the packs' makers show** is quoted from `docs/design/073-pack-intended-use.md`. That note covers only some families. "Not in the note" means it says nothing about the piece, which is not approval.
- **Gallery link:** `/?assets=<pack>&piece=<name>`, with `npm run dev` (074's gallery).

### What a pick costs to load (whole-pack GLB sizes, measured on disk)

| Pack | GLB | Loaded for the city today? |
| --- | --- | --- |
| `apocalypse-power` | 9.8 MB | Yes. `POWER_MIX` (powerkit.ts) names its pole. |
| `city-pack` | 23.0 MB | Yes. |
| `palm-city-pack` | 103.3 MB | `POWER_MIX` names two Palm poles. 071 D's small `palm-city-pack-power` GLB is not in the manifest yet. A Palm pick would join that subset. |
| `sci-fi-city-pack` | 34.6 MB | Not named by `plan3d.ts` or `powerkit.ts` on this branch. A pick adds it, or a subset of it. |
| `sci-fi-frontier-pack` | 102.7 MB | No. A pick needs a subset run, as 071 D did for Palm. |
| `town-pack` | 113.6 MB | No. It is not loaded for the city page (070, Q35). A pick needs a subset run. |

## The overlay icon that carries each reading (E1)

The 3D model is only how the city looks. The 2D overlay's icon carries the reading (071: "Telling the puzzle's components apart is the overlay's job"). E1 moves these glyphs from `map-renderer.ts` unchanged.

| Component | Icon (today's 2D glyph) |
| --- | --- |
| feed | A square with a lightning bolt, warm while live. |
| breaker | A box with a bar: flat when closed, tilted when open. It is labelled ON or OFF and carries the tribe ribbon. |
| switch | A circle with a lever to the selected output and a dim stub to the other, plus the ribbon. |
| relay | The switch's circle with a second ribbon. When dead it is dashed at half strength, with a bar across it. |
| spring | The switch's circle with a zigzag coil under it. The lever twangs back when it springs. |
| fusebox | A box with the fuse bar, and a load bar against its rating. A blown fuse shows a scorch mark and a snapped bar. |
| junction | A small dot. A dead junction is a box with broken stubs that fizz. |
| battery | A cell with a terminal nub and a charge bar that fills from the bottom. It glows while released. |
| lampBuilding | A lamp disc with a light pool scaled by load. A dead lamp flickers red. |
| lampPost | The same lamp glyph. |
| damagedLine | The gap mark at the span's cut point, sparking only while live (E1 criterion 5). |
| roofMast | **No icon of its own.** It is a carrier: the overlay draws the node it holds (breaker, switch or fuse box, 6b) and the line's chain through it. |

## The pole-box pool (breaker, switch, relay, spring, fuse box)

These five stand on a pole (CK12), or the breaker, switch and fuse box on a roof structure (6b). The packs hold 13 pieces that mount on a pole's face. Each of the five cards offers four of them, so **a piece can appear on two cards.** A free answer can name any of the 13. Two components on one model would still read apart on the overlay.

Sheet of all 13 on a pole: `D:\rest-prototype-main\assets\private\081-D1\00-pole-box-pool.png`

| # | `pack:name` | Size (m) | Tris | What 073 says | On a pole |
| --- | --- | --- | --- | --- | --- |
| 1 | `apocalypse-power:SM_Prop_PowerBoxes_01` | 0.16 x 2.99 x 1.18 | 528 | Not in the note | Conduit with meter boxes, from the ground up to 3 m. Its boxes face +x, so it needs a quarter turn (−90° about the vertical, as the sheets draw it), unlike the rest. |
| 2 | `apocalypse-power:SM_Prop_PowerBoxes_02` | 0.16 x 2.99 x 0.70 | 216 | Not in the note | As 1, narrower. |
| 3 | `palm-city-pack:SM_Prop_PowerBox_02` | 0.42 x 1.34 x 0.19 | 200 | Not in the note | Meter box with a conduit tail. |
| 4 | `palm-city-pack:SM_Prop_PowerBox_03` | 0.26 x 0.93 x 0.17 | 120 | Not in the note | Small box with a conduit. |
| 5 | `palm-city-pack:SM_Prop_PowerBox_04` | 0.22 x 0.20 x 0.34 | 100 | Not in the note | Tiny junction box. Hard to see from the street at 0.20 m. |
| 6 | `palm-city-pack:SM_Prop_PowerBoxes_01` | 0.70 x 2.99 x 0.21 | 284 | Not in the note | Fuse cluster with a hazard sign, with conduits from the ground to 3 m. |
| 7 | `palm-city-pack:SM_Prop_PowerBoxes_03` | 0.47 x 2.20 x 0.20 | 248 | Not in the note | Smaller cluster, from the ground to 2.2 m. |
| 8 | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_01` | 1.03 x 1.88 x 0.45 | 242 | "Wall boxes ... on façades at and above the ground storey" (inferred) | Panel with three buttons, one red. Twice the width of anything else in the pool. |
| 9 | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_02` | 0.82 x 0.74 x 0.50 | 202 | Same row | Box with its door open and fuse strips showing. |
| 10 | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03` | 0.59 x 0.70 x 0.34 | 76 | Same row | Small box with a handle. |
| 11 | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_04` | 0.82 x 0.92 x 0.34 | 90 | Same row | Box with a teal trim. |
| 12 | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_05` | 1.36 x 2.75 x 0.42 | 484 | Same row | Box with two cable legs down to the ground, 2.75 m high. |
| 13 | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_06` | 0.42 x 1.17 x 0.26 | 76 | Same row | Keypad panel. |

Every pool piece fits below the Apocalypse pole's wires (5.86 m) as the sheets mount them: the tall ones (1, 2, 6, 7, 12) from the ground, the rest from about 2.2 to 3.0 m. The tallest, 1, 2 and 6 at 2.99 m, top out 2.87 m under the wires. None reaches the walk's 4.2 m floor, which binds spans, not pole parts.

## The cards, in `CIRCUIT_COMPONENTS` order

Each row gives the key, size, triangles, what 073 says, whether it fits its place, and the gallery link. Flags are "none" for every row.

### 1. feed

The place: a pole just outside the district (K1 Q10). Its look "reads as a pole-mounted transformer" (CK12). The Apocalypse mix pole already carries a can at about 3.5 m (it shows on the sheet), so the feed's model is what tells it apart from that.
Sheet: `D:\rest-prototype-main\assets\private\081-D1\01-feed.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `apocalypse-power:SM_Prop_Transformer_01` | 2.09 x 2.47 x 3.23 | 2,750 | Not in the note | Ground transformer at the pole's foot. Its 3.23 m length on a 5 m cell, set across the pavement behind the pole at 0.75 m from the kerb, leaves about 0.9 m of walk (*estimate*: 5 − 0.75 − 0.15 − 3.23). Turned lengthwise along the kerb, it leaves about 2.0 m (5 − 0.9 − 2.09). | `/?assets=apocalypse-power&piece=SM_Prop_Transformer_01` |
| B | `palm-city-pack:SM_Prop_Powerbox_01` | 1.89 x 1.50 x 1.10 | 1,466 | Not in the note | Ground cabinet with a hazard sign, at the pole's foot. Across the pavement it takes 1.10 m and leaves about 3.0 m of walk (*estimate*). | `/?assets=palm-city-pack&piece=SM_Prop_Powerbox_01` |
| C | `palm-city-pack:SM_Prop_Powerpole_03` | 2.62 x 10.83 x 3.06 | 3,454 | Not in the note | **Replaces the feed's pole** rather than standing on it: an H-frame with a transformer platform. 071 A rejected it as a line pole (H-frame, attachments at ±0.45 m). As the feed it needs its own `placePole` entry and is 10.83 m against the mix's 6.30 to 9.01. | `/?assets=palm-city-pack&piece=SM_Prop_Powerpole_03` |
| D | `sci-fi-city-pack:SM_Bld_Power_04` | 1.54 x 5.46 x 1.54 | 512 | `Bld_Power_*`: "Not identified in any scene" (not shown) | Insulator column at the pole's foot, 1.54 m square: about 2.6 m of walk left (*estimate*). Taller than the furniture limit (`FURN_MAX_H_M` 3.2 m), so I2 must read it as a circuit item. | `/?assets=sci-fi-city-pack&piece=SM_Bld_Power_04` |

### 2. breaker

The place: a pole with 2 or more attachments, or a roof structure (6b).
Sheet: `...\081-D1\02-breaker.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `palm-city-pack:SM_Prop_PowerBox_02` | 0.42 x 1.34 x 0.19 | 200 | Not in the note | Yes (pool 3) | `/?assets=palm-city-pack&piece=SM_Prop_PowerBox_02` |
| B | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_01` | 1.03 x 1.88 x 0.45 | 242 | Wall boxes, inferred | Yes, but 1.03 m wide on a pole about 0.3 m wide (pool 8) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_01` |
| C | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03` | 0.59 x 0.70 x 0.34 | 76 | Wall boxes, inferred | Yes (pool 10) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_03` |
| D | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_06` | 0.42 x 1.17 x 0.26 | 76 | Wall boxes, inferred | Yes (pool 13) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_06` |

### 3. switch

The place: a pole with 3 or more attachments, or a roof structure (6b).
Sheet: `...\081-D1\03-switch.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `apocalypse-power:SM_Prop_PowerBoxes_02` | 0.16 x 2.99 x 0.70 | 216 | Not in the note | Yes, with a quarter turn (pool 2) | `/?assets=apocalypse-power&piece=SM_Prop_PowerBoxes_02` |
| B | `palm-city-pack:SM_Prop_PowerBox_03` | 0.26 x 0.93 x 0.17 | 120 | Not in the note | Yes (pool 4) | `/?assets=palm-city-pack&piece=SM_Prop_PowerBox_03` |
| C | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_04` | 0.82 x 0.92 x 0.34 | 90 | Wall boxes, inferred | Yes (pool 11) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_04` |
| D | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_05` | 1.36 x 2.75 x 0.42 | 484 | Wall boxes, inferred | Yes. Its two cable legs reach the pavement and take 1.36 m across the pole line (pool 12). | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_05` |

### 4. relay

The place: as the switch (a relay is a switch with `relay: true`).
Sheet: `...\081-D1\04-relay.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `apocalypse-power:SM_Prop_PowerBoxes_02` | 0.16 x 2.99 x 0.70 | 216 | Not in the note | Yes, with a quarter turn (pool 2) | `/?assets=apocalypse-power&piece=SM_Prop_PowerBoxes_02` |
| B | `palm-city-pack:SM_Prop_PowerBox_02` | 0.42 x 1.34 x 0.19 | 200 | Not in the note | Yes (pool 3) | `/?assets=palm-city-pack&piece=SM_Prop_PowerBox_02` |
| C | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_04` | 0.82 x 0.92 x 0.34 | 90 | Wall boxes, inferred | Yes (pool 11) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_04` |
| D | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_06` | 0.42 x 1.17 x 0.26 | 76 | Wall boxes, inferred | Yes (pool 13) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_06` |

### 5. spring

The place: as the switch (`spring: true`).
Sheet: `...\081-D1\05-spring.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `apocalypse-power:SM_Prop_PowerBoxes_01` | 0.16 x 2.99 x 1.18 | 528 | Not in the note | Yes, with a quarter turn (pool 1) | `/?assets=apocalypse-power&piece=SM_Prop_PowerBoxes_01` |
| B | `palm-city-pack:SM_Prop_PowerBox_03` | 0.26 x 0.93 x 0.17 | 120 | Not in the note | Yes (pool 4) | `/?assets=palm-city-pack&piece=SM_Prop_PowerBox_03` |
| C | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03` | 0.59 x 0.70 x 0.34 | 76 | Wall boxes, inferred | Yes (pool 10) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_03` |
| D | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_05` | 1.36 x 2.75 x 0.42 | 484 | Wall boxes, inferred | Yes, with legs to the pavement (pool 12) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_05` |

### 6. fusebox

The place: a pole with 2 or more attachments, "as a pole-mounted cutout" (CK12), or a roof structure (6b).
Sheet: `...\081-D1\06-fusebox.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `apocalypse-power:SM_Prop_PowerBoxes_01` | 0.16 x 2.99 x 1.18 | 528 | Not in the note | Yes, with a quarter turn (pool 1) | `/?assets=apocalypse-power&piece=SM_Prop_PowerBoxes_01` |
| B | `palm-city-pack:SM_Prop_PowerBoxes_01` | 0.70 x 2.99 x 0.21 | 284 | Not in the note | Yes (pool 6) | `/?assets=palm-city-pack&piece=SM_Prop_PowerBoxes_01` |
| C | `palm-city-pack:SM_Prop_PowerBoxes_03` | 0.47 x 2.20 x 0.20 | 248 | Not in the note | Yes (pool 7) | `/?assets=palm-city-pack&piece=SM_Prop_PowerBoxes_03` |
| D | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_02` | 0.82 x 0.74 x 0.50 | 202 | Wall boxes, inferred | Yes (pool 9) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_02` |

### 7. junction

The place: any pole, wherever a line branches (CK12). Under answer 5 the poles between a line's ends are carriers only, so a junction is a node of the schematic, not one at every bend.
Sheet: `...\081-D1\07-junction.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `palm-city-pack:SM_Prop_PowerBox_04` | 0.22 x 0.20 x 0.34 | 100 | Not in the note | On the pole, yes. At 0.20 m high it is barely visible from the street (pool 5). | `/?assets=palm-city-pack&piece=SM_Prop_PowerBox_04` |
| B | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03` | 0.59 x 0.70 x 0.34 | 76 | Wall boxes, inferred | On the pole, yes (pool 10) | `/?assets=sci-fi-city-pack&piece=SM_Prop_WallAttach_Electronics_03` |
| C | `sci-fi-frontier-pack:SM_Prop_Cable_Junction_01` | 0.87 x 3.43 x 0.87 | 950 | "Cables lie on the ground ... between small stands and boxes" (the stand match is inferred) | A column at the pole's foot, 0.87 m square, which leaves about 3.2 m of walk (*estimate*). At 3.43 m it is over `FURN_MAX_H_M`. | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Cable_Junction_01` |
| D | `sci-fi-frontier-pack:SM_Prop_Cable_Junction_01_Alt_01` | 0.87 x 1.11 x 0.87 | 396 | Same row | A crate at the pole's foot, as C, 1.11 m high | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Cable_Junction_01_Alt_01` |

### 8. battery

The place: a pole with 2 or more attachments (CK12, Proposed). All four stand at the pole's foot. None is a pole mount.
Sheet: `...\081-D1\08-battery.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `apocalypse-power:SM_Prop_Generator_01` | 0.84 x 0.60 x 0.64 | 812 | Not in the note | Yes. It is a generator, not a cell. | `/?assets=apocalypse-power&piece=SM_Prop_Generator_01` |
| B | `sci-fi-frontier-pack:SM_Prop_Battery_03` | 0.50 x 0.82 x 0.65 | 960 | `Battery_*` "stand on the ground next to pods and stalls" (inferred). `_03/04` are "not told apart". | Yes. Small enough to strap to the pole, too. | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Battery_03` |
| C | `sci-fi-frontier-pack:SM_Prop_Battery_04` | 0.80 x 1.11 x 0.70 | 1,256 | As B | Yes | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Battery_04` |
| D | `sci-fi-frontier-pack:SM_Prop_Battery_05` | 1.00 x 1.10 x 0.83 | 1,302 | As B (without the "not told apart") | Yes. About 3.3 m of walk left (*estimate*). | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Battery_05` |

### 9. lampBuilding

The place: a building with a drop, at the drop's wall point, 5.5 m (CK9, CK11). Puzzle lamps and street lights never share a model (059).
Sheet: `...\081-D1\09-lampBuilding.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `apocalypse-power:SM_Prop_Light_Industrial_Wall_01` | 0.13 x 0.30 x 0.17 | 142 | Not in the note | Yes. Small: 0.30 m at 5.5 m. | `/?assets=apocalypse-power&piece=SM_Prop_Light_Industrial_Wall_01` |
| B | `palm-city-pack:SM_Prop_Light_Wall_01` | 0.25 x 0.72 x 0.19 | 258 | Not in the note (Palm: vines only) | Yes. Lantern, the tallest of the four. | `/?assets=palm-city-pack&piece=SM_Prop_Light_Wall_01` |
| C | `sci-fi-city-pack:SM_Prop_Paper_Lantern_01` | 0.38 x 1.02 x 0.38 | 194 | Not in the note | It hangs; it is not a wall mount. Hung from the drop at the wall point, it reaches down to about 4.5 m (*estimate*), above the walk's 4.2 m. | `/?assets=sci-fi-city-pack&piece=SM_Prop_Paper_Lantern_01` |
| D | `town-pack:SM_Prop_WallLight_01` | 0.28 x 0.18 x 0.21 | 120 | Not in the note (Town is not covered) | Yes. Small. Town Pack is not loaded for the city (113.6 MB). | `/?assets=town-pack&piece=SM_Prop_WallLight_01` |

### 10. lampPost

The place: the pole pavement, at the midpoint of an along span of 7.5 m or more, 0.75 m from the kerb (CK11). It must not share a model with the street lights (059). The street light's own model is K3's open question, so whichever is picked here is excluded there.
Sheet: `...\081-D1\10-lampPost.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `apocalypse-power:SM_Prop_LightPole_01` | 0.54 x 4.91 x 1.05 | 932 | Not in the note | Yes. Twin-globe post, the ladder's lamp slot in `models.ts`. | `/?assets=apocalypse-power&piece=SM_Prop_LightPole_01` |
| B | `palm-city-pack:SM_Prop_Street_Lamp_08` | 0.39 x 3.13 x 0.39 | 718 | Not in the note | Yes. Single-globe post. | `/?assets=palm-city-pack&piece=SM_Prop_Street_Lamp_08` |
| C | `sci-fi-city-pack:SM_Prop_Streetlight_01` | 0.62 x 5.40 x 2.64 | 748 | "Not used in 073 ... Thin lamp poles on the pavement" (inferred) | Its arm makes it 2.64 m deep, centred on the origin. Facing the road from 0.75 m, the head could be over the carriageway (*not measured*: where the post stands inside the bounds). | `/?assets=sci-fi-city-pack&piece=SM_Prop_Streetlight_01` |
| D | `town-pack:SM_Prop_Streetlamp_02` | 0.65 x 3.11 x 0.56 | 144 | Not in the note | Yes. Pagoda head. Town Pack is not loaded for the city. | `/?assets=town-pack&piece=SM_Prop_Streetlamp_02` |

### 11. damagedLine (the prop at the cut, answer 8)

The place: the cut span, at its cut point, with the wire code-drawn (071). Spans hang from 5.20 m (the lowest crossing) to about 8.5 m (Palm). The 2D map draws the break mid-line, so the cut is mid-span, half the span from each pole. On a crossing it is over the carriageway. On an along span it is over the pole pavement. All four are pieces of loose wire. The packs have no spark or break piece.
Sheet: `...\081-D1\11-damagedLine.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `palm-city-pack:SM_Prop_Powerline_09` | 1.93 x 5.30 x 1.00 | 124 | Not in the note | A snapped wire hanging from the cut to the ground, with its end trailing along the ground (sheet). From the lowest crossing (5.20 m) its foot is 0.10 m below the ground. From 6 to 8.5 m it ends 0.7 to 3.2 m above the ground. It would need cutting short or lifting on low spans (*bounds sum*). | `/?assets=palm-city-pack&piece=SM_Prop_Powerline_09` |
| B | `palm-city-pack:SM_Prop_Powerline_Bundle_01` | 1.42 x 1.14 x 0.95 | 164 | Not in the note | A tangle of wire on the ground under the cut: on the carriageway for a crossing, on the pavement for an along span. | `/?assets=palm-city-pack&piece=SM_Prop_Powerline_Bundle_01` |
| C | `palm-city-pack:SM_Prop_Powerline_Bundle_04` | 0.96 x 0.98 x 0.85 | 128 | Not in the note | A coil of wire on the ground, as B. | `/?assets=palm-city-pack&piece=SM_Prop_Powerline_Bundle_04` |
| D | `sci-fi-frontier-pack:SM_Prop_Cable_09` | 0.31 x 1.35 x 0.17 | 284 | Not in the note | A short cable end hanging from the cut. From the lowest crossing it hangs to 3.85 m, under the walk's 4.2 m floor. CK7's floor is a span rule, so whether it binds a prop is open. | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Cable_09` |

### 12. roofMast (the roof structure)

The place: on a building's roof (CK17, B1 designs it). It carries roof spans, and may hold a breaker, switch or fuse box (6b). Every puzzle line carries three conductors on a cross-arm (Decided 041, the part 071 Q10 left unchanged).

**Josh's words, recorded as his and not as a pick:**
- 071, 21 Nov 2026: "The scifi power poles are intended to be atop buildings and other objects they are not intended to come out of the ground".
- 073, 22 Nov 2026, on the same poles at the kerb: "Allow both".

Sheet: `...\081-D1\12-roofMast.png`

| | `pack:name` | Size (m) | Tris | 073 | Fits its place? | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| A | `sci-fi-city-pack:SM_Prop_Cable_Crossing_Pillar_01` | 1.14 x 3.96 x 0.90 | 628 | `Prop_Cable_Crossing_*` with cables "strung across the street between building façades" (name match inferred) | It fits a 5 m roof cell. It has no cross-arm in the picture. Its attachment points are **not measured**: three conductors are unknown. | `/?assets=sci-fi-city-pack&piece=SM_Prop_Cable_Crossing_Pillar_01` |
| B | `sci-fi-city-pack:SM_Prop_Powerpoll_01` | 1.77 x 5.07 x 1.16 | 1,016 | Seen at the kerb. On roofs is Josh's use, beyond the images. | Yes. 071 A measured three attachments on the top crossbar at 5.021 m, across 0 and ±0.70, with no insulators. Yellow, blue and red cable bundles. | `/?assets=sci-fi-city-pack&piece=SM_Prop_Powerpoll_01` |
| C | `sci-fi-city-pack:SM_Prop_Powerpoll_02` | 1.54 x 5.07 x 1.16 | 644 | As B | Yes. There is no top crossbar: wires seat on the 4.338 m bar at 0 and ±0.70, and a sign box stands 0.01 m in front (071 A). | `/?assets=sci-fi-city-pack&piece=SM_Prop_Powerpoll_02` |
| D | `sci-fi-frontier-pack:SM_Prop_Power_Pole_03` | 0.88 x 7.86 x 0.32 | 498 | Seen in the ground, and once "from the top of a domed building" | It fits a roof cell. **It has no cross-arm** (071 A: one-sided brackets), so it does not carry three conductors as Decided 041 asks without a code arm. | `/?assets=sci-fi-frontier-pack&piece=SM_Prop_Power_Pole_03` |

## Where no good candidate exists

- **damagedLine.** No pack has a spark, break or "cut" piece. All four candidates are loose wire, and only A reads as a line that has come down. A sits 0.10 m into the ground under the lowest crossing.
- **junction.** A is the only true junction box, and at 0.20 m it is too small to see from the street. B, C and D are bigger stand-ins.
- **battery.** Nothing mounts on a pole. All four stand at its foot, and A is a generator, not a cell.
- **roofMast.** Only B and C are measured to carry three conductors. A is unmeasured, and D has no arm.
- **relay and spring.** No piece reads as either. Both cards draw on the same pool as the switch, and the overlay carries the difference.

## What the main session does with this

- **The picks.** One card per component, in the order above. The options are A to D, each with its key, its sheet and its gallery link. Josh's answer goes in his words into `docs/design/081-component-picks.md`: component, `pack:name`, his words, the date. An unpicked component stays null and draws as a placeholder.
- **D2** transcribes these tables. **D3** transcribes his picks.
- **Load runs.** A pick from `sci-fi-frontier-pack` or `town-pack` needs a subset GLB run (071 D's kind) before K3 draws it. A pick from `palm-city-pack` joins 071 D's Palm subset.

The sheets were made by a scratch Blender script outside the repo. They are sketches for the cards, not the city.
