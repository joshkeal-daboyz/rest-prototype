/**
 * Ticket 060 section B: the tile view's day and night switch. The key and the button flip the mode through the rig, and both go with `dispose`. Fake host and fake renderer: no
 * DOM, no WebGL, no assets, no timers beyond one macrotask turn for the (empty) model load.
 */

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { ACESFilmicToneMapping, Color, MeshStandardMaterial, NoToneMapping, type Material, type Scene, type WebGLRenderer } from "three";
import { LIGHT_MODES, type LightModeId } from "./lighting";
import { DAY_TOGGLE_LABEL, createDayToggle, isFlipKey, type ButtonLike, type DayToggleHost, type KeyEventLike } from "./daytoggle";
import { NO_MODELS } from "./models3d";
import { stubTextSurface } from "./text";
import { runCity } from "../city/pipeline";
import { createPlanAssembleRenderer3d, tilesPlanRequested } from "./plan3d";
import { createCityRenderer3d } from "./tilecity3d";
import { cityTilesRequested } from "./tileslots";

/** The pipeline's city (6 x 6 seed 1, what `city=tiles` asks), run once for the file. */
let planRun: ReturnType<typeof runCity> | null = null;
const cachedRun = (): ReturnType<typeof runCity> => (planRun ??= runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "traffic"));

/** A host that records what was added and removed. */
function fakeHost(): { host: DayToggleHost; press(e: KeyEventLike): void; click(): void; state: { listeners: number; button: boolean; states: LightModeId[] } } {
  let key: ((e: KeyEventLike) => void) | null = null;
  let click: (() => void) | null = null;
  const state = { listeners: 0, button: false, states: [] as LightModeId[] };
  const host: DayToggleHost = {
    keys: {
      addEventListener(_t, fn) {
        key = fn;
        state.listeners++;
      },
      removeEventListener(_t, fn) {
        if (key === fn) {
          key = null;
          state.listeners--;
        }
      },
    },
    makeButton(): ButtonLike {
      state.button = true;
      return {
        onClick: (fn) => void (click = fn),
        setState: (m) => void state.states.push(m),
        remove: () => void (state.button = false),
      };
    },
  };
  return { host, press: (e) => key?.(e), click: () => click?.(), state };
}

describe("isFlipKey", () => {
  it("is a bare L, either case", () => {
    expect(isFlipKey({ key: "l" })).toBe(true);
    expect(isFlipKey({ key: "L" })).toBe(true);
  });
  it("is not another key, a held key, a chord, or a key typed into a text field", () => {
    expect(isFlipKey({ key: "k" })).toBe(false);
    expect(isFlipKey({ key: "Enter" })).toBe(false);
    expect(isFlipKey({ key: "l", repeat: true })).toBe(false);
    expect(isFlipKey({ key: "l", ctrlKey: true })).toBe(false);
    expect(isFlipKey({ key: "l", metaKey: true })).toBe(false);
    expect(isFlipKey({ key: "l", altKey: true })).toBe(false);
    expect(isFlipKey({ key: "l", target: { tagName: "INPUT" } })).toBe(false);
    expect(isFlipKey({ key: "l", target: { tagName: "textarea" } })).toBe(false);
    expect(isFlipKey({ key: "l", target: { tagName: "CANVAS" } })).toBe(true);
    expect(isFlipKey({ key: "l", target: null })).toBe(true);
  });
});

describe("createDayToggle", () => {
  it("flips on the key and on the button, shows the mode, and takes both away on dispose", () => {
    const f = fakeHost();
    let flips = 0;
    const t = createDayToggle(f.host, "day", () => void flips++);
    expect(f.state).toMatchObject({ listeners: 1, button: true, states: ["day"] });
    f.press({ key: "l" });
    f.click();
    f.press({ key: "x" });
    expect(flips).toBe(2);
    t.sync("night");
    expect(f.state.states).toEqual(["day", "night"]);
    t.dispose();
    expect(f.state).toMatchObject({ listeners: 0, button: false });
    f.press({ key: "l" });
    expect(flips).toBe(2);
  });

  it("works with no window and no page", () => {
    const t = createDayToggle({ keys: null, makeButton: null }, "night", () => {});
    expect(() => {
      t.sync("day");
      t.dispose();
    }).not.toThrow();
  });

  it("the button says Day / Night", () => {
    expect(DAY_TOGGLE_LABEL).toBe("Day / Night");
  });
});

