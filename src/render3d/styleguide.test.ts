/**
 * Ticket 043 section A: the city style guide (docs/city-style/, split from docs/city-style-guide.md in ticket 080) cannot drift from the code. The guide is read as text, its Numbers
 * table and its pack, fronts and corner tables are parsed, and each row is compared with the export it names. No WebGL, no network,
 * no assets: the optional manifest check is skipped when assets/private/out/manifest.json is absent.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
import * as edgeConstants from "../city/edge/constants";
import * as massConstants from "../city/mass/constants";
import * as tilecity from "./tilecity";
import * as tileslots from "./tileslots";
import * as town from "./town";

const GUIDE_DIR = "docs/city-style";
const MANIFEST = "assets/private/out/manifest.json";

/** Every `##` and `###` heading of the old one-file guide (ticket 080 A), in the old order. Each lives in exactly one file under docs/city-style/. */
const OLD_HEADINGS = [
  "## 1. Purpose and status",
  "## 2. Scale",
  "## 3. Streets and blocks",
  "## 4. Lots",
  "## 5. Choosing a building",
  "## 6. Facing",
  "## 7. Corner buildings",
  "## 8. Lit places",
  "## 9. Power lines",
  "## 10. Roads from packs",
  "## 11. Palette and light",
  "## 12. Accessibility",
  "## 13. Packs in the mix",
  "## 14. Licence handling",
  "## 15. Adding a pack, step by step",
  "## 16. Procedural city",
  "### 16.1 Grammar",
  "### 16.2 Lots and runs",
  "### 16.3 Blocks",
  "### 16.4 Variety",
  "### 16.5 Dressing and furniture",
  "### 16.6 Exclusions and gaps",
  "### 16.7 Fallbacks",
  "### 16.8 Evaluation protocol",
  "### 16.9 What matches the reference, and what does not yet",
  "### 16.10 Door sills (ticket 055 F)",
  "### 16.11 Fire escapes (ticket 058)",
  "### 16.12 The testing daylight (dev only)",
  "## 18. Parking",
  "### 18.1 Who parks where",
  "### 18.2 Units",
  "### 18.3 Kerbside bays (shoppers)",
  "### 18.4 Lots (residents)",
  "### 18.5 The parking band without bays",
  "### 18.6 Too little, too much",
  "### 18.7 The tile city's R6 floor",
  "### 18.8 The checks, and what they measured",
  "## 19. Frontage and block interiors",
  "### 19.1 The wall line",
  "### 19.2 Corners and far ends",
  "### 19.3 Thinner blocks: considered, not the default",
  "### 19.4 The block interior",
  "### 19.5 Block variety: 90 degrees, not a grid of squares",
  "### 19.6 Alleys and parks",
  "### 19.7 The checks, and what they measured",
  "### 19.8 What the drawing does (ticket 057 D)",
  "## Decided, not yet built (the tile city, 18 Nov 2026)",
  "### Roads and the grid (ticket 055; chapter 17 and chapter 10 when 055 D lands)",
  "### Corners and frontage (ticket 055 B, then 057; built, now chapter 19)",
  "### Buildings (ticket 055 F is built, now section 16.10; ticket 058 is built, now section 16.11)",
  "### Poles, wires and lights (ticket 059; chapter 20, with lines in chapters 8 and 12)",
  "### Testing daylight (ticket 060; built, now section 16.12)",
  "## Numbers",
];

/** The guide's files by name, read through this one helper. */
const guideFile = (name: string): string => readFileSync(join(GUIDE_DIR, name), "utf8").replace(/\r\n/g, "\n");
const GUIDE_FILES = readdirSync(GUIDE_DIR).filter((f) => f.endsWith(".md") && f !== "index.md" && f !== "STANDARD.md");
/** The files that carry no `standard: yes` marker of their own: the numbers, the log and the measurements. Every other file is a domain. */
const NOT_DOMAINS = ["numbers.md", "decisions.md", "evaluation.md"];
const isStandard = (f: string): boolean => /^standard: yes$/m.test(guideFile(f));
const STANDARD_FILES = GUIDE_FILES.filter(isStandard);
/** The two part headings of the standard (ticket 080 B1). They are no old section, so the guide's text leaves them out. */
const PART_HEADING = /^## (Rules|Open questions)$/;

