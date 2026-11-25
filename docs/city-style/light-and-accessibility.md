# City style: Light and accessibility

standard: yes
Scope: lit places, power lines, the night palette and the accessibility rule.
Read by: renderer
Depends on: `docs/city-style/numbers.md` (the constants and colours), `docs/city-style/scale-and-lots.md` (the place model's scale), `docs/city-style/testing-daylight.md` (the dev-only day mode)

## Rules

## 8. Lit places

- Today a place (what a lamp lights) is a warm box in the place's size (PLACE_SIZES, each PLACE_STOREYS storeys), placed before the ordinary lots, within PLACE_REACH of its lamp and nearer it than any other lamp. A place that finds no room is a pool of light on the lamp's lane. A streetlight is always a pool.
- **Default [D-041a]**: a place, but not an ordinary lot, may also front either side of a service run. A gate's posts may both stand on the free side of the wire if one on each side fails.
- **Rule [D-042h]**: lit places become real buildings.


## 9. Power lines

- **Rule [D-041b]**: lines are wooden poles of one style on the pavement, each carrying three conductors on a cross-arm.
- **Default (041)**: poles are spaced at most POLE_SPACING apart, evenly along a run. Three conductors sit at minus PHASE_OFFSET, 0 and plus PHASE_OFFSET along the cross-arm, which runs across the run, at `POLE_HEIGHT`. A run with no intermediate pole draws one conductor.
- **Default (041)**: sag is SAG_RATIO of the span, and a conductor's radius is WIRE_RADIUS.
- **Default (041)**: insulators, transformer cans and service drops are code-drawn (neither pack had them). An insulator sits under each conductor on every intermediate pole. A can hangs CAN_OFFSET from its pole's axis, toward the pole's first drop, and CAN_DROP under the wire's height. A pole carries a can only if it has a drop.
- **Default (041)**: a service drop goes from an intermediate pole to a building (not a place) whose front is within DROP_REACH of it. It leaves the pole DROP_DROP under the wire's height and lands DROP_END_Y high on the building's front (two thirds of the building's height if that is lower). Drops are thin, always dull, never pick targets, and are scenery.
- **Rule [D-042i]**: the cut on a damaged cable and the Relight keep their looks. The cut cuts all three conductors in the same span, their ends hang by HANG_DROP, and the gap is BREAK_GAP wide. Every ticket that touches the town keeps live.test.ts, `relight3d.test.ts` and the break and conductor tests passing unchanged.
- **Default (041)**: clicking any of the three conductors picks the line (`WIRE_PICK_RADIUS`). Node priority is unchanged.
- **Default (042)**: conductors stay code-generated. Packs supply pole, arm, insulator and can hardware only. Pack line meshes (`*_Lines_*`, `*_Preset_*`) are never used.
- Today the pole is `SM_Prop_Powerpole_01` and the lamp post `SM_Prop_LightPole_01`, both from `apocalypse-power`.


## 11. Palette and light

- It is a night scene. The values are in the Numbers table (colours as `0x` hex, pinned exactly). The scene's background and ambient light are in `LIGHT_MODES.night` (`lighting.ts`, section 16.12), and the table's last section pins their source text there too. The night sky, the stars and the moon (with the moon light's colour, strength and direction) are in the NIGHT_SKY block (`nightsky.ts`, ticket 081 section SK), tuned by eye and not pinned.
- **Default (060)**: the testing daylight of 16.12 is a dev tool and not part of the game's look: the game is night, and no player toggle ships.
- Ground colours: `GROUND` (the town's dark edge), `YARD` (open ground inside a block, a little lighter), `STREET` (asphalt), `PAVEMENT` (mid-grey, lighter than the asphalt), `KERB` (the pale lip) and CENTRE_LINE.
- Pole and hardware colours: POLE_WOOD, FOOT, METAL, INSULATOR, CAN and DROP_COLOR.
- Wire looks: LIVE_WIRE (with LIVE_GLOW), DEAD_WIRE and REPAIRED_WIRE (a mended cable that is not live: 2D's new cable). DEAD_WIRE and REPAIRED_WIRE match 2D's colours, and live.test.ts holds a drift guard for the repaired one. SCORCH is a blown fuse or a faulted body. RIBBON marks a fault.
- Light: WARM is a lit place's and lamp's glow, TARGET the target lamp's. PLACE is an unlit place box.
- **Default (041)**: placeholder walls use four dark tints (`TINTS`), and the roof is `ROOF_SHADE` of the wall, so a town of boxes stays dark. A storey is `STOREY_M`; a flat roof's parapet is `CAP_M`, a pitched roof rises `PITCH_M`.


## 12. Accessibility

- **Rule [D-037a]**: state never reads by colour alone. Every new look must meet this, and its ticket must test it.
- **Rule [D-037b]**: a live wire differs from a dead one by more than colour. A live wire is brighter, glows and breathes, and carries a bead that moves away from the feed. A dead wire is dull and still. A damaged cable shows a visible break and a spark. All three conductors of a line share the line's look.
- **Rule [D-037c]**: a lit lamp has a light pool and a halo, and flickers in a brownout. Breakers and switches read by lever shape and position (a breaker's lever is up when closed and flat or dropped when open; a switch's points down the selected line, with a chevron). The target star is filled or hollow. The fuse reads by its bar as well as its caption tone.
- **Rule [D-037d]**: poles are painted at least 3:1 in luminance against the street (POLE_WOOD against `STREET`), so they read by brightness. The drift test repeats this check on the pinned colours.
- The tests that enforce it are in scene.test.ts (lamps and brownout; breaker, switch and fuse bar; poles 3:1), live.test.ts (breaker, lamp, fuse and damaged-cable looks; the line's look on all three conductors, which checks the bead and breathing), and `look.test.ts` (looks from state).

## Open questions

- **Open**: a place is a model chosen by kind from `PLACE_MODELS`, fitted inside its box at a scale between `PLACE_MIN_SCALE` and 1 times `WORLD_PER_METRE`, warmed by an emissive tint over its own texture (`PLACE_GLOW_MAX` times the place's glow), on its own material clones. With no model that fits, the warm box stays. Waits for: the build of the place-model ticket, which is approved and not built.
- **Open**: landmark buildings (a church, a bell tower, an inn) for sacred and hall places. Waits for: a landmark pack.
- **Open**: pack pole hardware. PHASE_OFFSET follows a pack arm's insulator tops if they differ, and `WIRE_PICK_RADIUS` is re-checked. Waits for: a power pack.
- **Open**: a pack model or hardware must keep the looks of chapter 12. A lit place model still warms by emission over its own texture and keeps its pool and star. Waits for: the pack adoptions of the place-model and pack-hardware tickets.
