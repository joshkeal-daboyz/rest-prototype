/**
 * The asset gallery's catalogue (ticket 074, section A): the pure half of `AssetGallery` (src/core/assetgallery.ts). From a manifest it makes one `AssetGalleryPack` per pack and one
 * `AssetGalleryPiece` per asset; it says which stages use each piece (`pieceUses`, built from the kit tables themselves, never a copied list); it carries the intended-use notes
 * (`PIECE_NOTES`, transcribed from `docs/design/073-pack-intended-use.md`); and it answers a page query (search, use and flag filters, paging).
 * No three and no DOM of its own: it only reads tables (some of those modules import three, which is how the town is drawn; nothing here touches it). Nothing from the packs is stored here.
 */

import {
  ASSET_GALLERY_PAGE_SIZE,
  ASSET_GALLERY_USES,
  type AssetGalleryNote,
  type AssetGalleryPack,
  type AssetGalleryPage,
  type AssetGalleryPiece,
  type AssetGalleryPieceUse,
  type AssetGalleryQuery,
  type AssetGalleryUse,
  type AssetManifest,
  type AssetPack,
  type CalibrationKey,
} from "../core";
import { KIT as BUILDINGS_KIT } from "../city/buildings/kit";
import { DRESS_BOUNDS } from "../city/facades/dresskit";
import { GROUND_KIT } from "../city/facades/kit";
import { NOVELTY_KEYS } from "../city/facades/noveltykit";
import { PARTY_KEYS } from "../city/facades/partykit";
import { ROOF_BOUNDS } from "../city/facades/roofkit";
import { WALL_BOUNDS } from "../city/facades/wallkit";
import { KIT_KEYS as GROUND_KIT_KEYS } from "../city/ground/kit";
import { KIT as HOLDOUT_KIT } from "../city/holdout/kit";
import { KIT as RUIN_KIT } from "../city/ruin/kit";
import { TECH_KIT } from "../city/tech/kit";
import { TRAFFIC_KEYS } from "../city/traffic/kit";
import { isNeverUsed } from "./citymetrics";
import { dressKeys } from "./dressing";
import { furnitureKeys } from "./furniture";
import { MODEL_TABLE, sizeOf } from "./models";
import { allStackKeys } from "./models3d";
import { planTileKeys } from "./plan3d";
import { POWER_LINE, POWER_LINES, POWER_MIX, POWER_POLES } from "./powerkit";
import { INTERIOR_KEYS, TILE_PROPS } from "./tileslots";

// ---- the packs ----

/** A pack's readable name and store page. A pack not in the table keeps its id as title and has no link. */
export const PACK_PAGES: Readonly<Record<string, { readonly title: string; readonly storeUrl: string | null }>> = {
  "apocalypse-power": { title: "POLYGON Apocalypse (power subset)", storeUrl: "https://syntystore.com/products/polygon-apocalypse-pack" },
  "apocalypse-ruin": { title: "POLYGON Apocalypse (ruin subset)", storeUrl: "https://syntystore.com/products/polygon-apocalypse-pack" },
  "city-pack": { title: "POLYGON City", storeUrl: null },
  "nature-pack": { title: "POLYGON Nature", storeUrl: "https://syntystore.com/products/polygon-nature-pack" },
  "palm-city-pack": { title: "POLYGON Palm City", storeUrl: "https://syntystore.com/products/polygon-palm-city" },
  "sci-fi-city-pack": { title: "POLYGON Sci-Fi City", storeUrl: "https://syntystore.com/products/polygon-sci-fi-city" },
  "sci-fi-frontier-pack": { title: "POLYGON Sci-Fi Frontier", storeUrl: "https://syntystore.com/products/polygon-sci-fi-frontier" },
  "simple-town": { title: "SIMPLE Town", storeUrl: null },
  "town-pack": { title: "POLYGON Town", storeUrl: null },
};

/** One entry per manifest pack, in manifest order. */
export function assetGalleryPacks(manifest: AssetManifest): AssetGalleryPack[] {
  return manifest.packs.map((p) => {
    const page = Object.prototype.hasOwnProperty.call(PACK_PAGES, p.pack) ? PACK_PAGES[p.pack] : undefined;
    return { pack: p.pack, title: page?.title ?? p.pack, storeUrl: page?.storeUrl ?? null, glb: p.glb, pieceCount: p.assets.length, failures: p.failures };
  });
}

