/**
 * Ticket 074 B: the asset gallery's viewer. No WebGL, no DOM, no asset file: the surface, the frame clock, the controls and both loaders are fakes, and the packs are small typed-in
 * manifests with hand-made scenes. Nothing here reads `assets/`.
 */
import { BoxGeometry, Color, Group, MathUtils, Mesh, MeshStandardMaterial, NearestFilter, Object3D, PerspectiveCamera, Texture, Vector3, Scene, type Light } from "three";
import { describe, expect, it, vi } from "vitest";
import type { AssetEntry, AssetManifest, AssetPack } from "../core";
import {
  MODULE_M,
  PERSON_GAP_M,
  PERSON_HEIGHT_M,
  PERSON_RADIUS_M,
  THUMB_PX,
  buildAssetScene,
  createAssetGallery,
  inspectMarkers,
  thumbCamera,
  type ViewerControls,
  type ViewerSurface,
} from "./assetviewer";
import { applyLightMode, sceneLightMode } from "./lightrig";
import { createAssetGallery as exported } from "./index";

function entry(name: string, size: readonly [number, number, number], over: Partial<AssetEntry> = {}): AssetEntry {
  return {
    name,
    source: `${name}.fbx`,
    bounds: { min: [-size[0] / 2, 0, -size[2] / 2], max: [size[0] / 2, size[1], size[2] / 2] },
    triangles: 100,
    textures: ["atlas.png"],
    missingTextures: [],
    warnings: [],
    ...over,
  };
}
function pack(id: string, assets: AssetEntry[]): AssetPack {
  return { pack: id, glb: `${id}.glb`, atlas: null, assets, failures: [] };
}

const MANIFEST: AssetManifest = {
  version: 1,
  generatedAt: "2026-11-22T00:00:00Z",
  blenderVersion: "x",
  packs: [
    pack("alpha", [entry("SM_A1", [1, 2, 1]), entry("SM_A2", [2, 1, 2]), entry("SM_A3", [1, 1, 1]), entry("SM_Missing", [1, 1, 1])]),
    pack("beta", [entry("SM_B1", [3, 3, 3])]),
  ],
};

interface Spies {
  geometries: BoxGeometry[];
  materials: MeshStandardMaterial[];
  textures: Texture[];
}

/** A scene of named roots standing in for a pack's GLB, with every geometry, material and texture spied on. */
function fakeGlb(names: string[], spies: Spies): Object3D {
  const scene = new Group();
  for (const n of names) {
    const g = new BoxGeometry(1, 1, 1);
    const t = new Texture();
    const m = new MeshStandardMaterial({ map: t });
    vi.spyOn(g, "dispose");
    vi.spyOn(m, "dispose");
    vi.spyOn(t, "dispose");
    spies.geometries.push(g);
    spies.materials.push(m);
    spies.textures.push(t);
    const root = new Group();
    root.name = n;
    root.add(new Mesh(g, m));
    scene.add(root);
  }
  return scene;
}

interface Rig {
  surface: ViewerSurface & { drawn: string[]; sceneCounts: number[]; renders: number; clears: number; resizes: number; disposed: boolean; aspectValue: number };
  frames: (() => void)[];
  nextFrame(): boolean;
  controls: { created: number; disposed: number; onChange: (() => void) | null; target: Vector3 | null };
  revoked: string[];
  fetchJson: ReturnType<typeof vi.fn>;
  loadGlb: ReturnType<typeof vi.fn>;
  spies: Spies;
  gallery: ReturnType<typeof createAssetGallery>;
}

