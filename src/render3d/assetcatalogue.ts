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
  "city-pack": { title: "POLYGON City", storeUrl: "https://syntystore.com/products/polygon-city-pack" },
  "nature-pack": { title: "POLYGON Nature", storeUrl: "https://syntystore.com/products/polygon-nature-pack" },
  "palm-city-pack": { title: "POLYGON Palm City", storeUrl: "https://syntystore.com/products/polygon-palm-city" },
  "sci-fi-city-pack": { title: "POLYGON Sci-Fi City", storeUrl: "https://syntystore.com/products/polygon-sci-fi-city" },
  "sci-fi-frontier-pack": { title: "POLYGON Sci-Fi Frontier", storeUrl: "https://syntystore.com/products/polygon-sci-fi-frontier" },
  "simple-town": { title: "SIMPLE Town", storeUrl: "https://syntystore.com/products/simple-town-cartoon-assets" },
  "town-pack": { title: "POLYGON Town", storeUrl: "https://syntystore.com/products/polygon-town-pack" },
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

/**
 * The intended-use note (`docs/design/073-pack-intended-use.md`) as a table. The markdown stays the source: a change to the note is a change to a row here. Order is the note's:
 * the five pack tables, then the pieces only "Where the plan disagrees" or "Uses taken that the images do not show" name. A departure is attached to the row it names where there is one.
 */
