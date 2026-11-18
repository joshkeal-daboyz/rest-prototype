# 060 · A testing daylight: a dev-only day mode for judging the city by eye

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open, awaiting Josh's G1 (not approved). Independent of 056 to 059 except for shared files (see Dependencies). Sections A, then B.
branch: `ticket/060a-light-table`, `ticket/060b-daylight-view`

## Josh's words (18 Nov 2026, in chat)
> "please create a day light mode so it's easy to see"

His clarification, the same day:
> "the purpose of the day mode is for testing"

**This is a developer testing aid, not a game lighting feature.**
- It is dev-only (behind `import.meta.env.DEV`, absent from `npm run build`, like the street camera and the galleries).
- It changes nothing in the game's lighting design (chapter 11) or in any puzzle map's look.
- It ships no toggle to players.
- It is tuned for judging geometry and dressing by eye: even, bright light with soft, readable shading, no deep shadows hiding detail, and a flat pale sky.

## Measured (architect, 18 Nov 2026, `goal/city-style` at `793bbf7`, read from the code, no browser)
- **The renderer.**
  - `renderer.ts` makes one `WebGLRenderer({ canvas, antialias: true })` per canvas. It sets no `toneMapping` (so Three's default `NoToneMapping`), no exposure and no shadow map.
  - No light casts a shadow, and no scene has fog.
- **Night**, the same on the ladder maps (`scene.ts` 619 to 621) and the tile city (`buildCityScene`, `tilecity3d.ts` 451 to 455):
  - background `0x0b0f17` (near black);
  - `AmbientLight(0x4a5a7a, 1.1)`;
  - a "moon" `DirectionalLight(0x8fa6d0, 0.7)` from (-6, 12, 4).
  - Lamps on the ladder maps add a warm `PointLight` each (`scene.ts` 1019) and emissive glow.
- **Today's `light=day`** (055 E):
  - It **adds** one `HemisphereLight(0xcfe0ff, 0x6b5a48, 2.2)` (`STREET_CAM_*`).
  - It is owned by `tilecity3d.ts` (`addDaylight`) on the tile view, and by `streetcam.ts` (line 505) on a ladder map's street camera. So there are **two owners** of the same light.
  - The night background, ambient and moon stay on.
- **Why a day URL is still dark** (numbers):
  1. **The sky is black.** The background stays `0x0b0f17`, so every overhead and street view is framed in black.
  2. **The code-drawn surfaces are night colours,** about 4 to 8% relative luminance:
     - `GROUND` `0x0e131d`, `YARD` `0x141c29`, `STREET` `0x1a2331`, `PAVEMENT` `0x3d4658`;
     - `KERB` `0x9aa4b6` is the only light one.
     - Yard and ground are 55 to 67% of each block's area (057's baseline), so an overhead view is mostly near-black whatever the light.
  3. **No sun.** A hemisphere light gives flat fill and no direction, so walls and roofs read alike. There is no shadow or sun-side contrast.
  4. **No tone mapping or exposure,** so the pack atlases sit at their texture values and cannot be lifted as a whole.
- **The sheet** has its own lights: `AmbientLight(0xffffff, 1.5)` with a `DirectionalLight(0xffffff, 2.2)` sun, and background `0x2b3240`. That is why it is the one view Josh can read.
- **Defaults today:** the tile view opens at night (055 Q9, approved). The game and every puzzle map are night. Day exists only as the `light=day` URL flag in dev views.

## Proposal
**Rules** (draft text for a new guide section 16.12, "The testing daylight (dev only)", inside 16.8's evaluation protocol, because it is a tool for the protocol's eye checks; B writes it):
- **Decided (Josh, 18 Nov 2026):** "please create a day light mode so it's easy to see" and "the purpose of the day mode is for testing". Chapter 11's Decided night look for the game is unchanged.
- **Default (060): two modes, one owner.** A new `lighting.ts` holds a pure table `LIGHT_MODES: { night, day }`, and a new `lightrig.ts` (three) is **the only code that adds or removes the scene's global lights, background, fog, tone mapping and exposure**.
  - `scene.ts` and `buildCityScene` stop adding their own ambient and moon, and ask the rig for night instead. The ladder's night values are exactly today's.
  - `streetcam.ts` and `tilecity3d.ts` stop adding a hemisphere light.
  - Lamps' `PointLight`s, glows and pools stay with their owners (`scene.ts`, 059). They are switched on at night and off in day through one rig flag.
- **Default: night** = today, value for value:
  - background `0x0b0f17`;
  - ambient `0x4a5a7a` at 1.1;
  - moon `0x8fa6d0` at 0.7 from (-6, 12, 4);
  - no tone mapping, no fog, no shadows.
