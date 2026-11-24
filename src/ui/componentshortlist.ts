/**
 * The component shortlist (ticket 081, section D2): each puzzle component's four candidate pieces from the converted packs, as the gallery's component view shows them.
 * Transcribed from `docs/design/081-D1-component-shortlist.md` and pinned to it by `componentshortlist.test.ts` (key, size and triangles, row for row).
 *
 * Nothing here picks a model. Josh's picks come in from the outside as `ComponentPicks` (D3's table, `src/render3d/componentmodels.ts`, once it merges), and a
 * component with no pick reads "Unpicked". No DOM, no three.
 */

import { type CircuitComponent, type CircuitComponentPick } from "../core";

/** One candidate row of the note: its letter on the card, its `pack:name`, its bounds and triangles, and the note's two columns verbatim. */
export interface ShortlistCandidate {
  letter: "A" | "B" | "C" | "D";
  /** `pack:name`, the gallery's key (074 C's Copy). */
  key: string;
  /** Width, height, depth in metres, as the gallery shows them. */
  size_m: [number, number, number];
  triangles: number;
  /** The note's "073" column: what the intended-use note says of it. */
  says073: string;
  /** The note's "Fits its place?" column. */
  fits: string;
}

/** The picks as D3's table gives them, keyed by component. A missing or null entry is unpicked. */
export type ComponentPicks = Partial<Record<CircuitComponent, CircuitComponentPick | null>>;

/** The component's name on the page, in words. */
export const COMPONENT_LABELS: Readonly<Record<CircuitComponent, string>> = {
  feed: "Feed",
  breaker: "Breaker",
  switch: "Switch",
  relay: "Relay",
  spring: "Spring",
  fusebox: "Fuse box",
  junction: "Junction",
  battery: "Battery",
  lampBuilding: "Building lamp",
  lampPost: "Lamp post",
  damagedLine: "Damaged line (the prop at the cut)",
  roofMast: "Roof structure",
};

const ELECTRONICS = "Wall boxes, inferred";

