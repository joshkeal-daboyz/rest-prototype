# 070 pre-check: the pipeline as built, on the 6 x 6 named cities

Pipeline designer, 20 Nov 2026, on `ticket/070a4-split-plan` at e9de2a1 (A4, A4b, A4c, B3 and C3 merged; D1b not built). This is a sketch probe. The builders' numbers are the record. Nothing here is decided.

**Josh's answers this rests on** (top of `070-A4-precheck-2.md`):

- Named cities: "6x6". Default 6 x 6 seed 1: "yes". Read as 6 x 6 seeds 1 to 10. 3 x 3 and 6 x 4 become outside cities: reported, not required.
- No lever K. Lever M (the first pass as a best fit over the city): "yes".

**What was run.**

- Stages 1 to 3 are the branch's own code (S1 to S11, S6, the served park, side-list lookups, T floor 0.30).
- Edge is D1b as cut, sketched: bands from the sides; P3's cap over the whole block side; P1's floor 0.69; lever M.
- Each city was run with one-way off (`oneWayShare` 0) and on (0.4, as built).

## 0. Verdict: does not hold yet. 16 of 20 named runs pass

| | One-way off | One-way on |
| --- | --- | --- |
| Named runs passing every check | **9 / 10** (6 x 6 s7: P1) | **7 / 10** (s2: stage 1; s3, s8: P1) |
| Stage 1 draw (of 64), highest | 11 | 40 (s6); s2 finds none |
| T share (floor 0.30), lowest | 0.438 | 0.333 (s4) |
| Park places (have / need), tightest | 6 / 6 (s4, s5, s6, s7, s9) | 6 / 6 (s5, s6, s7, s9) |
| V1, V2, S1 to S11, width | 0 failures | 0 failures (s2 has no layer) |
| V3 alleys, tightest | 12 / 9 | 14 / 9 |
| V4 parks; M4a | equal on all; 0 | equal on all; 0 |
| Served parks: unserved, lane mouths at junctions | 0, 0 | 0, 0 |
| M3, M4b, M5, G2, G3; S6 mouths | 0; 0 | 0; 0 |
| P2 stalls / wanted (0.75 to 1.5) | 0.998 to 1.094 | 0.980 to 1.199 |
| R1 (floor 0.88), lowest | 0.908 | 0.904 |
| P1 supply (floor 0.69), lowest | 0.771 (s7) | **0.697 (s8)** |
| P1 blocks without a kerb tile | 1 (s7) | 1 (s3), 2 (s8) |
| P3, P4, P5 | 0 | 0 |
| P6 peak (cap 6 per 100 m) | 3.15 | 3.13 |

**Lever M works.** Without it, 6 x 6 s9 with one-way off also fails P1: block 5:0 loses its only tile to a neighbour, the 6 x 4 s2 pattern. With M it passes. M moves no other named run.

## 1. What is wrong: two causes

1. **A served park whose server can hold no tile (3 runs).** Every block left without a kerb tile is a whole park.
   - A whole park has no bays of its own (19.6), so it is served only from across the street.
   - Land's served-park rule (B3, the same reading as A4c's S11) counts any parking band across. But that band may hold no tile:
     - **6 x 6 s7, off:** block 0:1 (6 x 8) is served only by its neighbours' 6-cell sides. P3's cap there is floor(0.3 x 6 / 2) = 0 tiles.
     - **s3, on:** block 4:2 is served only by block 3:2's 6-cell side (cap 0).
     - **s8, on:** blocks 5:9 and 5:11 are served only by bands of blocks that are themselves whole parks (4:9, 4:11, 5:6), which hold no bays. 6 of the 7 parks are whole there, in a cluster.
   - This is the outside finding of the last note (6 x 4 s7), now on the named list.
2. **6 x 6 s2, one-way on: stage 1 finds no split in 65 draws.**
   - Misses: S3 46, V1 29, S4 28, S5 11, S9 5.
   - 6 x 6 with one-way on needs many draws: 40 on s6, 25 on s3, 26 on s9. A4c withdrew a split limit of 128 as not needed on 3 x 3; on 6 x 6 it is needed.

## 2. Options, measured

"Moved" counts named runs (of 20) whose draw or bays change, against lever M as cut. "Outside" is 3 x 3 seeds 1 to 20 plus 6 x 4 seeds 1 to 20, i.e. 40 cities, off / on.

