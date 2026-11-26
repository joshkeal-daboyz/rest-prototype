/**
 * The control cue (ticket 081 NC2; Josh, 26 Nov 2026: "hovering or throwing one highlights exactly the wires it controls"). Pointing at a breaker or switch lights the wires its throw
 * would make live (`CUE_ON`) and the wires it would make dead (`CUE_OFF`), from NC1's `lines` on the load preview's entry. Pure but for the layer's own buffers; no grid run here.
 */
import { Color, DynamicDrawUsage, InstancedMesh, MeshBasicMaterial, AdditiveBlending, type BufferGeometry } from "three";
import type { LoadPreview } from "../core/preview";
import type { JobWire } from "./cityview";

/** The wires the throw would light: the lamp-light amber, at full (Josh tunes by eye). */
export const CUE_ON = 0xffd27a;
/** The wires the throw would darken: a cool white, at full. */
export const CUE_OFF = 0xdfe9ff;
export type CueKind = "on" | "off";
/** The cue draws a little thicker than the wire and the tint, so it shows on the cable. */
export const CUE_THICK = 1.9;

/**
 * Each job wire the hovered control would change: `on` or `off`, by wire id. Empty for a null hover, a hovered lamp, fuse box or break, a `null` preview or an entry with no `lines`.
 * `wiresOfLine` holds the file lines' job wires only, so hidden (S1) and scenery lines are never cued. A line with a readable cut (its fault has a preview entry) is cued from the end
 * current enters up to the cut span, that span included; `reversed(line)` says current enters at the line's `to` (default: at its `from`).
 */
export function cueWires(wiresOfLine: ReadonlyMap<string, readonly JobWire[]>, preview: LoadPreview | null, hoverId: string | null, reversed?: (line: string) => boolean): Map<string, CueKind> {
  const out = new Map<string, CueKind>();
  if (!preview || hoverId === null) return out;
  const entry = preview.get(hoverId);
  if (!entry || (entry.kind !== "breaker" && entry.kind !== "switch") || !entry.lines) return out;
  const add = (ids: readonly string[], kind: CueKind): void => {
    for (const id of ids) {
      const ws = wiresOfLine.get(id);
      if (!ws) continue;
      const rev = reversed?.(id) ?? false;
      let cut: JobWire | null = null;
      for (const w of ws) {
        if (w.cutFault === null || !preview.has(w.cutFault)) continue;
        if (cut === null || (rev ? w.a1 > cut.a1 : w.a0 < cut.a0)) cut = w;
      }
      for (const w of ws) if (cut === null || (rev ? w.a0 >= cut.a0 : w.a1 <= cut.a1)) out.set(w.id, kind);
    }
  };
  add(entry.lines.on, "on");
  add(entry.lines.off, "off");
  return out;
}

/** The cue layer (the caller writes the instance matrices, once): one instanced mesh of `wires.length * samples` boxes over the live layer's unit-box geometry, drawn additively, coloured by instance (black is invisible). */
export interface CueLayer {
  readonly mesh: InstancedMesh;
  readonly material: MeshBasicMaterial;
  /** Rewrites the instance colours only when the cued ids or `preview` are not the pair last written; true when it wrote. `ids` is the hovered control and, from TB3, the timers about to flip (`cueIds`). */
  update(ids: readonly string[], preview: LoadPreview | null): boolean;
}

export function createCueLayer(
  geometry: BufferGeometry,
  wires: readonly JobWire[],
  samples: number,
  wiresOfLine: ReadonlyMap<string, readonly JobWire[]>,
  reversed: (line: string) => boolean,
): CueLayer {
  const material = new MeshBasicMaterial({ color: 0xffffff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new InstancedMesh(geometry, material, Math.max(wires.length * samples, 1));
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  const on = new Color(CUE_ON);
  const off = new Color(CUE_OFF);
  const black = new Color(0, 0, 0);
  for (let i = 0; i < wires.length * samples; i++) {
    mesh.setColorAt(i, black);
  }
  mesh.raycast = () => {};
  mesh.frustumCulled = false;
  const lastIds: string[] = [];
  let lastPreview: LoadPreview | null = null;
  let lit = false;
  return {
    mesh,
    material,
    update(ids, preview) {
      if (ids.length === 0 && !lit) return false;
      if (preview === lastPreview && ids.length === lastIds.length && ids.every((id, i) => id === lastIds[i])) return false;
      lastIds.length = 0;
      for (const id of ids) lastIds.push(id);
      lastPreview = preview;
      const cued = new Map<string, CueKind>();
      for (const id of ids) for (const [w, k] of cueWires(wiresOfLine, preview, id, reversed)) if (!cued.has(w) || k === "on") cued.set(w, k);
      if (cued.size === 0 && !lit) return false;
      lit = cued.size > 0;
      wires.forEach((w, wi) => {
        const kind = cued.get(w.id);
        const c = kind === "on" ? on : kind === "off" ? off : black;
        for (let j = 0; j < samples; j++) mesh.setColorAt(wi * samples + j, c);
      });
      mesh.instanceColor!.needsUpdate = true;
      return true;
    },
  };
}

