# City style: Testing daylight

standard: yes
Scope: the dev-only day mode for judging the city by eye: its two light modes, their one owner, how it is switched and what each view opens in.
Read by: renderer
Depends on: `docs/city-style/light-and-accessibility.md` (the night look, chapter 11), `docs/city-style/numbers.md` (the day values), `docs/city-style/evaluation.md` (the eye checks of 16.8)

## Rules

### 16.12 The testing daylight (dev only)

- **Rule [D-060b]**: the 3D view gets a day mode for judging the city by eye.
- **Rule [D-060c]**: it is a developer testing aid, not a game lighting feature. It is dev only (behind `import.meta.env.DEV`, absent from `npm run build`), ships no toggle to players, changes no puzzle map's look unless `light=day` is asked in a dev build, and leaves the game's night look of chapter 11 unchanged. It is a tool for the eye checks of 16.8.
- **Default (060)**: two modes, one owner. `LIGHT_MODES` in `lighting.ts` is a pure table of both modes; `lightrig.ts` is the only code that adds or removes a scene's global lights, background and fog, or sets a renderer's tone mapping and exposure. scene.ts and `buildCityScene` ask it for night, and streetcam.ts and the tile view add no light of their own. Two views keep lights of their own: the building gallery (gallery.ts) and the tile sheet. A lamp's point light, glow and pool stay with their owner (scene.ts) and are switched by one rig flag. `lightrig.test.ts` reads the source to hold the one owner.
- **Default (060)**: night is `LIGHT_MODES.night`, the look of chapter 11, value for value (`lightrig.test.ts` holds the three protocol maps to a snapshot taken before the rig existed): the background, the ambient light, the moon, no tone mapping, no fog, no shadows, and the code-drawn surfaces `GROUND`, `YARD`, `STREET`, `PAVEMENT` and `KERB`.
- **Default (060)**: day is a flat sky (no gradient, no fog), a soft sun from the south-east at a fixed elevation (key light, azimuth 135 degrees, elevation 55), a strong even fill (a hemisphere light, no ambient and no moon) so shaded faces keep their detail, and filmic tone mapping at exposure 1, set and restored by the rig. The code-drawn surfaces take their day colours from `LIGHT_MODES` (ground, yard, street, pavement, kerb and the grass of the block interiors, 19.4) and return to night's exactly. The packs' textures are unchanged. In day the lamps' lights are at 0 and their glows, pools and flares are hidden. Values are in the Numbers table.
- **Default (060)**: shadows are off in both modes. The rig has a `shadows` switch, off in both, which a later ticket can turn on for the tile city only.
- **Default (060)**: switching is dev only. The URL flag is `light=day` or `light=night` (anything else is ignored). In the tile view the L key and a small `Day / Night` button each flip the mode through the rig; both are removed with the view. The sheet has nothing to flip. The ladder maps have no key or button.
- **Default [D-060d]**: what each view opens in:

| View | Opens in |
| --- | --- |
| the tile city (`city=tiles`: overhead, street camera, fallback to overhead) | day; `light=night` opens night |
| the tile sheet (`sheet=1`) | its own lights, the same in both modes |
| a puzzle map, overhead or play | night; `light=day` gives day in a dev build only |
| a ladder map's street camera (`cam=street`) | night; `light=day` gives day in a dev build only |
| the building gallery | its own lights |

- The grass colour (`surfaces.grass` of each light mode, a Numbers row) is drawn on the block interiors (19.4): the City Pack's `SM_Env_Grass_01` tiles or, where the piece is absent, flat quads in the mode's grass colour. The tile view brings a material it swaps in later (the pack's tiles arriving) to the mode it is in.
- Brightness of a rendered frame is not tested headless; the table and the screenshots of 16.8 are the measure.

## Open questions

- **Open**: sun shadows (`&shadows=1`, dev only). They cost about one extra pass over every building, and Josh's PC froze under load once, so the opt-in is not built [D-060e]. Waits for: Josh asking for shadows, and a measured draw-call count on the default tile city.
