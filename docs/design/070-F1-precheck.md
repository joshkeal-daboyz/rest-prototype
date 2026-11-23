# 070 F1 pre-check: rows, buildings, M4c, R2 and R13 on the split plan

## Josh's answer (20 Nov 2026, in chat)

Asked the four questions in this note, each with a recommendation (1 yes: the hidden ring-2 corner joins both back rows as one L-shaped building of 3 cells where a drive and a frontage lot meet at one block corner; 2 yes: that corner takes its floors from the street-corner building and its style and colour from the building it is grouped with; 3 after: BACK_SAME_SHARE 0.5 is made Decided after he sees the F1 screenshots; 4 no new rule now: the two buildings meeting at a street corner are not also required to differ in style and colour), Josh answered: "1-4 i approve your recommendations".

So: lever L1 is in F1; BACK_SAME_SHARE stays Proposed until he sees F1; no style/colour rule at street corners.

Pre-check of F1 as re-cut at ca61068 (`goal/city-style`). Every number below was measured by a probe: a sketch grouper (random restarts over the corner choices and the leading rows' cuts, followers derived by N3, storeys by search) on a copy of `src/core` and `src/city` outside the repo. It is not the builder's code. The builder's numbers are the record.

## 1. Verdict: holds, except at one kind of corner

N1 to N5 and the moved rules hold together on 15 of the 20 named runs. The other 5 runs each fail rule 6 ("a row always closes") in 1 to 3 court parts, 8 parts in all. Every one of the 8 is the same case, and no grouping can close it under N1:

- **The tight corner.** A drive on one side of a part corner and a frontage lot on the other, each starting 3 cells from the corner. Ring 1 has 3 cells on each side, which is fine. Ring 2 has 2 cells on each side, the blind ring-2 corner counted in both. N1 puts the corner in one row only, so the other row is left with 1 cell. That fails rule 1 (2 to 4 columns). The mass is legal: M5 counts the corner in both rows.
- Where: 6 x 6 seed 3 on, seed 5 on, seed 8 off (3 parts) and on, seed 10 on (2 parts). That is 3 corners off and 5 on. Pin cities 3 and 8 are among them.
- Example, 6 x 6 seed 3 on, `block:4:1` (cells i 67 to 74, j 17 to 25). The drive is at i 67 to 68, j 21 to 22, and the frontage lot at i 70 to 71, j 24 to 25. The blind corner is (68, 24).

With one lever (L1 below) all 20 runs close, and every check holds:

| Check (20 runs, L1 on) | Off | On |
| --- | --- | --- |
| Runs ok | 10 / 10 | 10 / 10 |
| Buildings (leading / following) | 9316 (4974 / 4342) | 9681 (5176 / 4505) |
| Through share | 2157 / 4342 = 0.497 | 2283 / 4505 = 0.507 |
| R2 style, R2 storeys, R13 failures | 0, 0, 0 (4743 pairs) | 0, 0, 0 (4884 pairs) |
| M4c failures (cell by cell, through, another) | 0 | 0 |
| Storeys 3 / 4 / 5 | 3214 / 2917 / 3185 | 3354 / 3024 / 3303 |
| Building sizes 2 / 3 / 4 | 4636 / 3008 / 1672 | 4801 / 3108 / 1772 |
| Storey search backtracks | 0 | 0 |

The rule-by-rule checks, on all 50998 built cells of the 20 runs:

- **N1.** Every built cell lies on a row line, and every non-blind cell shows its row's front: 0 exceptions. No ring-1 cell is blind.
- **N3.** It holds everywhere but at the 8 tight corners. 1303 leading buildings have no follower, and all 1303 are at a ring-1 corner, as criterion 4 allows.
- **N4.** All 238 strip parts close. In each, the two rows have the same cuts end to end.
- **N5.** The probe hashes every choice through `colourwayStart`'s finaliser. Style, colourway and step-on never ran out of choices.

## 2. N2 and the corner chain

N2 ties a pair at every ring-1 corner where both arms are built: 3358 tied pairs in the 20 runs. 82 classes tie three leading buildings (a row that is a single building between two corners). The tie is not an artefact of reading M4c cell by cell. Rule 4 forces it: the corner cell and the cell beside it on each arm all back onto the one blind ring-2 corner, and that corner has one height.

| What the tie does (20 runs) | With N2 | Ties only follower to partner |
| --- | --- | --- |
| R2 pairs that fail | 0 | 0 |
| "Not the one before that" kept (terrace.ts's soft rule) | 3546 / 3909 = 0.907 | 3909 / 3909 = 1.0 |
| Storeys 3 / 4 / 5 | 0.346 / 0.313 / 0.342 | 0.365 / 0.291 / 0.343 |
| Cells where M4c fails | 0 | 4697 |

So R2 and R13 lose nothing. The soft rule loses 9%. What N2 does not cover: at each corner the two tied buildings stand side by side on one street face at the same height. They are in different rows, so R2 never compares them. By chance they share a style in 1121 of 3358 pairs (0.33) and a colourway in 450 (0.13). No rule asks them to differ.

**Rule 4's corner sentence.** Rule 4 says the blind ring-2 corner "takes the style, colourway and floor count of the ring-1 corner building". The ticket checks only the floor count. In 1769 of 3276 blind corners (0.54), the corner is grouped behind the building on the other arm, and 1697 (0.52) differ from the corner building in style or colourway. Requiring the strict reading (every ring-2 corner follows its ring-1 corner building) closed 0 of 20 runs in the probe's search, with 48 parts left open. That is a search result, not a proof. Only the blind corner's roof shows.

## 3. Options for the tight corner, measured

| Option | Named runs ok | Outside (79 that reach mass) | What it moves |
| --- | --- | --- | --- |
| As cut (N1 strict) | 15 / 20 | 74 / 79 (5 tight corners) | nothing, but F1 cannot pass R-2 |
| **L1. The blind corner joins both rows: one L building of 3** (the corner and the one cell beside it in each ring-2 row; its partner is the ring-1 corner building) | 20 / 20, every check 0 | 79 / 79 | N1 ("a building is straight") and N3 (this one follower backs onto two leaders, which N2 has already tied to one height). Stage 5 only. No merged section or pin moves |
| L2. Mass keeps lot sites off tight corners | not measured | not measured | re-opens C2 and C3. The mass digest pins move on 6 x 6 seeds 3 and 8 (on). P2 must be re-checked |

Outside cities: 3 x 3 and 6 x 4, seeds 1 to 20, off and on. 79 of the 80 runs reach mass; 3 x 3 seed 12 off fails at streets (S5), as before. As cut, 5 fail on the tight corner: 3 x 3 seed 2 off, seed 8 off and on, 6 x 4 seed 3 on, seed 15 off. With L1, all 79 are ok.

**Rows the rules might not cover. None found beyond the tight corner.**

- **One-way rows.** Stage 5 reads no street, and off and on give the same results.
- **Lane rows.** 784 parts have a lane edge; all close.
- **Court (ring-2) rows.** Every ring-2 cell has a mass partner; 0 of 50998 built cells have a null partner.
- **A ring-2 row with no partner.** Does not occur.
- **Strip ends.** The partners there are asymmetric (the end cell backs onto the cell one in), but the two rows always cut alike.

## 4. Recommendation

1. **L1**, written into F1's criterion 1 and criterion 4: "a blind ring-2 corner whose two ring-2 stretches are both 2 cells is one L building of 3, following the ring-1 corner building". Then the builder starts. Josh must approve it: it changes N1, the architect's reading of rule 1, and nothing else.
2. Keep the ticket's floors-only reading of rule 4's corner sentence. The strict reading did not close in the probe.
3. `BACK_SAME_SHARE` 0.5 does not block F1. It is typed as Proposed and no test pins it. Measured, it gives 0.50 through. It stays Proposed until Josh says otherwise.

## 5. Questions for Josh (recommendation first)

1. Where a drive and a frontage lot meet at one block corner, may the hidden ring-2 corner cell join both back rows as one L-shaped building of 3 cells? (Recommended: yes.)
2. May a hidden ring-2 corner take its floors from the street-corner building but its style and colour from the building it is grouped with? (Recommended: yes.)
3. Make `BACK_SAME_SHARE` 0.5 (half the back buildings "through", half "another") Decided now, or after you see the F1 screenshots? (Recommended: after.)
4. At each street corner, the two buildings that meet are always the same height (rule 4 forces it). Should they also be made to differ in style and colour? (Recommended: no new rule now; judge on the screenshots.)

## 6. What the orchestrator does for each answer

| Question | Answer | What happens |
| --- | --- | --- |
| Q1 | Yes | The architect adds the L exception to F1 criteria 1 and 4 and to the comment in `cityplan.ts`, with a failing fixture for a bent building anywhere else. Then the builder starts F1 |
| Q1 | No | The architect cuts a mass section (L2). F1 waits. The mass pins for seeds 3 and 8 move, and P2 is re-checked |
| Q2 | Yes | No change: the ticket already checks floors only |
| Q2 | No | Back to the designer: the strict reading has no grouping in the probe |
| Q3 | Now | The grammar line and the constants comment become Decided |
| Q3 | After | No change |
| Q4 | Yes | The architect adds a corner-pair check to criterion 5 (not measured; the style pick may run out at a three-leader class) |
| Q4 | No, or later | No change |

## 7. Probe

`C:\Users\Josh\AppData\Local\Temp\claude\d5f474b7a5a52e12\c96b25ec-f0db-4c0d-8fac-f82300d945b2\scratchpad\f1probe\probe\` holds `group.ts` (the grouper; switches `BEND=1` for L1 and `RULE4=1` for the strict corner reading), `f1.test.ts` (`SCOPE=named` or `outside`) and `out-*.txt`. Each was run alone with `npx vitest run --maxWorkers=2`.
