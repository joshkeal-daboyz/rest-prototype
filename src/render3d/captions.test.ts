import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { EventBus, loadPuzzle, puzzleFeeds, type Puzzle } from "../core";
import { createGrid } from "../grid";
import { createFeedCaptions } from "../render/feedcaps";
import { fuseCaption, lampCaption } from "../render/labels";
import { BREAKER_OFF, BREAKER_ON, captionsFor, captionTextPx, scaleForPx } from "./captions";

const load = (id: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(`puzzles/${id}.json`, "utf8")));
const puzzle = load("09-shrine-circuit");

function words(g: ReturnType<typeof createGrid>, p: Puzzle = puzzle) {
  return captionsFor(p).update(g.state());
}

describe("captionsFor, Shrine circuit", () => {
  const fresh = () => createGrid(puzzle, new EventBus());

  it("start", () => {
    const c = words(fresh());
    expect(c.get("feed")).toMatchObject({ lines: ["Lv4 Powersource", "using 3 of 4"], tone: "text" });
    expect(c.get("br_main")!.lines).toEqual(["ON"]);
    expect(c.get("br_street")!.lines).toEqual(["ON"]);
    expect(c.get("fb_A")).toMatchObject({ lines: ["Lv3 Fuse"], fill: 1, step: 2, ticks: 2, blown: false });
    for (const id of ["street_1", "street_2", "street_3", "shrine"]) expect(c.get(id)!.lines).toEqual(["Lv1 Lamp"]);
    expect(c.get("flood")!.lines).toEqual(["Lv2 Lamp"]);
    expect(c.get("shrine")).toMatchObject({ target: true, lit: false, place: "shrine" });
    for (const id of ["street_1", "street_2", "street_3", "flood"]) expect(c.get(id)).toMatchObject({ target: false, place: null });
    expect(c.get("sw_1")).toMatchObject({ lines: [], selectedLine: "l_a" });
    for (const id of ["j1", "j2", "j4", "j5", "j_dead"]) expect(c.get(id)!.lines).toEqual([]);
  });

  it("after sw_1 the lever feeds l_b; the feed and fuse read the same", () => {
    const g = fresh();
    g.throwSwitch("sw_1");
    const c = words(g);
    expect(c.get("sw_1")!.selectedLine).toBe("l_b");
    expect(c.get("feed")!.lines[1]).toBe("using 3 of 4");
    expect(c.get("fb_A")).toMatchObject({ fill: 1, step: 2 });
  });

  it("brownout after repair:l_b: the feed alarms, every lamp is lit", () => {
    const g = fresh();
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    const c = words(g);
    expect(c.get("feed")).toMatchObject({ lines: ["Lv4 Powersource", "! using 6 of 4 !"], tone: "alarm" });
    for (const n of puzzle.nodes.filter((x) => x.type === "lamp")) expect(c.get(n.id)!.lit, n.id).toBe(true);
  });

  it("won after br_street: breaker OFF and dim, fuse empty, shrine and flood lit", () => {
    const g = fresh();
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    const c = words(g);
    expect(c.get("br_street")).toMatchObject({ lines: ["OFF"], tone: "dim" });
    expect(c.get("br_main")!.lines).toEqual(["ON"]);
    expect(c.get("feed")).toMatchObject({ lines: ["Lv4 Powersource", "using 3 of 4"], tone: "text" });
    expect(c.get("fb_A")).toMatchObject({ fill: 0, step: 0, blown: false });
    expect(c.get("shrine")!.lit).toBe(true);
    expect(c.get("flood")!.lit).toBe(true);
    for (const id of ["street_1", "street_2", "street_3"]) expect(c.get(id)!.lit).toBe(false);
  });
});

