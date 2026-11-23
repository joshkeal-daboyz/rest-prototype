ticket: 080-city-style-domains
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Round 2 of B2c. I checked only fix commit c6809d7 against round 1: the must-fix, D-057l, the 19.6 promotion, the restored ticket tags with STANDARD point 2 and the regex, and anything else the commit changed.

## Does the branch do it?
- **Gate.** `tsc --noEmit` is clean. `styleguide`, `stacktown` and `terracepack` (`--maxWorkers=2`) pass: 117 passed, 1 skipped.
- **(a) Round 1's must-fix is done.** `door-sills.md` line 17 no longer states the per-piece lift. It says "Each ground piece's lift is the Default of `docs/city-style/sill-lift.md`", and `sill-lift.md` keeps the lift as `Default (062)`. The lift is now stated in one place.
- **(b) D-057l is done.** It now reads "grass and pavement fill the blank areas", which is Josh's quote without "should". "Inside a block" is gone.
- **(c) The 19.6 promotion is only partly supported.** Ticket 057 line 6 ("F and G confirmed ... 'Approved and confirmed'") supports the G text as it stood at confirmation: the draft at ticket lines 180-200. The four promoted lines also carry text written after that confirmation (must-fix 1). D-057q (057 D) is rightly left Default: D was approved "before he saw this text" (line 4).
- **(d) The tags are acceptable.** `Default (042) [D-042a]` is the right single ticket: the row's Josh words are 042's, and `evaluation.md` line 330 keeps the old `041 B4, 042 A` tag. The other restored tags match their rows' tickets (052, 057, 061, 042). STANDARD point 2 now documents the new form.
- **(d) The regex was not weakened.** The old pattern already accepted a bare `Default` and `Default [D-…]`. The new `Default( \(\d{3}\))?( \[D-…\])?` only adds the combined form. It is no stricter either (could-improve 1).
- **(e) Nothing out of place.** The fire-escapes blank line and the D-057m link to D-056g are round 1's could-improves 2 and 3. I found no other meaning change and no file outside `docs/city-style/` and the one test line.

## Rule conflicts and risks
- The `Rule [D-057o]` lines mark later, unapproved work as Josh's decision. That is the same STANDARD point 4 break that round 1's must-fix fixed for 062. Examples I looked at:
  - **Alley sub-bullets** (`alleys-and-parks.md` lines 13-16):
    - The alley side is "a quiet frontage with a row of its own (grammar rule 9)". The G text Josh confirmed says "the alley side is a rear (apron), not a frontage" (ticket line 186).
    - The alley-court bullet is "G as built (recorded 19 Nov 2026 from the G review)" (ticket lines 322-325), written after the confirmation.
  - **Parks line** (line 22): the `planBlocks` pipeline sentence is from after 057.
  - **Mix table:**
    - The `large` row adds "an alley if a side is at least `ALLEY_SIDE_LONG_M`".
    - The `small` row changes "1 in 3" to "by hash".
    - Neither change is in G's table (ticket lines 196-201).
  - **Alley rates** (line 18) add the `ALLEY_SIDE_MIN_CELLS` (45 m) condition, which G's rate does not have.

## Must fix
1. In `docs/city-style/alleys-and-parks.md`, 19.6, keep `Rule [D-057o]` only for what ticket 057's G text (lines 180-200) says. Keep it by splitting each line, or by moving its additions to their own `Default (057)` (as built) or `Default (063)` (pipeline, grammar rule 9) lines:
   - the quiet-frontage alley side;
   - the alley courts;
   - the `planBlocks` sentence;
   - the 45 m side condition;
   - the changed mix rows.

   Or return all four lines to `Default (057)` and record in the D-057o row that Josh's confirmation covered G's draft. Either way, no Rule line carries a default Josh did not approve.

## Could improve
1. Make the drift test require a ticket on every Default: `Default \(\d{3}\)( \[D-…\])?`. The B2c files still have bare-id Defaults, for example `buildings.md` D-048a and D-050a. Other batches have them too (`corner-buildings.md`, `streets-and-blocks.md`), so do it once all batches are done.
2. The D-057o row's new-home cell should quote "Approved and confirmed", or point to ticket 057 line 6, so the Rule's id resolves to Josh's words.
