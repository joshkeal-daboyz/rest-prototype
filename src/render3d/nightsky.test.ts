/**
 * Ticket 081 section SK: the night sky and the moon. No WebGL, no assets, no timers.
 */

import { describe, expect, it } from "vitest";
import { Scene, Vector3, type Group, type Light, type Object3D } from "three";
import { NIGHT_SKY, nightFill } from "./nightsky";
import { applyLightMode, setSkyTurn } from "./lightrig";

describe("the night sky (081 SK)", () => {
  const skyOf = (scene: Scene): Group => scene.children.find((c) => c.userData["lightRig"] === "sky") as Group;
  const part = (sky: Group, name: string): Object3D => sky.children.find((c) => c.userData["skyPart"] === name)!;
  const starsOf = (sky: Group): number[] => Array.from((part(sky, "stars") as unknown as { geometry: { getAttribute(n: string): { array: ArrayLike<number> } } }).geometry.getAttribute("position").array);
  const moonLight = (scene: Scene): Light => scene.children.find((c) => c.userData["lightRig"] === "moon") as Light;
  const discDir = (sky: Group): Vector3 => {
    sky.updateMatrixWorld(true);
    return part(sky, "moon").getWorldPosition(new Vector3()).normalize();
  };

  it("is one sky with the star count above the minimum, the same on a second build, its disc on the moon's direction, and the light follows the disc through a turn", () => {
    const scene = new Scene();
    applyLightMode(scene, null, "night");
    expect(scene.children.filter((c) => c.userData["lightRig"] === "sky")).toHaveLength(1);
    const sky = skyOf(scene);
    const stars = starsOf(sky);
    expect(stars.length / 3).toBe(NIGHT_SKY.stars.count);
    const minY = Math.sin((NIGHT_SKY.stars.minElevation_deg * Math.PI) / 180);
    for (let i = 0; i < stars.length; i += 3) expect(stars[i + 1]! / Math.hypot(stars[i]!, stars[i + 1]!, stars[i + 2]!)).toBeGreaterThanOrEqual(minY - 1e-6);
    const again = new Scene();
    applyLightMode(again, null, "night");
    expect(starsOf(skyOf(again))).toEqual(stars);

    const agree = (): number => discDir(skyOf(scene)).distanceTo(moonLight(scene).position.clone().normalize());
    expect(agree()).toBeLessThan(1e-6);
    const el = (NIGHT_SKY.moon.elevation_deg * Math.PI) / 180;
    expect(discDir(sky).y).toBeCloseTo(Math.sin(el), 6);

    const first = new Vector3(stars[0], stars[1], stars[2]);
    setSkyTurn(scene, 90);
    expect(agree()).toBeLessThan(1e-6);
    sky.updateMatrixWorld(true);
    const turned = first.clone().applyMatrix4(part(sky, "stars").matrixWorld);
    expect(turned.distanceTo(first)).toBeGreaterThan(1);
    applyLightMode(scene, null, "night");
    expect(agree()).toBeLessThan(1e-6);
  });

  it("the moon never adds to an unlit wall or roof more than today's moon did (the fill cap)", () => {
    const todayMoon = { color: 0x8fa6d0, intensity: 0.7, dir: [-6 / 14, 12 / 14, 4 / 14] };
    const lum = (hex: number): number => (0.2126 * ((hex >> 16) & 255) + 0.7152 * ((hex >> 8) & 255) + 0.0722 * (hex & 255)) / 255;
    const today = (n: readonly [number, number, number]): number =>
      lum(0x4a5a7a) * 1.1 + lum(todayMoon.color) * todayMoon.intensity * Math.max(0, n[0] * todayMoon.dir[0]! + n[1] * todayMoon.dir[1]! + n[2] * todayMoon.dir[2]!);
    for (const n of [[0, 0, 1], [0, 1, 0]] as const) expect(nightFill(n)).toBeLessThanOrEqual(today(n) + 1e-9);
  });
});
