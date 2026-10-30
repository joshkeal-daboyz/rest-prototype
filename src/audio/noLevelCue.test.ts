import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EventBus } from "../core";
import type { SoundView } from "../core";
import * as cues from "./cues";
import { FakeContext, asContext } from "./fakeContext";
import { createAudio } from "./index";
import * as recipes from "./recipes";

/** Ticket 034 (Josh: "Remove the splash chime. The light chimes are enough."): winning adds no sound of its own. */
const AUDIO_DIR = join(__dirname);
const MAIN = join(__dirname, "..", "main.ts");
// Built from pieces so this file does not contain the words it scans for.
const NEEDLES = [["level", "Done"].join(""), ["Level", "Done"].join(""), ["level", ":done"].join(""), ["LEVEL", "_CHIME"].join("")];

const sources = (): Array<[string, string]> => [
  ...readdirSync(AUDIO_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f): [string, string] => [f, readFileSync(join(AUDIO_DIR, f), "utf8")]),
  ["main.ts", readFileSync(MAIN, "utf8")],
];

const won: SoundView = { brownout: false, complete: true, feeds: new Map(), batteries: new Map(), sparking: new Set() };
const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};
const started = (f: FakeContext) =>
  [...f.all("osc"), ...f.all("buffersource")].filter((n) => n.starts.some((s) => s.when !== undefined)).length;

describe("no level-done cue (ticket 034)", () => {
  it("no export of src/audio is a level-done recipe, cue or gate", () => {
    for (const mod of [recipes, cues]) {
      expect(Object.keys(mod).filter((k) => /level/i.test(k))).toEqual([]);
    }
  });

  it("no source text in src/audio or main.ts names the level-done cue", () => {
    for (const [file, text] of sources()) {
      for (const n of NEEDLES) expect(text.includes(n), `${file} mentions ${n}`).toBe(false);
      if (file !== "noLevelCue.test.ts") expect(/group\s*===\s*"level"|"level"\s*\|/.test(text), `${file} has the level group`).toBe(false);
    }
  });

  it("the engine has no level-done method at runtime", () => {
    const audio = createAudio({ gestureTarget: new EventTarget() });
    expect(Object.keys(audio).includes(["level", "Done"].join(""))).toBe(false);
    expect((audio as unknown as Record<string, unknown>)[["level", "Done"].join("")]).toBeUndefined();
  });

  it("a win starts exactly the Relight's sources and nothing more", async () => {
    const fake = new FakeContext();
    const target = new EventTarget();
    const audio = createAudio({ createContext: () => asContext(fake) as unknown as AudioContext, gestureTarget: target });
    audio.attach(new EventBus());
    target.dispatchEvent(new Event("pointerdown"));
    await flush();
    audio.update(won, 0.016);
    audio.update(won, 0.016);
    expect(started(fake), "a complete view alone starts nothing").toBe(0);

    const igniteAt = [0.25, 0.9, 2.65];
    audio.relight(igniteAt, 3);
    const expected = cues
      .relightCues(igniteAt, 3)
      .flatMap((c) => c.voices)
      .reduce((n, v) => n + 1 + (v.vibrato ? 1 : 0) + (v.lfo ? 1 : 0), 0);
    expect(started(fake)).toBe(expected);
    audio.update(won, 0.016);
    expect(started(fake), "later won frames add nothing").toBe(expected);
  });
});