describe("the tile view's toggle (criterion 6)", () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const canvas = (): HTMLCanvasElement => ({ clientWidth: 1280, clientHeight: 720, style: { touchAction: "" }, addEventListener() {}, removeEventListener() {}, setPointerCapture() {} }) as unknown as HTMLCanvasElement;
  const kinds = (scene: Scene): string[] => {
    const out: string[] = [];
    scene.traverse((o) => {
      if ((o as { isLight?: boolean }).isLight === true) out.push(String(o.userData["lightRig"] ?? "own"));
    });
    return out.sort();
  };

  async function open(search: string, host: DayToggleHost): Promise<{ gl: { toneMapping: number; toneMappingExposure: number }; scenes: Scene[]; draw(): Scene; dispose(): void }> {
    const scenes: Scene[] = [];
    const gl = { toneMapping: NoToneMapping, toneMappingExposure: 1, setPixelRatio() {}, setSize() {}, render: (s: Scene) => void scenes.push(s) };
    // Ticket 070 L2c: `city=tiles` is the pipeline's city (the plan renderer, as since L1); only the sheet (`sheet=1`) is still the tile view's.
    const plan = tilesPlanRequested(search);
    const r = plan
      ? createPlanAssembleRenderer3d(gl as unknown as WebGLRenderer, canvas(), plan, { dpr: 1, search, load: async () => NO_MODELS, toggleHost: host, run: cachedRun() })
      : createCityRenderer3d(gl as unknown as WebGLRenderer, canvas(), cityTilesRequested(search)!, { dpr: 1, search, load: async () => NO_MODELS, surface: stubTextSurface, toggleHost: host });
    await new Promise<void>((done) => setTimeout(done, 0));
    return {
      gl,
      scenes,
      draw: () => {
        r.draw(undefined as never, undefined as never, 0);
        return scenes[scenes.length - 1]!;
      },
      dispose: () => r.dispose(),
    };
  }
  const streetColour = (scene: Scene): number[] => {
    const out: number[] = [];
    scene.traverse((o) => {
      if (o.name === "tile:code-road") out.push(((o as unknown as { material: MeshStandardMaterial }).material.color as Color).getHex());
    });
    return out;
  };

  it("opens in day by default and at night with light=night, with ACES only in day", async () => {
    const f = fakeHost();
    const day = await open("?city=tiles", f.host);
    expect(kinds(day.draw())).toEqual(["hemi", "key"]);
    expect([day.gl.toneMapping, day.gl.toneMappingExposure]).toEqual([ACESFilmicToneMapping, 1]);
    day.dispose();
    const night = await open("?city=tiles&light=night", fakeHost().host);
    expect(kinds(night.draw())).toEqual(["ambient", "moon"]);
    expect(night.gl.toneMapping).toBe(NoToneMapping);
    night.dispose();
  });

  it("the L key and the button each flip the mode through the rig, lights, background, tone mapping and code-drawn colours together", async () => {
    const f = fakeHost();
    const v = await open("?city=tiles", f.host);
    const scene = v.draw();
    expect(f.state).toMatchObject({ listeners: 1, button: true });
    const dayStreets = streetColour(scene);
    expect(dayStreets.length).toBeGreaterThan(0);
    expect(dayStreets.every((c) => c === LIGHT_MODES.day.surfaces.street)).toBe(true);
    expect((scene.background as Color).getHex()).toBe(LIGHT_MODES.day.background);

    f.press({ key: "L" });
    expect(kinds(scene)).toEqual(["ambient", "moon"]);
    expect(v.gl.toneMapping).toBe(NoToneMapping);
    expect((scene.background as Color).getHex()).toBe(LIGHT_MODES.night.background);
    expect(streetColour(scene).every((c) => c === LIGHT_MODES.night.surfaces.street)).toBe(true);

    f.click();
    expect(kinds(scene)).toEqual(["hemi", "key"]);
    expect(v.gl.toneMapping).toBe(ACESFilmicToneMapping);
    expect(streetColour(scene).every((c) => c === LIGHT_MODES.day.surfaces.street)).toBe(true);

    f.press({ key: "k" });
    expect(kinds(scene)).toEqual(["hemi", "key"]);
    expect(f.state.states).toEqual(["day", "night", "day"]);
    v.dispose();
  });

  it("removes the listener and the button on dispose and gives the renderer back its night tone mapping", async () => {
    const f = fakeHost();
    const v = await open("?city=tiles", f.host);
    const scene = v.draw();
    v.dispose();
    expect(f.state).toMatchObject({ listeners: 0, button: false });
    f.press({ key: "l" });
    expect(kinds(scene)).toEqual(["hemi", "key"]);
    expect(v.gl.toneMapping).toBe(NoToneMapping);
  });

  it("the sheet has nothing to flip: no listener, no button, and no tone mapping", async () => {
    const f = fakeHost();
    const v = await open("?city=tiles&sheet=1", f.host);
    v.draw();
    expect(f.state).toMatchObject({ listeners: 0, button: false });
    expect(v.gl.toneMapping).toBe(NoToneMapping);
    v.dispose();
  });

  it("a material the tiles swap in after the models load is brought to the mode the scene is in", async () => {
    const f = fakeHost();
    const v = await open("?city=tiles&light=night", f.host);
    const scene = v.draw();
    f.press({ key: "l" });
    const mats = new Set<Material>();
    scene.traverse((o) => {
      const m = (o as { material?: Material }).material;
      if (m && (o.name === "tile:code-road" || o.name === "tile:code-pavement")) mats.add(m);
    });
    expect(mats.size).toBeGreaterThan(0);
    for (const m of mats) expect([LIGHT_MODES.day.surfaces.street, LIGHT_MODES.day.surfaces.pavement]).toContain((m as MeshStandardMaterial).color.getHex());
    v.dispose();
  });
});

