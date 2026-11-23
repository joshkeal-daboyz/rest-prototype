/**
 * Ticket 078 A: the pause and the stretch log. The first tests prove the setup file's `afterEach` lets the event loop turn between two synchronous tests; the rest cover the log.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";
import { startStretchLog } from "./stretch";
import { yieldToWorker } from "./yield";

describe("yieldToWorker", () => {
  it("resolves only after a macrotask: a setImmediate queued just before has run", async () => {
    let ran = false;
    setImmediate(() => {
      ran = true;
    });
    await yieldToWorker();
    expect(ran).toBe(true);
  });
});

describe("the setup file's afterEach", () => {
  let queued = false;
  let ran = false;
  it("test 1 queues a setImmediate and returns synchronously", () => {
    queued = true;
    setImmediate(() => {
      ran = true;
    });
  });
  it("test 2 starts after the event loop has turned", () => {
    expect(queued).toBe(true);
    expect(ran).toBe(true);
  });
  it("the setup file registers exactly one afterEach, and it awaits yieldToWorker", () => {
    const text = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "yield.setup.ts"), "utf8");
    expect(text.match(/\bafterEach\(/g)).toHaveLength(1);
    expect(text).toContain("afterEach(() => yieldToWorker())");
  });
});

describe("the stretch log", () => {
  const dir = mkdtempSync(join(tmpdir(), "rest-stretch-test-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("unset: starts no timer and writes nothing", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    const log = startStretchLog("a.test.ts", undefined, {});
    const calls = spy.mock.calls.length;
    spy.mockRestore();
    log.stop();
    expect(calls).toBe(0);
  });

  it("set: appends one line with the file, the longest gap in ms and the name running when it began", async () => {
    const out = join(dir, "log.txt");
    const name: string | undefined = "busy test";
    const log = startStretchLog("b.test.ts", () => name, { REST_STRETCH_LOG: out });
    await yieldToWorker();
    const t0 = performance.now();
    while (performance.now() - t0 < 200) {
      /* a synchronous stretch */
    }
    await new Promise<void>((r) => setTimeout(r, 120));
    log.stop();
    log.stop();
    const lines = readFileSync(out, "utf8").trimEnd().split("\n");
    expect(lines).toHaveLength(1);
    const [file, ms, test] = lines[0]!.split("\t");
    expect(file).toBe("b.test.ts");
    expect(Number(ms)).toBeGreaterThanOrEqual(190);
    expect(test).toBe("busy test");
  });
});
