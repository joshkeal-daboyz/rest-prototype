import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CIRCUIT_COMPONENTS, type CircuitComponentPick } from "../core";
import { COMPONENT_SHORTLIST, pickWords, shortlistLinkOf } from "./componentshortlist";

// The shortlist is transcribed from the D1 note, so the note is read here and each candidate's key, size and triangles are checked against its row.
const note = readFileSync("docs/design/081-D1-component-shortlist.md", "utf8");

function notedRows(): Map<string, { letter: string; key: string; size_m: number[]; triangles: number }[]> {
  const out = new Map<string, { letter: string; key: string; size_m: number[]; triangles: number }[]>();
  let section: string | null = null;
  for (const line of note.split("\n")) {
    const h = /^### \d+\. (\w+)/.exec(line);
    if (h !== null) {
      section = h[1] ?? null;
      if (section !== null) out.set(section, []);
      continue;
    }
    const r = /^\| ([A-D]) \| `([^`]+)` \| ([\d.]+) x ([\d.]+) x ([\d.]+) \| ([\d,]+) \|/.exec(line);
    if (r !== null && section !== null) {
      out.get(section)?.push({ letter: r[1] ?? "", key: r[2] ?? "", size_m: [r[3], r[4], r[5]].map(Number), triangles: Number((r[6] ?? "").replace(/,/g, "")) });
    }
  }
  return out;
}

describe("COMPONENT_SHORTLIST, pinned to 081-D1-component-shortlist.md", () => {
  it("lists, for each component, the four candidates the note gives: key, size and triangles, row for row", () => {
    const rows = notedRows();
    for (const c of CIRCUIT_COMPONENTS) {
      const want = rows.get(c);
      expect(want, c).toBeDefined();
      expect(
        COMPONENT_SHORTLIST[c].map((k) => ({ letter: k.letter, key: k.key, size_m: [...k.size_m], triangles: k.triangles })),
        c,
      ).toEqual(want);
    }
  });
});

describe("the components view's pick line and link", () => {
  it("says Unpicked, in words, for no pick or a null key", () => {
    expect(pickWords(undefined)).toMatch(/^Unpicked/);
    expect(pickWords(null)).toMatch(/^Unpicked/);
    const unpicked: CircuitComponentPick = { component: "feed", key: null, words: "", date: "2026-11-23" };
    expect(pickWords(unpicked)).toMatch(/^Unpicked/);
  });

  it("gives the key, Josh's words and the date for a pick, and the gallery link for a key", () => {
    const pick: CircuitComponentPick = { component: "battery", key: "sci-fi-frontier-pack:SM_Prop_Battery_05", words: "D: Frontier Battery_05", date: "2026-11-23" };
    expect(pickWords(pick)).toBe('Picked: sci-fi-frontier-pack:SM_Prop_Battery_05. Josh, 2026-11-23: "D: Frontier Battery_05"');
    expect(shortlistLinkOf(pick.key ?? "")).toBe("?assets=sci-fi-frontier-pack&piece=SM_Prop_Battery_05");
  });
});
