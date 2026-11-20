/**
 * Grouping (ticket 070 F1, criteria 1 and 4; N1, N3, N4, L1): one part's built cells into buildings of 2 to 4 columns, a leading row cut at random and the followers derived from it.
 * The choices (which row a corner cell joins, where each leading stretch is cut) are drawn from the stage's `rand`; a try that breaks a rule is dropped and the part is drawn again,
 * up to `GROUP_TRIES_MAX` times, and a part that never closes fails the stage (rule 6). No rule is loosened.
 */

import type { CityBuiltCell, CityCell, CityPart } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { GROUP_TRIES_MAX, TERRACE_BAYS } from "./constants";
import { heightClasses, neighbourPairs, type Draft } from "./draft";
import { indexOf } from "./hash";
import { keyOf, showsFront, type RowDef } from "./rows";

/** A tight corner (L1): a ring-2 blind corner whose two inner stretches are each the corner and one cell beside it. Its L is `[cell of rowZ, corner, cell of rowX]`. */
export interface TightCorner {
  readonly corner: CityCell;
  /** The inner row whose front is "-z" or "+z". */
  readonly rowZ: RowDef;
  /** The inner row whose front is "-x" or "+x". */
  readonly rowX: RowDef;
  readonly cells: readonly [CityCell, CityCell, CityCell];
}

function builtIn(part: string, built: ReadonlyMap<string, CityBuiltCell>): (c: CityCell) => boolean {
  return (c) => built.get(keyOf(c))?.part === part;
}

/** The cells beside `at` along `r.along`, in each direction, while built (not counting `at`). */
function arms(r: RowDef, at: CityCell, isBuilt: (c: CityCell) => boolean): CityCell[][] {
  const idx = r.along.findIndex((c) => c.i === at.i && c.j === at.j);
  const left: CityCell[] = [];
  const right: CityCell[] = [];
  for (let a = idx - 1; a >= 0 && isBuilt(r.along[a]!); a--) left.push(r.along[a]!);
  for (let a = idx + 1; a < r.along.length && isBuilt(r.along[a]!); a++) right.push(r.along[a]!);
  return [left, right];
}

/** Every tight corner of a court part, computed from the mass alone (the stage's choices and the check both read it). */
export function tightCornersOf(part: CityPart, rows: readonly RowDef[], built: ReadonlyMap<string, CityBuiltCell>): TightCorner[] {
  if (part.shape !== "court") return [];
  const isBuilt = builtIn(part.id, built);
  const out: TightCorner[] = [];
  const inner = rows.filter((r) => r.row === "inner");
  for (const b of built.values()) {
    if (b.part !== part.id || b.column !== "blind" || b.row !== "inner") continue;
    const here = inner.filter((r) => r.along.some((c) => c.i === b.i && c.j === b.j));
    if (here.length !== 2) continue;
    const found = here.map((r) => arms(r, b, isBuilt).flat());
    if (!found.every((s) => s.length === 1)) continue;
    const rowZ = here.find((r) => r.front === "-z" || r.front === "+z");
    const rowX = here.find((r) => r.front === "-x" || r.front === "+x");
    if (!rowZ || !rowX) continue;
    const cz = found[here.indexOf(rowZ)]![0]!;
    const cx = found[here.indexOf(rowX)]![0]!;
    out.push({ corner: { i: b.i, j: b.j }, rowZ, rowX, cells: [cz, { i: b.i, j: b.j }, cx] });
  }
  return out;
}

/** Which rows of a part lead (N4): a court's outer rows; in a strip the row whose front has street frontage, or if both or neither do, the one fronting "-x" or "-z". */
export function leadRowIds(part: CityPart, rows: readonly RowDef[], built: ReadonlyMap<string, CityBuiltCell>): Set<string> {
  if (part.shape === "court") return new Set(rows.filter((r) => r.row === "outer").map((r) => r.id));
  const street = (r: RowDef): boolean => r.along.some((c) => built.get(keyOf(c))?.open.some((o) => o.side === r.front && o.frontage === "street"));
  const [a, b] = rows;
  if (!a || !b) return new Set(rows.map((r) => r.id));
  const lead = street(a) !== street(b) ? (street(a) ? a : b) : a.front === "-x" || a.front === "-z" ? a : b;
  return new Set([lead.id]);
}

