ticket: 081e1-overlay-pure
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Ticket 081, section E1. Move the 2D map's node glyph drawing into `src/render/glyphs.ts` without changing the 2D view, and add a pure `src/render3d/overlay.ts`. From a converted city puzzle, its grid state and a projection passed in, the overlay lays out one icon per component and one projected polyline per line (live or dead, pulse phase, cut point, brownout flicker). The signatures as built, `overlayIcons/overlayLines(converted, state, project, ctx)`, stand per the ticket's Interfaces note (e02eb05).

## Does the branch do it?
Gate on the branch (`npm run gate`, worktree D:\rest-081e1 at fa759df): typecheck clean, 9 files and 129 tests passed. The diff adds 9 test cases (glyphs 2, overlay 7) and rewrites 1 (`captions.test.ts`'s ON/OFF drift guard now reads `glyphs.ts`). That is 10 against main, under the cap.

1. **Glyphs move, 2D unchanged, same call list.** Partly met.
   - I read the `map-renderer.ts` diff line by line. The feed, breaker, switch, fuse-box body, junction, `drawX` and `drawRibbon` bodies moved verbatim, and the style set-up before them is unchanged. For the switch, the twang maths now runs before the first draw call, but it is pure arithmetic. For the fuse box, `nodeOutline(i, live)` is now computed even when broken; it is pure. No existing `src/render/` test is edited.
   - The test, `glyphs.test.ts` "the map renderer's frame holds each glyph's calls, in the same order", compares only the feed, breaker, plain switch and (only when no fault is readable) junction against `createMapRenderer`'s frame. Puzzle 64 has 2 fuse boxes, 1 relay switch and 1 spring switch (I counted the file's nodes). The loop `continue`s past all of them.
   - The fuse box is then only checked for `one.log.length > 5`, which asserts nothing about the map renderer. A map renderer that stopped calling `drawFuseBoxGlyph`, or called it with the wrong outline, would still pass. So the criterion's "the call list is the same" (071 E: "draws each type and state ... the same calls, in the same order") is not covered for three moved glyph paths. See Must fix 1.
   - The 2D lamp and battery are not moved. `drawLamp` stays in `map-renderer.ts`, and `drawLampGlyph`/`drawBatteryGlyph` are new, simpler glyphs used only by the overlay. The 2D lamp is load-dependent (1 to 3 bulbs) and tied to the Relight and flare, so I accept this. It does mean the overlay's lamp does not match the 2D lamp, as 071 E's "node, lamp and ribbon glyph drawing" intended. See Could improve 3.
2. **`overlayIcons`.** Met.
   - "one icon per component, carrying the state look.ts gives" checks the ids in file order, `look` equal to `nodeLook`, and a thrown switch's `spec.selected`.
   - "omits icons behind the camera or off screen" covers both paths.
   - "nudges a near pair by OVERLAY_NUDGE and drops neither" checks the exact distance, 2 + `OVERLAY_NUDGE`.
3. **State by shape.** Met. "shows state by shape" logs call names and arguments only, with property sets not recorded, so colour changes alone cannot make the strings differ. It covers breaker open/closed, switch output, fuse intact/blown, lamp lit/dark and target.
4. **Hit circle ≥ 44 px at every zoom.** Met. `hit = max(size, OVERLAY_HIT_PX)`, and the test is "a hit circle is at least OVERLAY_HIT_PX across at every zoom", over `pxPerMetre` 0 to 400.
5. **`overlayLines`.** Met, with weak assertions in two places.
   - The polyline through span ends with the carrier, ordered from the feed while live, is checked: 6 coordinates, start x less than end x.
   - Sparking only while live is checked on `l_b` before and after `throwSwitch("sw_1")`.
   - Brownout flicker is checked by every flicker in [0.15, 1] and at least one below 1.
   - Phase is only checked to lie in [0, 1), not to equal the 2D map's `pulsePhase(t) / PULSE_SPACING`. The code does use `motion.ts`'s `pulsePhase` and `flicker`. See Could improve 1.

Purity: `overlay.ts` imports only types from `src/core`, `src/grid` and `render/glyphs`, plus `render/motion` and `./look`. It has no three, no DOM and no timers. `src/grid/` and `src/night/` are untouched. There is no new dependency.

## Rule conflicts and risks
- **Readable means current reaches it.** `overlayLines` returns a `cut` point for every `damaged-cable` fault in `state.faults`, readable or not. Its own test pins this: `l_b`'s cut exists with `sparking: false` in the idle state. The 2D map draws no break mark on a dead damaged cable; `drawLine` returns early when the line is unpowered, and the gap mark is drawn only inside the `sparking` branch. If E2 draws `cut` whenever it is non-null, the overlay shows a fault the 2D map hides. That would break the GDD rule. E1's criterion wording ("a damaged span's cut point, sparking only while live") and K3's "a damaged span is cut" both seem to accept an always-visible cut, so I do not hold this against E1. It is a design question for the main session to put to Josh before E2 and K3.
- `captions.test.ts` (`src/render3d/`) is edited and is not in E1's file list. The edit was forced, because the `"ON" : "OFF"` literal moved with the breaker glyph. It is inside an allowed folder and is one rewritten case. It should be named in the builder's report.
- Every pole end and pole-placed icon sits at a fixed `OVERLAY_POLE_Y_M` of 7 m, not at the pole's real attachment height (PK1 put the heights in `src/core/`). On tall or short poles the lines and icons will float off the drawn wire by a few metres. This may matter for E2; I did not check it in a view.

## Must fix
1. **`src/render/glyphs.test.ts`, first case:** extend the comparison against the map renderer's frame to the moved paths it skips now:
   - the fuse box: intact, with the outline the map passes, which at puzzle start is `NODE_LIVE` or `NODE_DEAD`;
   - the relay switch (`relay: true`, stuck when dead);
   - the spring switch at rest (twang offset 0 at t = 1.2 with no twang started).

   Then require `seen` to hold every moved type and variant present on puzzle 64, not just feed and breaker. Drop the `one.log.length > 5` line. Expected effect: the case fails if `map-renderer.ts` stops drawing any moved glyph through `glyphs.ts`, or draws one with different calls, which is what criterion 1 asks. It stays one case.

## Could improve
1. `overlay.test.ts`:
   - assert `feed.phase` equals `pulsePhase(0.4) / PULSE_SPACING`, so "the 2D map's pulse phase" is tested and not just bounded;
   - in the brownout check, assert every line's flicker equals `flicker(time, i)`, so a version that flickered only live lines would fail.
2. Give `OverlayCut` a `readable` flag, or return `cut` only for a readable fault (`state.readableFaults.has(f.id)`), so E2 cannot show an unreadable break by mistake. This waits on Josh's answer to the risk above.
3. Record in the builder's report or the ticket that the 2D lamp and battery glyphs were not moved, and that the overlay draws its own (`drawLampGlyph`, `drawBatteryGlyph`).
4. `drawNodeGlyph`'s switch passes `relay`, `spring` and `stuck` as false, and `GlyphSpec` has no field for them. On the city a relay's mark, its stuck bar and a spring's coil, all shape cues the 2D map has, are lost. A battery's released or flat state is also not shown. Consider adding them before E2.
5. Read pole attachment heights from core (PK1) in `placePoint` and `polePoint`, instead of the fixed 7 m and 3 m.
6. `overlayHit` is beyond E1's criteria; it is E2's `hitTest` work. It is harmless, but untested here.
