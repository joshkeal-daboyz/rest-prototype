import { describe, expect, expectTypeOf, it } from "vitest";
import * as core from "./index";
import {
  AUDIO_PREFS_KEY,
  BLOW_TIMING,
  DEFAULT_AUDIO_PREFS,
  EventBus,
  type AudioControl,
  type EventName,
  type Events,
  type FeedReadout,
  type Fault,
  type Part,
  type SoundEngine,
  type SoundView,
} from "./index";

describe("BLOW_TIMING (ticket 019: one clock for the blow)", () => {
  it("holds the 016 numbers", () => {
    expect(BLOW_TIMING.run).toBe(0.4);
    expect(BLOW_TIMING.glow).toBe(0.3);
    expect(BLOW_TIMING.sparkAt).toBe(0.5);
    expect(BLOW_TIMING.spark).toBe(0.3);
    expect(BLOW_TIMING.popAt).toBe(0.7);
    expect(BLOW_TIMING.pop).toBe(0.6);
  });

  it("pops when the glow ends: popAt === run + glow", () => {
    expect(BLOW_TIMING.popAt).toBeCloseTo(BLOW_TIMING.run + BLOW_TIMING.glow, 12);
  });

  it("is exported from src/core/index.ts", () => {
    expect(core.BLOW_TIMING).toBe(BLOW_TIMING);
  });
});

describe("SoundView", () => {
  it("is satisfied structurally by a value shaped like GridState (built inline, no src/grid import)", () => {
    const feeds = new Map<string, FeedReadout>([["main", { load: 2, capacity: 3, over: false }]]);
    const gridStateLike = {
      powered: new Set<string>(["main"]),
      flowFrom: new Map<string, string>(),
      lit: new Set<string>(),
      readableFaults: new Set<string>(),
      sparking: new Set<string>(["l1"]) as ReadonlySet<string>,
      fuseLoad: new Map<string, number>(),
      faults: [] as readonly Fault[],
      breakers: new Map<string, boolean>(),
      switches: new Map<string, 0 | 1>(),
      batteries: new Map<string, { charge: number; capacity: number; released: boolean; charging: boolean }>([
        ["bat", { charge: 1, capacity: 4, released: false, charging: true }],
      ]) as ReadonlyMap<string, { charge: number; capacity: number; released: boolean; charging: boolean }>,
      parts: [] as readonly Part[],
      targets: [] as readonly string[],
      load: 2,
      capacity: 3 as number | null,
      brownout: false,
      complete: false,
      actions: 0,
      wouldBlow: new Map<string, number>() as ReadonlyMap<string, number>,
      feeds: feeds as ReadonlyMap<string, FeedReadout>,
      feedOf: new Map<string, string>() as ReadonlyMap<string, string>,
    };
    expectTypeOf(gridStateLike).toMatchTypeOf<SoundView>();
    const view: SoundView = gridStateLike;
    expect(view.batteries.get("bat")?.charging).toBe(true);
  });
});

describe("AudioControl / SoundEngine", () => {
  it("a SoundEngine is an AudioControl", () => {
    expectTypeOf<SoundEngine>().toMatchTypeOf<AudioControl>();
  });

  it("has levelDone: () => void (ticket 025: the win splash cue)", () => {
    expectTypeOf<SoundEngine["levelDone"]>().toEqualTypeOf<() => void>();
  });

  it("saved prefs default to not muted, volume 0.5, under rest.audio", () => {
    expect(AUDIO_PREFS_KEY).toBe("rest.audio");
    expect(DEFAULT_AUDIO_PREFS).toEqual({ muted: false, volume: 0.5 });
  });
});

describe("play:click (ticket 019: refused, undo and reset get a sound)", () => {
  it("is an event name with kind refused | undo | reset and an optional target", () => {
    expectTypeOf<"play:click">().toMatchTypeOf<EventName>();
    expectTypeOf<Events["play:click"]["kind"]>().toEqualTypeOf<"refused" | "undo" | "reset">();
  });

  it("goes through the bus like any other event", () => {
    const bus = new EventBus();
    const got: Events["play:click"][] = [];
    bus.on("play:click", (e) => got.push(e));
    bus.emit("play:click", { kind: "refused", target: "rl" });
    bus.emit("play:click", { kind: "undo" });
    bus.emit("play:click", { kind: "reset" });
    expect(got.map((e) => e.kind)).toEqual(["refused", "undo", "reset"]);
    expect(got[0]?.target).toBe("rl");
    expect("target" in got[1]!).toBe(false);
  });
});