/** Group one part. Throws `CityStageError("rule 6: ...")` when no draw closes it. */
export function groupPart(
  part: CityPart,
  rows: readonly RowDef[],
  built: ReadonlyMap<string, CityBuiltCell>,
  rand: StageRand,
  positions: (rowId: string) => ReadonlyMap<string, number> | undefined,
): Draft[] {
  const isBuilt = builtIn(part.id, built);
  const leadIds = leadRowIds(part, rows, built);
  // The rows each built cell may join: those it lies on whose front it shows (a blind cell shows none and joins any).
  const onLines = new Map<string, RowDef[]>();
  for (const r of rows) {
    for (const c of r.along) {
      if (!isBuilt(c)) continue;
      const list = onLines.get(keyOf(c));
      if (list) list.push(r);
      else onLines.set(keyOf(c), [r]);
    }
  }
  const partCells = [...built.values()].filter((b) => b.part === part.id);
  for (const b of partCells) if (!onLines.has(keyOf(b))) throw new CityStageError(`N1: built cell (${b.i}, ${b.j}) of ${part.id} is on no row`, [{ i: b.i, j: b.j }]);
  const options = new Map<string, RowDef[]>();
  for (const [key, rs] of onLines) {
    const b = built.get(key)!;
    const ok = rs.filter((r) => b.column === "blind" || showsFront(b, r.front));
    if (ok.length === 0) throw new CityStageError(`N1: built cell (${b.i}, ${b.j}) of ${part.id} shows no row front`, [{ i: b.i, j: b.j }]);
    options.set(key, ok);
  }
  const tight = tightCornersOf(part, rows, built);
  const tightCells = new Set(tight.flatMap((t) => t.cells.map(keyOf)));

  let lastReason = "no draw";
  let lastCells: CityCell[] = [];
  for (let t = 1; t <= GROUP_TRIES_MAX; t++) {
    let n = 0;
    const draw = (m: number): number => indexOf(rand("group", part.id, t, n++), m);
    const home = new Map<string, string>();
    for (const [key, rs] of options) home.set(key, tightCells.has(key) ? "L" : rs.length === 1 ? rs[0]!.id : rs[draw(rs.length)]!.id);
    const stretches = (r: RowDef): CityCell[][] => {
      const out: CityCell[][] = [];
      let cur: CityCell[] = [];
      for (const c of r.along) {
        if (home.get(keyOf(c)) === r.id) cur.push(c);
        else if (cur.length > 0) {
          out.push(cur);
          cur = [];
        }
      }
      if (cur.length > 0) out.push(cur);
      return out;
    };
    const drafts: Draft[] = [];
    const bOf = new Map<string, Draft>();
    const make = (r: RowDef, cells: CityCell[], lead: boolean, bend: string | null): Draft => {
      const d: Draft = { id: `${r.id}|${keyOf(cells[0]!)}`, rowId: r.id, bend, row: r.row, front: r.front, cells, lead, partner: null, style: "", colourway: "", storeys: 0, back: null };
      for (const c of cells) bOf.set(keyOf(c), d);
      drafts.push(d);
      return d;
    };
    let fail = "";
    let failCells: CityCell[] = [];
    // Leading rows: cut every stretch into 2 to 4, never leaving 1.
    for (const r of rows.filter((x) => leadIds.has(x.id))) {
      for (const s of stretches(r)) {
        if (s.length < TERRACE_BAYS.min) {
          fail = `a stretch of ${s.length} cell in ${r.id}`;
          failCells = s;
          break;
        }
        let at = 0;
        while (at < s.length) {
          const left = s.length - at;
          const sizes: number[] = [];
          for (let m = TERRACE_BAYS.min; m <= TERRACE_BAYS.max; m++) if (m <= left && left - m !== 1) sizes.push(m);
          const m = sizes[draw(sizes.length)]!;
          make(r, s.slice(at, at + m), true, null);
          at += m;
        }
      }
      if (fail) break;
    }
    // Following rows: cut where the partner building changes (N3).
    if (!fail) {
      const used = new Set<string>();
      for (const r of rows.filter((x) => !leadIds.has(x.id))) {
        for (const s of stretches(r)) {
          const label: (string | null)[] = s.map((c) => {
            const bc = built.get(keyOf(c))!;
            if (bc.column === "blind") return null;
            if (!bc.partner) return "none";
            const pb = bOf.get(keyOf(bc.partner));
            return pb && pb.lead ? pb.id : "other";
          });
          if (label.includes("none") || label.includes("other")) {
            fail = `N3: a follower cell in ${r.id} has a partner that is ${label.includes("none") ? "missing" : "not a leader"}`;
            failCells = s;
            break;
          }
          for (let x = 0; x < label.length; x++) if (label[x] === null) label[x] = x > 0 && label[x - 1] ? label[x - 1]! : (label[x + 1] ?? null);
          if (label.some((l) => l === null)) {
            fail = `N3: a stretch of ${r.id} has only blind cells`;
            failCells = s;
            break;
          }
          let a = 0;
          while (a < s.length) {
            let b = a;
            while (b + 1 < s.length && label[b + 1] === label[a]) b++;
            const cells = s.slice(a, b + 1);
            if (cells.length < TERRACE_BAYS.min || cells.length > TERRACE_BAYS.max) {
              fail = `rule 1/N3: a following building of ${cells.length} cells in ${r.id}`;
              failCells = cells;
              break;
            }
            if (used.has(label[a]!)) {
              fail = `N3: two following buildings share the partner ${label[a]}`;
              failCells = cells;
              break;
            }
            used.add(label[a]!);
            const f = make(r, cells, false, null);
            f.partner = label[a]!;
            a = b + 1;
          }
          if (fail) break;
        }
        if (fail) break;
      }
    }
    // The L at each tight corner (L1).
    if (!fail) {
      for (const tc of tight) {
        const partner = built.get(keyOf(tc.corner))?.partner;
        const a = partner ? bOf.get(keyOf(partner)) : undefined;
        if (!a || !a.lead) {
          fail = `L1: the tight corner (${tc.corner.i}, ${tc.corner.j}) has no ring-1 corner building behind it`;
          failCells = [tc.corner];
          break;
        }
        const l = make(tc.rowZ, [...tc.cells], false, tc.rowX.id);
        l.partner = a.id;
      }
    }
    // N2 must not tie two row neighbours to one height.
    if (!fail) {
      const find = heightClasses(drafts, built);
      for (const [a, b] of neighbourPairs(drafts, positions)) {
        if (find(a.id) === find(b.id)) {
          fail = `N2: M4c ties the row neighbours ${a.id} and ${b.id} to one height`;
          failCells = [...a.cells, ...b.cells];
          break;
        }
      }
    }
    if (fail) {
      lastReason = fail;
      lastCells = failCells;
      continue;
    }
    return drafts;
  }
  throw new CityStageError(`rule 6: ${part.id} cannot be cut into buildings of ${TERRACE_BAYS.min} to ${TERRACE_BAYS.max} columns with N1 to N3 holding (${GROUP_TRIES_MAX} draws; last: ${lastReason})`, lastCells);
}
