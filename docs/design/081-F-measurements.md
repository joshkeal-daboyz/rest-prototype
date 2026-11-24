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
