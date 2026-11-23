/**
 * Test support for stage 12 (ticket 073 E2): the named cities run through the clean stages and the eras before the hold-out, once per test file. Imported by tests only, never by the stage.
 */
import type { CityEraPlan, CityEraRun, CityHistoryLayer } from "../../core";
import { deepFreeze } from "../pipeline/run";
import { sharedEra } from "../testing/namedcities";

export interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}

/** The 20 named runs: 6 x 6 seeds 1 to 10, one-way off and on. */
export const NAMED: readonly City[] = (["on", "off"] as const).flatMap((way) => Array.from({ length: 10 }, (_, n) => ({ blocksX: 6, blocksZ: 6, seed: n + 1, way })));
/** The four pin cities: 6 x 6 seeds 1, 2, 3 and 8, one-way on. */
export const PINNED: readonly City[] = [1, 2, 3, 8].map((seed) => ({ blocksX: 6, blocksZ: 6, seed, way: "on" as const }));
export const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;

/** The city run through the clean stages and the eras up to and including `era`. Throws on a failed stage, naming it. */
export function eraRun(o: City, era: "tech" | "holdout"): Extract<CityEraRun, { ok: true }> {
  const r = sharedEra(o, era);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  return r;
}

/** The plan the hold-out reads: the clean stages, history, and the tech era's layer when that pass is registered. */
export const beforeHoldout = (o: City): CityEraPlan => eraRun(o, "tech").plan;

/** The same plan with every district's `held` replaced (the districts and their blocks are kept). */
export function withHeld(plan: CityEraPlan, held: (index: number) => number): CityEraPlan {
  const h = plan.layers.history!;
  const history: CityHistoryLayer = { stage: "history", districts: h.districts.map((d, n) => ({ ...d, held: held(n) })) };
  return deepFreeze({ plan: plan.plan, layers: { ...plan.layers, history }, digests: plan.digests });
}

/**
 * The barricade lines that do not lie across their street: for each line (its walls, by the arm in their ids) the street the arm runs along is the junction's street on the arm's axis; every wall's long axis must be
 * perpendicular to that street's direction, and the walls together must span its carriageway. Returns one text a fault; empty when every line is across its street. Also reports the numbers it judged.
 */
export function acrossProblems(plan: CityEraPlan, layer: { readonly adds: readonly { readonly id: string; readonly kind: string; readonly size: { readonly x_m: number; readonly z_m: number } ; readonly placement: { readonly x_m: number; readonly z_m: number } }[] }): { problems: string[]; lines: number; xStreets: number; zStreets: number } {
  const streets = plan.plan.layers.streets!;
  const junctions = new Map(streets.junctions.map((j) => [j.id, j] as const));
  const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
  const lines = new Map<string, { x0: number; x1: number; z0: number; z1: number; n: number }>();
  const problems: string[] = [];
  for (const a of layer.adds) {
    if (a.kind !== "barricade") continue;
    const m = /^holdout:barricade:(junction:\d+:\d+)\|([+-])([xz]):\d+$/.exec(a.id);
    if (m === null) {
      problems.push(`${a.id}: not a barricade id`);
      continue;
    }
    const key = `${m[1]}|${m[2]}${m[3]}`;
    const axis = m[3]!;
    const longX = a.size.x_m > a.size.z_m;
    // a street along x is crossed by a wall that is long along z, and a street along z by one long along x
    if ((axis === "x") === longX) problems.push(`${a.id}: a wall on a street along ${axis} is long along ${longX ? "x" : "z"}`);
    const r = lines.get(key) ?? { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, n: 0 };
    r.x0 = Math.min(r.x0, a.placement.x_m - a.size.x_m / 2);
    r.x1 = Math.max(r.x1, a.placement.x_m + a.size.x_m / 2);
    r.z0 = Math.min(r.z0, a.placement.z_m - a.size.z_m / 2);
    r.z1 = Math.max(r.z1, a.placement.z_m + a.size.z_m / 2);
    r.n++;
    lines.set(key, r);
  }
  let xStreets = 0;
  let zStreets = 0;
  for (const [key, r] of lines) {
    const [jid, arm] = key.split("|") as [string, string];
    const j = junctions.get(jid)!;
    const street = j.streets.map((s) => byId.get(s.street)!).find((s) => s.axis === arm[1]);
    if (street === undefined) {
      problems.push(`${key}: the junction has no street on the arm's axis`);
      continue;
    }
    const lo = street.axis === "x" ? r.z0 : r.x0;
    const hi = street.axis === "x" ? r.z1 : r.x1;
    if (street.axis === "x") xStreets++;
    else zStreets++;
    if (lo > street.carriage.lo_m + 1e-6 || hi < street.carriage.hi_m - 1e-6) problems.push(`${key}: the walls span ${lo} to ${hi}, not the carriageway ${street.carriage.lo_m} to ${street.carriage.hi_m}`);
  }
  return { problems, lines: lines.size, xStreets, zStreets };
}
