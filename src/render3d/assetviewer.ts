/**
 * The asset gallery's viewer (ticket 074, section B): the three half of `AssetGallery` (src/core/assetgallery.ts), on the catalogue's pure half (`assetcatalogue.ts`).
 * `createAssetGallery(canvas, deps?)` gives the page one object: it reads the manifest once, holds ONE pack's GLB at a time (the old one is freed before the next is fetched),
 * draws thumbnails one per animation frame for the cards the page asks for, and shows one piece large with orbit, a 5 m module square, a 1.8 m person marker and its +z front marked.
 *
 * Licence and load (Josh, 16 and 17 Nov 2026): nothing from the packs is saved. Thumbnails are in-memory object URLs, revoked when the pack is freed; no file is written, downloaded or sent.
 * One WebGL renderer, made on first use. Nothing renders unless a thumbnail is being drawn or the inspect view is open and has just moved. Dev only: the page that calls this is behind
 * `import.meta.env.DEV` (section C); this module reads `assets/private/out/` by URL at run time, as `models3d.ts` does.
 *
 * Pure parts (no WebGL, tested without one): `thumbCamera`, `inspectMarkers`, `buildAssetScene`. The rest takes its WebGL, frame clock, controls and loaders through `AssetViewerDeps`, so
 * tests pass fakes. The orbit on the viewer's own canvas is the one input `src/render3d/` takes here, as the 045 gallery's clicks were.
 */

import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type AssetEntry, type AssetGallery, type AssetGalleryPack, type AssetGalleryPage, type AssetGalleryPiece, type AssetGalleryQuery, type AssetManifest, type CalibrationKey } from "../core";
import { assetGalleryPacks, assetGalleryPage, assetGalleryPieces } from "./assetcatalogue";
import { applyLightMode, setRendererMode, type RigRenderer } from "./lightrig";
import { isManifest, sizeOf } from "./models";
import { defaultDir, nearestTextures } from "./models3d";

// ---- pure: the framing and the markers ----

type V3 = readonly [number, number, number];

/** A camera placement: where it stands, what it looks at, and its lens. Metres. */
export interface FrameCamera {
  position: V3;
  target: V3;
  /** Vertical field of view, degrees. */
  fov: number;
  near: number;
  far: number;
}

/** Thumbnail framing: from three-quarters in front of the piece (on its own +z), 30 degrees up, 35 degrees round toward +x. */
export const THUMB_ELEVATION_DEG = 30;
export const THUMB_AZIMUTH_DEG = 35;
/** Vertical field of view of every view here, degrees. */
export const VIEW_FOV_DEG = 30;
/** The share of the half-view left free round the framed bounds (5%). */
export const FRAME_MARGIN = 0.05;
/** A thumbnail's pixel size, and so its aspect. The page shows each as an `<img>`. */
export const THUMB_PX = { w: 256, h: 192 } as const;

const rad = (deg: number): number => (deg * Math.PI) / 180;
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Frame the box `min`..`max` from the thumbnail angle so that all eight corners are inside the view with `FRAME_MARGIN` to spare. Closed form: the least distance that fits every corner. */
function frameBox(min: V3, max: V3, aspect: number): FrameCamera {
  const centre: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const el = rad(THUMB_ELEVATION_DEG);
  const az = rad(THUMB_AZIMUTH_DEG);
  const dir: V3 = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]; // from the target toward the camera
  const rn = Math.hypot(dir[2], dir[0]);
  const right: V3 = [dir[2] / rn, 0, -dir[0] / rn];
  // up = dir x right (a unit vector, since dir and right are perpendicular unit vectors)
  const upv: V3 = [dir[1] * right[2] - dir[2] * right[1], dir[2] * right[0] - dir[0] * right[2], dir[0] * right[1] - dir[1] * right[0]];
  const tv = Math.tan(rad(VIEW_FOV_DEG) / 2) * (1 - FRAME_MARGIN);
  const th = tv * (Number.isFinite(aspect) && aspect > 0 ? aspect : 1);
  const hx = (max[0] - min[0]) / 2;
  const hy = (max[1] - min[1]) / 2;
  const hz = (max[2] - min[2]) / 2;
  let dist = 1e-3;
  let radius = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const c: V3 = [sx * hx, sy * hy, sz * hz];
        const p = dot(c, dir);
        dist = Math.max(dist, Math.abs(dot(c, right)) / th + p, Math.abs(dot(c, upv)) / tv + p, p + 1e-3);
        radius = Math.max(radius, Math.hypot(hx, hy, hz));
      }
    }
  }
  return {
    position: [centre[0] + dir[0] * dist, centre[1] + dir[1] * dist, centre[2] + dir[2] * dist],
    target: centre,
    fov: VIEW_FOV_DEG,
    near: dist * 0.01,
    far: dist + radius * 2 + 1,
  };
}

