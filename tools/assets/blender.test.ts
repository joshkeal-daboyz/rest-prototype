import { describe, expect, it } from "vitest";
import { BLENDER_MISSING_TEXT, BlenderPathError, findBlender, parseBlenderVersion, versionAtLeast } from "./blender";

const WIN_BASE = "C:\\Program Files\\Blender Foundation";

function deps(opts: {
  env?: Record<string, string>;
  platform?: string;
  files?: string[];
  dirs?: Record<string, string[]>;
}) {
  const files = new Set(opts.files ?? []);
  return {
    env: opts.env ?? {},
    platform: opts.platform ?? "linux",
    exists: (p: string) => files.has(p),
    listDir: (p: string) => opts.dirs?.[p] ?? [],
  };
}

describe("Blender lookup order (findBlender)", () => {
  it("returns BLENDER_PATH when it is set and the file exists, ahead of PATH", () => {
    const d = deps({
      env: { BLENDER_PATH: "/opt/b/blender", PATH: "/usr/bin" },
      files: ["/opt/b/blender", "/usr/bin/blender"],
    });
    expect(findBlender(d)).toBe("/opt/b/blender");
  });

  it("a BLENDER_PATH that points at a missing file is an error naming the path, not a fall-through to PATH", () => {
    const d = deps({ env: { BLENDER_PATH: "/nope/blender", PATH: "/usr/bin" }, files: ["/usr/bin/blender"] });
    expect(() => findBlender(d)).toThrow(BlenderPathError);
    expect(() => findBlender(d)).toThrow(/\/nope\/blender/);
  });

  it("returns the first PATH hit, in PATH order", () => {
    const d = deps({
      env: { PATH: "/a:/b:/c" },
      files: ["/c/blender", "/b/blender"],
    });
    expect(findBlender(d)).toBe("/b/blender");
  });

  it("on win32 finds blender.exe on PATH, whatever the case of the variable name", () => {
    const d = deps({
      platform: "win32",
      env: { Path: "C:\\Windows;D:\\tools\\Blender" },
      files: ["D:\\tools\\Blender\\blender.exe"],
    });
    expect(findBlender(d)).toBe("D:\\tools\\Blender\\blender.exe");
  });

  it("on win32 only, takes the newest Blender Foundation folder, and 4.10 sorts above 4.9", () => {
    const dirs = { [WIN_BASE]: ["Blender 3.6", "Blender 4.9", "Blender 4.10", "Blender 4.2", "Readme"] };
    const files = ["4.9", "4.10", "4.2", "3.6"].map((v) => `${WIN_BASE}\\Blender ${v}\\blender.exe`);
    expect(findBlender(deps({ platform: "win32", env: {}, files, dirs }))).toBe(`${WIN_BASE}\\Blender 4.10\\blender.exe`);
    // Not win32: that folder is never looked at.
    expect(findBlender(deps({ platform: "linux", env: {}, files, dirs }))).toBeNull();
  });

  it("on win32 skips a newer folder that has no blender.exe in it", () => {
    const dirs = { [WIN_BASE]: ["Blender 4.3", "Blender 4.2"] };
    const files = [`${WIN_BASE}\\Blender 4.2\\blender.exe`];
    expect(findBlender(deps({ platform: "win32", env: {}, files, dirs }))).toBe(`${WIN_BASE}\\Blender 4.2\\blender.exe`);
  });

  it("returns null when nothing is found", () => {
    expect(findBlender(deps({ env: { PATH: "/usr/bin" } }))).toBeNull();
    expect(findBlender(deps({ platform: "win32", env: {} }))).toBeNull();
  });

  it("the not-found text names the download page, BLENDER_PATH and PATH", () => {
    expect(BLENDER_MISSING_TEXT).toContain("https://www.blender.org/download/");
    expect(BLENDER_MISSING_TEXT).toContain("BLENDER_PATH");
    expect(BLENDER_MISSING_TEXT).toContain("PATH");
  });
});

describe("Blender version gate", () => {
  it("parseBlenderVersion reads the banner: Blender 4.2.3 LTS gives [4, 2, 3]", () => {
    expect(parseBlenderVersion("Blender 4.2.3 LTS\n\tbuild date: 2024-10-15\n")).toEqual([4, 2, 3]);
    expect(parseBlenderVersion("Blender 4.10")).toEqual([4, 10, 0]);
    expect(parseBlenderVersion("not blender at all")).toBeNull();
  });

  it("4.2 and newer pass; anything below 4.2 does not (4.10 is newer than 4.2)", () => {
    expect(versionAtLeast([4, 2, 0])).toBe(true);
    expect(versionAtLeast([4, 10, 0])).toBe(true);
    expect(versionAtLeast([5, 0, 0])).toBe(true);
    expect(versionAtLeast([4, 1, 9])).toBe(false);
    expect(versionAtLeast([3, 6, 0])).toBe(false);
  });
});