function rig(opts: { manifest?: unknown; reject?: boolean; glbs?: Record<string, string[]>; glbGate?: Record<string, Promise<void>>; thumbGate?: () => Promise<void> } = {}): Rig {
  const spies: Spies = { geometries: [], materials: [], textures: [] };
  const frames: (() => void)[] = [];
  let urlN = 0;
  const surface = {
    drawn: [] as string[],
    sceneCounts: [] as number[],
    renders: 0,
    clears: 0,
    resizes: 0,
    disposed: false,
    aspectValue: 1.5,
    aspect() {
      return this.aspectValue;
    },
    resize() {
      this.resizes++;
    },
    render() {
      this.renders++;
    },
    clear() {
      this.clears++;
    },
    async thumb(scene: Scene): Promise<string> {
      const clones = scene.children.filter((c) => (c as Light).isLight !== true);
      this.sceneCounts.push(clones.length);
      this.drawn.push(clones.map((c) => c.name).join(","));
      if (opts.thumbGate) await opts.thumbGate();
      return `blob:thumb-${urlN++}`;
    },
    dispose() {
      this.disposed = true;
    },
  };
  const controls: Rig["controls"] = { created: 0, disposed: 0, onChange: null, target: null };
  const revoked: string[] = [];
  const fetchJson = vi.fn(async (): Promise<unknown> => {
    if (opts.reject) throw new Error("HTTP 404");
    return opts.manifest ?? MANIFEST;
  });
  const glbs = opts.glbs ?? { "alpha.glb": ["SM_A1", "SM_A2", "SM_A3"], "beta.glb": ["SM_B1"] };
  const loadGlb = vi.fn(async (url: string): Promise<Object3D> => {
    const file = url.slice(url.lastIndexOf("/") + 1);
    const gate = opts.glbGate?.[file];
    if (gate) await gate;
    const names = glbs[file];
    if (names === undefined) throw new Error("HTTP 404");
    return fakeGlb(names, spies);
  });
  const gallery = createAssetGallery({} as HTMLCanvasElement, {
    dir: "/x/",
    fetchJson,
    loadGlb,
    surface,
    requestFrame: (cb) => frames.push(cb),
    cancelFrame: (id) => {
      frames[id - 1] = () => {};
    },
    controls: (_camera, _el, target, onChange): ViewerControls => {
      controls.created++;
      controls.target = target.clone();
      controls.onChange = onChange;
      return { dispose: () => void controls.disposed++ };
    },
    revokeUrl: (u) => void revoked.push(u),
  });
  return {
    surface,
    frames,
    nextFrame() {
      const cb = frames.shift();
      if (!cb) return false;
      cb();
      return true;
    },
    controls,
    revoked,
    fetchJson,
    loadGlb,
    spies,
    gallery,
  };
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

/** Runs frames until none is waiting, letting each draw settle. */
async function drain(r: Rig): Promise<void> {
  for (let i = 0; i < 50; i++) {
    await flush();
    if (!r.nextFrame()) {
      await flush();
      if (r.frames.length === 0) return;
    }
  }
}

describe("packs and problem", () => {
  it("fetches the manifest once and lists every pack in manifest order", async () => {
    const r = rig();
    const [a, b] = await Promise.all([r.gallery.packs(), r.gallery.packs()]);
    expect(r.fetchJson).toHaveBeenCalledTimes(1);
    expect(r.fetchJson).toHaveBeenCalledWith("/x/manifest.json");
    expect(a.map((p) => p.pack)).toEqual(["alpha", "beta"]);
    expect(b).toBe(a);
    await r.gallery.packs();
    expect(r.fetchJson).toHaveBeenCalledTimes(1);
    expect(r.gallery.problem()).toBeNull();
  });

  it("resolves to [] with one readable line when there is no manifest, and never rejects", async () => {
    const r = rig({ reject: true });
    await expect(r.gallery.packs()).resolves.toEqual([]);
    const line = r.gallery.problem();
    expect(line).toContain("/x/manifest.json");
    expect(line).toContain("HTTP 404");
    expect(line).not.toContain("\n");
  });

  it("resolves to [] with a line when the manifest is not the version this build reads", async () => {
    const r = rig({ manifest: { version: 99, packs: [] } });
    await expect(r.gallery.packs()).resolves.toEqual([]);
    expect(r.gallery.problem()).toContain("not the version");
    const r2 = rig({ manifest: "<html>" });
    await expect(r2.gallery.packs()).resolves.toEqual([]);
    expect(r2.gallery.problem()).not.toBeNull();
  });

  it("answers a page once packs() has resolved, and an unknown pack gives an empty page", async () => {
    const r = rig();
    const q = { pack: "alpha", text: "", use: "any", flag: "any", page: 1 } as const;
    expect(r.gallery.page(q).total).toBe(0);
    await r.gallery.packs();
    expect(r.gallery.page(q).pieces.map((p) => p.name)).toEqual(["SM_A1", "SM_A2", "SM_A3", "SM_Missing"]);
    expect(r.gallery.page({ ...q, pack: "nope" }).total).toBe(0);
  });

  it("is exported from the render3d index", () => {
    expect(exported).toBe(createAssetGallery);
  });
});

describe("loadPack", () => {
  it("fetches only the asked pack's GLB, and loading the loaded pack fetches nothing", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    expect(r.loadGlb.mock.calls.map((c) => c[0])).toEqual(["/x/alpha.glb"]);
    await r.gallery.loadPack("alpha");
    expect(r.loadGlb).toHaveBeenCalledTimes(1);
  });

  it("frees the loaded pack before fetching the next: geometry, material, texture, and every thumbnail URL", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    const t = r.gallery.thumbnail("alpha:SM_A1");
    await drain(r);
    const url = await t;
    expect(url).toBe("blob:thumb-0");
    const order: string[] = [];
    r.loadGlb.mockImplementationOnce(async () => {
      // by the time the next fetch starts, the old pack is already freed
      order.push(`geo ${r.spies.geometries.every((g) => (g.dispose as ReturnType<typeof vi.fn>).mock.calls.length === 1)}`);
      order.push(`tex ${r.spies.textures.every((x) => (x.dispose as ReturnType<typeof vi.fn>).mock.calls.length === 1)}`);
      order.push(`url ${r.revoked.includes("blob:thumb-0")}`);
      return fakeGlb(["SM_B1"], r.spies);
    });
    await r.gallery.loadPack("beta");
    expect(order).toEqual(["geo true", "tex true", "url true"]);
    for (const m of r.spies.materials.slice(0, 3)) expect(m.dispose).toHaveBeenCalledTimes(1);
  });

  it("leaves only the last pack loaded after two quick switches", async () => {
    let releaseAlpha!: () => void;
    const r = rig({ glbGate: { "alpha.glb": new Promise<void>((res) => (releaseAlpha = res)) } });
    const first = r.gallery.loadPack("alpha");
    await flush();
    const second = r.gallery.loadPack("beta");
    await second;
    releaseAlpha();
    await first;
    // alpha parsed late and was thrown away: its pieces are freed and cannot be drawn
    // (beta parsed first, so its geometry is the first made; alpha's three are freed, beta's is held)
    expect(r.spies.geometries.map((g) => (g.dispose as ReturnType<typeof vi.fn>).mock.calls.length)).toEqual([0, 1, 1, 1]);
    await expect(r.gallery.thumbnail("alpha:SM_A1")).resolves.toBeNull();
    const t = r.gallery.thumbnail("beta:SM_B1");
    await drain(r);
    await expect(t).resolves.toBe("blob:thumb-0");
  });

  it("rejects with the pack and the reason when the GLB cannot be fetched or parsed, and holds nothing", async () => {
    const r = rig({ glbs: { "beta.glb": ["SM_B1"] } });
    await expect(r.gallery.loadPack("alpha")).rejects.toThrow(/alpha: HTTP 404/);
    await expect(r.gallery.thumbnail("alpha:SM_A1")).resolves.toBeNull();
    await expect(r.gallery.loadPack("nope")).rejects.toThrow(/nope/);
    const bad = rig({ reject: true });
    await expect(bad.gallery.loadPack("alpha")).rejects.toThrow(/alpha:.*manifest/);
  });
});