/**
 * Where a thumbnail's camera stands for a piece of `size_m` (width, height, depth) whose base centre is the origin: from three-quarters in front, on its own +z, 30 degrees up and 35 degrees
 * round, looking at the centre of its bounds. All eight corners of the bounds fall inside the view with at least a 5% margin, for any size (a 0.1 m sign, a 73 m cable, a 182 m `scale-suspect` character).
 */
export function thumbCamera(size_m: V3, aspect: number): FrameCamera {
  const [w, h, d] = size_m;
  return frameBox([-w / 2, 0, -d / 2], [w / 2, h, d / 2], aspect);
}

/** The module square's side, the person's height and the gap the person stands clear of the bounds, metres. */
export const MODULE_M = 5;
export const PERSON_HEIGHT_M = 1.8;
export const PERSON_RADIUS_M = 0.25;
export const PERSON_GAP_M = 0.5;

export interface InspectMarkers {
  /** The 5 x 5 m module outline on the ground, centred under the piece: four corners in order round (y = 0). */
  module: { side_m: number; corners: readonly [V3, V3, V3, V3] };
  /** The 1.8 m person: where its base stands (on the ground, 0.5 m clear of the bounds on +x) and its size. */
  person: { height_m: number; radius_m: number; base: V3 };
  /** The front arrow on the ground at the bounds' +z edge: the segments of its shaft and head, in pairs, pointing along +z. */
  front: { segments: readonly [V3, V3][] };
}

/**
 * The three code-drawn markers of the inspect view for a piece of `size_m` (its base centre at the origin). None is a pack piece. The arrow starts 0.1 m clear of the +z edge and is
 * a tenth of the larger footprint side long (at least 0.5 m, at most 3 m), with a head a third of its length.
 */
export function inspectMarkers(size_m: V3): InspectMarkers {
  const [w, , d] = size_m;
  const h = MODULE_M / 2;
  const len = Math.min(3, Math.max(0.5, Math.max(w, d) / 10));
  const z0 = d / 2 + 0.1;
  const z1 = z0 + len;
  const head = len / 3;
  return {
    module: {
      side_m: MODULE_M,
      corners: [
        [-h, 0, -h],
        [h, 0, -h],
        [h, 0, h],
        [-h, 0, h],
      ],
    },
    person: { height_m: PERSON_HEIGHT_M, radius_m: PERSON_RADIUS_M, base: [w / 2 + PERSON_GAP_M + PERSON_RADIUS_M, 0, 0] },
    front: {
      segments: [
        [[0, 0, z0], [0, 0, z1]],
        [[0, 0, z1], [-head, 0, z1 - head]],
        [[0, 0, z1], [head, 0, z1 - head]],
      ],
    },
  };
}

/** Sets the renderer's tone mapping and exposure as the city shows its day view (the rig's day mode, as the plan view does), so a piece is exposed as it will look in the city. */
export function configureRenderer(gl: RigRenderer): void {
  setRendererMode(gl, "day");
}

/** A scene lit by the light rig's day mode, as the city is by day (one sun, one hemisphere light, the rig's sky background), and nothing else. Units are metres (1 world unit = 1 m). */
export function buildAssetScene(): Scene {
  const scene = new Scene();
  applyLightMode(scene, null, "day");
  return scene;
}

// ---- seams ----

