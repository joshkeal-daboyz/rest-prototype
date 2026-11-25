/**
 * The light rig (ticket 060, section A): the only code that adds or removes a scene's global lights, background, fog, and a renderer's tone mapping and exposure.
 * `applyLightMode` puts a scene (and, when it is given one, a renderer) into a mode of `LIGHT_MODES`. Every light it adds is tagged `userData.lightRig`, so a second call finds
 * them: one with the same mode changes nothing, one with the other mode leaves exactly the other set. A scene's owners (`scene.ts`, `buildCityScene`) never add an ambient,
 * hemisphere or sun of their own; they ask for night here and hand over the code-drawn materials and the night-only parts (lamp lights, glows, pools) in a `LightOwners`.
 * Dev views may ask for day; the game never does.
 */

import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  NoToneMapping,
  type Group,
  type Light,
  type Material,
  type Object3D,
  type Scene,
} from "three";
import { LIGHT_MODES, SUN_DISTANCE, sunPosition, type LightModeId } from "./lighting";
import { NIGHT_SKY, moonDirection } from "./nightsky";
import { buildSky, disposeSky } from "./skydome";

/** What a scene hands the rig besides itself: the materials whose colour follows the mode (by surface key), and the parts that exist only at night. */
export interface LightOwners {
  materials: Map<string, Material[]>;
  nightOnly: Object3D[];
}

export function newLightOwners(): LightOwners {
  return { materials: new Map(), nightOnly: [] };
}

/** Register a code-drawn material under a surface key (`ground`, `yard`, `street`, `pavement`, `kerb`, `grass`). */
export function addSurface(owners: LightOwners, key: string, material: Material): void {
  const list = owners.materials.get(key);
  if (list) list.push(material);
  else owners.materials.set(key, [material]);
}

/** The part of a WebGLRenderer the rig sets. A test passes a plain object. */
export interface RigRenderer {
  toneMapping: number;
  toneMappingExposure: number;
  shadowMap?: { enabled: boolean };
}

type RigKind = "ambient" | "moon" | "key" | "hemi";

/** The mode a scene is in now (`userData.lightMode`), or undefined before the rig has touched it. */
export function sceneLightMode(scene: Scene): LightModeId | undefined {
  return scene.userData["lightMode"] as LightModeId | undefined;
}

/** Are a scene's night-only parts on? True until the rig puts the scene in a mode with `nightLights` off. Lamp updates read this every frame. */
export function nightLightsOn(scene: Scene): boolean {
  return scene.userData["nightLights"] !== false;
}

function rigLight(scene: Scene, kind: RigKind): Light | undefined {
  return scene.children.find((c) => c.userData["lightRig"] === kind) as Light | undefined;
}

/** Add the light of a kind when the mode has one and the scene has none, update it when it has, remove it when the mode has none. */
function ensure<T extends Light>(scene: Scene, kind: RigKind, wanted: boolean, make: () => T, set: (light: T) => void): void {
  const have = rigLight(scene, kind) as T | undefined;
  if (!wanted) {
    if (have) {
      scene.remove(have);
      have.dispose();
    }
    return;
  }
  const light = have ?? make();
  if (!have) {
    light.userData["lightRig"] = kind;
    light.name = `rig:${kind}`;
    scene.add(light);
  }
  set(light);
}

/** The sky's turn about the vertical now (degrees; 0 in play). */
function skyTurn(scene: Scene): number {
  return (scene.userData["skyTurn"] as number | undefined) ?? 0;
}

function placeMoonLight(l: Light, turn_deg: number): void {
  const d = moonDirection(turn_deg);
  l.position.set(d[0] * SUN_DISTANCE, d[1] * SUN_DISTANCE, d[2] * SUN_DISTANCE);
}

/** Add the one sky group when night wants it and the scene has none; remove and free it when the mode has none. */
function ensureSky(scene: Scene, wanted: boolean): void {
  const have = scene.children.find((c) => c.userData["lightRig"] === "sky") as Group | undefined;
  if (!wanted) {
    if (have) {
      scene.remove(have);
      disposeSky(have);
    }
    return;
  }
  if (have) return;
  const sky = buildSky();
  sky.rotation.y = (skyTurn(scene) * Math.PI) / 180;
  scene.add(sky);
}