describe("thumbnails", () => {
  it("draws one per animation frame, in the order asked, with exactly one piece in the scene while it draws", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    const ps = ["alpha:SM_A3", "alpha:SM_A1", "alpha:SM_A2"].map((k) => r.gallery.thumbnail(k as never));
    expect(r.frames).toHaveLength(1); // one frame asked, not three
    r.nextFrame();
    await flush();
    expect(r.surface.drawn).toEqual(["SM_A3"]); // one per frame
    expect(r.frames).toHaveLength(1);
    await drain(r);
    expect(await Promise.all(ps)).toEqual(["blob:thumb-0", "blob:thumb-1", "blob:thumb-2"]);
    expect(r.surface.drawn).toEqual(["SM_A3", "SM_A1", "SM_A2"]);
    expect(r.surface.sceneCounts).toEqual([1, 1, 1]);
    // removed again once drawn: the scene holds no piece between draws
    r.gallery.thumbnail("alpha:SM_A1");
    expect(r.surface.sceneCounts).toHaveLength(3);
  });

  it("draws the same key once and caches it", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    const a = r.gallery.thumbnail("alpha:SM_A1");
    const b = r.gallery.thumbnail("alpha:SM_A1");
    await drain(r);
    expect(await a).toBe(await b);
    const c = await r.gallery.thumbnail("alpha:SM_A1");
    expect(c).toBe("blob:thumb-0");
    expect(r.surface.drawn).toEqual(["SM_A1"]);
    expect(r.frames).toHaveLength(0);
  });

  it("cancelThumbnails resolves every waiting promise to null and draws none of them", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    const ps = ["alpha:SM_A1", "alpha:SM_A2", "alpha:SM_A3"].map((k) => r.gallery.thumbnail(k as never));
    r.gallery.cancelThumbnails();
    expect(await Promise.all(ps)).toEqual([null, null, null]);
    await drain(r);
    expect(r.surface.drawn).toEqual([]);
    // a later ask draws normally
    const p = r.gallery.thumbnail("alpha:SM_A2");
    await drain(r);
    expect(await p).toBe("blob:thumb-0");
  });

  it("resolves to null for a key whose root is not in the GLB, and carries on with the next", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    const miss = r.gallery.thumbnail("alpha:SM_Missing");
    const ok = r.gallery.thumbnail("alpha:SM_A1");
    await drain(r);
    expect(await miss).toBeNull();
    expect(await ok).toBe("blob:thumb-0");
    expect(r.surface.drawn).toEqual(["SM_A1"]);
    await expect(r.gallery.thumbnail("beta:SM_B1")).resolves.toBeNull(); // not the loaded pack
  });

  it("revokes a thumbnail that finishes after its pack was freed, and keeps no URL", async () => {
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    const r = rig({ thumbGate: () => gate });
    await r.gallery.loadPack("alpha");
    const p = r.gallery.thumbnail("alpha:SM_A1");
    r.nextFrame();
    await flush();
    const next = r.gallery.loadPack("beta");
    release();
    await next;
    await expect(p).resolves.toBeNull();
    expect(r.revoked).toContain("blob:thumb-0");
  });

  it("applies nearest filtering to the drawn piece's textures, as the city draws them", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    r.gallery.thumbnail("alpha:SM_A1");
    await drain(r);
    expect(r.spies.textures[0]!.magFilter).toBe(NearestFilter);
    expect(r.spies.textures[0]!.minFilter).toBe(NearestFilter);
  });
});

