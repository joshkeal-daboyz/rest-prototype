/**
 * Ticket 060 sections A and B: the light rig is the one owner of a scene's global lights, background, fog and a renderer's tone mapping; night is today's, value for value, on the
 * three protocol maps; day changes the code-drawn colours and puts the night-only lamp parts away, and night brings everything back exactly. No WebGL, no assets, no timers.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, HemisphereLight, MeshStandardMaterial, NoToneMapping, PointLight, Scene, type Light, type Material, type Mesh } from "three";
import { EventBus, loadPuzzle } from "../core";
import { createGrid } from "../grid";
import { LIGHT_MODES, sunPosition } from "./lighting";
import { addSurface, applyLightMode, newLightOwners, nightLightsOn, sceneLightMode, setRendererMode, type RigRenderer } from "./lightrig";
import { buildScene } from "./scene";

const gl = (): RigRenderer => ({ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 3, shadowMap: { enabled: true } });
const lightsOf = (scene: Scene): Light[] => {
  const out: Light[] = [];
  scene.traverse((o) => {
    if ((o as Light).isLight === true) out.push(o as Light);
  });
  return out;
};
const kinds = (scene: Scene): string[] => lightsOf(scene).map((l) => String(l.userData["lightRig"] ?? "own")).sort();

describe("applyLightMode: one owner of the global lights", () => {
  it("night leaves exactly one ambient and one moon, both tagged as the rig's, with today's values", () => {
    const scene = new Scene();
    applyLightMode(scene, null, "night");
    expect(kinds(scene)).toEqual(["ambient", "moon"]);
    const amb = lightsOf(scene).find((l) => l instanceof AmbientLight)!;
    const moon = lightsOf(scene).find((l) => l instanceof DirectionalLight)! as DirectionalLight;
    expect([amb.color.getHex(), amb.intensity]).toEqual([0x4a5a7a, 1.1]);
    expect([moon.color.getHex(), moon.intensity, ...moon.position.toArray()]).toEqual([0x8fa6d0, 0.7, -6, 12, 4]);
    expect((scene.background as Color).getHex()).toBe(0x0b0f17);
    expect(scene.fog).toBeNull();
    expect(sceneLightMode(scene)).toBe("night");
  });

  it("day leaves exactly one sun and one HemisphereLight, no ambient, all tagged", () => {
    const scene = new Scene();
    applyLightMode(scene, null, "day");
    expect(kinds(scene)).toEqual(["hemi", "key"]);
    const sun = lightsOf(scene).find((l) => l instanceof DirectionalLight)! as DirectionalLight;
    const hemi = lightsOf(scene).find((l) => l instanceof HemisphereLight)! as HemisphereLight;
    expect(lightsOf(scene).some((l) => l instanceof AmbientLight)).toBe(false);
    expect([sun.color.getHex(), sun.intensity]).toEqual([0xfff6ea, 1.4]);
    const want = sunPosition(55, 135);
    expect(sun.position.toArray().map((v, i) => Math.abs(v - want[i]!) < 1e-9)).toEqual([true, true, true]);
    expect([hemi.color.getHex(), hemi.groundColor.getHex(), hemi.intensity]).toEqual([0xe6efff, 0x9a8c78, 1.8]);
    expect((scene.background as Color).getHex()).toBe(0xa9c7e6);
    expect(scene.fog).toBeNull();
    expect(sun.castShadow).toBe(false);
  });

  it("a second call with the other mode leaves exactly the other set, in both directions", () => {
    const scene = new Scene();
    applyLightMode(scene, null, "night");
    applyLightMode(scene, null, "day");
    expect(kinds(scene)).toEqual(["hemi", "key"]);
    applyLightMode(scene, null, "night");
    expect(kinds(scene)).toEqual(["ambient", "moon"]);
    expect((scene.background as Color).getHex()).toBe(0x0b0f17);
  });

  it("two calls with the same mode change nothing: the same light objects, the same values", () => {
    for (const id of ["night", "day"] as const) {
      const scene = new Scene();
      applyLightMode(scene, null, id);
      const before = scene.children.slice();
      const values = lightsOf(scene).map((l) => [l.color.getHex(), l.intensity, ...l.position.toArray()]);
      applyLightMode(scene, null, id);
      expect(scene.children).toHaveLength(before.length);
      scene.children.forEach((c, i) => expect(c).toBe(before[i]));
      expect(lightsOf(scene).map((l) => [l.color.getHex(), l.intensity, ...l.position.toArray()])).toEqual(values);
    }
  });

  it("leaves a light it did not add alone (a lamp's point light stays in its own group)", () => {
    const scene = new Scene();
    const mine = new PointLight(0xffd37a, 0, 6, 1.6);
    scene.add(mine);
    applyLightMode(scene, null, "day");
    applyLightMode(scene, null, "night");
    expect(kinds(scene)).toEqual(["ambient", "moon", "own"]);
    expect(scene.children).toContain(mine);
  });
});

describe("the renderer's tone mapping and exposure", () => {
  it("day sets ACES at exposure 1, and night restores none (whatever the renderer held)", () => {
    const r = gl();
    r.toneMapping = NoToneMapping;
    r.toneMappingExposure = 0.2;
    const scene = new Scene();
    applyLightMode(scene, r, "day");
    expect([r.toneMapping, r.toneMappingExposure, r.shadowMap!.enabled]).toEqual([ACESFilmicToneMapping, 1, false]);
    applyLightMode(scene, r, "night");
    expect([r.toneMapping, r.toneMappingExposure, r.shadowMap!.enabled]).toEqual([NoToneMapping, 1, false]);
  });

  it("a call with no renderer leaves the renderer alone; setRendererMode sets it without touching a scene", () => {
    const r = gl();
    applyLightMode(new Scene(), null, "night");
    expect([r.toneMapping, r.toneMappingExposure]).toEqual([ACESFilmicToneMapping, 3]);
    setRendererMode(r, "night");
    expect([r.toneMapping, r.toneMappingExposure]).toEqual([NoToneMapping, 1]);
  });

  it("works with a renderer that has no shadow map", () => {
    const r: RigRenderer = { toneMapping: NoToneMapping, toneMappingExposure: 1 };
    expect(() => applyLightMode(new Scene(), r, "day")).not.toThrow();
    expect(r.toneMapping).toBe(ACESFilmicToneMapping);
  });
});

describe("the code-drawn materials", () => {
  it("take the mode's colours in day and return to night's exactly; a key the mode has no colour for is left alone", () => {
    const owners = newLightOwners();
    const street = new MeshStandardMaterial({ color: 0x1a2331 });
    const street2 = new MeshStandardMaterial({ color: 0x1a2331 });
    const kerb = new MeshStandardMaterial({ color: 0x9aa4b6 });
    const other = new MeshStandardMaterial({ color: 0x123456 });
    addSurface(owners, "street", street);
    addSurface(owners, "street", street2);
    addSurface(owners, "kerb", kerb);
    addSurface(owners, "unknown", other);
    const scene = new Scene();
    applyLightMode(scene, null, "day", owners);
    expect([street.color.getHex(), street2.color.getHex(), kerb.color.getHex(), other.color.getHex()]).toEqual([0x55595f, 0x55595f, 0xd0d4da, 0x123456]);
    applyLightMode(scene, null, "night", owners);
    expect([street.color.getHex(), street2.color.getHex(), kerb.color.getHex(), other.color.getHex()]).toEqual([0x1a2331, 0x1a2331, 0x9aa4b6, 0x123456]);
  });

  it("buildScene registers its ground, yards, roads, kerbs and pavements, and day then night restores each colour exactly", () => {
    const puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));
    const b = buildScene(puzzle);
    expect([...b.lightOwners.materials.keys()].sort()).toEqual(["ground", "kerb", "pavement", "street", "yard"]);
    const read = (): Record<string, number[]> => Object.fromEntries([...b.lightOwners.materials].map(([k, v]) => [k, v.map((m) => (m as MeshStandardMaterial).color.getHex())]));
    const night = read();
    expect(night["ground"]).toEqual([0x0e131d]);
    expect(night["yard"]).toEqual([0x141c29]);
    expect(night["street"]!.every((c) => c === 0x1a2331)).toBe(true);
    expect(night["kerb"]).toEqual([0x9aa4b6]);
    expect(night["pavement"]).toEqual([0x3d4658]);
    applyLightMode(b.scene, null, "day", b.lightOwners);
    const day = read();
    expect(day["ground"]).toEqual([0x7d8471]);
    expect(day["yard"]).toEqual([0x7d8471]);
    expect(day["street"]!.every((c) => c === 0x55595f)).toBe(true);
    expect(day["kerb"]).toEqual([0xd0d4da]);
    expect(day["pavement"]).toEqual([0xa7abb1]);
    applyLightMode(b.scene, null, "night", b.lightOwners);
    expect(read()).toEqual(night);
    b.dispose();
  });
});

describe("the night-only lamp parts", () => {
  const puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));
  const pointLights = (s: Scene): PointLight[] => lightsOf(s).filter((l): l is PointLight => l instanceof PointLight);

  it("in day the lamps' lights are at 0 and their glows, pools and flares are hidden, even after an update; at night they come back as they were", () => {
    const grid = createGrid(puzzle, new EventBus());
    const b = buildScene(puzzle);
    b.update(grid.state(), null, 1);
    const nightLit = pointLights(b.scene).map((l) => l.intensity);
    expect(nightLit.filter((v) => v > 0)).toHaveLength(3);
    // Four night-only parts per lamp: light, pool, halo, flare.
    expect(b.lightOwners.nightOnly).toHaveLength(pointLights(b.scene).length * 4);
    const visibleBefore = b.lightOwners.nightOnly.map((o) => o.visible);

    applyLightMode(b.scene, null, "day", b.lightOwners);
    expect(nightLightsOn(b.scene)).toBe(false);
    expect(pointLights(b.scene).every((l) => l.intensity === 0 && !l.visible)).toBe(true);
    expect(b.lightOwners.nightOnly.every((o) => !o.visible)).toBe(true);
    for (const t of [1.1, 1.2, 2]) {
      b.update(grid.state(), null, t);
      expect(pointLights(b.scene).every((l) => l.intensity === 0), `at ${t}`).toBe(true);
      expect(b.lightOwners.nightOnly.every((o) => !o.visible), `at ${t}`).toBe(true);
      // No glow or pool carries opacity either, so nothing of them could show.
      for (const o of b.lightOwners.nightOnly) {
        const m = (o as Mesh).material as Material | undefined;
        if (m) expect(m.opacity, `at ${t}`).toBe(0);
      }
    }

    applyLightMode(b.scene, null, "night", b.lightOwners);
    expect(nightLightsOn(b.scene)).toBe(true);
    expect(b.lightOwners.nightOnly.map((o) => o.visible)).toEqual(visibleBefore);
    b.update(grid.state(), null, 1);
    expect(pointLights(b.scene).map((l) => l.intensity)).toEqual(nightLit);
    b.dispose();
  });
});

describe("night is unchanged on the three protocol maps (a snapshot taken on the base commit)", () => {
  const fnv = (s: string): string => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };
  /** Every light but a lamp's point light (counted), the background, the fog, and every material's type, colour and emissive colour, hashed in sorted order. */
  const snapshot = (scene: Scene): { background: number; fog: unknown; lights: string[]; pointLights: number; matCount: number; matHash: string } => {
    const lights: string[] = [];
    const mats: string[] = [];
    let pointLights = 0;
    scene.traverse((o) => {
      const l = o as Light;
      if (l.isLight === true) {
        if (l instanceof PointLight) pointLights++;
        else lights.push(`${l.type}|${l.color.getHex()}|${l.intensity}|${l.position.toArray().map((v) => Math.round(v * 1e6) / 1e6).join(",")}|${l.parent === scene ? "root" : "nested"}`);
      }
      const m = (o as Mesh).material as unknown;
      if (m) {
        for (const x of (Array.isArray(m) ? m : [m]) as { type: string; color?: Color; emissive?: Color }[]) mats.push(`${x.type}|${x.color ? x.color.getHex() : "-"}|${x.emissive ? x.emissive.getHex() : "-"}`);
      }
    });
    return { background: (scene.background as Color).getHex(), fog: scene.fog, lights: lights.sort(), pointLights, matCount: mats.length, matHash: fnv(mats.sort().join(";")) };
  };
  const LIGHTS = ["AmbientLight|4872826|1.1|0,0,0|root", "DirectionalLight|9414352|0.7|-6,12,4|root"];
  const BASE: Record<string, { pointLights: number; matCount: number; matHash: string }> = {
    "01-first-light": { pointLights: 2, matCount: 99, matHash: "e32248bc" },
    "09-shrine-circuit": { pointLights: 5, matCount: 235, matHash: "94e10480" },
    "64-the-whole-chain": { pointLights: 7, matCount: 395, matHash: "e9863668" },
  };
  for (const [id, want] of Object.entries(BASE)) {
    it(`${id}: the background, the two lights, no fog, and every material colour equal the base commit's`, () => {
      const b = buildScene(loadPuzzle(JSON.parse(readFileSync(`puzzles/${id}.json`, "utf8"))));
      const s = snapshot(b.scene);
      expect(s.background).toBe(0x0b0f17);
      expect(s.fog).toBeNull();
      expect(s.lights).toEqual(LIGHTS);
      expect({ pointLights: s.pointLights, matCount: s.matCount, matHash: s.matHash }).toEqual(want);
      // Going to day and back leaves the same snapshot.
      applyLightMode(b.scene, null, "day", b.lightOwners);
      applyLightMode(b.scene, null, "night", b.lightOwners);
      expect(snapshot(b.scene)).toEqual(s);
      b.dispose();
    });
  }
});

