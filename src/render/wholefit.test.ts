import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle } from "../core";
import { PADDING, computeFit, fitScale, mapBox, minZoomScale, puzzleBounds } from "./geometry";

// Real panels at 1100x650 with the HUD insets: the whole-map scale is limited by the short free area (290 px high),
// not by a bug. 56 is 29 x 19 units, 64 is 21 x 22 units.
const INSETS = { top: 220, bottom: 140 };
const CASES: Array<[string, number]> = [
  ["56-whole-ward", (650 - 360 - 2 * PADDING) / 19],
  ["64-the-whole-chain", (650 - 360 - 2 * PADDING) / 22],
];
for (const [id, expected] of CASES) {
  describe(`whole-map fit on ${id} at 1100x650`, () => {
    const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "../../puzzles", `${id}.json`), "utf8")));
    const b = puzzleBounds(puzzle);
    it("is the node extents fitted to the free area, once", () => {
      const min = minZoomScale(b, 1100, 650, PADDING, INSETS);
      expect(min).toBeCloseTo(expected, 6);
      expect(fitScale(b, 1100, 650, PADDING, INSETS)).toBeCloseTo(min, 9);
      const box = mapBox(b, computeFit(b, 1100, 650, PADDING, INSETS, undefined, min));
      expect(box.top).toBeCloseTo(220 + PADDING, 6);
      expect(box.bottom).toBeCloseTo(650 - 140 - PADDING, 6);
    });
  });
}
