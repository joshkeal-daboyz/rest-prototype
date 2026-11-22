/**
 * Ticket 073 B, criterion 6: the numbers, reported and not asserted (beside the B pre-check's sketch). Printed with console.info; the only assertion is that the report was made.
 */
import { describe, expect, it } from "vitest";
import { historyHash, sizeOf } from "./districts";
import { stepsFrom } from "./stories";
import { historyStage } from "./stage";
import { NAMED, label, planOf } from "./testcities";

const quartile = (xs: number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

describe("criterion 6: the numbers (reported)", { timeout: 120_000 }, () => {
  it("prints the districts, the stories and the time per city", () => {
    const lines: string[] = [];
    const sizes = [0, 0, 0, 0];
    let total = 0;
    let singles = 0;
    const perRun: number[] = [];
    const singlesRun: number[] = [];
    const zeroHeld: number[] = [];
    const tech: number[] = [];
    const held: number[] = [];
    const wild: number[] = [];
    const stepSum = new Map<number, { sum: number; n: number }>();
    for (const c of NAMED) {
      const plan = planOf(c);
      const seed = plan.options.seed;
      const blocks = plan.layers.streets!.blocks;
      const layer = historyStage.run(plan);
      perRun.push(layer.districts.length);
      total += layer.districts.length;
      let s = 0;
      let z = 0;
      const rank = [...blocks].sort((a, b) => historyHash(seed, "order", a.id) - historyHash(seed, "order", b.id));
      for (const d of layer.districts) {
        sizes[d.blocks.length - 1]!++;
        const start = rank.find((b) => d.blocks.includes(b.id))!;
        if (d.blocks.length === 1 && sizeOf(seed, start.id) > 1) s++;
        if (d.held === 0) z++;
        tech.push(d.tech);
        held.push(d.held);
        wild.push(d.wild);
      }
      singles += s;
      singlesRun.push(s);
      zeroHeld.push(z);
      const centre = layer.districts.find((d) => d.blocks.includes(rank.find((b) => Object.values(b.sides).every((x) => x.across.length > 0))!.id))!;
      const steps = stepsFrom(blocks, centre.blocks);
      for (const d of layer.districts) {
        const step = Math.min(...d.blocks.map((b) => steps.get(b)!));
        const e = stepSum.get(step) ?? { sum: 0, n: 0 };
        stepSum.set(step, { sum: e.sum + d.tech, n: e.n + 1 });
      }
    }
    const range = (xs: number[]): string => `${Math.min(...xs)} to ${Math.max(...xs)}`;
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    const mh = mean(held);
    const mw = mean(wild);
    const r = held.reduce((a, h, k) => a + (h - mh) * (wild[k]! - mw), 0) / Math.sqrt(held.reduce((a, h) => a + (h - mh) ** 2, 0) * wild.reduce((a, w) => a + (w - mw) ** 2, 0));
    lines.push(`districts a run ${range(perRun)}, ${total} in all over ${NAMED.length} runs`);
    lines.push(`sizes 1/2/3/4: ${sizes.join(" / ")}`);
    lines.push(`singles whose hashed size was 2 to 4 but no neighbour was free: ${range(singlesRun)} a run (${singles} in all)`);
    lines.push(`tech median ${quartile(tech, 0.5)}, quartiles ${quartile(tech, 0.25)} / ${quartile(tech, 0.75)}, range ${Math.min(...tech)} to ${Math.max(...tech)}`);
    lines.push(`held median ${quartile(held, 0.5)}, range ${Math.min(...held)} to ${Math.max(...held)}; held 0 on ${range(zeroHeld)} districts a run (${zeroHeld.reduce((a, b) => a + b, 0)} in all)`);
    lines.push(`wild median ${quartile(wild, 0.5)}, quartiles ${quartile(wild, 0.25)} / ${quartile(wild, 0.75)}; wild against held r = ${r.toFixed(2)}`);
    lines.push(`mean tech per step: ${[...stepSum.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}: ${(v.sum / v.n).toFixed(2)} (${v.n})`).join(", ")}`);
    const plan = planOf(NAMED[0]!);
    const t0 = performance.now();
    for (let k = 0; k < 50; k++) historyStage.run(plan);
    lines.push(`time per city (${label(NAMED[0]!)}, mean of 50): ${((performance.now() - t0) / 50).toFixed(2)} ms`);
    console.info(`\n073 B numbers\n${lines.join("\n")}`);
    expect(total).toBeGreaterThan(0);
  });
});
