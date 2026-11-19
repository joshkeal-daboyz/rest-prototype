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
import * as colourway from "./colourway";
import * as citymetrics from "./citymetrics";
import * as debug3d from "./debug3d";
import * as dressing from "./dressing";
import * as escapes from "./escapes";
import * as facade from "./facade";
import * as frontage from "./frontage";
import * as furniture from "./furniture";
import * as layout from "./layout";
import * as lighting from "./lighting";
import * as models from "./models";
import * as parkmetrics from "./parkmetrics";
import * as placeholders from "./placeholders";
import * as scene from "./scene";
import * as sills from "./sills";
import * as stacks from "./stacks";
import * as streetcam from "./streetcam";
import * as terrace from "./terrace";
import * as tilecity from "./tilecity";
import * as tileslots from "./tileslots";
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
  "escapes.ts": escapes as unknown as Record<string, unknown>,
  "facade.ts": facade as unknown as Record<string, unknown>,
  "frontage.ts": frontage as unknown as Record<string, unknown>,
  "sills.ts": sills as unknown as Record<string, unknown>,
  "furniture.ts": furniture as unknown as Record<string, unknown>,
  "streetcam.ts": streetcam as unknown as Record<string, unknown>,
  "citymetrics.ts": citymetrics as unknown as Record<string, unknown>,
  "colourway.ts": colourway as unknown as Record<string, unknown>,
  "lighting.ts": lighting as unknown as Record<string, unknown>,
  "tilecity.ts": tilecity as unknown as Record<string, unknown>,
  "tileslots.ts": tileslots as unknown as Record<string, unknown>,
  "parkmetrics.ts": parkmetrics as unknown as Record<string, unknown>,
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
  it("has the sixteen chapters and chapters 18 and 19 (tickets 056 and 057), in order, and a Numbers appendix", () => {
    expect(chapterNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]);
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
          expect(/^- \*\*(Decided|Default) \([^)]*\b(03[7-9]|04[0-9]|05[0-9]|06[0-9])\b/.test(b), `chapter ${n}: no ticket beside: ${b.slice(0, 80)}`).toBe(true);
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
    const src = readFileSync("src/render3d/lighting.ts", "utf8");
    const inline = table(section(/^## Numbers$/), ["Part", "Source text"]);
    expect(inline.length).toBe(3);
    for (const r of inline) expect(src, `lighting.ts no longer holds the text the guide pins for ${r[0]}`).toContain(unquote(r[1]!));
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

// ---- ticket 054 C: colourway.ts joins the drift-checked files ----

describe("colourway.ts is drift-checked and 16.9 names the colourways (ticket 054)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const refs = rows.filter((r) => r[2] === "colourway.ts").map((r) => unquote(r[0]!));
  /** The exports of a module that are not functions and are covered by no row: a row is the name itself, or the name followed by a field or an index (`COLOURWAY_POOL.length`). */
  const uncovered = (mod: Record<string, unknown>, have: readonly string[]): string[] =>
    Object.entries(mod)
      .filter(([, v]) => typeof v !== "function")
      .map(([name]) => name)
      .filter((name) => !have.some((r) => r === name || r.startsWith(`${name}.`) || r.startsWith(`${name}[`)));

  it("has a Numbers row for every constant colourway.ts exports, and the check finds a constant with no row", () => {
    expect(Object.values(MODULES["colourway.ts"]!).some((v) => typeof v !== "function"), "colourway.ts exports a constant").toBe(true);
    expect(uncovered(MODULES["colourway.ts"]!, refs), "no row for these colourway.ts exports").toEqual([]);
    // Not vacuous: a constant added to the file without a row, and a row left out, are both found.
    expect(uncovered({ ...MODULES["colourway.ts"]!, NEW_TUNING: 3 }, refs)).toEqual(["NEW_TUNING"]);
    expect(uncovered(MODULES["colourway.ts"]!, [])).toContain("COLOURWAY_POOL");
  });

  it("pins the pool's size in the Numbers table (its ids are the table in 16.9)", () => {
    expect(refs).toContain("COLOURWAY_POOL.length");
    expect(colourway.COLOURWAY_POOL.length).toBe(8);
  });

  it("lists in 16.9 exactly the ids of COLOURWAY_POOL, in its order, and names the rule and its check", () => {
    const text = chapter(16).join("\n");
    const ids = table(chapter(16), ["Id", "Series", "Tone", "Brick wall"]).map((r) => r[0]!);
    expect(ids).toEqual([...colourway.COLOURWAY_POOL]);
    for (const id of colourway.COLOURWAY_POOL) expect(text, id).toContain(id);
    for (const w of ["COLOURWAY_POOL", "assignColourways", "Colourways (ticket 054)", "dressing and furniture keep the base atlas", "light=day"]) expect(text.toLowerCase(), w).toContain(w.toLowerCase());
    expect(/^- \*\*Open \(waits for [^)]*\)\*\*: not every wall changes/m.test(text), "risk 1 is an Open line").toBe(true);
  });

  it("lists R13 in 16.8 as auto and eye, with the at-least-four-wall-colours eye half and the day street view", () => {
    const rows = table(chapter(16), ["Item", "What the reference shows", "How it is checked"]);
    const r13 = rows.find((r) => r[0] === "R13");
    expect(r13, "16.8 has a row for R13").toBeDefined();
    expect(r13![2]!).toMatch(/\bauto\b/);
    expect(r13![2]!).toMatch(/\beye\b/);
    expect(r13![2]!).toContain("at least four wall colours");
    expect(r13![2]!).toContain("cam=street&run=0&light=day");
    expect(Object.keys(citymetrics.CITY_CHECK)).toContain("R13");
  });
});

// ---- ticket 060: lighting.ts joins the drift-checked files ----

describe("lighting.ts is drift-checked and 16.12 describes the testing daylight (ticket 060)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const refs = rows.filter((r) => r[2] === "lighting.ts").map((r) => unquote(r[0]!));

  /** Every number in a value, as a path the Numbers table names: `LIGHT_MODES.night.moon.position[0]`. Words (the tone mapping), booleans and nulls are not numbers. */
  function leaves(prefix: string, v: unknown, out: string[]): string[] {
    if (typeof v === "number") out.push(prefix);
    else if (Array.isArray(v)) v.forEach((x, i) => leaves(`${prefix}[${i}]`, x, out));
    else if (typeof v === "object" && v !== null) for (const [k, x] of Object.entries(v)) leaves(`${prefix}.${k}`, x, out);
    return out;
  }
  const every = (mod: Record<string, unknown>): string[] => Object.entries(mod).filter(([, v]) => typeof v !== "function").flatMap(([name, v]) => leaves(name, v, []));

  it("has a Numbers row for every number lighting.ts exports, and the check finds a number with no row", () => {
    const all = every(MODULES["lighting.ts"]!);
    expect(all.length, "the check found the numbers").toBeGreaterThan(30);
    expect(all.filter((p) => !refs.includes(p)), "no row for these lighting.ts numbers").toEqual([]);
    // Not vacuous: a number added without a row is found, and so is a row left out.
    expect(every({ ...MODULES["lighting.ts"]!, NEW_TUNING: 3 }).filter((p) => !refs.includes(p))).toEqual(["NEW_TUNING"]);
    expect(all).toContain("LIGHT_MODES.day.key.intensity");
  });

  it("has no row for a lighting.ts number that is not there (the retired street-camera daylight rows are gone)", () => {
    const all = new Set(every(MODULES["lighting.ts"]!));
    expect(refs.filter((r) => !all.has(r))).toEqual([]);
    const names = rows.map((r) => unquote(r[0]!));
    for (const gone of ["STREET_CAM_SKY", "STREET_CAM_GROUND", "STREET_CAM_DAY_INTENSITY"]) expect(names, gone).not.toContain(gone);
  });

  it("gives 16.12 both of Josh's quotes as Decided, the one-owner rule, the day values' home and the defaults per view", () => {
    const text = chapter(16).join("\n");
    expect(text).toMatch(/### 16\.12 The testing daylight \(dev only\)/);
    expect(/^- \*\*Decided \(060, [^)]*please create a day light mode so it's easy to see/m.test(text)).toBe(true);
    expect(/^- \*\*Decided \(060, [^)]*the purpose of the day mode is for testing/m.test(text)).toBe(true);
    expect(text).toMatch(/two modes, one owner/);
    expect(text).toContain("`LIGHT_MODES`");
    expect(text).toMatch(/replaces 055 Q9's night default/);
    const views = table(chapter(16), ["View", "Opens in"]);
    expect(views.map((r) => r[1]!.split(";")[0]!.trim())).toEqual(["day", "its own lights, the same in both modes", "night", "night", "its own lights"]);
    expect(text).toMatch(/leaves the game's night look of chapter 11 unchanged/);
  });

  it("adds one line to chapter 11 saying the testing daylight is a dev tool and not part of the game's look", () => {
    expect(chapter(11).join("\n")).toMatch(/^- \*\*Default \(060\)\*\*: the testing daylight of 16\.12 is a dev tool and not part of the game's look/m);
  });
});

// ---- ticket 056 C: chapter 18 (parking) and the parking constants ----

describe("chapter 18 gives the parking rules, and the numbers it names cannot drift (ticket 056)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const refs = (file: string): string[] => rows.filter((r) => r[2] === file).map((r) => unquote(r[0]!));
  /** The constants of 056 criterion 1, and the others chapter 18 names from tilecity.ts. */
  const PARK_CONSTANTS = [
    "PARK_PER_SHOP", "PARK_PER_HOME", "HOME_COLUMN_FLOORS", "UNIT_FLOORS_NOMINAL", "BAY_TILES_PER_BLOCK_MIN", "BAY_RUN_TILES_MAX", "KERB_GAP_MIN_M",
    "KERB_BAY_SHARE_MAX", "BAYS_PER_100M_MAX", "LOTS_PER_BLOCK_MAX", "LOT_STALLS", "PARK_SUPPLY_BAND", "BUILDOUT_TREE_EVERY",
    "BAYS_PER_PARKING_TILE", "BAY_JUNCTION_CLEAR", "TILE_PARK_MIN_RUN_M", "TILE_CITY_R6_MIN",
  ];
  const text = chapter(18).join("\n");

  it("has a Numbers row in tilecity.ts for every parking constant, and the code still exports each", () => {
    const have = refs("tilecity.ts");
    for (const n of PARK_CONSTANTS) {
      expect(have, `no Numbers row for ${n}`).toContain(n);
      expect(tilecity as Record<string, unknown>, `tilecity.ts no longer exports ${n}`).toHaveProperty(n);
    }
  });

  it("has a Numbers row for every constant parkmetrics.ts exports, and the check finds one with no row", () => {
    const uncovered = (mod: Record<string, unknown>, have: readonly string[]): string[] =>
      Object.entries(mod)
        .filter(([, v]) => typeof v !== "function")
        .map(([name]) => name)
        .filter((name) => !have.some((r) => r === name || r.startsWith(`${name}.`) || r.startsWith(`${name}[`)));
    expect(Object.values(MODULES["parkmetrics.ts"]!).some((v) => typeof v !== "function"), "parkmetrics.ts exports a constant").toBe(true);
    expect(uncovered(MODULES["parkmetrics.ts"]!, refs("parkmetrics.ts")), "no row for these parkmetrics.ts exports").toEqual([]);
    expect(uncovered({ ...MODULES["parkmetrics.ts"]!, NEW_TUNING: 3 }, refs("parkmetrics.ts"))).toEqual(["NEW_TUNING"]);
    expect(uncovered(MODULES["parkmetrics.ts"]!, [])).toContain("PARK_CHECK");
    expect(parkmetrics.PARK_CHECK.P6).toBe(tilecity.BAYS_PER_100M_MAX);
  });

  it("has a row for every tilecity.ts constant that chapter 18 names", () => {
    const have = refs("tilecity.ts");
    for (const m of text.matchAll(/`([A-Z][A-Z0-9_]{2,})`/g)) {
      const name = m[1]!;
      const v = (MODULES["tilecity.ts"] as Record<string, unknown>)[name];
      if (v === undefined || typeof v === "function") continue;
      expect(have.some((r) => r === name || r.startsWith(`${name}.`) || r.startsWith(`${name}[`)), `chapter 18 names ${name}, which has no Numbers row`).toBe(true);
    }
  });

  it("has its eight parts, in order, and every rule tagged with a ticket, or with what it waits for", () => {
    const heads = chapter(18).filter((l) => /^### 18\.\d /.test(l)).map((l) => Number(/^### 18\.(\d) /.exec(l)![1]));
    expect(heads).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const bullets = chapter(18).filter((l) => l.startsWith("- "));
    expect(bullets.length).toBeGreaterThan(20);
    for (const b of bullets) {
      const tag = /^- \*\*(Decided|Default|Pending|Open|Info)\b/.exec(b);
      expect(tag, `chapter 18: untagged bullet: ${b.slice(0, 80)}`).not.toBeNull();
      if (tag![1] === "Decided" || tag![1] === "Default") expect(/^- \*\*(Decided|Default) \(056\b/.test(b), `chapter 18: no ticket beside: ${b.slice(0, 80)}`).toBe(true);
      if (tag![1] === "Pending" || tag![1] === "Open") expect(b.startsWith(`- **${tag![1]} (waits for `), `chapter 18: no "what it waits for": ${b.slice(0, 80)}`).toBe(true);
    }
  });

  it("keeps Josh's words as the Decided lines: the parking complaint, and the R6 floor", () => {
    expect(/^- \*\*Decided \(056, Josh 18 Nov 2026[^)]*\)\*\*: "Roads look good, parking spaces are overwhelming\. Too many parking spaces\. We should create rules in the style sheet that indicate how much parking should be available on the streets vs parking lots for residential and business style units\."/m.test(text)).toBe(true);
    expect(/^- \*\*Decided \(056, Josh 18 Nov 2026, "Lower it to 0\.45 \(Recommended\)"\)\*\*/m.test(text)).toBe(true);
    expect(text).toContain("I approve one through three");
  });

  it("names the three kinds of rule: shoppers at the kerb, residents in lots, and the band without bays, each with the constants the ticket names", () => {
    for (const w of ["PARK_PER_SHOP", "PARK_PER_HOME", "BAY_RUN_TILES_MAX", "KERB_GAP_MIN_M", "KERB_BAY_SHARE_MAX", "BAYS_PER_100M_MAX", "LOTS_PER_BLOCK_MAX", "LOT_STALLS", "BUILDOUT_TREE_EVERY", "PARK_SUPPLY_BAND", "TILE_PARK_MIN_RUN_M"]) expect(text, w).toContain(`\`${w}\``);
    for (const id of Object.keys(parkmetrics.PARK_CHECK)) expect(text, id).toMatch(new RegExp(`^\| ${id} \|`, "m"));
    expect(text).toMatch(/shoppers park at the kerb, residents park off the street/);
  });

  it("says that chapter 17 (055 D) defers to chapter 18 while it does not exist, and points no other chapter at a retired name", () => {
    if (!chapterNumbers.includes(17)) expect(text).toMatch(/chapter 17 \(ticket 055 D\) does not exist yet\. When it does, its parking paragraph defers to this chapter/);
    for (const gone of ["CITY_BAYS_PER_BLOCK_MIN", "CITY_LOTS_PER_BLOCKS", "LOT_RUN_SALT"]) {
      expect(doc, `the guide still names ${gone}`).not.toContain(gone);
      expect(Object.keys(tilecity), `tilecity.ts still exports ${gone}`).not.toContain(gone);
    }
  });

  it("no longer holds the parking entry among the decisions not yet built", () => {
    const pending = section(/^## Decided, not yet built/).join("\n");
    expect(pending).not.toMatch(/### Parking \(ticket 056/);
    expect(pending).not.toContain("1 bay per 3 shops");
  });
});

// ---- ticket 058: escapes.ts joins the drift-checked files ----

describe("escapes.ts is drift-checked and 16.11 gives the fire-escape rules (ticket 058)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const have = rows.filter((r) => r[2] === "escapes.ts").map((r) => unquote(r[0]!));
  /** A number or a record of numbers: what a tuning constant looks like (the geometry and sill tables hold records and arrays, and are pinned by escapes.test.ts). */
  const numeric = (v: unknown): boolean => typeof v === "number" || (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length > 0 && Object.values(v).every((x) => typeof x === "number"));
  const uncovered = (mod: Record<string, unknown>, names: readonly string[]): string[] =>
    Object.entries(mod)
      .filter(([, v]) => numeric(v))
      .map(([name]) => name)
      .filter((name) => !names.some((r) => r === name || r.startsWith(`${name}.`) || r.startsWith(`${name}[`)));
  const sectionText = (): string => {
    const from = lines.findIndex((l) => /^### 16\.11 /.test(l));
    const to = lines.findIndex((l, i) => i > from && /^##+ /.test(l));
    return lines.slice(from, to < 0 ? lines.length : to).join("\n");
  };

  it("has a Numbers row for every number and record of numbers escapes.ts exports, and the check finds one with no row", () => {
    expect(Object.values(MODULES["escapes.ts"]!).filter(numeric).length, "escapes.ts exports constants").toBeGreaterThan(8);
    expect(uncovered(MODULES["escapes.ts"]!, have), "no Numbers row for these escapes.ts exports").toEqual([]);
    expect(uncovered({ ...MODULES["escapes.ts"]!, NEW_TUNING: 3 }, have)).toEqual(["NEW_TUNING"]);
    expect(uncovered(MODULES["escapes.ts"]!, [])).toContain("ESCAPE_DECK_BELOW_SILL_M");
  });

  it("gives 16.11 the Decided line with Josh's words verbatim, and every rule tagged with ticket 058 or with what it waits for", () => {
    const text = sectionText();
    expect(text).toContain('There are gaps on the fire escapes. Additionally, fire escapes should always be level with windows or else people can\'t get out of the building.');
    expect(/^- \*\*Decided \(058, Josh 18 Nov 2026: "There are gaps on the fire escapes\./m.test(text)).toBe(true);
    for (const b of text.split("\n").filter((l) => l.startsWith("- "))) {
      const tag = /^- \*\*(Decided|Default|Pending|Open|Info)\b/.exec(b);
      expect(tag, `16.11: untagged bullet: ${b.slice(0, 80)}`).not.toBeNull();
      if (tag![1] === "Open" || tag![1] === "Pending") expect(b.startsWith(`- **${tag![1]} (waits for `), `16.11: no "what it waits for": ${b.slice(0, 80)}`).toBe(true);
      else expect(/^- \*\*\w+ \(058\b/.test(b), `16.11: no ticket beside: ${b.slice(0, 80)}`).toBe(true);
    }
  });

  it("names the rules' constants in 16.11, points 16.5 at it, and no longer holds the escape among the decisions not yet built", () => {
    const text = sectionText();
    for (const n of ["ESCAPE_DECK_BELOW_SILL_M", "ESCAPE_DECK_TOL_M", "ESCAPE_JOINT_TOL_M", "ESCAPE_GROUND_TOL_M", "ESCAPE_SCALE_Y", "WINDOW_SILL_M", "ESCAPE_GEOMETRY", "LADDER_RUNG_PITCH_M", "CODE_ESCAPE_KEY", "CODE_ESCAPE"]) expect(text, n).toContain(`\`${n}\``);
    for (const n of ["ESCAPE_DECK_BELOW_SILL_M", "WINDOW_SILL_M", "ESCAPE_GEOMETRY", "CODE_ESCAPE_KEY"]) expect(Object.keys(MODULES["escapes.ts"]!), n).toContain(n);
    const fiveEleven = chapter(16).filter((l) => /^- \*\*Default \(052, 058\)\*\*: fire escapes\./.test(l));
    expect(fiveEleven).toHaveLength(1);
    expect(fiveEleven[0]).toContain("(16.11)");
    const pending = section(/^## Decided, not yet built/).join("\n");
    expect(pending).not.toMatch(/^- \*\*Default \(058/m);
    expect(pending).toContain("now section 16.11");
  });
});

// ---- ticket 055 F: sills.ts joins the drift-checked files ----

describe("sills.ts is drift-checked and 16.10 gives the door-sill rule (ticket 055 F)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const have = rows.filter((r) => r[2] === "sills.ts").map((r) => unquote(r[0]!));
  /** A number or a record of numbers: what a tuning constant looks like (the measured table holds records of records and is pinned by sills.test.ts). */
  const numeric = (v: unknown): boolean => typeof v === "number" || (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length > 0 && Object.values(v).every((x) => typeof x === "number"));
  const uncovered = (mod: Record<string, unknown>, names: readonly string[]): string[] =>
    Object.entries(mod)
      .filter(([, v]) => numeric(v))
      .map(([name]) => name)
      .filter((name) => !names.some((r) => r === name || r.startsWith(`${name}.`) || r.startsWith(`${name}[`)));
  const sectionText = (): string => {
    const from = lines.findIndex((l) => /^### 16\.10 /.test(l));
    const to = lines.findIndex((l, i) => i > from && /^##+ /.test(l));
    return lines.slice(from, to < 0 ? lines.length : to).join("\n");
  };

  it("has a Numbers row for every number and record of numbers sills.ts exports, and the check finds one with no row", () => {
    expect(Object.values(MODULES["sills.ts"]!).filter(numeric).length, "sills.ts exports constants").toBeGreaterThan(10);
    expect(uncovered(MODULES["sills.ts"]!, have), "no Numbers row for these sills.ts exports").toEqual([]);
    expect(uncovered({ ...MODULES["sills.ts"]!, NEW_TUNING: 3 }, have)).toEqual(["NEW_TUNING"]);
    expect(uncovered(MODULES["sills.ts"]!, [])).toContain("SILL_MAX_M");
  });

  it("gives 16.10 the Decided line with Josh's words verbatim, and every rule tagged with ticket 055 F or with what it waits for", () => {
    const text = sectionText();
    expect(text).toContain("That's going to have to be a variable that we measure for each individual building.");
    expect(/^- \*\*Decided \(055 F, Josh 18 Nov 2026: "That's going to have to be a variable that we measure for each individual building\."/m.test(text)).toBe(true);
    expect(text).toContain("Approved and confirmed");
    for (const b of text.split("\n").filter((l) => l.startsWith("- "))) {
      const tag = /^- \*\*(Decided|Default|Pending|Open|Info)\b/.exec(b);
      expect(tag, `16.10: untagged bullet: ${b.slice(0, 80)}`).not.toBeNull();
      if (tag![1] === "Open" || tag![1] === "Pending") expect(b.startsWith(`- **${tag![1]} (waits for `), `16.10: no "what it waits for": ${b.slice(0, 80)}`).toBe(true);
      else expect(/^- \*\*\w+ \(055 F\b/.test(b), `16.10: no ticket beside: ${b.slice(0, 80)}`).toBe(true);
    }
  });

  it("names every constant of sills.ts and the table and the steps' key in 16.10, records the steps in 16.6 and the pack table, and no longer holds the rule among the decisions not yet built", () => {
    const text = sectionText();
    for (const [name, v] of Object.entries(MODULES["sills.ts"]!)) if (numeric(v)) expect(text, name).toContain(`\`${name}\``);
    for (const n of ["STEPS_KEY", "DOOR_SILLS", "measureDoor", "leavesGap"]) {
      expect(Object.keys(MODULES["sills.ts"]!), n).toContain(n);
      expect(text, n).toContain(`\`${n}\``);
    }
    expect(sills.STEPS_KEY).toBe("town-pack:SM_Bld_House_Concrete_Steps_01");
    const sixSix = chapter(16).filter((l) => /^- \*\*Info \(055 F\)\*\*: one model of a pack that is otherwise not placed/.test(l));
    expect(sixSix).toHaveLength(1);
    expect(sixSix[0]).toContain("SM_Bld_House_Concrete_Steps_01");
    expect(sixSix[0]).toContain("SM_Bld_House_DeckSteps_01");
    const packs = table(chapter(13), ["Pack id", "Style", "Converter scale", "Status", "What it supplies"]);
    expect(packs.find((r) => r[0] === "town-pack")![4]).toContain("except the house concrete steps");
    const pending = section(/^## Decided, not yet built/).join("\n");
    expect(pending).not.toMatch(/^- \*\*Default \(055 F/m);
    expect(pending).toContain("now section 16.10");
  });

  it("lists in 16.10 a row for every entry of the measured table, grouped as the table's rows say", () => {
    const text = sectionText();
    for (const key of Object.keys(sills.DOOR_SILLS)) {
      const [pack, name] = key.split(":") as [string, string];
      // A group of names shares one row (Building_House_01 to _04); the first name or its stem is always on it.
      const stem = name.replace(/_\d+$/, "").replace(/\d+$/, "");
      expect(text.includes(key) || text.includes(`${pack}:${stem}`) || text.includes(name), `16.10 has no row for ${key}`).toBe(true);
    }
  });
});

// ---- ticket 057 E: chapter 19 (frontage and block interiors) and the constants of facade.ts, frontage.ts and the 057 names of tilecity.ts ----

describe("chapter 19 gives frontage and block interiors, and the numbers it names cannot drift (ticket 057 E)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const refs = (file: string): string[] => rows.filter((r) => r[2] === file).map((r) => unquote(r[0]!));
  const covered = (have: readonly string[], name: string): boolean => have.some((r) => r === name || r.startsWith(`${name}.`) || r.startsWith(`${name}[`));
  /** A number, a non-empty array of numbers, or a non-empty record of numbers: what a tuning constant looks like. */
  const numeric = (v: unknown): boolean =>
    typeof v === "number" ||
    (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "number")) ||
    (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length > 0 && Object.values(v).every((x) => typeof x === "number"));
  /** The exports of `mod` that a Numbers row must cover: numeric ones, less the per-piece tables (`facade.test.ts` pins their entries) and what the file only re-exports from `tilecity.ts` (covered by that file's row). */
  const uncovered = (mod: Record<string, unknown>, have: readonly string[], skip: ReadonlySet<string> = new Set()): string[] =>
    Object.entries(mod)
      .filter(([name, v]) => numeric(v) && !skip.has(name) && !covered(have, name))
      .map(([name]) => name);
  const reexported = new Set(Object.keys(frontage).filter((k) => k in tilecity && (frontage as unknown as Record<string, unknown>)[k] === (tilecity as unknown as Record<string, unknown>)[k]));
  const text = chapter(19).join("\n");

  it("has a Numbers row for every number and record of numbers facade.ts and frontage.ts export (less the per-piece wall tables and what frontage.ts re-exports from tilecity.ts), and the check finds one with no row", () => {
    const tables = new Set(["WALL_FRONT_M", "WALL_SIDE_M"]);
    expect(Object.values(MODULES["facade.ts"]!).filter(numeric).length, "facade.ts exports constants").toBeGreaterThan(6);
    expect(Object.values(MODULES["frontage.ts"]!).filter(numeric).length, "frontage.ts exports constants").toBeGreaterThan(8);
    expect(uncovered(MODULES["facade.ts"]!, refs("facade.ts"), tables), "no Numbers row for these facade.ts exports").toEqual([]);
    expect(uncovered(MODULES["frontage.ts"]!, refs("frontage.ts"), reexported), "no Numbers row for these frontage.ts exports").toEqual([]);
    // Not vacuous: a number added without a row is found, and a row left out is found.
    expect(uncovered({ ...MODULES["frontage.ts"]!, NEW_TUNING: 3 }, refs("frontage.ts"), reexported)).toEqual(["NEW_TUNING"]);
    expect(uncovered(MODULES["facade.ts"]!, [], tables)).toContain("WALL_REACH_M");
    expect([...reexported].sort(), "what frontage.ts re-exports from tilecity.ts").toEqual(["ALLEY_ONE_IN_BLOCKS", "BLOCK_CV_MIN", "BLOCK_NONSQUARE_MIN", "END_OVERLAP_MAX_M", "PARK_ONE_IN_BLOCKS", "PASSAGE_W_M"]);
    for (const name of reexported) expect(covered(refs("tilecity.ts"), name), `${name} is re-exported by frontage.ts and needs its tilecity.ts row`).toBe(true);
  });

  it("has a Numbers row in tilecity.ts for every constant 057 added, and the code still exports each", () => {
    const NEW_057 = [
      "TILE_CITY_R1_MIN", "TILE_ROW_INSET_M", "END_OVERLAP_MAX_M", "PASSAGE_W_M", "PASSAGE_FLOOR_DEPTH_M", "COURT_CELLS", "DRIVE_CELLS", "APRON_CELLS", "APRON_STRIP", "COURT_STALLS", "COURT_AISLE",
      "GREEN_SPAN_MAX_CELLS", "GREEN_TREE_ONE_IN", "BENCH_FROM_PATH_M", "CITY_FRONT_LOT_BLOCKS_MAX", "BLOCK_TILES", "BLOCK_STEP_MIN_CELLS", "BLOCK_CV_MIN", "BLOCK_NONSQUARE_MIN", "BLOCK_DRAWS_MAX",
      "BLOCK_MEAN_MIN_CELLS", "BLOCK_SMALL_MAX_M", "BLOCK_LONG_MIN_M", "BLOCK_LONG_SHORT_MAX_M", "BLOCK_LARGE_MIN_M", "BLOCK_FALLBACK_WIDTHS", "BLOCK_FALLBACK_DEPTHS", "ALLEY_ONE_IN_BLOCKS", "ALLEY_CELLS",
      "ALLEY_BIN_EVERY_M", "ALLEY_BIN_OFFSET_M", "ALLEY_SIDE_LONG_M", "ALLEY_SIDE_MIN_CELLS", "ALLEY_COURT_PART_MIN_CELLS", "ALLEY_COURT_LANE_MIN_CELLS", "PARK_ONE_IN_BLOCKS", "PARK_EDGE_CELLS", "PARK_HALF_SIDE_MIN_CELLS",
    ];
    const have = refs("tilecity.ts");
    for (const n of NEW_057) {
      expect(tilecity as Record<string, unknown>, `tilecity.ts no longer exports ${n}`).toHaveProperty(n);
      expect(covered(have, n), `no Numbers row for ${n}`).toBe(true);
    }
    // The two fallback layouts are pinned entry by entry.
    expect(have.filter((r) => r.startsWith("BLOCK_FALLBACK_WIDTHS[")).length).toBe(tilecity.BLOCK_FALLBACK_WIDTHS.length);
    expect(have.filter((r) => r.startsWith("BLOCK_FALLBACK_DEPTHS[")).length).toBe(tilecity.BLOCK_FALLBACK_DEPTHS.length);
  });

  it("has a row for every constant that chapter 19 names from tilecity.ts, facade.ts, frontage.ts or tileslots.ts", () => {
    let checked = 0;
    for (const m of text.matchAll(/`([A-Z][A-Z0-9_]{2,})`/g)) {
      const name = m[1]!;
      for (const file of ["tilecity.ts", "facade.ts", "frontage.ts", "tileslots.ts"]) {
        const v = (MODULES[file] as Record<string, unknown>)[name];
        if (v === undefined || !numeric(v) || name === "WALL_FRONT_M" || name === "WALL_SIDE_M") continue;
        const own = file === "frontage.ts" && reexported.has(name) ? refs("tilecity.ts") : refs(file);
        checked++;
        expect(covered(own, name), `chapter 19 names ${name} of ${file}, which has no Numbers row`).toBe(true);
      }
    }
    expect(checked, "the check found the constants").toBeGreaterThan(40);
  });

  it("holds the values chapter 19 states in words: the overlap is the wall reach, the drive is two cells, a court is six stalls", () => {
    expect(frontage.OVERLAP_MAX_M).toBe(facade.WALL_REACH_M);
    expect(tilecity.DRIVE_CELLS).toBe(2);
    expect(tilecity.COURT_CELLS.w * tilecity.COURT_CELLS.d).toBe(6);
    expect(tilecity.LOT_STALLS).toBe(6);
    expect(tilecity.TILE_ROW_INSET_M).toBe(0);
    expect(Object.keys(tilecity), "055 B's inset cap is gone").not.toContain("TILE_INSET_MAX_M");
    expect(Object.keys(tilecity), "055 B's inset function is gone").not.toContain("tileRowInset_m");
    expect(tilecity.PASSAGE_W_M.min).toBe(1);
    expect(tilecity.PASSAGE_W_M.max).toBeLessThanOrEqual(tilecity.TILE_M + 0.3 + 1e-9);
    expect(Object.keys(frontage.FRONTAGE_CHECK)).toEqual(["G1", "G2", "G3", "G4"]);
    expect(Object.keys(frontage.VARIETY_CHECK)).toEqual(["V1", "V2", "V3", "V4"]);
  });

  it("has its eight parts, in order, and every rule tagged with ticket 057 or with what it waits for", () => {
    const heads = chapter(19).filter((l) => /^### 19\.\d /.test(l)).map((l) => Number(/^### 19\.(\d) /.exec(l)![1]));
    expect(heads).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const bullets = chapter(19).filter((l) => l.startsWith("- "));
    expect(bullets.length).toBeGreaterThan(40);
    for (const b of bullets) {
      const tag = /^- \*\*(Decided|Default|Pending|Open|Info)\b/.exec(b);
      expect(tag, `chapter 19: untagged bullet: ${b.slice(0, 80)}`).not.toBeNull();
      if (tag![1] === "Decided" || tag![1] === "Default") expect(/^- \*\*(Decided|Default) \(057\b/.test(b), `chapter 19: no ticket beside: ${b.slice(0, 80)}`).toBe(true);
      if (tag![1] === "Pending" || tag![1] === "Open") expect(b.startsWith(`- **${tag![1]} (waits for `), `chapter 19: no "what it waits for": ${b.slice(0, 80)}`).toBe(true);
    }
    // Section D is merged: nothing in the chapter waits for it, and what it built is recorded as 057 D (19.8).
    expect(chapter(19).filter((l) => l.startsWith("- **Pending")), "chapter 19 has no Pending line left").toEqual([]);
    expect(chapter(19).filter((l) => /^- \*\*Default \(057 D\)/.test(l)).length).toBeGreaterThanOrEqual(8);
  });

  it("keeps Josh's words as the Decided lines: the wall line, the fill, the grid, and the R1 floor", () => {
    expect(/^- \*\*Decided \(057, Josh 18 Nov 2026[^)]*\)\*\*: "It's okay if the buildings rest on top of the sidewalk and overlap a little bit\. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them\."/m.test(text)).toBe(true);
    expect(/^- \*\*Decided \(057, Josh 18 Nov 2026\)\*\*: [^\n]*he said: "Grass and pavement should fill the blank areas\."/m.test(text)).toBe(true);
    expect(/^- \*\*Decided \(057, Josh 18 Nov 2026\)\*\*: "Keep in mind, 90 degrees does not mean a grid of squares\. You can have varying widths for blocks, alleyways, parks\.\.\. etc"/m.test(text)).toBe(true);
    expect(/^- \*\*Decided \(057, Josh 19 Nov 2026, "Tile-city R1 floor 0\.88 \(Recommended\)"\)\*\*/m.test(text)).toBe(true);
  });

  it("states the far-end order and the passage, and records the changes from the draft as built", () => {
    for (const w of ["a seam", "overshoot", "gated passage", "flush", "COURT_CELLS", "DRIVE_CELLS", "withPassages(city, tilePassages(city, packed))", "TileCity.interior", "BLOCK_MEAN_MIN_CELLS", "ALLEY_COURT_PART_MIN_CELLS"]) expect(text, w).toContain(w);
    for (const id of ["G1", "G2", "G3", "G4", "V1", "V2", "V3", "V4"]) expect(text, id).toMatch(new RegExp(`^\\| ${id}, `, "m"));
    for (const k of ["apron", "court", "drive", "green", "greenPath", "alley", "parkEdge"]) expect(text, k).toContain(`\`${k}\``);
  });

  it("points chapter 18 at the courts: no rear-courts default remains, 18.1 and 18.4 name chapter 19, and 16.6 records the Town Pack gate", () => {
    const parking = chapter(18).join("\n");
    expect(parking).not.toMatch(/no rear courts/i);
    expect(/^- \*\*Default \(056, 057 C\)\*\*: from 057 on, a block's lots are interior courts/m.test(parking)).toBe(true);
    expect(parking).not.toMatch(/waits for ticket 057 C/);
    expect(parking).toContain("(19.4)");
    const gate = chapter(16).filter((l) => /^- \*\*Default \(057 D\)\*\*: the tile city places no Town Pack piece/.test(l));
    expect(gate).toHaveLength(1);
    expect(gate[0]).toContain("SM_Env_Fence_Wood_Gate_01");
    expect(gate[0]).toContain("_Post_01");
    expect(gate[0]).toContain("`CITY_NEVER_USED`");
    // 16.12 no longer says that no code draws grass.
    expect(chapter(16).join("\n")).not.toMatch(/because no code draws grass/);
  });

  it("no longer holds the frontage and block rules among the decisions not yet built", () => {
    const pending = section(/^## Decided, not yet built/).join("\n");
    expect(pending).not.toMatch(/^- \*\*Default \(057/m);
    expect(pending).toContain("built, now chapter 19");
    expect(pending).toContain("Corners and frontage (ticket 055 B, then 057; built, now chapter 19)");
  });
});

describe("chapter 10 and 19.8 record the pavement fixes (ticket 063 A, D and H)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const text10 = chapter(10).join("\n");
  const text19 = chapter(19).join("\n");

  it("pins the grate's variant and its rate in the Numbers table, and the code still exports both", () => {
    for (const n of ["PAVEMENT_GRATE", "GRATE_ONE_IN"]) {
      expect(tilecity as Record<string, unknown>, `tilecity.ts no longer exports ${n}`).toHaveProperty(n);
      expect(rows.some((r) => r[2] === "tilecity.ts" && unquote(r[0]!) === n), `no Numbers row for ${n}`).toBe(true);
    }
    expect(tilecity.PAVEMENT_GRATE).toBe(1);
  });

  it("keeps Josh's three sentences as Decided lines in chapter 10, verbatim", () => {
    expect(/^- \*\*Decided \(063 A, Josh, 19 Nov 2026: "Make the side walk one uniform color\."\)\*\*/m.test(text10)).toBe(true);
    expect(/^- \*\*Decided \(063 D, Josh, 19 Nov 2026: "Are these tiles supposed to represent plots where trees should be planted\? It looks like the textures aren't being used properly"\)\*\*/m.test(text10)).toBe(true);
    expect(/^- \*\*Decided \(063 H, Josh, 19 Nov 2026: "If you're going to have an inlet to areas between buildings it needs to be paved"\)\*\*/m.test(text10)).toBe(true);
  });

  it("names the plain slab and the paved inlets in 19.8, and no longer says the strip and the passage floors are always code-drawn", () => {
    for (const w of ["SM_Env_Sidewalk_01", "PASSAGE_FLOOR_KEYS", "inletCells", "TileCourt.drive", "frontLots"]) expect(text19, w).toContain(w);
    expect(text19).not.toContain("The ragged strip (`APRON_STRIP`) is always code-drawn");
    expect(text19).not.toContain("SM_Env_Sidewalk_Panel_02` for the apron");
    expect(text10).not.toContain("two plain straights");
  });
});
