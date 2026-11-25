/**
 * Ticket 060 section A: the light modes' table and which mode a view opens in. Typed-in values only: no assets, no timers, no paths.
 */

import { describe, expect, it } from "vitest";
import { LIGHT_MODES, SURFACE_KEYS, lightModeFor, sunPosition } from "./lighting";
import { GROUND, KERB, PAVEMENT, STREET, YARD } from "./kitunits";

const close = (a: number, b: number): void => expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-9);

describe("LIGHT_MODES, pinned value for value", () => {
  it("night is today's: background, ambient, the sky and the moon (numbers in NIGHT_SKY), no tone mapping, no fog or shadows", () => {
    const n = LIGHT_MODES.night;
    expect(n.background).toBe(0x0b0f17);
    expect(n.ambient!.color).toBe(0x4a5a7a);
    close(n.ambient!.intensity, 1.1);
    expect(n.sky).toBe(true);
    expect(n.key).toBeNull();
    expect(n.hemi).toBeNull();
    expect(n.toneMapping).toBe("none");
    close(n.exposure, 1);
    expect(n.shadows).toBe(false);
    expect(n.nightLights).toBe(true);
  });

  it("night's code-drawn colours are the ones scene.ts draws with today", () => {
    expect(LIGHT_MODES.night.surfaces.ground).toBe(GROUND);
    expect(LIGHT_MODES.night.surfaces.yard).toBe(YARD);
    expect(LIGHT_MODES.night.surfaces.street).toBe(STREET);
    expect(LIGHT_MODES.night.surfaces.pavement).toBe(PAVEMENT);
    expect(LIGHT_MODES.night.surfaces.kerb).toBe(KERB);
    // Typed in as well, so a change to the code and the table together is still seen.
    expect([GROUND, YARD, STREET, PAVEMENT, KERB]).toEqual([0x0e131d, 0x141c29, 0x1a2331, 0x3d4658, 0x9aa4b6]);
  });

  it("day is a flat sky, a soft sun from the south-east at 55 degrees, a strong even fill and ACES at exposure 1, with no ambient or moon", () => {
    const d = LIGHT_MODES.day;
    expect(d.background).toBe(0xa9c7e6);
    expect(d.ambient).toBeNull();
    expect(d.sky).toBe(false);
    expect(d.key!.color).toBe(0xfff6ea);
    close(d.key!.intensity, 1.4);
    close(d.key!.elevation_deg, 55);
    close(d.key!.azimuth_deg, 135);
    expect(d.hemi!.sky).toBe(0xe6efff);
    expect(d.hemi!.ground).toBe(0x9a8c78);
    close(d.hemi!.intensity, 1.8);
    expect(d.toneMapping).toBe("aces");
    close(d.exposure, 1);
    expect(d.shadows).toBe(false);
    expect(d.nightLights).toBe(false);
  });

  it("day's code-drawn colours", () => {
    expect(LIGHT_MODES.day.surfaces).toEqual({ ground: 0x7d8471, yard: 0x7d8471, street: 0x55595f, pavement: 0xa7abb1, kerb: 0xd0d4da, grass: 0x6f8f4e });
  });

  it("both modes name every surface key", () => {
    for (const id of ["night", "day"] as const) expect(Object.keys(LIGHT_MODES[id].surfaces).sort()).toEqual([...SURFACE_KEYS].sort());
  });

  it("every day surface is lighter than night's (the testing daylight is for seeing)", () => {
    const lum = (hex: number): number => 0.2126 * ((hex >> 16) & 255) + 0.7152 * ((hex >> 8) & 255) + 0.0722 * (hex & 255);
    for (const k of ["ground", "yard", "street", "pavement"] as const) expect(lum(LIGHT_MODES.day.surfaces[k]), k).toBeGreaterThan(lum(LIGHT_MODES.night.surfaces[k]));
  });
});

describe("sunPosition", () => {
  it("azimuth 135 is the south-east (+x, +z) and elevation 55 is the height above the ground plane", () => {
    const [x, y, z] = sunPosition(55, 135, 20);
    close(x, 20 * Math.cos((55 * Math.PI) / 180) * Math.SQRT1_2);
    close(z, x);
    close(y, 20 * Math.sin((55 * Math.PI) / 180));
    close(Math.hypot(x, y, z), 20);
  });
  it("north is -z and east is +x", () => {
    const n = sunPosition(0, 0, 10);
    close(n[0], 0);
    close(n[2], -10);
    const e = sunPosition(0, 90, 10);
    close(e[0], 10);
    close(e[2], 0);
  });
});

describe("lightModeFor: what each view opens in", () => {
  const cases: [string, "tiles" | "puzzle" | "street", string, boolean, "night" | "day"][] = [
    ["city=tiles", "tiles", "?puzzle=01&view=3d&city=tiles", true, "day"],
    ["city=tiles with cam=street", "tiles", "?city=tiles&cam=street&run=0", true, "day"],
    ["city=tiles with sheet=1", "tiles", "?city=tiles&sheet=1", true, "day"],
    ["city=tiles&light=night", "tiles", "?city=tiles&light=night", true, "night"],
    ["a puzzle map", "puzzle", "?puzzle=09-shrine-circuit&view=3d", true, "night"],
    ["a puzzle map with light=day in dev", "puzzle", "?puzzle=09-shrine-circuit&view=3d&light=day", true, "day"],
    ["a puzzle map with light=day in a production build", "puzzle", "?puzzle=09-shrine-circuit&view=3d&light=day", false, "night"],
    ["the ladder's street camera", "street", "?puzzle=09&view=3d&cam=street&run=0", true, "night"],
    ["the ladder's street camera with light=day", "street", "?puzzle=09&view=3d&cam=street&run=0&light=day", true, "day"],
    ["the tile city in a production build", "tiles", "?city=tiles", false, "night"],
  ];
  for (const [label, view, search, dev, want] of cases) {
    it(`${label}: ${want}`, () => {
      expect(lightModeFor(view, search, dev)).toBe(want);
    });
  }

  it("ignores values it does not know", () => {
    for (const s of ["?light=", "?light=Day", "?light=dusk", "?light=1", "?light=night&light=day"]) {
      expect(lightModeFor("puzzle", s, true), s).toBe("night");
    }
    for (const s of ["?city=tiles&light=", "?city=tiles&light=Night", "?city=tiles&light=dusk", "?city=tiles&light=day"]) {
      expect(lightModeFor("tiles", s, true), s).toBe("day");
    }
  });
});
