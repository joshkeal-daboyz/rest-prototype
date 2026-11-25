# 081 F: measurements on Josh's PC

Taken by the main session in the browser pane, 24 Nov 2026, 6 x 6 seed 1, `?puzzle=city-two-ways-round&perf=1`, F0's branch (f96dde2), before power, median over 300 frames.

## M1 (before F1a)

| Run | Canvas | Pixel ratio | Draw calls | Triangles | CPU median | Whole frame |
|---|---|---|---|---|---|---|
| default | 775 x 1765 | 1.5 | 4,124 | 6,889,968 | 24.40 ms | 25.00 ms |
| `dpr=1` (not applied: still 1.5) | 1930 x 1767 | 1.5 | 4,538 | 7,220,660 | 25.10 ms | 25.60 ms |

Families, default run (calls/triangles): building pieces 3,987/3,163,075; dressing 56/2,081,204; circuit 23/756,032; street tiles 18/485,939; furniture+traffic 26/282,650; interior 4/96,536; other 17/289; live layer 3/4,968; lit shop glass 1/50.

Reading: building pieces are 97% of the draw calls. The frame barely moves with 2.5 times the pixels, so it is bound by draw calls, not fill rate. F1a is the fix. F-Q2 (pixel ratio) does not arise. The after-Relight run was not taken.

## F1a's criterion 4 (PR #58, 394ae3d), before power

Taken by the main session in the browser pane, 24 Nov 2026, with the pane in view, 6 x 6 seed 1, `?puzzle=city-two-ways-round&perf=1`, median over 300 frames, pixel ratio 1.5.