describe("captionsFor, against 2D", () => {
  const files = readdirSync("puzzles").filter((f) => f.endsWith(".json"));
  it("has maps to compare", () => expect(files.length).toBeGreaterThan(20));

  it("uses the 2D helpers' words for every feed, fuse and lamp of every puzzle at its start", () => {
    for (const f of files) {
      const p = loadPuzzle(JSON.parse(readFileSync(`puzzles/${f}`, "utf8")));
      const state = createGrid(p, new EventBus()).state();
      const c = captionsFor(p).update(state);
      const feeds = createFeedCaptions(p);
      feeds.update(state);
      feeds.nodeIdx.forEach((idx, k) => {
        const id = p.nodes[idx]!.id;
        const over = feeds.isOver(k, state);
        const want = [...(feeds.heading[k] ? [feeds.heading[k]!] : []), feeds.name[k]!, over ? feeds.alarm[k]! : feeds.using[k]!];
        expect(c.get(id)!.lines, `${f} ${id}`).toEqual(want);
      });
      expect(puzzleFeeds(p).length).toBe(feeds.nodeIdx.length);
      for (const n of p.nodes) {
        if (n.type === "fusebox") expect(c.get(n.id)!.lines, `${f} ${n.id}`).toEqual(fuseCaption(n.rating) ? [fuseCaption(n.rating)] : []);
        if (n.type === "lamp") expect(c.get(n.id)!.lines, `${f} ${n.id}`).toEqual([lampCaption(n.load ?? 1)]);
      }
    }
  });
});

describe("blown fuse versus at the limit", () => {
  it("07-past-the-fuse: the blown fb_A reads blown, empty, alarm; the Shrine's full fb_A does not", () => {
    const p = load("07-past-the-fuse");
    const g = createGrid(p, new EventBus());
    const blown = captionsFor(p).update(g.state()).get("fb_A")!;
    expect(g.state().readableFaults.size).toBeGreaterThan(0);
    expect(blown).toMatchObject({ blown: true, fill: 0, tone: "alarm", lines: ["Lv3 Fuse"] });
    const limit = captionsFor(puzzle).update(createGrid(puzzle, new EventBus()).state()).get("fb_A")!;
    expect(limit).toMatchObject({ blown: false, step: 2, fill: 1 });
    expect(limit).not.toEqual(blown);
  });
});

describe("ON/OFF", () => {
  it("matches the literal 2D draws (drift guard)", () => {
    const src = readFileSync("src/render/map-renderer.ts", "utf8");
    expect(src).toContain('closed ? "ON" : "OFF"');
    expect(BREAKER_ON).toBe("ON");
    expect(BREAKER_OFF).toBe("OFF");
  });
});

describe("captions are pure", () => {
  it("imports no three, play or render index, and only types from grid", () => {
    const src = readFileSync("src/render3d/captions.ts", "utf8");
    const imports = [...src.matchAll(/^\s*import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gms)].map((m) => ({ type: !!m[1], from: m[2]! }));
    expect(imports.length).toBeGreaterThan(0);
    for (const i of imports) {
      expect(i.from).not.toMatch(/three|play/);
      expect(i.from).not.toBe("../render");
      expect(i.from).not.toBe("../render/index");
      if (/grid/.test(i.from)) expect(i.type).toBe(true);
    }
  });

  it("gives deep-equal records for the same state, and the same string references when unchanged", () => {
    const g = createGrid(puzzle, new EventBus());
    const set = captionsFor(puzzle);
    const first = new Map([...set.update(g.state())].map(([k, v]) => [k, { ...v }]));
    const a = [...set.update(g.state())].map(([k, v]) => [k, v.lines] as const);
    const second = set.update(g.state());
    for (const [k, v] of first) expect(second.get(k)).toEqual(v);
    for (const [k, lines] of a) expect(second.get(k)!.lines).toBe(lines);
    // A change makes new lines for what changed only.
    g.throwBreaker("br_street");
    const third = set.update(g.state());
    expect(third.get("br_street")!.lines).not.toBe(a.find(([k]) => k === "br_street")![1]);
    expect(third.get("br_main")!.lines).toBe(a.find(([k]) => k === "br_main")![1]);
  });
});

describe("caption size helpers", () => {
  it("scaleForPx and captionTextPx round-trip at any viewport", () => {
    for (const h of [480, 720, 1080]) {
      const scale = scaleForPx(30, h, 40);
      expect(captionTextPx(scale, 30, 12, h, 40)).toBeCloseTo(12, 9);
    }
  });
});
