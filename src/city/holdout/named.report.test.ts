/**
 * Ticket 073 E2, criterion 10, the numbers (reported, not asserted), moved here by ticket 079. It builds its own runs over every named city through the era runner (this file runs only with `npm run report`, which sets REST_CITIES=all).
 */
import { describe, expect, it } from "vitest";
import type { CityHoldoutLayer, CityHoldoutPieceKind } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { buildHoldout, stepPart } from "./stage";
import { NAMED, eraRun, type City } from "./testcities";

interface Run {
  readonly city: City;
  readonly layer: CityHoldoutLayer;
  readonly stats: ReturnType<typeof buildHoldout>;
  readonly ms: number;
  readonly held: { readonly heldBuildings: number };
  readonly closed: { readonly settle: number; readonly barricade: number };
  readonly parks: number;
}

/** One named run: the era run, then the stage alone for its stats and time. */
function runOf(c: City): Run {
  const run = eraRun(c, "holdout");
  const layer = run.plan.layers.holdout!;
  const before = { plan: run.plan.plan, layers: { history: run.plan.layers.history!, ...(run.plan.layers.tech === undefined ? {} : { tech: run.plan.layers.tech }) }, digests: {} };
  const t = performance.now();
  const stats = buildHoldout(before, stageRand("holdout", c.seed));
  const ms = performance.now() - t;
  const L = run.plan.plan.layers;
  const heldDistricts = new Set(run.plan.layers.history!.districts.filter((d) => d.held > 0).flatMap((d) => d.blocks));
  const heldBuildings = (L.buildings?.buildings ?? []).filter((b) => heldDistricts.has(b.block)).length;
  const streets = L.streets!;
  const closedBy = (adds: CityHoldoutLayer["adds"]): number => {
    const hit = new Set<number>();
    for (const cell of streets.cells) {
      const cx = (cell.i + 0.5) * 5;
      const cz = (cell.j + 0.5) * 5;
      if (adds.some((a) => a.placement.y_m < 2 && Math.abs(cx - a.placement.x_m) <= a.size.x_m / 2 && Math.abs(cz - a.placement.z_m) <= a.size.z_m / 2)) hit.add(cell.j * streets.w + cell.i);
    }
    return hit.size;
  };
  return {
    city: c,
    layer,
    stats,
    ms,
    held: { heldBuildings },
    closed: { settle: closedBy(stepPart(layer, "settle").adds), barricade: closedBy(stepPart(layer, "barricade").adds) },
    parks: (L.mass?.openings ?? []).filter((o) => o.kind === "park").length,
  };
}

describe("criterion 10: the numbers (reported, not asserted)", { timeout: 900_000 }, () => {
  it("prints the pieces by kind, the keys, the removes, the skipped mouths, the closed cells and the time per city", () => {
    const runs = NAMED.map(runOf);
    const range = (xs: number[]): string => `${Math.min(...xs)} to ${Math.max(...xs)}`;
    const total = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
    const kinds: CityHoldoutPieceKind[] = ["camp", "water-tower", "farm", "irrigator", "stall", "container", "clutter", "roof", "barricade"];
    const count = (r: Run, k: CityHoldoutPieceKind): number => r.layer.adds.filter((a) => a.kind === k).length;
    const lines: string[] = [];
    lines.push(`pieces a city: ${range(runs.map((r) => r.layer.adds.length))} (total ${total(runs.map((r) => r.layer.adds.length))})`);
    lines.push(`distinct keys: ${range(runs.map((r) => new Set(r.layer.adds.map((a) => a.placement.key)).size))}`);
    for (const k of kinds) lines.push(`${k}: ${range(runs.map((r) => count(r, k)))} (total ${total(runs.map((r) => count(r, k)))})`);
    lines.push(`parks a city / farm parks / their removes: ${range(runs.map((r) => r.parks))} / ${range(runs.map((r) => r.stats.settle.farmParksFilled))} / ${range(runs.map((r) => r.stats.settle.farmRemoves))}`);
    lines.push(`stall places / removes: ${range(runs.map((r) => r.stats.settle.stallPlaces))} / ${range(runs.map((r) => r.stats.settle.stallRemoves))}`);
    lines.push(`containers rolled with no room: ${range(runs.map((r) => r.stats.settle.containersNoRoom))}`);
    lines.push(`clutter rolled with no room: ${range(runs.map((r) => r.stats.settle.clutterNoRoom))}`);
    lines.push(`roof items per held building: ${runs.map((r) => (count(r, "roof") / Math.max(1, r.held.heldBuildings)).toFixed(2)).join(" ")}`);
    lines.push(`roof spots rolled with no room: ${range(runs.map((r) => r.stats.settle.roofNoRoom))}`);
    lines.push(`camp places offered / filled: ${range(runs.map((r) => r.stats.settle.campPlaces))} / ${range(runs.map((r) => r.stats.settle.campPlacesFilled))}`);
    lines.push(`barricade lines (placed): ${range(runs.map((r) => r.stats.barricade.placed))}; walls: ${range(runs.map((r) => count(r, "barricade")))}; walls a line: ${range(runs.map((r) => r.stats.barricade.wallsMin))} to ${Math.max(...runs.map((r) => r.stats.barricade.wallsMax))}`);
    lines.push(`street mouths of districts at the barricade band / candidates: ${range(runs.map((r) => r.stats.barricade.mouths))} / ${range(runs.map((r) => r.stats.barricade.candidates))}`);
    lines.push(`mouths option C skipped: T-1 ${range(runs.map((r) => r.stats.barricade.skippedT1))}, T-2 ${range(runs.map((r) => r.stats.barricade.skippedT2))} (no circuit on the named runs until K2: so none); skipped for overlap ${range(runs.map((r) => r.stats.barricade.skippedOverlap))}; arm already taken ${range(runs.map((r) => r.stats.barricade.skippedTaken))}`);
    lines.push(`stage 9 pieces removed by barricades: ${range(runs.map((r) => r.stats.barricade.trafficRemoves))} (total ${total(runs.map((r) => r.stats.barricade.trafficRemoves))})`);
    lines.push(`street cells closed by ground pieces: settle ${range(runs.map((r) => r.closed.settle))}; barricades ${range(runs.map((r) => r.closed.barricade))}`);
    lines.push(`time a city (the stage alone): ${range(runs.map((r) => Math.round(r.ms)))} ms`);
    console.info(`E2 numbers\n${lines.join("\n")}`);
    expect(lines.length).toBeGreaterThan(10);
  });
});
