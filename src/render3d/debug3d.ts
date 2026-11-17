/**
 * The fronts overlay (ticket 042 A, debug only): over every building clone, a short red arrow along the front its model is declared to have
 * (BUILDING_FRONTS) and a small caption with its model name. Josh turns it on with `/?puzzle=...&view=3d&fronts=1` and names every model whose
 * arrow points away from its door; each correction is one line in BUILDING_FRONTS.
 * It is off by default, never a pick target (nothing in it can be raycast) and never part of a playtest. It reads placements only.
 */

import { ArrowHelper, Group, Sprite, Vector3, type Material, type Object3D } from "three";
import { scaleForPx } from "./captions";
import { frontAxis, sizeOf } from "./models";
import type { AppliedModels } from "./models3d";
import type { SceneBundle } from "./scene";
import type { CornerSide } from "./town";
import { createCaptionSprite, defaultTextSurface, type TextSurfaceFactory } from "./text";

/** The arrow's red, one saturated colour that reads on any roof. */
export const FRONT_ARROW_COLOUR = 0xff2a2a;
export const FRONT_ARROW_LENGTH = 0.9;
export const FRONTS_FONT_PX = 11;

/** True when the page's query string asks for the overlay: `fronts=1`. */
export function frontsRequested(search: string): boolean {
  return new URLSearchParams(search).get("fronts") === "1";
}

export interface FrontsOverlay extends Group {
  /** Keep the captions at a fixed pixel size, like the scene's own (call with the canvas size in css px and the camera's vertical fov). */
  setViewport(width: number, height: number, fovDeg: number): void;
  /** Free the arrows' and captions' GPU resources. The clones' and the models' are not touched. */
  dispose(): void;
}

/** The world-space direction (x, z) of a clone's declared front: its model-space axis turned by the clone's yaw (Three's rotation.y). Independent of the lot. */
export function declaredFrontDirection(front: Parameters<typeof frontAxis>[0], yaw: number): readonly [number, number] {
  const [ax, az] = frontAxis(front);
  return [ax * Math.cos(yaw) + az * Math.sin(yaw), -ax * Math.sin(yaw) + az * Math.cos(yaw)];
}

/**
 * The caption's lines: the model's name, then which model it is a copy of (when it is), then on a corner lot "corner lot, cross street on +x" (the lot's
 * sides that meet a cross road, in the lot's own frame), then for a corner model "second face on +x" (the side its second frontage was turned to).
 */
export function frontCaption(name: string, family: string, cornerSides: readonly CornerSide[], open: false | "+x" | "-x" = false): string[] {
  const lines = [name];
  if (family !== name) lines.push(`same mesh as ${family}`);
  if (cornerSides.length > 0) lines.push(`corner lot, cross street on ${[...new Set(cornerSides.map((c) => c.side))].join(" and ")}`);
  if (open !== false) lines.push(`second face on ${open}`);
  return lines;
}

/** One arrow and one caption per building clone in `applied`. Nothing is added to the scene: the caller adds the returned group. */
export function frontsOverlay(bundle: SceneBundle, applied: AppliedModels, opts: { surface?: TextSurfaceFactory; dpr?: number } = {}): FrontsOverlay {
  const surface = opts.surface ?? defaultTextSurface;
  const dpr = opts.dpr ?? 1;
  const root = new Group() as FrontsOverlay;
  root.name = "fronts-overlay";
  const captions: { sprite: Sprite; setUnit(u: number): void }[] = [];
  const arrows: ArrowHelper[] = [];
  const noRay = (o: Object3D): void => {
    o.raycast = () => {};
  };
  const lots = bundle.slots.blocks.list;
  for (const p of applied.buildings) {
    const top = sizeOf(p.model.entry)[1] * p.scale;
    const [dx, dz] = declaredFrontDirection(p.model.front, p.yaw);
    const arrow = new ArrowHelper(new Vector3(dx, 0, dz), new Vector3(p.x, top + 0.03, p.z), FRONT_ARROW_LENGTH, FRONT_ARROW_COLOUR, 0.3, 0.2);
    arrow.traverse((o) => {
      noRay(o);
      o.renderOrder = 9;
    });
    for (const m of [arrow.line.material, arrow.cone.material] as Material[]) m.depthTest = false;
    arrow.userData["model"] = p.model.entry.name;
    arrows.push(arrow);
    root.add(arrow);
    const cs = createCaptionSprite(surface, FRONTS_FONT_PX, dpr, false, 0);
    cs.draw(frontCaption(p.model.entry.name, p.model.family, lots[p.lot]?.cornerSides ?? [], p.model.corner), "text");
    cs.sprite.position.set(p.x, top + 0.12, p.z);
    noRay(cs.sprite);
    captions.push(cs);
    root.add(cs.sprite);
  }
  root.setViewport = (_w, height, fovDeg) => {
    const unit = scaleForPx(1, height, fovDeg);
    for (const c of captions) c.setUnit(unit);
  };
  root.dispose = () => {
    for (const a of arrows) a.dispose();
    for (const c of captions) {
      c.sprite.material.map?.dispose();
      c.sprite.material.dispose();
    }
  };
  return root;
}
