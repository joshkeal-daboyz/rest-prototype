ticket: 080-city-style-domains-b2b
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Round 2, fix commit e6bbb01 only. Round 1 (`reviews/080-city-style-domains-b2b.md`) asked for one must-fix: D-063c goes back to Default. It also offered could-improve rewordings, and those must now say no more and no less than their old lines in the `decisions.md` mapping table.

## Does the branch do it?
- **Must fix 1 (D-063c) is done.** `corner-buildings.md:32` now reads **Default [D-063c]**. In `decisions.md` the row's new-home cell says "Default: ..." and the "(promoted from Info ...)" note is gone. No other file still claims a Rule for D-063c.
- **D-057r matches.** The old quote is "90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks". The new line keeps "does not mean a grid of squares", and "may vary" / "may break them up" are permissions again. "(19.6)" only points to a section and adds no rule. The quote's "etc" is dropped, which is harmless.
- **D-053c matches.** The quality goal is back: "of similar quality to the reference, leaving out people, animals and vehicles", the same as "similar quality results to that city in the image excluding the humans, animals and vehicles". The second sentence is unchanged. The approval-waiver sentence is still verbatim in `evaluation.md:292`.
- **D-042a matches.** "exist because of the ruling recorded in this row" says the same as "exist because of these words", and it no longer claims the rules stand.
- **The D-063g BLEND sub-bullet matches.** "the one piece among those the tile view used whose material is BLEND" has the same scope as the old "the only piece the tile view used whose material is BLEND" (`evaluation.md:256`).
- **Out-of-scope changes: none.** The commit touches only `docs/city-style/` (9 files, +11 / -9).
  - The other edits are round 1's could-improve items: the Depends lines in `packs.md` and `scale-and-lots.md`, the pointer in `fronts.md`, and the two 19.5 phrases restored in `evaluation.md`.
  - The new Depends targets (`fronts.md`, `corner-buildings.md`, `block-stacks.md`) exist.
  - No mapping-table old-line cell changed. The only `decisions.md` edit is the D-063c new-home cell.
- **Tests.** I ran `styleguide`, `stacktown` and `terracepack` with `--maxWorkers=2`: 117 passed, 1 skipped (the manifest case, no assets).

## Rule conflicts and risks
none found

## Must fix
none

## Could improve
1. The D-042a row's new-home cell (`decisions.md:73`) still says "Rule: the variety rules stand". That label no longer matches the reworded line. It could read "Rule: the reason the variety rules exist".
2. The added line at the end of `evaluation.md` has a blank line before it, so it renders as a separate list. Joining it to the bullets above would tidy it.
