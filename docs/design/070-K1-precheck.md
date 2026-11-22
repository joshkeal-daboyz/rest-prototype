# 070 K1 pre-check: the circuit on the 20 named runs

21 Nov 2026, pipeline-designer. Measured on `goal/city-style` at 638b7a2, which has stage 9 (TR1, TR1b) merged. The K1 branch (`ticket/070k1-circuit-design`, d88492b) changes no `src/`, and its base has no stage 9. Not committed. Nothing here is decided until Josh says so in chat.

**This is a sketch.** A throwaway probe, outside the repo, laid CK1 to CK12 as `docs/design/070-K1-circuit.md` words them on a read-only copy of `src/core` and `src/city`. It then measured the clearances against the merged stages 4, 7, 8 and 9, and re-ran stages 8 and 9 with the circuit's poles and lights as their keep points. K2's numbers are the record. Pole picks per pole use `stableHash(pole id) % 5` over 071's five poles. That is an **estimate**: B's `poleAt` is not written yet.

## 1. What holds, and what does not

**It holds, with one exception.** That exception is a stage 9 check, not a K1 rule.

- **The stop signs fail stage 9's merged CL check, on all 20 runs.** Card 2's "margin 0.021 m" was measured from the sign's post, 1.521 m from the nearest pole. TR1's CL (`clearReasons`) measures from the sign's **bounds**, and the 0.77 m board puts its edge **1.438 m** from the pole. That is 0.062 m inside `FURN_KEEP_M` 1.5 m.
  - **Count.** Once stage 6's points are passed, 904 of 1,054 stop signs fail TC5. That is 31 to 72 a run, and stage 9 then fails the run.
  - **Premise.** Card 2 was answered on a margin of +0.021 m. On the merged check the margin is −0.062 m.
- **Every K1 rule holds on all 20 runs:**
  - no crossing fails;
  - no slot is dropped, and no fixed point or crossing pole stands on a forbidden cell;
  - each run's network is one component;
  - every crossing clears 4.2 m;
  - no along span is over 20 m;
  - no drop is over 7.5 m.
- **Reported, not failed (Josh, cards 1 and 2):**
  - drops meeting stage 7 at 5.5 m: 11 to 25 a run;
  - corner spans through stage 7: 0 to 2 a run.
- **The worked map re-measures exactly** on 6 x 6 seed 1. Every node's place is within 0.003 m (rounding), and every drop and span length agrees.

## 2. The rules, measured (20 named runs: 6 x 6 seeds 1 to 10, one-way on and off)

