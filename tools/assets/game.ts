/**
 * `npm run assets:game` (ticket 082 B): cut the game pack, `assets/private/out/game/`.
 *
 * It holds one GLB per source pack that has a model the game loads (only those models), a `manifest.json` of its own, and the used
 * colourway images. The list of models is `gameModelKeys()` from src/render3d/gamemodels.ts (imported only by the CLI at the bottom, so
 * the tests never load three). Each used pack is re-converted from its FBX by the normal script with its own pack.json settings and an
 * include file, so names, bounds, scale and textures match the full pack; a converted model that differs fails the run. GLBs and the
 * manifest are first written under out/game/.tmp and moved only when every pack passes, so the earlier game pack survives a failed run.
 * The full packs and the full manifest are never written.
 *
 * Exit codes: 0 written; 1 refused or failed; 2 Blender missing or too old.
 */

import { renameSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FX_GAME_DIR, FX_MESHES, FX_SOURCE_DIR, FX_SOURCE_PACK, FX_TEXTURES } from "../../src/core";
import type { AssetColourway, AssetEntry, AssetFxTexture, AssetManifest, AssetPack, FxTextureId } from "../../src/core";
import { buildBlenderArgs, isInside, layout, packNameIsSafe, readPackSettings, realDeps, resolveBlender, tail } from "./convert";
import type { ConvertDeps, RunResult } from "./convert";
import { compareNames, parsePackReport } from "./manifest";
import type { PackReport } from "./manifest";

/** The most a converted model's bounds may differ from the full pack's, per number, in metres. */
export const BOUNDS_TOLERANCE = 0.001;

export interface GamePackPlan {
  pack: string;
  /** The FBX `source` paths to convert, sorted. */
  sources: string[];
  /** The root names those give, in the same order. */
  names: string[];
}

export interface GamePlan {
  packs: GamePackPlan[];
  /** Every key the manifest cannot give: a missing pack or name, or a `scale-suspect` entry. Non-empty means nothing is written. */
  problems: string[];
}

/** Group `pack:name` keys by pack into their FBX source lists. Pure. Packs with no key are left out. */
export function planGame(manifest: AssetManifest, keys: readonly string[]): GamePlan {
  const byPack = new Map<string, AssetEntry[]>();
  const problems: string[] = [];
  for (const key of keys) {
    const at = key.indexOf(":");
    const pack = at < 0 ? "" : key.slice(0, at);
    const name = at < 0 ? key : key.slice(at + 1);
    const packEntry = manifest.packs.find((p) => p.pack === pack);
    if (packEntry === undefined) {
      problems.push(`${key}: the manifest has no pack "${pack}"`);
      continue;
    }
    const entry = packEntry.assets.find((a) => a.name === name);
    if (entry === undefined) {
      problems.push(`${key}: pack "${pack}" has no model "${name}"`);
      continue;
    }
    if (entry.warnings.includes("scale-suspect")) {
      problems.push(`${key}: the full manifest marks it scale-suspect; fix its scale first`);
      continue;
    }
    const list = byPack.get(pack) ?? [];
    list.push(entry);
    byPack.set(pack, list);
  }
  const packs = [...byPack.entries()]
    .sort(([a], [b]) => compareNames(a, b))
    .map(([pack, entries]) => {
      const sorted = [...new Map(entries.map((e) => [e.source, e])).values()].sort((a, b) => compareNames(a.source, b.source));
      return { pack, sources: sorted.map((e) => e.source), names: sorted.map((e) => e.name) };
    });
  return { packs, problems };
}

/** What differs between a model as the full manifest has it and as the game conversion made it. Empty when it matches. */
export function compareEntries(full: AssetEntry, got: AssetEntry): string[] {
  const out: string[] = [];
  if (full.name !== got.name) out.push(`name ${got.name}, full pack ${full.name}`);
  if (full.scale !== got.scale) out.push(`scale ${got.scale}, full pack ${full.scale}`);
  if (full.textures.join("|") !== got.textures.join("|")) out.push(`textures [${got.textures.join(", ")}], full pack [${full.textures.join(", ")}]`);
  for (const end of ["min", "max"] as const) {
    for (let i = 0; i < 3; i++) {
      const a = full.bounds[end][i] as number;
      const b = got.bounds[end][i] as number;
      if (Math.abs(a - b) > BOUNDS_TOLERANCE) out.push(`bounds ${end}[${i}] ${b}, full pack ${a}`);
    }
  }
  return out;
}

export interface GameManifestInput {
  full: AssetManifest;
  plan: GamePlan;
  keys: readonly string[];
  colourwayIds: readonly string[];
  generatedAt: string;
  blenderVersion: string;
  /** The particle textures copied (081 FX1), in `FX_TEXTURES` order; none leaves `fx` out. */
  fx?: readonly AssetFxTexture[];
}

