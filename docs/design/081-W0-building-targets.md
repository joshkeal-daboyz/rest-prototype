**Josh's answers, 25 Nov 2026, on cards:** W-Q3: "Own block roofs (Recommended)" (poles and drops, plus roof runs over the block they feed and at corners). Ring lines read outward from where each line takes its power: "Yes (Recommended)".

# 081 W0 · Pre-check of W1: lamps on buildings, routes that read outward, the roof answer

*Pipeline designer, 25 Nov 2026. A probe sketch on 6 x 6 seed 1, one-way on (W0's city), over the 16 pilots' schematics; the W1 builder's numbers are the record. 15 is fitted from its P2a rework (the schematic cannot fit, CK14). Solutions are the P2a notes' check blocks. Other named cities were not run: W1's rules are for authored puzzles on the pilot city.*

**Josh's answer:** *(open)*

## 0. First: the read-outward rule, as worded, fails P0
Measured from the line's **feed**, P0 (`city-two-ways-round`, on `main`) fails by **61.6 m** (`l_x`) and 29 m (`l_e2`). Its winning current goes the long way round the block and comes back towards the feed. That is the puzzle. Every ring does the same. Under W1's stop rule the builder would stop on P0.

**The wording I propose (measured):**
- Along each line's run, from the node current enters by in the winning state, no structure (pole or roof) is nearer the reference point in plan than the farthest one before it by more than `READ_BACK_M` **3 m**.
- **The reference point is the feed**, except on a **ring line**, which is measured from the line's own first structure. A ring line is a line on a cycle of the schematic, with all the feeds counted as one node. That covers 14, 15 and P0.
- **A line dead in the winning state** passes if it reads outward from either end.
- **The drop's wall point is not a structure.** Counted, it fails P0 by 4.5 m (`l_inf`: the drop crosses towards the feed).

| Reading (3 m) | P0 | Pilots that fit (option C) |
| --- | --- | --- |
| From the feed, drops counted (as worded) | fails, 61.6 m | 13 / 16 (12, 14, 15 miss) |
| From the line's start, every line | passes, 0.16 m | not run alone |
| **Ring lines from their start, drops not counted** | **passes, 0.16 m** | **16 / 16** |

## 1. What holds, and what does not
- **Lamps on buildings:** holds. Every lamp found a building by its drop wherever a lay was found.
- **Feed clearance:** a roof span sharing a pole with the feed's entering span is judged by its far end. Read literally (touching counts as 0 m), it costs 3 lays instead of 1.
- **The three rules together cost 2 to 4 lays** under every roof answer.
- **12 fails under every option.** It is not a known rework.
- **15's P2a rework does not fit the new rules either.**
- **P2a's 03 is caught by all three rules:** it reads back 6.3 m, passes 1.9 m from the feed's entering span, and has 1 crossing.

## 2. Options for W-Q3, measured
All rows have every lamp on a building. "All rules" means read-outward (as proposed above), `FEED_CLEAR_M` 6 m (far-end reading) and no crossings. Search budget is today's `FIT_BUDGET` of 300,000 unless a row says otherwise.

| Option | Lamps only | All rules | Misses with all rules | Spread (all rules) |
| --- | --- | --- | --- | --- |
| A. Roofs only at a diagonal | 15 / 16 | **12 / 16** | 09, 12, 14, 15 (09 still misses at 1.5 M) | 12 pilots on 12 blocks, at most 2 a block |
| B. No roofs | 8 / 16 | **8 / 16** | 03, 04, 07, 09, 11, 12, 14, 15 | 8 pilots on 10 blocks, at most 1 |
| C. Roofs over own block too (today) | 16 / 16 | **12 / 16**; **14 / 16** at 1.5 M | 12, 15 (09 and 14 fit at 1.5 M, on 3 blocks each) | 12 pilots on 13 blocks, at most 1 |

**The rules one at a time, on option C:**

| Rule | Fits |
| --- | --- |
| `READ_BACK_M` 3 m, ring reading | 16 / 16 |
| `FEED_CLEAR_M` 6 m, far-end reading | 15 / 16 (12) |
| `FEED_CLEAR_M` 6 m, literal reading | 13 / 16 (03, 07, 12) |
| No crossing spans | 15 / 16 (12) |

**Why B misses so many.** 03, 04, 07, 11, 12 and 15 each have a junction with 4 or 5 wire lines. On seed 1 no pole has more than 3 spans (488 poles have 2, 74 have 3), and drops hold lamps only. So these need roof ports or a rework. 09 and 14 find lays (1,170 and 4,044), but none both plays the same when raised and reads outward.

**Today's fit, for comparison** (post lamps allowed, no new rules): 7 of 16 lays have crossing spans. The worst read-back is 91 m (10).

## 3. Recommendation
**Option C, with the wording in section 0, `READ_BACK_M` 3 m and `FEED_CLEAR_M` 6 m (far-end reading).** It costs:
- **12 becomes a rework** under answer 4 ("Change the puzzle instead"), and **15 is re-reworked**.
- **09 and 14 fit only past today's budget.** In W1 the rules should be checked inside the search, not after it; the probe checks them only on finished lays. Raising `FIT_BUDGET` would be a change to P1's number.
- No merged section, digest pin or Josh number moves. B1's answers stand.

**A and B narrow how a puzzle may use B1's roofs** (Josh's "Anything" and "Neighbouring blocks too"). The grammar would still offer them; only W1's check would refuse them.

## 4. Questions for Josh
1. **W-Q3: what may a run use?**
   - "Roofs for diagonals only"
   - "No roofs"
   - "Roofs on own block too (Recommended)"
2. **Ring lines** (P0, 14, 15) are read outward from where current enters each line, not from the feed. Answer "Yes (Recommended)" or "No". With "No", P0 fails and W1 stops.

## 5. What the orchestrator does for each answer
| Answer | Sections re-opened | Architect re-cuts | Builder resumes |
| --- | --- | --- | --- |
| C + Yes | none | W1 criteria 2 and 3 get section 0's wording and the two numbers | W1 from the start; P2a2 reworks 12 and re-reworks 15 |
| A + Yes | none in the grammar | W1 criterion 4: a roof is used only at the end of a `junction` span or a street span more than 20° off square (the probe's reading) | W1; P2a2 reworks 09, 12, 14, 15 |
| B + Yes | none (K2 stays; roofs stay as scenery) | W1 criterion 4: no roof spans or roof nodes in `puzzles/city/` | W1; P2a2 reworks 8 pilots, splitting every 4- and 5-wire junction |
| any + No | W0 | the read-outward rule needs another wording, or W1 drops it | stopped until then |

## 6. The probe
`C:\Users\Josh\AppData\Local\Temp\claude\2b1ae232cf9c2e27\182c5949-f550-4d70-9f59-3d4e33dcc0aa\scratchpad\w0probe`. It is `origin/main` 17df2e5 with P2a's `puzzles/city/`, and `tools/fit.ts` switched by `W`. The rules are in `tools/w0rules.ts`, the runner is `tools/w0.ts` and the spread is `tools/w0spread.ts`. Results are in `out/*.jsonl`.
