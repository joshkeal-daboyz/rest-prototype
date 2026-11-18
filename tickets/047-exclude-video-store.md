# 047 · The video rental store is never placed

owner: renderer (src/render3d/)
status: open
branch: `ticket/047-exclude-video-store`

## Josh's words (18 Nov 2026)
> "what about the video rental store, ignore it... it's part of the small package. The polygon buildings are much higher quality"

This answers 042 Q3 and 043 Q6: the video rental store (`store_small_mesh`, key `simple-town:store_small_mesh`) is excluded. It also confirms 043 Q4's answer (the POLYGON City and Town packs are the target building style); that part is ticket 048.

## Finding (checked against `main` at `1155417`, 17 Nov 2026; no browser)
- `BUILDING_EXCLUDE` in `src/render3d/models.ts` is `[]`. Its doc comment still says the store goes there "once he names it".
- `store_small_mesh` is its own mesh family in the small row. The small row has ten names in seven families: `Shop_01/02`, `Shop_03..05`, `BaberShop`, `Gym`, `store_small_mesh`, `store_corner_mesh` (corner only) and `apartment_small_mesh`. Without the store the small type has nine names in six families, five of them ordinary (not corner-only).
- The variety rules still have room. Neighbours, the street-repeat rule and the share cap apply only to types with four or more families, and six is still more than four. Five ordinary families at `FAMILY_SHARE_MAX` 0.25 can still cover a type's lots (5 x 0.25 > 1). `STREET_REPEAT_GAP` 3 needs four or more families to rotate through, and five are left.
- Tests that pin the list or the count today:
  - `calibration.test.ts` "keeps BUILDING_EXCLUDE empty";
  - `facing.test.ts` "never places a name in the exclude list..." (`expect(BUILDING_EXCLUDE).toEqual([])`);
  - `facing.test.ts` "gives the small row's ten names seven families..." (10 and 7);
  - `facing.test.ts` "spreads the small type's ordinary families evenly..." (`ordinary.length` 6);
  - `styleguide.test.ts` "lists every key in BUILDING_EXCLUDE in the choosing chapter, and says it is empty when it is". It needs no edit: it will require the guide to name the key and no longer require "is empty".
- `store_small_mesh` keeps its row in `MODEL_TABLE` and its "+z" line in `BUILDING_FRONTS`. The gallery still shows it, marked `excluded`, so its calibration stays on record.

## Goal
On every map the 3D town never shows the video rental store. Its small lots go to the other small-lot families, and every variety rule still holds. The style guide records the exclusion as Decided, in Josh's words.

## Acceptance criteria
- [ ] (Vitest) `BUILDING_EXCLUDE` equals `["simple-town:store_small_mesh"]`. The test in `calibration.test.ts` and the one in `facing.test.ts` that pinned `[]` now pin this list.
- [ ] (Vitest) `buildingPlan(set.building)` on the fixture: `plan.small` has nine names in six families and does not contain `store_small_mesh`. The family test is renamed to say so.
- [ ] (Vitest) Across every map, `pickBuildings` never returns `store_small_mesh`.
- [ ] (Vitest) The small-type variety tests still pass on every map, unchanged except for the counts: three or more families per type and four or more in small, house and large; no neighbours of one family; no repeat within `STREET_REPEAT_GAP`; the `FAMILY_SHARE_MAX` cap; the most-used ordinary family at most 1.5 times the least used, with `ordinary.length` now 5; the corner shop only on valid corners and under a quarter of the least-used ordinary family; and `Shop_03..05` against `Gym` between 0.66 and 1.5. If any of these fails with the store gone, the builder stops and reports the numbers. The builder does not loosen a limit; that is a re-cut.
- [ ] (Vitest) `styleguide.test.ts` passes unedited: the guide names `` `simple-town:store_small_mesh` `` in chapter 5 and no longer says `BUILDING_EXCLUDE` is empty.
- [ ] (Guide) In `docs/city-style-guide.md` chapter 5, the Pending entry (043 Q6, 042 Q3) becomes **Decided (047, Josh, 18 Nov 2026: "what about the video rental store, ignore it... it's part of the small package. The polygon buildings are much higher quality")**, saying the store is excluded through `BUILDING_EXCLUDE` and stays in `MODEL_TABLE` and the gallery. The Info line "`BUILDING_EXCLUDE` is empty, so the guide lists no excluded key" becomes one that lists the key. The Default (042 Q3) line drops "It is empty today". Nothing else in the guide changes.
- [ ] (Code) The doc comment on `BUILDING_EXCLUDE` is updated to name the store and Josh's ruling. No other line of `models.ts` changes.
- [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser.
- [ ] (Josh checks, optional) `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d`: no video rental store anywhere in the town. `&gallery=simple-town` still shows it, captioned `excluded`.

## Files
- **May touch:** `src/render3d/models.ts` (the `BUILDING_EXCLUDE` line and its comment only); `src/render3d/calibration.test.ts` and `src/render3d/facing.test.ts` (the pins and counts above only); `docs/city-style-guide.md` (chapter 5 only).
- **Must not touch:** every other file, including `styleguide.test.ts`, `gallery.ts`, `town.ts`, `MODEL_TABLE`, `BUILDING_FRONTS`, `assets/` and `puzzles/`. A builder that needs one stops and asks for a re-cut.

## Interfaces
None. No new types, events or dependencies.

## Open questions
None. Josh's words settle it.

## Within approved scope?
Yes. It applies a rule Josh just gave to data that already exists. No Decided GDD rule, dependency or schema is touched, and `rules-coverage.md` does not change.
