# 053 · The procedural city chapter of the style guide, and how to judge a city against the reference

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open. G1 waived for the city-style goal (Josh, 18 Nov 2026, in chat). Builds last: after 050 C, 051 D and 052 C merge.
branch: `ticket/053-procedural-city-guide`

## Josh's words
> "leverage the city pack and establish a style guide that will allow you to build procedural cities by leveraging the city pack... a city guide that is able to yield similar quality results to that city in the image excluding the humans, animals and vehicles." (18 Nov 2026; approvals waived for this goal)

## Goal
Anyone (Josh, the main session, a future agent building the 3D game) can read one chapter of `docs/city-style-guide.md` and know how a City Pack city is generated: the grammar from lot to roof prop, every variety and density rule with its number, what the pack lacks, and how to check that a generated street matches the reference image (which maps, which camera presets, which checklist), with the measurable part of that checklist run by a test on every `npm test`.

## The design
1. **Chapter 16, "Procedural city"**, in the guide's existing form (every rule tagged Decided, Default, Pending, Open or Info; numbers only in the Numbers table):
   - 16.1 **Grammar**: town window, outer block, row, run (051), block (one stack: 050), column (a bay), storey (base, floors, roof), slot (052), prop; and the open lots. One line each: what it is, which file makes it, which rule picks it.
   - 16.2 **Lots and runs**: rows to runs, nominal bays, cap tiers by the occlusion rule, open lots, the flush packing and the seam (051).
   - 16.3 **Blocks**: recipes, floor ranges, the ground row, corner blocks on true corners only (Josh's 042 A words, quoted), fronts and `open` sides (050).
   - 16.4 **Variety**: neighbour, street-repeat and share rules applied to stacks; neighbours differ in style and floor count (050 C, 051 C).
   - 16.5 **Dressing and furniture**: each slot, its probability and caps, the attachment rule, the keep-outs, instancing, never lit, never picked (052).
   - 16.6 **Exclusions and gaps**: the "Never used" list with each reason; the "Missing from the pack" list (052 findings) as **Open** lines.
   - 16.7 **Fallbacks**: no `city-pack` gives the placeholder terrace; a missing key drops only its placements.
   - 16.8 **Evaluation protocol** (design item 2).
   - Chapters 3, 4, 5, 7 and 13 get one-line cross-references to 16 where they touch it; nothing they say is retyped.
2. **The evaluation protocol** (16.8):
   - **Maps**: `09-shrine-circuit` (the 050 to 052 test map), `64-the-whole-chain` (the largest town), `01-first-light` (the smallest).
   - **Views**, all `npm run dev`, `view=3d`: the play view (must read exactly as on `main`); `cam=street&run=0`, `&run=1`, `&run=2` (the three longest runs, `at=0.5`); `&run=0&at=0` (a corner block); each again with `&light=day`; the stack gallery `gallery=city-pack&stacks=1&dress=1`. Wait for the `street camera:` console line before a screenshot.
   - **The reference checklist** (R1 to R12), each marked **auto** (checked by `citymetrics.test.ts`) or **eye** (from the screenshots): R1 continuous frontage, no gap between neighbours but one open lot per run (auto); R2 3 to 5 storeys, neighbours differ (auto); R3 every ground bay a shopfront or the one door bay (auto); R4 glass in every shop with a glass key (auto); R5 awnings on most shop bays, uniform per block (auto); R6 a sign on most shopfronts, an ATM on some blocks (auto); R7 fire escapes on street faces of most blocks of 3 bays or more (auto); R8 every roof dressed, at least one big roof prop per run (auto); R9 corner blocks only on true corners, two street faces (auto for placement, eye for the second face); R10 street furniture spaced along the pavement, not cluttered (auto for spacing, eye for clutter); R11 a parking lot and a corner plaza on the map (auto); R12 no people, animals or vehicles, nothing glows, the circuit reads as on `main` (auto for keys and emission, eye for the circuit).
   - **What "matches the reference" means**: every auto item passes on all three maps, and every eye item passes on every screenshot listed; a fail names the item, the URL and what is wrong. The main session records the result as a table in the review it shows Josh.
3. **`citymetrics.ts`** (pure): `cityMetrics(town, packed, dressing, furniture)` gives the numbers behind each auto item (frontage covered per run, the far-gap histogram, the storey histogram, the neighbour-differ rate, slot counts per bay, props per roof, keep-out violations, excluded keys used, emissive materials). `citymetrics.test.ts` runs it on the fixture plan over every map and asserts each auto item's threshold (`CITY_CHECK`), so the protocol's auto half runs on every `npm test`.

## Sections
One section (about ¾ day): the chapter, the protocol, `citymetrics.ts` and its test, the Numbers rows.

## Acceptance criteria
**CI-safe rules.** Fixture entries only (050 to 052's fixtures, reused). No test reads `assets/private/` at module or `describe` level; a manifest check stays inside an `it` and skips when the file is absent. No Windows paths, no timer under 1 s, no wall-clock wait. Nothing from `assets/private/` is committed or bundled.

1. [ ] (Vitest) `styleguide.test.ts` green, with Numbers rows for every exported constant of `stacks.ts`, `terrace.ts`, `dressing.ts`, `furniture.ts`, `streetcam.ts` and `citymetrics.ts` (`CITY_CHECK` as a record row), and the town.ts `TERRACE_*`, `PARKING_*`, `PLAZA_*` rows from 051 B. A new drift check fails if any of those files exports a numeric constant with no row.
2. [ ] (Vitest) A new drift check: chapter 16's "Never used" list equals the code's excluded-key list exactly, and every key in it is absent from every rule table.
3. [ ] (Vitest) `citymetrics.test.ts`: on the fixture plan, every auto item R1 to R12 meets its `CITY_CHECK` threshold on every map; each threshold is exercised by a fixture that fails it (so the check can fail).
4. [ ] (Vitest) Chapter 16 names each of R1 to R12, each view URL, and each map; the test checks the URLs parse with `streetCamRequested` and the maps exist in `puzzles/`.
5. [ ] (Main session) Runs the protocol on the three maps: all auto items green in `npm test`, and the eye items judged on the listed screenshots, recorded as a table for Josh.
6. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser.
7. [ ] (Main session) `npm run gate` green and the test count grew; `npm run playtest` green with no snapshot change; `git diff main -- src/` touches only `src/render3d/citymetrics.ts`, `citymetrics.test.ts` and `styleguide.test.ts`; `git ls-files assets/private` empty.

## Files
- **Renderer, may touch:** `docs/city-style-guide.md` (chapter 16, Numbers, one-line cross-references in 3, 4, 5, 7 and 13); new `src/render3d/citymetrics.ts` and `citymetrics.test.ts`; `src/render3d/styleguide.test.ts` (the new drift checks only; its existing checks unedited).
- **Must not touch:** every other file in `src/`; `tests/`, `puzzles/`, `tools/`, `package.json`, `public/`, `index.html`; anything under `assets/`. A rule the chapter finds wrong is reported for a re-cut, not fixed here.

## Interfaces
- **No `src/core/` change, no schema change, no event change, no new dependency.**
- **Local to `src/render3d/`:** `citymetrics.ts`: `CityMetrics` (one field per auto item), `cityMetrics(...)`, `CITY_CHECK: Readonly<Record<"R1" | ... | "R12", number>>` (defaults: R1 frontage covered at least 0.9 per run outside open lots; R2 neighbour-differ 1.0; R5 awned shop bays at least 0.6; R6 signed shop bays at least 0.5, ATM blocks at least 0.15; R7 escape share of qualifying blocks at least 0.5; R8 dressed roofs 1.0; R10 keep-out violations 0; R11 at least one parking lot and one plaza on `64-the-whole-chain`; R12 excluded keys and emissive dressing 0).

## Open questions (decided defaults; nobody was available to answer, Josh may overturn any)
1. **Where the chapter lives.** Default: chapter 16 of `docs/city-style-guide.md`, not a new file, because the drift test already reads that file and the guide is the one written record (043).
2. **Daylight in the protocol.** Default: every street view is judged at night and with `light=day`. The reference is daylight; form, density and variety are judged in day light, and the night views make sure the city still reads dark around the circuit.
3. **Who judges the eye items.** Default: the main session, from screenshots, recorded for Josh; Josh's own verdict, when he gives one, goes in chapter 16 as **Decided** with his words.

Decided rules: none is touched (documentation and a test); `rules-coverage.md` does not change.
