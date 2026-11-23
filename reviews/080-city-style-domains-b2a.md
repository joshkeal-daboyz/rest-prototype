ticket: 080-city-style-domains-b2a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
B2, first batch: condense `scale-and-lots.md`, `parking.md` and `light-and-accessibility.md` to `STANDARD.md` and mark them `standard: yes`, splitting 16.12 into `testing-daylight.md`. Quotes go to `decisions.md`, readings go to `evaluation.md`, and no rule changes meaning.

## Does the branch do it?
- **Condensed and marked.** All four files have the header, then Rules, then Open questions. Sizes are 7.1, 7.8, 6.6 and 4.0 KB, all under 8 KB. `index.md` maps 16.12 to the new file. The three guide tests pass on the branch with `--maxWorkers=2`: 117 passed, 1 skipped, 17.8 s.
- **Meaning, line by line against `origin/main`.**
  - `scale-and-lots.md`: the chapter-4 terrace, open-lot and far-end bullets are folded into 16.2. The rule content survives: seam or alley never a slit, the preference order, the real back wall, `packTown`, neighbours never share a style, no scaling. The Pending place-model scale becomes an Open question with the same content.
  - "the terrace's own bound is that each apartment style is 20% to 50%" now reads as a plain fact. It is the same claim.
  - **D-056b.** "the guide fixes how much parking is on the streets and how much is in parking lots, for residential and for business units" is faithful to Josh's request. The added first sentence, "the tile city does not have too many parking spaces", states as a fact a judgement that the old line did not make and that no check measures. This is not a change of meaning, because it was his intent, but it is the new claim in this batch (Could improve 2).
  - **D-056d.** I checked each default it confirmed. All still stand in `parking.md`:
    - the ratios (18.1: `PARK_PER_SHOP`, and `PARK_PER_HOME` 0.075)
    - build-outs in the band (18.5)
    - a record for every lot stall (18.4, `TileCity.lotStalls`)
    - no residents at the kerb (18.1: "Residents never count on kerb bays")
    - a home of two column-floors (18.2)

    Only "double both, not taken" is gone, and it is kept verbatim in the decisions row. None of these defaults carries `[D-056d]`, so a reader of the domain cannot see that Josh approved them (Could improve 3).
  - **18.3 avenue sentences.** "Longer sides fill first, with ties by id; the sides of an avenue would fill before them, and the tile city has no avenue" is the same order as before. It matches D-063f, which keeps the avenue-first order in code, unused. The caps sentence is equivalent.
  - **16.12 night bullet.** "today's" became "the look of chapter 11". Chapter 11 does not hold the values; it points back to `LIGHT_MODES.night`, so the bullet is now circular. D-060c ("leaves the game's night look of chapter 11 unchanged") still carries the meaning. The sentence that anchors it, "a test holds ... equal to a snapshot taken before the rig existed", moved to `evaluation.md` under "readings and history". That test is live: `lightrig.test.ts`, "night is unchanged on the three protocol maps". The same happened to "a test reads the source to hold this" (`lightrig.test.ts`, "one owner, by source"). Chapter 12 kept its line naming the tests that enforce it, so the two chapters are not treated alike (Could improve 1).
- **Every line that left a domain.** Each removed Decided or quoting line is verbatim in its `decisions.md` row: D-041a to D-042i, D-037a to d, D-060b to d, D-056a to f, D-041c, the new D-056g and the new D-060e. Each Info or measurement line and each cut fragment is verbatim under `evaluation.md`'s new "Moved from ..." block. I checked all of them against the old text.
  - Five parenthetical ticket references were deleted outright, which contradicts "nothing was deleted outright": "(ticket 070; ...)", "kerb cut (055 B)", "063 A", "drops are 041 C5", and "this chapter does not repeat them". `grep -F` over `docs/city-style/` finds none of them. They are provenance and cross-reference text, not rules, so I raise them only as a correction to the builder's claim (Could improve 4).
- **The rewritten test case.** The old case pinned `t18` (chapter 18's text) to "Josh's ruling of 19 Nov 2026" and "Yes, all four". The new case pins the same two strings in the D-056g row's verbatim line and pins `[D-056g]` in chapter 18. If the row is missing, the `!` throws and the case fails. No real check was lost: the case still fails if the ruling disappears from the record or the domain stops citing it. 0.075 itself is still pinned by the `t19` assertion beside it.

## Rule conflicts and risks
- The ticket's PR table gives B2 "0" new or rewritten tests, and this batch edits one case. The edit is forced: the moved text broke an existing assertion, and deleting the assertion would also count as a rewrite. No case was added and the test-policy cap is not reached. I do not treat it as a blocker, but Josh should know about it.
- D-056g is marked **Default**, though it records Josh's explicit "Yes, all four" ruling. Under STANDARD point 4 that would make it a **Rule**. The old parent line was a Default, so keeping it is faithful but inconsistent with the standard.
- I found no files outside the ticket's list, no `src/grid/` or `src/night/` change, and no new dependency.

## Must fix
none

## Could improve
1. `testing-daylight.md`, 16.12: put the two test pointers back in the domain, as chapter 12 does. That is "a test reads the source to hold this" and "a test holds the three protocol maps' lights, background and every material colour equal to a snapshot taken before the rig existed". Or name `lightrig.test.ts` there. They name live enforcement, not readings. Then the night bullet is anchored again instead of pointing only at chapter 11.
2. `parking.md`, 18.1, D-056b: drop or reword "the tile city does not have too many parking spaces". One option is "the counts are kept low so the drawn spaces do not overwhelm the view". The Rule should state what is fixed, not assert a verdict.
3. `parking.md`, 18.1 to 18.5: tag the five defaults D-056d confirmed with `[D-056d]`, or mark them Rule, so the domain shows Josh approved them. Do the same for D-056g (Rule rather than Default).
4. The builder's reply should list the five deleted ticket references, or they should be added to `evaluation.md`'s moved block, so the "nothing deleted" claim is true.
