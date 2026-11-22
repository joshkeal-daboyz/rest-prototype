/**
 * The resolver (ticket 073, section C1): `resolvePlan(plan, era)` turns an era plan into the plan as it stands at that era. It meets the contract in `src/core/cityera.ts`.
 * Pure: no layer is mutated. A layer that no change touches is shared with the clean plan, not copied; a changed list is a new frozen array.
 * Imports `src/core/` only (no stage folder).
 */

import {
  CITY_ERAS,
  CITY_KEYLESS_PIECE_LISTS,
  CITY_PIECE_LISTS,
  type CalibrationKey,
  type CityChange,
  type CityEra,
  type CityEraPiece,
  type CityEraPlan,
  type CityPassStage,
  type CityPieceList,
  type CityPieceRef,
  type CityPieceState,
  type CityPlan,
  type CityResolveFailure,
  type CityResolveFailureKind,
  type CityResolvedPlan,
  type CityResolvedState,
} from "../../core";

/** Thrown when a change cannot be applied. Carries the `CityResolveFailure`: the stage whose change it is, the change's index, the kind and the reason. */
export class CityResolveError extends Error {
  readonly failure: CityResolveFailure;
  constructor(failure: CityResolveFailure) {
    super(`resolve: ${failure.stage} change ${failure.change} (${failure.kind}): ${failure.reason}`);
    this.name = "CityResolveError";
    this.failure = failure;
  }
}

/** The passes in the order their changes apply. */
export const PASS_ORDER: readonly CityPassStage[] = ["tech", "holdout", "ruin"];

/** Where each list lives in the clean layers. */
const LIST_AT: Readonly<Record<CityPieceList, readonly [layer: string, field: string]>> = {
  "edge.ground": ["edge", "ground"],
  "edge.buildoutTrees": ["edge", "buildoutTrees"],
  "buildings.pieces": ["buildings", "columns"],
  "facades.ground": ["facades", "ground"],
  "facades.dressing": ["facades", "dressing"],
  "facades.walls": ["facades", "walls"],
  "facades.roofs": ["facades", "roofs"],
  "facades.novelty": ["facades", "novelty"],
  "ground.props": ["ground", "props"],
  "traffic.pieces": ["traffic", "pieces"],
};

interface Entry {
  /** The piece as its stage wrote it, or an era add. */
  item: unknown;
  /** Its key as it stands now (null in a keyless list). */
  key: CalibrationKey | null;
  swapped: boolean;
  /** The pass that removed it, or null. */
  removedBy: CityPassStage | null;
  state: { readonly state: CityPieceState; readonly stage: CityPassStage } | null;
}

/** An era add, with the stage that wrote it. */
interface AddEntry extends Entry {
  readonly stage: CityPassStage;
}

const keyOf = (item: unknown): CalibrationKey => (item as { placement: { key: CalibrationKey } }).placement.key;
const withKey = (item: unknown, key: CalibrationKey): unknown => {
  const p = (item as { placement: object }).placement;
  return { ...(item as object), placement: { ...p, key } };
};
const isKeyless = (list: CityPieceList): boolean => (CITY_KEYLESS_PIECE_LISTS as readonly string[]).includes(list);

/** Which pieces of a resolved plan a swap changed: read by the T-1 check (`readable.ts`), which judges a swapped piece at its new key's bounds. A side table, so `CityResolvedPlan` (core) is untouched. */
export type ResolvedSwap = { readonly list: CityPieceList; readonly column?: number; readonly index: number } | { readonly id: string };
const traces = new WeakMap<CityResolvedPlan, readonly ResolvedSwap[]>();
/** The pieces a resolve swapped, by their place in the resolved plan (empty for a plan not made by `resolvePlan`). */
export const swappedOf = (resolved: CityResolvedPlan): readonly ResolvedSwap[] => traces.get(resolved) ?? [];

/**
 * The plan at `era` (contract in `src/core/cityera.ts`). "clean" is the plan itself. Above it: the clean layers with every remove and swap applied in stage order, then list order; each pass's adds up to
 * the era (a pass whose layer is absent adds nothing); each stated piece in `states`. The digests are the clean plan's (the lists a change touched no longer match their digest).
 * Throws `CityResolveError` on a failure: "missing", "key", "twice", "removed" or "keyless", checked in that order for a change.
 */