/** What the viewer draws with. The default is one WebGL renderer on the page's canvas; tests pass a fake. */
export interface ViewerSurface {
  /** Width over height of the large view. */
  aspect(): number;
  /** Sizes the large view to its canvas. */
  resize(): void;
  /** Draws the large view. */
  render(scene: Scene, camera: PerspectiveCamera): void;
  /** Blanks the large view. */
  clear(): void;
  /** Draws one thumbnail (`THUMB_PX`, off screen) and resolves to its in-memory object URL. */
  thumb(scene: Scene, camera: PerspectiveCamera): Promise<string>;
  dispose(): void;
}

/** Orbit controls on the viewer's canvas. */
export interface ViewerControls {
  dispose(): void;
}

export interface AssetViewerDeps {
  /** Resolves to parsed JSON; rejects on a network error, a non-OK status or a body that is not JSON. Default: `fetch`. */
  fetchJson?: (url: string) => Promise<unknown>;
  /** Resolves to a GLB's scene; rejects if it cannot be fetched or parsed. Default: three's `GLTFLoader`. */
  loadGlb?: (url: string) => Promise<Object3D>;
  /** Folder of the manifest and the GLBs, ending in "/". Default: `defaultDir()`. */
  dir?: string;
  /** Default: one `WebGLRenderer` on the canvas, made on first use. */
  surface?: ViewerSurface;
  /** The frame clock. Default: `requestAnimationFrame`. */
  requestFrame?: (cb: () => void) => number;
  cancelFrame?: (id: number) => void;
  /** Orbit about `target`, calling `onChange` when the camera moved. Default: three's `OrbitControls`. */
  controls?: (camera: PerspectiveCamera, element: HTMLElement, target: Vector3, onChange: () => void) => ViewerControls;
  /** Frees a thumbnail's object URL. Default: `URL.revokeObjectURL`. */
  revokeUrl?: (url: string) => void;
}

// ---- freeing ----

/** Frees every geometry, material and texture under `root`, best effort. Safe to call twice. */
export function disposeObject(root: Object3D): void {
  const seen = new Set<unknown>();
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.geometry && !seen.has(mesh.geometry)) {
      seen.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const mat = mesh.material as Material | Material[] | undefined;
    if (!mat) return;
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      if (seen.has(m)) continue;
      seen.add(m);
      for (const v of Object.values(m)) {
        if (!(v instanceof Texture) || seen.has(v)) continue;
        seen.add(v);
        const data = (v.source as { data?: unknown } | undefined)?.data as { close?: () => void } | undefined;
        v.dispose();
        if (data && typeof data.close === "function") data.close();
      }
      m.dispose();
    }
  });
}

// ---- the default surface ----

/** One WebGL renderer on the canvas, made on first use, with one off-screen target for the thumbnails. */
class WebGLSurface implements ViewerSurface {
  private renderer: WebGLRenderer | null = null;
  private target: WebGLRenderTarget | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  private ensure(): { renderer: WebGLRenderer; target: WebGLRenderTarget } {
    if (this.renderer === null || this.target === null) {
      const renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
      configureRenderer(renderer);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      const target = new WebGLRenderTarget(THUMB_PX.w, THUMB_PX.h, { samples: 4 });
      target.texture.colorSpace = SRGBColorSpace;
      this.renderer = renderer;
      this.target = target;
      this.resize();
    }
    return { renderer: this.renderer, target: this.target };
  }

  aspect(): number {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return w > 0 && h > 0 ? w / h : 1;
  }

