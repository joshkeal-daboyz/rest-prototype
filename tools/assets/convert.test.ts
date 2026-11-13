import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_SANE_SIZE_MAX, ASSET_SANE_SIZE_MIN } from "../../src/core";
import type { AssetManifest } from "../../src/core";
import { checkSelftest, convert, isInside, layout } from "./convert";
import type { ConvertDeps, RunResult } from "./convert";
import { parsePackReport } from "./manifest";

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
type Behaviour = (args: readonly string[], pack: string) => { code: number; stderr?: string; report?: string | null };

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
      return Promise.resolve({ code: b.code, stdout: "", stderr: b.stderr ?? "" });
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

describe("Self-test", () => {
  const good = fixtureText("report-selftest.json");

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

    const raw = JSON.parse(good) as { assets: Array<{ name: string; bounds: { min: number[]; max: number[] }; warnings: string[] }> };
    const edit = (f: (r: typeof raw) => void) => {
      const copy = JSON.parse(good) as typeof raw;
      f(copy);
      return checkSelftest(parsePackReport("selftest", copy));
    };
    const poleOf = (r: typeof raw) => r.assets.find((a) => a.name === "SelfTest_Pole")!;
    expect(edit((r) => (poleOf(r).bounds.max[1] = 3.002)).join("\n")).toContain("pole height");
    expect(edit((r) => (poleOf(r).bounds.max[1] = 3.0009)).length).toBe(0);
    expect(edit((r) => (poleOf(r).bounds = { min: [-0.2, 0.5, -0.2], max: [0.2, 3.5, 0.2] })).join("\n")).toContain("pole base");
    expect(edit((r) => (poleOf(r).bounds = { min: [0, 0, -0.2], max: [0.4, 3, 0.2] })).join("\n")).toContain("x centre");
    expect(edit((r) => (r.assets.find((a) => a.name === "SelfTest_NoUV")!.warnings = [])).join("\n")).toContain("no-uv");
    expect(edit((r) => r.assets.splice(0, 2)).length).toBe(2);
  });
});

describe("The Python script and the shared constants", () => {
  const py = readFileSync(join(repoRoot, "tools", "blender", "convert_fbx.py"), "utf8");

  it("uses the same sane-size thresholds as src/core/assets.ts", () => {
    expect(py).toContain(`ASSET_SANE_SIZE_MIN = ${ASSET_SANE_SIZE_MIN}\n`);
    expect(py).toContain(`ASSET_SANE_SIZE_MAX = ${ASSET_SANE_SIZE_MAX}\n`);
  });

  it("takes the arguments the wrapper passes, and the self-test names the wrapper checks", () => {
    for (const a of ["--in", "--out", "--report", "--atlas", "--scale", "--selftest"]) expect(py).toContain(`"${a}"`);
    expect(py).toContain('SELFTEST_POLE = "SelfTest_Pole"');
    expect(py).toContain('SELFTEST_NO_UV = "SelfTest_NoUV"');
  });
});
