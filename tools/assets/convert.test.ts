import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_SANE_SIZE_MAX, ASSET_SANE_SIZE_MIN } from "../../src/core";
import type { AssetManifest } from "../../src/core";
import { SELFTEST_ALIASES, USAGE, buildBlenderArgs, checkSelftest, convert, hasImageExtension, isInside, layout, normaliseAliasKey, selftestAliases } from "./convert";
import type { ConvertDeps, RunResult } from "./convert";
import { parsePackReport } from "./manifest";
import type { PackReport } from "./manifest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const fixtureText = (name: string): string => readFileSync(join(here, "fixtures", name), "utf8");

const ROOT = resolve("/my repo/rest");
const L = layout(ROOT);
const BLENDER = resolve("/opt/blender 4.2/blender");

interface Call {
  command: string;
  args: string[];
}

/** What the fake Blender does for one conversion run. Default: write the ok fixture and exit 0. */
type Behaviour = (args: readonly string[], pack: string) => { code: number; stderr?: string; stdout?: string; report?: string | null };

function flag(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function setup(opts: {
  packs?: string[];
  extraFiles?: Record<string, string>;
  version?: string;
  blender?: boolean;
  behaviour?: Behaviour;
  withInDir?: boolean;
  /** Binary files (ticket 054 A: colourway PNG headers) by absolute path. */
  binaryFiles?: Record<string, Uint8Array>;
}) {
  const files = new Map<string, string>();
  const binary = new Map<string, Uint8Array>();
  const copies: Array<[string, string]> = [];
  const dirs = new Set<string>();
  const addDir = (d: string) => {
    for (let p = d; !dirs.has(p) && dirname(p) !== p; p = dirname(p)) dirs.add(p);
  };
  const addFile = (p: string, text: string) => {
    files.set(p, text);
    addDir(dirname(p));
  };
  if (opts.blender !== false) addFile(BLENDER, "");
  if (opts.withInDir !== false) addDir(L.inRoot);
  for (const p of opts.packs ?? []) addDir(join(L.inRoot, p));
  for (const [p, text] of Object.entries(opts.extraFiles ?? {})) addFile(p, text);
  for (const [p, bytes] of Object.entries(opts.binaryFiles ?? {})) {
    binary.set(p, bytes);
    addDir(dirname(p));
  }

  const calls: Call[] = [];
  const writes: string[] = [];
  const mkdirs: string[] = [];
  let out = "";
  let err = "";
  const behaviour: Behaviour = opts.behaviour ?? (() => ({ code: 0 }));

  const deps: ConvertDeps = {
    env: opts.blender === false ? {} : { BLENDER_PATH: BLENDER },
    platform: "linux",
    root: ROOT,
    exists: (p) => files.has(p) || binary.has(p) || dirs.has(p),
    listDir: (p) => {
      const names = new Set<string>();
      for (const q of [...files.keys(), ...binary.keys(), ...dirs]) if (dirname(q) === p && q !== p) names.add(q.slice(p.length + 1));
      return [...names];
    },
    isDirectory: (p) => dirs.has(p),
    readText: (p) => {
      const t = files.get(p);
      if (t === undefined) throw new Error(`ENOENT ${p}`);
      return t;
    },
    writeText: (p, text) => {
      writes.push(p);
      addFile(p, text);
    },
    readBytes: (p) => {
      const b = binary.get(p);
      if (b === undefined) throw new Error(`ENOENT ${p}`);
      return b;
    },
    copyFile: (from, to) => {
      const b = binary.get(from);
      if (b === undefined) throw new Error(`ENOENT ${from}`);
      copies.push([from, to]);
      binary.set(to, b);
      addDir(dirname(to));
    },
    mkdirp: (p) => {
      mkdirs.push(p);
      addDir(p);
    },
    remove: (p) => {
      for (const q of [...files.keys()]) if (q === p || q.startsWith(p + "\\") || q.startsWith(p + "/")) files.delete(q);
      for (const q of [...dirs]) if (q === p || q.startsWith(p + "\\") || q.startsWith(p + "/")) dirs.delete(q);
    },
    run: (command, args): Promise<RunResult> => {
      calls.push({ command, args: [...args] });
      if (args[0] === "--version") {
        return Promise.resolve({ code: 0, stdout: `Blender ${opts.version ?? "4.2.3 LTS"}\n\tbuild date: x\n`, stderr: "" });
      }
      const inDir = flag(args, "--in") ?? "";
      const pack = basename(inDir);
      const b = behaviour(args, pack);
      const report = flag(args, "--report");
      if (report && b.report !== null) addFile(report, b.report ?? fixtureText("report-ok.json"));
      return Promise.resolve({ code: b.code, stdout: b.stdout ?? "", stderr: b.stderr ?? "" });
    },
    stdout: (t) => void (out += t),
    stderr: (t) => void (err += t),
    now: () => new Date("2026-11-12T10:00:00.000Z"),
  };
  return {
    deps,
    files,
    binary,
    copies,
    calls,
    writes,
    mkdirs,
    out: () => out,
    err: () => err,
    conversions: () => calls.filter((c) => c.args[0] !== "--version"),
    manifest: (): AssetManifest => JSON.parse(files.get(L.manifest) ?? "null") as AssetManifest,
  };
}

describe("Missing Blender fails clearly", () => {
  it("exits 2 with the install text on stderr and writes nothing under assets/private/out/", async () => {
    const s = setup({ blender: false, packs: ["town"] });
    expect(await convert([], s.deps)).toBe(2);
    expect(s.err()).toContain("https://www.blender.org/download/");
    expect(s.err()).toContain("BLENDER_PATH");
    expect(s.err()).toContain("PATH");
    expect(s.writes).toEqual([]);
    expect(s.mkdirs).toEqual([]);
    expect(s.calls).toEqual([]);
    expect([...s.files.keys()].filter((p) => isInside(L.out, p))).toEqual([]);
  });

  it("exits 2 naming the path when BLENDER_PATH points at a missing file", async () => {
    const s = setup({ packs: ["town"] });
    const missing = resolve("/gone/blender");
    s.deps.env = { BLENDER_PATH: missing };
    expect(await convert([], s.deps)).toBe(2);
    expect(s.err()).toContain(missing);
    expect(s.writes).toEqual([]);
  });
});

describe("Version gate", () => {
  it("a Blender below 4.2 exits 2 with a message naming the found version and the minimum", async () => {
    const s = setup({ version: "4.1.1", packs: ["town"] });
    expect(await convert([], s.deps)).toBe(2);
    expect(s.err()).toContain("4.1.1");
    expect(s.err()).toContain("4.2");
    expect(s.conversions()).toEqual([]);
    expect(s.writes).toEqual([]);
  });

  it("the self-test passes the same gate", async () => {
    const s = setup({ version: "3.6.0" });
    expect(await convert(["--selftest"], s.deps)).toBe(2);
    expect(s.conversions()).toEqual([]);
  });
});

describe("Arguments", () => {
  it("passes exactly the documented argument array for a pack with pack.json, spaces unquoted", async () => {
    const packDir = join(L.inRoot, "polygon town");
    const s = setup({
      packs: ["polygon town"],
      extraFiles: {
        [join(packDir, "pack.json")]: JSON.stringify({ atlas: "Textures/T_01.png", scale: 0.01 }),
        [join(packDir, "Textures", "T_01.png")]: "png",
      },
    });
    expect(await convert([], s.deps)).toBe(0);
    expect(s.conversions()).toHaveLength(1);
    expect(s.conversions()[0]).toEqual({
      command: BLENDER,
      args: [
        "--background",
        "--factory-startup",
        "--python",
        L.script,
        "--",
        "--in",
        packDir,
        "--out",
        join(L.out, "polygon town.glb"),
        "--report",
        join(L.reports, "polygon town.json"),
        "--atlas",
        join(packDir, "Textures", "T_01.png"),
        "--scale",
        "0.01",
      ],
    });
  });

  it("a pack with no pack.json gets no --atlas and no --scale", async () => {
    const s = setup({ packs: ["bare"] });
    expect(await convert([], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(args).not.toContain("--atlas");
    expect(args).not.toContain("--scale");
    expect(args.slice(0, 5)).toEqual(["--background", "--factory-startup", "--python", L.script, "--"]);
  });

  it("a pack.json atlas that is missing, or points outside the pack, fails that pack without running Blender", async () => {
    const s = setup({
      packs: ["gone", "escape"],
      extraFiles: {
        [join(L.inRoot, "gone", "pack.json")]: JSON.stringify({ atlas: "nothing.png" }),
        [join(L.inRoot, "escape", "pack.json")]: JSON.stringify({ atlas: "../gone/pack.json" }),
      },
    });
    expect(await convert([], s.deps)).toBe(1);
    expect(s.conversions()).toEqual([]);
    expect(s.err()).toContain('Pack "gone" failed');
    expect(s.err()).toContain('Pack "escape" failed');
    expect(s.writes).toEqual([]);
  });
});

describe("Amendment A: pack.json texture keys", () => {
  const pack = "simple town";
  const packDir = join(L.inRoot, pack);
  const withJson = (json: unknown, extra: Record<string, string> = {}) =>
    setup({ packs: [pack], extraFiles: { [join(packDir, "pack.json")]: JSON.stringify(json), ...extra } });

  it("passes --scale, --textures and one --texture-override per entry, sorted by stem, paths with spaces as single items, and no --atlas", async () => {
    const s = withJson(
      {
        scale: 100,
        textures: "Src Files/Textures",
        textureOverrides: { town_hall_mesh: "Src Files/Textures/Town_Hall_b.png", a_mesh: "x y/A.png" },
      },
      {
        [join(packDir, "Src Files", "Textures", "Town_Hall_b.png")]: "png",
        [join(packDir, "x y", "A.png")]: "png",
      },
    );
    expect(await convert([], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(args).not.toContain("--atlas");
    expect(args.slice(args.indexOf("--scale"))).toEqual([
      "--scale",
      "100",
      "--textures",
      join(packDir, "Src Files", "Textures"),
      "--texture-override",
      `a_mesh=${join(packDir, "x y", "A.png")}`,
      "--texture-override",
      `town_hall_mesh=${join(packDir, "Src Files", "Textures", "Town_Hall_b.png")}`,
    ]);
  });

  it("a pack with only a scale passes no --textures and no --texture-override", async () => {
    const s = withJson({ scale: 100 });
    expect(await convert([], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(args).not.toContain("--textures");
    expect(args).not.toContain("--texture-override");
    expect(args.slice(-2)).toEqual(["--scale", "100"]);
  });

  it("texture paths stay in the pack: a textures folder or override outside it is refused before spawning, naming the pack and the key", async () => {
    const elsewhere = resolve("/elsewhere/Textures");
    const cases: Array<{ json: unknown; mention: string[] }> = [
      { json: { textures: "../x" }, mention: [pack, '"textures"', "../x"] },
      { json: { textures: elsewhere }, mention: [pack, '"textures"'] },
      { json: { textureOverrides: { a_mesh: "../a.png" } }, mention: [pack, '"textureOverrides"', "a_mesh", "../a.png"] },
      { json: { textureOverrides: { a_mesh: resolve("/elsewhere/a.png") } }, mention: [pack, '"textureOverrides"', "a_mesh"] },
    ];
    for (const c of cases) {
      const s = withJson(c.json, { [resolve("/elsewhere/a.png")]: "png", [join(elsewhere, "t.png")]: "png" });
      expect(await convert([], s.deps), JSON.stringify(c.json)).toBe(1);
      expect(s.conversions(), JSON.stringify(c.json)).toEqual([]);
      for (const m of c.mention) expect(s.err(), JSON.stringify(c.json)).toContain(m);
      expect(s.writes).toEqual([]);
    }
  });

  it("an override naming a file that doesn't exist is an error naming the pack, the model and the path", async () => {
    const s = withJson({ textureOverrides: { town_hall_mesh: "Textures/Town_Hall_z.png" } });
    expect(await convert([], s.deps)).toBe(1);
    expect(s.conversions()).toEqual([]);
    expect(s.err()).toContain(pack);
    expect(s.err()).toContain("town_hall_mesh");
    expect(s.err()).toContain(join(packDir, "Textures", "Town_Hall_z.png"));
  });

  it("a textures folder that doesn't exist, or keys of the wrong type, fail that pack without running Blender", async () => {
    for (const json of [{ textures: "Nope" }, { textures: 3 }, { textureOverrides: [] }, { textureOverrides: { a: 3 } }]) {
      const s = withJson(json);
      expect(await convert([], s.deps), JSON.stringify(json)).toBe(1);
      expect(s.conversions(), JSON.stringify(json)).toEqual([]);
    }
  });

  it("the usage text documents textures and textureOverrides", () => {
    expect(USAGE).toContain('"textures"');
    expect(USAGE).toContain('"textureOverrides"');
  });
});

describe("Amendment B: pack.json textureAliases", () => {
  const pack = "simple town";
  const packDir = join(L.inRoot, pack);
  const withJson = (json: unknown, extra: Record<string, string> = {}) =>
    setup({ packs: [pack], extraFiles: { [join(packDir, "pack.json")]: JSON.stringify(json), ...extra } });
  const images = {
    [join(packDir, "Tex", "SimpleTown.png")]: "png",
    [join(packDir, "Tex", "Road.png")]: "png",
    [join(packDir, "Tex", "Nature Trees.png")]: "png",
    [join(packDir, "Tex", "a.png")]: "png",
    [join(packDir, "Tex", "notes.txt")]: "text",
    [resolve("/elsewhere/x.png")]: "png",
  };

  it("passes one --texture-alias per entry, keyed by the normalised key, sorted by it, a path with a space as one item", async () => {
    const s = withJson(
      {
        scale: 100,
        textureAliases: { "MasterTexture02.psd": "Tex/SimpleTown.png", "material:Lambert1": "Tex/Road.png", "plants2.PSD": "Tex/Nature Trees.png" },
      },
      images,
    );
    expect(await convert([], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(args.slice(args.indexOf("--scale"))).toEqual([
      "--scale",
      "100",
      "--texture-alias",
      `mastertexture02=${join(packDir, "Tex", "SimpleTown.png")}`,
      "--texture-alias",
      `material:lambert1=${join(packDir, "Tex", "Road.png")}`,
      "--texture-alias",
      `plants2=${join(packDir, "Tex", "Nature Trees.png")}`,
    ]);
  });

  it("with overrides too, the order is --scale, --textures, the --texture-override items, then the --texture-alias items", async () => {
    const s = withJson(
      {
        textureAliases: { "b.psd": "Tex/Road.png", "A.psd": "Tex/a.png" },
        textureOverrides: { z_mesh: "Tex/SimpleTown.png", a_mesh: "Tex/Road.png" },
        textures: "Tex",
        scale: 100,
      },
      images,
    );
    expect(await convert([], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(args.slice(args.indexOf("--scale"))).toEqual([
      "--scale",
      "100",
      "--textures",
      join(packDir, "Tex"),
      "--texture-override",
      `a_mesh=${join(packDir, "Tex", "Road.png")}`,
      "--texture-override",
      `z_mesh=${join(packDir, "Tex", "SimpleTown.png")}`,
      "--texture-alias",
      `a=${join(packDir, "Tex", "a.png")}`,
      "--texture-alias",
      `b=${join(packDir, "Tex", "Road.png")}`,
    ]);
  });

  it("no textureAliases means no --texture-alias", async () => {
    const s = withJson({ scale: 100 });
    expect(await convert([], s.deps)).toBe(0);
    expect(s.conversions()[0]?.args ?? []).not.toContain("--texture-alias");
    const t = withJson({ textureAliases: {} });
    expect(await convert([], t.deps)).toBe(0);
    expect(t.conversions()[0]?.args ?? []).not.toContain("--texture-alias");
  });

  it("normalises keys: a file key is its lowercased stem, a material key keeps its prefix and lowercases the name", () => {
    expect(normaliseAliasKey("MasterTexture02.psd")).toBe("mastertexture02");
    expect(normaliseAliasKey("mastertexture02.PNG")).toBe("mastertexture02");
    expect(normaliseAliasKey("MasterTexture02")).toBe("mastertexture02");
    expect(normaliseAliasKey("a.b.psd")).toBe("a.b");
    expect(normaliseAliasKey("material:Lambert1")).toBe("material:lambert1");
    expect(normaliseAliasKey("Material:Lambert1")).toBe("material:lambert1");
    for (const bad of ["", ".psd", "a/b.psd", "a\\b.psd", "a=b.psd", "material:", "material:a=b"]) expect(normaliseAliasKey(bad), bad).toBeNull();
    expect(hasImageExtension("x/Y.PNG")).toBe(true);
    for (const e of ["png", "jpg", "jpeg", "tga", "tif", "tiff", "bmp"]) expect(hasImageExtension(`a.${e}`)).toBe(true);
    expect(hasImageExtension("a.psd")).toBe(false);
  });

  it("refuses a bad textureAliases before spawning, naming the pack and the key (and the path for a missing file); spawn is never called", async () => {
    const elsewhere = resolve("/elsewhere/x.png");
    const cases: Array<{ aliases: unknown; mention: string[] }> = [
      { aliases: [], mention: ['"textureAliases"'] },
      { aliases: "Tex/Road.png", mention: ['"textureAliases"'] },
      { aliases: null, mention: ['"textureAliases"'] },
      { aliases: { "a.psd": 3 }, mention: ['key "a.psd"'] },
      { aliases: { "a.psd": "" }, mention: ['key "a.psd"'] },
      { aliases: { "a.psd": "../x.png" }, mention: ['key "a.psd"', "../x.png", "outside"] },
      { aliases: { "a.psd": elsewhere }, mention: ['key "a.psd"', "outside"] },
      { aliases: { "a.psd": "Tex/notes.txt" }, mention: ['key "a.psd"', "notes.txt", "not an image"] },
      { aliases: { "a.psd": "Tex/Road.psd" }, mention: ['key "a.psd"', "Road.psd"] },
      { aliases: { "": "Tex/Road.png" }, mention: ['key ""'] },
      { aliases: { "dir/a.psd": "Tex/Road.png" }, mention: ['key "dir/a.psd"'] },
      { aliases: { "dir\\a.psd": "Tex/Road.png" }, mention: ['key "dir\\a.psd"'] },
      { aliases: { "a=b.psd": "Tex/Road.png" }, mention: ['key "a=b.psd"'] },
      { aliases: { "material:": "Tex/Road.png" }, mention: ['key "material:"', "material name"] },
      { aliases: { "A.psd": "Tex/Road.png", "a.png": "Tex/a.png" }, mention: ['"A.psd"', '"a.png"', "same key"] },
      { aliases: { "material:Lambert1": "Tex/Road.png", "MATERIAL:lambert1": "Tex/a.png" }, mention: ['"material:Lambert1"', '"MATERIAL:lambert1"', "same key"] },
      { aliases: { "MasterTexture02.psd": "Tex/Gone.png" }, mention: ['key "MasterTexture02.psd"', join(packDir, "Tex", "Gone.png"), "not found"] },
    ];
    for (const c of cases) {
      const s = withJson({ textureAliases: c.aliases }, images);
      const label = JSON.stringify(c.aliases);
      expect(await convert([], s.deps), label).toBe(1);
      expect(s.conversions(), label).toEqual([]);
      expect(s.err(), label).toContain(`Pack "${pack}" failed`);
      for (const m of c.mention) expect(s.err(), label).toContain(m);
      expect(s.writes, label).toEqual([]);
    }
  });

  it("shows the script's line for an alias that matched no material, and nothing else from its output", async () => {
    const run = setup({
      packs: [pack],
      extraFiles: { [join(packDir, "pack.json")]: JSON.stringify({ textureAliases: { "typo.psd": "Tex/Road.png" } }), ...images },
      behaviour: () => ({ code: 0, stdout: "Blender 5\ntexture alias typo matched no material\nconvert_fbx: 1 model(s)\n" }),
    });
    expect(await convert([], run.deps)).toBe(0);
    expect(run.out()).toContain("simple town: texture alias typo matched no material");
    expect(run.out()).not.toContain("convert_fbx: 1 model(s)");
    const quiet = withJson({ textureAliases: { "typo.psd": "Tex/Road.png" } }, images);
    expect(await convert([], quiet.deps)).toBe(0);
    expect(quiet.out()).not.toContain("matched no material");
  });

  it("the usage text documents textureAliases", () => {
    expect(USAGE).toContain('"textureAliases"');
    expect(USAGE).toContain("material:");
  });

  it("the self-test passes the aliases the ticket names, as the wrapper would for that pack.json", async () => {
    expect(SELFTEST_ALIASES).toEqual({
      "Master_Src.PNG": "Textures/alias_atlas.png",
      "material:Painted_Metal": "Textures/metal_sheet.png",
      "tex_crate.psd": "Textures/alias_atlas.png",
    });
    const dir = join(L.selftest, "pack");
    expect(selftestAliases(dir)).toEqual([
      { key: "master_src", abs: join(dir, "Textures", "alias_atlas.png") },
      { key: "material:painted_metal", abs: join(dir, "Textures", "metal_sheet.png") },
      { key: "tex_crate", abs: join(dir, "Textures", "alias_atlas.png") },
    ]);
    const s = setup({ behaviour: () => ({ code: 0, report: fixtureText("report-selftest.json") }) });
    expect(await convert(["--selftest"], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(args.slice(args.indexOf("--texture-alias"))).toEqual([
      "--texture-alias",
      `master_src=${join(dir, "Textures", "alias_atlas.png")}`,
      "--texture-alias",
      `material:painted_metal=${join(dir, "Textures", "metal_sheet.png")}`,
      "--texture-alias",
      `tex_crate=${join(dir, "Textures", "alias_atlas.png")}`,
      "--scale-override",
      "scaled_box=10",
      "--exclude",
      join(flag(args, "--in") ?? "", "Fbx", "Excluded"),
    ]);
  });
});

describe("Ticket 040: pack.json scaleOverrides", () => {
  const pack = "simple town";
  const packDir = join(L.inRoot, pack);
  const fbx = (...parts: string[]): Record<string, string> => Object.fromEntries(parts.map((p) => [join(packDir, p), "fbx"]));
  const files = {
    ...fbx("Fbx/Building_PetrolStation.fbx", "Fbx/Sub/road_crossing_center_mesh.FBX", "Fbx/other_mesh.fbx"),
    [join(packDir, "Tex", "Road.png")]: "png",
  };
  const withJson = (json: unknown, extra: Record<string, string> = files) =>
    setup({ packs: [pack], extraFiles: { [join(packDir, "pack.json")]: JSON.stringify(json), ...extra } });

  it("passes one --scale-override per entry, sorted by stem, after --scale (and after the aliases when there are some)", async () => {
    const s = withJson({ scale: 100, scaleOverrides: { road_crossing_center_mesh: 0.1, Building_PetrolStation: 0.01 } });
    expect(await convert([], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(args.slice(-6)).toEqual([
      "--scale",
      "100",
      "--scale-override",
      "Building_PetrolStation=0.01",
      "--scale-override",
      "road_crossing_center_mesh=0.1",
    ]);
    const t = withJson({ scale: 100, scaleOverrides: { other_mesh: 2 }, textureAliases: { "a.psd": "Tex/Road.png" } });
    expect(await convert([], t.deps)).toBe(0);
    const targs = t.conversions()[0]?.args ?? [];
    expect(targs.slice(targs.indexOf("--texture-alias"))).toEqual(["--texture-alias", `a=${join(packDir, "Tex", "Road.png")}`, "--scale-override", "other_mesh=2"]);
  });

  it("no scaleOverrides key, or an empty object, means no --scale-override", async () => {
    for (const json of [{ scale: 100 }, { scale: 100, scaleOverrides: {} }]) {
      const s = withJson(json);
      expect(await convert([], s.deps), JSON.stringify(json)).toBe(0);
      expect(s.conversions()[0]?.args ?? [], JSON.stringify(json)).not.toContain("--scale-override");
    }
  });

  it("finds a model's FBX at any depth and with the extension in any case", async () => {
    const s = withJson({ scaleOverrides: { road_crossing_center_mesh: 0.1 } });
    expect(await convert([], s.deps)).toBe(0);
    expect(s.conversions()).toHaveLength(1);
  });

  it("refuses a bad scaleOverrides before spawning, naming the pack and the key; spawn is never called", async () => {
    const cases: Array<{ json: unknown; mention: string[] }> = [
      { json: { scaleOverrides: [] }, mention: ['"scaleOverrides"', "object"] },
      { json: { scaleOverrides: 3 }, mention: ['"scaleOverrides"', "object"] },
      { json: { scaleOverrides: null }, mention: ['"scaleOverrides"', "object"] },
      { json: { scaleOverrides: "0.01" }, mention: ['"scaleOverrides"', "object"] },
      { json: { scaleOverrides: { Building_PetrolStation: "0.01" } }, mention: ['key "Building_PetrolStation"', "number above 0"] },
      { json: { scaleOverrides: { Building_PetrolStation: 0 } }, mention: ['key "Building_PetrolStation"', "number above 0"] },
      { json: { scaleOverrides: { Building_PetrolStation: -1 } }, mention: ['key "Building_PetrolStation"', "number above 0"] },
      { json: { scaleOverrides: { Building_PetrolStation: null } }, mention: ['key "Building_PetrolStation"', "number above 0"] },
      { json: { scaleOverrides: { Building_PetrolStation: [0.01] } }, mention: ['key "Building_PetrolStation"', "number above 0"] },
      { json: { scaleOverrides: { "": 0.01 } }, mention: ['key ""', "a model stem is not empty"] },
      { json: { scaleOverrides: { "Fbx/Building_PetrolStation": 0.01 } }, mention: ['key "Fbx/Building_PetrolStation"', "a model stem is not empty"] },
      { json: { scaleOverrides: { "Fbx\\Building_PetrolStation": 0.01 } }, mention: ['key "Fbx\\Building_PetrolStation"', "a model stem is not empty"] },
      { json: { scaleOverrides: { "a=b": 0.01 } }, mention: ['key "a=b"', "a model stem is not empty"] },
      { json: { scaleOverrides: { Building_PetrolStaton: 0.01 } }, mention: ['key "Building_PetrolStaton"', "no Building_PetrolStaton.fbx"] },
      { json: { scaleOverrides: { Building_PetrolStation: 0.01, nope_mesh: 2 } }, mention: ['key "nope_mesh"'] },
      { json: { scaleOverrides: { "Building_PetrolStation.fbx": 0.01 } }, mention: ['key "Building_PetrolStation.fbx"', "no Building_PetrolStation.fbx.fbx"] },
    ];
    for (const c of cases) {
      const s = withJson(c.json);
      const label = JSON.stringify(c.json);
      expect(await convert([], s.deps), label).toBe(1);
      expect(s.conversions(), label).toEqual([]);
      expect(s.err(), label).toContain(`Pack "${pack}" failed`);
      for (const m of c.mention) expect(s.err(), label).toContain(m);
      expect(s.writes, label).toEqual([]);
    }
  });

  it("a factor that reads as Infinity (1e999) is refused too", async () => {
    const s = setup({
      packs: [pack],
      extraFiles: { [join(packDir, "pack.json")]: '{ "scaleOverrides": { "other_mesh": 1e999 } }', ...files },
    });
    expect(await convert([], s.deps)).toBe(1);
    expect(s.conversions()).toEqual([]);
    expect(s.err()).toContain('key "other_mesh"');
  });

  it("the usage text documents scaleOverrides", () => {
    expect(USAGE).toContain('"scaleOverrides"');
  });

  it("the manifest the CLI writes carries scale per pack and per asset, as the report gave them", async () => {
    const s = withJson({ scale: 100, scaleOverrides: { Fixture_Pole: 0.01 } }, fbx("Fixture_Pole.fbx"));
    expect(await convert([], s.deps)).toBe(0);
    const p = s.manifest().packs[0];
    expect(p?.scale).toBe(100);
    expect(p?.assets.map((a) => [a.name, a.scale])).toEqual([
      ["Fixture_Door", 100],
      ["Fixture_Pole", 1],
    ]);
  });

  it("a report with no scale is a bad report: that pack is left out, naming the pack and the field", async () => {
    const noScale = JSON.parse(fixtureText("report-ok.json")) as { scale?: number };
    delete noScale.scale;
    const s = setup({ packs: ["a-pack"], behaviour: () => ({ code: 0, report: JSON.stringify(noScale) }) });
    expect(await convert([], s.deps)).toBe(1);
    expect(s.err()).toContain('pack "a-pack": scale');
    expect(s.writes).toEqual([]);
  });
});

describe("Packs", () => {
  it("with no arguments converts every subfolder of assets/private/in/ in name order", async () => {
    const s = setup({ packs: ["b-pack", "a-pack", "c-pack"], extraFiles: { [join(L.inRoot, "notes.txt")]: "a file, not a pack" } });
    expect(await convert([], s.deps)).toBe(0);
    expect(s.conversions().map((c) => flag(c.args, "--in"))).toEqual(["a-pack", "b-pack", "c-pack"].map((p) => join(L.inRoot, p)));
  });

  it("with pack names given converts only those", async () => {
    const s = setup({ packs: ["a-pack", "b-pack", "c-pack"] });
    expect(await convert(["c-pack", "a-pack"], s.deps)).toBe(0);
    expect(s.conversions().map((c) => flag(c.args, "--in"))).toEqual([join(L.inRoot, "a-pack"), join(L.inRoot, "c-pack")]);
  });

  it("an unknown pack name exits 1, names it, and runs nothing", async () => {
    const s = setup({ packs: ["a-pack"] });
    expect(await convert(["a-pack", "nosuch"], s.deps)).toBe(1);
    expect(s.err()).toContain("nosuch");
    expect(s.conversions()).toEqual([]);
    expect(s.writes).toEqual([]);
  });

  it("an empty in/ folder prints how to lay a pack out and exits 0", async () => {
    const s = setup({});
    expect(await convert([], s.deps)).toBe(0);
    expect(s.out()).toContain("assets/private/in/<pack>");
    expect(s.out()).toContain("pack.json");
    expect(s.conversions()).toEqual([]);
    expect(s.writes).toEqual([]);
  });

  it("a missing in/ folder prints how to lay a pack out and exits 0", async () => {
    const s = setup({ withInDir: false });
    expect(await convert([], s.deps)).toBe(0);
    expect(s.out()).toContain("assets/private/in/<pack>");
  });

  it("an unknown option exits 1", async () => {
    const s = setup({ packs: ["a"] });
    expect(await convert(["--bogus"], s.deps)).toBe(1);
    expect(s.conversions()).toEqual([]);
  });
});

describe("Output stays private", () => {
  it("the --out, --report and manifest paths are all inside assets/private/", async () => {
    const s = setup({ packs: ["a-pack", "b-pack"] });
    expect(await convert([], s.deps)).toBe(0);
    for (const c of s.conversions()) {
      for (const name of ["--out", "--report"]) {
        const p = flag(c.args, name) ?? "";
        expect(isInside(L.privateRoot, p), `${name} ${p}`).toBe(true);
      }
    }
    expect(s.writes).toEqual([L.manifest]);
    expect(isInside(L.privateRoot, L.manifest)).toBe(true);
  });

  it("a pack name like ../../src is refused before spawning", async () => {
    const s = setup({ packs: ["a-pack"] });
    expect(await convert(["../../src"], s.deps)).toBe(1);
    expect(s.err()).toContain("../../src");
    expect(s.conversions()).toEqual([]);
    expect(s.writes).toEqual([]);
    for (const bad of ["..", ".", "a/b", "a\\b", resolve("/elsewhere")]) {
      const t = setup({ packs: ["a-pack"] });
      expect(await convert([bad], t.deps), bad).toBe(1);
      expect(t.conversions(), bad).toEqual([]);
    }
  });

  it("the .gitignore carries assets/private/", () => {
    const lines = readFileSync(join(repoRoot, ".gitignore"), "utf8").split(/\r?\n/).map((l) => l.trim());
    expect(lines).toContain("assets/private/");
  });
});

describe("Manifest, as the CLI writes it", () => {
  it("lists the packs in name order, with the glb relative to the manifest, and the atlas from pack.json", async () => {
    const s = setup({
      packs: ["b-pack", "a-pack"],
      extraFiles: {
        [join(L.inRoot, "a-pack", "pack.json")]: JSON.stringify({ atlas: "Textures/Atlas.png" }),
        [join(L.inRoot, "a-pack", "Textures", "Atlas.png")]: "png",
      },
    });
    expect(await convert([], s.deps)).toBe(0);
    const m = s.manifest();
    expect(m.version).toBe(1);
    expect(m.generatedAt).toBe("2026-11-12T10:00:00.000Z");
    expect(m.blenderVersion).toBe("4.2.3 LTS");
    expect(m.packs.map((p) => [p.pack, p.glb, p.atlas])).toEqual([
      ["a-pack", "a-pack.glb", "Textures/Atlas.png"],
      ["b-pack", "b-pack.glb", null],
    ]);
    expect(m.packs[0]?.assets.map((a) => a.name)).toEqual(["Fixture_Door", "Fixture_Pole"]);
  });

  it("a pack whose Blender run exits non-zero is left out, its error is printed, the exit is 1, and the others stay", async () => {
    const s = setup({
      packs: ["a-pack", "bad-pack", "c-pack"],
      behaviour: (_args, pack) => (pack === "bad-pack" ? { code: 1, stderr: "Traceback: import failed\nboom" } : { code: 0 }),
    });
    expect(await convert([], s.deps)).toBe(1);
    expect(s.manifest().packs.map((p) => p.pack)).toEqual(["a-pack", "c-pack"]);
    expect(s.err()).toContain('Pack "bad-pack" failed');
    expect(s.err()).toContain("boom");
  });

  it("a malformed report leaves that pack out, names the pack and field, and exits 1", async () => {
    const s = setup({
      packs: ["a-pack", "bad-pack"],
      behaviour: (_args, pack) => (pack === "bad-pack" ? { code: 0, report: fixtureText("report-missing-bounds.json") } : { code: 0 }),
    });
    expect(await convert([], s.deps)).toBe(1);
    expect(s.manifest().packs.map((p) => p.pack)).toEqual(["a-pack"]);
    expect(s.err()).toContain('pack "bad-pack": assets[0].bounds');
  });

  it("Blender exiting 0 without a report is a failure, and a stale report from an earlier run is not read", async () => {
    const stale = join(L.reports, "a-pack.json");
    const s = setup({ packs: ["a-pack"], extraFiles: { [stale]: fixtureText("report-ok.json") }, behaviour: () => ({ code: 0, report: null }) });
    expect(await convert([], s.deps)).toBe(1);
    expect(s.err()).toContain("wrote no report");
    expect(s.writes).toEqual([]);
  });

  it("when every pack fails no manifest is written, so an older good one is not clobbered", async () => {
    const s = setup({ packs: ["a-pack"], extraFiles: { [L.manifest]: "old" }, behaviour: () => ({ code: 3 }) });
    expect(await convert([], s.deps)).toBe(1);
    expect(s.writes).toEqual([]);
    expect(s.files.get(L.manifest)).toBe("old");
  });

  it("naming one pack keeps the other packs' entries from the existing manifest", async () => {
    const s = setup({ packs: ["a-pack", "b-pack"] });
    expect(await convert([], s.deps)).toBe(0);
    expect(await convert(["b-pack"], s.deps)).toBe(0);
    expect(s.manifest().packs.map((p) => p.pack)).toEqual(["a-pack", "b-pack"]);
  });
});

interface RawReport {
  assets: Array<{ name: string; bounds: { min: number[]; max: number[] }; warnings: string[]; textures: string[]; missingTextures: string[] }>;
}

describe("Self-test", () => {
  const good = fixtureText("report-selftest.json");
  const edit = (f: (r: RawReport) => void): string[] => {
    const copy = JSON.parse(good) as RawReport;
    f(copy);
    // Not re-validated on purpose: some edits make the report inconsistent, and the checker must still name the box.
    return checkSelftest(copy as unknown as PackReport);
  };
  const boxOf = (r: RawReport, name: string) => r.assets.find((a) => a.name === name)!;

  it("runs the same script with --selftest inside assets/private/selftest/ and prints selftest ok", async () => {
    const s = setup({ behaviour: () => ({ code: 0, report: good }) });
    expect(await convert(["--selftest"], s.deps)).toBe(0);
    expect(s.out()).toContain("selftest ok");
    const args = s.conversions()[0]?.args ?? [];
    expect(args).toContain("--selftest");
    expect(args).not.toContain("--atlas");
    for (const name of ["--in", "--out", "--report"]) expect(isInside(L.selftest, flag(args, name) ?? "")).toBe(true);
    expect(s.writes).toEqual([]);
  });

  it("fails when the pole is the wrong size (a 100x slip), and says which measure", async () => {
    const bad = JSON.parse(good) as { assets: Array<{ name: string; bounds: { min: number[]; max: number[] } }> };
    const pole = bad.assets.find((a) => a.name === "SelfTest_Pole");
    if (pole) pole.bounds = { min: [-20, 0, -20], max: [20, 300, 20] };
    const s = setup({ behaviour: () => ({ code: 0, report: JSON.stringify(bad) }) });
    expect(await convert(["--selftest"], s.deps)).toBe(1);
    expect(s.err()).toContain("pole height");
    expect(s.out()).not.toContain("selftest ok");
  });

  it("checkSelftest wants the pole 0.4 x 3.0 x 0.4 m (within 1 mm) on its base and centred, and no-uv on the other box", () => {
    expect(checkSelftest(parsePackReport("selftest", JSON.parse(good)))).toEqual([]);
    const poleOf = (r: RawReport) => boxOf(r, "SelfTest_Pole");
    expect(edit((r) => (poleOf(r).bounds.max[1] = 3.002)).join("\n")).toContain("pole height");
    expect(edit((r) => (poleOf(r).bounds.max[1] = 3.0009)).length).toBe(0);
    expect(edit((r) => (poleOf(r).bounds = { min: [-0.2, 0.5, -0.2], max: [0.2, 3.5, 0.2] })).join("\n")).toContain("pole base");
    expect(edit((r) => (poleOf(r).bounds = { min: [0, 0, -0.2], max: [0.4, 3, 0.2] })).join("\n")).toContain("x centre");
    expect(edit((r) => (boxOf(r, "SelfTest_NoUV").warnings = [])).join("\n")).toContain("SelfTest_NoUV warnings");
    expect(edit((r) => r.assets.splice(0, r.assets.length)).length).toBe(11);
  });

  it("checkSelftest names the box and the field when a texture rule's result is wrong", () => {
    const expectProblem = (change: (r: RawReport) => void, ...mention: string[]) => {
      const text = edit(change).join("\n");
      expect(text).not.toBe("");
      for (const m of mention) expect(text).toContain(m);
    };
    expectProblem((r) => (boxOf(r, "guess_mesh").warnings = []), "guess_mesh warnings", "texture-guessed");
    expectProblem((r) => (boxOf(r, "guess_mesh").textures = ["Textures/Guess_b.png"]), "guess_mesh textures", "Guess_a.png");
    expectProblem((r) => (boxOf(r, "ref_case").textures = []), "ref_case textures", "tex_crate.png");
    expectProblem((r) => (boxOf(r, "ref_case").warnings = ["missing-texture"]), "ref_case warnings");
    expectProblem((r) => (boxOf(r, "mat_name").textures = ["Textures/tex_crate.png"]), "mat_name textures", "Sign_Board.png");
    expectProblem((r) => (boxOf(r, "lost_ref").missingTextures = []), "lost_ref missingTextures", "nowhere.png");
    expectProblem((r) => (boxOf(r, "lost_ref").warnings = []), "lost_ref warnings");
    expectProblem((r) => (boxOf(r, "SelfTest_NoUV").textures = []), "SelfTest_NoUV textures");
    expectProblem((r) => (boxOf(r, "SelfTest_Pole").textures = ["Textures/Props.png"]), "SelfTest_Pole textures");
    expectProblem((r) => (boxOf(r, "SelfTest_Pole").warnings = ["missing-texture"]), "SelfTest_Pole warnings");
    expectProblem((r) => r.assets.splice(r.assets.findIndex((a) => a.name === "mat_name"), 1), "mat_name is missing");
  });

  it("amendment B: checkSelftest wants the three alias boxes, and names the box and field when one is wrong", () => {
    expect(checkSelftest(parsePackReport("selftest", JSON.parse(good)))).toEqual([]);
    const expectProblem = (change: (r: RawReport) => void, ...mention: string[]) => {
      const text = edit(change).join("\n");
      expect(text).not.toBe("");
      for (const m of mention) expect(text).toContain(m);
    };
    // a file-name alias: the texture, and no warning
    expectProblem((r) => (boxOf(r, "alias_ref").warnings = ["missing-texture"]), "alias_ref warnings");
    expectProblem((r) => (boxOf(r, "alias_ref").textures = []), "alias_ref textures", "alias_atlas.png");
    expectProblem((r) => (boxOf(r, "alias_ref").missingTextures = ["Master_Src.psd"]), "alias_ref missingTextures");
    expectProblem((r) => (boxOf(r, "alias_ref").warnings = ["texture-guessed"]), "alias_ref warnings");
    // a material alias
    expectProblem((r) => (boxOf(r, "alias_mat").textures = ["Textures/alias_atlas.png"]), "alias_mat textures", "metal_sheet.png");
    expectProblem((r) => (boxOf(r, "alias_mat").warnings = ["missing-texture"]), "alias_mat warnings");
    // rule 3 beats the tex_crate.psd alias
    expectProblem((r) => (boxOf(r, "alias_order").textures = ["Textures/alias_atlas.png"]), "alias_order textures", "tex_crate.png", "alias_atlas.png");
    expectProblem((r) => r.assets.splice(r.assets.findIndex((a) => a.name === "alias_order"), 1), "alias_order is missing");
    // amendment A boxes keep their results
    expect(boxOf(JSON.parse(good) as RawReport, "guess_mesh").warnings).toEqual(["texture-guessed"]);
    expect(boxOf(JSON.parse(good) as RawReport, "lost_ref").missingTextures).toEqual(["nowhere.png"]);
  });
});

describe("Ticket 040: the self-test's rotated 0.01-scaled parent and the scaled box", () => {
  const good = fixtureText("report-selftest.json");
  const edit = (f: (r: RawReport) => void): string[] => {
    const copy = JSON.parse(good) as RawReport & { scale?: number };
    f(copy);
    return checkSelftest(copy as unknown as PackReport);
  };
  const boxOf = (r: RawReport, name: string) => r.assets.find((a) => a.name === name)!;
  type Scaled = RawReport["assets"][number] & { scale?: number };

  it("the fixture passes: both new boxes at their expected size, scale 10 on scaled_box and 1 on every other box", () => {
    expect(checkSelftest(parsePackReport("selftest", JSON.parse(good)))).toEqual([]);
    const r = JSON.parse(good) as { scale: number; assets: Scaled[] };
    expect(r.scale).toBe(1);
    expect(r.assets.map((a) => [a.name, a.scale]).filter(([, s]) => s !== 1)).toEqual([["scaled_box", 10]]);
    const names = r.assets.map((a) => a.name);
    expect(names).toContain("SelfTest_ParentedPole");
    expect(names).toContain("scaled_box");
  });

  it("the parented pole must come out 0.4 x 3.0 x 0.4 m on its base and centred; a wrong size names the box and the field", () => {
    const pole = (r: RawReport) => boxOf(r, "SelfTest_ParentedPole");
    expect(edit((r) => (pole(r).bounds = { min: [-20, 0, -20], max: [20, 300, 20] })).join("\n")).toContain("parented pole height");
    expect(edit((r) => (pole(r).bounds = { min: [-0.273, 0, -0.273], max: [0.273, 3, 0.273] })).join("\n")).toContain("parented pole width");
    expect(edit((r) => (pole(r).bounds = { min: [-0.2, 0.5, -0.2], max: [0.2, 3.5, 0.2] })).join("\n")).toContain("parented pole base");
    expect(edit((r) => (pole(r).bounds = { min: [0, 0, -0.2], max: [0.4, 3, 0.2] })).join("\n")).toContain("parented pole x centre");
    expect(edit((r) => r.assets.splice(r.assets.findIndex((a) => a.name === "SelfTest_ParentedPole"), 1)).join("\n")).toContain("SelfTest_ParentedPole is missing");
  });

  it("scaled_box must come out 10 m with scale 10; 1 m (the override ignored) or the wrong scale value is named", () => {
    const box = (r: RawReport) => boxOf(r, "scaled_box") as Scaled;
    expect(edit((r) => (box(r).bounds = { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] })).join("\n")).toContain("scaled box height");
    expect(edit((r) => (box(r).scale = 1)).join("\n")).toContain("scaled_box scale is 1, expected 10");
    expect(edit((r) => (box(r).scale = 100)).join("\n")).toContain("scaled_box scale is 100, expected 10");
    expect(edit((r) => r.assets.splice(r.assets.findIndex((a) => a.name === "scaled_box"), 1)).join("\n")).toContain("scaled_box is missing");
  });

  it("every other box must report scale 1, and so must the pack", () => {
    expect(edit((r) => ((boxOf(r, "SelfTest_Pole") as Scaled).scale = 10)).join("\n")).toContain("SelfTest_Pole scale is 10, expected 1");
    expect(edit((r) => ((boxOf(r, "alias_ref") as Scaled).scale = 0.01)).join("\n")).toContain("alias_ref scale is 0.01, expected 1");
    expect(edit((r) => ((boxOf(r, "SelfTest_ParentedPole") as Scaled).scale = 0.01)).join("\n")).toContain("SelfTest_ParentedPole scale is 0.01, expected 1");
    expect(edit((r) => ((r as unknown as { scale: number }).scale = 100)).join("\n")).toContain("pack scale is 100, expected 1");
  });
});

describe("Ticket 072: pack.json exclude", () => {
  const pack = "big pack";
  const packDir = join(L.inRoot, pack);
  const fbx = (...parts: string[]): Record<string, string> => Object.fromEntries(parts.map((p) => [join(packDir, p), "fbx"]));
  const files = {
    ...fbx("FBX/Wall.fbx", "FBX/Collision/Wall_Collision.fbx", "FBX/FX/Flame.FBX", "Demo.fbx", "Chars/Hero.fbx", "Chars/Hero2.fbx"),
    [join(packDir, "Notes.txt")]: "text",
  };
  const withJson = (json: unknown, extra: Record<string, string> = files) =>
    setup({ packs: [pack], extraFiles: { [join(packDir, "pack.json")]: JSON.stringify(json), ...extra } });
  const abs = (...p: string[]) => join(packDir, ...p);

  it("passes one --exclude per entry as an absolute path, sorted, after the scale overrides; either slash is accepted", async () => {
    const s = withJson({ scale: 100, scaleOverrides: { Wall: 2 }, exclude: ["FBX\\Collision", "Demo.fbx", "FBX/FX/", "Chars"] });
    expect(await convert([], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(args.slice(args.indexOf("--scale-override"))).toEqual([
      "--scale-override",
      "Wall=2",
      ...["Chars", "Demo.fbx", "FBX/Collision", "FBX/FX"].flatMap((e) => ["--exclude", abs(...e.split("/"))]),
    ]);
  });

  it("without exclude (key absent or an empty array) the arguments carry no --exclude", async () => {
    for (const json of [{ scale: 100 }, { scale: 100, exclude: [] }]) {
      const s = withJson(json);
      expect(await convert([], s.deps), JSON.stringify(json)).toBe(0);
      expect(s.conversions()[0]?.args ?? [], JSON.stringify(json)).not.toContain("--exclude");
    }
    const none = setup({ packs: ["plain"] });
    expect(await convert([], none.deps)).toBe(0);
    expect(none.conversions()[0]?.args ?? []).not.toContain("--exclude");
  });

  it("refuses a bad exclude before spawning, in plain words", async () => {
    const cases: Array<{ json: unknown; mention: string[] }> = [
      { json: { exclude: "FBX/Collision" }, mention: ['"exclude"', "array of non-empty"] },
      { json: { exclude: {} }, mention: ['"exclude"', "array of non-empty"] },
      { json: { exclude: [""] }, mention: ['"exclude"', "array of non-empty"] },
      { json: { exclude: [3] }, mention: ['"exclude"', "array of non-empty"] },
      { json: { exclude: ["FBX/FX", null] }, mention: ['"exclude"', "array of non-empty"] },
      { json: { exclude: ["../other"] }, mention: ['entry "../other"', "outside the pack folder"] },
      { json: { exclude: ["FBX/../../other"] }, mention: ["outside the pack folder"] },
      { json: { exclude: ["."] }, mention: ['entry "."', "the pack folder itself"] },
      { json: { exclude: ["FBX/.."] }, mention: ["the pack folder itself"] },
      { json: { exclude: ["Nope"] }, mention: ['entry "Nope"', "not found"] },
      { json: { exclude: ["FBX/Wall.fbx", "FBX/Missing.fbx"] }, mention: ['entry "FBX/Missing.fbx"', "not found"] },
      { json: { exclude: ["Notes.txt"] }, mention: ['entry "Notes.txt"', "not an .fbx"] },
      { json: { exclude: ["FBX/Collision", "FBX\\Collision\\"] }, mention: ["are the same path", '"FBX/Collision"'] },
      { json: { exclude: ["Demo.fbx", "./Demo.fbx"] }, mention: ["are the same path"] },
    ];
    for (const c of cases) {
      const label = JSON.stringify(c.json);
      const s = withJson(c.json);
      expect(await convert([], s.deps), label).toBe(1);
      expect(s.conversions(), label).toEqual([]);
      expect(s.err(), label).toContain(pack);
      for (const m of c.mention) expect(s.err(), label).toContain(m);
      expect(s.writes, label).toEqual([]);
    }
  });

  it("an excluded .fbx file is accepted in any case of its extension", async () => {
    const s = withJson({ exclude: ["FBX/FX/Flame.FBX"] });
    expect(await convert([], s.deps)).toBe(0);
    expect(s.conversions()[0]?.args ?? []).toContain(abs("FBX", "FX", "Flame.FBX"));
  });

  it("listFbxStems skips excluded paths: a scaleOverrides key naming an excluded model fails with the no-such-fbx error", async () => {
    for (const exclude of [["FBX/Collision"], ["FBX/Collision/Wall_Collision.fbx"], ["FBX"]]) {
      const s = withJson({ exclude, scaleOverrides: { Wall_Collision: 2 } });
      expect(await convert([], s.deps), exclude.join()).toBe(1);
      expect(s.err(), exclude.join()).toContain('key "Wall_Collision"');
      expect(s.err(), exclude.join()).toContain("there is no Wall_Collision.fbx in the pack");
      expect(s.conversions()).toEqual([]);
    }
    // not excluded: the same key is fine, and so is a key for a model outside the excluded folder
    const ok = withJson({ exclude: ["FBX/FX"], scaleOverrides: { Wall_Collision: 2, Hero: 3 } });
    expect(await convert([], ok.deps)).toBe(0);
  });

  it("the usage text documents exclude and says it affects only which FBX are converted, not the texture or OBJ search", () => {
    expect(USAGE).toContain('"exclude"');
    expect(USAGE).toMatch(/"exclude" affects only which FBX are converted/);
    expect(USAGE).toContain("texture and OBJ-copy search still covers the whole pack");
  });

  it("the self-test passes its excluded folder as --exclude, and the script drops it and keeps the whole-pack texture search", async () => {
    const py = readFileSync(join(repoRoot, "tools", "blender", "convert_fbx.py"), "utf8");
    const s = setup({ behaviour: () => ({ code: 0, report: fixtureText("report-selftest.json") }) });
    expect(await convert(["--selftest"], s.deps)).toBe(0);
    const args = s.conversions()[0]?.args ?? [];
    expect(flag(args, "--exclude")).toBe(join(flag(args, "--in") ?? "", "Fbx", "Excluded"));
    expect(py).toContain('"--exclude"');
    expect(py).toContain("def is_excluded(indir, rel, excludes)");
    expect(py).toContain("for rel in find_fbx(indir, excludes):");
    expect(py).toContain('SELFTEST_EXCLUDED = "excluded_box"');
    // the image search is not given the excludes
    expect(py).toContain("build_texture_index(texdir)");
    expect(py).toContain("find_obj_copies(indir)");
  });

  it("checkSelftest fails when the excluded box reaches the report (as a model or as a failure)", () => {
    type Loose = { assets: Array<Record<string, unknown>>; failures: Array<Record<string, unknown>> };
    const good = fixtureText("report-selftest.json");
    const run = (f: (r: Loose) => void): string => {
      const copy = JSON.parse(good) as Loose;
      f(copy);
      return checkSelftest(copy as unknown as PackReport).join("\n");
    };
    expect(checkSelftest(parsePackReport("selftest", JSON.parse(good)))).toEqual([]);
    const box = { ...(good ? (JSON.parse(good) as Loose).assets[0] : {}), name: "excluded_box", source: "Fbx/Excluded/excluded_box.fbx" };
    expect(run((r) => r.assets.push(box))).toContain("excluded_box is in the report");
    expect(run((r) => r.failures.push({ source: "Fbx/Excluded/excluded_box.fbx", error: "x" }))).toContain("excluded_box was tried");
  });

  it("082 B: an included pack's Blender arguments carry its own settings plus one include file, never one argument per FBX; without an include they are as before", () => {
    const base = { script: "s.py", packDir: "/p", outGlb: "/o.glb", report: "/r.json", atlas: "/p/a.png", scale: 2, exclude: ["/p/x"] };
    const plain = buildBlenderArgs(base);
    const included = buildBlenderArgs({ ...base, include: "/tmp/town.include.txt" });
    expect(plain).not.toContain("--include-file");
    expect(included.slice(0, plain.length)).toEqual(plain);
    expect(included.slice(plain.length)).toEqual(["--include-file", "/tmp/town.include.txt"]);
  });

  it("082 B: checkSelftest fails when a model the include file left out reaches the report", () => {
    const report = JSON.parse(fixtureText("report-selftest.json")) as PackReport;
    expect(checkSelftest(report)).toEqual([]);
    const leaked = { ...report, assets: [...report.assets, { ...(report.assets[0] as object), name: "unlisted_box" }] } as unknown as PackReport;
    expect(checkSelftest(leaked).join(" ")).toContain("unlisted_box is in the report");
  });
});

describe("The Python script and the shared constants", () => {
  const py = readFileSync(join(repoRoot, "tools", "blender", "convert_fbx.py"), "utf8");

  it("ticket 040: every mesh's world matrix is copied before any non-mesh object is deleted, the bake uses the copies, and the root parent inverse is identity", () => {
    const snapshot = py.indexOf("worlds = {o.name: o.matrix_world.copy() for o in meshes}");
    const deletion = py.indexOf("bpy.data.objects.remove(o, do_unlink=True)", snapshot);
    const update = py.indexOf("bpy.context.view_layer.update()");
    expect(update).toBeGreaterThan(0);
    expect(snapshot).toBeGreaterThan(update);
    expect(deletion).toBeGreaterThan(snapshot);
    expect(py).toContain("world = worlds[o.name]");
    expect(py).not.toContain("world = o.matrix_world.copy()");
    expect(py).toMatch(/o\.parent = root\r?\n\s+o\.matrix_parent_inverse = Matrix\.Identity\(4\)/);
  });

  it("ticket 040: --scale-override <stem>=<factor> is parsed (factor above 0), multiplied on the pack scale, and reported per model and per pack", () => {
    expect(py).toContain('"--scale-override"');
    expect(py).toContain("def parse_scale_overrides(items)");
    expect(py).toContain("def model_scale(scale, overrides, stem)");
    expect(py).toContain("round(scale * overrides.get(stem, 1.0), 9)");
    expect(py).toContain("global_scale=scale,");
    expect(py).toMatch(/"scale": scale,\r?\n\s+"triangles": triangles,/);
    expect(py).toMatch(/report = \{"blenderVersion": bpy\.app\.version_string, "scale": round\(scale, 9\), "assets": assets/);
  });

  it("ticket 040: the GLB is exported to a temporary file beside it and moved over only after the root check; a failure removes the temp file", () => {
    expect(py).toContain("def temp_glb_path(out)");
    expect(py).toContain("def install_glb(tmp, out, entry_names)");
    expect(py).toMatch(/tmp = temp_glb_path\(out\)\r?\n\s+try:\r?\n\s+bpy\.ops\.export_scene\.gltf\(\r?\n\s+filepath=tmp,/);
    expect(py).not.toMatch(/filepath=out,/);
    expect(py).toMatch(/if wrong:\r?\n\s+remove_quietly\(tmp\)\r?\n\s+return wrong\r?\n\s+os\.replace\(tmp, out\)/);
    expect(py).toMatch(/except Exception:\r?\n\s+remove_quietly\(tmp\)\r?\n\s+raise/);
    // the self-test runs the install check on real files before Blender builds anything
    expect(py).toContain("def check_install(folder)");
    expect(py).toMatch(/check_helpers\(\)\r?\n\s+check_install\(/);
  });

  it("ticket 040: the self-test builds the parented pole (30 degrees, scale 0.01) and the 1 m box the wrapper scales by 10", () => {
    expect(py).toContain('SELFTEST_PARENTED = "SelfTest_ParentedPole"');
    expect(py).toContain('SELFTEST_SCALED = "scaled_box"');
    expect(py).toContain("holder_empty.rotation_euler = (0.0, 0.0, math.radians(30.0))");
    expect(py).toContain("holder_empty.scale = (0.01, 0.01, 0.01)");
    expect(py).toContain("parented.parent = holder_empty");
  });

  it("uses the same sane-size thresholds as src/core/assets.ts", () => {
    // Line endings may be CRLF on a Windows checkout.
    expect(py).toMatch(new RegExp(`^ASSET_SANE_SIZE_MIN = ${ASSET_SANE_SIZE_MIN}\\r?$`, "m"));
    expect(py).toMatch(new RegExp(`^ASSET_SANE_SIZE_MAX = ${ASSET_SANE_SIZE_MAX}\\r?$`, "m"));
  });

  it("takes the arguments the wrapper passes, and the self-test names the wrapper checks", () => {
    for (const a of ["--in", "--out", "--report", "--atlas", "--scale", "--textures", "--texture-override", "--texture-alias", "--selftest"]) expect(py).toContain(`"${a}"`);
    expect(py).toContain('SELFTEST_POLE = "SelfTest_Pole"');
    expect(py).toContain('SELFTEST_NO_UV = "SelfTest_NoUV"');
    for (const box of ["ref_case", "mat_name", "guess_mesh", "lost_ref", "alias_ref", "alias_mat", "alias_order"]) expect(py).toContain(`= "${box}"`);
  });

  it("holds the five lookup rules' generic-name list and the old-FBX message the ticket names, and no no-atlas", () => {
    expect(py).toContain("7100");
    expect(py).toContain("an OBJ copy exists: %s (not converted)");
    expect(py).toContain("is older than Blender's importer accepts");
    for (const g of ["lambert", "phong", "blinn", "defaultmaterial", "initialshadinggroup"]) expect(py).toContain(g);
    expect(py).not.toContain("no-atlas");
  });

  it("each root object is named exactly its file stem: a clashing child mesh is renamed, a wrong name raises, and the GLB's root names are compared with the report", () => {
    expect(py).toMatch(/clash = bpy\.data\.objects\.get\(stem\)\r?\n\s+if clash is not None:\r?\n\s+clash\.name = stem \+ "_child"/);
    expect(py).toMatch(/if root\.name != stem:[\s\S]{0,160}raise RuntimeError/);
    expect(py).toContain("def glb_root_names(path)");
    expect(py).toContain("install_glb(tmp, out, [a[\"name\"] for a in assets])");
    // the self-test builds the clash: an earlier file's mesh is called like a later file's stem
    expect(py).toContain('SELFTEST_CLASH_HOLDER = "clash_holder"');
    expect(py).toContain('SELFTEST_CLASH_STEM = "clash_stem"');
  });

  it("amendment B: the OBJ hint accepts a stem plus digits, and an alias match is silent (no warning is added for it)", () => {
    expect(py).toContain("def obj_copy_for(stem, obj_rels)");
    expect(py).toMatch(/\[0-9\]\+\$/);
    expect(py).toContain("def lookup_alias(aliases, referenced, material_name)");
    expect(py).toContain("matched no material");
    // find_texture_for_material returns an aliased image with guessed = False, so no warning follows from it
    expect(py).toMatch(/found, _key = lookup_alias\(aliases, ref, mat\.name\)\r?\n\s+if found:\r?\n\s+return found, None, False/);
  });
});

describe("Ticket 054 A: --colourways exports the colourway atlases without Blender", () => {
  /** A 24-byte PNG header (signature, then an IHDR chunk length, type, width and height); no pixel data. */
  const png = (width: number, height: number): Uint8Array => {
    const b = new Uint8Array(24);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    const view = new DataView(b.buffer);
    view.setUint32(16, width);
    view.setUint32(20, height);
    return b;
  };
  type Raw = { packs: Array<Record<string, unknown>> };
  const IDS = ["01", "02", "03", "04"].flatMap((s) => ["A", "B", "C"].map((t) => `${s}_${t}`));
  const cityIn = (...parts: string[]) => join(L.inRoot, "city-pack", ...parts);
  const fileOf = (id: string) => `PolygonCity_Texture_${id}.png`;
  const cityFiles = (): Record<string, Uint8Array> => {
    const out: Record<string, Uint8Array> = { [cityIn("Textures", "PolygonCity_Texture.png")]: png(1024, 1024) };
    for (const id of IDS) out[cityIn("Textures", fileOf(id))] = png(1024, 1024);
    return out;
  };
  /** An earlier manifest: city-pack and one other pack, the other with a field no reader knows. */
  const prior = (colourways?: unknown) => ({
    version: 1,
    generatedAt: "2026-11-01T00:00:00.000Z",
    blenderVersion: "4.2.3 LTS",
    packs: [
      { pack: "city-pack", glb: "city-pack.glb", atlas: null, scale: 100, ...(colourways !== undefined ? { colourways } : {}), assets: [], failures: [] },
      { pack: "other", glb: "other.glb", atlas: "Textures/Other.png", scale: 1, assets: [], failures: [], note: { keep: [1, 2] } },
    ],
  });
  const priorText = (colourways?: unknown) => JSON.stringify(prior(colourways), null, 2) + "\n";
  const city = (m: Raw) => m.packs.find((p) => p["pack"] === "city-pack") as Record<string, unknown>;

  it("copies each file, reads its size from the PNG header, writes colourways into only the city-pack entry, and never runs a program", async () => {
    const s = setup({ blender: false, packs: ["city-pack", "other"], binaryFiles: cityFiles(), extraFiles: { [L.manifest]: priorText() } });
    expect(await convert(["--colourways", "city-pack"], s.deps)).toBe(0);
    expect(s.calls).toEqual([]); // no Blender, not even --version
    expect(s.copies).toHaveLength(12);
    expect(s.copies[0]).toEqual([cityIn("Textures", fileOf("01_A")), join(L.out, "city-pack", "colourways", fileOf("01_A"))]);
    for (const [, to] of s.copies) expect(isInside(L.privateRoot, to)).toBe(true);
    expect(s.writes).toEqual([L.manifest]);
    const after = s.manifest() as unknown as Raw;
    expect((city(after)["colourways"] as Array<Record<string, unknown>>).map((c) => c["id"])).toEqual(IDS);
    expect((city(after)["colourways"] as unknown[])[5]).toEqual({
      id: "02_C",
      image: "city-pack/colourways/PolygonCity_Texture_02_C.png",
      base: "PolygonCity_Texture",
      width: 1024,
      height: 1024,
    });
    // every other pack and field is deep-equal to before; only `colourways` was added
    const expected = prior();
    expect(after.packs[1]).toEqual(expected.packs[1]);
    const { colourways: _added, ...rest } = city(after);
    expect(rest).toEqual(expected.packs[0]);
    expect(after).toMatchObject({ version: 1, generatedAt: "2026-11-01T00:00:00.000Z", blenderVersion: "4.2.3 LTS" });
    expect(s.out()).toContain("12 of 12");
  });

  it("with no pack named it exports every pack that has a table and an input folder", async () => {
    const s = setup({ blender: false, packs: ["city-pack", "other"], binaryFiles: cityFiles(), extraFiles: { [L.manifest]: priorText() } });
    expect(await convert(["--colourways"], s.deps)).toBe(0);
    expect(s.copies).toHaveLength(12);
    expect(s.calls).toEqual([]);
  });

  it("a missing file, a non-PNG and a 512 x 512 file each give one warning naming the file and are left out; the rest are written; exit 0", async () => {
    const files = cityFiles();
    delete files[cityIn("Textures", fileOf("01_B"))];
    files[cityIn("Textures", fileOf("02_A"))] = new Uint8Array(40).fill(7);
    files[cityIn("Textures", fileOf("03_C"))] = png(512, 512);
    const s = setup({ blender: false, packs: ["city-pack"], binaryFiles: files, extraFiles: { [L.manifest]: priorText() } });
    expect(await convert(["--colourways", "city-pack"], s.deps)).toBe(0);
    const lines = s.err().trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines.filter((l) => l.includes(fileOf("01_B")))).toHaveLength(1);
    expect(lines.filter((l) => l.includes(fileOf("02_A")) && l.includes("not a PNG"))).toHaveLength(1);
    expect(lines.filter((l) => l.includes(fileOf("03_C")) && l.includes("512 x 512") && l.includes("1024 x 1024"))).toHaveLength(1);
    const ids = ((city(s.manifest() as unknown as Raw)["colourways"] ?? []) as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toEqual(IDS.filter((id) => !["01_B", "02_A", "03_C"].includes(id)));
    expect(s.copies).toHaveLength(9); // a rejected file is never copied
  });

  it("a missing manifest exits 1 and writes and copies nothing", async () => {
    const s = setup({ blender: false, packs: ["city-pack"], binaryFiles: cityFiles() });
    expect(await convert(["--colourways", "city-pack"], s.deps)).toBe(1);
    expect(s.err()).toContain("manifest");
    expect(s.writes).toEqual([]);
    expect(s.copies).toEqual([]);
    expect(s.mkdirs).toEqual([]);
  });

  it("an unusable base atlas exits 1 and leaves the manifest alone; a pack with no table or a bad name is refused", async () => {
    const files = cityFiles();
    delete files[cityIn("Textures", "PolygonCity_Texture.png")];
    const s = setup({ blender: false, packs: ["city-pack"], binaryFiles: files, extraFiles: { [L.manifest]: priorText() } });
    expect(await convert(["--colourways", "city-pack"], s.deps)).toBe(1);
    expect(s.err()).toContain("PolygonCity_Texture.png");
    expect(s.writes).toEqual([]);
    expect(s.copies).toEqual([]);
    for (const bad of ["other", "../x", "nosuch"]) {
      const t = setup({ blender: false, packs: ["city-pack", "other"], binaryFiles: cityFiles(), extraFiles: { [L.manifest]: priorText() } });
      expect(await convert(["--colourways", bad], t.deps), bad).toBe(1);
      expect(t.writes, bad).toEqual([]);
      expect(t.copies, bad).toEqual([]);
    }
  });

  it("a pack that is not in the manifest is reported and nothing is written for it", async () => {
    const m = prior();
    m.packs.shift();
    const s = setup({ blender: false, packs: ["city-pack"], binaryFiles: cityFiles(), extraFiles: { [L.manifest]: JSON.stringify(m) } });
    expect(await convert(["--colourways", "city-pack"], s.deps)).toBe(1);
    expect(s.err()).toContain("city-pack");
    expect(s.writes).toEqual([]);
  });

  it("running it twice gives the same manifest text", async () => {
    const s = setup({ blender: false, packs: ["city-pack"], binaryFiles: cityFiles(), extraFiles: { [L.manifest]: priorText() } });
    await convert(["--colourways", "city-pack"], s.deps);
    const first = s.files.get(L.manifest);
    await convert(["--colourways", "city-pack"], s.deps);
    expect(s.files.get(L.manifest)).toBe(first);
  });

  it("cannot be combined with --selftest", async () => {
    const s = setup({ packs: ["city-pack"] });
    expect(await convert(["--colourways", "--selftest"], s.deps)).toBe(1);
    expect(s.calls).toEqual([]);
  });

  it("a full convert of another pack keeps city-pack's colourways", async () => {
    const kept = IDS.map((id) => ({ id, image: `city-pack/colourways/${fileOf(id)}`, base: "PolygonCity_Texture", width: 1024, height: 1024 }));
    const s = setup({ packs: ["city-pack", "other"], extraFiles: { [L.manifest]: priorText(kept) } });
    expect(await convert(["other"], s.deps)).toBe(0);
    expect(s.conversions().map((c) => flag(c.args, "--in"))).toEqual([join(L.inRoot, "other")]);
    expect(s.copies).toEqual([]); // `other` has no colourway table
    expect(city(s.manifest() as unknown as Raw)["colourways"]).toEqual(kept);
  });

  it("a full convert of city-pack runs the colourway step after its GLB", async () => {
    const order: string[] = [];
    const s = setup({
      packs: ["city-pack"],
      binaryFiles: cityFiles(),
      behaviour: () => {
        order.push("blender");
        return { code: 0 };
      },
    });
    const copyFile = s.deps.copyFile;
    s.deps.copyFile = (from, to) => {
      order.push("copy");
      copyFile(from, to);
    };
    expect(await convert([], s.deps)).toBe(0);
    expect(order[0]).toBe("blender");
    expect(order.filter((x) => x === "copy")).toHaveLength(12);
    expect(order.indexOf("copy")).toBeGreaterThan(order.lastIndexOf("blender"));
    const after = s.manifest() as unknown as Raw;
    expect((city(after)["colourways"] as unknown[]).length).toBe(12);
    expect(city(after)["glb"]).toBe("city-pack.glb");
  });

  it("a full convert of city-pack whose colourway files are absent still succeeds, with a warning only", async () => {
    const s = setup({ packs: ["city-pack"] });
    expect(await convert([], s.deps)).toBe(0);
    expect(s.err()).toContain("PolygonCity_Texture.png");
    expect(city(s.manifest() as unknown as Raw)).not.toHaveProperty("colourways");
  });
});