  resize(): void {
    if (this.renderer === null) return;
    this.renderer.setSize(Math.max(1, this.canvas.clientWidth), Math.max(1, this.canvas.clientHeight), false);
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    const { renderer } = this.ensure();
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  clear(): void {
    if (this.renderer === null) return;
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
  }

  async thumb(scene: Scene, camera: PerspectiveCamera): Promise<string> {
    const { renderer, target } = this.ensure();
    const { w, h } = THUMB_PX;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const px = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(target, 0, 0, w, h, px);
    renderer.setRenderTarget(null);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (ctx === null) throw new Error("no 2d context for the thumbnail");
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
    if (blob === null) throw new Error("the thumbnail could not be encoded");
    return URL.createObjectURL(blob);
  }

  dispose(): void {
    this.target?.dispose();
    this.renderer?.dispose();
    this.target = null;
    this.renderer = null;
  }
}

function orbitControls(camera: PerspectiveCamera, element: HTMLElement, target: Vector3, onChange: () => void): ViewerControls {
  const c = new OrbitControls(camera, element);
  c.target.copy(target);
  c.enableDamping = false; // nothing moves on its own, so nothing renders on its own
  c.addEventListener("change", onChange);
  c.update();
  return { dispose: () => c.dispose() };
}

const describe = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// ---- the viewer ----

interface Waiting {
  key: CalibrationKey;
  resolve: (url: string | null) => void;
}

/**
 * The gallery's viewer on `canvas`. Nothing is made until it is asked: no renderer, no fetch. Never rejects from `packs()`; `loadPack` rejects with the pack and the reason.
 */
export function createAssetGallery(canvas: HTMLCanvasElement, deps: AssetViewerDeps = {}): AssetGallery {
  const dir = deps.dir ?? defaultDir();
  const fetchJson =
    deps.fetchJson ??
    (async (url: string): Promise<unknown> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  const loadGlb = deps.loadGlb ?? (async (url: string): Promise<Object3D> => (await new GLTFLoader().loadAsync(url)).scene);
  const surface: ViewerSurface = deps.surface ?? new WebGLSurface(canvas);
  const requestFrame = deps.requestFrame ?? ((cb: () => void) => requestAnimationFrame(cb));
  const cancelFrame = deps.cancelFrame ?? ((id: number) => cancelAnimationFrame(id));
  const makeControls = deps.controls ?? orbitControls;
  const revokeUrl = deps.revokeUrl ?? ((url: string) => URL.revokeObjectURL(url));

  // the manifest, read once
  let manifest: AssetManifest | null = null;
  let manifestRead: Promise<readonly AssetGalleryPack[]> | null = null;
  let problemLine: string | null = null;
  const piecesOf = new Map<string, readonly AssetGalleryPiece[]>();

  // the one loaded pack
  let loaded: { pack: string; scene: Object3D; entries: Map<string, AssetEntry> } | null = null;
  let loading: { pack: string; promise: Promise<void> } | null = null;
  let generation = 0;
  let disposed = false;

  // thumbnails
  const cache = new Map<CalibrationKey, string>();
  const pending = new Map<CalibrationKey, Promise<string | null>>();
  let queue: Waiting[] = [];
  let thumbFrame: number | null = null;
  let thumbBusy = false;
  const thumbScene = buildAssetScene();
  const thumbCam = new PerspectiveCamera();

  // inspect
  let inspecting: { clone: Object3D; markers: Group; controls: ViewerControls; camera: PerspectiveCamera; scene: Scene } | null = null;
  let inspectFrame: number | null = null;

  function packs(): Promise<readonly AssetGalleryPack[]> {
    if (manifestRead !== null) return manifestRead;
    const url = `${dir}manifest.json`;
    manifestRead = (async (): Promise<readonly AssetGalleryPack[]> => {
      let raw: unknown;
      try {
        raw = await fetchJson(url);
      } catch (e) {
        problemLine = `Asset gallery: no asset manifest at ${url} (${describe(e)}).`;
        return [];
      }
      if (!isManifest(raw)) {
        problemLine = `Asset gallery: the asset manifest at ${url} is not the version this build reads.`;
        return [];
      }
      manifest = raw as AssetManifest;
      return assetGalleryPacks(manifest);
    })();
    return manifestRead;
  }

  function page(q: AssetGalleryQuery): AssetGalleryPage {
    let pieces = piecesOf.get(q.pack);
    if (pieces === undefined) {
      pieces = manifest === null ? [] : assetGalleryPieces(manifest, q.pack);
      if (manifest !== null) piecesOf.set(q.pack, pieces);
    }
    return assetGalleryPage(pieces, q);
  }

  // ---- thumbnails ----

  function resolveWaiting(w: Waiting, url: string | null): void {
    pending.delete(w.key);
    w.resolve(url);
  }

  function cancelThumbnails(): void {
    const waiting = queue;
    queue = [];
    if (thumbFrame !== null) {
      cancelFrame(thumbFrame);
      thumbFrame = null;
    }
    for (const w of waiting) resolveWaiting(w, null);
  }

  function scheduleThumb(): void {
    if (thumbFrame !== null || thumbBusy || queue.length === 0 || disposed) return;
    thumbFrame = requestFrame(drawNext);
  }

  /** One thumbnail per animation frame: the next in the order asked, with exactly one clone in the scene while it draws. */
  function drawNext(): void {
    thumbFrame = null;
    const w = queue.shift();
    if (w === undefined || disposed) return;
    const gen = generation;
    const at = w.key.indexOf(":");
    const name = w.key.slice(at + 1);
    const root = loaded !== null && loaded.pack === w.key.slice(0, at) ? loaded.scene.getObjectByName(name) : undefined;
    const entry = loaded?.entries.get(name);
    if (root === undefined || entry === undefined) {
      resolveWaiting(w, null);
      scheduleThumb();
      return;
    }
    thumbBusy = true;
    void (async () => {
      const clone = root.clone(true);
      let url: string | null = null;
      try {
        nearestTextures(clone);
        thumbScene.add(clone);
        const f = thumbCamera(sizeOf(entry), THUMB_PX.w / THUMB_PX.h);
        thumbCam.fov = f.fov;
        thumbCam.aspect = THUMB_PX.w / THUMB_PX.h;
        thumbCam.near = f.near;
        thumbCam.far = f.far;
        thumbCam.position.set(...f.position);
        thumbCam.lookAt(...f.target);
        thumbCam.updateProjectionMatrix();
        thumbCam.updateMatrixWorld(true);
        url = await surface.thumb(thumbScene, thumbCam);
      } catch {
        url = null;
      } finally {
        thumbScene.remove(clone);
      }
      if (url !== null && (gen !== generation || disposed)) {
        revokeUrl(url);
        url = null;
      }
      if (url !== null) cache.set(w.key, url);
      resolveWaiting(w, url);
      thumbBusy = false;
      scheduleThumb();
    })();
  }

  function thumbnail(key: CalibrationKey): Promise<string | null> {
    const at = key.indexOf(":");
    if (disposed || loaded === null || loaded.pack !== key.slice(0, at)) return Promise.resolve(null);
    const cached = cache.get(key);
    if (cached !== undefined) return Promise.resolve(cached);
    const waiting = pending.get(key);
    if (waiting !== undefined) return waiting;
    const p = new Promise<string | null>((resolve) => {
      queue.push({ key, resolve });
    });
    pending.set(key, p);
    scheduleThumb();
    return p;
  }

  // ---- inspect ----

  function closeInspect(): void {
    if (inspectFrame !== null) {
      cancelFrame(inspectFrame);
      inspectFrame = null;
    }
    if (inspecting === null) return;
    const i = inspecting;
    inspecting = null;
    i.controls.dispose();
    i.scene.remove(i.clone, i.markers);
    i.markers.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      (m.material as Material | undefined)?.dispose();
    });
    surface.clear();
  }