| Rule | Result over the 20 runs | 6 x 6 seed 1 on (K1's sketch) |
| --- | --- | --- |
| CK1, one pole pavement per street | 20/20. Every street has poles on exactly one pavement, and none has none. 109 to 150 poles a run stand on `pavementFlush` cells | 129 (129) |
| CK2, CK3, the slots | 477 to 643 poles a run. 27 to 49 nudged, the longest nudge 5.5 m. 0 dropped. 0 fixed points (end slots, landings) and 0 crossing poles on a forbidden cell | 562 poles; 478 slots, 10 landings, 74 crossing poles; 49 nudged (all the same) |
| CK4, along spans | 5.00 to 18.00 m. 0 over `SPAN_ALONG_MAX_M` 20 m. 0 to 21 a run under 7.5 m, which is 0.37x for `Cables_03`, over 071 B's 0.25x floor | 5.00 to 18.00 (K1: 18.50) |
| CK5, corner spans | 103 to 154 a run, every one 9.55 m. 4.77 m from a signal mast's pole axis at the closest | 126, 9.55 (K1: 5.08 m to the mast) |
| CK6, crossings | 60 to 92 a run: 16.50, 11.50 and 6.50 m. 0 failures. 0 inside a junction square or on a crossing cell | 74: 61 / 10 / 3 (the same) |
| CK7, crossing floor 4.2 m | Lowest 4.36 m (Sci-Fi City at both ends of a 16.5 m crossing) on every run. 0 under 4.2. The estimated mix puts Sci-Fi City at both ends of 6 to 19 crossings a run | 4.36 |
| CK7, walk clearance on along and corner spans (Proposed) | Lowest 4.30 m (an 18 m along span, Sci-Fi City at both ends). 0 under 4.2. The largest height step on one span is 3.52 m (Palm beside Sci-Fi City) | 4.30 |
| CK8, network | 1 component on every run | 1 |
| CK9, drops | 202 to 262 a run, 4.25 to 5.40 m, 0 over 7.5 m. 152 to 215 street-front buildings a run face a non-pole pavement and get none | 250 of 426 (the same) |
| CK10, street lights | 88 to 117 a run, 20 to 50 m apart, 6.5 m from a pole at the closest. 13 to 36 slot positions a run are skipped on a forbidden cell. 0 to 4 far sides a run have no light | **103** (K1: 113; see below) |
| CK12, one-block districts | Every run has blocks with every place kind (up to 14 to 21 switch places a block). 28 blocks over the 20 runs have no switch place. **21 of those have no pole at all**: all four sides face their streets' far pavements, so no feed, drop or lamp. The other 7 are parks with lines but no drop | `block:6:6`: 30 poles + 8 feed places, 19 switch, 15 + 24 lamps (the same) |

- **Street lights, 103 against K1's 113.** The probe skips a light whose slot is on a forbidden cell ("None stands"). K1's sketch seems to have kept 10 more there. That is a reading for K2 and the architect, not a question for Josh: the probe follows the note's words.
- **The 21 blocks with no pole** are not a failure. CK1 and CK2 as approved give them none, and their buildings read as fed from behind, like the 152 to 215 others. A district designer (CK14) simply cannot pick one alone.

## 3. Clearances (CK16), against the merged stages

| Against | Over the 20 runs | Verdict |
| --- | --- | --- |
| Stage 4: build-out trees | Closest to any span 3.25 m, to a crossing 5.00 m. 0 inside the widest canopy radius (1.26 m) | Clear |
| Stage 7: poles and lights in a footprint | 0. But the closest box edge is 0.08 to 0.19 m from a pole: room in practice, not by rule (as K1 said) | Clear, thin |
| Stage 7: along and crossing spans through a box | 0 | Clear |
| Stage 7: corner spans through a box | 35 to 55 a run cross a box in plan, almost all under them. With heights: 0 to 2 a run (6 in all) on the estimated mix, 19 if every pole were Sci-Fi City, 8 all Apocalypse, 0 all Palm | **Reported** (card 1) |
| Stage 7: drops at 5.0 / 5.5 / 6.0 m | 18 to 35 / **11 to 25** / 11 to 25 a run. At 5.5 m: escapes 7 to 19, face novelty signs 3 to 8. On seed 1, 25 (19 + 6), against K1's 24 (18 + 6) | **Reported** (card 1) |
| Stage 8: props within 1.5 m of a pole or light | 36 to 61 a run (24 to 44 of a pole alone): bollards, hydrants, trees, bus stops, meters. **Re-run with keep points: 0 failures.** It places 22 to 53 fewer props a run | Holds (I2's planned re-pin) |
| Stage 8: items over 3.2 m under a span | 17 to 32 pavement trees a run under an along or corner span in plan, 0 to 4 of them reaching the wire on the estimated mix | I2's job (it reads the spans) |
| Stage 9: masts, signal boxes | Mast foot 6.58 m from a stage 6 point, box 6.27 m. An arm is 6.64 m from a crossing and 4.62 m from any span | Clear |
| Stage 9: parking signs | 4 to 15 a run within 1.5 m. With keep points TR1b refuses them (PK), and TC3 still holds: 4 to 14 fewer signs a run | Holds (TR's planned re-pin) |
| **Stage 9: stop signs** | **Board 1.438 m from a pole on every run (post 1.521 m). With keep points, TC5 fails 31 to 72 stop signs a run, 904 in all** | **Fails** |

## 4. Options for the stop signs, measured (20 runs, stages 8 and 9 re-run with keep points)

| Option | Stop-sign margin | TC5 fails | What else moves |
| --- | --- | --- | --- |
| Today: 2.5 m, CL on the sign's bounds | −0.062 m | 904 (20/20 runs fail) | nothing |
| **A. 2.5 m, CL measures a stage 6 point from a sign's post** | +0.021 m (what card 2 showed) | 0 (estimate: no pivot is closer than 1.521 m) | TR1's CL for stage 6 points only. No layout or K1 number moves |
| B. End slots at 2.6 m | +0.038 m | 0 | Corner spans 9.69 m. Along spans down to 3.83 m. Every end slot and the worked map's places move 0.1 m |
| C. End slots at 3.0 m (card 2's alternative) | +0.438 m | 0 | Corner spans 10.25 m. Along spans down to 3.83 m. Stage 8 drops 53 to 92 props a run (against 22 to 53). 6 to 18 parking signs refused a run (against 4 to 14) |

Option A is measured from the pivot distance. It is not a re-run of TR1 with its check changed.

## 5. Recommendation

- **Option A.** It keeps "Keep 2.5 m (Recommended)" and the margin Josh accepted with it, and it moves nothing of K1's.
  - **Cost:** it changes how a merged check (TR1's CL) measures. Only Josh's own words can make that change. TR's digest re-pin, already planned for when the circuit is typed, absorbs it.
- **Everything else stands as answered.**
  - The clashes (cards 1 and 2) stay reported.
  - I2's prop moves and TR1b's refused parking signs are the re-pins K's plan already names.

## 6. Questions for Josh (recommended answer first)

1. **"On the traffic stage's check as merged, the nearest power pole is 1.44 m from a stop sign's board: inside the 1.5 m keep-out, on every city. Earlier I told you 1.52 m, but that was to the sign's post. Fix it by measuring from the post (no pole moves), by moving end poles to 2.6 m, or to 3.0 m?"** **Recommended: measure from the post.** It is the margin you accepted, and nothing in K1 moves. 2.6 m leaves 0.04 m. 3.0 m leaves 0.44 m, but it makes corner turns 10.25 m and moves twice as many pavement props.

## 7. What the orchestrator does for each answer

- **Post.** The architect re-cuts TR so that CL measures a stage 6 point from a grounded sign's post, quoting Josh. That rides on the TR re-pin K already plans, so no merged section re-opens beyond it. K1's note is unchanged. The architect types `CityCircuitLayer`, and K2 is cut.
- **2.6 m or 3.0 m.** Josh's words replace card 2's answer in K1's note.
  - The designer re-lays CK2 and CK5 (9.69 or 10.25 m) and the worked map's places, which all move 0.1 or 0.5 m (the topology is unchanged).
  - The designer re-runs the analyzer.
  - A short re-check of this note's numbers follows, then the typing and K2.
- **In every case:**
  - K2 reads CK10's "none stands" as skip (103 lights on seed 1).
  - I2 moves the tall pavement trees under spans.

## 8. The other cities (best effort, report only)

3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 3, one-way on and off: 26 runs.
- **3 fail before stage 6**, at stage 7's R6 (3 x 3 seed 2 on and off, seed 3 on). This is not tuned, and it is not a question.
- **On the other 23:** 0 crossing failures, 1 component each, along spans 5.00 to 16.75 m, crossings at 4.36 m or more, and stage 8 holds with the keep points.
- **Stop signs:** 9 to 44 a run fail TC5, the same cause.

## 9. The probe

It was a scratch folder under the system temp directory (`k1pre`): a `tsx` script over a copy of `src/core` and `src/city` from 638b7a2, one process at a time. It was deleted after the run. It can be rebuilt from this note and K1's.
