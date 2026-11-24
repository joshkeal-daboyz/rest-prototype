# 081 K2ep · Pre-check of K2e (every building wired, drops in CK17d)

24 Nov 2026, pipeline-designer. Measured on `ticket/081-puzzles-on-the-city` at 3527bf2, 6 x 6 one-way on, seeds 1, 2, 3 and 8 (the four pin cities). Not committed. Nothing here is decided until Josh says so in chat.

**This is a sketch.** A throwaway probe outside the repo built each city through stage 9 with the merged code (read only), laid K2e's drops as criteria 1 and 3 word them, and judged every offered roof span place against every drop (criterion 4). The fits are B1q's heuristic search (`fit2.ts`, any node on roofs, clear mid-row places, neighbouring roofs), ported to the merged layer. It is not P1: "fits" means a fit was found within its step budget. The builder's numbers are the record.

## 1. Verdict: holds, with one wording fix for the architect

| K2ep asks | Seed 1 | Seeds 1, 2, 3, 8 |
| --- | --- | --- |
| New drops (note: 176 to 199) | 176 (50 own crossing pole, 126 across) | 176 to 199 |
| Buildings with a street front and no drop (note: 0) | 0 | 0 |
| Longest across (note: 23.03 m) | 23.03 m | 23.03 m |
| Lowest drop point (note: 4.82 m) | 4.818 m | 4.818 m on all four |
| Drops over junction cells | 2 | 1 to 4 |
| Roof span places refused (drop's own pole exempt) | **6 of 3,812** | **4 to 18** (0.1 to 0.4%) |
| ... by `over` | 6 street | all `street`; 0 pavement, 0 junction |
| ... from today's drops alone | 0 | 0 |
| Pilot puzzles on 1 block (B1q: 15 of 16) | 15 of 16, as before | 15 of 16 on each city |
| A pilot fit that used a refused span | none | none |

- **The fits do not need a refused span.** At B1q's 4,000 steps, no fit found before K2e on any of the four cities uses a refused place. Re-run at 20,000 steps, seed 1's first fit for 12 used 1. With that place refused, the search found another fit for 12 on 1 block. After K2e, all 15 still fit on 1 block. 15 still fails CK14 (2 lines on a feed), as in B1q.
- **The closest refused gaps are touching:** 0.03 to 0.15 m, the smallest on each city.
- **For information only** (not the record; nothing tuned to it), 070's 6 x 4 seeds 1 to 3: 0 left over, 2 to 8 places refused, all `street`. The 3 x 3 cities did not build under this profile (R6 fails before stage 6), so they were not measured.

**The wording fix (the architect's, not Josh's).** Criterion 4 says "within 1.0 m of **any** drop's curve". Read literally, it refuses every roof span that ends on a pole with a drop, because the two wires meet at that pole:

| Reading of criterion 4 | Places refused, four cities | Seed 1 usable places (clear mid-row) | Pilot on 1 block, seed 1 |
| --- | --- | --- | --- |
| **A drop from the span's own end pole is exempt** (as `judgeSpan` already exempts its own poles' spans and marks) | 4 to 18 | 1,765 of 1,769 | 15 of 16 |
| Literal: any drop | 1,556 to 1,760 (about 40%; 1,022 to 1,067 `pavement`) | 899 of 1,769 | 14 (12 needs 2 blocks at 4,000 steps; 1 block at 20,000) |

The architect means the first (the note measured "3 to 10 near-touches a city"). Criterion 4 should say so.

## 2. The drop's pole end: axis or insulator

Stage 6 judges a drop from the pole's axis at its lowest attachment. K3b draws it from the nearest `ownInsulator` attachment, up to 0.9 m off the axis.

| City | Refused, axis | Refused, insulator | Only the insulator refuses | Only the axis refuses | Pilot fits hit |
| --- | --- | --- | --- | --- | --- |
| 1 | 6 | 7 | 1 | 0 | 0 |
| 2 | 18 | 19 | 1 | 0 | 0 |
| 3 | 10 | 15 | 5 | 0 | 0 |
| 8 | 4 | 5 | 1 | 0 | 0 |

**Yes, they differ, on 1 to 5 places a city.** Judged on the axis, those places stay offered, and K3b would draw the drop within 1 m of the span. It shows only in a job that uses that span (roof spans are drawn only when used). No pilot fit uses one. This is the architect's reading to settle: keep the axis, as criterion 4 is worded, or judge on the insulator point K3b will use.

## 3. Recommendation

Build K2e as cut. The architect adds "except a drop hung from one of the span's own end poles" to criterion 4.

What it costs:
- **No ruling, threshold or approved number moves.** `ROOF_CLEAR_M` 1.0 is B1b's.
- **No merged section re-opens.** The 4 to 18 places refused a city are all `street` spans.
- **The pins are criterion 5's, as already cut:** stage 6's `9ff1b134` and the three era pins.

## 4. Questions for Josh

None. The two open points are readings for the architect: the own-pole exemption, and axis or insulator.

## 5. What the orchestrator does

- The lead-architect adds the own-pole exemption to K2e criterion 4. It also says which pole end (axis or insulator) the 1 m is judged from. If it picks the insulator, that is K3b criterion 1's point: from `GROUND_POLE_ATTACH_UP_M` and a model offset, with no `src/render3d` import into `src/city`.
- K2e's builder then starts as cut. Its criterion 7 report should show "roof span places no longer offered" at 6 on seed 1 (sketch figure, not tuned to).
- No section re-opens.

## 6. The probe

`C:\Users\Josh\AppData\Local\Temp\k2eprobe\`: a copy of `src/` from 3527bf2, with `node_modules` linked to the repo.
- `src/city/k2elay.ts`: K2e's drops, the curves, the gaps, and the axis or insulator end.
- `src/city/k2efit.ts`: B1q's fit, ported. `k2eb1q.ts`: B1q's neighbour and keep-square helpers.
- `src/city/k2e.probe.test.ts`: the driver. Outputs `pins.json`, `fit-all.json` and `c64.json`; `sum.cjs` summarises the fits.
- To re-run: `SEEDS=1,2,3,8 FIT=1 OUT=fit-all.json npx vitest run --maxWorkers=2 src/city/k2e.probe.test.ts`. `BUDGET=` and `ONLY=` set the fit's steps and its puzzles; `SIZE=6x4` for 070's cities.

Nothing of it is in the repo.
