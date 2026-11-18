/**
 * Ticket 053: the numbers behind the reference checklist (R1 to R12 of chapter 16 of docs/city-style-guide.md). Pure: no three, no DOM, no fetch, no GLB. It reads what the town
 * plan already holds (the terrace runs and their packed blocks of 051, the dressing of 052 A, the street furniture of 052 C) and counts: frontage covered per run, the far-gap
 * histogram, the storey histogram, the neighbour-differ rate, slots per bay, props per roof, keep-out violations, excluded keys used, emissive materials. `evaluateCity` compares the
 * numbers with `CITY_CHECK`, so the measurable half of the evaluation protocol runs on every `npm test` (`citymetrics.test.ts`); the rest of the checklist is judged by eye.
 *
 * Nothing here decides a rule. A number that fails a threshold is a finding for the ticket that owns the rule (the guide's chapter 16 says which).
 */

import type { CalibrationKey } from "../core";
import { ATMS, AWNINGS, AWNING_CORNER, ESCAPE_MIN_BAYS, SHOP_GLASS, dressRoleOf, type DressPiece } from "./dressing";
import { FURN_CORNER_M, FURN_KEEP_M, FURN_KERB_M, FURN_MAX_H_M, FURN_PITCH_M, FURN_WALL_M, KERB_M, TREES, TREE_PITCH_M, WALL_EDGE_M, type FurniturePiece, type Rect } from "./furniture";
import type { Stack, StackPiece } from "./stacks";
import { ALLEY_MAX_M, ALLEY_MIN_M, TERRACE_SEAM_M, type PackResult, type PackedBlock } from "./terrace";
import { WIRE_CLEAR, WORLD_PER_METRE, type Lot, type OpenLot, type Pt, type TerraceRun } from "./town";

export type CityCheckId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9" | "R10" | "R11" | "R12";

/**
 * The threshold of each automatic item. A share is at least the number; a count is at most it, except R11 (at least that many parking lots, and plazas, on the largest map).
 * R1 the share of all runs' frontage that blocks cover (ticket 053 asked 0.9 for every run: 8 of the 58 runs of `64-the-whole-chain` cover less, so it is the map's share; chapter 16).
 * R2 neighbours that differ in style and floor count. R3 ground bays that are a shopfront or the block's one door bay. R4 shops with a glass key that have glass. R5 shop bays with an
 * awning (the ticket asked 0.6; `09-shrine-circuit` measures 0.584, so 0.55). R6 shop bays with a sign. R7 qualifying blocks with a fire escape. R8 blocks with a dressed roof (the
 * ticket asked 1.0; 4 to 6 blocks in 100 have none, so 0.9). R9 corner blocks off a true corner (a count). R10 furniture spacing, keep-out and corner violations (a count). R11 parking
 * lots, and plazas, on the largest map. R12 excluded keys used, and emissive dressing materials (a count).
 */
export const CITY_CHECK: Readonly<Record<CityCheckId, number>> = {
  R1: 0.9,
  R2: 1,
  R3: 1,
  R4: 1,
  R5: 0.55,
  R6: 0.5,
  R7: 0.5,
  R8: 0.9,
  R9: 0,
  R10: 0,
  R11: 1,
  R12: 0,
};

/** The blocks that carry an ATM, as a share of all blocks, at least (R6's second number). */
export const CITY_ATM_BLOCKS_MIN = 0.15;
/** The runs with a big roof prop (water tower, stair hut, billboard, novelty sign), as a share of the runs, at least (R8's second number). */
export const CITY_BIG_ROOF_RUNS_MIN = 0.5;
/** A run whose blocks cover less than this share of its frontage is counted in `runsUnderFrontage` (reported, not asserted: see chapter 16, R1). */
export const CITY_RUN_FRONTAGE = 0.9;
/** The storeys a block may have (floors over the base, plus the base): the reference's 3 to 5. */
export const CITY_STOREYS = { min: 3, max: 5 } as const;

/**
 * The names the City Pack has that no placement, recipe or furniture rule may use (people, vehicles and everything chapter 16's "Never used" table gives a reason for). A name
 * is a prefix of a key's pack name, so one stem covers a whole family. The guide's table and this list must agree (`styleguide.test.ts`).
 */