/**
 * The guide as one text, in the old section order: the files are cut into blocks at each `##` or `###` heading, then laid out in OLD_HEADINGS order,
 * so a section reads the same wherever it lives. A `#### From <heading>` block continues the section it names (16.9's colourway rule).
 */
function readGuide(): string {
  const blocks = new Map<string, string[]>();
  const conts = new Map<string, string[]>();
  const pre: string[] = [];
  for (const f of GUIDE_FILES) {
    let into: string[] = pre;
    for (const l of guideFile(f).split("\n")) {
      if (PART_HEADING.test(l)) continue; // the standard's part headings are no old section; kept in, they would end chapter 16 at 16.6
      const cont = /^#### From (\d+\.\d+) /.exec(l);
      if (cont) {
        const key = OLD_HEADINGS.find((h) => h.startsWith(`### ${cont[1]} `))!;
        conts.set(key, (into = []));
      } else if (/^##+ /.test(l) && !l.startsWith("#### ")) blocks.set(l, (into = [l]));
      else into.push(l);
    }
  }
  const text = (h: string): string => [...(blocks.get(h) ?? []), ...(conts.get(h) ?? [])].join("\n");
  // Blocks that are no old section (the text moved into evaluation.md) are scanned too, after the old sections; the mapping table is not, it only repeats old lines.
  const extra = [...blocks.keys()].filter((h) => !OLD_HEADINGS.includes(h) && !h.startsWith("## Mapping")).map(text);
  return [pre.join("\n"), ...OLD_HEADINGS.map(text), ...extra].join("\n");
}

const doc = readGuide();
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
  // The pipeline's stage modules (ticket 070 L1: a guide line that changed reads the pipeline's constant, not the old path's). The File cell of a Numbers row is the short name.
  "edge/constants.ts": edgeConstants as unknown as Record<string, unknown>,
  "mass/constants.ts": massConstants as unknown as Record<string, unknown>,
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
  it("holds every old heading in exactly one file, and the index map names that file (ticket 080 A)", () => {
    const index = guideFile("index.md");
    for (const h of OLD_HEADINGS) {
      const homes = GUIDE_FILES.filter((f) => guideFile(f).split("\n").includes(h));
      expect(homes.length, `${h} is in ${homes.length} files: ${homes.join(", ")}`).toBe(1);
      expect(index, `index.md does not name ${homes[0]}, the home of ${h}`).toContain(`\`${homes[0]}\``);
    }
  });

  it("every docs/city-style path an agent reading list cites exists, and none still cites the old guide (ticket 080 A)", () => {
    const dir = join(".claude", "agents");
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
      const text = readFileSync(join(dir, f), "utf8");
      expect(text, `${f} still cites docs/city-style-guide.md`).not.toContain("docs/city-style-guide.md");
      for (const m of text.matchAll(/docs\/city-style\/[\w.-]+\.md/g)) expect(existsSync(m[0]), `${f} cites ${m[0]}, which does not exist`).toBe(true);
    }
  });

  it("tags every rule of the old text: Decided and Default name a ticket; Pending and Open say what they wait for (a standard: yes domain is held to the standard instead)", () => {
    const condensed = new Set(STANDARD_FILES.flatMap((f) => guideFile(f).split("\n")));
    for (let n = 1; n <= 16; n++) {
      const bullets = chapter(n).filter((l) => l.startsWith("- ") && !condensed.has(l));
      if (bullets.length === 0 && chapter(n).some((l) => condensed.has(l))) continue; // the chapter now lives in a condensed domain
      expect(bullets.length, `chapter ${n} has no rules`).toBeGreaterThan(0);
      for (const b of bullets) {
        const tag = /^- \*\*(Decided|Default|Pending|Open|Info)\b/.exec(b);
        expect(tag, `chapter ${n}: untagged bullet: ${b.slice(0, 80)}`).not.toBeNull();
        if (tag![1] === "Decided" || tag![1] === "Default") {
          expect(/^- \*\*(Decided|Default) \([^)]*\b(03[7-9]|04[0-9]|05[0-9]|06[0-9]|07[0-9])\b/.test(b), `chapter ${n}: no ticket beside: ${b.slice(0, 80)}`).toBe(true);
        }
        if (tag![1] === "Pending" || tag![1] === "Open") {
          expect(new RegExp(`^- \\*\\*${tag![1]} \\(`).test(b), `chapter ${n}: no "what it waits for": ${b.slice(0, 80)}`).toBe(true);
        }
      }
    }
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

// ---- ticket 080 B1: the document standard (docs/city-style/STANDARD.md) ----

const MAPPING_AT = "## Mapping from the old guide";
const DOMAINS = GUIDE_FILES.filter((f) => !NOT_DOMAINS.includes(f));
const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const DATE = new RegExp(`\\b\\d{1,2} (${MONTHS})[a-z]* 20\\d\\d|\\b(${MONTHS})[a-z]* \\d{1,2},? 20\\d\\d|\\b20\\d\\d-\\d\\d-\\d\\d`);

/** The rows of decisions.md's mapping table. A pipe inside a cell is written `\|`. */
function mappingRows(): { id: string; line: string; home: string }[] {
  const dec = guideFile("decisions.md");
  const cells = (l: string): string[] => l.replace(/^\|\s*|\s*\|\s*$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
  return dec.slice(dec.indexOf(MAPPING_AT)).split("\n").filter((l) => l.startsWith("| D-")).map((l) => {
    const c = cells(l);
    expect(c.length, `mapping row has ${c.length} cells: ${l.slice(0, 60)}`).toBe(4);
    return { id: c[0]!, line: c[2]!, home: c[3]! };
  });
}

describe("the document standard holds (ticket 080 B1)", () => {
  it("keeps the standard, the index and every standard: yes domain within budget", () => {
    expect(STANDARD_FILES.length, "no domain is marked standard: yes").toBeGreaterThan(0);
    expect(Buffer.byteLength(guideFile("STANDARD.md")), "STANDARD.md is over 3 KB").toBeLessThan(3 * 1024);
    expect(Buffer.byteLength(readFileSync(join(GUIDE_DIR, "index.md"))), "index.md is over 2 KB").toBeLessThan(2 * 1024);
    for (const f of STANDARD_FILES) expect(Buffer.byteLength(guideFile(f)), `${f} is over 8 KB`).toBeLessThanOrEqual(8 * 1024);
  });

  it("gives each standard domain its header, then Rules, then Open questions last, and only the three statuses", () => {
    for (const f of STANDARD_FILES) {
      const ls = guideFile(f).split("\n");
      const order = [/^# City style: \S/, /^standard: yes$/, /^Scope: \S/, /^Read by: \S/, /^Depends on: \S/, /^## Rules$/, /^## Open questions$/].map((re) => ls.findIndex((l) => re.test(l)));
      expect(order.every((n, i) => n >= 0 && (i === 0 || n > order[i - 1]!)), `${f}: header and parts out of order (${order.join(",")})`).toBe(true);
      expect(order[0], `${f}: the title is not line 1`).toBe(0);
      expect(ls.reduce((last, l, i) => (/^#{2,3} /.test(l) ? i : last), -1), `${f}: Open questions is not the last heading`).toBe(order[6]);
      for (const b of ls.filter((l) => l.startsWith("- **"))) {
        expect(/^- \*\*(Rule \[D-\d{3}[a-z]\]|Default( \(\d{3}\)| \[D-\d{3}[a-z]\])?|Open)\*\*: /.test(b), `${f}: not a Rule, Default or Open line: ${b.slice(0, 60)}`).toBe(true);
        if (b.startsWith("- **Open")) expect(b, `${f}: an Open line says what it waits for`).toContain("Waits for:");
      }
    }
  });

  it("puts no quoted words, date or question number in a standard domain", () => {
    for (const f of STANDARD_FILES) {
      const text = guideFile(f);
      const bare = text.replace(/`[^`\n]*`/g, "");
      for (const q of bare.matchAll(/"[^"\n]+"|“[^”\n]+”/g)) expect(q[0].trim().split(/\s+/).length, `${f}: quoted words ${q[0]}`).toBeLessThan(3);
      expect(text, `${f} has a date`).not.toMatch(DATE);
      expect(text, `${f} has a question number`).not.toMatch(/\bQ\d+\b/);
    }
  });

  it("keeps the mapping table whole: every [D-...] of a domain is on one row, every row's new home cites its id in the file it names, and none is empty or verbatim for a converted line", () => {
    const rows = mappingRows();
    const ids = rows.map((r) => r.id);
    expect(ids.length, "the mapping table is empty").toBeGreaterThan(0);
    expect(new Set(ids).size, "an id is on two rows").toBe(ids.length);
    for (const f of GUIDE_FILES.filter((n) => n !== "decisions.md")) {
      for (const m of guideFile(f).matchAll(/\[(D-[^\]]*)\]/g)) expect(ids, `${f} cites ${m[1]}, which is on no row`).toContain(m[1]);
    }
    for (const r of rows.filter((x) => x.home !== "verbatim")) {
      expect(r.home, `${r.id}'s new home does not cite it`).toContain(`[${r.id}]`);
      const file = /`([\w-]+\.md)`/.exec(r.home)?.[1] ?? "";
      expect([...STANDARD_FILES, ...NOT_DOMAINS], `${r.id}: ${file} is neither a standard: yes domain nor numbers, decisions or evaluation`).toContain(file);
      expect(guideFile(file), `${file} does not hold [${r.id}]`).toContain(`[${r.id}]`);
    }
    // Every row has a new home: verbatim only for a line still standing in a file that is not standard: yes, and none once every domain is.
    const dec = guideFile("decisions.md");
    const standing = new Set(GUIDE_FILES.filter((f) => !isStandard(f)).flatMap((f) => (f === "decisions.md" ? dec.slice(0, dec.indexOf(MAPPING_AT)) : guideFile(f)).split("\n").map((l) => l.trim())));
    for (const r of rows) {
      expect(r.home.length, `${r.id} has an empty new home`).toBeGreaterThan(0);
      if (r.home === "verbatim") expect(standing.has(r.line), `${r.id} says verbatim but its line is not in an unconverted file`).toBe(true);
    }
    // A line that lives in numbers, decisions or evaluation (no standard: yes of their own) may stay verbatim for good.
    const stays = new Set(NOT_DOMAINS.filter((f) => GUIDE_FILES.includes(f)).flatMap((f) => (f === "decisions.md" ? dec.slice(0, dec.indexOf(MAPPING_AT)) : guideFile(f)).split("\n").map((l) => l.trim())));
    if (DOMAINS.every(isStandard)) expect(rows.filter((r) => r.home === "verbatim" && !stays.has(r.line)), "every domain is standard: yes, so no row of a domain may say verbatim").toEqual([]);
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
    const reason = (stem: string): string => rows.find((r) => unquote(r[0]!) === stem)![1]!;
    for (const key of ["_Base_01", "_Arm_01", "_CrossLights_01", "_CrossButton_01", "_Box_01"]) expect(reason("SM_Prop_LightPole_*"), key).toContain(`\`${key}\``);
    expect(reason("SM_Prop_LightPole_*")).toContain("signal junctions only, dark");
    expect(reason("SM_Prop_TrafficLight_*")).toContain("red and green read as puzzle state");
    expect(reason("SM_Prop_Pipe_Present_*")).toContain("`_03` stands on party walls (grammar rule 8");
    expect(reason("SM_Prop_Pipe_Present_*")).toContain("`_01` and `_02` never");
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
});

// ---- ticket 056 C: chapter 18 (parking) and the parking constants ----

describe("chapter 18 gives the parking rules, and the numbers it names cannot drift (ticket 056)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const refs = (file: string): string[] => rows.filter((r) => r[2] === file).map((r) => unquote(r[0]!));
  /** The constants of 056 criterion 1, and the others chapter 18 names from tilecity.ts. `PARK_PER_HOME` and `PARK_SUPPLY_BAND` are the pipeline's since ticket 070 L1 (see the last describe). */
  const PARK_CONSTANTS = [
    "PARK_PER_SHOP", "HOME_COLUMN_FLOORS", "UNIT_FLOORS_NOMINAL", "BAY_TILES_PER_BLOCK_MIN", "BAY_RUN_TILES_MAX", "KERB_GAP_MIN_M",
    "KERB_BAY_SHARE_MAX", "BAYS_PER_100M_MAX", "LOTS_PER_BLOCK_MAX", "LOT_STALLS", "BUILDOUT_TREE_EVERY",
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

  it("has a row for every tilecity.ts constant that chapter 18 names (the two the pipeline owns are read from its stage modules)", () => {
    const have = [...refs("tilecity.ts"), ...refs("mass/constants.ts"), ...refs("edge/constants.ts")];
    for (const m of text.matchAll(/`([A-Z][A-Z0-9_]{2,})`/g)) {
      const name = m[1]!;
      const v = (MODULES["tilecity.ts"] as Record<string, unknown>)[name];
      if (v === undefined || typeof v === "function") continue;
      expect(have.some((r) => r === name || r.startsWith(`${name}.`) || r.startsWith(`${name}[`)), `chapter 18 names ${name}, which has no Numbers row`).toBe(true);
    }
  });

  it("names the three kinds of rule: shoppers at the kerb, residents in lots, and the band without bays, each with the constants the ticket names", () => {
    for (const w of ["PARK_PER_SHOP", "PARK_PER_HOME", "BAY_RUN_TILES_MAX", "KERB_GAP_MIN_M", "KERB_BAY_SHARE_MAX", "BAYS_PER_100M_MAX", "LOTS_PER_BLOCK_MAX", "LOT_STALLS", "BUILDOUT_TREE_EVERY", "PARK_SUPPLY_BAND", "TILE_PARK_MIN_RUN_M"]) expect(text, w).toContain(`\`${w}\``);
    for (const id of Object.keys(parkmetrics.PARK_CHECK)) expect(text, id).toMatch(new RegExp(`^\| ${id} \|`, "m"));
    expect(text).toMatch(/shoppers park at the kerb, residents park off the street/);
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
        const own = file === "frontage.ts" && reexported.has(name) ? refs("tilecity.ts") : file === "tilecity.ts" ? [...refs(file), ...refs("mass/constants.ts"), ...refs("edge/constants.ts")] : refs(file);
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
});

// ---- ticket 070 L1: the guide and the grammar catch up with the pipeline (Josh's rulings of 19 to 21 Nov 2026) ----

describe("the guide catches up with the pipeline (ticket 070 L1)", () => {
  const rows = table(section(/^## Numbers$/), ["Constant", "Value", "File"]);
  const refs = (file: string): string[] => rows.filter((r) => r[2] === file).map((r) => unquote(r[0]!));
  const t18 = chapter(18).join("\n");
  const t19 = chapter(19).join("\n");

  it("pins PARK_PER_HOME and the two PARK_SUPPLY_BAND floors to the stage modules that own them, and not to the old path's 0.15 and 0.75", () => {
    expect(massConstants.PARK_PER_HOME).toBe(0.075);
    expect(edgeConstants.PARK_SUPPLY_BAND.lo, "P1's kerb floor (Josh, 20 Nov 2026: \"yes lower it\")").toBe(0.69);
    expect(massConstants.PARK_SUPPLY_BAND.lo, "P2's lot band stays 0.75 to 1.5").toBe(0.75);
    expect(massConstants.PARK_SUPPLY_BAND.hi).toBe(1.5);
    expect(refs("mass/constants.ts")).toContain("PARK_PER_HOME");
    expect(refs("mass/constants.ts")).toContain("PARK_SUPPLY_BAND");
    expect(refs("edge/constants.ts")).toContain("PARK_SUPPLY_BAND");
    expect(refs("tilecity.ts"), "the old path's 0.15 has no guide pin").not.toContain("PARK_PER_HOME");
    expect(refs("tilecity.ts"), "the old path's 0.75 has no guide pin").not.toContain("PARK_SUPPLY_BAND");
  });

  it("states the pipeline's numbers in the lines that changed (18.1, P1, P2, 057 Q3), read from the stage modules", () => {
    expect(t18).toContain(`\`PARK_PER_HOME\` (${massConstants.PARK_PER_HOME}) stalls in a parking lot`);
    expect(t18).not.toContain("`PARK_PER_HOME` (0.15)");
    expect(t18).toMatch(new RegExp(`^\\| P1 \\|.*the floor is ${edgeConstants.PARK_SUPPLY_BAND.lo}, not 0\\.75, for kerb bays only`, "m"));
    expect(t18).toMatch(new RegExp(`^\\| P2 \\|.*\\(still ${massConstants.PARK_SUPPLY_BAND.lo} to ${massConstants.PARK_SUPPLY_BAND.hi}\\)`, "m"));
    expect(t18).toMatch(/^\| P3 \|.*counted over the whole block side/m);
    expect(t19).toContain(`\`PARK_PER_HOME\` is ${massConstants.PARK_PER_HOME} (18.1`);
    // The ruling's words and date live in the decision log, not in the domain (ticket 080 B2).
    const ruling = mappingRows().find((r) => r.id === "D-056g")!.line;
    expect(ruling).toContain("Josh's ruling of 19 Nov 2026");
    expect(ruling).toContain('"Yes, all four"');
    expect(t18).toContain("[D-056g]");
  });

  it("the stage modules the guide now names exist and export what it says", () => {
    expect(Object.keys(edgeConstants)).toContain("PARK_SUPPLY_BAND");
    expect(Object.keys(massConstants)).toContain("PARK_PER_HOME");
    expect(existsSync("src/city/mass/check.ts")).toBe(true);
    expect(existsSync("src/city/edge/check.ts")).toBe(true);
    expect(existsSync("src/city/edge/kerbline.ts")).toBe(true);
    expect(existsSync("src/city/land/plan.ts")).toBe(true);
  });
});

describe("the guide and the grammar carry traffic control (ticket 070 TR2, criterion 9)", () => {
  const grammar = readFileSync("docs/city-grammar.md", "utf8");
  const t16 = chapter(16).join("\n");

  it("the grammar has a rule 13 naming DS, IN, SJ, AS, T, C, MA, ST, CL and PK, and a check-table row for it", () => {
    const at = grammar.indexOf("### 13. Traffic control");
    expect(at).toBeGreaterThan(grammar.indexOf("### 12. Variety"));
    expect(at).toBeLessThan(grammar.indexOf("### Not in this grammar yet"));
    const rule = grammar.slice(at, grammar.indexOf("### Not in this grammar yet"));
    for (const id of ["DS", "IN", "SJ", "AS", "T", "C", "MA", "ST", "CL", "PK"]) expect(rule, id).toContain(`**${id}**`);
    for (const q of ["Q33", "Q36", "Q37", "Q38", "Q39", "Q40", "Q42", "Q43", "Q44"]) expect(rule, q).toContain(q);
    for (const n of ["0.5 m", "1.0 m", "0.75 m", "4.6 m"]) expect(rule, n).toContain(n);
    expect(rule).toContain("Check. Stage 9's TC1 to TC5 and keys; R12's allowance in the drawing".replace("Check. ", "**Check.** "));
    expect(grammar).toContain("| traffic control | every junction's control by DS to C; every piece placed by MA, ST, PK and clear by CL | 13 | TR1, TR1b |");
  });
});
