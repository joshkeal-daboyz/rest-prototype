ticket: 081e1-overlay-pure
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081, section E1, round 2, after the re-cut on Josh's answers ("Straight, piece to piece"; "Only when readable"). The glyph drawing moves to `src/render/glyphs.ts` and the 2D view does not change. A pure `src/render3d/overlay.ts` lays out one icon per component. It also lays out each puzzle line as one straight projected segment from its `from` piece to its `to` piece, with no carriers or spans. A damaged cable's break icon sits at the segment's midpoint, only when the fault is readable, and sparks only while live.

## Does the branch do it?
I reviewed the branch at 991db62 against origin/main (merge base 35a0b7a). I ran only the branch's test files: `glyphs.test.ts`, `overlay.test.ts` and `captions.test.ts`. 3 files and 20 tests passed in 1.35 s. The test count against main is 9 added (glyphs 2, overlay 7) plus 1 rewritten (`captions.test.ts`'s ON/OFF drift guard). That is 10, under the cap. The round-2 rewrites keep the count unchanged, as criterion 5 says.

**Round 1's must-fix 1 is done (b3ccf13).** `glyphs.test.ts`'s first case now compares more of the moved glyphs against `createMapRenderer`'s frame for puzzle 64:
- the fuse box, with `NODE_LIVE`/`NODE_DEAD` as the map passes them;
- every switch, with `relay`, `stuck` (relay and dead) and `spring` passed as the map passes them.

It now requires `feed`, `breaker`, `switch`, `relay`, `spring`, `fusebox` and `junction` all to have been seen, and the empty `one.log.length > 5` check is gone. A map renderer that stopped drawing any of those through `glyphs.ts` would now fail. It is still one case.

1. **Glyphs move, 2D unchanged, same call list.** Met. Round 1 checked the move line by line, and nothing in `src/render/` changed since. The two glyph cases stand as above.
2. **`overlayIcons`.** Met, unchanged since round 1. Three cases cover:
   - one icon per component with `nodeLook`'s state;
   - icons behind the camera or off screen are omitted;
   - near pairs are nudged by exactly `OVERLAY_NUDGE`.
3. **State by shape.** Met, unchanged. The test logs call names and arguments, but not property sets.
4. **Hit circle at least `OVERLAY_HIT_PX` at every zoom.** Met, unchanged.
5. **`overlayLines`, re-cut.** Met.
   - **Straight, piece to piece.** `overlayLines` now places only `converted.places[line.from]` and `[line.to]`. `chainPoints` and `polePoint` are gone, so the run's spans, carriers, drops and leads play no part. Test: "one straight segment per line, from piece to piece, away from the feed while live". The fixture puts a carrier pole off-axis (z = 5) on `l_feed`. The test asserts 4 coordinates (the carrier is absent) and that the segment starts at the feed.
   - **Live or dead, with the pulse phase.** The same test checks `live`, `look` and a dead line's look. The phase comes from `motion.ts`'s `pulsePhase(time) / PULSE_SPACING`; the test only bounds it (see Could improve 1).
   - **Break icon at the midpoint, only when readable, sparking only while live.** The fault loop now skips any fault not in `state.readableFaults` (a set of fault ids, `src/grid/types.ts:11`). The cut is the projection of the segment's world midpoint. Test: "a damaged cable's break icon sits at the midpoint, only when readable, ...":
     - idle `l_b` gives `cut === null`;
     - after `throwSwitch("sw_1")` it is present and `sparking: true`;
     - it sits at the midpoint of the line's two screen points, to 5 places. The fixture's projection is affine, so the projected world midpoint and the screen midpoint agree.

     This is the GDD rule as implemented, not approximated: readable means current reaches it.
   - **Brownout flicker for every line.** Unchanged. Every line's flicker is in [0.15, 1], and at least one is below 1.

**Purity and files.** `overlay.ts` still imports only types from `core`, `grid` and `render/glyphs`, plus `render/motion` and `./look`. It has no three, no DOM and no timers. `src/grid/` and `src/night/` are untouched, and there is no new dependency. Round 2 touched only `overlay.ts`, `overlay.test.ts` and `glyphs.test.ts`. The `tickets/` and `reviews/` lines in the diff come from merging the parent `ticket/081-puzzles-on-the-city`, not from the builder.

**For the 3D game.** No `src/grid/` or `src/night/` change. The overlay reads `GridState` only.

## Rule conflicts and risks
- Round 1's risk (an always-present cut) is resolved for the overlay by Josh's "Only when readable". The 3D prop's readability is open question 3 in the ticket, for K3, and is outside E1.
- An icon on a pole still sits at a fixed `OVERLAY_POLE_Y_M` of 7 m, and its lines now end there too. Because the line is straight piece to piece, it is not meant to follow the drawn wire, so this matters less than in round 1. E2 may still want the pole's real attachment height. Not checked in a view.

## Must fix
none

## Could improve
1. `overlay.test.ts`: assert `feed.phase` equals `pulsePhase(0.4) / PULSE_SPACING`, so "the 2D map's pulse phase" is tested and not only bounded.
2. `overlay.test.ts`, break-icon case: in the idle state `l_b` is both dead and unreadable. A version that showed the cut only while live, instead of when readable, would pass. If the fixture has a damaged cable that is readable while dead, or a `{ ...state, readableFaults: new Set() }` variant on the live state, use it to separate the two conditions in the same case.
3. These carry over from round 1 and are optional:
   - `GlyphSpec` cannot express a relay mark, a stuck bar, a spring coil or a battery's released or flat state, so those shape cues are lost on the city;
   - `overlayHit` is E2's work and is untested here;
   - record that the 2D lamp and battery glyphs were not moved (the overlay draws its own).