/** Release the sky: remove the sky group and free its geometries, materials and textures. A view's dispose calls it (the light rig owns the sky, so the view does not free it itself). Safe with no sky. */
export function releaseSky(scene: Scene): void {
  ensureSky(scene, false);
}

/**
 * Turn the stars, the moon disc and the moon light together about the vertical (section T's splash and title; play never calls it, so its turn is 0). The light still comes from the disc.
 * A later `applyLightMode` keeps the turn.
 */
export function setSkyTurn(scene: Scene, degrees: number): void {
  scene.userData["skyTurn"] = degrees;
  const sky = scene.children.find((c) => c.userData["lightRig"] === "sky");
  if (sky) sky.rotation.y = (degrees * Math.PI) / 180;
  const moon = rigLight(scene, "moon");
  if (moon) placeMoonLight(moon, degrees);
}

/** Set a renderer's tone mapping, exposure and shadow switch for a mode (a view that has lights of its own, like the tile sheet, calls just this). */
export function setRendererMode(gl: RigRenderer, id: LightModeId): void {
  const mode = LIGHT_MODES[id];
  gl.toneMapping = mode.toneMapping === "aces" ? ACESFilmicToneMapping : NoToneMapping;
  gl.toneMappingExposure = mode.exposure;
  if (gl.shadowMap) gl.shadowMap.enabled = mode.shadows;
}

/**
 * Put `scene` in a mode: its background, no fog, its global lights, the colours of the registered code-drawn materials and the night-only parts; and `gl`'s tone mapping,
 * exposure and shadow switch when a renderer is given (a call while the scene is built passes none). Calling it again with the mode the scene is already in changes nothing.
 */
export function applyLightMode(scene: Scene, gl: RigRenderer | null, id: LightModeId, owners?: LightOwners): void {
  const mode = LIGHT_MODES[id];
  scene.userData["lightMode"] = id;
  scene.fog = null;
  if (scene.background instanceof Color) scene.background.setHex(mode.background);
  else scene.background = new Color(mode.background);

  ensure(
    scene,
    "ambient",
    mode.ambient !== null,
    () => new AmbientLight(0xffffff, 1),
    (l) => {
      l.color.setHex(mode.ambient!.color);
      l.intensity = mode.ambient!.intensity;
    },
  );
  ensure(
    scene,
    "moon",
    mode.sky,
    () => new DirectionalLight(0xffffff, 1),
    (l) => {
      l.color.setHex(NIGHT_SKY.moon.light);
      l.intensity = NIGHT_SKY.moon.intensity;
      placeMoonLight(l, skyTurn(scene));
    },
  );
  ensureSky(scene, mode.sky);
  ensure(
    scene,
    "key",
    mode.key !== null,
    () => new DirectionalLight(0xffffff, 1),
    (l) => {
      const k = mode.key!;
      l.color.setHex(k.color);
      l.intensity = k.intensity;
      const p = sunPosition(k.elevation_deg, k.azimuth_deg);
      l.position.set(p[0], p[1], p[2]);
      l.castShadow = mode.shadows;
    },
  );
  ensure(
    scene,
    "hemi",
    mode.hemi !== null,
    () => new HemisphereLight(0xffffff, 0x000000, 1),
    (l) => {
      l.color.setHex(mode.hemi!.sky);
      l.groundColor.setHex(mode.hemi!.ground);
      l.intensity = mode.hemi!.intensity;
    },
  );

  if (gl) setRendererMode(gl, id);

  if (owners) {
    for (const [key, mats] of owners.materials) {
      const hex = (mode.surfaces as Readonly<Record<string, number>>)[key];
      if (hex === undefined) continue;
      for (const m of mats) (m as { color?: Color }).color?.setHex(hex);
    }
    const wasOn = nightLightsOn(scene);
    if (!mode.nightLights && wasOn) {
      // Into day: remember what each night-only part showed, hide it, and put a lamp's light at 0.
      for (const o of owners.nightOnly) {
        o.userData["nightVisible"] = o.visible;
        o.visible = false;
        if ((o as Light).isLight === true) (o as Light).intensity = 0;
      }
    } else if (mode.nightLights && !wasOn) {
      for (const o of owners.nightOnly) o.visible = o.userData["nightVisible"] !== false;
    }
  }
  scene.userData["nightLights"] = mode.nightLights;
}
