/**
 * Turning the Python script's per-pack reports into the asset manifest (ticket 038).
 * Pure: no file access. Types are in `src/core/assets.ts`.
 */

import { relative, sep } from "node:path";
import { ASSET_MANIFEST_VERSION } from "../../src/core";
import type { AssetBounds, AssetColourway, AssetEntry, AssetFailure, AssetManifest, AssetPack, AssetWarning, Vec3 } from "../../src/core";

/** A report (or manifest) that doesn't have the shape the pipeline promises. The message names the pack and field. */
export class ManifestError extends Error {
  constructor(
    readonly pack: string,
    readonly field: string,
    detail: string,
  ) {
    super(`pack "${pack}": ${field}: ${detail}`);
    this.name = "ManifestError";
  }
}

const WARNINGS: readonly AssetWarning[] = ["scale-suspect", "no-uv", "missing-texture", "texture-guessed"];

/** What the Python script writes: the pack's assets and failures, the pack's scale, and the Blender that ran. */
export interface PackReport {
  blenderVersion: string | null;
  /** The pack's `pack.json` scale (1 by default). Always set by a strict parse; absent only from a manifest written before ticket 040. */
  scale?: number;
  assets: AssetEntry[];
  failures: AssetFailure[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function vec3(pack: string, field: string, v: unknown): Vec3 {
  if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => typeof n === "number" && Number.isFinite(n))) {
    throw new ManifestError(pack, field, "must be an array of three finite numbers");
  }
  return [v[0] as number, v[1] as number, v[2] as number];
}

function bounds(pack: string, field: string, v: unknown): AssetBounds {
  if (!isObject(v)) throw new ManifestError(pack, field, "missing (needs min and max)");
  const min = vec3(pack, `${field}.min`, v["min"]);
  const max = vec3(pack, `${field}.max`, v["max"]);
  for (let i = 0; i < 3; i++) {
    if ((min[i] as number) > (max[i] as number)) throw new ManifestError(pack, field, `min is above max on axis ${i}`);
  }
  return { min, max };
}

function stringArray(pack: string, field: string, v: unknown): string[] {
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) throw new ManifestError(pack, field, "must be an array of strings");
  return v as string[];
}

/** An image path in the manifest: relative to the pack folder, forward slashes, no `..`. */
function packRelativePath(pack: string, field: string, p: string): string {
  if (p === "" || p.startsWith("/") || /^[A-Za-z]:/.test(p)) throw new ManifestError(pack, field, `${JSON.stringify(p)} must be relative to the pack folder`);
  if (p.includes("\\")) throw new ManifestError(pack, field, `${JSON.stringify(p)} must use forward slashes`);
  if (p.split("/").includes("..")) throw new ManifestError(pack, field, `${JSON.stringify(p)} must stay inside the pack folder (no "..")`);
  return p;
}

/** A scale factor: a finite number above 0. Absent is an error unless the parse is lenient (an older manifest), which then gives undefined. */
function scaleField(pack: string, field: string, v: unknown, required: boolean): number | undefined {
  if (v === undefined && !required) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    throw new ManifestError(pack, field, v === undefined ? "missing (the factor the model was converted with)" : "must be a finite number above 0");
  }
  return v;
}

function nonEmptyString(pack: string, field: string, v: unknown): string {
  if (typeof v !== "string" || v === "") throw new ManifestError(pack, field, "must be a non-empty string");
  return v;
}

/**
 * Validate one pack's report. Throws ManifestError on the first problem. The pack's `scale` and every asset's `scale`
 * are required (ticket 040); only `readPriorPacks` passes `requireScale: false`, for a manifest written before them.
 */
export function parsePackReport(pack: string, raw: unknown, opts: { requireScale?: boolean } = {}): PackReport {
  const requireScale = opts.requireScale ?? true;
  if (!isObject(raw)) throw new ManifestError(pack, "report", "must be a JSON object");
  const assetsRaw = raw["assets"];
  const failuresRaw = raw["failures"];
  if (!Array.isArray(assetsRaw)) throw new ManifestError(pack, "assets", "must be an array");
  if (!Array.isArray(failuresRaw)) throw new ManifestError(pack, "failures", "must be an array");

  const seen = new Set<string>();
  const assets: AssetEntry[] = assetsRaw.map((a: unknown, i: number) => {
    const at = `assets[${i}]`;
    if (!isObject(a)) throw new ManifestError(pack, at, "must be an object");
    const name = nonEmptyString(pack, `${at}.name`, a["name"]);
    if (seen.has(name)) throw new ManifestError(pack, `${at}.name`, `duplicate asset name "${name}"`);
    seen.add(name);
    const source = nonEmptyString(pack, `${at}.source`, a["source"]);
    const tri = a["triangles"];
    if (typeof tri !== "number" || !Number.isInteger(tri) || tri < 0) {
      throw new ManifestError(pack, `${at}.triangles`, "must be a non-negative integer");
    }
    const warnRaw = a["warnings"];
    if (!Array.isArray(warnRaw)) throw new ManifestError(pack, `${at}.warnings`, "must be an array");
    const warnings = warnRaw.map((w: unknown) => {
      if (typeof w !== "string" || !(WARNINGS as readonly string[]).includes(w)) {
        throw new ManifestError(pack, `${at}.warnings`, `unknown warning ${JSON.stringify(w)}`);
      }
      return w as AssetWarning;
    });
    const textures = stringArray(pack, `${at}.textures`, a["textures"]).map((p) => packRelativePath(pack, `${at}.textures`, p));
    const missingTextures = stringArray(pack, `${at}.missingTextures`, a["missingTextures"]);
    if (warnings.includes("missing-texture") && missingTextures.length === 0) {
      throw new ManifestError(pack, `${at}.missingTextures`, "has the missing-texture warning but lists nothing missing");
    }
    if (!warnings.includes("missing-texture") && missingTextures.length > 0) {
      throw new ManifestError(pack, `${at}.warnings`, "lists missingTextures but lacks the missing-texture warning");
    }
    const scale = scaleField(pack, `${at}.scale`, a["scale"], requireScale);
    return {
      name,
      source,
      bounds: bounds(pack, `${at}.bounds`, a["bounds"]),
      ...(scale !== undefined ? { scale } : {}),
      triangles: tri,
      textures,
      missingTextures,
      warnings,
    };
  });

  const failures: AssetFailure[] = failuresRaw.map((f: unknown, i: number) => {
    const at = `failures[${i}]`;
    if (!isObject(f)) throw new ManifestError(pack, at, "must be an object");
    if (typeof f["error"] !== "string") throw new ManifestError(pack, `${at}.error`, "must be a string");
    return { source: nonEmptyString(pack, `${at}.source`, f["source"]), error: f["error"] };
  });

  const packScale = scaleField(pack, "scale", raw["scale"], requireScale);
  const bv = raw["blenderVersion"];
  return { blenderVersion: typeof bv === "string" && bv !== "" ? bv : null, ...(packScale !== undefined ? { scale: packScale } : {}), assets, failures };
}