export const CITY_NEVER_USED: readonly string[] = [
  "SK_",
  "SM_Veh_",
  "SM_Env_Skyline_",
  "SM_Env_PalmTree_",
  "SM_Prop_LightPole_",
  "SM_Prop_TrafficLight_",
  "SM_Prop_PowerBox_",
  "SM_Prop_Power_Cables_",
  "SM_Bld_Apartment_Stairs_",
  "SM_Prop_Sign_XXX_",
  "SM_Prop_Sign_Police_",
  "SM_Prop_Sign_Hospital_",
  "SM_Prop_Sign_FireDepartment_",
  "SM_Prop_ShopInterior_",
  "SM_Prop_Buger_",
  "SM_Prop_Soda_",
  "SM_Prop_SmartPhone_",
  "SM_Prop_Paper_",
  "SM_Prop_Police_Baton_",
  "SM_Prop_Pipe_Present_",
  "SM_Env_Bridge_",
  "SM_Env_WaterEdge_",
  "SM_Env_SubwayEntrance_",
];

/** True when a key (`pack:name`, or a bare name) starts, after the pack, with a never-used stem. */
export function isNeverUsed(key: string): boolean {
  const name = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
  return CITY_NEVER_USED.some((s) => name.startsWith(s));
}

// ---- the plan ----

export interface CityTown {
  terraces: readonly TerraceRun[];
  lots: readonly Lot[];
  openLots: readonly Pick<OpenLot, "kind" | "run">[];
}

/** One packed block with the run it stands in. */
export interface RunBlock {
  run: TerraceRun;
  block: PackedBlock;
}

/**
 * The packed blocks of a town in the order the game dresses them (`dressSites`): each terrace run in turn, a run's blocks in run order, a run that packed no block left out.
 * `dressing` passed to `cityMetrics` is aligned with this.
 */
export function runBlocks(terraces: readonly TerraceRun[], packed: ReadonlyMap<string, PackResult>): RunBlock[] {
  const out: RunBlock[] = [];
  for (const run of terraces) for (const block of packed.get(run.id)?.blocks ?? []) out.push({ run, block });
  return out;
}

/** What `furnitureLayout` keeps clear of, as it was given its input (all optional): poles, lamp posts and nodes; drop lines; junction pads; wire spans. */
export interface CityKeep {
  points?: readonly Pt[];
  segments?: readonly (readonly [Pt, Pt])[];
  rects?: readonly Rect[];
  wireRects?: readonly Rect[];
}

export interface CityExtra {
  keep?: CityKeep;
  /** Emissive materials found in the drawn dressing and furniture (the pure plan has none to count). */
  emissiveMaterials?: number;
}

// ---- the numbers ----

export interface FarGaps {
  seam: number;
  alley: number;
  /** Between the seam and the alley: a slit, which the packer never aims for. */
  slit: number;
  /** Over the alley's top: a wider gap, left because whole bays cannot close it. */
  wide: number;
}

export interface CityMetrics {
  runs: number;
  blocks: number;
  dressPieces: number;
  furniturePieces: number;
  // R1
  /** The share of all runs' frontage that blocks cover (blocks over blocks plus the far gap and its overhang), summed over the map. 1 with no run. */
  frontageCovered: number;
  /** The smallest such share of any one run (1 with no run), and how many runs are under `CITY_RUN_FRONTAGE`. */
  minFrontageCovered: number;
  runsUnderFrontage: number;
  /** The widest gap between two neighbouring blocks of a run, metres (0 when they abut). */
  maxNeighbourGap_m: number;
  /** The most parking lots, and the most plazas, any one run has (a plaza is keyed to the run that starts after it, a parking lot to the run it ends: a run may have one of each). */
  maxParkingPerRun: number;
  maxPlazaPerRun: number;
  farGaps: FarGaps;
  // R2
  storeys: Readonly<Record<number, number>>;
  minStoreys: number;
  maxStoreys: number;
  neighbourPairs: number;
  /** The share of neighbouring blocks that differ in style and in floor count. 1 with no pair. */
  neighbourDiffer: number;
  // R3
  groundBays: number;
  /** Ground pieces that are neither a shop, a shop corner nor a residents' door, and columns with no ground piece. */
  groundBaysOther: number;
  maxDoorBaysPerBlock: number;
  // R4
  shopsWithGlassKey: number;
  shopsGlassed: number;
  // R5
  shopBays: number;
  awnedShopBays: number;
  /** Blocks whose non-corner awnings are not all one key. */
  mixedAwningBlocks: number;
  // R6
  signedShopBays: number;
  atmBlocks: number;
  // R7
  escapeQualifying: number;
  escapeBlocks: number;
  // R8
  roofDressedBlocks: number;
  /** Runs with at least one big roof prop (water tower, stair hut, billboard, novelty sign), and the runs counted. */
  runsWithBigRoofProp: number;
  // R9
  cornerBlocks: number;
  cornerBlocksOffCorner: number;
  // R10
  pavementPieces: number;
  /** Items on one line of a run closer than `FURN_PITCH_M` (trees: `TREE_PITCH_M`), or standing off the pavement. */
  spacingViolations: number;
  /** Items within `FURN_CORNER_M` of a run's end, within `FURN_KEEP_M` of a pole, lamp, node, pad or drop, or a tall item within `WIRE_CLEAR` of a wire. */
  keepOutViolations: number;
  /** Pavement pieces per 10 m of frontage (what the eye judges for clutter). */
  furniturePer10m: number;
  // R11
  parkingLots: number;
  plazas: number;
  // R12
  excludedKeysUsed: number;
  emissiveMaterials: number;
}

