# 070 D2 pre-check: the kerb line on the split plan and one-way streets

Pre-check of D2 as re-cut at 14d62a7 (`goal/city-style`). Every number below was measured by a probe: a sketch walker on a copy of `src/core` and `src/city` outside the repo. It is not the builder's code; the builder's numbers are the record.

## 1. Verdict: holds

All four new or changed rules hold on all 20 named runs (6 x 6 seeds 1 to 10, one-way off and on), together with G4 and the 0.05 m return rule. No check breaks. No number moves. The premise is sound.

| Rule (D2 criterion) | Off (10 runs) | On (10 runs) |
| --- | --- | --- |
| One well-formed path per block side, corner to corner (2) | 1464 / 1464 sides | 1552 / 1552 sides |
| Side cells that are not the street's own pavement or cut | 0 | 0 |
| Pavement and cut cells covered by no path / by two | 0 / 0 | 0 / 0 |
| Outer pavement: paths per edge street | 1 (40 streets) | 1 (40 streets) |
| T junctions | 426 | 382 |
| Ts with exactly one far side (block side or outer pavement) | 426 (224 block, 202 outer) | 382 (175 block, 207 outer) |
| `pavementDip` cells = 2 x Ts (3) | 852 = 2 x 426 | 764 = 2 x 382 |
| Dip cell with no crossing in front / between cell with no junction in front | 0 / 0 | 0 / 0 |
| Dip cell that is a kerb cut | 0 | 0 |
| Dip spacing (cells), by the ending street | 4 (all two-way) | 4: 123, 3: 45 (one-way), 2: 7 (bare) |
| Bare one-way sides, flanks on them (4) | none | 57 sides, 0 flanks |
| Mouths on bare streets, with `plain` null and both returns | none | 50 / 50 |
| Returns whose neighbour cell is built (5) | 1228 / 1228 | 1322 / 1322 |
| Largest return-end distance from the wall plane | 0 m | 0 m |
| Cuts at a plaza, park or walk-through; runs with two openings | 0; 0 | 0; 0 |
| Junction rectangles = carriageway x carriageway, full (1) | 609 / 609 | 609 / 609 |
| Each arm with one crossing row its carriageway wide | all | all |
| G4: courts off their opening, mouth cells with no cut, lane ends with no cut (6) | 0, 0, 0 (186 lanes) | 0, 0, 0 (206 lanes) |

On, the junction sizes are 3x3 350, 3x2 123, 2x3 74, 3x1 32, 2x2 21, 2x1 4, 1x3 3, 1x2 2.

**Outside cities** (reported only): 79 of the 80 runs reach the edge layer. 3 x 3 seed 12 with one-way off fails at streets (S5, 129 draws), before D2. On the 79, every row above holds. That is 5416 sides, 1620 Ts with dips exactly 2 x Ts, 4502 returns beside built cells, and G4 at 0.

**063 F's failing fixtures, re-cast on the path** (the sketch check: the chain is unbroken and each return ends within 0.05 m of the wall plane):

| Fixture | Result |
| --- | --- |
| Clean path | passes |
| One return removed | fails (chain broken) |
| A build-out's flank removed | fails (chain broken) |
| A return 0.1 m short | fails |
| A return 0.04 m short | passes |
| Criterion 4's bare drive | edge, return, opening, return, edge |
| Criterion 3's 14-cell side, two-way T | 2 dips 4 apart, no return |

The kerb-face fixtures (criteria 34 to 37c) stay in render3d and are E's. They were not probed.

## 2. Cases the rules do not cover

1. **A build-out right beside a T's dropped kerb.** The band cell just past a dip's crossing is a build-out in 226 of the 448 far-side ends off, and 174 of 350 on. The path dips and then steps out with a flank against the crossing.
   - This is the geometry every block corner already has. 730 of 1464 sides off (746 of 1552 on) start or end with a build-out beside a crossing, and 1686 and 1666 build-out cells touch a crossing.
   - The rules say "steps out round every stretch of build-outs", so the line is well-formed.
   - Not covered: whether E draws the flank's lip at full height next to a dropped kerb. That is E's drawing, not a D2 rule.
2. **A drive's cut near a dip.** The nearest cut is 2 cells from a dip, 34 times off and 40 on. S6 and `BAY_JUNCTION_CLEAR` 1 keep it out of the dip cell. So the return cell sits next to the dip cell, never on it: no cell needs both bits.
3. **A grate on a dip cell.** The variant comment says a grate never carries "any of the kerb bits". The builder should treat `pavementDip` as a kerb bit, so no dip cell is a grate. This is a reading for the architect, not for Josh.
4. **A T on an edge street.** Its far side is the outer pavement (202 off, 207 on), and stage 1 publishes no `CityJunctionFacing` for it. D2 finds the two dips from the `CityJunction` and the ending street's cross-section (`across0` and its first and last bands). The probe did that, and it holds.
5. **A T whose ending street is one-way.** This was covered: 45 one-way and 7 bare among the named runs, with dips 3 and 2 cells apart, crossings in front, and no case left over.
6. **The 0.05 m rule** is met at 0 m, but only against cell edges. F2's `BODY_M` re-read is not measured here.
7. **City corners** carry crossings on their two outside arms, which is stage 1 as merged. No kerb path is affected.

## 3. Recommendation

Build D2 as re-cut. Nothing in a merged section, digest pin or approved number moves. Add case 3's reading to the ticket (the architect's to do).

## 4. Questions for Josh

None is required, because no rule fails. One is optional, so that case 1 can be quoted in the ticket:

- "Beside a T's dropped kerb, a build-out can start in the very next cell, so the kerb steps out right where the crossing lands (226 times with one-way off and 174 with it on, over the 20 named runs), as it already does at every block corner. Leave it as at the corners (Yes), or keep the band cell beside every crossing plain (No)?" Recommended: Yes.

## 5. What the orchestrator does for each answer

| Answer | What happens |
| --- | --- |
| Yes, or not asked | D2 starts as cut |
| No | D1 and D1b's band re-open (build-out placement), the edge digests move, and P1 is re-measured: its lowest margin is 0.729 on 6 x 6 seed 8 with one-way on. The architect re-cuts D1b before D2 |

## 6. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\d5f474b7a5a52e12\c96b25ec-f0db-4c0d-8fac-f82300d945b2\scratchpad\d2probe\probe\kerb.test.ts`. It runs with `RUNS=named` or `RUNS=outside` and writes `out-named.json` and `out-outside.json` beside it.