  function requestInspectFrame(): void {
    if (inspectFrame !== null || inspecting === null || disposed) return;
    inspectFrame = requestFrame(() => {
      inspectFrame = null;
      if (inspecting === null || disposed) return;
      surface.render(inspecting.scene, inspecting.camera);
    });
  }

  function markerGroup(size: V3): Group {
    const m = inspectMarkers(size);
    const g = new Group();
    g.name = "asset-markers";
    const lines = (segs: readonly [V3, V3][], colour: number, y: number): LineSegments => {
      const geo = new BufferGeometry();
      geo.setAttribute("position", new Float32BufferAttribute(segs.flatMap(([a, b]) => [a[0], a[1] + y, a[2], b[0], b[1] + y, b[2]]), 3));
      return new LineSegments(geo, new LineBasicMaterial({ color: colour }));
    };
    const c = m.module.corners;
    g.add(lines([[c[0], c[1]], [c[1], c[2]], [c[2], c[3]], [c[3], c[0]]], 0xffffff, 0.01));
    g.add(lines(m.front.segments, 0xff7a00, 0.02));
    // the person: a body and a head, 1.8 m in all, plain flat colour
    const person = new Group();
    const mat = new MeshBasicMaterial({ color: 0x2d6cdf });
    const bodyH = m.person.height_m - m.person.radius_m * 2;
    const body = new Mesh(new CylinderGeometry(m.person.radius_m * 0.8, m.person.radius_m, bodyH, 12), mat);
    body.position.y = bodyH / 2;
    const head = new Mesh(new SphereGeometry(m.person.radius_m * 0.6, 12, 8), mat);
    head.position.y = m.person.height_m - m.person.radius_m * 0.6;
    person.add(body, head);
    person.position.set(...m.person.base);
    g.add(person);
    return g;
  }