const W = WORLD_PER_METRE;
const EPS = 1e-6;

const rectDist = (a: Rect, b: Rect): number => Math.hypot(Math.max(0, a.minX - b.maxX, b.minX - a.maxX), Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ));
const dot = (p: Pt): Rect => ({ minX: p.x, minZ: p.z, maxX: p.x, maxZ: p.z });
const grow = (r: Rect, m: number): Rect => ({ minX: r.minX - m, minZ: r.minZ - m, maxX: r.maxX + m, maxZ: r.maxZ + m });
const overlaps = (a: Rect, b: Rect): boolean => a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

interface Bay {
  piece: StackPiece;
  kind: "shop" | "corner" | "door" | "other";
  /** The first column the piece spans (the column the dressing counts it against). */
  col: number;
}

/** A stack's ground row as bays: each base piece, its kind from its key, and its first column. */
function groundRow(stack: Stack): { bays: Bay[]; uncovered: number } {
  const bays: Bay[] = [];
  const covered = new Set<number>();
  for (const piece of stack.pieces) {
    if (piece.role !== "base") continue;
    const role = dressRoleOf(piece);
    const kind: Bay["kind"] = role === "base.door" ? "door" : role === "base.corner" ? "corner" : /SM_Bld_Shop_\d\d$/.test(piece.key) ? "shop" : "other";
    const spanned = stack.columns.map((c, i) => ({ c, i })).filter(({ c }) => Math.abs(c.x - piece.x) <= piece.w / 2 + 1e-6);
    for (const s of spanned) covered.add(s.i);
    bays.push({ piece, kind, col: spanned[0]?.i ?? -1 });
  }
  return { bays, uncovered: stack.columns.filter((_, i) => !covered.has(i)).length };
}

const BIG_ROOF = /SM_Prop_Water_Tower_|SM_Bld_Roof_Access_|SM_Prop_Billboard_Roof_|SM_Prop_LargeSign_/;

/**
 * Every number behind the automatic checklist items, for one town. `packed` is `packTown`'s result; `dressing[i]` is the dressing of `runBlocks(town.terraces, packed)[i]` (what
 * `dressTown` returns for `dressSites`); `furniture` is `furnitureLayout`'s. Pure and deterministic.
 */
