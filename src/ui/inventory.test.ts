import { describe, expect, it } from "vitest";
import { partCounts, PART_ICON_SVG, PART_ICON_VIEWBOX, PART_LABEL, inventoryRows, promptPosition, type Rect } from "./logic";

const BOUNDS = { width: 800, height: 600 };
const BOX = { width: 100, height: 40 };

/** True when two rectangles share any area (touching edges do not count). */
function intersects(a: { left: number; top: number; width: number; height: number }, b: Rect): boolean {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

describe("inventoryRows", () => {
  it("gives three rows in the order bulb, fuse, wire, all empty for no parts", () => {
    const rows = inventoryRows([]);
    expect(rows.map((r) => r.kind)).toEqual(["bulb", "fuse", "wire"]);
    expect(rows.map((r) => r.count)).toEqual([0, 0, 0]);
    expect(rows.every((r) => r.empty)).toBe(true);
    expect(rows.map((r) => r.text)).toEqual(["Bulb 0", "Fuse 0", "Wire 0"]);
  });

  it("counts each kind and marks only the kinds at zero as empty", () => {
    const rows = inventoryRows(["wire", "fuse", "wire"]);
    expect(rows).toEqual([
      { kind: "bulb", label: "Bulb", count: 0, text: "Bulb 0", empty: true },
      { kind: "fuse", label: "Fuse", count: 1, text: "Fuse 1", empty: false },
      { kind: "wire", label: "Wire", count: 2, text: "Wire 2", empty: false },
    ]);
  });

  it("agrees with partCounts for the same input", () => {
    const parts = ["bulb", "bulb", "fuse", "wire", "bulb", "wire", "wire", "wire"] as const;
    const counts = partCounts(parts);
    for (const row of inventoryRows(parts)) {
      expect(row.count).toBe(counts[row.kind]);
    }
  });

  it("gives two-digit counts as plain numbers in the text", () => {
    const parts = Array.from({ length: 12 }, () => "bulb" as const);
    expect(inventoryRows(parts)[0]?.text).toBe("Bulb 12");
  });

  it("names each part as the label used in the row's aria-label", () => {
    expect(PART_LABEL).toEqual({ bulb: "Bulb", fuse: "Fuse", wire: "Wire" });
  });
});

describe("promptPosition with avoid (ticket 021)", () => {
  it("is unchanged without avoid", () => {
    expect(promptPosition({ x: 100, y: 100 }, BOUNDS, BOX)).toEqual({ left: 116, top: 116 });
    expect(promptPosition({ x: 100, y: 100 }, BOUNDS, BOX, 16, 8, undefined)).toEqual({ left: 116, top: 116 });
  });

  it("is unchanged when avoid does not overlap the below-right spot", () => {
    const far: Rect = { left: 600, top: 0, width: 50, height: 50 };
    expect(promptPosition({ x: 100, y: 100 }, BOUNDS, BOX, 16, 8, far)).toEqual({ left: 116, top: 116 });
  });

  it("goes above the pointer when the below-right spot would overlap the panel", () => {
    // The panel at the bottom-left, as the inventory sits: 14 px in from the left and bottom edges.
    const panel: Rect = { left: 14, top: 470, width: 76, height: 116 };
    const pointer = { x: 60, y: 480 };
    const spot = promptPosition(pointer, BOUNDS, BOX, 16, 8, panel);
    expect(spot).toEqual({ left: 76, top: 424 });
    expect(intersects({ ...spot, ...BOX }, panel)).toBe(false);
  });

  it("goes right of the panel when above is blocked too", () => {
    // A short bounds with the pointer at the top, and a wide panel covering the top-left.
    const wideBounds = { width: 400, height: 100 };
    const panel: Rect = { left: 0, top: 0, width: 200, height: 100 };
    const pointer = { x: 50, y: 10 };
    const spot = promptPosition(pointer, wideBounds, BOX, 16, 8, panel);
    expect(spot).toEqual({ left: 208, top: 26 });
    expect(intersects({ ...spot, ...BOX }, panel)).toBe(false);
  });

  it("keeps the box inside margin of the bounds in every case", () => {
    const panel: Rect = { left: 14, top: 470, width: 76, height: 116 };
    const cases = [
      { x: 60, y: 480 },
      { x: 60, y: 560 },
      { x: -40, y: -40 },
      { x: 790, y: 590 },
      { x: 50, y: 10 },
    ];
    for (const pointer of cases) {
      const spot = promptPosition(pointer, BOUNDS, BOX, 16, 8, panel);
      expect(spot.left).toBeGreaterThanOrEqual(8);
      expect(spot.top).toBeGreaterThanOrEqual(8);
      expect(spot.left + BOX.width).toBeLessThanOrEqual(BOUNDS.width - 8);
      expect(spot.top + BOX.height).toBeLessThanOrEqual(BOUNDS.height - 8);
    }
  });
});

describe("PART_ICON_SVG (Josh's approved icons, ticket 021)", () => {
  it("uses the verbatim approved markup for each kind", () => {
    expect(PART_ICON_SVG.bulb).toBe(
      '<path d="M9 17.5h6M10 20.5h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.6 14.6A6 6 0 1 1 15.4 14.6C14.6 15.3 14.4 16 14.4 17.5H9.6C9.6 16 9.4 15.3 8.6 14.6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10.5 17.5V12.2L12 10.8L13.5 12.2V17.5" fill="none" stroke="#f2b84b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    );
    expect(PART_ICON_SVG.fuse).toBe(
      '<path d="M12 1.8V4.5M12 19.5V22.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><rect x="8.2" y="4.5" width="7.6" height="15" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.2 7.6H15.8M8.2 16.4H15.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.6V9.4L10.3 10.9L13.7 13.1L12 14.6V16.4" fill="none" stroke="#f2b84b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    );
    expect(PART_ICON_SVG.wire).toBe(
      '<circle cx="12" cy="3.8" r="1.9" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="20.2" r="1.9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 5.7V7.6C7.2 8.6 7.2 11.4 12 12C16.8 12.6 16.8 15.4 12 16.4V18.3" fill="none" stroke="#f2b84b" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    );
  });

  it("has exactly one accent-stroked element per icon, in #f2b84b", () => {
    for (const kind of ["bulb", "fuse", "wire"] as const) {
      const accents = PART_ICON_SVG[kind].match(/stroke="#f2b84b"/g) ?? [];
      expect(accents).toHaveLength(1);
    }
  });

  it("is drawn in a 24 by 24 viewBox", () => {
    expect(PART_ICON_VIEWBOX).toBe("0 0 24 24");
  });
});