describe("thumbCamera", () => {
  const SIZES: [string, [number, number, number]][] = [
    ["a 0.1 m sign", [0.1, 0.1, 0.02]],
    ["a 5 m floor piece", [5, 0.3, 5]],
    ["a 73 m cable", [73, 2, 1]],
    ["a scale-suspect 182 m character", [100, 182, 100]],
    ["a pole", [1.5, 5.1, 1.2]],
  ];
  for (const [label, size] of SIZES) {
    for (const aspect of [THUMB_PX.w / THUMB_PX.h, 1, 2.2]) {
      it(`keeps all eight corners of ${label} inside the view with a 5% margin (aspect ${aspect.toFixed(2)})`, () => {
        const f = thumbCamera(size, aspect);
        const cam = new PerspectiveCamera(f.fov, aspect, f.near, f.far);
        cam.position.set(...f.position);
        cam.lookAt(...f.target);
        cam.updateProjectionMatrix();
        cam.updateMatrixWorld(true);
        let worst = 0;
        for (const sx of [-1, 1]) {
          for (const sy of [0, 1]) {
            for (const sz of [-1, 1]) {
              const p = new Vector3((sx * size[0]) / 2, sy * size[1], (sz * size[2]) / 2).project(cam);
              worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y));
              expect(p.z).toBeGreaterThan(-1);
              expect(p.z).toBeLessThan(1);
            }
          }
        }
        expect(worst).toBeLessThanOrEqual(0.95 + 1e-6);
        expect(worst).toBeGreaterThan(0.9); // framed tightly, not just far away
      });
    }
  }

  it("stands on the piece's own +z, 30 degrees up and 35 degrees round toward +x, looking at the centre of its bounds", () => {
    const f = thumbCamera([2, 4, 6], 1.5);
    expect(f.target).toEqual([0, 2, 0]);
    const d = new Vector3(...f.position).sub(new Vector3(...f.target));
    expect(MathUtils.radToDeg(Math.asin(d.y / d.length()))).toBeCloseTo(30, 6);
    expect(MathUtils.radToDeg(Math.atan2(d.x, d.z))).toBeCloseTo(35, 6);
    expect(d.z).toBeGreaterThan(0);
    expect(d.x).toBeGreaterThan(0);
  });
});