- **Default: day.**
  - **Sky:** background `0xa9c7e6`, a flat sky colour with no gradient (Q2), and no fog.
  - **Sun:** a soft key light, `DirectionalLight(0xfff6ea, 1.4)`, at a fixed elevation of 55 degrees and azimuth 135 degrees (from the south-east). Walls and roofs differ enough to read form, and no face falls dark.
  - **Fill:** a strong even fill, `HemisphereLight(0xe6efff, 0x9a8c78, 1.8)`, so shaded faces keep their detail. No ambient, no moon.
  - **Tone mapping:** `ACESFilmicToneMapping` at exposure 1.0, set and restored by the rig.
  - **Code-drawn surfaces:** day colours from `LIGHT_MODES.day.surfaces`, applied by the rig to the shared code-drawn materials (`GROUND`, `YARD`, `STREET`, `PAVEMENT`, `KERB`, 057's grass and apron):
    - ground `0x7d8471`, yard `0x7d8471`;
    - street `0x55595f`;
    - pavement `0xa7abb1`;
    - kerb `0xd0d4da`;
    - grass `0x6f8f4e`.
  - Pack textures are unchanged.
  - **Night-only things off:** lamp `PointLight`s at 0, glows and pools hidden.
  - **Shadows: off, and only ever a separate opt-in** (`&shadows=1`, dev only, Q1). The cost would be one shadow pass over every caster: about the building and dressing draw calls again (the tile city is about 40 tile draw calls plus several hundred instanced building pieces). Josh's PC froze under load on 17 Nov, so shadows stay off unless he asks. The rig has a `shadows` switch, off in both modes, which a later ticket can turn on for the tile city only.
- **Default: switching (dev only)**:
  - **URL:** `light=day|night`.
  - **Key:** **L** toggles day and night.
  - **Button:** a small "Day / Night" button in the view's corner, a DOM element made by the tile view in `src/render3d/`, not by `src/ui/`.
  - All three are behind `import.meta.env.DEV`. `npm run build` contains none of them, so the production game is always night.
- **Default: what each view opens in.**

  | View | Default |
  | --- | --- |
  | The tile city (`city=tiles`, overhead, street camera, the sheet) | **day** (Josh: "so it's easy to see"); this replaces 055 Q9's night default |
  | The game's puzzle maps (overhead and play) | **night**, unchanged; `light=day` changes them only in a dev build, through the rig |
  | The ladder maps' street camera (`cam=street`) | night; `light=day` as today, now through the rig |
  | The gallery | its own lights, unchanged |

## Sections
- **A. The table and the rig** (about 1 day). `lighting.ts`, pure: `LIGHT_MODES`, `lightModeFor(view, search)`. `lightrig.ts`, three: `applyLightMode(scene, gl, mode, owners)`. The single owner wiring in `scene.ts`, `streetcam.ts` and `tilecity3d.ts`, with tests. Night stays value-for-value today's.
- **B. The day view and the toggle** (about ½ day). The tile view's default, the L key, the button, the code-drawn day colours, guide 16.12, and the eye check. Needs A.

## Acceptance criteria
**CI-safe:** typed-in values only, no assets, no Windows paths, no timer under 1 s.

### A (Vitest)
1. [ ] **The table.** `LIGHT_MODES` is pinned value for value by a test (colours exactly, intensities and angles within 1e-9). `LIGHT_MODES.night` equals today's constants in `scene.ts` and `tilecity3d.ts` (background, ambient, moon colour, intensity and position, no tone mapping).
2. [ ] **One owner.** After `applyLightMode`, a scene has:
   - in night, exactly one `AmbientLight` and one moon `DirectionalLight`;
   - in day, exactly one sun `DirectionalLight` and one `HemisphereLight`, and no ambient;
   - every one of them tagged as the rig's.
   - A second call with the other mode leaves exactly the other set, and two calls with the same mode change nothing.
   - A source test shows no `new HemisphereLight`, `new AmbientLight` or scene-level `new DirectionalLight` outside `lightrig.ts`, `gallery.ts` and the sheet in `tilecity3d.ts`.
   - `renderer.toneMapping` and exposure are set by the rig only, and restored to `NoToneMapping` in night.
3. [ ] **Night unchanged.** On the three protocol maps, with no `light=`, the scene's lights, background, fog, tone mapping and every material colour equal today's (a snapshot of these values taken on the base commit). `npm run playtest` has no snapshot change.
4. [ ] **Defaults per view.** `lightModeFor` gives:

   | View and URL | Mode |
   | --- | --- |
   | `city=tiles` (with or without `cam=street`, `sheet=1`) | day |
   | `city=tiles&light=night` | night |
   | a puzzle map | night |
   | a puzzle map with `light=day` in dev | day |
   | a puzzle map with `light=day` in a production build | night |

   Unknown values are ignored.

### B (Vitest unless marked)
5. [ ] **The day colours.** In day the shared code-drawn materials take `LIGHT_MODES.day.surfaces`, and in night they return to today's colours exactly. Night-only lamp lights are at intensity 0, and glows and pools are hidden, in day.
6. [ ] **The toggle.** In a dev build the tile view handles the L key and the button: each press flips the mode through the rig. The listener and the button are removed on `dispose`. A test drives both with a fake event and checks the scene after each.
7. [ ] (Main session) `npm run build`: `dist/` contains no `light=` handling, no "Day / Night" button string, and no L-key listener, as 055 criterion 18 does for the tile city.
8. [ ] **Guide.** `docs/city-style-guide.md` gains section 16.12 "The testing daylight (dev only)", with both of Josh's quotes as **Decided**, the day values, the one-owner rule, and the defaults per view. It states that the game's lighting (chapter 11) is unchanged.
   - Chapter 11 (palette and light) gains one line: the testing daylight is a dev tool, and not part of the game's look.
   - 055 Q9's night default for the tile view is recorded as replaced.
   - Numbers rows cover every `lighting.ts` constant, with a drift check for `lighting.ts` (a new check only).
   - `STREET_CAM_DAY_INTENSITY` and `STREET_CAM_SKY`/`_GROUND` rows are updated or retired with the code.
9. [ ] (Main session, screenshots, `npm run dev`, each in day (the default) and with `&light=night`) Check these URLs:
   - `/?puzzle=01-first-light&view=3d&city=tiles` (overhead);
   - `&city=tiles&cam=street&run=0` and `&run=0&at=0` (a corner);
   - `&city=tiles&sheet=1`;
   - `&city=tiles&blocks=6x4&seed=3`.

   On them:
   - day is easy to see, with a sky, sunlit walls brighter than shaded ones, light pavements and a grey road;
   - night is exactly as before;
   - L and the button flip between the two.

   Then `/?puzzle=09-shrine-circuit&view=3d` opens at night exactly as on `goal/city-style`. The main session sends the screenshots to Josh. A rendered frame's brightness is not tested headless; the constants and this eye check are the measure.
10. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) `npm run gate` green and the test count grew, the diff only in Files, and `git ls-files assets/private` empty.

