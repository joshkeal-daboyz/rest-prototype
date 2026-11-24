# 081 B1q · Pre-check of B1b (mid-row roofs, the real pole pick, any node on roofs, neighbouring blocks)

23 Nov 2026, pipeline-designer. Branch `ticket/081b1-roof-spans` at 78515b6, with PK1's `src/core/powerpoles.ts` from `ticket/081pk1-pole-mix-core` (b126f0e). No `src/` change since B1p. Not committed. Nothing here is decided until Josh says so in chat.

**This is a sketch.** It is B1p's throwaway probe, extended: CK1 to CK11 re-laid (it reproduces K1's seed-1 counts), and CK17 as B1b words it. Pole heights are PK1's `GROUND_POLE_ATTACH_UP_M`, picked by `poleAt`'s rule (`stableHash(id) % 3`; pole ids have no `#`). The fit is a heuristic, not P1. "None found" means none within its step budget. K2d's and P1's numbers are the record.

Runs: the 20 named runs (6 x 6 seeds 1 to 10, one-way on and off), as B1q asks. Fits: 6 x 6 seed 1, one-way on (answer 3). For information only, 070's 13 cities (3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3, one-way on) were also run. They agree, and nothing was tuned to them.

Josh's mid-row answer is the one measured: **"Only when used (Recommended)"**.

## 1. Verdict: holds. One wording clash for the architect, one Proposed rule for Josh

