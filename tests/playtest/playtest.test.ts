/**
 * The playtest harness (ticket 036): every ladder map replayed headlessly to the Relight, its trace compared with the one
 * committed from main. Run it with `npm run playtest`. See README.md.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ladderIds, loadMap, readmeMins, ROOT } from "./ladder";
import { replay } from "./replay";
import { SOLUTIONS } from "./solutions";

const IDS = ladderIds();
const MINS = readmeMins();
const SNAPSHOTS = join(ROOT, "tests", "playtest", "__snapshots__");

/**
 * Maps whose drawing passes a non-finite number to the canvas on the base, with how many. Empty: none does.
 * If a map ever needs an entry here, name it in README.md and in the ticket's report; the test fails if the count grows.
 */
const KNOWN_NONFINITE: Readonly<Record<string, number>> = {};

const numberOf = (id: string): string => id.slice(0, 2);
const movesOf = (id: string): readonly string[] => SOLUTIONS[id] ?? [];

describe("scripts", () => {
  it("every ladder map has a script and every script names a ladder map", () => {
    const missing = IDS.filter((id) => !(id in SOLUTIONS));
    const orphans = Object.keys(SOLUTIONS).filter((id) => !IDS.includes(id));
    expect.soft(missing, `maps with no script in solutions.ts: ${missing.join(", ")}`).toEqual([]);
    expect.soft(orphans, `scripts in solutions.ts that name no map in puzzles/: ${orphans.join(", ")}`).toEqual([]);
    expect(IDS.length, "the ladder is 64 maps").toBe(64);
  });

  it("the README gives a Min clicks for every ladder map", () => {
    const missing = IDS.filter((id) => !MINS.min.has(numberOf(id)));
    expect(missing, `maps with no row in puzzles/README.md: ${missing.join(", ")}`).toEqual([]);
    expect([...MINS.fromNote].sort(), "the maps whose min the README takes from their notes").toEqual(["49", "54"]);
  });
});

describe.each(IDS)("%s", (id) => {
  const moves = movesOf(id);
  const min = MINS.min.get(numberOf(id));
  const options = { min, minFromNote: MINS.fromNote.has(numberOf(id)) };

  it("replays to the Relight and matches its trace", async () => {
    expect(id in SOLUTIONS, `${id}: no script in tests/playtest/solutions.ts`).toBe(true);
    const puzzle = loadMap(id);
    const run = replay(puzzle, moves, options);

    // Soft, so the trace diff below still prints when a script stops short.
    expect.soft(run.failure, `${id}: move ${run.failure?.step} "${run.failure?.move}" failed: ${run.failure?.message}`).toBeNull();
    expect.soft(run.complete, `${id}: the script did not complete the job`).toBe(true);
    if (min !== undefined)
      expect.soft(run.clicks, `${id}: the script takes ${run.clicks} clicks, more than the README's min of ${min}`).toBeLessThanOrEqual(min);
    if (run.locked)
      expect.soft(run.locked.ok, `${id}: the Relight let something through: ${run.locked.problems.join("; ")}`).toBe(true);

    // Deterministic: a second run, with everything fresh, gives the same trace.
    expect(replay(puzzle, moves, options).trace, `${id}: two runs differ`).toBe(run.trace);

    await expect(run.trace).toMatchFileSnapshot(join(SNAPSHOTS, `${id}.trace.txt`));
  }, 20_000);

  it("draws every frame without throwing", () => {
    const run = replay(loadMap(id), moves, { ...options, draw: true });
    expect(run.draw, `${id}: no draw result`).not.toBeNull();
    const draw = run.draw!;
    const known = KNOWN_NONFINITE[id] ?? 0;
    // One frame at the start, one per move, three in the Relight (only when the script wins; a broken script is reported by the other test).
    if (run.complete) expect(draw.frames, `${id}: frames drawn`).toBeGreaterThanOrEqual(moves.length + 1 + 3);
    expect(draw.calls, `${id}: the canvas saw no drawing at all`).toBeGreaterThan(0);
    expect(draw.nonFinite, `${id}: non-finite numbers passed to the canvas (pinned at ${known})`).toBeLessThanOrEqual(known);
  }, 60_000);
});
