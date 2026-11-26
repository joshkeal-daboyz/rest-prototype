/**
 * The playtest harness (ticket 036, retargeted by 081 R1): every city puzzle replayed headlessly to the Relight through the
 * conversion, its trace compared with the one committed at the last release. Run it with `npm run playtest`. See README.md.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cityIds, loadCityMap, ROOT } from "./ladder";
import { replay } from "./replay";

const IDS = cityIds();
const SNAPSHOTS = join(ROOT, "tests", "playtest", "__snapshots__");

describe("scripts", () => {
  it("every city puzzle has a check block that parses and holds on its conversion", () => {
    const problems = IDS.map((id) => [id, loadCityMap(id).problem] as const).filter(([, p]) => p !== null);
    expect(problems.map(([id, p]) => `${id}: ${p}`)).toEqual([]);
    expect(IDS.length, "no city puzzles under puzzles/city/").toBeGreaterThan(0);
    // The series stages run s01..sMax with no gap and no repeat. Pilots, city-two-ways-round and tb- puzzles are not counted.
    const seen = new Map<number, number>();
    for (const id of IDS) {
      const m = /^s(\d\d)-/.exec(id);
      if (m) seen.set(Number(m[1]), (seen.get(Number(m[1])) ?? 0) + 1);
    }
    const top = Math.max(0, ...seen.keys());
    const missing = Array.from({ length: top }, (_, i) => i + 1).filter((n) => !seen.has(n));
    const doubled = [...seen].filter(([, c]) => c > 1).map(([n]) => n);
    const pad = (n: number) => `s${String(n).padStart(2, "0")}`;
    expect(
      { missing: missing.map(pad), doubled: doubled.map(pad) },
      "the sNN- series ids must run from s01 to the highest with no gap and no number used twice",
    ).toEqual({ missing: [], doubled: [] });
  }, 120_000);
});

describe.each(IDS)("%s", (id) => {
  it("replays the solution and each trap to the Relight and matches its trace", async () => {
    const map = loadCityMap(id);
    expect(map.check, `${id}: ${map.problem}`).not.toBeNull();
    const check = map.check!;
    const run = (moves: readonly string[], label: string) => replay(map.puzzle, moves, { hidden: map.hidden, label });

    const solution = run(check.solution, `${id} solution`);
    // Soft, so the trace diff below still prints when a script stops short.
    expect.soft(solution.failure, `${id}: move ${solution.failure?.step} "${solution.failure?.move}" failed: ${solution.failure?.message}`).toBeNull();
    expect.soft(solution.complete, `${id}: the solution did not complete the job`).toBe(true);
    if (solution.locked) expect.soft(solution.locked.ok, `${id}: the Relight let something through: ${solution.locked.problems.join("; ")}`).toBe(true);

    // Each trap's moves, then its recovery, as one script: the recovery must still win.
    const traps = (check.traps ?? []).map((t) => {
      const r = run([...t.moves, ...t.recover], `${id} trap: ${t.name}`);
      expect.soft(r.failure, `${id} trap "${t.name}": move ${r.failure?.step} "${r.failure?.move}" failed: ${r.failure?.message}`).toBeNull();
      expect.soft(r.complete, `${id} trap "${t.name}": the recovery did not complete the job`).toBe(true);
      return r;
    });
    const trace = [solution, ...traps].map((r) => r.trace).join("\n");

    // Deterministic: a second run, with everything fresh, gives the same trace.
    const again = [run(check.solution, `${id} solution`), ...(check.traps ?? []).map((t) => run([...t.moves, ...t.recover], `${id} trap: ${t.name}`))];
    expect(again.map((r) => r.trace).join("\n"), `${id}: two runs differ`).toBe(trace);

    await expect(trace).toMatchFileSnapshot(join(SNAPSHOTS, `${id}.trace.txt`));
  }, 60_000);
});