describe("one owner, by source", () => {
  const dir = "src/render3d";
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  const src = (f: string): string => readFileSync(`${dir}/${f}`, "utf8");

  it("no file but lightrig.ts, gallery.ts and the tile sheet in tilecity3d.ts makes an ambient, hemisphere or scene-level directional light", () => {
    for (const f of files) {
      const text = src(f);
      const made = [...text.matchAll(/new (AmbientLight|HemisphereLight|DirectionalLight)\(/g)];
      if (f === "lightrig.ts" || f === "gallery.ts") continue;
      if (f === "tilecity3d.ts") {
        const sheetAt = text.indexOf("export function buildSheetScene(");
        const after = text.indexOf("export function sheetRigInsets");
        const sheetEnd = after > sheetAt ? after : text.length;
        expect(sheetAt).toBeGreaterThan(0);
        for (const m of made) {
          expect(m[1], "the tile city scene asks the rig; only the sheet has lights of its own").not.toBe("HemisphereLight");
          expect(m.index! > sheetAt && m.index! < sheetEnd, `${f}: a ${m[1]} outside the sheet`).toBe(true);
        }
        continue;
      }
      expect(made.map((m) => m[1]), f).toEqual([]);
    }
  });

  it("tone mapping, exposure and fog are set by the rig only", () => {
    for (const f of files) {
      if (f === "lightrig.ts") continue;
      expect(/\.toneMapping\s*=[^=]|\.toneMappingExposure\s*=[^=]|new Fog\(|new FogExp2\(|\.fog\s*=[^=]/.test(src(f)), f).toBe(false);
    }
  });

  it("the scene's background is set by the rig, the gallery and the tile sheet only", () => {
    for (const f of files) {
      const hits = [...src(f).matchAll(/\.background\s*=[^=]/g)].length;
      if (f === "lightrig.ts") expect(hits).toBeGreaterThan(0);
      else if (f === "gallery.ts" || f === "tilecity3d.ts") expect(hits, f).toBe(1);
      else expect(hits, f).toBe(0);
    }
  });

  it("neither the rig nor the table reads the address or the DOM, and the table imports nothing", () => {
    for (const f of ["lightrig.ts", "lighting.ts"]) expect(/location\.|document\.|window\./.test(src(f)), f).toBe(false);
    expect([...src("lighting.ts").matchAll(/from\s+"([^"]+)"/g)]).toEqual([]);
  });

  it("scene.ts and buildCityScene ask the rig for night and carry no light literal of their own", () => {
    expect(src("scene.ts")).toMatch(/applyLightMode\(scene, null, "night", lightOwners\)/);
    expect(src("tilecity3d.ts")).toMatch(/applyLightMode\(scene, null, "night", lightOwners\)/);
    for (const f of ["scene.ts", "streetcam.ts"]) expect(/0x0b0f17|0x4a5a7a|0x8fa6d0/.test(src(f)), f).toBe(false);
    expect(LIGHT_MODES.night.background).toBe(0x0b0f17);
  });
});