describe("inspectMarkers", () => {
  it("places a 5 x 5 m module square on the ground, centred under the piece", () => {
    const m = inspectMarkers([2, 3, 4]);
    expect(m.module.side_m).toBe(MODULE_M);
    expect(MODULE_M).toBe(5);
    expect(m.module.corners).toEqual([
      [-2.5, 0, -2.5],
      [2.5, 0, -2.5],
      [2.5, 0, 2.5],
      [-2.5, 0, 2.5],
    ]);
    expect(inspectMarkers([60, 1, 1]).module.corners).toEqual(m.module.corners); // a module is a module, whatever the piece
  });

  it("stands a 1.8 m person 0.5 m clear of the bounds on +x", () => {
    expect(PERSON_HEIGHT_M).toBe(1.8);
    expect(PERSON_GAP_M).toBe(0.5);
    for (const w of [0.1, 2, 73]) {
      const p = inspectMarkers([w, 3, 4]).person;
      expect(p.height_m).toBe(1.8);
      expect(p.base[1]).toBe(0);
      expect(p.base[2]).toBe(0);
      expect(p.base[0] - p.radius_m - w / 2).toBeCloseTo(0.5, 12);
    }
    expect(inspectMarkers([2, 3, 4]).person.base[0]).toBeCloseTo(1 + 0.5 + PERSON_RADIUS_M, 12);
  });

  it("puts a front arrow on the ground at the +z edge, pointing along +z", () => {
    const { segments } = inspectMarkers([2, 3, 4]).front;
    expect(segments).toHaveLength(3);
    const [shaft, wingL, wingR] = segments;
    expect(shaft![0]).toEqual([0, 0, 2.1]); // 0.1 m clear of the +z edge (d / 2 = 2)
    expect(shaft![1][2]).toBeCloseTo(2.6, 12); // 0.5 m long: a tenth of 4 m is under the 0.5 m floor
    for (const [a, b] of segments) {
      expect(a[1]).toBe(0);
      expect(b[1]).toBe(0);
    }
    expect(wingL![0]).toEqual(shaft![1]);
    expect(wingR![0]).toEqual(shaft![1]);
    expect(wingL![1][2]).toBeLessThan(shaft![1][2]);
    expect(wingL![1][0]).toBe(-wingR![1][0]);
    // a long piece gets a longer arrow, to a cap of 3 m
    expect(inspectMarkers([73, 2, 1]).front.segments[0]![1][2]).toBeCloseTo(0.5 + 0.1 + 3, 12);
  });

  it("builds none of them from a pack piece: the pure function names no key and holds only numbers", () => {
    expect(JSON.stringify(inspectMarkers([1, 1, 1]))).not.toMatch(/[A-Za-z_]+:[A-Za-z_]/);
  });
});