export const PIECE_NOTES: readonly PieceNoteRow[] = [
  // 1. Sci-Fi City
  row(SC, "Prop_Powerpoll_0[12]", "seen", "A square-section pole about 5 m high with a crossarm and transformer or meter boxes. Cables run from it to building walls and to the next pole. In the images the poles stand on the pavement at the kerb, at street corners and along the street. One clear case: the base sits directly on the paving with a small square foot. In one more image the pole rises behind a market stall and its base is hidden. No image shows one standing on a roof or fixed to a wall.\nSureness: Seen clearly that crossarm poles stand on the pavement. The name match is inferred: it is the only crossarm pole in the pack at that size, but the images carry no labels.", "Screenshot_11 (two poles, both bases on the pavement, clearly visible), Screenshot_13 (several at corners, aerial view), Screenshot_14 (along the street, distant), Screenshot_07 (behind a stall, base hidden)", "Sci-Fi City Prop_Powerpoll_01/02 (Josh's known case). Settled by Josh, 22 Nov 2026. Josh's first ruling (21 Nov) was that the pole goes on an existing structure, not out of the ground, and the plan put it on roofs (\"the rooftop power net\", section 4). The product images do not show that. In Screenshot_11 and Screenshot_13 the crossarm poles stand on the pavement at the kerb, at corners and along the street, with cables to the building walls. Screenshot_11 shows the base plainly on the paving. No image shows one on a roof or on a wall. That the images' poles are Powerpoll_01/02 is inferred, not labelled. Put to Josh on a question card, relayed by the Fable planning session: \"The Sci-Fi City store images show its power pole standing on the pavement at the kerb, not on a roof. You ruled it goes atop buildings and other objects. Keep your ruling?\" Josh: \"Allow both\" (\"The pole may stand on roofs and on pavements at the kerb in the technology pass.\"). So in the tech pass the pole is used as the images show, at the kerb, and also on roofs (Josh's own use, beyond the images). His 21 Nov words (\"not intended to come out of the ground\") are superseded for the tech pass. At the kerb it keeps every pavement rule (rule 10, FURN_KEEP_M, T-1 and T-2; ticket 073, D2)."),
  row(SC, "Prop_Streetlight_01", "inferred", "Not used in 073, listed for contrast. Thin lamp poles on the pavement.", "Screenshot_03, 13"),
  row(SC, "Prop_Cables_0[1-3]|Prop_Cable_Crossing_.*", "seen", "Long sagging cable bundles strung across the street between building façades at upper-floor height, and between façades and the crossarm poles.\nSureness: Seen clearly (cables); name match inferred", "Screenshot_01, 02, 03, 07, 10, 11, 15"),
  row(SC, "Prop_Bridge_01", "inferred", "Open lattice truss beams span the street from one building face to the other, roughly 6 to 10 m up. Cables are draped over them and signs hang from them. Nobody walks on them, and there are no railings or deck.\nSureness: The truss spans are seen clearly. That they are Prop_Bridge_01 is inferred from the 5 m length and the 0.9 m lattice depth.", "Screenshot_01/02 (across the street, signs hung under it), Screenshot_03, 10, 15", "Prop_Bridge_01 as a walkway over lanes and alleys with Env_Railing (section 4). The images show open lattice trusses spanning the street between façades, carrying cables and hung signs, with no deck, no railings and nobody on them (Screenshot_01, 03, 10). That Prop_Bridge_01 is that truss is inferred. Railings in the images edge decks and balconies, not trusses. The truss reading suits the \"wired up\" idea better than a walkway."),
  row(SC, "Env_Railing_0[12]", "seen", "Railings run along the edges of a raised deck that stands on chunky pillars at street level, and along balcony and roof edges.", "Screenshot_06 (raised deck), Screenshot_03 (balcony)"),
  row(SC, "Bld_Raised_0[12]", "inferred", "The only raised building section shown is a deck on heavy pillars at ground level, with railings, a car parked on top and pavement beneath. Nothing like it is stacked on a roof.\nSureness: Inferred: matched by name and the 5 m footprint. Not seen on a roof.", "Screenshot_06", "Bld_Raised_01/02 as extra storeys on existing roofs (section 4). The only raised section in the images is a pillared deck standing at street level (Screenshot_06). Nothing is stacked on a roof. This is inferred, but treat the roof placement as unconfirmed."),
  row(SC, "Building_Shack_0[12]|Bld_Roof_Pagoda_02", "inferred", "Pagoda roofs cap shopfront buildings: a tiled overhang over a shop at about the first-floor line. Small shacks were not identified.\nSureness: Pagoda inferred; shack not shown", "Screenshot_01, 02, 03 (pagoda over shops)"),
  row(SC, "Prop_SatDish_.*|Prop_Vent_.*|Prop_AirConditioningGrid_01|Prop_Antenna", "inferred", "Dishes and large vent or fan machinery sit on roofs and roof edges. Dishes are also on balconies and on a wall bracket.", "Screenshot_03 (roof machinery), 11, 12 (dish on a balcony edge), 13 (roofs, aerial)"),
  row(SC, "Prop_AirConditioningUnit_0[12]", "seen", "Small AC boxes are fixed to building walls high up, in clusters, and on roof edges.", "Screenshot_11 (wall clusters)"),
  row(SC, "Prop_WallAttach_Electronics_.*|Prop_WallAttach_Vent_.*|Prop_Pipes_.*", "inferred", "Wall boxes and pipes on façades at and above the ground storey. Vertical pipes run down to the pavement.", "Screenshot_04 (pipe down the wall), 03, 11"),
  row(SC, "Prop_Security_Camera_0[12]", "seen", "Mounted high on building walls, at upper-corner and ceiling height, outdoors and indoors. Never free-standing on the pavement.", "Screenshot_04 (outside corner, about 4 m up), Screenshot_08 (interior walls near the ceiling), Screenshot_12 (two on a façade)", "Prop_Security_Camera_01/02 as \"street tech\" on the pavement (section 4, Pavement row). The images show them only fixed high on walls, outdoors and indoors (Screenshot_04, 08, 12). Move them to the Walls row, above the ground storey."),
  row(SC, "Prop_VendingMachine_01|Prop_Atm_01", "inferred", "Machines stand against shopfronts on the pavement, backs to the wall. ATM-like terminals also appear indoors.", "Screenshot_03 (terminal on the pavement), 08 (indoors), 11"),
  row(SC, "Prop_ChargingStation_01", "not-shown", "Machines stand against shopfronts on the pavement, backs to the wall. ATM-like terminals also appear indoors.", "Screenshot_03 (terminal on the pavement), 08 (indoors), 11", "Prop_ChargingStation_01 on the pavement's kerb line: not shown (a vehicle charger belongs by the road; the images do not tell it apart from the other terminals). It keeps every pavement rule D1 keeps."),
  row(SC, "Prop_Advertisement_Pillar_01", "seen", "A round poster pillar on the pavement, free-standing.", "Screenshot_03, 07 (covered in posters)"),
  row(SC, "Prop_Hologram_.*", "seen", "Big hologram food and bottle signs on top of low buildings and roof corners. The noodle sign is on a roof.", "Screenshot_13 (burger on a low roof, bottle on a roof), Screenshot_14 (noodle box on a roof)", "Sci-Fi City Prop_Hologram_* \"dead holograms\" on roofs (section 4). This agrees with the images (Screenshot_13, 14). The images favour low roofs and roof corners over the street, not tall towers."),
  row(SC, "Sign_.*", "seen", "Shop signs fixed to façades above doors, vertical blade signs on corners, billboards on upper walls. Neon is shown glowing.", "Screenshot_01 to 04, 11, Layout_11"),
  row(SC, "Bld_Advanced_0[12]", "inferred", "Shopfront façade strips are laid out on the building sheet. In scenes, shopfronts form the ground storey.", "Layout_06 (top rows), Screenshot_03, 11", "Bld_Advanced_01/02 as an added front, 0.71 m out in front of an old shop, on single and double shops only, never corner shops: departure. The images show these strips as a building's own ground storey; an added front is what Josh's \"augmented\" city needs. Behind one constant, off if its partly faced end reads as a loose panel at street level (D1g)."),
  row(SC, "Bld_Power_0[124]", "not-shown", "Not identified in any scene. Layout_06 has cylindrical tank or plant blocks that may be these.", "Layout_06"),
  row(SC, "Bld_Large_.*", "seen", "Free-standing towers on their own plots, forming the skyline.\nSureness: Seen clearly (out of v1 anyway)", "Screenshot_13, 14"),
  row(SC, "Bld_LandingPad_01", "inferred", "Cars parked on rooftops and on raised pads.", "Screenshot_13"),
  row(SC, "Prop_Overhang_0[12]", "not-shown", "Planned pieces I could not find in use in any image. Treat silence as \"unknown\", not as approval", "", "Prop_Overhang_01/02 as canopies over a whole free storey face: not shown. Its shape (1.44 m deep, closed on all sides) reads as one, and nothing contradicts it. (D1 as built types and pins it but never places it: the density rule gives the slot no chance.)"),
  row(SC, "Env_Greeble_Cube_.*", "not-shown", "Planned pieces I could not find in use in any image. Treat silence as \"unknown\", not as approval", ""),

  // 2. Sci-Fi Frontier
  row(SF, "Prop_Power_Pole_0[1-3]", "seen", "Tall thin poles stand in the ground of the settlement, between buildings and along the main street. Cables sag from pole to pole and to rooftop signs and roofs. One thin pole rises from the top of a domed building instead of the ground. A thicker pole stands on the ground beside the Grub Hub.", "SS_Grub_Hub (ground pole and a pole on a building), SS_Town_Sunset (row along the street), SS_Market_01/02 (pole in the market square, cables to the stall roofs)", "Frontier Prop_Power_Pole_01..03 \"on whatever stands there\", across streets, off light posts and traffic masts (section 5). The images show these poles standing in the ground, or once on top of a building, with cables to other poles and to roofs. Lines tied off light posts and traffic masts are not shown. That use is the deliberate rule-break the plan already lists in section 7. Keep it there."),
  row(SF, "Prop_Cable_(?:1[2-6]|17|18)(?:_Alt_01)?", "seen", "Sagging spans between poles and buildings, some hung with bunting. The 12 m spans are laid out as loose hanging cables on Layouts_Buildings_02.", "SS_Grub_Hub, SS_Town_Sunset, Layouts_Buildings_02 (top row)"),
  row(SF, "Prop_Cable_0[1-6]|Prop_Cable_Stand_01|Prop_Cable_Junction_01(?:_Alt_01)?", "seen", "Cables lie on the ground and snake across it between small stands and boxes, out in the open.\nSureness: Seen clearly (ground cables); stand match inferred", "SS_Moist (glowing ground cables between tripod stands), SS_DropPod (cables from a ground unit)"),
  row(SF, "Prop_Solar_Panel_0[2-5](?:_Insert_01)?", "seen", "Large tilted panels on a post or rotating base. One stands on top of a round building in the town, one is on a post beside a building at about 4 m, and one is built onto a small building (Layouts_Buildings_01). Star-shaped ground arrays stand in open fields beside a farm.\nSureness: Seen clearly (they are used both on roofs and on the ground)", "SS_Town_Sunset (on a building), SS_Grub_Hub (beside a building), SS_Farmlife (ground arrays), Layouts_Buildings_01", "Frontier Prop_Solar_Panel_* under \"Roofs\" (section 5). The images use them both on buildings and as ground arrays in open fields (SS_Town_Sunset, SS_Farmlife). This is no conflict. It widens the plant's options: ground arrays suit the court or park plant, and Solar_Panel_02 (5.6 high on a post) is a ground or edge piece more than a flat-roof one."),
  row(SF, "Prop_Windmill_01", "seen", "Stands alone on open ground at the edge of the settlement, beside a tent.", "SS_Outback"),
  row(SF, "Prop_Silo_0[1-4]", "inferred", "Grouped in a row at the edge of the farm fields, on open ground.\nSureness: Inferred (matched by the domed and lattice shapes on Layouts_Props_01)", "SS_Farmlife"),
  row(SF, "Prop_Generator_01|Prop_Battery_.*", "inferred", "Small power boxes and charger units stand on the ground next to pods and stalls, with cables to them.", "SS_DropPod, SS_Camp_Gathering"),
  row(SF, "Bld_Tent_0[1-3].*|Prop_Fabric_0[1-3]", "seen", "Tents stand on open ground. A fabric awning is stretched on poles off a tent's side, and fabric is draped over a building's top.\nSureness: Seen clearly (tents); fabric inferred", "SS_Outback (tent with an awning on poles), Layouts_Buildings_01 (orange fabric on a building top), Layouts_Buildings_02"),
  row(SF, "Bld_Pod_0[1-4].*", "seen", "Dome huts on open ground in a ring around a camp.", "SS_DropPod, SS_Camp_Gathering"),
  row(SF, "Env_Farm_.*|Prop_Irrigator_.*", "seen", "Large circular and rectangular fields on open land outside the settlement. Irrigator booms stand across the fields, spraying.", "SS_Farm, SS_Farmlife", "Env_Farm_* and Prop_Irrigator_* in city parks: departure (the images show farms on open land outside a settlement; a park is the city's open soil). Only pieces that fit inside the park's rectangle; never scaled; never across a kerb."),
  row(SF, "Bld_Market_Stall_0[1-3].*", "seen", "Stall rows facing a market square, with cables strung overhead from a pole.", "SS_Market_01, SS_Market_02_Night"),
  row(SF, "Prop_Container_.*", "not-shown", "Not identified with certainty in any scene. Crates and boxes near stalls may be smaller pieces.", "", "Prop_Container_* in court stalls and kerb bays, and Prop_Fuel_Tank_* as clutter: not shown."),
  row(SF, "Bld_Wall_(?:01|Large_01|Tower_01)", "inferred", "Low wall segments and an arch are on Layouts_Buildings_02. No scene shows a barricade line across a street mouth.\nSureness: Inferred (sheet only)", "Layouts_Buildings_02"),
  row(SF, "Bld_Wall_02", "inferred", "Low wall segments and an arch are on Layouts_Buildings_02. No scene shows a barricade line across a street mouth.\nSureness: Inferred (sheet only)", "Layouts_Buildings_02", "Bld_Wall_02 across a street mouth as a barricade: not shown (the images show Frontier walls enclosing a settlement; closing a street mouth is the same job)."),
  row(SF, "Bld_WaterTower_01", "inferred", "A tower on legs in the settlement, on the ground.", "Layouts_Buildings_01; SS_Town_Sunset (in the background)"),
  row(SF, "Prop_Greeble_.*|Prop_Crate_.*", "inferred", "Clutter on the ground around stalls, garages and pads.", "SS_Mechanic, SS_Pad, SS_Market"),
  row(SF, "Prop_Fuel_Tank_0[12]", "not-shown", "Clutter on the ground around stalls, garages and pads.", "SS_Mechanic, SS_Pad, SS_Market", "Prop_Container_* in court stalls and kerb bays, and Prop_Fuel_Tank_* as clutter: not shown."),

  // 3. Palm City
  row(PC, "Env_Vines_0[1-8]", "seen", "Leafy vines drape over the eaves of a roof or pergola and hang down from them, wrap round posts and columns, and trail down the faces of arches. They also hang from a high balcony or parapet edge on the mansion, and from a tower wall by a pool deck. Outdoors, on resort, leisure and garden structures. The look is sparse trailing strands, not a full wall cover. On the layout sheet they are sheets, clumps and a single column-wrap strand.", "Screenshot_06 (over the bar's eave and down its posts), Screenshot_10 (up a colonnade column and over the arches), Screenshot_12 (over the mansion's upper edge), Screenshot_22 (pergola eave, tower wall), Layout_Env_01 (top-left group)", "Palm City Env_Vines_01..08 described as \"3.7 x 3.8 x 0.7 sheets\" for walls (section 6). The images use them to drape over eaves, pergolas, arches and parapets and to wrap columns (Screenshot_06, 10, 12, 22), never as a full sheet on a plain wall. Only 01, 04 and 05 are flat sheets. 02, 03, 07 and 08 are deep drapes, and 06 is a column wrap. Hang them from roof edges, canopies, balconies and posts, choosing the variant by its depth."),
  row(PC, "Env_Vines_06", "inferred", "Manifest note, which the images agree with: only Env_Vines_01/04/05 are flat sheets (0.7 to 0.8 m deep). 02/03/07/08 are 2.1 to 4 m deep (corner or roof-edge drapes). 06 is a 0.6 x 3.0 x 0.6 column wrap.", "", "Env_Vines_06 on street sign posts and signal masts: only if its shape wraps or hangs on a post (its bounds and one of F1g's screenshots). If it reads as a flat sheet like _01/04/05, it is dropped. Never on a circuit pole, street light or lamp post, and never on a wall face (beside a drop, only _08)."),

  // 4. Nature
  row(NA, "Tree_(?:Large|Generic|TallRound|Pine|PolyPine|Willow)_.*|Tree_0[1-4]", "seen", "Wild woodland and riverbank on natural ground, with trees clustered by kind and colour. The giant tree stands alone as a centrepiece over a clearing.", "Screenshot_00, Screenshots_04, 08, 09, 10"),
  row(NA, "Tree_(?:Birch|Round)_.*", "seen", "Wild woodland and riverbank on natural ground, with trees clustered by kind and colour. The giant tree stands alone as a centrepiece over a clearing.", "Screenshot_00, Screenshots_04, 08, 09, 10", "Saplings (Tree_Birch_*, Tree_Round_*) in the carriageway: B9, ruin only. Never on a junction or crossing; never scaled."),
  row(NA, "Tree_(?:Birch|Round)_.*|Tree_Large_01|Tree_Generic_Giant_01", "not-shown", "Ruin tree crowns are free; only the trunk is checked (saplings and park trees). Josh's ruling, 22 Nov 2026 (on question cards and in chat, relayed by the Fable planning session): \"Through any dead line\", \"Poles too\", \"Yes, from the trunk (Recommended)\", \"Hold no, trees crowns can absolutely grow into buildings, but the trunks should not grow out of buildings\", and \"Yes trees don't care about structures outside of where they\" / \"Start their growth\". So in the ruin a crown may cover any line, pole, street light, lamp-post place or drop end, and grow into buildings, fire escapes, awnings and hold-out structures (none of which the images show). The trunk never stands in a building, keeps 0.3 m from standing pieces and clear of poles, street lights and lamp-post places, and never blocks the way on foot to a pole (T-2). Ticket 073 F1b1, F1b2, F1b3.", ""),
  row(NA, "Tree_Dead_0[12]", "seen", "Bare snags in a swamp, standing in mud and water among fallen logs.", "Screenshots_02, 06", "Plant_Bush_01 and Tree_Dead_01/02 on roofs: B10, ruin only. Only where the footprint fits the roof deck unscaled; never over or against a rooftop pole or line. If a roof dead tree reads silly in F1g's street screenshot, dead trees are dropped and bushes kept (the main session's call from the picture). Josh's ruling, 22 Nov 2026 (on a question card, relayed by the Fable planning session): \"Yes, switch it on (Recommended)\" (\"Pieces must fit the roof unscaled and never sit over a rooftop pole or line.\"). Ruin roof growth is on (RUIN_ROOF_GROWTH, ticket 073 F1b2); dead trees on roofs keep off rooftop poles and lines too."),
  row(NA, "Tree_Dead_(?!0[12]$).*", "seen", "Bare snags in a swamp, standing in mud and water among fallen logs.", "Screenshots_02, 06"),
  row(NA, "Tree_Vines_0[1-4]", "seen", "Moss or vine strands hang from the branches of dead and swamp trees. None hang on walls (the pack has no buildings). On the sheet they stand alone as thin hanging strands.\nSureness: Seen clearly (from branches)", "Screenshots_06, Layout03", "Nature Tree_Vines_01..04 on walls (section 6, Walls row). The images hang them only from tree branches (Screenshots_06). On a building they would need something overhead to hang from: an eave, a sign arm, a balcony. They should not be stuck flat to a façade."),
  row(NA, "Tree_Log_.*|Tree_Stump_.*", "seen", "Fallen logs lie across the forest floor and in water. Stumps sit among trees.", "Screenshots_02, 06, 08 (a log by the stream), Layout03"),
  row(NA, "Plant_Fern_.*|Plant_Grass_.*|Plant_Undergrowth_01|Plant_Bush_0[23]", "seen", "Ground cover in forest clearings, path edges and riverbanks.", "Screenshot_00, Screenshots_01, 07"),
  row(NA, "Plant_Bush_01", "seen", "Ground cover in forest clearings, path edges and riverbanks.", "Screenshot_00, Screenshots_01, 07", "Plant_Bush_01 and Tree_Dead_01/02 on roofs: B10, ruin only. Only where the footprint fits the roof deck unscaled; never over or against a rooftop pole or line. If a roof dead tree reads silly in F1g's street screenshot, dead trees are dropped and bushes kept (the main session's call from the picture). Josh's ruling, 22 Nov 2026 (on a question card, relayed by the Fable planning session): \"Yes, switch it on (Recommended)\" (\"Pieces must fit the roof unscaled and never sit over a rooftop pole or line.\"). Ruin roof growth is on (RUIN_ROOF_GROWTH, ticket 073 F1b2); dead trees on roofs keep off rooftop poles and lines too."),
  row(NA, "Plant_Hedge_Bush_.*", "inferred", "Rounded bushes on open grass.", "Layout_01, Screenshots_04"),
  row(NA, "Terrain_Ground_Mound_(?!Small_02$).*|Terrain_Rubble_Pebbles_.*|Terrain_DustPile_.*", "inferred", "Grass mounds and pebble scatters on natural ground. Rubble pebbles sit at the foot of rocks and ruins.", "Layout_03 (sheet), Screenshots_03 (pebbles at ruins)"),
  row(NA, "Terrain_Ground_Mound_Small_02", "inferred", "Grass mounds and pebble scatters on natural ground. Rubble pebbles sit at the foot of rocks and ruins.", "Layout_03 (sheet), Screenshots_03 (pebbles at ruins)", "Terrain_Ground_Mound_Small_02 as a cell-sized patch on hard ground (road, parking band, open paving): B9, ruin only. Only where no Env_Overgrowth_* piece fits; on a crossing only flat ground cover, never the mound; never scaled."),
  row(NA, "Prop_Pillar_.*|Prop_StoneWall_.*", "seen", "Broken stone arches and pillars stand in a grassy clearing as a ruin.", "Screenshots_03, Layout_01"),

  // 5. Apocalypse (ruin and power subsets)
  row(AP, "Env_RoadPiece_Damaged_.*", "seen", "Craters and heaved, broken slabs in the carriageway, mostly at junctions and mid-road, with cracks running out from them.", "Screenshot_11 (holes in a wide road), Screenshot_16 (crater at a junction)"),
  row(AR, "Env_Overgrowth_.*", "seen", "Flat green patches spread over pavement edges, kerbs, car parks and flat roofs, and moss sits on ledges. On a tall building, long vine strands hang from balcony and roof edges down the façade.", "Screenshot_11 (façade vines, roof moss), Screenshot_16 and 19 (patches on roads, pavements and roofs), Screenshot_05 (roof edge)"),
  row(AR, "Env_Sidewalk_Overgrown_.*", "inferred", "Pavement runs with grass through them, along streets.", "Screenshot_16, 19"),
  row(AR, "Prop_Car_Wrecked_.*", "seen", "Abandoned in the carriageway at angles, in car parks and outside shops. Overgrown buses sit in the road.", "Screenshot_05, 11, 16, 19; Layout_02"),
  row(AR, "Prop_Barricade_.*|Prop_Road_Barrier_.*", "seen", "Plank, sheet-metal and wired barricades close a street behind a gated compound wall. Fences ring camps and yards.", "Screenshot_08 (barricaded gate across the street), Screenshot_06, 14; Layout_02, 15"),
  row(AR, "Bld_Door_Barricaded_.*", "inferred", "Boards across doorways on house and shop fronts.", "Screenshot_13, Church_01"),
  row(AR, "Prop_Rubble_Concrete_.*", "inferred", "Rubble piles at the foot of damaged buildings and by craters.", "Screenshot_11, 16"),
  row(AP, "Prop_Powerpole_(?:01|Preset_0[1-3]|Single_01|Line_01|Lines_01|Single_Line_0[12])", "seen", "Wooden crossarm poles stand in the ground or pavement along streets and through suburbs, with lines between them.\nSureness: Seen clearly (standing). Broken poles not shown in any scene.", "Screenshot_13 (row through a suburb), Screenshot_16 (along kerbs), Layout_01 (top-left)"),
  row(AP, "Prop_Powerpole_(?:Single_)?Broken_0[1-4]", "not-shown", "Wooden crossarm poles stand in the ground or pavement along streets and through suburbs, with lines between them.\nSureness: Seen clearly (standing). Broken poles not shown in any scene.", "Screenshot_13 (row through a suburb), Screenshot_16 (along kerbs), Layout_01 (top-left)", "Apocalypse broken power poles (Prop_Powerpole_Broken_*) (section 6, \"toppled poles\"). The intact poles are shown standing in the pavement along streets, which fits the street grid. No image shows a broken one in place, so how a toppled pole should lie (across the road or the pavement) is unconfirmed. The fallen pylon in Screenshot_11 lies whole, across a road and a car park."),
  row(AP, "Bld_Pylon_(?:01|Broken_01|Broken_Base_01|Lines_01)", "seen", "Lattice pylons stand in open country with lines. One has fallen whole and lies across a car park and road.", "Screenshot_15, 17 (standing), Screenshot_11 (fallen)"),
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