## Files
- **A:**
  - new `src/render3d/lighting.ts`, `lightrig.ts` and their tests;
  - `scene.ts`: the night lights replaced by the rig call, same values;
  - `streetcam.ts`: its `HemisphereLight` removed in favour of the rig; its exported `STREET_CAM_*` constants may move into `lighting.ts`;
  - `tilecity3d.ts`: `buildCityScene`'s lights and `addDaylight` replaced by the rig;
  - `renderer.ts`: the rig gets the `WebGLRenderer` for tone mapping; dev-only `light=` reading beside the existing dev branches.
- **B:** `tilecity3d.ts` (the default, the key, the button, the day colours); `docs/city-style-guide.md` (chapters 11 and 21, Numbers); `styleguide.test.ts` (the new drift check only).
- **Must not touch:**
  - `layout.ts`, `relight3d.ts`, `pick.ts`, `camera.ts`, `town.ts`, `tilecity.ts`, `dressing.ts`, `furniture.ts`, `models3d.ts`, `gallery.ts`;
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`.

## Dependencies
- **Independent of 056 to 059 in what it does.**
- **It shares files with them:**
  - `tilecity3d.ts` with 056 B, 057 D and 059 A2;
  - `renderer.ts` with nothing open;
  - `scene.ts` and `streetcam.ts` with nothing open.

  The main session merges one at a time, and the later branch rebases.
- **059 A2's night pools** use the rig's night flag if 060 has landed, and today's `light=day` if not.
- **055:** it replaces 055 Q9's tile-view default (night) with day; the ladder and game defaults are untouched. 055 E's criterion 30 tests (one `HemisphereLight` at `STREET_CAM_DAY_INTENSITY` per `light=day` URL) are replaced by criterion 2 here. That is an edit to `tilecity3d.test.ts`, allowed in A.
- No `src/core/` change, no schema or event change, no new dependency (`ACESFilmicToneMapping` is Three's).

## Interfaces
- `lighting.ts`:
  - `type LightModeId = "night" | "day"`;
  - `LIGHT_MODES: Readonly<Record<LightModeId, { background: number; ambient: { color; intensity } | null; key: { color; intensity; elevation_deg; azimuth_deg } | null; moon: { color; intensity; position: [number, number, number] } | null; hemi: { sky; ground; intensity } | null; toneMapping: "none" | "aces"; exposure: number; shadows: boolean; nightLights: boolean; surfaces: Readonly<Record<string, number>> }>>`;
  - `lightModeFor(view: "tiles" | "puzzle" | "street", search: string, dev: boolean): LightModeId`.
- `lightrig.ts`: `applyLightMode(scene, gl, mode, owners?: { materials?: ReadonlyMap<string, Material>; nightOnly?: Object3D[] })`.

The builder may rename any of these.

## Open questions for Josh (the defaults apply if he approves as is)
1. **Shadows.** Default: **off, as a separate opt-in** (`&shadows=1`, dev only), built only if the builder measures it cheap (at most 1.5 times the frame's draw calls on the default tile city). Otherwise it is left out and reported. They cost about one extra pass over every building, and your PC froze under load on 17 Nov. Alternative: sun shadows on in day for the tile city only, with a 2048 map, buildings casting and the ground receiving. The builder would report the draw-call count.
2. **The sky.** Default: a flat pale blue. Alternative: a simple two-colour gradient (a large backdrop sphere), one more draw call.
3. **The tile view's default.** Default: **day** (your words). Alternative: night first, with the toggle.
4. **Daylight on the puzzle maps.** Settled by Josh ("for testing"): dev-only (`light=day` or L), never in the production game, and no player toggle.
