/**
 * The scene's two light modes (ticket 060, section A): the game's night and a dev-only testing daylight. Pure: no three, no DOM, no address.
 * The table holds every value of the global lighting (background, lights, tone mapping, exposure, the code-drawn surface colours) so `lightrig.ts`, the one
 * code that adds or removes the scene's global lights, only reads it. Night is the game's look, value for value what `buildScene` and `buildCityScene` held before
 * this ticket (chapter 11); day is a testing aid for judging geometry and dressing by eye (section 16.12 of the city style guide), never in the production build.
 */

export type LightModeId = "night" | "day";

/** The code-drawn surfaces whose colour follows the mode. `grass` is 057's open-block ground, which no code draws yet: its key is reserved so a drawer registers it. */
export const SURFACE_KEYS = ["ground", "yard", "street", "pavement", "kerb", "grass"] as const;
export type SurfaceKey = (typeof SURFACE_KEYS)[number];

export interface LightMode {
  /** The scene's background (a flat colour: no gradient, no fog in either mode). */
  background: number;
  ambient: { color: number; intensity: number } | null;
  /** The sun: a directional light at a fixed elevation above the horizon and azimuth clockwise from north (-z), so 135 is from the south-east (+x, +z). */
  key: { color: number; intensity: number; elevation_deg: number; azimuth_deg: number } | null;
  /** Night has the sky and the moon (ticket 081 SK): the dome, the stars, the moon disc and the moon light. Their numbers are in `NIGHT_SKY` (`nightsky.ts`), tuned by eye and not pinned. */
  sky: boolean;
  hemi: { sky: number; ground: number; intensity: number } | null;
  toneMapping: "none" | "aces";
  exposure: number;
  /** Sun shadows: off in both modes (an opt-in for a later ticket, dev only). */
  shadows: boolean;
  /** Lamp point lights, glows, pools and flares: on at night, off in day. */
  nightLights: boolean;
  surfaces: Readonly<Record<SurfaceKey, number>>;
}

export const LIGHT_MODES: Readonly<Record<LightModeId, LightMode>> = {
  night: {
    background: 0x0b0f17,
    ambient: { color: 0x4a5a7a, intensity: 1.1 },
    key: null,
    sky: true,
    hemi: null,
    toneMapping: "none",
    exposure: 1,
    shadows: false,
    nightLights: true,
    // Today's colours: scene.ts's GROUND, YARD, STREET, PAVEMENT and KERB (a test holds them equal). Grass has no night colour of its own yet: it is the yard's.
    surfaces: { ground: 0x0e131d, yard: 0x141c29, street: 0x1a2331, pavement: 0x3d4658, kerb: 0x9aa4b6, grass: 0x141c29 },
  },
  day: {
    background: 0xa9c7e6,
    ambient: null,
    key: { color: 0xfff6ea, intensity: 1.4, elevation_deg: 55, azimuth_deg: 135 },
    sky: false,
    hemi: { sky: 0xe6efff, ground: 0x9a8c78, intensity: 1.8 },
    toneMapping: "aces",
    exposure: 1,
    shadows: false,
    nightLights: false,
    surfaces: { ground: 0x7d8471, yard: 0x7d8471, street: 0x55595f, pavement: 0xa7abb1, kerb: 0xd0d4da, grass: 0x6f8f4e },
  },
};

/** How far from the origin the sun stands (its light is parallel, so only the direction matters). */
export const SUN_DISTANCE = 20;

/** Where the sun stands for an elevation and an azimuth (degrees): azimuth 0 is north (-z), 90 east (+x), 135 south-east. */
export function sunPosition(elevation_deg: number, azimuth_deg: number, distance = SUN_DISTANCE): [number, number, number] {
  const el = (elevation_deg * Math.PI) / 180;
  const az = (azimuth_deg * Math.PI) / 180;
  const flat = Math.cos(el) * distance;
  return [flat * Math.sin(az), Math.sin(el) * distance, -flat * Math.cos(az)];
}

export type LightView = "tiles" | "puzzle" | "street";

/**
 * Which mode a view opens in. `search` is the page's query string, `dev` is `import.meta.env.DEV` (the caller passes it, so this stays pure). The tile city opens in day
 * (Josh: "so it's easy to see") unless `light=night`; a puzzle map and the ladder's street camera open at night, and `light=day` changes them only in a dev build. Unknown values
 * of `light` are ignored. In a production build every view is night.
 */
export function lightModeFor(view: LightView, search: string, dev: boolean): LightModeId {
  if (!dev) return "night";
  const asked = new URLSearchParams(search).get("light");
  if (view === "tiles") return asked === "night" ? "night" : "day";
  return asked === "day" ? "day" : "night";
}