**For cause 1 (the parks):**

| Lever | Named off | Named on | Lowest supply (off / on) | Moved | Outside (off / on) | What it changes |
| --- | --- | --- | --- | --- | --- | --- |
| As cut (M) | 9 / 10 | 7 / 10 | 0.771 / 0.697 | | 39 / 37 | |
| **PB. A whole park with no tile across takes its first tile on its own band** (in M's matching, listed after the across bands; the greedy pass never adds to it) | **10 / 10** | **9 / 10** (s2) | 0.782 / 0.729 | bays on 5 | **39 / 38** | Edge only (D1b, not built). Changes 19.6 ("a whole park has no kerb bays of its own") for that one tile |
| PT + S11T. The served park counts only a server that can take a tile (its side's cap 1 or more, a stretch of 4 cells or more, the server not a whole park), in Land and in stage 1's S11 | 10 / 10 | 9 / 10 (s2) | 0.794 / 0.725 | 3 (s3 on: draw 25 to 31) | 38 / 38 (new failure: 6 x 4 s4 off, V4 one park short) | Re-opens A4c (S11) and B3 (Land). The rule Josh approved stays; its reading tightens |
| PT alone (Land only) | 10 / 10 | 8 / 10 (s3 on: V4 7 / 8) | 0.794 / 0.725 | 3 | | Fails: S11 still counts places Land can no longer use |
| E. P1 does not ask a whole park for a tile | 10 / 10 | 9 / 10 | 0.771 / 0.697 | none | | Loosens P1. Read from the as-cut run: every untiled block is a whole park |

**For cause 2 (6 x 6 s2, one-way on):**

| Lever | s2 on | Moved | What it changes |
| --- | --- | --- | --- |
| **D. The split's draw limit 128** (stage 1's split only; the outline's `BLOCK_DRAWS_MAX` stays 64) | ok at draw 82; every check passes (supply 0.836) | none (every other run finds a draw by 40) | A number in stage 1 (A4's criterion, 64, "unchanged" in A4c) |
| G. S3's gap 6 cells, not 7 (provisional) | ok at draw 53 | 1 (s8 off: draw 6 to 1) | A threshold |

**Combined:** PB + D, and PT + S11T + D, each pass **20 / 20** named runs.

- PB + D: lowest supply 0.782 off, 0.729 on; R1 lowest 0.904.
- PT + S11T + D: lowest supply 0.794 off, 0.725 on; R1 lowest 0.914.

## 3. Recommendation, and what it costs

**PB + D, with M.**

- **PB goes into D1b** as a criterion, with a failing fixture: a whole park whose only server is a 6-cell side. No merged section re-opens, and no threshold changes.
  - It changes grammar 19.6 for one tile, which only Josh's words can make.
  - It changes no outside result for the worse (39 / 38 against 39 / 37).
- **D is stage 1's split limit, 64 to 128.** It re-opens stage 1 for one number (A4's files: `streets/constants.ts`, `split.ts`) and moves no named draw but s2 on.
  - The outline's limit and the old path are untouched.
  - It is a number Josh's words must change.
- **Margins to watch:** P1 supply 0.729 on s8 on (0.039 over 0.69); T share 0.333 on s4 on (0.033 over 0.30); park places exactly equal to need on 5 cities.

**What the builders must re-take (pins), in any case.** The named list and the default city move.

- Every stage's digest pins (R-4: the default plus 3 pin cities) are re-taken on the 6 x 6 list: streets (A4, A4b, A4c), land (B3), mass (C3), and edge in D1b.
  - The architect names the new pin cities, say 6 x 6 s1 (the default), s2 and s3.
- Every "on the named cities" test in `streets/`, `land/` and `mass/` gets the 6 x 6 list.
- D additionally moves the streets pin of 6 x 6 s2 (one-way on), if it is pinned.

## 4. Run time (this PC, `--maxWorkers=2`, one file alone)

| Per 6 x 6 city (20 runs) | Min | Mean | Max (ms) |
| --- | --- | --- | --- |
| Stage 1 (streets) | 4 | 28 | 147 (s2 on, 83 draws) |
| Land | 0 | 0 | 2 |
| Mass (build) + its checks | 31 + 11 | 83 + 15 | 152 + 25 |
| Edge sketch + its checks | 3 + 1 | 5 + 2 | 12 + 4 |
| The whole `runCity` (freeze, digests) and 4 pictures | 150 | about 220 | 290 |

