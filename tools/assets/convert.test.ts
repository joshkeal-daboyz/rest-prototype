import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_SANE_SIZE_MAX, ASSET_SANE_SIZE_MIN } from "../../src/core";
import type { AssetManifest } from "../../src/core";
import { SELFTEST_ALIASES, USAGE, checkSelftest, convert, hasImageExtension, isInside, layout, normaliseAliasKey, selftestAliases } from "./convert";
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
}) {
  const files = new Map<string, string>();
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
    exists: (p) => files.has(p) || dirs.has(p),
    listDir: (p) => {
      const names = new Set<string>();
      for (const q of [...files.keys(), ...dirs]) if (dirname(q) === p && q !== p) names.add(q.slice(p.length + 1));
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
    ]);
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
        [join(L.inRoot, "a-pack", "pack.json")]: JSON.stringify({ atlas: "Textures\\Atlas.png" }),
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
    expect(edit((r) => r.assets.splice(0, r.assets.length)).length).toBe(9);
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

describe("The Python script and the shared constants", () => {
  const py = readFileSync(join(repoRoot, "tools", "blender", "convert_fbx.py"), "utf8");

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

  it("amendment B: the OBJ hint accepts a stem plus digits, and an alias match is silent (no warning is added for it)", () => {
    expect(py).toContain("def obj_copy_for(stem, obj_rels)");
    expect(py).toMatch(/\[0-9\]\+\$/);
    expect(py).toContain("def lookup_alias(aliases, referenced, material_name)");
    expect(py).toContain("matched no material");
    // find_texture_for_material returns an aliased image with guessed = False, so no warning follows from it
    expect(py).toMatch(/found, _key = lookup_alias\(aliases, ref, mat\.name\)\r?\n\s+if found:\r?\n\s+return found, None, False/);
  });
});