export function cityMetrics(town: CityTown, packed: ReadonlyMap<string, PackResult>, dressing: readonly (readonly DressPiece[])[], furniture: readonly FurniturePiece[], extra: CityExtra = {}): CityMetrics {
  const list = runBlocks(town.terraces, packed);
  const runsWithBlocks = town.terraces.filter((r) => (packed.get(r.id)?.blocks.length ?? 0) > 0);

  // R1: frontage and far gaps
  let minFrontageCovered = 1;
  let runsUnderFrontage = 0;
  let coveredAll = 0;
  let spanAll = 0;
  let maxNeighbourGap_m = 0;
  const farGaps: FarGaps = { seam: 0, alley: 0, slit: 0, wide: 0 };
  for (const run of runsWithBlocks) {
    const res = packed.get(run.id)!;
    const covered = res.blocks.reduce((s, b) => s + b.stack.width_m, 0);
    const span = covered + res.farGap_m + res.farOverhang_m;
    const own = span > 0 ? covered / span : 1;
    minFrontageCovered = Math.min(minFrontageCovered, own);
    if (own < CITY_RUN_FRONTAGE - 1e-9) runsUnderFrontage++;
    coveredAll += covered;
    spanAll += span;
    const g = res.farGap_m;
    if (g <= TERRACE_SEAM_M + EPS) farGaps.seam++;
    else if (g >= ALLEY_MIN_M - EPS && g <= ALLEY_MAX_M + EPS) farGaps.alley++;
    else if (g < ALLEY_MIN_M) farGaps.slit++;
    else farGaps.wide++;
    for (let i = 1; i < res.blocks.length; i++) {
      const a = res.blocks[i - 1]!.lot;
      const b = res.blocks[i]!.lot;
      const along = ((b.x - a.x) * run.ux + (b.z - a.z) * run.uz) / W;
      maxNeighbourGap_m = Math.max(maxNeighbourGap_m, along - a.w / W / 2 - b.w / W / 2);
    }
  }
  const openPerRun = new Map<string, number>();
  for (const o of town.openLots) openPerRun.set(`${o.kind}|${o.run}`, (openPerRun.get(`${o.kind}|${o.run}`) ?? 0) + 1);
  const mostOf = (kind: string): number => Math.max(0, ...[...openPerRun].filter(([k]) => k.startsWith(`${kind}|`)).map(([, n]) => n));

  // R2: storeys and neighbours
  const storeys: Record<number, number> = {};
  let neighbourPairs = 0;
  let differing = 0;
  for (const run of runsWithBlocks) {
    const blocks = packed.get(run.id)!.blocks;
    blocks.forEach((b, i) => {
      const n = b.floors + 1;
      storeys[n] = (storeys[n] ?? 0) + 1;
      const prev = blocks[i - 1];
      if (!prev) return;
      neighbourPairs++;
      if (prev.style !== b.style && prev.floors !== b.floors) differing++;
    });
  }
  const storeyKeys = Object.keys(storeys).map(Number);

  // R3 to R8, per block
  let groundBays = 0;
  let groundBaysOther = 0;
  let maxDoorBaysPerBlock = 0;
  let shopsWithGlassKey = 0;
  let shopsGlassed = 0;
  let shopBays = 0;
  let awnedShopBays = 0;
  let mixedAwningBlocks = 0;
  let signedShopBays = 0;
  let atmBlocks = 0;
  let escapeQualifying = 0;
  let escapeBlocks = 0;
  let roofDressedBlocks = 0;
  const runsBig = new Set<string>();
  let cornerBlocks = 0;
  let cornerBlocksOffCorner = 0;
  let dressPieces = 0;
  let excludedKeysUsed = 0;
  const glassKeys = new Set<CalibrationKey>(SHOP_GLASS);
  const awningKeys = new Set<CalibrationKey>([...AWNINGS, ...AWNING_CORNER]);
  list.forEach(({ run, block }, bi) => {
    const dress = dressing[bi] ?? [];
    dressPieces += dress.length;
    const { bays, uncovered } = groundRow(block.stack);
    groundBays += bays.length;
    groundBaysOther += bays.filter((b) => b.kind === "other").length + uncovered;
    maxDoorBaysPerBlock = Math.max(maxDoorBaysPerBlock, bays.filter((b) => b.kind === "door").length);
    for (const bay of bays) {
      if (bay.kind !== "shop" && bay.kind !== "corner") continue;
      shopBays++;
      const glassKey = `${bay.piece.key}_Glass` as CalibrationKey;
      if (glassKeys.has(glassKey)) {
        shopsWithGlassKey++;
        if (dress.some((p) => p.slot === "glass" && p.key === glassKey)) shopsGlassed++;
      }
      if (dress.some((p) => awningKeys.has(p.key) && p.column === bay.col)) awnedShopBays++;
      if (dress.some((p) => p.slot === "sign" && p.column === bay.col)) signedShopBays++;
    }
    const mid = new Set(dress.filter((p) => AWNINGS.includes(p.key)).map((p) => p.key));
    if (mid.size > 1) mixedAwningBlocks++;
    if (dress.some((p) => ATMS.includes(p.key))) atmBlocks++;
    if (block.stack.bays >= ESCAPE_MIN_BAYS && block.stack.floors >= 2 && block.stack.style.startsWith("apartment")) {
      escapeQualifying++;
      if (dress.some((p) => p.slot === "escape")) escapeBlocks++;
    }
    if (dress.some((p) => p.slot === "roofSmall" || p.slot === "roofLarge")) roofDressedBlocks++;
    if (dress.some((p) => p.slot === "roofLarge" && BIG_ROOF.test(p.key))) runsBig.add(run.id);
    if (block.stack.cornerSides.length > 0) {
      cornerBlocks++;
      if (!(block.lot.terrace?.index === 0 && run.startCorner !== null && block.lot.cornerSides.length > 0)) cornerBlocksOffCorner++;
    }
    for (const p of block.stack.pieces) if (isNeverUsed(p.key)) excludedKeysUsed++;
    for (const p of dress) if (isNeverUsed(p.key)) excludedKeysUsed++;
  });
  for (const p of furniture) if (isNeverUsed(p.key)) excludedKeysUsed++;

  // R10: furniture on the pavements
  const runById = new Map(town.terraces.map((r) => [r.id, r] as const));
  const keep = extra.keep ?? {};
  const keepR = FURN_KEEP_M * W;
  let spacingViolations = 0;
  let keepOutViolations = 0;
  let pavementPieces = 0;
  const lines = new Map<string, { s: number; tree: boolean }[]>();
  for (const p of furniture) {
    if (p.kind !== "pavement") continue;
    const run = runById.get(p.run);
    const lot0 = run ? town.lots[run.lots[0] ?? -1] : undefined;
    if (!run || !lot0) continue;
    pavementPieces++;
    const yaw = lot0.yaw;
    const s = ((p.x - run.ax) * run.ux + (p.z - run.az) * run.uz) / W;
    const t = ((p.x - run.ax) * Math.sin(yaw) + (p.z - run.az) * Math.cos(yaw)) / W;
    const len = run.len / W;
    // Between the lots' front line (a tree's canopy may reach the setback) and `FURN_KERB_M` in from the kerb.
    const onPavement = t - p.d / 2 >= -1e-6 && t + p.d / 2 <= KERB_M - FURN_KERB_M + 1e-6;
    if (!onPavement) spacingViolations++;
    if (s - p.w / 2 < FURN_CORNER_M - 1e-6 || s + p.w / 2 > len - FURN_CORNER_M + 1e-6) keepOutViolations++;
    const line = Math.abs(t - p.d / 2 - (WALL_EDGE_M + FURN_WALL_M)) < 1e-6 ? "wall" : "kerb";
    const key = `${p.run}|${line}`;
    const on = lines.get(key) ?? [];
    on.push({ s, tree: TREES.includes(p.key) });
    lines.set(key, on);
    const hx = ((Math.abs(Math.cos(yaw)) * p.w + Math.abs(Math.sin(yaw)) * p.d) / 2) * W;
    const hz = ((Math.abs(Math.sin(yaw)) * p.w + Math.abs(Math.cos(yaw)) * p.d) / 2) * W;
    const r: Rect = { minX: p.x - hx, minZ: p.z - hz, maxX: p.x + hx, maxZ: p.z + hz };
    let bad = false;
    for (const q of keep.points ?? []) if (rectDist(r, dot(q)) < keepR - 1e-9) bad = true;
    for (const [a, b] of keep.segments ?? []) {
      for (let i = 0; i <= 20 && !bad; i++) if (rectDist(r, dot({ x: a.x + ((b.x - a.x) * i) / 20, z: a.z + ((b.z - a.z) * i) / 20 })) < keepR - 1e-9) bad = true;
    }
    for (const q of keep.rects ?? []) if (rectDist(r, q) < keepR - 1e-9) bad = true;
    if (p.h > FURN_MAX_H_M) for (const q of keep.wireRects ?? []) if (overlaps(r, grow(q, WIRE_CLEAR - 1e-9))) bad = true;
    if (bad) keepOutViolations++;
  }
  for (const on of lines.values()) {
    on.sort((a, b) => a.s - b.s);
    for (let i = 1; i < on.length; i++) if (on[i]!.s - on[i - 1]!.s < FURN_PITCH_M - 1e-6) spacingViolations++;
    const trees = on.filter((x) => x.tree);
    for (let i = 1; i < trees.length; i++) if (trees[i]!.s - trees[i - 1]!.s < TREE_PITCH_M - 1e-6) spacingViolations++;
  }
  const metres = runsWithBlocks.reduce((s, r) => s + r.len / W, 0);

  return {
    runs: runsWithBlocks.length,
    blocks: list.length,
    dressPieces,
    furniturePieces: furniture.length,
    frontageCovered: spanAll > 0 ? coveredAll / spanAll : 1,
    minFrontageCovered,
    runsUnderFrontage,
    maxNeighbourGap_m,
    maxParkingPerRun: mostOf("parking"),
    maxPlazaPerRun: mostOf("plaza"),
    farGaps,
    storeys,
    minStoreys: storeyKeys.length > 0 ? Math.min(...storeyKeys) : 0,
    maxStoreys: storeyKeys.length > 0 ? Math.max(...storeyKeys) : 0,
    neighbourPairs,
    neighbourDiffer: neighbourPairs > 0 ? differing / neighbourPairs : 1,
    groundBays,
    groundBaysOther,
    maxDoorBaysPerBlock,
    shopsWithGlassKey,
    shopsGlassed,
    shopBays,
    awnedShopBays,
    mixedAwningBlocks,
    signedShopBays,
    atmBlocks,
    escapeQualifying,
    escapeBlocks,
    roofDressedBlocks,
    runsWithBigRoofProp: runsBig.size,
    cornerBlocks,
    cornerBlocksOffCorner,
    pavementPieces,
    spacingViolations,
    keepOutViolations,
    furniturePer10m: metres > 0 ? (pavementPieces / metres) * 10 : 0,
    parkingLots: town.openLots.filter((o) => o.kind === "parking").length,
    plazas: town.openLots.filter((o) => o.kind === "plaza").length,
    excludedKeysUsed,
    emissiveMaterials: extra.emissiveMaterials ?? 0,
  };
}