/** The game manifest: each used pack's full entry cut to the included models and colourways, `glb` beside the manifest. Pure. */
export function buildGameManifest(a: GameManifestInput): AssetManifest {
  const packs: AssetPack[] = a.plan.packs.map((p) => {
    const full = a.full.packs.find((f) => f.pack === p.pack) as AssetPack;
    const wanted = new Set(p.names);
    const colourways = (full.colourways ?? []).filter((c: AssetColourway) => a.colourwayIds.includes(c.id));
    return {
      ...full,
      glb: `${p.pack}.glb`,
      assets: full.assets.filter((e) => wanted.has(e.name)),
      failures: [],
      ...(colourways.length > 0 ? { colourways } : {}),
    };
  });
  return {
    version: a.full.version,
    game: { keys: [...new Set(a.keys)].sort(), from: a.full.generatedAt },
    generatedAt: a.generatedAt,
    blenderVersion: a.blenderVersion,
    packs,
    ...(a.fx !== undefined && a.fx.length > 0 ? { fx: a.fx } : {}),
  };
}

export interface GameDeps extends ConvertDeps {
  /** Move a file, replacing the target; the target's folder exists. */
  rename: (from: string, to: string) => void;
  /** A file's size in bytes. */
  fileSize: (path: string) => number;
  /** `gameModelKeys()` and `gameColourways()`, injected so this file does not load the renderer. */
  keys: () => string[];
  colourwayIds: () => string[];
}

const MB = 1024 * 1024;