// ---- the uses ----

let usesCache: ReadonlyMap<CalibrationKey, readonly AssetGalleryPieceUse[]> | null = null;

/**
 * Every key any kit table names, with the stages that use it, in `ASSET_GALLERY_USES` order. Built from the tables themselves (imported, never copied) the first time it is asked, then kept.
 * A `code:` key (a piece drawn in code) is skipped. A use appears once per key; `placed` is true if any table that names it places it.
 */
export function pieceUses(): ReadonlyMap<CalibrationKey, readonly AssetGalleryPieceUse[]> {
  if (usesCache !== null) return usesCache;
  const byUse = new Map<AssetGalleryUse, Map<CalibrationKey, boolean>>(ASSET_GALLERY_USES.map((u) => [u, new Map<CalibrationKey, boolean>()] as const));
  const add = (use: AssetGalleryUse, keys: Iterable<string>, placed = true): void => {
    const m = byUse.get(use)!;
    for (const k of keys) {
      if (k.startsWith("code:")) continue;
      const key = k as CalibrationKey;
      m.set(key, (m.get(key) ?? false) || placed);
    }
  };

  add("ladder", MODEL_TABLE.flatMap((c) => c.names.map((n) => `${c.pack}:${n}`)));
  add("ladder", allStackKeys());
  add("ladder", dressKeys());
  add("ladder", furnitureKeys());
  add("ladder", POWER_MIX);
  add("ladder", [POWER_LINE]);

  add("edge", planTileKeys());
  add("edge", TILE_PROPS);
  add("edge", Object.values(INTERIOR_KEYS).flat());

  add("buildings", BUILDINGS_KIT.map((e) => e.key));

  add("circuit", Object.keys(POWER_POLES));
  add("circuit", Object.keys(POWER_LINES));

  add("facades", GROUND_KIT.map((e) => e.key));
  add("facades", Object.keys(DRESS_BOUNDS));
  add("facades", NOVELTY_KEYS);
  add("facades", PARTY_KEYS);
  add("facades", Object.keys(ROOF_BOUNDS));
  add("facades", Object.keys(WALL_BOUNDS));

  add("ground", GROUND_KIT_KEYS);

  add("traffic", TRAFFIC_KEYS);

  for (const e of TECH_KIT) add("tech", [e.key], e.placed);
  add("holdout", Object.keys(HOLDOUT_KIT));
  add("ruin", Object.keys(RUIN_KIT));

  const out = new Map<CalibrationKey, AssetGalleryPieceUse[]>();
  for (const use of ASSET_GALLERY_USES) {
    for (const [key, placed] of byUse.get(use)!) {
      const list = out.get(key);
      if (list === undefined) out.set(key, [{ use, placed }]);
      else list.push({ use, placed });
    }
  }
  usesCache = out;
  return out;
}

// ---- the notes ----

/** One row of the intended-use note: the pack, a pattern over the manifest name (with or without `SM_`), and what the note says. */
export interface PieceNoteRow extends AssetGalleryNote {
  readonly pack: string;
  readonly pattern: RegExp;
}

/** A pattern matching a name with or without its `SM_` prefix, whole. `body` is a RegExp source. */
const rx = (body: string): RegExp => new RegExp(`^(?:SM_)?(?:${body})$`);

const SC = "sci-fi-city-pack";
const SF = "sci-fi-frontier-pack";
const PC = "palm-city-pack";
const NA = "nature-pack";
const AR = "apocalypse-ruin";
const AP = "apocalypse-power";

const row = (pack: string, body: string, sure: AssetGalleryNote["sure"], text: string, images: string, departure: string | null = null): PieceNoteRow => ({ pack, pattern: rx(body), text, images, sure, departure });

const POWERPOLL_JOSH =
  'Josh, 22 Nov 2026, "Allow both": in the technology pass the pole is used as the images show, at the kerb, and also on roofs (his own use, beyond the images). His 21 Nov words ("not intended to come out of the ground") are superseded for the tech pass.';