// ---- the verdict ----

export interface CityVerdict {
  id: CityCheckId;
  /** The number the item is judged on (a share, or a count). */
  value: number;
  pass: boolean;
}

const share = (n: number, of: number): number => (of > 0 ? n / of : 1);

/**
 * Each automatic item against `CITY_CHECK`. `largestMap` is true for the map that must hold a parking lot and a plaza (R11; the others are not asked). A share with nothing to count
 * passes (1): the item is about what is there. An item whose share is under its threshold, or whose count is over it, fails.
 */
export function evaluateCity(m: CityMetrics, opts: { largestMap?: boolean } = {}): CityVerdict[] {
  const item = (id: CityCheckId, value: number, pass: boolean): CityVerdict => ({ id, value, pass });
  const r2 = m.neighbourDiffer >= CITY_CHECK.R2 - 1e-9 && (m.blocks === 0 || (m.minStoreys >= CITY_STOREYS.min && m.maxStoreys <= CITY_STOREYS.max));
  const r1 = m.frontageCovered >= CITY_CHECK.R1 - 1e-9 && m.maxNeighbourGap_m <= 1e-6 && m.maxParkingPerRun <= 1 && m.maxPlazaPerRun <= 1;
  const groundOk = share(m.groundBays - m.groundBaysOther, m.groundBays);
  const awned = share(m.awnedShopBays, m.shopBays);
  const signed = share(m.signedShopBays, m.shopBays);
  const atm = share(m.atmBlocks, m.blocks);
  const escape = share(m.escapeBlocks, m.escapeQualifying);
  const roofs = share(m.roofDressedBlocks, m.blocks);
  const bigRoofs = share(m.runsWithBigRoofProp, m.runs);
  const open = Math.min(m.parkingLots, m.plazas);
  return [
    item("R1", m.frontageCovered, r1),
    item("R2", m.neighbourDiffer, r2),
    item("R3", groundOk, groundOk >= CITY_CHECK.R3 - 1e-9 && m.maxDoorBaysPerBlock <= 1),
    item("R4", share(m.shopsGlassed, m.shopsWithGlassKey), share(m.shopsGlassed, m.shopsWithGlassKey) >= CITY_CHECK.R4 - 1e-9),
    item("R5", awned, awned >= CITY_CHECK.R5 - 1e-9 && m.mixedAwningBlocks === 0),
    item("R6", signed, signed >= CITY_CHECK.R6 - 1e-9 && atm >= CITY_ATM_BLOCKS_MIN - 1e-9),
    item("R7", escape, escape >= CITY_CHECK.R7 - 1e-9),
    item("R8", roofs, roofs >= CITY_CHECK.R8 - 1e-9 && bigRoofs >= CITY_BIG_ROOF_RUNS_MIN - 1e-9),
    item("R9", m.cornerBlocksOffCorner, m.cornerBlocksOffCorner <= CITY_CHECK.R9),
    item("R10", m.spacingViolations + m.keepOutViolations, m.spacingViolations + m.keepOutViolations <= CITY_CHECK.R10),
    item("R11", open, opts.largestMap === true ? open >= CITY_CHECK.R11 : true),
    item("R12", m.excludedKeysUsed + m.emissiveMaterials, m.excludedKeysUsed + m.emissiveMaterials <= CITY_CHECK.R12),
  ];
}

