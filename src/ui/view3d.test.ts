import { describe, expect, it } from "vitest";
import { pageView } from "./view3d";

describe("pageView (ticket 081 U2)", () => {
  it("plays the city puzzle on the city view, except on a city= route (tiles or plan), which is drawn with no city option", () => {
    expect(pageView("")).toBe("play");
    expect(pageView("?puzzle=city-two-ways-round")).toBe("play");
    expect(pageView("?city=tiles-old&view=3d")).toBe("play");
    expect(pageView("?view=3d&city=tiles")).toBe("route");
    expect(pageView("?view=3d&city=plan&stage=assemble")).toBe("route");
    expect(pageView("?city=tiles&sheet=1")).toBe("route");
  });
});
