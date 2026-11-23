/**
 * Floors, style and colourway of one part's buildings (ticket 070 F1, criterion 3; N2, N5), every choice drawn from the stage's `rand` through the finaliser.
 * - Storeys (3 to 5) are one number for every building M4c ties together (a following building and its partner, and the corner chain). Not the one before in the row, and not the one before that where it can
 *   (terrace.ts's rule, moved); where the choices run out the search backs up.
 * - Leading buildings take a style that differs from the row neighbour before them, and a colourway by `assignColourways`' rule (a start by hash, stepped on past the one before).
 * - A following building is "through" (its partner's style and colourway) or "another" (a style that differs from both row neighbours, a colourway that differs from its partner's and both neighbours'),
 *   by `BACK_SAME_SHARE` on the partner's id.
 */

import type { CityBuiltCell } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { BACK_SAME_SHARE, CITY_STOREYS, COLOURWAY_POOL, STOREY_NODES_MAX, STYLE_IDS } from "./constants";
import { heightClasses, neighbourPairs, type Draft } from "./draft";
import { fractionOf, indexOf } from "./hash";

export function assignPart(drafts: Draft[], built: ReadonlyMap<string, CityBuiltCell>, rand: StageRand, positions: (rowId: string) => ReadonlyMap<string, number> | undefined): void {
  if (drafts.length === 0) return;
  const find = heightClasses(drafts, built);
  const pairs = neighbourPairs(drafts, positions);
  const byId = new Map(drafts.map((d) => [d.id, d] as const));
  const prev = new Map<string, Draft>();
  const next = new Map<string, Draft>();
  for (const [a, b] of pairs) {
    prev.set(b.id, a);
    next.set(a.id, b);
  }
  for (const [a, b] of pairs) if (find(a.id) === find(b.id)) throw new CityStageError(`N2: M4c ties the row neighbours ${a.id} and ${b.id} to one height`, [...a.cells, ...b.cells]);

  // ---- storeys, one value for each class ----
  const members = new Map<string, Draft[]>();
  for (const d of drafts) {
    const r = find(d.id);
    const l = members.get(r);
    if (l) l.push(d);
    else members.set(r, [d]);
  }
  const adjacent = new Map<string, Set<string>>();
  const link = (x: string, y: string): void => {
    (adjacent.get(x) ?? adjacent.set(x, new Set()).get(x)!).add(y);
  };
  for (const [a, b] of pairs) {
    link(find(a.id), find(b.id));
    link(find(b.id), find(a.id));
  }
  const order: string[] = [];
  const seen = new Set<string>();
  for (const d of [...drafts.filter((x) => x.lead), ...drafts.filter((x) => !x.lead)]) {
    const r = find(d.id);
    if (!seen.has(r)) {
      seen.add(r);
      order.push(r);
    }
  }
  const value = new Map<string, number>();
  const choices: number[] = [];
  for (let v = CITY_STOREYS.min; v <= CITY_STOREYS.max; v++) choices.push(v);
  let nodes = 0;
  const search = (n: number): boolean => {
    if (n === order.length) return true;
    if (++nodes > STOREY_NODES_MAX) return false;
    const c = order[n]!;
    const taken = new Set<number>();
    for (const y of adjacent.get(c) ?? []) if (value.has(y)) taken.add(value.get(y)!);
    const twoBack = new Set<number>();
    for (const m of members.get(c)!) {
      const p1 = prev.get(m.id);
      const p2 = p1 ? prev.get(p1.id) : undefined;
      if (p2 && value.has(find(p2.id))) twoBack.add(value.get(find(p2.id))!);
    }
    const free = choices.filter((v) => !taken.has(v));
    const preferred = free.filter((v) => !twoBack.has(v));
    const rest = free.filter((v) => twoBack.has(v));
    const start = indexOf(rand("storeys", members.get(c)![0]!.id), Math.max(preferred.length, 1));
    const tryOrder = [...preferred.slice(start), ...preferred.slice(0, start), ...rest];
    for (const v of tryOrder) {
      value.set(c, v);
      if (search(n + 1)) return true;
      value.delete(c);
    }
    return false;
  };
  if (!search(0)) throw new CityStageError("R2: no storey counts of 3 to 5 keep every row neighbour different with M4c's ties", drafts.flatMap((d) => d.cells));
  for (const d of drafts) d.storeys = value.get(find(d.id))!;

  // ---- leading buildings: style and colourway, in order along each row ----
  for (const b of drafts.filter((x) => x.lead)) {
    const before = prev.get(b.id);
    const styles = STYLE_IDS.filter((s) => !before || s !== before.style);
    b.style = styles[indexOf(rand("style", b.id), styles.length)]!;
    let at = indexOf(rand("colourway", b.id), COLOURWAY_POOL.length);
    if (before && COLOURWAY_POOL[at] === before.colourway) at = (at + 1) % COLOURWAY_POOL.length;
    b.colourway = COLOURWAY_POOL[at]!;
  }

  // ---- following buildings: through or another ----
  const followers = drafts.filter((x) => !x.lead);
  for (const f of followers) f.back = fractionOf(rand("back", f.partner!)) < BACK_SAME_SHARE ? "through" : "another";
  for (const f of followers.filter((x) => x.back === "through")) {
    const p = byId.get(f.partner!)!;
    f.style = p.style;
    f.colourway = p.colourway;
  }
  for (const f of followers.filter((x) => x.back === "another")) {
    const p = byId.get(f.partner!)!;
    const near = [prev.get(f.id), next.get(f.id)].filter((x): x is Draft => x !== undefined);
    const styles = STYLE_IDS.filter((s) => !near.some((n) => n.style === s));
    f.style = (styles.length > 0 ? styles : STYLE_IDS)[indexOf(rand("style", f.id), Math.max(styles.length, 1))]!;
    const avoid = new Set([p.colourway, ...near.map((n) => n.colourway)].filter((c) => c !== ""));
    let at = indexOf(rand("colourway", f.id), COLOURWAY_POOL.length);
    for (let guard = 0; guard < COLOURWAY_POOL.length && avoid.has(COLOURWAY_POOL[at]!); guard++) at = (at + 1) % COLOURWAY_POOL.length;
    f.colourway = COLOURWAY_POOL[at]!;
  }
}