/**
 * The intended-use note (`docs/design/073-pack-intended-use.md`) as a table. The markdown stays the source: a change to the note is a change to a row here. Order is the note's:
 * the five pack tables, then the pieces only "Where the plan disagrees" or "Uses taken that the images do not show" name. A departure is attached to the row it names where there is one.
 */
export const PIECE_NOTES: readonly PieceNoteRow[] = [
  // 1. Sci-Fi City
  row(SC, "Prop_Powerpoll_0[12]", "seen", "A square-section pole about 5 m high with a crossarm and transformer or meter boxes. Cables run from it to building walls and to the next pole. The poles stand on the pavement at the kerb, at street corners and along the street. No image shows one on a roof or fixed to a wall. (Seen clearly that crossarm poles stand on the pavement; that they are Powerpoll_01/02 is inferred.)", "Screenshot_11, Screenshot_13, Screenshot_14, Screenshot_07", POWERPOLL_JOSH),
  row(SC, "Prop_Streetlight_01", "inferred", "Not used in 073, listed for contrast. Thin lamp poles on the pavement.", "Screenshot_03, Screenshot_13"),
  row(SC, "Prop_Cables_0[1-3]|Prop_Cable_Crossing_.*", "seen", "Long sagging cable bundles strung across the street between building facades at upper-floor height, and between facades and the crossarm poles. (Cables seen clearly; the name match is inferred.)", "Screenshot_01, 02, 03, 07, 10, 11, 15"),
  row(SC, "Prop_Bridge_01", "inferred", "Open lattice truss beams span the street from one building face to the other, roughly 6 to 10 m up, with cables draped over them and signs hung from them. Nobody walks on them; no railings or deck. The truss spans are seen clearly; that they are Prop_Bridge_01 is inferred from the 5 m length and 0.9 m lattice depth.", "Screenshot_01, 02, 03, 10, 15", "Plan: a walkway over lanes and alleys with Env_Railing. The images show open trusses carrying cables and signs, with no deck, no railings and nobody on them. Railings in the images edge decks and balconies, not trusses."),
  row(SC, "Env_Railing_0[12]", "seen", "Railings run along the edges of a raised deck on chunky pillars at street level, and along balcony and roof edges.", "Screenshot_06, Screenshot_03"),
  row(SC, "Bld_Raised_0[12]", "inferred", "The only raised building section shown is a deck on heavy pillars at ground level, with railings, a car parked on top and pavement beneath. Nothing like it is stacked on a roof. Matched by name and the 5 m footprint; not seen on a roof.", "Screenshot_06", "Plan: extra storeys on existing roofs. The only raised section in the images is a pillared deck at street level; the roof placement is unconfirmed."),
  row(SC, "Building_Shack_0[12]|Bld_Roof_Pagoda_02", "inferred", "Pagoda roofs cap shopfront buildings: a tiled overhang over a shop at about the first-floor line. Pagoda inferred; small shacks were not identified (not shown).", "Screenshot_01, 02, 03"),
  row(SC, "Prop_SatDish_.*|Prop_Vent_.*|Prop_AirConditioningGrid_01|Prop_Antenna", "inferred", "Dishes and large vent or fan machinery sit on roofs and roof edges. Dishes are also on balconies and on a wall bracket.", "Screenshot_03, 11, 12, 13"),
  row(SC, "Prop_AirConditioningUnit_0[12]", "seen", "Small AC boxes are fixed to building walls high up, in clusters, and on roof edges.", "Screenshot_11"),
  row(SC, "Prop_WallAttach_Electronics_.*|Prop_WallAttach_Vent_.*|Prop_Pipes_.*", "inferred", "Wall boxes and pipes on facades at and above the ground storey. Vertical pipes run down to the pavement.", "Screenshot_04, 03, 11"),
  row(SC, "Prop_Security_Camera_0[12]", "seen", "Mounted high on building walls, at upper-corner and ceiling height, outdoors and indoors. Never free-standing on the pavement.", "Screenshot_04, Screenshot_08, Screenshot_12", "Plan: street tech on the pavement. The images show them only fixed high on walls (move them to the walls row, above the ground storey)."),
  row(SC, "Prop_VendingMachine_01|Prop_Atm_01", "inferred", "Machines stand against shopfronts on the pavement, backs to the wall. ATM-like terminals also appear indoors.", "Screenshot_03, 08, 11"),
  row(SC, "Prop_ChargingStation_01", "not-shown", "Listed with the vending machines and terminals (inferred), but the images do not tell it apart from the other terminals.", "Screenshot_03, 08, 11", "Taken in the tech pass (D1) on the pavement's kerb line: not shown (a vehicle charger belongs by the road). It keeps every pavement rule D1 keeps."),
  row(SC, "Prop_Advertisement_Pillar_01", "seen", "A round poster pillar on the pavement, free-standing.", "Screenshot_03, 07"),
  row(SC, "Prop_Hologram_.*", "seen", "Big hologram food and bottle signs on top of low buildings and roof corners. The noodle sign is on a roof.", "Screenshot_13, Screenshot_14", "Plan: dead holograms on roofs. This agrees with the images, which favour low roofs and roof corners over the street, not tall towers."),
  row(SC, "Sign_.*", "seen", "Shop signs fixed to facades above doors, vertical blade signs on corners, billboards on upper walls. Neon is shown glowing.", "Screenshot_01 to 04, 11, Layout_11"),
  row(SC, "Bld_Advanced_0[12]", "inferred", "Shopfront facade strips are laid out on the building sheet. In scenes, shopfronts form the ground storey.", "Layout_06, Screenshot_03, 11", "Taken in the tech pass (D1): an added front 0.71 m out in front of an old shop, on single and double shops only, never corner shops. The images show these strips as a building's own ground storey."),
  row(SC, "Bld_Power_0[124]", "not-shown", "Not identified in any scene. Layout_06 has cylindrical tank or plant blocks that may be these.", "Layout_06"),
  row(SC, "Bld_Large_.*", "seen", "Free-standing towers on their own plots, forming the skyline (out of v1 anyway).", "Screenshot_13, 14"),
  row(SC, "Bld_LandingPad_01", "inferred", "Cars parked on rooftops and on raised pads.", "Screenshot_13"),
  row(SC, "Prop_Overhang_0[12]", "not-shown", "Not shown in any image.", "", "Taken in the tech pass (D1) as canopies over a whole free storey face: its shape (1.44 m deep, closed on all sides) reads as one and nothing contradicts it. As built it is typed and pinned but never placed."),
  row(SC, "Env_Greeble_Cube_.*", "not-shown", "Not shown in place in any image.", ""),

  // 2. Sci-Fi Frontier
  row(SF, "Prop_Power_Pole_0[1-3]", "seen", "Tall thin poles (7.9 to 9.1 m) stand in the ground of the settlement, between buildings and along the main street. Cables sag from pole to pole and to rooftop signs and roofs. One thin pole rises from the top of a domed building. A thicker pole stands on the ground beside the Grub Hub.", "SS_Grub_Hub, SS_Town_Sunset, SS_Market_01, SS_Market_02_Night", "Plan: lines across streets and off light posts and traffic masts, on whatever stands there. The images show poles in the ground, or once on a building, with cables to other poles and roofs; lines tied off light posts and traffic masts are not shown. That is the deliberate rule-break the plan already lists."),
  row(SF, "Prop_Cable_(?:1[2-6]|17|18)(?:_Alt_01)?", "seen", "Sagging spans between poles and buildings (12 m spans), some hung with bunting.", "SS_Grub_Hub, SS_Town_Sunset, Layouts_Buildings_02"),
  row(SF, "Prop_Cable_0[1-6]|Prop_Cable_Stand_01|Prop_Cable_Junction_01(?:_Alt_01)?", "seen", "Cables lie on the ground and snake across it between small stands and boxes, out in the open. Ground cables seen clearly; the stand match is inferred.", "SS_Moist, SS_DropPod"),
  row(SF, "Prop_Solar_Panel_0[2-5](?:_Insert_01)?", "seen", "Large tilted panels on a post or rotating base: on top of a round building, on a post beside a building at about 4 m, built onto a small building, and as star-shaped ground arrays in open fields beside a farm.", "SS_Town_Sunset, SS_Grub_Hub, SS_Farmlife, Layouts_Buildings_01", "Plan: under roofs. No conflict: the images use them on buildings and as ground arrays. Solar_Panel_02 (5.6 m high on a post) is a ground or edge piece more than a flat-roof one."),
  row(SF, "Prop_Windmill_01", "seen", "Stands alone on open ground at the edge of the settlement, beside a tent.", "SS_Outback"),
  row(SF, "Prop_Silo_0[1-4]", "inferred", "Grouped in a row at the edge of the farm fields, on open ground. Matched by the domed and lattice shapes on Layouts_Props_01.", "SS_Farmlife"),
  row(SF, "Prop_Generator_01|Prop_Battery_.*", "inferred", "Small power boxes and charger units stand on the ground next to pods and stalls, with cables to them. (Battery_03/04 are not told apart.)", "SS_DropPod, SS_Camp_Gathering"),
  row(SF, "Bld_Tent_0[1-3].*|Prop_Fabric_0[1-3]", "seen", "Tents stand on open ground. A fabric awning is stretched on poles off a tent's side, and fabric is draped over a building's top. Tents seen clearly; fabric inferred.", "SS_Outback, Layouts_Buildings_01, Layouts_Buildings_02"),
  row(SF, "Bld_Pod_0[1-4].*", "seen", "Dome huts on open ground in a ring around a camp.", "SS_DropPod, SS_Camp_Gathering"),
  row(SF, "Env_Farm_.*|Prop_Irrigator_.*", "seen", "Large circular and rectangular fields on open land outside the settlement. Irrigator booms stand across the fields, spraying.", "SS_Farm, SS_Farmlife", "Taken in the hold-out pass (E2) in city parks: the images show farms on open land outside a settlement; a park is the city's open soil. Only pieces that fit inside the park's rectangle; never scaled; never across a kerb."),
  row(SF, "Bld_Market_Stall_0[1-3].*", "seen", "Stall rows facing a market square, with cables strung overhead from a pole.", "SS_Market_01, SS_Market_02_Night"),
  row(SF, "Prop_Container_.*", "not-shown", "Not identified with certainty in any scene. Crates and boxes near stalls may be smaller pieces.", "", "Taken in the hold-out pass (E2) in court stalls and kerb bays: not shown."),
  row(SF, "Bld_Wall_(?:0[12]|Large_01|Tower_01)", "inferred", "Low wall segments and an arch are on Layouts_Buildings_02 (sheet only). No scene shows a barricade line across a street mouth.", "Layouts_Buildings_02", "Bld_Wall_02 across a street mouth as a barricade (hold-out pass, E2): not shown. The images show Frontier walls enclosing a settlement; closing a street mouth is the same job."),
  row(SF, "Bld_WaterTower_01", "inferred", "A tower on legs in the settlement, on the ground.", "Layouts_Buildings_01, SS_Town_Sunset"),
  row(SF, "Prop_Greeble_.*|Prop_Crate_.*", "inferred", "Clutter on the ground around stalls, garages and pads.", "SS_Mechanic, SS_Pad, SS_Market"),
  row(SF, "Prop_Fuel_Tank_0[12]", "not-shown", "Clutter near garages and pads (inferred for the family); these two were not told apart in any image.", "SS_Mechanic, SS_Pad", "Taken in the hold-out pass (E2) as clutter: not shown."),

  // 3. Palm City
  row(PC, "Env_Vines_0[1-8]", "seen", "Leafy vines drape over the eaves of a roof or pergola and hang down from them, wrap round posts and columns, and trail down the faces of arches. They also hang from a high balcony or parapet edge, and from a tower wall by a pool deck. Sparse trailing strands, not a full wall cover. Only 01, 04 and 05 are flat sheets (0.7 to 0.8 m deep); 02, 03, 07 and 08 are 2.1 to 4 m deep drapes; 06 is a 0.6 x 3.0 x 0.6 column wrap.", "Screenshot_06, 10, 12, 22, Layout_Env_01", "Plan: 3.7 x 3.8 x 0.7 sheets for walls. The images never show a full sheet on a plain wall. Hang them from roof edges, canopies, balconies and posts, choosing the variant by its depth. Env_Vines_06 on street sign posts and signal masts (ruin pass, F1): only if its shape wraps or hangs on a post."),

  // 4. Nature
  row(NA, "Tree_(?:Birch|Round|Large|Generic|TallRound|Pine|PolyPine|Willow)_.*|Tree_0[1-4]", "seen", "Wild woodland and riverbank on natural ground, with trees clustered by kind and colour. The giant tree stands alone as a centrepiece over a clearing.", "Screenshot_00, Screenshots_04, 08, 09, 10", "Saplings (Tree_Birch_*, Tree_Round_*) in the carriageway (ruin pass, B9): not shown, taken as a departure. Never on a junction or crossing; never scaled; its crown may cover any line, pole, light, lamp-post place or drop end in the ruin (Josh, 22 Nov 2026), but its trunk never blocks the way on foot to a pole."),
  row(NA, "Tree_Dead_.*", "seen", "Bare snags (1.2 to 3.5 m high) in a swamp, standing in mud and water among fallen logs.", "Screenshots_02, 06", 'Tree_Dead_01/02 on roofs (ruin pass, B10): not shown, taken as a departure. Only where the footprint fits the roof deck unscaled; never over or against a rooftop pole or line. Josh, 22 Nov 2026: "Yes, switch it on (Recommended)".'),
  row(NA, "Tree_Vines_0[1-4]", "seen", "Moss or vine strands hang from the branches of dead and swamp trees. None hang on walls (the pack has no buildings). On the sheet they stand alone as thin hanging strands.", "Screenshots_06, Layout03", "Plan: on walls. The images hang them only from tree branches; on a building they would need something overhead to hang from (an eave, a sign arm, a balcony), not stuck flat to a facade."),
  row(NA, "Tree_Log_.*|Tree_Stump_.*", "seen", "Fallen logs lie across the forest floor and in water. Stumps sit among trees.", "Screenshots_02, 06, 08, Layout03"),
  row(NA, "Plant_Fern_.*|Plant_Grass_.*|Plant_Undergrowth_01", "seen", "Ground cover in forest clearings, path edges and riverbanks.", "Screenshot_00, Screenshots_01, 07"),
  row(NA, "Plant_Bush_0[1-3]", "seen", "Ground cover in forest clearings, path edges and riverbanks.", "Screenshot_00, Screenshots_01, 07", "Plant_Bush_01 on roofs (ruin pass, B10): not shown, taken as a departure. Only where the footprint fits the roof deck unscaled; never over or against a rooftop pole or line."),
  row(NA, "Plant_Hedge_Bush_.*", "inferred", "Rounded bushes on open grass.", "Layout_01, Screenshots_04"),
  row(NA, "Terrain_Ground_Mound_.*|Terrain_Rubble_Pebbles_.*|Terrain_DustPile_.*", "inferred", "Grass mounds and pebble scatters on natural ground. Rubble pebbles sit at the foot of rocks and ruins. All images are natural terrain, with no paving or roads.", "Layout_03, Screenshots_03", "Terrain_Ground_Mound_Small_02 as a cell-sized patch on hard ground (ruin pass, B9): not shown, taken as a departure. Only where no Env_Overgrowth_* piece fits; on a crossing only flat ground cover, never the mound; never scaled."),
  row(NA, "Prop_Pillar_.*|Prop_StoneWall_.*", "seen", "Broken stone arches and pillars stand in a grassy clearing as a ruin.", "Screenshots_03, Layout_01"),

  // 5. Apocalypse (ruin and power subsets)
  row(AP, "Env_RoadPiece_Damaged_.*", "seen", "Craters and heaved, broken slabs in the carriageway, mostly at junctions and mid-road, with cracks running out from them.", "Screenshot_11, Screenshot_16"),
  row(AR, "Env_Overgrowth_.*", "seen", "Flat green patches spread over pavement edges, kerbs, car parks and flat roofs, and moss sits on ledges. On a tall building, long vine strands hang from balcony and roof edges down the facade. Env_Overgrowth_Wall_* was not told apart from the other overgrowth pieces. Used first wherever it fits in the ruin pass.", "Screenshot_11, 16, 19, 05"),
  row(AR, "Env_Sidewalk_Overgrown_.*", "inferred", "Pavement runs with grass through them, along streets.", "Screenshot_16, 19"),
  row(AR, "Prop_Car_Wrecked_.*", "seen", "Abandoned in the carriageway at angles, in car parks and outside shops. Overgrown buses sit in the road.", "Screenshot_05, 11, 16, 19, Layout_02"),
  row(AR, "Prop_Barricade_.*|Prop_Road_Barrier_.*", "seen", "Plank, sheet-metal and wired barricades close a street behind a gated compound wall. Fences ring camps and yards.", "Screenshot_08, 06, 14, Layout_02, 15"),
  row(AR, "Bld_Door_Barricaded_.*", "inferred", "Boards across doorways on house and shop fronts.", "Screenshot_13, Church_01"),
  row(AR, "Prop_Rubble_Concrete_.*", "inferred", "Rubble piles at the foot of damaged buildings and by craters.", "Screenshot_11, 16"),
  row(AP, "Prop_Powerpole_(?:01|Preset_0[1-3]|Single_01|Line_01|Lines_01|Single_Line_0[12])", "seen", "Wooden crossarm poles (6.3 m high) stand in the ground or pavement along streets and through suburbs, with lines between them.", "Screenshot_13, Screenshot_16, Layout_01"),
  row(AP, "Prop_Powerpole_(?:Single_)?Broken_0[1-4]", "not-shown", "Broken poles are not shown in any scene. How a toppled pole should lie (across the road or the pavement) is unconfirmed. The fallen pylon in Screenshot_11 lies whole, across a road and a car park.", "Screenshot_11 (the pylon)"),
  row(AP, "Bld_Pylon_(?:01|Broken_01|Broken_Base_01|Lines_01)", "seen", "Lattice pylons stand in open country with lines. One has fallen whole and lies across a car park and road.", "Screenshot_15, 17, 11"),
];

