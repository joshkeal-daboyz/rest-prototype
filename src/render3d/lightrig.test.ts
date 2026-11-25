/**
 * Ticket 060 sections A and B: the light rig is the one owner of a scene's global lights, background, fog and a renderer's tone mapping; night is today's, value for value, on the
 * three protocol maps; day changes the code-drawn colours and puts the night-only lamp parts away, and night brings everything back exactly. No WebGL, no assets, no timers.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, HemisphereLight, MeshStandardMaterial, NoToneMapping, PointLight, Scene, type Light } from "three";
import { sunPosition } from "./lighting";
import { addSurface, applyLightMode, newLightOwners, sceneLightMode, setRendererMode, type RigRenderer } from "./lightrig";
import { NIGHT_SKY, moonDirection } from "./nightsky";
import { SUN_DISTANCE } from "./lighting";

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
  it("night leaves exactly one ambient and one moon, both tagged as the rig's, with the ambient as pinned and the moon from NIGHT_SKY", () => {
    const scene = new Scene();
    applyLightMode(scene, null, "night");
    expect(kinds(scene)).toEqual(["ambient", "moon"]);
    const amb = lightsOf(scene).find((l) => l instanceof AmbientLight)!;
    const moon = lightsOf(scene).find((l) => l instanceof DirectionalLight)! as DirectionalLight;
    expect([amb.color.getHex(), amb.intensity]).toEqual([0x4a5a7a, 1.1]);
    const d = moonDirection();
    expect([moon.color.getHex(), moon.intensity]).toEqual([NIGHT_SKY.moon.light, NIGHT_SKY.moon.intensity]);
    expect(moon.position.toArray().map((v, i) => Math.abs(v - d[i]! * SUN_DISTANCE) < 1e-9)).toEqual([true, true, true]);
    expect(moon.castShadow).toBe(false);
    expect((scene.background as Color).getHex()).toBe(0x0b0f17);
    expect(scene.fog).toBeNull();
    expect(sceneLightMode(scene)).toBe("night");
  });

  it("day removes the sky and the moon light, night brings back one of each, and a repeat changes nothing", () => {
    const sky = (scene: Scene): number => scene.children.filter((c) => c.userData["lightRig"] === "sky").length;
    const scene = new Scene();
    applyLightMode(scene, null, "night");
    expect([sky(scene), kinds(scene)]).toEqual([1, ["ambient", "moon"]]);
    applyLightMode(scene, null, "night");
    expect(sky(scene)).toBe(1);
    applyLightMode(scene, null, "day");
    expect([sky(scene), kinds(scene)]).toEqual([0, ["hemi", "key"]]);
    applyLightMode(scene, null, "night");
    expect([sky(scene), kinds(scene)]).toEqual([1, ["ambient", "moon"]]);
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
});
