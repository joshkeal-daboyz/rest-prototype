# City style: Light and accessibility

## 8. Lit places

- **Info**: today a place (what a lamp lights) is a warm box in the place's size (`PLACE_SIZES`, each `PLACE_STOREYS` storeys), placed before the ordinary lots, within `PLACE_REACH` of its lamp and nearer it than any other lamp. A place that finds no room is a pool of light on the lamp's lane. A streetlight is always a pool.
- **Default (041)**: a place, but not an ordinary lot, may also front either side of a service run. A gate's posts may both stand on the free side of the wire if one on each side fails. (041 A-Q2, no objection from Josh.)
- **Decided (042, Josh, 17 Nov 2026: "The objects being lit are still just squares. Can we light up buildings from the asset pack instead?")**: lit places become real buildings.
- **Pending (042 B, approved, not built)**: a place is a model chosen by kind from `PLACE_MODELS`, fitted inside its box at a scale between `PLACE_MIN_SCALE` and 1 times `WORLD_PER_METRE`, warmed by an emissive tint over its own texture (`PLACE_GLOW_MAX` times the place's glow), on its own material clones. With no model that fits, the warm box stays.
- **Pending (042 E, gated on a landmark pack)**: landmark buildings (a church, a bell tower, an inn) for sacred and hall places.


## 9. Power lines

- **Decided (041, Josh, 17 Nov 2026: "Currently they are just lines and they don't look like 'power lines'." The quotation marks inside his sentence are changed to single ones here.)**: lines are wooden poles of one style on the pavement, each carrying three conductors on a cross-arm.
- **Default (041 Q6)**: poles are spaced at most `POLE_SPACING` apart, evenly along a run. Three conductors sit at minus `PHASE_OFFSET`, 0 and plus `PHASE_OFFSET` along the cross-arm, which runs across the run, at `POLE_HEIGHT`. A run with no intermediate pole draws one conductor.
- **Default (041 Q5)**: sag is `SAG_RATIO` of the span, and a conductor's radius is `WIRE_RADIUS`. This reversed the 12% sag of 037 C-Q2, because heavy sag on short spans made the wires read as lines.
- **Default (041 Q9, C5)**: insulators, transformer cans and service drops are code-drawn (neither pack had them; drops are 041 C5). An insulator sits under each conductor on every intermediate pole. A can hangs `CAN_OFFSET` from its pole's axis, toward the pole's first drop, and `CAN_DROP` under the wire's height. A pole carries a can only if it has a drop.
- **Default (041 C5)**: a service drop goes from an intermediate pole to a building (not a place) whose front is within `DROP_REACH` of it. It leaves the pole `DROP_DROP` under the wire's height and lands `DROP_END_Y` high on the building's front (two thirds of the building's height if that is lower). Drops are thin, always dull, never pick targets, and are scenery.
- **Info**: the code uses a `DROP_REACH` of 2.5, where 041 C5 wrote 2. At 2 almost no lot is reachable (the reason is in the `layout.ts` comment). The 041 C review raised the difference, and 041 merged with 2.5.
- **Decided (042, Josh, 17 Nov 2026: "The cut game looks ok, good for testing (not a final product)" and "Relight looks good")**: the cut on a damaged cable and the Relight keep their looks. The cut cuts all three conductors in the same span, their ends hang by `HANG_DROP`, and the gap is `BREAK_GAP` wide. Every ticket that touches the town keeps `live.test.ts`, `relight3d.test.ts` and the break and conductor tests passing unchanged.
- **Default (041 C6)**: clicking any of the three conductors picks the line (`WIRE_PICK_RADIUS`). Node priority is unchanged.
- **Default (042 Q9)**: conductors stay code-generated. Packs supply pole, arm, insulator and can hardware only. Pack line meshes (`*_Lines_*`, `*_Preset_*`) are never used.
- **Pending (042 D, gated on a power pack)**: pack pole hardware. `PHASE_OFFSET` follows a pack arm's insulator tops if they differ, and `WIRE_PICK_RADIUS` is re-checked.
- **Info**: today the pole is `SM_Prop_Powerpole_01` and the lamp post `SM_Prop_LightPole_01`, both from `apocalypse-power`.


## 11. Palette and light

- **Info**: it is a night scene. The values are in the Numbers table (colours as `0x` hex, pinned exactly). The scene's background, ambient light and moon light are in `LIGHT_MODES.night` (`lighting.ts`, section 16.12), and the table's last section pins their source text there too.
- **Default (060)**: the testing daylight of 16.12 is a dev tool and not part of the game's look: the game is night, and no player toggle ships.
- **Info**: ground colours: `GROUND` (the town's dark edge), `YARD` (open ground inside a block, a little lighter), `STREET` (asphalt), `PAVEMENT` (mid-grey, lighter than the asphalt), `KERB` (the pale lip) and `CENTRE_LINE`.
- **Info**: pole and hardware colours: `POLE_WOOD`, `FOOT`, `METAL`, `INSULATOR`, `CAN` and `DROP_COLOR`.
- **Info**: wire looks: `LIVE_WIRE` (with `LIVE_GLOW`), `DEAD_WIRE` and `REPAIRED_WIRE` (a mended cable that is not live: 2D's "new cable"). `SCORCH` is a blown fuse or a faulted body. `RIBBON` marks a fault.
- **Info**: light: `WARM` is a lit place's and lamp's glow, `TARGET` the target lamp's. `PLACE` is an unlit place box.
- **Default (041)**: placeholder walls use four dark tints (`TINTS`), and the roof is `ROOF_SHADE` of the wall, so a town of boxes stays dark. A storey is `STOREY_M`; a flat roof's parapet is `CAP_M`, a pitched roof rises `PITCH_M`.
- **Info**: `DEAD_WIRE` and `REPAIRED_WIRE` match 2D's colours, and `live.test.ts` holds a drift guard for the repaired one.


## 12. Accessibility

- **Decided (037, the GDD's accessibility rule)**: state never reads by colour alone. Every new look must meet this, and its ticket must test it.
- **Decided (037, 041 C)**: a live wire differs from a dead one by more than colour. A live wire is brighter, glows and breathes, and carries a bead that moves away from the feed. A dead wire is dull and still. A damaged cable shows a visible break and a spark. All three conductors of a line share the line's look.
- **Decided (037)**: a lit lamp has a light pool and a halo, and flickers in a brownout. Breakers and switches read by lever shape and position (a breaker's lever is up when closed and flat or dropped when open; a switch's points down the selected line, with a chevron). The target star is filled or hollow. The fuse reads by its bar as well as its caption tone.
- **Decided (037)**: poles are painted at least 3:1 in luminance against the street (`POLE_WOOD` against `STREET`), so they read by brightness. The drift test repeats this check on the pinned colours.
- **Info**: the tests that enforce it today are in `scene.test.ts` (lamps and brownout; breaker, switch and fuse bar; poles 3:1), `live.test.ts` (breaker, lamp, fuse and damaged-cable looks; "gives all three conductors the line's look", which checks the bead and breathing), and `look.test.ts` (looks from state).
- **Pending (042 B to D)**: a pack model or hardware must keep these looks. A lit place model still warms by emission over its own texture and keeps its pool and star.


### 16.12 The testing daylight (dev only)

- **Decided (060, Josh 18 Nov 2026: "please create a day light mode so it's easy to see")**: the 3D view gets a day mode for judging the city by eye.
- **Decided (060, Josh 18 Nov 2026: "the purpose of the day mode is for testing")**: it is a developer testing aid, not a game lighting feature. It is dev only (behind `import.meta.env.DEV`, absent from `npm run build`), ships no toggle to players, changes no puzzle map's look unless `light=day` is asked in a dev build, and leaves the game's night look of chapter 11 unchanged. It is a tool for the eye checks of 16.8.
- **Default (060)**: two modes, one owner. `LIGHT_MODES` in `lighting.ts` is a pure table of both modes; `lightrig.ts` is the only code that adds or removes a scene's global lights, background and fog, or sets a renderer's tone mapping and exposure. `scene.ts` and `buildCityScene` ask it for night, `streetcam.ts` and the tile view add no light of their own, and a test reads the source to hold this. Two views keep lights of their own: the building gallery (`gallery.ts`) and the tile sheet. A lamp's point light, glow and pool stay with their owner (`scene.ts`) and are switched by one rig flag.
- **Default (060)**: night is today's, value for value: the background, the ambient light, the moon, no tone mapping, no fog, no shadows, and the code-drawn surfaces `GROUND`, `YARD`, `STREET`, `PAVEMENT` and `KERB` (chapter 11). A test holds the three protocol maps' lights, background and every material colour equal to a snapshot taken before the rig existed.
- **Default (060)**: day is a flat sky (no gradient, no fog), a soft sun from the south-east at a fixed elevation (key light, azimuth 135 degrees, elevation 55), a strong even fill (a hemisphere light, no ambient and no moon) so shaded faces keep their detail, and filmic tone mapping at exposure 1, set and restored by the rig. The code-drawn surfaces take their day colours from `LIGHT_MODES` (ground, yard, street, pavement, kerb and 057's grass) and return to night's exactly. The packs' textures are unchanged. In day the lamps' lights are at 0 and their glows, pools and flares are hidden. Values are in the Numbers table.
- **Default (060)**: shadows are off in both modes. The rig has a `shadows` switch, off in both, which a later ticket can turn on for the tile city only.
- **Open (waits for Josh asking for shadows, and a measured draw-call count on the default tile city)**: sun shadows (`&shadows=1`, dev only). They cost about one extra pass over every building and Josh's PC froze under load on 17 Nov 2026, so the opt-in is not built.
- **Default (060)**: switching, all dev only. The URL flag is `light=day` or `light=night` (anything else is ignored). In the tile view the L key and a small "Day / Night" button each flip the mode through the rig; both are removed with the view. The sheet has nothing to flip. The ladder maps have no key or button.
- **Default (060)**: what each view opens in. This replaces 055 Q9's night default for the tile view: Josh asked for day "so it's easy to see".

| View | Opens in |
| --- | --- |
| the tile city (`city=tiles`: overhead, street camera, fallback to overhead) | day; `light=night` opens night |
| the tile sheet (`sheet=1`) | its own lights, the same in both modes |
| a puzzle map, overhead or play | night; `light=day` gives day in a dev build only |
| a ladder map's street camera (`cam=street`) | night; `light=day` gives day in a dev build only |
| the building gallery | its own lights |

- **Info (060)**: the earlier dev-only daylight (055 E) added one hemisphere light to a night scene, owned twice (`tilecity3d.ts` and `streetcam.ts`), and left the sky and the surfaces near black. Its three constants (the street camera's daylight sky, ground and intensity) are retired with it; their rows are gone from the Numbers table.
- **Info (060, 057 D)**: the grass colour (`surfaces.grass` of each light mode, a Numbers row) was held for a drawer. Since 057 D the greens of the block interiors are drawn (19.4): the City Pack's `SM_Env_Grass_01` tiles, sunk 0.11 m so the blades stand a hair over the walk, or, where the piece is absent, flat quads in the mode's grass colour. The tile view brings a material it swaps in later (the pack's tiles arriving) to the mode it is in.
- **Info (060)**: brightness of a rendered frame is not tested headless; the table and the screenshots of 16.8 are the measure.