describe("dev only (criterion 7's source half)", () => {
  const tile = readFileSync("src/render3d/tilecity3d.ts", "utf8");
  const plan3d = readFileSync("src/render3d/plan3d.ts", "utf8");

  it("the plan view (city=tiles) makes the toggle only behind import.meta.env.DEV, and reads the mode through lightModeFor", () => {
    expect(plan3d).toMatch(/if \(import\.meta\.env\.DEV\) \{[\s\S]*?createDayToggle\(/);
    expect(plan3d).toMatch(/lightModeFor\("tiles", opts\.search, import\.meta\.env\.DEV\)/);
  });

  const renderer = readFileSync("src/render3d/renderer.ts", "utf8");

  it("the tile view makes the toggle only behind import.meta.env.DEV, and reads the mode through lightModeFor", () => {
    expect(tile).toMatch(/if \(import\.meta\.env\.DEV && cityScene\) \{[\s\S]*?createDayToggle\(/);
    expect(tile).toMatch(/lightModeFor\("tiles", opts\.search, import\.meta\.env\.DEV\)/);
  });

  it("renderer.ts reads light= only in a dev build", () => {
    expect(renderer).toMatch(/import\.meta\.env\.DEV && typeof location !== "undefined" \? lightModeFor\("puzzle", location\.search, true\) : "night"/);
  });

  it("the toggle module reads no address and the key is the only one it names", () => {
    const src = readFileSync("src/render3d/daytoggle.ts", "utf8");
    expect(/location\./.test(src)).toBe(false);
    expect(/from "three"/.test(src)).toBe(false);
  });
});