/** Every note row whose pack is the key's pack and whose pattern matches the key's name, in table order. */
export function notesFor(key: CalibrationKey): readonly AssetGalleryNote[] {
  const at = key.indexOf(":");
  const pack = key.slice(0, at);
  const name = key.slice(at + 1);
  return PIECE_NOTES.filter((r) => r.pack === pack && r.pattern.test(name)).map(({ text, images, sure, departure }) => ({ text, images, sure, departure }));
}

// ---- the pieces ----

/** One piece per asset entry of `pack`, in manifest order. Sizes are the bounds as the manifest has them (they include the pack's scale); nothing is rescaled. An unknown pack gives []. */
export function assetGalleryPieces(manifest: AssetManifest, pack: string): AssetGalleryPiece[] {
  const p: AssetPack | undefined = manifest.packs.find((x) => x.pack === pack);
  if (p === undefined) return [];
  const uses = pieceUses();
  return p.assets.map((a) => {
    const key: CalibrationKey = `${p.pack}:${a.name}`;
    return {
      key,
      pack: p.pack,
      name: a.name,
      size_m: sizeOf(a),
      triangles: a.triangles,
      textured: a.textures.length > 0,
      warnings: [...a.warnings],
      missingTextures: [...a.missingTextures],
      neverUsed: p.pack === "city-pack" && isNeverUsed(key),
      uses: uses.get(key) ?? [],
      notes: notesFor(key),
    };
  });
}

