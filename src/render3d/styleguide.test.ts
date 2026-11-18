/**
 * Ticket 043 section A: the city style guide (docs/city-style-guide.md) cannot drift from the code. The guide is read as text, its Numbers
 * table and its pack, fronts and corner tables are parsed, and each row is compared with the export it names. No WebGL, no network,
 * no assets: the optional manifest check is skipped when assets/private/out/manifest.json is absent.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { parseCalibrationKey } from "../core";
import * as cityRender from "../render/city";
import * as camera from "./camera";
import * as debug3d from "./debug3d";
import * as layout from "./layout";
import * as models from "./models";
import * as placeholders from "./placeholders";
import * as scene from "./scene";
import * as town from "./town";

const GUIDE = "docs/city-style-guide.md";
const MANIFEST = "assets/private/out/manifest.json";

const doc = readFileSync(GUIDE, "utf8");
const lines = doc.split(/\r?\n/);

const MODULES: Readonly<Record<string, Record<string, unknown>>> = {
  "town.ts": town as unknown as Record<string, unknown>,
  "models.ts": models as unknown as Record<string, unknown>,
  "layout.ts": layout as unknown as Record<string, unknown>,
  "scene.ts": scene as unknown as Record<string, unknown>,
  "placeholders.ts": placeholders as unknown as Record<string, unknown>,
  "camera.ts": camera as unknown as Record<string, unknown>,
};

// ---- reading the guide ----

/** The lines of the section that starts at the first line matching `start`, up to the next `## ` heading. */
function section(start: RegExp): string[] {
  const from = lines.findIndex((l) => start.test(l));
  if (from < 0) return [];
  let to = lines.findIndex((l, i) => i > from && /^## /.test(l));
  if (to < 0) to = lines.length;
  return lines.slice(from + 1, to);
}

/**
 * The cells of every row of the first table in `block` whose header row's first cells equal `header`, minus header and separator.
 * The table ends at the first line that does not start with "|". A row with fewer cells than the header is an error, not a row to drop.
 */
function table(block: readonly string[], header: readonly string[]): string[][] {
  const split = (l: string): string[] => l.replace(/^\||\|\s*$/g, "").split("|").map((c) => c.trim());
  const at = block.findIndex((l) => l.startsWith("|") && header.every((h, i) => split(l)[i] === h));
  if (at < 0) return [];
  const out: string[][] = [];
  for (let i = at + 2; i < block.length && block[i]!.startsWith("|"); i++) {
    const cells = split(block[i]!);
    if (cells.length < header.length) throw new Error(`malformed table row (${cells.length} cells, the header has ${header.length}): ${block[i]}`);
    out.push(cells);
  }
  return out;
}

const unquote = (cell: string): string => cell.replace(/^`|`$/g, "");

const chapterHeads = lines.map((l, i) => ({ m: /^## (\d+)\. (.*)$/.exec(l), i })).filter((x) => x.m !== null);
const chapterNumbers = chapterHeads.map((x) => Number(x.m![1]));
function chapter(n: number): string[] {
  return section(new RegExp(`^## ${n}\\. `));
}

// ---- reading the code ----

/** `NAME`, `NAME.field` or `NAME[i]` against a module's exports. */
function lookup(file: string, ref: string): unknown {
  const mod = MODULES[file];
  if (!mod) throw new Error(`the guide names a file the test does not know: ${file}`);
  const m = /^([A-Za-z_][A-Za-z0-9_]*)(?:\.([A-Za-z0-9_]+)|\[(\d+)\])?$/.exec(ref);
  if (!m) throw new Error(`cannot read the constant name ${ref}`);
  const base = mod[m[1]!];
  if (m[2] !== undefined) return (base as Record<string, unknown> | undefined)?.[m[2]];
  if (m[3] !== undefined) return (base as readonly unknown[] | undefined)?.[Number(m[3])];
  return base;
}

describe("the city style guide exists and is shaped as the ticket says", () => {
  it("has the fifteen chapters, in order, and a Numbers appendix", () => {
    expect(chapterNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(lines.some((l) => l === "## Numbers")).toBe(true);
  });

  it("tags every rule: Decided and Default name a ticket; Pending and Open say what they wait for", () => {
    for (let n = 1; n <= 15; n++) {
      const bullets = chapter(n).filter((l) => l.startsWith("- "));
      expect(bullets.length, `chapter ${n} has no rules`).toBeGreaterThan(0);
      for (const b of bullets) {
        const tag = /^- \*\*(Decided|Default|Pending|Open|Info)\b/.exec(b);
        expect(tag, `chapter ${n}: untagged bullet: ${b.slice(0, 80)}`).not.toBeNull();
        if (tag![1] === "Decided" || tag![1] === "Default") {
          expect(/^- \*\*(Decided|Default) \([^)]*\b(03[7-9]|04[0-9])\b/.test(b), `chapter ${n}: no ticket beside: ${b.slice(0, 80)}`).toBe(true);
        }
        if (tag![1] === "Pending" || tag![1] === "Open") {
          expect(new RegExp(`^- \\*\\*${tag![1]} \\(`).test(b), `chapter ${n}: no "what it waits for": ${b.slice(0, 80)}`).toBe(true);
        }
      }
    }
  });

  it("quotes Josh's corner rule verbatim, in the corner chapter", () => {
    const rule = "Corner buildings should only be placed on corners. They must also have two sides facing the street. Only corner buildings have this restriction. Other buildings can be placed on corners normally.";
    expect(chapter(7).join("\n")).toContain(rule);
  });

  it("records Josh's answer to Q4 (POLYGON is the target, SIMPLE Town the test) in the packs chapter, and leaves the exact mix open", () => {
    const text = chapter(13).join("\n");
    expect(text).toContain("SIMPLE town was a test, the city stuff is higher detail");
    expect(/^- \*\*Open \(043 Q4/m.test(text)).toBe(true);
  });

  it("restates the accessibility rule and names the tests that enforce it, all of which exist", () => {
    const text = chapter(12).join("\n");
    for (const f of ["scene.test.ts", "live.test.ts", "look.test.ts"]) {
      expect(text, `chapter 12 names ${f}`).toContain(`\`${f}\``);
      expect(existsSync(`src/render3d/${f}`)).toBe(true);
    }
    expect(/colour alone/.test(text)).toBe(true);
  });

  it("names only files that exist: a bare `x.ts` is in src/render3d, a path with a slash is in the repo", () => {
    for (const m of doc.matchAll(/`([\w./-]+\.(?:ts|md))`/g)) {
      const f = m[1]!;
      const path = f.includes("/") ? f : `src/render3d/${f}`;
      expect(existsSync(path), `the guide names ${f}, which does not exist`).toBe(true);
    }
  });

  it("names only constants that exist (or are Pending ones the guide says so about)", () => {
    // Names from work that is approved and not built (042 B). They leave this list when the work lands and the guide is updated (043 C).
    const PENDING = new Set(["PLACE_MODELS", "PLACE_MIN_SCALE", "PLACE_GLOW_MAX"]);
    const known = new Set<string>([...Object.keys(MODULES["town.ts"]!), ...Object.keys(cityRender), ...Object.keys(debug3d)]);
    for (const mod of Object.values(MODULES)) for (const k of Object.keys(mod)) known.add(k);
    for (const m of doc.matchAll(/`([A-Z][A-Z0-9_]{2,})`/g)) {
      const name = m[1]!;
      expect(known.has(name) || PENDING.has(name), `the guide names ${name}, which no render3d module exports`).toBe(true);
    }
  });
});

describe("the Numbers table matches the code", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);

  // The names the guide must pin, as "Constant@file". A deleted row fails here; a new row is welcome without being listed.
  const REQUIRED: readonly string[] = [
    ...["WORLD_PER_METRE"].map((n) => `${n}@town.ts`),
    ...["WORLD_PER_METRE", "NEIGHBOUR_GAP", "STREET_REPEAT_GAP", "FAMILY_SHARE_MAX"].map((n) => `${n}@models.ts`),
    ...[
      "STREET_MIN_LEN", "ROAD_W", "KERB_OFFSET", "KERB_H", "PAVE_W", "RING_MARGIN", "BLOCK_PITCH", "OUTER_RINGS", "SETBACK", "LOT_GAP", "WIRE_CLEAR",
      "FILL_STEP", "PLACE_STEP", "CORNER_GAP", "CORNER_ANGLE_MAX", "ROW_MIN_SMALLS", "PLACE_REACH", "STOREY_M", "PLACE_STOREYS", "OCCLUDE_SLOPE",
      "NODE_TOP_Y", "LAMP_HEAD_Y", "LOT_TYPES.small", "LOT_TYPES.house", "LOT_TYPES.large", "LOT_TYPES.tall", "PLACE_SIZES.whole", "PLACE_SIZES.quarter",
      "PLACE_SIZES.home",
    ].map((n) => `${n}@town.ts`),
    ...[
      "POLE_HEIGHT", "POLE_SPACING", "SAG_RATIO", "WIRE_RADIUS", "PHASE_OFFSET", "BREAK_GAP", "HANG_DROP", "WIRE_PICK_RADIUS", "DROP_REACH", "DROP_DROP",
      "DROP_END_Y", "CAN_OFFSET", "CAN_DROP",
    ].map((n) => `${n}@layout.ts`),
    ...["ELEVATION", "FOV_DEG"].map((n) => `${n}@camera.ts`),
    ...[
      "GROUND", "YARD", "STREET", "PAVEMENT", "KERB", "CENTRE_LINE", "PLACE", "POLE_WOOD", "FOOT", "METAL", "DEAD_WIRE", "LIVE_WIRE", "LIVE_GLOW",
      "REPAIRED_WIRE", "WARM", "TARGET", "SCORCH", "RIBBON", "INSULATOR", "CAN", "DROP_COLOR",
    ].map((n) => `${n}@scene.ts`),
    ...["TINTS[0]", "TINTS[1]", "TINTS[2]", "TINTS[3]", "ROOF_SHADE", "CAP_M", "PITCH_M"].map((n) => `${n}@placeholders.ts`),
  ];

  it("is not empty and has no row twice", () => {
    expect(rows.length).toBeGreaterThan(60);
    const keys = rows.map((r) => `${unquote(r[0]!)}@${r[2]}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has a row for every constant the guide must pin (a deleted row fails)", () => {
    const have = new Set(rows.map((r) => `${unquote(r[0]!)}@${r[2]}`));
    const missing = REQUIRED.filter((k) => !have.has(k));
    expect(missing, `the Numbers table has no row for: ${missing.join(", ")}`).toEqual([]);
  });

  it("matches every named export: numbers within 1e-9, colours exactly, records field by field", () => {
    // Every mismatch is collected, so one run shows all the drift.
    const problems: string[] = [];
    for (const r of rows) {
      const ref = unquote(r[0]!);
      const want = r[1]!;
      const file = r[2]!;
      const label = `${ref} in ${file}: the guide says ${want}`;
      const actual = lookup(file, ref);
      if (actual === undefined) {
        problems.push(`${label}, but the code has no such export`);
      } else if (/^0x[0-9a-f]{6}$/.test(want)) {
        if (actual !== parseInt(want.slice(2), 16)) problems.push(`${label}, the code has 0x${typeof actual === "number" ? actual.toString(16).padStart(6, "0") : String(actual)}`);
      } else if (want.includes(" x ")) {
        const wantNums = want.split(" x ").map(Number);
        const have = Object.values(actual as Record<string, number>);
        if (have.length !== wantNums.length || wantNums.some((w, i) => !(Math.abs(have[i]! - w) <= 1e-9))) problems.push(`${label}, the code has ${have.join(" x ")}`);
      } else {
        const w = Number(want);
        if (!Number.isFinite(w)) problems.push(`${label} is not a number`);
        else if (typeof actual !== "number" || !(Math.abs(actual - w) <= 1e-9)) problems.push(`${label}, the code has ${String(actual)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("covers every lot type and every place size", () => {
    const refs = new Set(rows.map((r) => unquote(r[0]!)));
    for (const t of town.LOT_TYPE_NAMES) expect(refs.has(`LOT_TYPES.${t}`), `LOT_TYPES.${t}`).toBe(true);
    for (const k of Object.keys(town.PLACE_SIZES)) expect(refs.has(`PLACE_SIZES.${k}`), `PLACE_SIZES.${k}`).toBe(true);
    placeholders.TINTS.forEach((_, i) => expect(refs.has(`TINTS[${i}]`), `TINTS[${i}]`).toBe(true));
  });

  it("pins the scene's inline colours and light by their source text", () => {
    const src = readFileSync("src/render3d/scene.ts", "utf8");
    const inline = table(section(/^## Numbers$/), ["Part", "Source text"]);
    expect(inline.length).toBe(3);
    for (const r of inline) expect(src, `scene.ts no longer holds the text the guide pins for ${r[0]}`).toContain(unquote(r[1]!));
  });
});

describe("one scale", () => {
  it("town.ts and models.ts define the same WORLD_PER_METRE", () => {
    expect(town.WORLD_PER_METRE).toBe(models.WORLD_PER_METRE);
  });
});

describe("the camera's facts behind OCCLUDE_SLOPE", () => {
  it("OCCLUDE_SLOPE is 1 / tan(ELEVATION - FOV_DEG / 2) for the camera's own constants", () => {
    const expected = 1 / Math.tan(camera.ELEVATION - ((camera.FOV_DEG / 2) * Math.PI) / 180);
    expect(Math.abs(town.OCCLUDE_SLOPE - expected)).toBeLessThanOrEqual(1e-9);
  });
});

describe("the pack table matches MODEL_TABLE", () => {
  const rows = table(chapter(13), ["Pack id", "Style", "Converter scale", "Status", "What it supplies"]);
  const ids = rows.map((r) => r[0]!);
  const inUse = rows.filter((r) => r[3] === "in use").map((r) => r[0]!);
  const tablePacks = [...new Set(models.MODEL_TABLE.map((c) => c.pack))];

  it("lists every pack once, each with a known status", () => {
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of rows) expect(["in use", "converted, not used", "not converted"], `${r[0]}'s status`).toContain(r[3]);
  });

  it("has every MODEL_TABLE pack in the table, and every pack marked in use in MODEL_TABLE", () => {
    for (const p of tablePacks) expect(ids, `MODEL_TABLE uses ${p}, which the guide's pack table lacks`).toContain(p);
    for (const p of inUse) expect(tablePacks, `the guide says ${p} is in use, but MODEL_TABLE has no row for it`).toContain(p);
    for (const p of tablePacks) expect(inUse, `MODEL_TABLE uses ${p}, so the guide must mark it in use`).toContain(p);
  });

  const hasManifest = existsSync(MANIFEST);
  it.skipIf(!hasManifest)("agrees with the local manifest on each pack's converter scale and on which packs are converted (when assets/private/out exists)", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { packs: { pack: string; scale: number }[] };
    for (const r of rows) {
      const have = manifest.packs.find((p) => p.pack === r[0]);
      if (r[3] === "not converted") {
        expect(have, `${r[0]} is marked not converted but the manifest has it`).toBeUndefined();
        continue;
      }
      expect(have, `${r[0]} is marked ${r[3]} but the manifest lacks it`).toBeDefined();
      expect(have!.scale, `${r[0]}'s converter scale`).toBe(Number(r[2]));
    }
  });
});

describe("the facing and corner chapters list the fronts that are not the default", () => {
  const facing = table(chapter(6), ["Name", "Front", "Note"]);
  const corners = table(chapter(7), ["Name", "Front", "Open"]);
  const entries = Object.entries(models.BUILDING_FRONTS);

  it("lists, in the facing chapter, exactly the names whose front is not -z and that are not corner models", () => {
    const want = entries.filter(([, f]) => f.front !== "-z" && !f.corner).map(([n, f]) => `${n} ${f.front}`).sort();
    const have = facing.map((r) => `${unquote(r[0]!)} ${r[1]}`).sort();
    expect(have).toEqual(want);
  });

  it("lists, in the corner chapter, exactly the corner models with their front and open side", () => {
    const want = entries.filter(([, f]) => f.corner).map(([n, f]) => `${n} ${f.front} ${f.open ?? "+x"}`).sort();
    const have = corners.map((r) => `${unquote(r[0]!)} ${r[1]} ${r[2]}`).sort();
    expect(have).toEqual(want);
  });

  it("spells every name in the two tables as a pack:name key (ticket 045: names repeat across packs)", () => {
    for (const r of [...facing, ...corners]) expect(parseCalibrationKey(unquote(r[0]!)), `${r[0]} is not a pack:name key`).not.toBeNull();
    expect(chapter(6).join("\n")).toMatch(/one line per `pack:name`/);
  });

  it("says in chapter 15 that a pack's doors are clicked in the gallery (ticket 045)", () => {
    expect(chapter(15).join("\n")).toContain("click each door in the gallery (ticket 045)");
  });

  it("lists every key in BUILDING_EXCLUDE in the choosing chapter, and says it is empty when it is", () => {
    const text = chapter(5).join("\n");
    for (const n of models.BUILDING_EXCLUDE) expect(text, `${n} is excluded in code but not in the guide`).toContain(`\`${n}\``);
    if (models.BUILDING_EXCLUDE.length === 0) expect(text).toMatch(/`BUILDING_EXCLUDE` is empty/);
  });
});

describe("accessibility, restated on the pinned colours", () => {
  const lum = (hex: number): number => {
    const ch = (c: number): number => (c / 255 <= 0.03928 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));
    return 0.2126 * ch((hex >> 16) & 255) + 0.7152 * ch((hex >> 8) & 255) + 0.0722 * ch(hex & 255);
  };
  it("keeps the pole wood at least 3:1 in luminance against the street (037; scene.test.ts checks the painted poles)", () => {
    const c = (lum(scene.POLE_WOOD) + 0.05) / (lum(scene.STREET) + 0.05);
    expect(c).toBeGreaterThanOrEqual(3);
  });
});