| B1b rule | 20 runs | Seed 1 |
| --- | --- | --- |
| Mid-row places (CK17a) | **Holds.** 19,441 places | 990 |
| ... clear of stage 7 (the Proposed rule) | 8,967 (43 to 49% a run) | **440** (44%) |
| ... blocked by a big prop | 3,376 | 170: 93 exits, 50 billboards, 16 towers, 11 novelty signs |
| ... blocked by small props only | 7,098 | 380 |
| H4 on corners (B1b's reading) | **Holds.** 697 small props, 0 big | 26 small, 0 big |
| Roof-to-pole over a junction on PK1's pick (CK17d) | **Holds.** 1,207 of 1,801 pass: every Palm pole (607 Palm 01, 600 Palm 02), no Apocalypse pole (0 of 594) | 56 of 82 |
| CK7, 4.2 m | **Holds.** 0 fails; lowest point 5.85 m | 0 |
| Any node on roofs (CK17e) | **Holds.** The fits use roof lamps and roof junctions. None needs a roof feed. | |
| Neighbouring blocks (CK17g) | **Holds.** Of 54,522 offered `street` and `junction` roof spans, 0 join two blocks that are not neighbours. | 0 of 2,683 |
| Pilot | **15 of 16 on 1 block.** 15 still fails CK14 (2 lines on a feed). | |

- **The real pick changes nothing.** The pick and the heights are the same as B1p's, whether the span lands on the centre attachment or the lowest one.
  - **Correction:** B1p's table, and B1b's CK17d after it, say "0 of 1,801" for Apocalypse poles. It is **0 of 594**: 1,801 is all such places.
- **Every built block keeps clear mid-row places.** On seed 1 it has at least 4 (median 12). The 3 blocks with none have no corner places either, so they have no buildings.
- **Nothing else stands in a clear place.** No escape, sign, ground or traffic piece rises above the deck inside a clear keep square (0 on 20 runs).
- **Down spans from clear mid-row places, reported and not failed** (as CK17d does for corners): 342 of 9,758 pass through a stage 7 piece (17 on seed 1).
- **CK17g needs no check of its own.** CK17b's "one street or one junction" already keeps every offered roof span within neighbouring blocks.
  - CK14's merged check line ("each line uses only the district's spans or its feed's span") would reject the 1-block fits of 04 and 12, which cross the edge to neighbouring roofs.
  - K2c builds CK14, so the architect words that exception there. With one job played at a time and roof spans drawn only for the live job, no span meets another job.

**The wording clash (architect, not a question):**
- B1b's CK17a (Proposed) says H4 clears corner places only, and the city check rejects a job whose mid-row keep square meets a stage 7 piece.
- Ticket 081's H4 line on `ticket/081-puzzles-on-the-city` (d9ce54f) says H4 clears "a mid-row roof wherever a city puzzle could put a structure".
- These are the two options below.

## 2. Options for mid-row roofs, measured

| Option | Mid-row places usable, seed 1 (20 runs) | Stage 7 moved, seed 1 (20 runs) | Pilot on 1 block | What stops it |
| --- | --- | --- | --- | --- |
| **A. Stage 7 never moves; only clear places (B1b, Proposed)** | 440 (8,967) | 26 small, on corners only (697) | 15 of 16; 12 uses 7 clear mid-row places; **0 blocked places needed** | Nothing measured. The city check must run after stage 7 (P1), because stage 6 can't see stage 7. |
| B. H4 clears every mid-row place (ticket's H4 line) | 990 (19,441) | 26 + 471 small + **220 big** (697 + 8,379 + 4,472) | 15 of 16, as A | 220 big props on seed 1 need a "move or leave the roof" rule that does not exist. That is a new H4 rule and a new pre-check. Most of the clearing is for roofs no puzzle uses. |
| C. H4 clears small props only; a big prop blocks the place | 820 (16,065) | 26 + 471 small (697 + 8,379) | 15 of 16, as A | H4 thins mid-row roof dressing on every building for no pilot gain. |

**The pilot's fits** (sketch; fewest blocks found; budget 4,000 steps, 20,000 where marked):

| Puzzle | B1p (corner roofs, junctions on roofs) | + any node, + neighbouring roofs | + clear mid-row places |
| --- | --- | --- | --- |
| 01, 02, 05, 06, 08, 13, 16 | 1 block, poles | 1 | 1 |
| 03, 07, 09, 10, 11, 14 | 1 block | 1 | 1 |
| 04 | 2 blocks | **1** (at 20,000 steps) | 1 |
| 12 | 2 blocks | 2 (none found at 20,000 steps) | **1** (7 mid-row places, all clear; 7 neighbouring roofs) |
| 15 | fails CK14 | fails CK14 | fails CK14 |

- **The search does not always improve with more places.** With neighbouring roofs on, 14 first came out at 2 blocks, then at 1 block with a bigger budget. A fit found with fewer places stays valid with more.
- **All mid-row places, blocked ones too:** every puzzle still fits on 1 block. The first fit found uses 1 to 4 blocked places, but A's fits show none is needed.
- **Without neighbouring roofs:** mid-row places alone leave 04 and 12 at 2 blocks.

## 3. Recommendation
**Option A**, B1b's Proposed reading: stage 7 is never moved for a mid-row place, and a job may use only a clear one.
- **Why:** it keeps 44% of mid-row places, at least 4 on every built block. No pilot puzzle needs a blocked one. Nothing merged moves.
- **Costs:**
  - H4 is corner-only: 26 small props on seed 1 and its planned digest re-take. The ticket's H4 line and its mid-row fixture case are re-worded.
  - The mid-row check (B1b's K2 check 11) needs a home after stage 7. P1's city check is the natural one; K2d can't see stage 7.
  - K2c's CK14 line gains the neighbouring-roof exception.
- **Moves nothing else:** no merged section, no digest pin, no threshold, no approved number.

## 4. Question for Josh
**"Mid-row roof structures: only on roofs stage 7 has left clear, with nothing on the roofs ever moved (Recommended), or does stage 7 clear every mid-row roof for them?"**
- **"Only where clear" (Recommended):** 440 of 990 mid-row roofs on seed 1 can take one. All 15 fitting pilot puzzles fit on 1 block, and no roof prop moves.
- **"Clear every one":** every mid-row roof can take one. Stage 7 moves 471 small props and 220 big ones on seed 1, and the big ones need a new rule first.

## 5. What the orchestrator does for each answer
- **"Only where clear":**
  - Josh's words go at the top of this note, of `081-B1-roof-spans.md`, and into ticket 081.
  - The architect re-words H4: corner places only, and the mid-row fixture becomes "a mid-row place is never cleared". It puts B1b's check 11 in P1 (the city check, after stage 7) and the neighbouring-roof exception in K2c's CK14.
  - The designer corrects CK17d's "0 of 1,801" to "0 of 594".
  - K2d is cut in full. P2a plans 04 and 12 on 1 block, and 12 uses clear mid-row places.
- **"Clear every one":**
  - The architect re-cuts H4 with a rule for big props that can't keep clear. A pre-check of H4 comes before its builder, and stage 7's digest pins move.
  - B1b's check 11 is dropped. K2d is cut as above, and P2a is unchanged.

## 6. The probe
`C:\Users\Josh\AppData\Local\Temp\b1pre\`:
- `layout.ts` (`pick=pk1`, `PK1_ATTACH` centre, min or max);
- `roofs.ts` (no `junction` span from a mid-row place);
- `b1q.ts` (neighbouring blocks, keep-square clashes);
- `q.ts` (the 20 runs; `attach=`, `size=`, `seeds=`, `ways=`);
- `q2.ts`, `q3.ts` (clear places per block, other pieces above the deck);
- `fit2.ts` (`mode=all`, `mid=none|clear|all`, `nb=0|1`, `budget=`, `only=`).

It runs on a copy of `src/core` (with PK1's files) and `src/city` from 78515b6, with `node_modules` linked, one process at a time. Outputs are `q-a20.json`, `q-c33.json` and `q-c64.json`.
