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
import * as citymetrics from "./citymetrics";
import * as debug3d from "./debug3d";
import * as dressing from "./dressing";
import * as furniture from "./furniture";
import * as layout from "./layout";
import * as models from "./models";
import * as placeholders from "./placeholders";
import * as scene from "./scene";
import * as stacks from "./stacks";
import * as streetcam from "./streetcam";
import * as terrace from "./terrace";
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
  "stacks.ts": stacks as unknown as Record<string, unknown>,
  "terrace.ts": terrace as unknown as Record<string, unknown>,
  "dressing.ts": dressing as unknown as Record<string, unknown>,
  "furniture.ts": furniture as unknown as Record<string, unknown>,
  "streetcam.ts": streetcam as unknown as Record<string, unknown>,
  "citymetrics.ts": citymetrics as unknown as Record<string, unknown>,
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

/** `NAME`, then any run of `.field` and `[i]` (for example `STACK_STYLES[0].pitch_m`), against a module's exports. */
function lookup(file: string, ref: string): unknown {
  const mod = MODULES[file];
  if (!mod) throw new Error(`the guide names a file the test does not know: ${file}`);
  const m = /^([A-Za-z_][A-Za-z0-9_]*)((?:\.[A-Za-z0-9_]+|\[\d+\])*)$/.exec(ref);
  if (!m) throw new Error(`cannot read the constant name ${ref}`);
  let cur: unknown = mod[m[1]!];
  for (const t of m[2]!.matchAll(/\.([A-Za-z0-9_]+)|\[(\d+)\]/g)) {
    if (cur === undefined || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[t[1] ?? t[2]!];
  }
  return cur;
}

describe("the city style guide exists and is shaped as the ticket says", () => {
  it("has the sixteen chapters, in order, and a Numbers appendix", () => {
    expect(chapterNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(lines.some((l) => l === "## Numbers")).toBe(true);
  });

  it("tags every rule: Decided and Default name a ticket; Pending and Open say what they wait for", () => {
    for (let n = 1; n <= 16; n++) {
      const bullets = chapter(n).filter((l) => l.startsWith("- "));
      expect(bullets.length, `chapter ${n} has no rules`).toBeGreaterThan(0);
      for (const b of bullets) {
        const tag = /^- \*\*(Decided|Default|Pending|Open|Info)\b/.exec(b);
        expect(tag, `chapter ${n}: untagged bullet: ${b.slice(0, 80)}`).not.toBeNull();
        if (tag![1] === "Decided" || tag![1] === "Default") {
          expect(/^- \*\*(Decided|Default) \([^)]*\b(03[7-9]|04[0-9]|05[0-9])\b/.test(b), `chapter ${n}: no ticket beside: ${b.slice(0, 80)}`).toBe(true);
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
    ...["WORLD_PER_METRE", "NEIGHBOUR_GAP", "STREET_REPEAT_GAP", "FAMILY_SHARE_MAX", "POLYGON_MIN_FAMILIES.small", "POLYGON_MIN_FAMILIES.house", "POLYGON_MIN_FAMILIES.large", "POLYGON_MIN_FAMILIES.tall"].map((n) => `${n}@models.ts`),
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
    ...["STACK_FLOORS.small", "STACK_FLOORS.house", "STACK_FLOORS.large", "STACK_FLOORS.tall"].map((n) => `${n}@stacks.ts`),
    ...[0, 1, 2, 3, 4, 5].map((i) => `STACK_STYLES[${i}].pitch_m@stacks.ts`),
    ...["TERRACE_SEAM_M", "TERRACE_SLACK_M", "ALLEY_MIN_M", "ALLEY_MAX_M"].map((n) => `${n}@terrace.ts`),
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
  // A pack is in use when MODEL_TABLE has a row for it or a stack recipe is built from it (ticket 050 C: the City Pack's stacks are not whole-model rows).
  const tablePacks = [...new Set([...models.MODEL_TABLE.map((c) => c.pack), ...stacks.STACK_STYLES.map((s) => s.pack)])];

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

// ---- ticket 053: chapter 16 and the numbers it pins ----

describe("every numeric export of the city files has a Numbers row (ticket 053)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const refs = new Set(rows.map((r) => `${unquote(r[0]!)}@${r[2]}`));
  /** A number, a non-empty array of numbers, or a non-empty record of numbers: what a tuning constant looks like. */
  const numeric = (v: unknown): boolean =>
    typeof v === "number" ||
    (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "number")) ||
    (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length > 0 && Object.values(v).every((x) => typeof x === "number"));
  const has = (file: string, ref: string): boolean => refs.has(`${ref}@${file}`);
  const covered = (file: string, name: string, v: unknown): boolean => {
    if (has(file, name)) return true;
    if (Array.isArray(v)) return v.every((_, i) => has(file, `${name}[${i}]`));
    if (typeof v === "object" && v !== null) return Object.keys(v).every((k) => has(file, `${name}.${k}`));
    return false;
  };

  it("has a row for every numeric constant of stacks, terrace, dressing, furniture, streetcam and citymetrics, and the TERRACE_, PARKING_ and PLAZA_ ones of town.ts", () => {
    const missing: string[] = [];
    let checked = 0;
    for (const file of ["stacks.ts", "terrace.ts", "dressing.ts", "furniture.ts", "streetcam.ts", "citymetrics.ts", "town.ts"]) {
      for (const [name, v] of Object.entries(MODULES[file]!)) {
        if (file === "town.ts" && !/^(TERRACE_|PARKING_|PLAZA_)/.test(name)) continue;
        if (!numeric(v)) continue;
        checked++;
        if (!covered(file, name, v)) missing.push(`${name} in ${file}`);
      }
    }
    expect(checked, "the check found the constants").toBeGreaterThan(80);
    expect(missing, `the Numbers table has no row for: ${missing.join(", ")}`).toEqual([]);
  });

  it("pins CITY_CHECK as a record row and the 051 B constants of town.ts", () => {
    expect(has("citymetrics.ts", "CITY_CHECK")).toBe(true);
    expect(covered("dressing.ts", "NO_SUCH_CONSTANT", 1), "a constant with no row is found missing").toBe(false);
    for (const n of ["TERRACE_BAY_M", "TERRACE_DEPTH_M", "TERRACE_BAYS", "PARKING_W_M", "PARKING_D_M", "PARKING_MIN_RUN_BAYS", "PARKING_ONE_IN", "PLAZA_W_M", "PLAZA_ONE_IN"]) expect(has("town.ts", n), n).toBe(true);
    for (const i of [0, 1, 2]) expect(has("town.ts", `TERRACE_CAPS_M[${i}]`), `TERRACE_CAPS_M[${i}]`).toBe(true);
  });
});

describe("chapter 16: the never-used list is the code's (ticket 053)", () => {
  const text = chapter(16).join("\n");
  const rows = table(chapter(16), ["Never used", "Reason"]);
  const stems = rows.map((r) => unquote(r[0]!).replace(/\*$/, ""));

  it("lists exactly CITY_NEVER_USED, each with a reason", () => {
    expect(stems.length).toBeGreaterThan(15);
    expect(new Set(stems).size).toBe(stems.length);
    expect([...stems].sort()).toEqual([...citymetrics.CITY_NEVER_USED].sort());
    for (const r of rows) expect(r[1]!.length, `${r[0]} has no reason`).toBeGreaterThan(3);
    expect(text).toContain("`CITY_NEVER_USED`");
    expect(text).toMatch(/people/);
    expect(text).toMatch(/vehicles/);
  });

  it("names no key that any rule table can place: not the dressing, the furniture, a stack recipe, MODEL_TABLE's City Pack rows or BUILDING_FRONTS", () => {
    const keys = [
      ...dressing.dressKeys(),
      ...furniture.furnitureKeys(),
      ...stacks.STACK_STYLES.flatMap((s) => stacks.stackKeys(s)),
      ...models.MODEL_TABLE.filter((c) => c.pack === "city-pack").flatMap((c) => c.names.map((n) => `city-pack:${n}`)),
      ...Object.keys(models.BUILDING_FRONTS).filter((k) => k.startsWith("city-pack:")),
    ];
    expect(keys.length).toBeGreaterThan(150);
    for (const key of keys) {
      const name = key.slice(key.indexOf(":") + 1);
      for (const s of stems) expect(name.startsWith(s), `${key} is in a rule table but the guide says ${s}* is never used`).toBe(false);
    }
  });
});

describe("chapter 16 gives the grammar and the evaluation protocol (ticket 053)", () => {
  const text = chapter(16).join("\n");
  const MAPS = ["09-shrine-circuit", "64-the-whole-chain", "01-first-light"];

  it("has its nine parts, in order", () => {
    const heads = chapter(16)
      .filter((l) => /^### 16\.\d /.test(l))
      .map((l) => Number(/^### 16\.(\d) /.exec(l)![1]));
    expect(heads).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(text).toMatch(/### 16\.8 Evaluation protocol/);
  });

  it("names each of the three maps, and each is a puzzle in puzzles/", () => {
    const rows = table(chapter(16), ["Map", "Why"]);
    expect(rows.map((r) => unquote(r[0]!))).toEqual(MAPS);
    for (const id of MAPS) expect(existsSync(`puzzles/${id}.json`), id).toBe(true);
  });

  it("names R1 to R12 in order, each as auto or eye, and the names are CITY_CHECK's", () => {
    const rows = table(chapter(16), ["Item", "What the reference shows", "How it is checked"]);
    expect(rows.map((r) => r[0]!)).toEqual(Object.keys(citymetrics.CITY_CHECK));
    for (const r of rows) expect(r[2]!, `${r[0]} says how it is checked`).toMatch(/\b(auto|eye)\b/);
    for (const id of Object.keys(citymetrics.CITY_CHECK)) expect(text, id).toMatch(new RegExp(`\\b${id}\\b`));
  });

  it("gives every view as a URL that parses: the street views with streetCamRequested, the play view and the gallery without a street camera, on a map in puzzles/", () => {
    const rows = table(chapter(16), ["Map", "View", "URL"]);
    expect(rows.length).toBe(MAPS.length * 9 + 1);
    const seen = new Set<string>();
    for (const r of rows) {
      const map = unquote(r[0]!);
      const view = r[1]!;
      const url = new URL(unquote(r[2]!), "http://localhost");
      expect(url.pathname, view).toBe("/");
      const puzzle = url.searchParams.get("puzzle");
      expect(MAPS, `${map} ${view}`).toContain(puzzle);
      expect(puzzle, "the row's map is the URL's").toBe(map);
      expect(existsSync(`puzzles/${puzzle}.json`), String(puzzle)).toBe(true);
      expect(url.searchParams.get("view"), view).toBe("3d");
      const cam = streetcam.streetCamRequested(url.search);
      if (/^(play view|stack gallery)/.test(view)) {
        expect(cam, `${view} is not a street view`).toBeNull();
        if (/gallery/.test(view)) for (const [k, v] of [["gallery", "city-pack"], ["stacks", "1"], ["dress", "1"]] as const) expect(url.searchParams.get(k), `${view} ${k}`).toBe(v);
      } else {
        expect(cam, `${view}: the street camera reads this URL`).not.toBeNull();
        expect(cam!.day, view).toBe(/day$/.test(view));
        const want = /longest/.test(view) ? { run: 0, at: 0.5 } : /second/.test(view) ? { run: 1, at: 0.5 } : /third/.test(view) ? { run: 2, at: 0.5 } : { run: 0, at: 0 };
        expect({ run: cam!.run, at: cam!.at }, view).toEqual(want);
        seen.add(`${map}|${view}`);
      }
    }
    // every map has all eight street views (four rows, night and day)
    expect(seen.size).toBe(MAPS.length * 8);
  });

  it("says to wait for the street camera's console line, and that each street view is judged at night and by day", () => {
    expect(text).toContain("street camera:");
    expect(text).toMatch(/night and again with `light=day`/);
    expect(existsSync("src/render3d/citymetrics.test.ts")).toBe(true);
  });

  it("records what is deliberately not built and what does not yet match", () => {
    for (const w of ["lit windows", "balconies and cornices", "variety of awnings and rooftops by colour", "never used", "Evaluation protocol"]) expect(text.toLowerCase(), w).toContain(w.toLowerCase());
    expect(/^- \*\*Open \(/m.test(text)).toBe(true);
  });
});
