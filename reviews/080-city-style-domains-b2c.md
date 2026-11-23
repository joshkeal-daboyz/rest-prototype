ticket: 080-city-style-domains
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
B2, third batch: condense `facades.md` and `frontage-and-interiors.md` to `STANDARD.md`, split them by subject, move readings and walkthroughs verbatim to `evaluation.md` and quotes to `decisions.md`, change no rule's meaning, and leave every domain `standard: yes`. Reviewed only d0c0ed0 and 7cba102.

## Does the branch do it?
- **Gate.** `tsc --noEmit` is clean. `styleguide.test.ts`, `stacktown.test.ts` and `terracepack.test.ts` (run by name, `--maxWorkers=2`) pass: 117 passed, 1 skipped. No test file changed, which fits B2's limit of 0.
- **Condensed and split.** All nine files have the header, Rules and Open questions, and all are under 8 KB (the largest is `fire-escapes.md` at 7,910 bytes). Every domain says `standard: yes`. Every file in `docs/city-style/` is in `index.md`.
- **Readings moved verbatim.** I checked every line that left the two old files against `evaluation.md` (the new "Moved from facades.md and frontage-and-interiors.md" section, the fragments and the tag list) or the old-line column of `decisions.md`. Nothing was deleted outright. The 19.8 surface walkthrough (grass, pavement, court, lane, props, pads) went to `evaluation.md`, which point 5 requires.
- **Mapping rows.** Every changed row names its new file and id. The drift test's mapping case checks that each `verbatim` row still lives in a non-domain file. The rows still marked verbatim are the "Not yet built" lines in `decisions.md` and the 16.8, 18.8 and 19.7 lines in `evaluation.md`. I also checked D-043c by hand: its text is in `evaluation.md` (it is also in `packs.md`).
- **Sill table.** It is whole in `sill-lift.md`: 40 rows, identical to the old ones. The 16.10 table case passes.
- **Depends lines, section pointers, reading lists.** Depends lines are repointed in `block-grammar`, `exclusions`, `packs`, `parking` and `streets-and-blocks`. I found no stale pointer to `facades.md` for 16.10 or 16.11, or to `frontage-and-interiors.md` for 19.4, 19.6 or 19.8, in `docs/`, `.claude/agents/` or `src/render3d/`. The reading lists of `facades.md`, `landscape.md`, `planner.md` and `streetscape.md` cite files that exist and hold the sections they cite.
- **Statuses.** One promotion carries more than Josh approved (must-fix 1). The others hold:
  - **D-055h, Q10 to Q13.** Promoting them is defensible. Ticket 055 line 341 says "answered 18 Nov 2026: every default applies, 'Approved and confirmed'", and line 7 says "with Q10 to Q13 at their defaults". Unlike 057 and 058, it does not say he approved before seeing the text. "Relayed by the main session" is how every approval in these tickets is recorded, so it is no weaker than the others. Josh may still want to confirm it.
  - **D-057p.** Supported: ticket 070 D1b quotes the yes/no questions and his answers, "yes" (lever M, line 502 and criterion 12) and "yes, yes" (PB, criterion 13).
  - **D-057s.** Supported, though narrowly. Grammar line 161 is Josh's "Yes, retire them" to retiring the gated passages, and line 320 tightens G2 on it. "A row always closes" is rule 6's own statement (line 155), so the row's new home rightly cites the grammar.
- **Left Default, rightly.**
  - 058 and 057 A to E: approved "before he saw this text" (both tickets' status lines).
  - 062: the G1 was "Merge 055 F", not approval of 062's defaults.
  - 061's mechanics: "Yes, cut it" approved the cut, not how it works.
  - D-052a: Q26 answered H1c's novelty-sign questions, not the roof-prop mechanics.
  - D-057m: the 0.075 it repeats is already Rule D-056g in `parking.md`.
- **Carried item (041).** The variety rule's tag was originally `Default (041 B4, 042 A)`. That tag is recorded in `evaluation.md` line 330 ("From chapter 5: the tags ... Default (041 B4, 042 A)"), so the 041 reference survives there and nowhere in `buildings.md`.

## Rule conflicts and risks
- One Rule line now carries a 062 default (must-fix 1).
- 057 F and G were "Approved and confirmed" in the same words as 055 F (ticket 057, line 6), yet `alleys-and-parks.md` keeps them Default. Both choices can be argued, but they are inconsistent. This is Josh's call (could-improve 1).
- Rewordings for Josh to read side by side:
  - **D-055h** (Decided line). Old: "a building's door sill is measured ... sunk until its door meets it. Josh said this when house foundations stood higher than the street, so that no one could walk in. The rest of this section is the defaults the ticket chose to meet it (approved with ...)". New: the first sentence only. The gloss and the approval note survive only in the row.
  - **D-057f.** Old: "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them." New: "a building may rest on top of the sidewalk and overlap it a little. It does not sit recessed from the sidewalk and leave a gap of nothing between them." The permission is kept and nothing is added.
  - **D-057l.** Old: "Grass and pavement should fill the blank areas." New: "grass and pavement fill the blank areas inside a block." "Inside a block" is a scope the quote does not state. It matches 057 Q1 and the 19.4 heading, but it is narrower.
  - **D-057k.** Old: "this replaces, for the tile city only, 055's far-gap share (...), and retires 056 A's temporary far-gap floors". New: "for the tile city only, the far-gap share ... and the temporary far-gap floors do not apply." "Retires" became "do not apply", now under the tile-city-only scope. As far as I can tell they were tile-city floors anyway, so the meaning holds.
  - **D-057i.** The domain no longer says this re-cuts Josh's "Keep the inset". That sentence is only in the D-057i row (and in D-055f).
  - **D-058b, D-061a, D-061b, D-057p (split), D-057n, D-057q.** Only quotes and readings were cut. I found no meaning change.

## Must fix
1. In `docs/city-style/door-sills.md`, line 17, the sink-first line is `Rule [D-055h]`, but it contains "Its ground pieces are then lifted one by one so each door meets the walk (`docs/city-style/sill-lift.md`)". That is 062 B's per-piece lift, added to the old Q12 line after Josh's approval. In `sill-lift.md` the same lift is `Default (062)`, and Josh never approved 062's defaults. As written, a 062 default is marked as Josh's decision, which breaks STANDARD point 4 and B2's "no rule changes meaning", and the lift is stated in two places. Fix: take that sentence out of the Rule line, or replace it with a plain pointer such as "then lifted per piece by `sill-lift.md`'s Default". Then a Rule line holds only the Q10 to Q13 defaults he approved.

## Could improve
1. Settle one test for "explicitly approved", and apply it to both cases. Ticket 057 line 6 confirms F and G with the same "Approved and confirmed" that promotes 055 F's Q10 to Q13. Either promote 19.6's defaults or note in the D-055h row why 055 F differs. Put this to Josh.
2. `fire-escapes.md`, line 27: the `escapeCheck` paragraph follows the last bullet with no blank line, so Markdown reads it as part of the Apartment_03 bullet. Add a blank line.
3. `block-interiors.md`, D-057m: link to Rule D-056g in `parking.md` for the 0.075 instead of restating it in a Default (one rule, one place).
4. `door-sills.md` and `sill-lift.md` say "Read by: facades", but `.claude/agents/facades.md` cites neither. It did not cite 16.10 before either, so this is optional.
