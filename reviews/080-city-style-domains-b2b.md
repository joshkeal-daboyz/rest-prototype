ticket: 080-city-style-domains-b2b
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
B2: condense `streets-and-blocks.md` and `buildings.md` to `STANDARD.md` (here split into `block-grammar.md`, `block-stacks.md`, `fronts.md`, `corner-buildings.md`, `colourways.md`), with quotes moved to `decisions.md` rows and readings to `evaluation.md`. No rule may change meaning (ticket 080, B2 first bullet).

## Does the branch do it?
- **Condensed and marked.** All seven files say `standard: yes`, have the fixed shape, and are under 8 KB (the largest is `streets-and-blocks.md`, 7447 B). The index maps every new file. `styleguide.test.ts`, `stacktown.test.ts` and `terracepack.test.ts` with `--maxWorkers=2` give 117 passed and 1 skipped (the manifest case, no assets).
- **Nothing dropped from the mapping table.** I diffed it against `ticket/080b2-scale-parking-light`. 115 rows before, 116 after. No old-line cell changed. The one new row is D-042m (the `store_corner_mesh` Info line, verbatim). Every row of these two files now has a new home.
- **Lines that left a domain.** I checked every old line not found in a new domain against `evaluation.md` and `decisions.md`. All are there verbatim (the Info measurements, the "From ..." fragments, the cut tags) except two phrases from the old 19.5 Info line: "the draft did not have" and "They are tuning choices". Those were deleted outright (could improve 2).
- **Tables.** The fronts and corner tables (Name, Front, Open) are identical to the old ones as sets. Only the Note column was reworded, and its old notes are listed in evaluation.md. The colourway id table is identical line for line.
- **The three touched test cases.**
  - The colourway regex no longer checks "waits for", but the standard-wide check at `styleguide.test.ts:317` requires `Waits for:` on every Open line in a `standard: yes` file. `colourways.md` has it, so no check was lost.
  - The `stacktown.test.ts` SAVED_AT case now reads the date from `evaluation.md` (D-050b, verbatim) and "provisional" from `fronts.md`. Both are real.
  - The chapter case now joins `buildings.md`, `fronts.md`, `corner-buildings.md` and `packs.md`. The headings `## 5.`, `## 6.` and `## 7.` sit one in each file, so each chapter slice is still bounded.
- **Statuses.** D-048a, D-050a, D-063f, D-063j, D-063l and D-063n are rightly left Default. Each is a question default with Josh's reason or his goal waiver, not his answer. D-063c is not supported (must fix 1).
- **Rewordings.** I read the named rewordings against their rows. D-042c, D-042e, D-042j, D-063g, D-063h, D-063m and the D-050e/D-050c merge keep their meaning. D-053c, D-042a, D-057r and D-063k shift slightly. Josh should read them side by side (below).

## For Josh, side by side
- **D-042a.** Old: "the variety rules above exist because of these words." New: "the variety rules above (neighbour, street-repeat and share) stand." The new line claims a ruling that the rules hold. The old one said his words were their reason. The three rules themselves are still marked Default (041) two lines above.
- **D-057r.** Old: "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc". New: "streets are at 90 degrees, but the city is not a grid of equal squares: blocks vary in width, and alleys and parks (19.6) break them up." His "you can have" becomes "blocks vary": a permission stated as a requirement.
- **D-053c.** Old: "this chapter is that guide. It is a grammar: ..." (that guide being the one "able to yield similar quality results to that city in the image"). New: "chapter 16 is a grammar. ..." The quality goal is no longer in the rule. Only the reference paragraph after it keeps it.
- **D-063k.** The new rule adds a sub-bullet, "Kerb structures follow the kerb, and the kerb may stretch out in spots." This is his quote, now stated as rule content. The old rule body did not have it. It is faithful to his words, but it is new text in the rule.
- **D-063e.** Unchanged in content. Note, though, that ticket 063's Q-B says "no avenues" was "adopted under the goal waiver". His words were "The streets do not need to be 4 tiles wide." The old line was Decided, so Rule keeps the old status.

## Rule conflicts and risks
- D-063c claims a Josh ruling that ticket 063 records as an unanswered default (must fix 1).
- Stale Depends lines in domains outside this batch now name the wrong file (could improve 1).

## Must fix
1. **D-063c is promoted from Info to Rule without Josh's answer.** In `docs/city-style/corner-buildings.md`, the line "**Rule [D-063c]**: the corner pieces' turn applies to the ladder maps' corner stacks too" is not supported.
   - The row's old line says "Josh's answer to the ticket's Q-E, the architect's default". But `tickets/063-uniform-sidewalk-and-street-width.md`, lines 422 to 428, lists "**Q-E:** fix the ladder too" under "**Defaults still standing**". It sits there with Q-A (grates), Q-F (returns) and Q-H (inlet paving), which this batch rightly keeps as Default (D-063j, D-063l).
   - Fix: mark it **Default [D-063c]**, and drop "(promoted from Info: ...)" from the row's new-home cell in `decisions.md`.
   - Effect: the domain no longer states as Josh's decision something he did not answer.

## Could improve
1. **Repoint the stale Depends lines.**
   - `docs/city-style/packs.md` line 6 sends "fronts and corners" to `buildings.md`. They are now in `fronts.md` and `corner-buildings.md`.
   - `docs/city-style/scale-and-lots.md` line 6 sends "stacks and corner blocks" to `buildings.md`. They are now in `block-stacks.md`, and the pinwheel it cites under `streets-and-blocks.md` is still there, which is correct.
   - In `fronts.md`, "listed in this chapter or the next" should name `corner-buildings.md`, since the next chapter is now another file.
2. **Restore the deleted 19.5 phrases.** Add "the draft did not have" and "They are tuning choices" to evaluation.md's "From the as-built bullet of 19.5" lines, so the moved text is whole.
3. **D-063g sub-bullet.** "it is the one piece whose material is BLEND" is broader than the old "the only piece the tile view used whose material is BLEND". Restore "the tile view used".
4. **D-042a.** Either mark the three variety bullets Rule [D-042a], or word D-042a as the reason they exist, so the status is not split across two lines.
