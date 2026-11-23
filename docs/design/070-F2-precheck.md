# 070 F2 pre-check: pieces, turns, roofs, placements

Pipeline designer, 20 Nov 2026, on `goal/city-style` at a4810d5. This is a probe, a sketch: the builder's numbers are the record. Every number here was measured in the probe, except where it says arithmetic.

## 1. Verdict: holds

P1 to P5, M1, M6/R9, M9a and G1 hold on **all 20 named runs** and on **all 79 outside runs that reach stage 5** (1 of 80 outside runs fails at streets, S5, on 3 x 3, before stage 5). Every check has 0 failures. The L bends and the blind columns piece cleanly. Three things are not covered by a check. None of them breaks F2's checks, but each one goes against a line of the grammar's text (section 3).

| Check (named runs) | Failures | Worst measured | Threshold |
| --- | --- | --- | --- |
| M1, floor body plane off its cell edge | 0 | 0.0004 m | 0.02 |
| G1, recess / overreach on open sides (floors) | 0 | 0.0002 / 0.0003 m | 0.01 / 0.61 |
| M6 and R9, corner faces on the two open sides; no corner key off a corner | 0 | n/a | exact |
| M9a, roof back plane and reference plane, floor sides | 0 | 0.0003 m | 0.03 |
| Storey cover (1 to storeys - 1, once each) | 0 | n/a | exact |

**M2 on the kit's real bodies** (bounds from the converted manifest, less `BODY_M`; arithmetic):
- Floor, corner and three-storey keys: 4.9996 to 5.0008 m. M2 holds within 0.001 m.
- Roof keys: 5.022 to 5.062 m across and 5.078 to 5.108 m deep. M2 (0.02) cannot hold for any of the six roofs, so P4's premise is right.

| Roof key | Body w x d | Body past the cell: front, back, sides (flank) | Cornice (bounds) past the cell: front, outer flank |
| --- | --- | --- | --- |
| Roof_01 | 5.024 x 5.078 | 0.078, 0, 0.012 each | **0.79**, 0.155 |
| Roof_02 | 5.022 x 5.108 | 0.108, 0, 0.011 each | 0.39, 0.126 |
| Roof_03 | 5.024 x 5.078 | 0.078, 0, 0.012 each | 0.50, 0.155 |
| Roof_Corner_01 | 5.046 x 5.078 | 0.078, 0, outer 0 / inner 0.046 | **0.79**, **0.715** |
| Roof_Corner_02 | 5.047 x 5.078 | 0.078, 0, 0 / 0.047 | 0.50, 0.42 |
| Roof_Corner_03 | 5.062 x 5.108 | 0.108, 0, 0 / 0.062 | 0.39, 0.29 |

By depth, Roof_Corner_02's profile matches Roof_03's, and Roof_Corner_03's matches Roof_02's. The pack's numbering may be crossed. Rule 11 keeps each style's own corner roof, so nothing moves on this.

**Counts (20 named runs).**
- Columns: 50,998 (mid 38,794, corner 8,928, blind 3,276).
- Pieces: 147,690 (floor 68,605, floor3 28,087, roof 50,998). That is 6,446 to 8,032 per city, which is G's draw-call estimate.
- Ls: 8 Ls with 24 columns, on 6 x 6 s8 off (3), and s3, s5, s8 and s10 on (s10 has 2).

**The L (P3).** In all 8 Ls (and the 5 outside), the `rowId` cell and the `bend` cell are **corner** columns and the bend is blind. P3's "the rowId cell fronts the rowId row" therefore has to be read as criterion 2's "front, or that and its side". Read that way, all 24 L columns pass. The blind bend fronts its own `bend` cell, at the same height.

**Corner turns.** In 4,411 corner columns the forced front is the row's front. In 4,517, the row's front is the column's `side`. Both are covered by criterion 2.

## 2. What the rules do not cover (measured)