| View | Canvas | Draw calls | Building pieces (calls/triangles) | Triangles | CPU median | Whole frame |
|---|---|---|---|---|---|---|
| District (the pane's own size, as M1) | 775 x 1765 | 1,676 | 1,539/3,447,475 | 7,174,368 | 10.50 ms | 16.70 ms |
| 1280 x 800 | 1920 x 1200 | 2,853 | 2,710/5,959,216 | 9,689,227 | 13.70 ms | 16.70 ms |

Reading:
- Against M1, the district's building-piece calls fall from 3,987 to 1,539 and its CPU median from 24.40 ms to 10.50 ms. The whole frame is at the 60 fps vsync (16.70 ms).
- The 1280 x 800 view was 48.10 ms (L2's branch, before F0) and is now 13.70 ms.
- Building pieces are still about 92% of calls. Grouping by colourway and sub-mesh keeps the instancer count in the thousands, not the hundreds the goal named.
- A run taken while the pane was hidden read 33.30 ms whole frame, which was background throttling. It is not counted.
- After the Relight is F1b's row (M2): the lamp buildings are still clones here.

## M2 (F1b, PR #59, c069a64): counts

Taken by the main session in the browser pane, 24 Nov 2026, 6 x 6 seed 1, `?puzzle=city-two-ways-round&perf=1`. The Relight was played in the pane: throw `sw`, then repair `l_e2`.

| Run | Canvas | Pixel ratio | Draw calls | Building pieces (calls) | Programs | CPU median | Whole frame |
|---|---|---|---|---|---|---|---|
| District, before power | 1176 x 1076 | 1 | 1,855 | 1,714 | 11 | 8.70 ms | (throttled) |
| District, after the Relight | 1176 x 1076 | 1 | 1,855 | 1,714 | 11 | 8.70 ms | (throttled) |

Reading:
- Criterion 3 holds. No new program, and the draw calls are the same after the Relight, where L1's clones made them rise from 216 to 906.
- These were taken while this session was not open in a window, so the pane ran as a background page (pixel ratio 1, whole frame 66.70 ms). The CPU and whole-frame medians against the 16.7 ms bar still need a run with the pane in view.

## M2 (F1b): timing in view

Taken by the main session in the browser pane with it in view, 24 Nov 2026, F1b's branch (23a5792), before power.

| Run | Canvas | Pixel ratio | Draw calls | Building pieces (calls) | Programs | CPU median | Whole frame |
|---|---|---|---|---|---|---|---|
| District, before power | 1930 x 1767 | 1.5 | 1,775 | 1,634 | 11 | 14.40 ms | 16.80 ms |

- The bar is met before power: the CPU median is under 16.7 ms, and the whole frame sits at the 60 Hz vsync.
- After the Relight, the only reading is the throttled one above (1,855 calls, 11 programs, the same as before power). Josh played the Relight ("Played it, merge"), but no in-view after-Relight line was logged.
- Draw calls do not change after the Relight, so its cost should match before power. That is inferred, not measured.
- F2 is not called for while the district view is under the bar.

## L2 criterion 3: the street-light budget (PR #60, 71649e0)

Taken by the main session in the browser pane, in view at 60 fps, 24 Nov 2026. 6 x 6 seed 1, `?puzzle=city-two-ways-round&perf=1`, the default camera, canvas 1930 x 1767 at pixel ratio 1.5, a fresh load per run. The Relight was played each time (throw `sw`, repair `l_e2`).

| Run | Draw calls | Programs | CPU median, before power | CPU median, after the Relight | Whole frame, after the Relight |
|---|---|---|---|---|---|
| P0 as it is (3 lights) | 1,775 | 11 | 8.50 ms | 8.20 ms | 16.60 ms |
| `lights=10` | 1,775 | 11 | 8.10 ms | 8.30 ms | 16.70 ms |
| `lights=25` | 1,775 | 11 | 7.90 ms | 8.10 ms | 16.70 ms |
| `lights=32` | 1,775 | 11 | 8.30 ms | 8.30 ms | 16.70 ms |

- The shaders were read from the GL context. They carry `pointLights[ 25 ]` and `pointLights[ 32 ]` in those runs, so the lights are real.
- No run adds a draw call or a program. The worst after-Relight median is 0.1 ms over P0's, inside every row's budget, and the 60 fps vsync holds.
- On the comparison baseline: F1b's in-view before-power median was 14.40 ms on the same canvas, but these runs are 7.9 to 8.5 ms, which is the spread between sessions on this PC. P0's own row is used as the baseline.
- By the stop rule, `STREET_LIGHTS_MAX` goes to 32.

## FX2, criterion 7 (24 Nov 2026, Josh's PC, in view)

Browser pane, `?puzzle=city-two-ways-round&perf=1`, 6x6 seed 1, default camera, fresh load per run, one session. Canvas 1930 x 1767, pixel ratio 1.5. Josh played each run (throw, repair, Relight), so the "after the Relight" lines are the as-played comparison. Textures were the drawn fallbacks (the game pack has no `fx/` until FX1 merges and `assets:game` is re-run); the pack meshes came from the full packs.

| Run | Draw calls | Programs | CPU median | Whole frame |
| --- | --- | --- | --- | --- |
| `fx=0`, after the Relight | 1,774 | 11 | 8.00 ms | 16.70 ms |
| `fx=all` (69 particles), after the Relight | 1,778 | 12 | 7.90 ms | 16.70 ms |
| `fx=0`, before power (earlier load) | 1,773 | 11 | 8.30 ms | 16.70 ms |

Pass: under 1.5 ms added (none measurable), under 16.7 ms, 4 more draw calls (cap 5), and the one extra program is the effects material, compiled on the first frame.

## FX2 amended (extreme sparks), criterion 7 (24 Nov 2026, Josh's PC, in view)

Same setup as above. The game pack now holds the four FX textures and both pack meshes (`assets:game` re-run on e32bc63); no fallback line was logged. Before power, default camera, nobody touching the page.

| Run | Draw calls | Programs | CPU median | Whole frame |
| --- | --- | --- | --- | --- |
| `fx=0` | 1,774 | 11 | 8.20 ms | 16.70 ms |
| `fx=all` (845 alive; peaks sparkle 474, spark 731, shard 126, soft spot 13, smoke 8) | 1,780 | 12 | 8.10 ms | 16.60 ms |

Pass: no measurable time added (limit 1.5 ms), under 16.7 ms, 6 more draw calls (cap 6), and the one extra program is the effects material.

### FX2 amended, criterion 7 completed (review round 2's must-fix), 24 Nov 2026

At the puzzle's framing (pane emulated at 1287 x 1178 so the opening camera matches the runs above: canvas 1930 x 1767, pixel ratio 1.5, 1,774 draw calls with effects off). Josh played every run (throw `sw`, repair the break, camera not moved). Josh, on a card: "Measure at puzzle view"; in chat: "The end user shouldn't be zooming out this much" (the whole-city view on a small pane is not measured).

| Run | Draw calls | Programs | CPU before power | CPU after the Relight | Whole frame | Particles (peak spark) |
| --- | --- | --- | --- | --- | --- | --- |
| `fx=0` | 1,774 | 11 | 10.50 ms | 10.30 ms | 16.70 ms | 0 |
| normal play (effects on) | 1,778 | 12 | 8.80 ms | 8.30 ms | 16.70 ms | 352 (429) |
| `fx=all` (measure only) | 1,779 | 12 | 8.70 ms | 8.90 ms | 16.70 ms | 784 (752) |

The `fx=0` run was taken while an architect agent was working, so its CPU median sits about 2 ms high; the effect runs are under it, not over. The program count holds at 12 from the first frame after the models load to the end of the Relight in both effect runs (no new program). Pass: no time added beyond noise (limit 1.5 ms), under 16.7 ms, at most 5 more draw calls (cap 6).

## E5, criterion 5 (24 Nov 2026, Josh's PC, in view)

`?puzzle=city-two-ways-round&perf=1`, 6x6 seed 1, before power, effects on (normal play), fresh load per run. `main` at ca712dc (D:\rest-main-play, port 5210), the branch at its head (D:\rest-081e5, port 5185). Pane sizes emulated.

| Pane | Build | View | Draw calls | Triangles | CPU median | Canvas |
| --- | --- | --- | --- | --- | --- | --- |
| 800 x 570 | main | opening | 3,465 | 11.07 M | 14.0 ms | 1200 x 855 |
| 800 x 570 | branch | opening = furthest (wheel and `-` do not move it: held at the limit) | 2,530 | 9.08 M | 13.2 / 11.4 / 11.3 ms (three loads) | 1200 x 855 |
| 708 x 505 (the pane's own size) | branch | opening | 2,525 | 9.06 M | 12.5 ms | 1062 x 757 |
| 1287 x 1178 | branch | opening | 1,779 | 7.49 M | 8.2 ms | 1930 x 1767 |

At 1287 x 1178 the branch opens exactly where main does (main 1,774 with effects off, plus FX2's 5). Its furthest zoom-out there looks the same as main's by eye (1.5 x D0 against main's 1.6 x the opening); perf=1 logs only the first 300 frames after load, so no number is taken at that zoom. At 800 x 570 the small-pane opening falls from main's 3,465 to 2,530 draw calls. That is still above the desktop's 1,779, because the wider aspect shows more city side to side at the limit distance. No branch number is higher than main's at the same size.

E5 review round 1, must-fix 2 (furthest zoom-out timings on both builds): waived by Josh, 24 Nov 2026, on a card: "Waive it (Recommended)". The opening rows above and the by-eye check at the furthest zoom-out stand.

## L3, criterion 3 (24 Nov 2026, Josh's PC, in view)

`?puzzle=city-two-ways-round&perf=1`, 6x6 seed 1, before power, pane emulated at 1287 x 1178 (canvas 1930 x 1767, pixel ratio 1.5), two fresh loads each, alternating. `main` at d9b3740 (D:\rest-main-play), the branch at 2a8e7a0.

| Build | Draw calls | Programs | CPU median (two loads) | Whole frame |
| --- | --- | --- | --- | --- |
| main | 1,778 | 12 | 9.3, 9.8 ms | 16.70 ms |
| L3 | 1,778 | 12 | 10.3, 8.4 ms | 16.70 ms |

Pass: no draw call and no program added; the CPU medians overlap within the run-to-run noise (about 1 to 2 ms).

## S4, criterion 4 (25 Nov 2026, Josh's PC, in view)

Browser pane emulated at 1287 x 1178, `?puzzle=city-two-ways-round&perf=1`, branch `ticket/081s4-scenery-live` (PR #70). Canvas 1930 x 1767, pixel ratio 1.5, fx on.

| Run | Draw calls | Programs | CPU median, before power | Whole frame, before power |
|---|---|---|---|---|
| S4, before power | 1,779 | 12 | 8.50 ms | 16.60 ms |

The draw calls and programs match main's (1,779 and 12 with FX2), so S4 adds no draw call or program before power. Josh played the run and judged the look ("Played it, looks right"), but the perf=1 tab closed before the after-Relight line was read. Josh, on a card: "Skip it". The after-Relight budget is taken from these numbers and the reviewer's structural read (the instancers are only sized larger at build; the street lights stay at `STREET_LIGHTS_MAX` = 32); it was not measured.