/** Run the cut. Returns the exit code. */
export async function runGame(deps: GameDeps): Promise<number> {
  const L = layout(deps.root);
  const game = join(L.out, "game");
  const tmp = join(game, ".tmp");
  if (!isInside(L.out, game) || !isInside(game, tmp)) {
    deps.stderr("refusing to write outside assets/private/out/game/\n");
    return 1;
  }
  if (!deps.exists(L.manifest)) {
    deps.stderr(`No manifest at ${L.manifest}. Convert the packs first (npm run assets:convert).\n`);
    return 1;
  }
  let full: AssetManifest;
  try {
    full = JSON.parse(deps.readText(L.manifest)) as AssetManifest;
    if (!Array.isArray(full.packs)) throw new Error('no "packs" list');
  } catch (e) {
    deps.stderr(`${L.manifest} is unreadable (${(e as Error).message}); nothing written.\n`);
    return 1;
  }
  const pageKeys = deps.keys();
  // The particle meshes are optional (081 FX1): a key the manifest cannot give is skipped with a line, never a failed cut.
  const fxKeys: string[] = [];
  const fxSkipped: string[] = [];
  for (const key of Object.values(FX_MESHES)) {
    if (pageKeys.includes(key) || planGame(full, [key]).problems.length === 0) fxKeys.push(key);
    else fxSkipped.push(key);
  }
  const keys = [...pageKeys, ...fxKeys.filter((k) => !pageKeys.includes(k))];
  const plan = planGame(full, keys);
  if (plan.problems.length > 0) {
    deps.stderr(`The game pack cannot be cut; nothing written:\n${plan.problems.map((p) => `  - ${p}`).join("\n")}\n`);
    return 1;
  }
  for (const p of plan.packs) {
    if (!packNameIsSafe(L.inRoot, p.pack)) {
      deps.stderr(`Refusing pack name "${p.pack}".\n`);
      return 1;
    }
  }
  const blender = await resolveBlender(deps);
  if (blender === 2) return 2;

  const started = deps.now().getTime();
  deps.remove(tmp);
  deps.mkdirp(tmp);
  const fail = (message: string): number => {
    deps.remove(tmp);
    deps.stderr(`${message}\nThe game pack was not changed.\n`);
    return 1;
  };
  /** Files to move into out/game/, relative to it. */
  const moves: string[] = [];
  const lines: string[] = [];
  const ids = deps.colourwayIds();

  for (const p of plan.packs) {
    const fullPack = full.packs.find((f) => f.pack === p.pack) as AssetPack;
    let settings;
    try {
      settings = readPackSettings(deps, join(L.inRoot, p.pack));
    } catch (e) {
      return fail(`Pack "${p.pack}": ${(e as Error).message}`);
    }
    const includeFile = join(tmp, `${p.pack}.include.txt`);
    const outGlb = join(tmp, `${p.pack}.glb`);
    const report = join(tmp, `${p.pack}.json`);
    deps.writeText(includeFile, p.sources.join("\n") + "\n");
    deps.stdout(`Cutting ${p.pack}: ${p.sources.length} model(s) ...\n`);
    let result: RunResult;
    try {
      result = await deps.run(
        blender.path,
        buildBlenderArgs({
          script: L.script,
          packDir: join(L.inRoot, p.pack),
          outGlb,
          report,
          ...(settings.atlas ? { atlas: settings.atlas.abs } : {}),
          ...(settings.scale !== undefined ? { scale: settings.scale } : {}),
          ...(settings.textures !== undefined ? { textures: settings.textures } : {}),
          overrides: settings.overrides,
          aliases: settings.aliases,
          scaleOverrides: settings.scaleOverrides,
          exclude: settings.exclude,
          include: includeFile,
        }),
      );
    } catch (e) {
      return fail(`Pack "${p.pack}": could not start Blender: ${(e as Error).message}`);
    }
    if (result.code !== 0 || !deps.exists(report) || !deps.exists(outGlb)) {
      return fail(`Pack "${p.pack}": Blender exited with code ${result.code ?? "(killed)"}\n${tail(result.stderr || result.stdout)}`);
    }
    let got: PackReport;
    try {
      got = parsePackReport(p.pack, JSON.parse(deps.readText(report)));
    } catch (e) {
      return fail(`Pack "${p.pack}": bad report: ${(e as Error).message}`);
    }
    const problems: string[] = got.failures.map((f) => `${f.source} failed: ${f.error}`);
    for (const e of got.assets) if (!p.names.includes(e.name)) problems.push(`${e.name} reached the GLB but is not in the list`);
    for (const name of p.names) {
      const want = fullPack.assets.find((e) => e.name === name) as AssetEntry;
      const have = got.assets.find((e) => e.name === name);
      if (have === undefined) problems.push(`${name} is missing from the converted GLB`);
      else for (const d of compareEntries(want, have)) problems.push(`${name}: ${d}`);
    }
    if (problems.length > 0) return fail(`Pack "${p.pack}" differs from the full pack:\n${problems.map((x) => `  - ${x}`).join("\n")}`);
    moves.push(`${p.pack}.glb`);
    lines.push(`  ${p.pack}: ${p.names.length} model(s), ${(deps.fileSize(outGlb) / MB).toFixed(1)} MB\n`);

    for (const c of (fullPack.colourways ?? []).filter((x) => ids.includes(x.id))) {
      const from = join(L.out, ...c.image.split("/"));
      const to = join(tmp, ...c.image.split("/"));
      if (!deps.exists(from)) return fail(`Pack "${p.pack}": colourway image ${c.image} is not under out/; run npm run assets:convert -- --colourways.`);
      deps.mkdirp(dirname(to));
      deps.copyFile(from, to);
      moves.push(c.image);
    }
  }

  if (fxSkipped.length > 0) {
    lines.push(`  particle meshes left out: ${fxSkipped.join(", ")} (not in the full manifest, or scale-suspect; run npm run assets:convert ${FX_SOURCE_PACK})\n`);
  }

  // The particle textures: copied if present, never a reason to stop.
  const fxFrom = join(L.inRoot, FX_SOURCE_PACK, ...FX_SOURCE_DIR.split("/").filter((x) => x !== ""));
  const fx: AssetFxTexture[] = [];
  const fxMissing: string[] = [];
  for (const id of Object.keys(FX_TEXTURES) as FxTextureId[]) {
    const file = FX_TEXTURES[id];
    const from = join(fxFrom, file);
    if (!deps.exists(from)) {
      fxMissing.push(file);
      continue;
    }
    const rel = `${FX_GAME_DIR}${file}`;
    const to = join(tmp, ...rel.split("/"));
    deps.mkdirp(dirname(to));
    deps.copyFile(from, to);
    moves.push(rel);
    fx.push({ id, image: rel });
  }
  if (fxMissing.length > 0) lines.push(`  particle textures missing: ${fxMissing.join(", ")} (looked in ${fxFrom})\n`);

  const manifest = buildGameManifest({
    full,
    plan,
    keys,
    colourwayIds: ids,
    fx,
    generatedAt: deps.now().toISOString(),
    blenderVersion: blender.versionText,
  });
  deps.writeText(join(tmp, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  moves.push("manifest.json");

  // Every pack passed: replace the old game pack.
  for (const name of deps.listDir(game)) if (name !== ".tmp") deps.remove(join(game, name));
  for (const rel of moves) {
    const to = join(game, ...rel.split("/"));
    deps.mkdirp(dirname(to));
    deps.rename(join(tmp, ...rel.split("/")), to);
  }
  deps.remove(tmp);
  const seconds = ((deps.now().getTime() - started) / 1000).toFixed(0);
  deps.stdout(`Wrote ${join(game, "manifest.json")}\n${lines.join("")}${plan.packs.length} pack(s), ${keys.length} key(s), ${fx.length} texture(s), ${seconds} s\n`);
  return 0;
}

const here = fileURLToPath(import.meta.url);
const invoked = process.argv[1] !== undefined ? resolve(process.argv[1]) : "";
const same = process.platform === "win32" ? invoked.toLowerCase() === here.toLowerCase() : invoked === here;
if (same) {
  const root = resolve(dirname(here), "..", "..");
  import("../../src/render3d/gamemodels")
    .then(({ gameModelKeys, gameColourways }) =>
      runGame({
        ...realDeps(root),
        rename: (from, to) => renameSync(from, to),
        fileSize: (p) => statSync(p).size,
        keys: () => gameModelKeys(),
        colourwayIds: () => gameColourways(),
      }),
    )
    .then(
      (code) => process.exit(code),
      (e: unknown) => {
        process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
        process.exit(1);
      },
    );
}
