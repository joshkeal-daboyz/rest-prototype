import { describe, expect, it } from "vitest";
import { assetGalleryRequested } from "./assetgallerylogic";
import { wants3d } from "./view3d";

describe("wants3d (ticket 081 A2d)", () => {
  it("asks for 3D only with view=3d and a city route (tiles or plan, sheet or not) or a city puzzle; a schematic puzzle with no city route opens 2D", () => {
    expect(wants3d("?puzzle=09-shrine-circuit&view=3d", "schematic")).toBe(false);
    expect(wants3d("?view=3d&city=tiles", "schematic")).toBe(true);
    expect(wants3d("?view=3d&city=tiles&sheet=1", "schematic")).toBe(true);
    expect(wants3d("?view=3d&city=plan&stage=assemble", "schematic")).toBe(true);
    expect(wants3d("?view=3d&city=tiles-old", "schematic")).toBe(false);
    expect(wants3d("?city=tiles", "schematic")).toBe(false);
    expect(wants3d("?view=3d", "city")).toBe(true);
  });

  it("leaves ?assets= as it was: the gallery address reads the same with view=3d, and wants3d never asks for 3D on it", () => {
    expect(assetGalleryRequested("?assets=city-pack&view=3d")?.pack).toBe("city-pack");
    expect(assetGalleryRequested("?view=3d&assets=city-pack&city=tiles")?.pack).toBe("city-pack");
    expect(wants3d("?assets=city-pack&view=3d", "schematic")).toBe(false);
  });
});