| # | Case | Named runs | Which line of the grammar it goes against |
| --- | --- | --- | --- |
| U1 | A blind column stands above a lower neighbour across its front, so its **windowed** front shows 1 or 2 storeys over that roof | 684 of 3,276 blind columns (460 by one storey, 224 by two); outside, 1,134 | Rule 3's table says a blind column shows "the roof only". M7 counts every side of a blind column as a party wall |
| U2 | The style-01 roofs' cornices stand more than 0.6 m past the cell | 19,880 roof sides (front 0.79 m: 15,841 over open cells, 1,086 over built ones; corner outer flank 0.715 m: 2,953) | Rule 2's "trim may reach up to 0.6 m", against rule 11's "overhangs by what the piece carries". No check measures either one |
| U3 | Inside one building, the roof's base course steps between a corner column and the next column on the row's face | 6,571 corner-to-mid pairs and 54 corner-to-corner pairs. The step is 0.078 m (style 01) or 0.108 m (02, 03) where the row's front is the corner's `side`, which is flush; 0.03 m where it is the corner's front | No check: M9a is per column, and 0.03 is `STOREY_ALIGN_TOL_M` |

There are other overlaps, all hidden or trim-scale:
- Roof bodies reach 0.01 to 0.11 m into the next cell. Over that cell there is: a roof of the same height (74,328 sides), a taller wall (11,008, hidden inside it), a lower roof (11,008, a ledge of at most 0.11 m), or open ground (47,722).
- Floor trim (sills, at most 0.351 m, Apartment_03) reaches into neighbours' shells, as on the old path.

U2 and U3 are on the old path too: the same seat and the same keys (063 E2 reported them as overhangs and did not fix them).

## 3. Options and recommendation

No option changes a merged section, a digest pin or an approved number. F2 can be built as cut.

| Case | Recommended | Alternative | Cost of the alternative |
| --- | --- | --- | --- |
| U1 | P2 as written: the windows show. H2 counts a windowed face as dressed, so M7 does not ask for boards on it | Turn a blind column's front toward its tallest neighbour | A new turn rule in P2. Some fronts still face lower roofs, so it does not remove the case |
| U2 | Rule 11 governs roofs: the cornice is reported and not failed (P4's reading, extended to rule 2) | Seat the style-01 roofs differently | Breaks 063 E2's back-plane seat and M9a's back plane |
| U3 | Report it in criterion 6, and Josh judges it on G's screenshots | A cornice-line check, with the corner roof seated by its row face | New rule. The corner roof's other open face then steps instead |

## 4. Questions for Josh (recommendation first)

1. Where a hidden back-row building is taller than the one in front of it, may its windows show above the lower roof (no boards on that face)? (Recommended: yes.)
2. The roofs of style 1 overhang the street by up to 0.79 m, past the 0.6 m trim limit. May roofs overhang by what the piece carries? (Recommended: yes.)
3. On some corner buildings the base of the roof steps back by 8 to 11 cm at the corner. Judge it on the 3D screenshots instead of adding a rule now? (Recommended: yes.)

## 5. What the orchestrator does for each answer

| Q | Answer | What happens |
| --- | --- | --- |
| 1 | Yes | The architect adds one line to H2's scope (a blind column's front above a lower roof counts as dressed). F2 starts as cut |
| 1 | No | The architect re-cuts P2 with a turn rule. The designer measures it before F2 starts |
| 2 | Yes | Rule 2's 0.6 m is read as excluding roof cornices. F2 starts as cut |
| 2 | No | Back to the designer: the style-01 roofs have no seat that both meets 0.6 m and keeps M9a's back plane |
| 3 | Yes | No change. G's screenshots show it |
| 3 | No | The architect cuts a cornice-line check into F2 criterion 5. The designer measures it first |

None of the three blocks F2's builder: F2's checks hold either way.

## 6. Probe

`C:\Users\Josh\AppData\Local\Temp\claude\d5f474b7a5a52e12\c96b25ec-f0db-4c0d-8fac-f82300d945b2\scratchpad\f2probe\`
- `src/` is a copy of `src/core` and `src/city` at a4810d5.
- `probe/f2.test.ts` is the probe (`SCOPE=named` or `outside`).
- `probe/out-named.txt` and `probe/out-outside.txt` are its outputs.

Each run was made alone with `npx vitest run --maxWorkers=2 probe/f2.test.ts`.