export const COMPONENT_SHORTLIST: Readonly<Record<CircuitComponent, readonly ShortlistCandidate[]>> = {
  feed: [
    {
      letter: "A",
      key: "apocalypse-power:SM_Prop_Transformer_01",
      size_m: [2.09, 2.47, 3.23],
      triangles: 2750,
      says073: "Not in the note",
      fits: "Ground transformer at the pole's foot. Its 3.23 m length on a 5 m cell, set across the pavement behind the pole at 0.75 m from the kerb, leaves about 0.9 m of walk (*estimate*: 5 − 0.75 − 0.15 − 3.23). Turned lengthwise along the kerb, it leaves about 2.0 m (5 − 0.9 − 2.09).",
    },
    {
      letter: "B",
      key: "palm-city-pack:SM_Prop_Powerbox_01",
      size_m: [1.89, 1.5, 1.1],
      triangles: 1466,
      says073: "Not in the note",
      fits: "Ground cabinet with a hazard sign, at the pole's foot. Across the pavement it takes 1.10 m and leaves about 3.0 m of walk (*estimate*).",
    },
    {
      letter: "C",
      key: "palm-city-pack:SM_Prop_Powerpole_03",
      size_m: [2.62, 10.83, 3.06],
      triangles: 3454,
      says073: "Not in the note",
      fits: "Replaces the feed's pole rather than standing on it: an H-frame with a transformer platform. 071 A rejected it as a line pole (H-frame, attachments at ±0.45 m). As the feed it needs its own `placePole` entry and is 10.83 m against the mix's 6.30 to 9.01.",
    },
    {
      letter: "D",
      key: "sci-fi-city-pack:SM_Bld_Power_04",
      size_m: [1.54, 5.46, 1.54],
      triangles: 512,
      says073: "`Bld_Power_*`: \"Not identified in any scene\" (not shown)",
      fits: "Insulator column at the pole's foot, 1.54 m square: about 2.6 m of walk left (*estimate*). Taller than the furniture limit (`FURN_MAX_H_M` 3.2 m), so I2 must read it as a circuit item.",
    },
  ],
  breaker: [
    { letter: "A", key: "palm-city-pack:SM_Prop_PowerBox_02", size_m: [0.42, 1.34, 0.19], triangles: 200, says073: "Not in the note", fits: "Yes (pool 3)" },
    {
      letter: "B",
      key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_01",
      size_m: [1.03, 1.88, 0.45],
      triangles: 242,
      says073: "Wall boxes, inferred",
      fits: "Yes, but 1.03 m wide on a pole about 0.3 m wide (pool 8)",
    },
    { letter: "C", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03", size_m: [0.59, 0.7, 0.34], triangles: 76, says073: ELECTRONICS, fits: "Yes (pool 10)" },
    { letter: "D", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_06", size_m: [0.42, 1.17, 0.26], triangles: 76, says073: ELECTRONICS, fits: "Yes (pool 13)" },
  ],
  switch: [
    { letter: "A", key: "apocalypse-power:SM_Prop_PowerBoxes_02", size_m: [0.16, 2.99, 0.7], triangles: 216, says073: "Not in the note", fits: "Yes, with a quarter turn (pool 2)" },
    { letter: "B", key: "palm-city-pack:SM_Prop_PowerBox_03", size_m: [0.26, 0.93, 0.17], triangles: 120, says073: "Not in the note", fits: "Yes (pool 4)" },
    { letter: "C", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_04", size_m: [0.82, 0.92, 0.34], triangles: 90, says073: ELECTRONICS, fits: "Yes (pool 11)" },
    {
      letter: "D",
      key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_05",
      size_m: [1.36, 2.75, 0.42],
      triangles: 484,
      says073: ELECTRONICS,
      fits: "Yes. Its two cable legs reach the pavement and take 1.36 m across the pole line (pool 12).",
    },
  ],
  relay: [
    { letter: "A", key: "apocalypse-power:SM_Prop_PowerBoxes_02", size_m: [0.16, 2.99, 0.7], triangles: 216, says073: "Not in the note", fits: "Yes, with a quarter turn (pool 2)" },
    { letter: "B", key: "palm-city-pack:SM_Prop_PowerBox_02", size_m: [0.42, 1.34, 0.19], triangles: 200, says073: "Not in the note", fits: "Yes (pool 3)" },
    { letter: "C", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_04", size_m: [0.82, 0.92, 0.34], triangles: 90, says073: ELECTRONICS, fits: "Yes (pool 11)" },
    { letter: "D", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_06", size_m: [0.42, 1.17, 0.26], triangles: 76, says073: ELECTRONICS, fits: "Yes (pool 13)" },
  ],
  spring: [
    { letter: "A", key: "apocalypse-power:SM_Prop_PowerBoxes_01", size_m: [0.16, 2.99, 1.18], triangles: 528, says073: "Not in the note", fits: "Yes, with a quarter turn (pool 1)" },
    { letter: "B", key: "palm-city-pack:SM_Prop_PowerBox_03", size_m: [0.26, 0.93, 0.17], triangles: 120, says073: "Not in the note", fits: "Yes (pool 4)" },
    { letter: "C", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03", size_m: [0.59, 0.7, 0.34], triangles: 76, says073: ELECTRONICS, fits: "Yes (pool 10)" },
    {
      letter: "D",
      key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_05",
      size_m: [1.36, 2.75, 0.42],
      triangles: 484,
      says073: ELECTRONICS,
      fits: "Yes, with legs to the pavement (pool 12)",
    },
  ],
  fusebox: [
    { letter: "A", key: "apocalypse-power:SM_Prop_PowerBoxes_01", size_m: [0.16, 2.99, 1.18], triangles: 528, says073: "Not in the note", fits: "Yes, with a quarter turn (pool 1)" },
    { letter: "B", key: "palm-city-pack:SM_Prop_PowerBoxes_01", size_m: [0.7, 2.99, 0.21], triangles: 284, says073: "Not in the note", fits: "Yes (pool 6)" },
    { letter: "C", key: "palm-city-pack:SM_Prop_PowerBoxes_03", size_m: [0.47, 2.2, 0.2], triangles: 248, says073: "Not in the note", fits: "Yes (pool 7)" },
    { letter: "D", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_02", size_m: [0.82, 0.74, 0.5], triangles: 202, says073: ELECTRONICS, fits: "Yes (pool 9)" },
  ],
  junction: [
    { letter: "A", key: "palm-city-pack:SM_Prop_PowerBox_04", size_m: [0.22, 0.2, 0.34], triangles: 100, says073: "Not in the note", fits: "On the pole, yes. At 0.20 m high it is barely visible from the street (pool 5)." },
    { letter: "B", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03", size_m: [0.59, 0.7, 0.34], triangles: 76, says073: ELECTRONICS, fits: "On the pole, yes (pool 10)" },
    {
      letter: "C",
      key: "sci-fi-frontier-pack:SM_Prop_Cable_Junction_01",
      size_m: [0.87, 3.43, 0.87],
      triangles: 950,
      says073: "\"Cables lie on the ground ... between small stands and boxes\" (the stand match is inferred)",
      fits: "A column at the pole's foot, 0.87 m square, which leaves about 3.2 m of walk (*estimate*). At 3.43 m it is over `FURN_MAX_H_M`.",
    },
    {
      letter: "D",
      key: "sci-fi-frontier-pack:SM_Prop_Cable_Junction_01_Alt_01",
      size_m: [0.87, 1.11, 0.87],
      triangles: 396,
      says073: "Same row as C",
      fits: "A crate at the pole's foot, as C, 1.11 m high",
    },
  ],
  battery: [
    { letter: "A", key: "apocalypse-power:SM_Prop_Generator_01", size_m: [0.84, 0.6, 0.64], triangles: 812, says073: "Not in the note", fits: "Yes. It is a generator, not a cell." },
    {
      letter: "B",
      key: "sci-fi-frontier-pack:SM_Prop_Battery_03",
      size_m: [0.5, 0.82, 0.65],
      triangles: 960,
      says073: "`Battery_*` \"stand on the ground next to pods and stalls\" (inferred). `_03/04` are \"not told apart\".",
      fits: "Yes. Small enough to strap to the pole, too.",
    },
    { letter: "C", key: "sci-fi-frontier-pack:SM_Prop_Battery_04", size_m: [0.8, 1.11, 0.7], triangles: 1256, says073: "As B", fits: "Yes" },
    {
      letter: "D",
      key: "sci-fi-frontier-pack:SM_Prop_Battery_05",
      size_m: [1.0, 1.1, 0.83],
      triangles: 1302,
      says073: "As B (without the \"not told apart\")",
      fits: "Yes. About 3.3 m of walk left (*estimate*).",
    },
  ],
  lampBuilding: [
    { letter: "A", key: "apocalypse-power:SM_Prop_Light_Industrial_Wall_01", size_m: [0.13, 0.3, 0.17], triangles: 142, says073: "Not in the note", fits: "Yes. Small: 0.30 m at 5.5 m." },
    { letter: "B", key: "palm-city-pack:SM_Prop_Light_Wall_01", size_m: [0.25, 0.72, 0.19], triangles: 258, says073: "Not in the note (Palm: vines only)", fits: "Yes. Lantern, the tallest of the four." },
    {
      letter: "C",
      key: "sci-fi-city-pack:SM_Prop_Paper_Lantern_01",
      size_m: [0.38, 1.02, 0.38],
      triangles: 194,
      says073: "Not in the note",
      fits: "It hangs; it is not a wall mount. Hung from the drop at the wall point, it reaches down to about 4.5 m (*estimate*), above the walk's 4.2 m.",
    },
    { letter: "D", key: "town-pack:SM_Prop_WallLight_01", size_m: [0.28, 0.18, 0.21], triangles: 120, says073: "Not in the note (Town is not covered)", fits: "Yes. Small. Town Pack is not loaded for the city (113.6 MB)." },
  ],
  lampPost: [
    { letter: "A", key: "apocalypse-power:SM_Prop_LightPole_01", size_m: [0.54, 4.91, 1.05], triangles: 932, says073: "Not in the note", fits: "Yes. Twin-globe post, the ladder's lamp slot in `models.ts`." },
    { letter: "B", key: "palm-city-pack:SM_Prop_Street_Lamp_08", size_m: [0.39, 3.13, 0.39], triangles: 718, says073: "Not in the note", fits: "Yes. Single-globe post." },
    {
      letter: "C",
      key: "sci-fi-city-pack:SM_Prop_Streetlight_01",
      size_m: [0.62, 5.4, 2.64],
      triangles: 748,
      says073: "\"Not used in 073 ... Thin lamp poles on the pavement\" (inferred)",
      fits: "Its arm makes it 2.64 m deep, centred on the origin. Facing the road from 0.75 m, the head could be over the carriageway (*not measured*: where the post stands inside the bounds).",
    },
    { letter: "D", key: "town-pack:SM_Prop_Streetlamp_02", size_m: [0.65, 3.11, 0.56], triangles: 144, says073: "Not in the note", fits: "Yes. Pagoda head. Town Pack is not loaded for the city." },
  ],
  damagedLine: [
    {
      letter: "A",
      key: "palm-city-pack:SM_Prop_Powerline_09",
      size_m: [1.93, 5.3, 1.0],
      triangles: 124,
      says073: "Not in the note",
      fits: "A snapped wire hanging from the cut to the ground, with its end trailing along the ground (sheet). From the lowest crossing (5.20 m) its foot is 0.10 m below the ground. From 6 to 8.5 m it ends 0.7 to 3.2 m above the ground. It would need cutting short or lifting on low spans (*bounds sum*).",
    },
    {
      letter: "B",
      key: "palm-city-pack:SM_Prop_Powerline_Bundle_01",
      size_m: [1.42, 1.14, 0.95],
      triangles: 164,
      says073: "Not in the note",
      fits: "A tangle of wire on the ground under the cut: on the carriageway for a crossing, on the pavement for an along span.",
    },
    { letter: "C", key: "palm-city-pack:SM_Prop_Powerline_Bundle_04", size_m: [0.96, 0.98, 0.85], triangles: 128, says073: "Not in the note", fits: "A coil of wire on the ground, as B." },
    {
      letter: "D",
      key: "sci-fi-frontier-pack:SM_Prop_Cable_09",
      size_m: [0.31, 1.35, 0.17],
      triangles: 284,
      says073: "Not in the note",
      fits: "A short cable end hanging from the cut. From the lowest crossing it hangs to 3.85 m, under the walk's 4.2 m floor. CK7's floor is a span rule, so whether it binds a prop is open.",
    },
  ],
  roofMast: [
    {
      letter: "A",
      key: "sci-fi-city-pack:SM_Prop_Cable_Crossing_Pillar_01",
      size_m: [1.14, 3.96, 0.9],
      triangles: 628,
      says073: "`Prop_Cable_Crossing_*` with cables \"strung across the street between building façades\" (name match inferred)",
      fits: "It fits a 5 m roof cell. It has no cross-arm in the picture. Its attachment points are **not measured**: three conductors are unknown.",
    },
    {
      letter: "B",
      key: "sci-fi-city-pack:SM_Prop_Powerpoll_01",
      size_m: [1.77, 5.07, 1.16],
      triangles: 1016,
      says073: "Seen at the kerb. On roofs is Josh's use, beyond the images.",
      fits: "Yes. 071 A measured three attachments on the top crossbar at 5.021 m, across 0 and ±0.70, with no insulators. Yellow, blue and red cable bundles.",
    },
    {
      letter: "C",
      key: "sci-fi-city-pack:SM_Prop_Powerpoll_02",
      size_m: [1.54, 5.07, 1.16],
      triangles: 644,
      says073: "As B",
      fits: "Yes. There is no top crossbar: wires seat on the 4.338 m bar at 0 and ±0.70, and a sign box stands 0.01 m in front (071 A).",
    },
    {
      letter: "D",
      key: "sci-fi-frontier-pack:SM_Prop_Power_Pole_03",
      size_m: [0.88, 7.86, 0.32],
      triangles: 498,
      says073: "Seen in the ground, and once \"from the top of a domed building\"",
      fits: "It fits a roof cell. **It has no cross-arm** (071 A: one-sided brackets), so it does not carry three conductors as Decided 041 asks without a code arm.",
    },
  ],
};

/** The gallery link for a key, as the note gives it: `?assets=<pack>&piece=<name>`. A key with no colon is taken whole as the pack. */
export function shortlistLinkOf(key: string): string {
  const i = key.indexOf(":");
  const pack = i < 0 ? key : key.slice(0, i);
  const name = i < 0 ? "" : key.slice(i + 1);
  return `?assets=${pack}&piece=${name}`;
}

/** A component's pick, in words: "Unpicked" when there is no pick or its key is null, else the key with Josh's words and date. */
export function pickWords(pick: CircuitComponentPick | null | undefined): string {
  if (pick === undefined || pick === null || pick.key === null) return "Unpicked: draws as a placeholder";
  return `Picked: ${pick.key}. Josh, ${pick.date}: "${pick.words}"`;
}