// ---- the page ----

/** The page a query asks for. Terms are matched against the name, case-insensitive; pieces sort by name in code-unit order; the page is clamped to 1..pageCount. */
export function assetGalleryPage(pieces: readonly AssetGalleryPiece[], query: AssetGalleryQuery): AssetGalleryPage {
  const terms = query.text
    .toLowerCase()
    .split(" ")
    .filter((t) => t !== "");
  const matched = pieces
    .filter((p) => {
      if (p.pack !== query.pack) return false;
      const name = p.name.toLowerCase();
      if (!terms.every((t) => name.includes(t))) return false;
      if (query.use === "unused") {
        if (p.uses.length > 0) return false;
      } else if (query.use !== "any" && !p.uses.some((u) => u.use === query.use)) return false;
      if (query.flag === "untextured" && p.textured) return false;
      if (query.flag === "warnings" && p.warnings.length === 0) return false;
      return true;
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const pageCount = Math.max(1, Math.ceil(matched.length / ASSET_GALLERY_PAGE_SIZE));
  const raw = Number.isFinite(query.page) ? Math.trunc(query.page) : 1;
  const page = Math.min(pageCount, Math.max(1, raw));
  const start = (page - 1) * ASSET_GALLERY_PAGE_SIZE;
  return { query: { ...query, page }, pieces: matched.slice(start, start + ASSET_GALLERY_PAGE_SIZE), total: matched.length, pageCount };
}
