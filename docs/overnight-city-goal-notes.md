# Overnight city-style goal: running notes for Josh

Goal (Josh, 18 Nov 2026, in chat): use the POLYGON City Pack to build a style guide that lets us build procedural cities of the quality of his reference images (stacked shopfront-and-apartment terraces, awnings, fire escapes, rooftop props), without people, animals or vehicles. He waived ticket approvals for it ("I don't want to approve the tickets").

How it was run: all work is on branch `goal/city-style`; main was never touched and nothing was pushed. Every ticket still went through the gate, a review and a playtest. Josh merges the branch to main, or not.

## Merged on this branch so far
| Ticket | What | Review | Playtest |
|---|---|---|---|
| 050 A | City Pack stack recipes and pure assembly (`stacks.ts`) | meets, must-fix 0 | regressions 0 |
| 050 B | Stack gallery (`gallery=city-pack&stacks=1`) | meets, must-fix 0 | regressions 0 |
| 050 C | Three-step chain (City Pack stack, else Town Pack, else SIMPLE Town); stacks placed on large and tall lots | meets, must-fix 0 | regressions 0 |
| 051 A | Dev-only street camera (`cam=street&run=N&at=T&light=day`) | meets, must-fix 0 | regressions 0 |
| 051 B | Terrace rows in the town layout (abutting lots, parking lots, plazas) | meets, must-fix 0 (three criteria unmet as worded) | regressions 0 |
| 051 C | Terrace packer (`terrace.ts`) | round 2 partly, **must-fix 1 open** | regressions 0 |
| 052 A | Pure dressing slots (`dressing.ts`) | round 2 meets, must-fix 0 | regressions 0 |

## Things Josh must decide or check
1. **Door fronts are guesses.** All 49 saved City Pack fronts are `+z` from clicking the first copy of each model. The 34 recipe pieces carry them as provisional. Nobody confirmed the stacks by eye except the main session, from screenshots.
2. **Large lots hold 4 bays, not 5, for apartment-01** (the 5.31 m roofs would overhang the lot).
3. **Tall street-repeat:** 2 repeats in 2203 tall checks on the ladder; tall has exactly 4 stack families. Accepted at 0.5% for now.
4. **Terrace criteria that cannot hold as worded (051 B):** only the 16 m cap tier ever occurs on the ladder; the far gap is under one bay, not 1e-6.
5. **Far gap closure (051 C):** whole bays cannot fill a run exactly (dead bands). The re-cut rule is "seam, or alley, never a slit": aim for a 1.0 to 1.5 m alley that 052 dresses. **Open must-fix:** the packer measured the gap to the deepest corner piece, not the real back wall, so the real figure is 49.4% seam-or-alley against an 85% floor (see `reviews/051-terrace-rows-c.md`). 051 D was told to fix it first.
6. **Edits to tests marked "keep unedited":** a few lot, facing, polygon and debug3d tests now run with `terraces:false` (named in the 051 B report).
7. **Ticket 049 (lit places) was left alone**, not approved, not on this branch. It conflicts with 050 C in `models.ts`.