- One probe file running all 20 named runs through every stage took **3.3 s** (about 1 s of it start-up).
- **A test file can run 10 to 20 cities of 6 x 6** (10 seeds, one or both ways), built once each through the module cache, in under 10 s. That is an estimate: the builders' files assert more than the probe.
- **The 120 s heavy-test budget holds** with a margin of about 20 times. Memory was not measured.
- Mass is the heaviest stage. A file that runs Mass alone 20 times costs about 2 s.

## 5. The old outside list (3 x 3 and 6 x 4, seeds 1 to 20 each), as cut with M

| | Off | On |
| --- | --- | --- |
| Pass | 39 / 40 (3 x 3 s12: stage 1) | 37 / 40 (3 x 3 s9, s19, 6 x 4 s7: P1) |

With PB + D: 39 / 40 and 38 / 40 (6 x 4 s7 passes). Reported, not required.

## 6. Questions for Josh

1. "On the 6 x 6 cities, three whole-block parks get no kerb parking: the streets around them park on the far side, but only along sides too short for a bay, or in front of another park. Should such a park take one bay on its own kerb, only when nothing across the street can give it one (Yes / No)?"
2. "If No to 1: should Land only count a park as served when the parking across the street can actually hold a bay, and not in front of another park, with stage 1's park-place count reading the same way (Yes / No)?"
3. "With one-way streets on, 6 x 6 seed 2 finds no street split in 64 tries; it finds one at try 82. Should stage 1 try up to 128 splits (Yes / No)?"

## 7. What the orchestrator does for each answer

- **Q1 Yes:** the architect adds PB to D1b as a criterion (failing fixture: a whole park whose only server is a 6-cell side). No other section re-opens.
- **Q1 No, Q2 Yes:** the architect re-opens A4c (S11 counts a whole place only with a tile-capable server) and then B3 (Land's served park, the same reading). Land and stage 1's pins move. Watch 6 x 4 s4 (outside).
- **Q1 and Q2 No:** 6 x 6 s7 off, s3 on and s8 on fail P1. R-2 then needs Josh's words for them, or one-way off (which still leaves s7 failing).
- **Q3 Yes:** the architect re-opens stage 1 for the split limit (a new `SPLIT_DRAWS_MAX` 128 in `streets/constants.ts`, the outline's `BLOCK_DRAWS_MAX` unchanged), with Josh's words. The builder reports s2 on at draw 82.
- **Q3 No:** 6 x 6 s2 on fails stage 1. It needs Josh's words under R-2, or S3's gap 6 (a threshold; it moves s8 off).
- **In every case:** the named list moves to 6 x 6, and the pins are re-taken (section 3). D1b then runs with M, and its stop rule expects 20 / 20.

## 8. Not verified

- PB, PT, S11T and M are sketches of rules the architect has not worded. The "room of 4 cells" in PT is my guess at a tile's room.
- The timing is the probe's. It is not the builders' test files, and it is not a whole `npm run gate`.
- No picture was looked at.

## 9. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\d5f474b7a5a52e12\c96b25ec-f0db-4c0d-8fac-f82300d945b2\scratchpad\a6probe`

- **What it is:** `src/core` and `src/city` from e9de2a1 (line endings made LF, tests removed). Edge is from `a4probe2` (D1b's band table, the side cap, P1 at 0.69, lever M).
- **Switches** (in `src/city/probe.ts`, set from environment variables):
  - `PT` (Land, `plan.ts`) and `S11T` (`streets/check.ts`);
  - `PB` (`edge/band.ts`);
  - `DRAWS` (`split.ts`'s loop) and `GAP` (S3);
  - `MATCH=0` turns M off.
- **Runs,** each alone with `npx vitest run --maxWorkers=2`:
  - `probe/run6.test.ts`, with `CITIES`, `SHARES` and `OUT`, summarised by `probe/table.cjs`;
  - `probe/time6.test.ts` (the whole `runCity` with its pictures).
- **Outputs:** `probe/n-*.json` (named) and `probe/o-*.json` (outside).