/**
 * A pack's `colourways` field (ticket 054 A) as read back from a manifest: an array of { id, image, base, width, height }.
 * Returns undefined when the field is absent or is not usable (one bad entry drops the whole field; the next colourway run writes it again).
 */
export function readColourways(pack: string, raw: unknown): AssetColourway[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: AssetColourway[] = [];
  const ids = new Set<string>();
  for (const [i, c] of (raw as unknown[]).entries()) {
    if (!isObject(c)) return undefined;
    const size = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined);
    const width = size(c["width"]);
    const height = size(c["height"]);
    const id = c["id"];
    const base = c["base"];
    const image = c["image"];
    if (typeof id !== "string" || id === "" || typeof base !== "string" || base === "" || typeof image !== "string") return undefined;
    if (width === undefined || height === undefined || ids.has(id)) return undefined;
    try {
      packRelativePath(pack, `colourways[${i}].image`, image);
    } catch {
      return undefined;
    }
    ids.add(id);
    out.push({ id, image, base, width, height });
  }
  return out;
}

export interface PackInput {
  pack: string;
  /** Absolute path of the pack's GLB. */
  glbPath: string;
  /** The atlas, relative to the pack's input folder, forward slashes; null when none was set. */
  atlas: string | null;
  /** The parsed JSON the Python script wrote; validated here. */
  report: unknown;
}

export interface BuildOptions {
  /** Absolute folder the manifest will sit in; each `glb` is made relative to it. */
  manifestDir: string;
  generatedAt: string;
  /** Used when no report names its Blender. */
  blenderVersion: string;
  /** Packs kept from an earlier manifest (already validated). Replaced by an input of the same name. */
  keep?: readonly AssetPack[];
}

export function compareNames(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The manifest for the packs converted in this run, packs in name order, GLB paths relative to the manifest. */
export function buildManifest(inputs: readonly PackInput[], opts: BuildOptions): AssetManifest {
  const byName = new Map<string, AssetPack>();
  for (const kept of opts.keep ?? []) byName.set(kept.pack, kept);
  const ran = new Set<string>();
  let blenderVersion: string | null = null;
  for (const input of inputs) {
    if (ran.has(input.pack)) throw new ManifestError(input.pack, "pack", "appears twice");
    ran.add(input.pack);
    const report = parsePackReport(input.pack, input.report);
    blenderVersion ??= report.blenderVersion;
    const glb = relative(opts.manifestDir, input.glbPath).split(sep).join("/");
    byName.set(input.pack, {
      pack: input.pack,
      glb,
      atlas: input.atlas,
      ...(report.scale !== undefined ? { scale: report.scale } : {}),
      assets: report.assets,
      failures: report.failures,
    });
  }
  const packs = [...byName.values()].sort((a, b) => compareNames(a.pack, b.pack));
  return { version: ASSET_MANIFEST_VERSION, generatedAt: opts.generatedAt, blenderVersion: blenderVersion ?? opts.blenderVersion, packs };
}

/**
 * The packs of an earlier manifest file's text, for a run that converts only some packs. An unreadable,
 * foreign or other-version file gives none (the new manifest then holds this run's packs alone).
 */
export function readPriorPacks(text: string): AssetPack[] {
  try {
    const raw: unknown = JSON.parse(text);
    if (!isObject(raw) || raw["version"] !== ASSET_MANIFEST_VERSION || !Array.isArray(raw["packs"])) return [];
    const out: AssetPack[] = [];
    for (const p of raw["packs"] as unknown[]) {
      if (!isObject(p) || typeof p["pack"] !== "string" || typeof p["glb"] !== "string") return [];
      const atlas = p["atlas"];
      if (atlas !== null && typeof atlas !== "string") return [];
      const report = parsePackReport(p["pack"], p, { requireScale: false });
      const colourways = readColourways(p["pack"], p["colourways"]);
      out.push({
        pack: p["pack"],
        glb: p["glb"],
        atlas,
        ...(report.scale !== undefined ? { scale: report.scale } : {}),
        ...(colourways !== undefined ? { colourways } : {}),
        assets: report.assets,
        failures: report.failures,
      });
    }
    return out;
  } catch {
    return [];
  }
}