describe("the scene", () => {
  it("is lit by the light rig's day mode, as the city is by day: its sun and hemisphere light and sky, no lights of its own", () => {
    const s = buildAssetScene();
    const lights: Light[] = [];
    s.traverse((o) => {
      if ((o as Light).isLight === true) lights.push(o as Light);
    });
    expect(lights.map((l) => String(l.userData["lightRig"])).sort()).toEqual(["hemi", "key"]);
    expect(sceneLightMode(s)).toBe("day");
    const ref = new Scene();
    applyLightMode(ref, null, "day");
    expect((s.background as Color).getHex()).toBe((ref.background as Color).getHex());
  });

  it("draws pieces in metres: the clone is unscaled, at the GLB's own orientation", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    const seen: Object3D[] = [];
    const orig = r.surface.thumb.bind(r.surface);
    r.surface.thumb = async (scene, camera) => {
      seen.push(...scene.children.filter((c) => c.name === "SM_A1"));
      return orig(scene, camera);
    };
    r.gallery.thumbnail("alpha:SM_A1");
    await drain(r);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.scale.toArray()).toEqual([1, 1, 1]);
    expect(seen[0]!.rotation.toArray().slice(0, 3).map((v) => Math.abs(v as number))).toEqual([0, 0, 0]);
  });
});

describe("inspect", () => {
  it("is false for a piece not in the loaded GLB, and starts orbit about the bounds' centre for one that is", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    expect(r.gallery.inspect("alpha:SM_Missing")).toBe(false);
    expect(r.gallery.inspect("beta:SM_B1")).toBe(false);
    expect(r.controls.created).toBe(0);
    expect(r.gallery.inspect("alpha:SM_A1")).toBe(true);
    expect(r.controls.created).toBe(1);
    expect(r.controls.target!.toArray()).toEqual([0, 1, 0]); // SM_A1 is 1 x 2 x 1, base centre at the origin
  });

  it("renders only on a control change or a resize, and stops on closeInspect", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    r.gallery.inspect("alpha:SM_A1");
    expect(r.surface.renders).toBe(0);
    r.nextFrame();
    expect(r.surface.renders).toBe(1); // the first view
    expect(r.frames).toHaveLength(0); // no loop: nothing is waiting
    r.controls.onChange!();
    r.controls.onChange!();
    expect(r.frames).toHaveLength(1); // coalesced to one frame
    r.nextFrame();
    expect(r.surface.renders).toBe(2);
    r.gallery.resize();
    r.nextFrame();
    expect(r.surface.renders).toBe(3);
    expect(r.frames).toHaveLength(0);
    r.controls.onChange!();
    r.gallery.closeInspect();
    expect(r.controls.disposed).toBe(1);
    expect(r.surface.clears).toBe(1);
    r.nextFrame();
    expect(r.surface.renders).toBe(3); // the waiting frame was cancelled
    r.gallery.resize();
    expect(r.frames).toHaveLength(0); // nothing to redraw once closed
  });

  it("closes the inspect view when its pack is freed", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    r.gallery.inspect("alpha:SM_A2");
    await r.gallery.loadPack("beta");
    expect(r.controls.disposed).toBe(1);
  });

  it("dispose frees the pack, the thumbnails and the renderer, and then does nothing", async () => {
    const r = rig();
    await r.gallery.loadPack("alpha");
    r.gallery.thumbnail("alpha:SM_A1");
    await drain(r);
    r.gallery.inspect("alpha:SM_A1");
    r.gallery.dispose();
    expect(r.surface.disposed).toBe(true);
    expect(r.revoked).toContain("blob:thumb-0");
    expect(r.controls.disposed).toBe(1);
    expect(r.spies.geometries.every((g) => (g.dispose as ReturnType<typeof vi.fn>).mock.calls.length >= 1)).toBe(true);
    await expect(r.gallery.thumbnail("alpha:SM_A1")).resolves.toBeNull();
    expect(r.gallery.inspect("alpha:SM_A1")).toBe(false);
    r.gallery.dispose();
  });
});