  function inspect(key: CalibrationKey): boolean {
    const at = key.indexOf(":");
    if (disposed || loaded === null || loaded.pack !== key.slice(0, at)) return false;
    const name = key.slice(at + 1);
    const root = loaded.scene.getObjectByName(name);
    const entry = loaded.entries.get(name);
    if (root === undefined || entry === undefined) return false;
    closeInspect();
    const size = sizeOf(entry);
    const scene = buildAssetScene();
    const clone = root.clone(true);
    nearestTextures(clone);
    const markers = markerGroup(size);
    scene.add(clone, markers);
    // frame the piece and its person marker (the 5 m square may reach past the view; zoom out to see it all)
    const [w, h, d] = size;
    const m = inspectMarkers(size);
    const f = frameBox([-w / 2, 0, -d / 2], [m.person.base[0] + m.person.radius_m, Math.max(h, PERSON_HEIGHT_M), d / 2], surface.aspect());
    const camera = new PerspectiveCamera(f.fov, surface.aspect(), f.near, f.far * 4);
    camera.position.set(...f.position);
    const target = new Vector3(...f.target);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    const centreOfBounds = new Vector3(0, h / 2, 0); // orbit about the piece's own bounds centre
    surface.resize();
    const controls = makeControls(camera, canvas, centreOfBounds, requestInspectFrame);
    inspecting = { clone, markers, controls, camera, scene };
    requestInspectFrame();
    return true;
  }

  function resize(): void {
    if (disposed) return;
    surface.resize();
    if (inspecting !== null) {
      inspecting.camera.aspect = surface.aspect();
      inspecting.camera.updateProjectionMatrix();
      requestInspectFrame();
    }
  }

  // ---- packs ----

  function freeLoaded(): void {
    closeInspect();
    cancelThumbnails();
    for (const url of cache.values()) revokeUrl(url);
    cache.clear();
    if (loaded !== null) {
      disposeObject(loaded.scene);
      loaded = null;
    }
  }

  async function loadPack(pack: string): Promise<void> {
    if (disposed) throw new Error(`${pack}: the gallery is closed`);
    await packs();
    if (manifest === null) throw new Error(`${pack}: ${problemLine ?? "no asset manifest"}`);
    const entry = manifest.packs.find((p) => p.pack === pack);
    if (entry === undefined) throw new Error(`${pack}: not a pack of the manifest`);
    if (loading !== null && loading.pack === pack) return loading.promise;
    if (loading === null && loaded !== null && loaded.pack === pack) return;
    const gen = ++generation;
    freeLoaded();
    const entries = new Map(entry.assets.map((a) => [a.name, a] as const));
    const promise = (async (): Promise<void> => {
      let scene: Object3D;
      try {
        scene = await loadGlb(`${dir}${entry.glb}`);
      } catch (e) {
        if (gen !== generation) return; // a later switch took over; its result is the one that counts
        loading = null;
        throw new Error(`${pack}: ${describe(e)}`);
      }
      if (gen !== generation || disposed) {
        disposeObject(scene);
        return;
      }
      loaded = { pack, scene, entries };
      loading = null;
    })();
    loading = { pack, promise };
    return promise;
  }

  function dispose(): void {
    if (disposed) return;
    freeLoaded();
    generation++;
    loading = null;
    disposed = true;
    surface.dispose();
  }

  return {
    packs,
    problem: () => problemLine,
    page,
    loadPack,
    thumbnail,
    cancelThumbnails,
    inspect,
    closeInspect,
    resize,
    dispose,
  };
}
