import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../core";
import type { SoundView } from "../core";
import { FakeContext, asContext } from "./fakeContext";
import type { FakeNode } from "./fakeContext";
import { createAudio } from "./index";
import { FLICKER_HZ, HUM_HZ, WHINE_LOW_HZ } from "./recipes";
import { Player } from "./shell";
import type { Voice } from "./types";

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

async function setup() {
  const fake = new FakeContext();
  const target = new EventTarget();
  const audio = createAudio({ createContext: () => asContext(fake) as unknown as AudioContext, gestureTarget: target });
  const bus = new EventBus();
  audio.attach(bus);
  target.dispatchEvent(new Event("pointerdown"));
  await flush();
  return { fake, audio, bus };
}
const view = (complete: boolean): SoundView => ({
  brownout: false,
  complete,
  feeds: new Map(),
  batteries: new Map(),
  sparking: new Set(),
});

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("the shell uses the named pitches", () => {
  it("the hum oscillators start at HUM_HZ, the flicker saw at FLICKER_HZ and the whine at WHINE_LOW_HZ", async () => {
    const { fake } = await setup();
    const osc = fake.all("osc");
    const at = (type: string, hz: number) => osc.some((n) => n.type === type && n.frequency.value === hz);
    expect(at("sine", HUM_HZ[0])).toBe(true);
    expect(at("triangle", HUM_HZ[1])).toBe(true);
    expect(at("sawtooth", FLICKER_HZ)).toBe(true);
    expect(at("sine", WHINE_LOW_HZ)).toBe(true);
  });

  it("a voice without detune, formants or vibrato builds the nodes it always did", async () => {
    const { fake, bus } = await setup();
    const oscBefore = fake.all("osc").length;
    const biquadBefore = fake.all("biquad").length;
    bus.emit("breaker:thrown", { nodeId: "b", closed: true });
    const fresh = fake.all("osc").slice(oscBefore);
    expect(fresh.length).toBe(1);
    expect(fresh[0]?.detune.calls.length).toBe(0);
    expect(fake.all("biquad").length - biquadBefore).toBe(1); // the click's lowpass only
  });
});

describe("the shell still builds detune, formants and vibrato (031 support, unused by any recipe since 032)", () => {
  const sung: Voice[] = [
    { kind: "osc", wave: "sawtooth", freq: 432, detuneCents: -8, formants: [{ freq: 780, q: 6, gainDb: -7 }, { freq: 1150, q: 8, gainDb: -10 }],
      vibrato: { freq: 5, cents: 16 }, attack: 0.5, decay: 0, sustain: 1, release: 1, gainDb: -28, at: 0, duration: 2 },
    { kind: "osc", wave: "sawtooth", freq: 432, detuneCents: 6, formants: [{ freq: 780, q: 6, gainDb: -7 }, { freq: 1150, q: 8, gainDb: -10 }],
      vibrato: { freq: 5.5, cents: 16 }, attack: 0.5, decay: 0, sustain: 1, release: 1, gainDb: -28, at: 0, duration: 2 },
  ];
  const wins = () => {
    const fake = new FakeContext();
    fake.state = "running";
    const player = new Player(asContext(fake), false, 0.5);
    const before = new Set<FakeNode>(fake.nodes);
    player.play({ name: "sung", at: 0, voices: sung }, fake.currentTime);
    return { fake, fresh: fake.nodes.filter((n) => !before.has(n)) };
  };

  it("a voice with detuneCents sets the source's detune to that many cents", () => {
    const { fresh } = wins();
    const set = fresh
      .filter((n) => n.kind === "osc")
      .flatMap((n) => (n.detune.calls as Array<{ op: string; args: number[] }>).filter((c) => c.op === "setValueAtTime").map((c) => c.args[0]));
    expect(set.sort()).toEqual(sung.map((v) => v.detuneCents ?? 0).sort());
  });

  it("a voice with formants gets one bandpass per formant, with its freq and Q, summed into one gain", () => {
    const { fresh } = wins();
    const bps = fresh.filter((n) => n.kind === "biquad" && n.type === "bandpass");
    const per = sung[0]?.formants ?? [];
    expect(bps.length).toBe(sung.length * per.length);
    for (const f of per) {
      const match = bps.filter((b) => b.Q.value === f.q && b.frequency.calls[0]?.args[0] === f.freq);
      expect(match.length).toBe(sung.length);
    }
    const fg = bps[0]?.connections[0];
    expect(fg?.kind).toBe("gain");
    expect(fg?.connections[0]?.kind).toBe("gain");
  });

  it("a voice with vibrato gets an oscillator whose depth gain drives the source's detune, started and stopped with the voice", () => {
    const { fresh } = wins();
    const oscs = fresh.filter((n) => n.kind === "osc");
    const detunes = oscs.map((o) => o.params.detune);
    const depths = fresh.filter((n) => n.kind === "gain" && n.connections.some((c: unknown) => detunes.includes(c as never)));
    expect(depths.length).toBe(sung.length);
    const lfos = oscs.filter((o) => o.connections.some((c: FakeNode) => depths.includes(c)));
    expect(lfos.length).toBe(sung.length);
    for (const l of lfos) {
      expect(l.starts.length).toBe(1);
      expect(l.stops.length).toBe(1);
    }
  });
});