export function resolvePlan(eraPlan: CityEraPlan, era: CityEra): CityResolvedPlan {
  const upto = CITY_ERAS.indexOf(era);
  if (upto <= 0) return Object.freeze({ era, plan: eraPlan.plan, history: null, adds: Object.freeze({}), states: Object.freeze([]) });
  const clean = eraPlan.plan;
  const included = PASS_ORDER.slice(0, upto);

  const lists = new Map<CityPieceList, Entry[]>();
  const columns: Entry[][] = [];
  const entriesOf = (list: Exclude<CityPieceList, "buildings.pieces">): Entry[] | undefined => {
    if (!lists.has(list)) {
      const [layer, field] = LIST_AT[list];
      const raw = ((clean.layers as Record<string, Record<string, unknown> | undefined>)[layer]?.[field] ?? undefined) as readonly unknown[] | undefined;
      if (raw === undefined) return undefined;
      lists.set(list, raw.map((item) => ({ item, key: isKeyless(list) ? null : keyOf(item), swapped: false, removedBy: null, state: null })));
    }
    return lists.get(list);
  };
  const columnEntries = (column: number): Entry[] | undefined => {
    if (columns[column] === undefined) {
      const cols = clean.layers.buildings?.columns;
      const col = cols?.[column];
      if (col === undefined) return undefined;
      columns[column] = col.pieces.map((item) => ({ item, key: keyOf(item), swapped: false, removedBy: null, state: null }));
    }
    return columns[column];
  };

  const adds = new Map<string, AddEntry>();
  const addsByStage = new Map<CityPassStage, AddEntry[]>();

  for (const stage of included) {
    const layer = eraPlan.layers[stage];
    if (layer === undefined) continue;
    const touched = new Set<Entry>();
    layer.changes.forEach((change: CityChange, n: number) => {
      const ref = change.ref;
      const fail = (kind: CityResolveFailureKind, reason: string): never => {
        throw new CityResolveError({ stage, change: n, kind, ref, reason });
      };
      let target: Entry | undefined;
      let list: CityPieceList | null = null;
      if ("id" in ref) {
        target = adds.get(ref.id);
        if (target === undefined) return fail("missing", `no piece with id "${ref.id}" among the earlier eras' adds`);
      } else if (ref.list === "buildings.pieces") {
        list = ref.list;
        target = columnEntries(ref.column)?.[ref.index];
        if (target === undefined) return fail("missing", `buildings.pieces: no piece ${ref.index} in column ${ref.column}`);
      } else {
        list = ref.list;
        const all = entriesOf(ref.list);
        if (all === undefined) return fail("missing", `${ref.list}: the layer holds no such list`);
        target = all[ref.index];
        if (target === undefined) return fail("missing", `${ref.list}: no piece at index ${ref.index} (the list has ${all.length})`);
      }
      if (target.removedBy !== null && target.removedBy !== stage) return fail("removed", `the piece was removed by ${target.removedBy}`);
      if (touched.has(target)) return fail("twice", "this layer already changes that piece");
      if (change.op === "swap" && list !== null && isKeyless(list)) return fail("keyless", `${list} records carry no key to swap`);
      if (!("id" in ref)) {
        const guard = ref.key;
        if (guard !== target.key) return fail("key", `the guard says ${String(guard)} but the piece's key is ${String(target.key)}`);
      }
      touched.add(target);
      if (change.op === "remove") {
        target.removedBy = stage;
        target.state = null;
      } else if (change.op === "swap") {
        target.key = change.key;
        target.item = withKey(target.item, change.key);
        target.swapped = true;
      } else {
        target.state = { state: change.state, stage };
      }
    });
    // This layer's adds become reachable by later layers only.
    const mine: AddEntry[] = (layer.adds as readonly CityEraPiece[]).map((item) => ({ item, key: item.placement.key, swapped: false, removedBy: null, state: null, stage }));
    for (const a of mine) adds.set((a.item as CityEraPiece).id, a);
    addsByStage.set(stage, mine);
  }

  // ---- build the resolved layers and the states ----
  const states: CityResolvedState[] = [];
  const swapped: ResolvedSwap[] = [];
  const layers: Record<string, Record<string, unknown>> = {};
  const layerOf = (name: string): Record<string, unknown> => (layers[name] ??= { ...((clean.layers as Record<string, Record<string, unknown>>)[name] ?? {}) });
  let changedAny = false;

  for (const list of CITY_PIECE_LISTS) {
    const [layerName, field] = LIST_AT[list];
    if (list === "buildings.pieces") {
      const cols = clean.layers.buildings?.columns;
      if (cols === undefined) continue;
      let newCols: unknown[] | null = null;
      columns.forEach((entries, c) => {
        if (entries === undefined || !entries.some((e) => e.removedBy !== null || e.swapped || e.state !== null)) return;
        const kept: unknown[] = [];
        for (const e of entries) {
          if (e.removedBy !== null) continue;
          const index = kept.length;
          kept.push(e.item);
          if (e.swapped) swapped.push({ list, column: c, index });
          if (e.state !== null) states.push({ target: { list, column: c, index, key: e.key as CalibrationKey }, state: e.state.state, stage: e.state.stage });
        }
        newCols ??= [...cols];
        newCols[c] = Object.freeze({ ...cols[c]!, pieces: Object.freeze(kept) });
      });
      if (newCols !== null) {
        layerOf(layerName)[field] = Object.freeze(newCols);
        changedAny = true;
      }
      continue;
    }
    const entries = lists.get(list);
    if (entries === undefined || !entries.some((e) => e.removedBy !== null || e.swapped || e.state !== null)) continue;
    const kept: unknown[] = [];
    for (const e of entries) {
      if (e.removedBy !== null) continue;
      const index = kept.length;
      kept.push(e.item);
      if (e.swapped) swapped.push({ list, index });
      if (e.state !== null) states.push({ target: { list, index, key: e.key } as CityPieceRef, state: e.state.state, stage: e.state.stage });
    }
    layerOf(layerName)[field] = Object.freeze(kept);
    changedAny = true;
  }

  const addsOut: { tech?: readonly CityEraPiece[]; holdout?: readonly CityEraPiece[]; ruin?: readonly CityEraPiece[] } = {};
  for (const stage of included) {
    const mine = addsByStage.get(stage);
    if (mine === undefined) continue;
    const kept: CityEraPiece[] = [];
    for (const a of mine) {
      if (a.removedBy !== null) continue;
      const item = a.item as CityEraPiece;
      kept.push(item);
      if (a.swapped) swapped.push({ id: item.id });
      if (a.state !== null) states.push({ target: { id: item.id }, state: a.state.state, stage: a.state.stage });
    }
    addsOut[stage] = Object.freeze(kept);
  }

  const plan: CityPlan = changedAny ? { ...clean, layers: { ...clean.layers, ...Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, Object.freeze(v)])) } } : clean;
  const resolved: CityResolvedPlan = Object.freeze({
    era,
    plan: changedAny ? Object.freeze(plan) : plan,
    history: eraPlan.layers.history ?? null,
    adds: Object.freeze(addsOut),
    states: Object.freeze(states),
  });
  traces.set(resolved, Object.freeze(swapped));
  return resolved;
}
