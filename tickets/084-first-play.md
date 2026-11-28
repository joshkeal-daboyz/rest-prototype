# 084 · First play: generic building names, the old puzzles out, a goal marker, an idle pulse, first-time labels, a guided start, teaching traps and a tips box

owner: per section (lead-architect, ui, puzzle-designer, renderer, grid-simulator, interaction; see Sections)
status: approved (G1, Josh, 28 Nov 2026, on a card: "Approve (Recommended)"). Re-cut the same day for his answers below (sections M1 to M6 added; A3 and A4 widened). Re-cut again on 28 Nov 2026: section T (the tips box, Josh's request below) and A1b (the conversion drops `guide` and `tips`, a gap D1's builder found) added; E2a and E2b widened for their tips; A5 re-cut for `tools/check.test.ts:255` (A3's review); A3's city note named `city-two-ways-round.city.md`, as built. T, A1b and the E2 and A5 changes approved (G1, Josh, 28 Nov 2026, on a card: "Approve (Recommended)"); T-1 to T-3 answered (section T).
branch: `ticket/084-first-play` holds this cut (this file, `src/core/onboarding.ts`, the `guide` field on `CityPuzzle`, and two rows of `tickets/rules-coverage.md`). One branch per pull request: `ticket/084<x>-<slug>`, from `main`.

## Josh's answers (28 Nov 2026, on cards, relayed by the main session)
- **G1:** "Approve (Recommended)".
- **Open question 1, `tb-two-clocks`:** "It goes too (Recommended)". A6 deletes it.
- **Open question 2, the 66 schematic panels:** "Remove them too". The option he picked read: "The architect adds a ticket to move those tests off them first." Sections M1 to M6 do that (one ticket, as for the rest of 084, in its own PRs).
- **Open question 4, the "why" line:** "Replace (Recommended)". E1 stands as written.
- **Open question 3, faults pulsing, was never put to him.** His earlier card answer stands: "Idle pulse (Recommended)", breakers and switches only. B's idle pulse is on breakers and switches (relays while live) and on nothing else.

## Why: a first play (Alice, relayed 28 Nov 2026)
A first-time playtester, new to this kind of game, played series v1 (probably the itch build, ticket 083). Her words, in short:
- She found the switch obvious, but not what the box saying "2 of 3" means, the box with a lightning bolt (the feed), or the +/- numbers beside controls (the load a move adds).
- "When you say, turn off the bathhouse, how do I know which one is the bathhouse?" Clicking the goal name centres the camera, but she never found that out.
- "I don't know what's clickable and what's not clickable."
- She cleared levels 1 to 3 by clicking at random, then got lost at level 6.
- She mentioned performance (the game may run slowly on her machine).

## Josh's decisions (28 Nov 2026, on cards, relayed by the main session; not G1)
1. **Symbols:** "First-time labels (Recommended)". The first time a puzzle shows a symbol (feed, load box, +/- load numbers, and the other node glyphs), a one-time callout points at it with a short plain line. No legend panel, no readout rewording. (Sections B and C.)
2. **Finding the goal:** "Marker over building (Recommended)": a floating icon and name over each goal building that pulses until lit, plus an edge-of-screen arrow when it is off screen. (Section B.) And, in his words: "I think that the names should be generic for now. Part of the problem is that the buildings don't currently look like the titles. Building 1, 2 & 3 would be less confusing." (Section A.)
3. **Clickable:** "Idle pulse (Recommended)". Breakers and switches get a soft ring or pulse before any hover. (Section B.)
5. **Tutorials:** "Both (Recommended)": step-by-step guidance for s01 to s03 (point at the control, explain, let the player try), and s04 to s10 re-laid so each has a tempting wrong move that visibly fails, with the prompt saying why (for example "Too much load: 4 of 3"). The re-lay is puzzle-designer work, run on model Fable 5.2. Josh, 26 Nov 2026: 1 to 10 "are literally just to teach you the basics". (Sections D and E.)
6. **Performance:** "Ask Alice first (Recommended)". Nothing is built yet. (Section F, a placeholder.)
- **Generic names:** "All 25 series puzzles + remove the old puzzles." Every goal and prompt in s01 to s25 uses Building 1, 2, 3, numbered per puzzle. (Section A.)

## What exists (read at 24e6e2b)
- **Where a building's name shows.** Only in the HUD's "Priests want lit" list: `targetRows` in `src/ui/logic.ts` writes `placeName(id)` (the lamp id with `_` as spaces, so `bath_house` reads "bath house"). Clicking a row, or Enter on it, calls `onShow`, and `src/main.ts` calls `renderer.centreOn(id)` (ticket 027 C). The lamp's hover prompt says only "Lv1 Lamp" (`src/play/prompt.ts`), and the overlay draws no names. No series file has a name field for its buildings; the ids (`shrine`, `bath_house`, `home`) are all there is.
- **The overlay** (`src/render3d/overlay.ts`, drawn by `paintOverlay` in `cityview.ts`): one icon per component (glyph types feed, breaker, switch, fusebox, junction, battery, lamp), a break icon at each readable cut, the "x of y" labels by the feed and by rated fuse boxes, and the load preview's "+n / −n" by each breaker, switch and readable break (section V). A target lamp's icon carries a star. Nothing marks a building from above, nothing shows when a target is off screen, and nothing moves on a control before it is hovered.
- **Notices** (`noticeFor` in `src/ui/logic.ts`): "Lv3 Fuse blew: carrying 4", "Brownout: Lv6 Powersource using 9 of 6", "Battery flat", "No power at that relay". A repair without the part shows "Needs: 2 wires" only in the hover prompt.
- **The old puzzles.** `puzzles/city/` holds 43 city puzzles: the 25 series puzzles `s01` to `s25`, and 18 others: the 16 pilots (`01-first-light` to `16-behind-the-first`, each with `from`), `city-two-ways-round` (P0) and `tb-two-clocks` (TB6's trial). `src/main.ts` globs `puzzles/city/**/*.city.json`, so all 43 are in the dev Map menu; the stage select lists only `sNN` (NS). What still reads the 18:
  - **`01-first-light`**: `src/render3d/title3d.ts` (the title backdrop's building is its target; `import.meta.glob` of that one file) and `title3d.test.ts` (its one city fixture).
  - **`city-two-ways-round`** is the P0 fixture of 9 test files: `src/render3d/` `circuitdraw.test.ts`, `cityframe.test.ts`, `overlay.test.ts`, `windows.test.ts` (3 reads); `src/city/circuit/convert.test.ts`; `tools/` `analyze.test.ts`, `check.test.ts`, `fit.test.ts`. They assert on its ids, so pointing them at another puzzle would mean rewriting cases.
  - **Sweeps that read whatever is there:** `tests/playtest/ladder.ts` (`cityIds`), `tools/check.ts` (`cityPuzzlesWithBlocks`, so `npm run check` and CI's check replay), `tools/fit.test.ts` (every `puzzles/city/*.city.json` validates and replays), `src/render3d/pulsedir.test.ts`. Fewer files, fewer cases run; nothing breaks. There are no committed playtest snapshots (`tests/playtest/__snapshots__/` is not in git), so nothing goes stale there.
  - **Not dependencies:** `src/ui/maps.test.ts`, `progress.test.ts`, `win.test.ts` and `view3d.test.ts` use these ids only as strings in typed fixtures; `tb-two-clocks` is read by nothing but the sweeps.
  - **Docs:** `puzzles/SCHEMA.md`'s series paragraph says the pilots and P0 stay in the Map menu. `puzzles/series-v1.md` and the `docs/design/081-*` notes cite them as history; they stay as written.
- **The 66 schematic panels** (`puzzles/*.json`: the 64 numbered, `city-two-ways-round.json`, `lamp-row.grid.json`) are the fixtures of about 20 test files in `src/grid/`, `src/play/`, `src/core/`, `src/render3d/` and `tools/` (the analyzer's ladder case reads every `NN-*.json`). Josh's answer 2 removes them; *What reads the schematic panels* below maps every reader.

## What reads the schematic panels (read at 24e6e2b, for Josh's answer 2)
- **`puzzles/locked/` does not exist** on `main` (`git ls-tree origin/main puzzles/` has no `locked`), so no locked copy is touched.
- **Named files** (each is copied to `puzzles/fixtures/` in A3, and its readers change only the path):
  - `09-shrine-circuit`: `src/core/load.test.ts`, `check.test.ts`; `src/grid/grid.test.ts`, `battery.test.ts`, `fuseload.test.ts`; `src/play/play.test.ts`, `elapsed.test.ts`, `lastentry.test.ts`, `pan.test.ts`, `click-event.test.ts`; `src/render3d/look.test.ts`, `overlay.test.ts`, `relight3d.test.ts`; `src/ui/maps.test.ts` (an `import`); `tools/analyze.test.ts`, `check.test.ts`, `sections.test.ts`.
  - `20-battery-run`: `src/core/check.test.ts`, `src/grid/culprit.test.ts`, `fuseload.test.ts`, `tools/analyze.test.ts`. `12-which-fuse`: `src/grid/spring.test.ts`. `21-wake-the-relay`: `src/play/click-event.test.ts`. `61-charge-it-first`: `tools/check.test.ts`. `06`, `10`, `11`, `16`, `49`: `tools/analyze.test.ts`. `lamp-row.grid.json`: `src/grid/grid.test.ts`.
  - **`city-two-ways-round.json` and `.md` are the source a city puzzle still needs**: `src/city/circuit/convert.test.ts` replays the schematic note's check block on the schematic and through the P0 city file's conversion, `tools/fit.test.ts` fits the schematic and compares, and `tools/analyze.test.ts` compares P0's minimum with the schematic's. No series puzzle has a `from`, so nothing else is a source. The fit tool (`npm run fit puzzles/<schematic>.json`) keeps working on any schematic path, fixtures included.
- **Sweeps over the whole folder** (they lose their corpus): `src/core/load.test.ts` ("every puzzle file in puzzles/ validates"), `src/core/check.test.ts` ("every check block in puzzles/*.md is valid"), `src/core/words.test.ts` ("every lamp id in puzzles/ has a place kind"), `src/grid/feeds.test.ts` ("every map in puzzles/ behaves as before on one feed", which holds draft 5's rule 8 in `tickets/rules-coverage.md`), `tools/check.test.ts` ("D1 in the gate", through `puzzlesWithBlocks`), and `tools/analyze.test.ts`'s two ladder cases (`01 = 1, 02 = 2, 09 = 3`, and "every map ... has the README ladder's min clicks", which reads `puzzles/README.md`).
- **Named in a test of a doc:** `src/render3d/styleguide.test.ts` ("names each of the three maps, and each is a puzzle in puzzles/": `09`, `64`, `01` must exist as `puzzles/<id>.json`). The style guide's chapter 16 (`docs/city-style/evaluation.md`) is history from the removed tile view and stays as written.
- **Not readers:** `tests/playtest/` reads only `puzzles/city/`; `src/main.ts` globs only `puzzles/city/**`; `blownlamps.test.ts` keeps an inline copy. `tools/check.ts`'s `puzzlesWithBlocks` (the CLI's default list) and `tools/fitrun.ts`'s default `--out` (beside the schematic) read the folder at run time.
- **Docs:** `puzzles/SCHEMA.md` (its opening "A puzzle is one JSON file in `puzzles/`" and the check-block examples), `puzzles/README.md` (the 64-map ladder, which goes with them), `.claude/agents/puzzle-designer.md` (writes `puzzles/<id>.grid.json`), `CLAUDE.md` and `docs/prototype-brief.md`. The last three are the main session's (see *Main session* under M).

## Rules this ticket holds
- **No Decided rule changes**, and no rule or number of the grid or the city grammar changes, so there is no `pipeline-designer` pre-check. Nothing touches `src/grid/` or `src/play/`.
- **The Relight can't be interrupted.** No callout, guide step, tips box or marker click shows or acts during the Relight or on the win splash (C2, D2, T3 criterion 2). `tickets/rules-coverage.md` names 084 C, D2 and T3 on that row.
- **Faults hide faults.** A symbol is reported for a callout only when it is drawn, so an unreadable break, blown fuse, dead junction or dead lamp is never called out (B4). `tickets/rules-coverage.md` names 084 B on that row.
- **Josh decided "no legend panel, no readout rewording".** The "x of y" labels, the "+n" numbers, the HUD rows and the hover prompts keep their words. Section E1's "why" line is a notice, not a readout; whether it replaces the two notices' words or sits under them is Open question 4.
- **Generic names are words, not ids.** No lamp id, check block or fault changes for the names: the numbers are derived (A1), so a name cannot drift from its file.
- **Puzzles in `puzzles/locked/` are never edited.** There is no `puzzles/locked/` today; the series files are edited in place by the puzzle-designer.
- **The test cap.** At most 15 cases added or rewritten per pull request (`docs/test-policy.md`); every section below gives its count. No whole-city test is added; B's cases are on typed fixtures.
- **No new dependency.**

## How a building is numbered (A1; the architect's call, as asked)
Per puzzle, from the city file alone: the `target` lamps first, in `target` order (an absent or empty `target` means every lamp, in `nodes` order); then the `priority` lamps not yet numbered, in `priority` order; then every other file lamp, in `nodes` order. Ids that are not file lamps are skipped, so there is no gap. The hidden scenery lamps the conversion adds (081 S1) get no number and no name. So the goal is always Building 1 (and 2, 3 on a many-target puzzle), and a number only changes if the designer changes the file's `target`, `priority` or lamp order. `s06-behind-the-fuse` reads: `bath_house` Building 1, `home` Building 2, then its other lamps in file order.

## Sections, in order
| PR | Section | Owner | After | Cases |
| --- | --- | --- | --- | --- |
| 1 | A1 · Building names and the guide's check, in core | lead-architect | G1 | 2 added |
| 2 | A1b · The conversion drops `guide` and `tips` (added 28 Nov 2026) | grid-simulator | A1 merges; G1 on A1b | 1 added |
| 3 | A2 · The goal list reads "Building 1" | ui | A1 merges | 1 rewritten |
| 4 | A3 · P0 and the schematic fixtures kept outside `puzzles/city/` (widened for answer 2) | puzzle-designer | G1 | 0 |
| 5 | A4 · Renderer tests and the title off the old puzzles | renderer | A3 merges | 0 (paths only) |
| 6 | A5 · Grid-simulator tests off the old puzzles (re-cut 28 Nov 2026) | grid-simulator | A3 merges; beside A4. Edits `convert.test.ts` as A1b does: whichever merges second merges `main` first | 1 rewritten |
| 7 | A6 · The old puzzles go | puzzle-designer | A4 and A5 merge | 0 |
| 8 | B · Goal markers, edge arrows, the idle pulse and the symbol anchors | renderer | A1 and A4 merge (both edit `overlay.test.ts`: A4 its fixture path, B its cases); beside A2, A5, A6 | 4 added |
| 9 | C · First-time callouts | ui | A2 and B merge | 3 added |
| 10 | D1 · Guides for s01 to s03 | puzzle-designer | A1 and **A1b** merge (a city file with a `guide` fails conversion until A1b) | 0 |
| 11 | T1 · The tips field checked in core | lead-architect | G1 on T. Beside everything; edits `load.ts` and `load.test.ts` as M1 does (`load.test.ts`): whichever merges second merges `main` first | 1 added |
| 12 | T2a · Tips for s01 to s03 | puzzle-designer | D1, A1b and T1 merge | 0 |
| 13 | T2b · Tips for s12, s15, s17, s18, s19 and s20 | puzzle-designer | A1b and T1 merge; beside T2a | 0 |
| 14 | D2 · The guided start | ui | C and D1 merge | 2 added |
| 15 | T3 · The tips box | ui | D2, T1 and T2a merge | 2 added |
| 16 | E1 · The "why" line on a failure | ui | C merges. May share D2's PR (8 cases together); not T3's (T3 waits on D2) | 5 rewritten, 1 added |
| 17, 18 | E2a, E2b · s04 to s07, then s08 to s10, re-laid with teaching traps, and the tips of s04, s05, s06 and s08 (widened 28 Nov 2026) | puzzle-designer, on model Fable 5.2 | A6, E1 and T1 merge; E2b after Josh plays E2a | 0 |
| 19 | M1 · Core tests off the panels | lead-architect | A3 merges; beside B to E | 0 (sweeps removed) |
| 20 | M2 · Grid-simulator tests and tools off the panels | grid-simulator | A3 merges; beside B to E (may share A5's PR, 5 cases together) | 4 rewritten |
| 21 | M3 · Play tests off the panels | interaction | A3 merges; beside B to E | 0 (paths only) |
| 22 | M4 · The picker's test off the panels | ui | A3 merges; beside B to E | 0 (path only) |
| 23 | M5 · Renderer tests off the panels | renderer | A3 merges; beside B to E | 1 rewritten |
| 24 | M6 · The schematic panels go | puzzle-designer | A6 and M1 to M5 merge (may share A6's PR) | 0 |
| — | F · Performance | renderer (expected) | Alice's answer | placeholder: no criteria, no build |

Twenty-four pull requests, 28 cases in all (16 added, 12 rewritten), none over 6. The PR column is the build order, renumbered on 28 Nov 2026 for A1b and T; the section ids do not change. On s01 to s03 a new player meets, in this order: the tips box (T3), then the guide (D2) when the box closes, then C's callouts once the guide ends. M1 to M5 only change which file a test reads, so they run beside B to E and block none of them; only A6 and M6 (deletions) wait on them. A, B and the guide types are what the later sections code against, which is why A1 and B come first. The order changes the request's in one place: the old-puzzle removal is four small PRs (A3 to A6), not one, because the P0 fixture and the title read files in three owners' folders, and a PR has one owner.

---

### A1 · Building names and the guide's check, in core (lead-architect). Branch `ticket/084a1-names-core`
**Goal.** One function gives every file lamp of a puzzle its generic name, and a city puzzle's `guide` is checked when it loads, so A2, B, C and D code against both.

**Acceptance criteria.**
1. [ ] **`buildingNames(target, priority, lampIds): Map<string, string>`** in `src/core/words.ts` (still no imports), and `buildingName(n)` giving `Building ${n}`. It numbers as *How a building is numbered* says. **test**: 1 case in `words.test.ts`: a fixture with two targets listed out of node order, a priority lamp, one other lamp and a target id that is not a lamp gives exactly Building 1 and 2 (targets, in target order), 3 (priority), 4 (the other), and no entry for the stray id; an empty `target` numbers every lamp in node order.
2. [ ] **`validateCityPuzzle` checks `guide`** (`GuideStep`, `src/core/onboarding.ts`, written with this cut). Absent is fine. Present, it is an array of 1 to 12 steps; each step has exactly the keys `at`, `text`, `until`; `at` is null or a node or line id of the file; `text` is a non-empty string of at most `GUIDE_TEXT_MAX` (140) characters; `until` has exactly one key: `next: true`, `throw: <a breaker without a timer, or a switch>`, `repair: <the at of a file fault, or a rated fuse box>`, `lit: <a file lamp>` or `complete: true`. Each problem is one message, `guide step N: ...`, among the file's others. `validatePuzzle` (schematic) does not take a `guide`. **test**: 1 case in `load.test.ts`: one fixture with a valid two-step guide loads; the same fixture with a step whose `at` is unknown, whose `until` has two keys, and whose `throw` names a lamp gives exactly those three messages.

**Count.** 2 added. **Files.** `src/core/words.ts`, `src/core/load.ts`, `src/core/words.test.ts`, `src/core/load.test.ts`. **Must not:** `placeName` (kept; A2 stops using it), any other folder.

---

### A1b · The conversion drops `guide` and `tips` (grid-simulator). Branch `ticket/084a1b-convert-guide`, after A1 merges. Added 28 Nov 2026
**Why.** D1's builder found the gap A1 left (`ticket/084d1-guides`, commit c6d0596). `convertCityPuzzle` (`src/city/circuit/convert.ts`, the destructure before `const out: Puzzle`) strips `city`, `district`, `from`, `nodes`, `lines` and `faults` and spreads the rest into the plain map, so a `guide` goes through, and `validatePuzzle` refuses it: "CK15 s01-first-light: guide is only for a city puzzle". A city file with a guide then fails `npm run analyze`, `npm run check`, the fit sweep, and will not open in the game. T's `tips` is city-only too (T1 refuses it on a plain map), so both go in one PR.

**Goal.** A city puzzle with a `guide`, a `tips` box or both converts, plays and analyzes as it would without them; the plain map `src/grid/` runs never carries either.

**Acceptance criteria.**
1. [ ] **Dropped in the conversion.** The destructure also takes out `guide` and `tips`, so `CityPuzzleConverted.puzzle` has neither key. The ui reads both from the city file (`entry.city`), as A2 reads `target`. **test**: 1 case in `convert.test.ts`: P0's city file (by whatever path the file reads it at the time) with a two-step `guide` and a `tips` box added in memory converts without throwing, and the converted `puzzle` has no `guide` and no `tips` key.
2. [ ] **D1 unblocked.** On D1's branch, merged with `main` after A1b, `npm run check puzzles/city/s01-first-light.city.json` and the fit sweep pass. The builder of A1b does not touch D1's branch; the main session checks this when it merges `main` into D1. **no test**.

**Count.** 1 added. **Files.** `src/city/circuit/convert.ts` (that destructure, and its comment), `src/city/circuit/convert.test.ts`. **Must not:** `src/core/` (the types are in core with this cut), `src/grid/`, `puzzles/`, any other test.

---

### A2 · The goal list reads "Building 1" (ui). Branch `ticket/084a2-goal-names`, after A1 merges
**Goal.** The "Priests want lit" list names each target Building 1, 2, 3 in every city puzzle, and the list still centres the camera on a click or Enter.

**Acceptance criteria.**
1. [ ] **`targetRows` takes the names.** `targetRows(targets, lit, brownout, names?)` (optional, so the other cases compile unedited) writes `${names.get(id) ?? placeName(id)}: lit|dark`. `src/main.ts` builds `names` once per open with `buildingNames` from the open file (`entry.city`: its `target`, its `priority`, its lamp node ids) and passes it to `mountUI` (a new `UIDeps.names`). **test**: rewrite the existing case "reads each target as its place name..." in `logic.test.ts` to pass a names map and expect "Building 1: dark" (1 rewritten).
2. [ ] **It reads right on the city.** `npm run dev`, `s06-behind-the-fuse`: the list says "Building 1: dark"; clicking it centres the bath house. `s23-the-priests-list` lists Building 1 to N in target order. **browser**.

**Count.** 1 rewritten. **Files.** `src/ui/logic.ts` (`targetRows`), `src/ui/logic.test.ts` (that case), `src/ui/index.ts` (`UIDeps.names`, the call), `src/main.ts` (building the map). **Must not:** `src/core/`, `src/render3d/`, `src/play/`.

---

### A3 · P0 and the schematic fixtures kept outside `puzzles/city/` (puzzle-designer). Branch `ticket/084a3-p0-fixture`. **Widened 28 Nov 2026** for Josh's answer 2: it also copies the 12 schematic panels the tests still need
**Goal.** `city-two-ways-round` survives as the test fixture nine test files assert on, in a folder nothing lists as a puzzle, so the old puzzles can go without rewriting those tests.

**Acceptance criteria.**
1. [ ] **Copied, not moved:** `puzzles/fixtures/city-two-ways-round.city.json` and its note as `city-two-ways-round.city.md` (with its check block), byte for byte. (Named so because criterion 3's schematic note holds `city-two-ways-round.md`; the two notes' check blocks are identical, and the tools' `noteFor`, `x.city.json` to `x.md`, reads the schematic's. Re-cut 28 Nov 2026 to match the build and its review.) A one-paragraph `puzzles/fixtures/README.md` says: test fixtures only, never a stage or a Map menu entry, not swept by `npm run check`, the fit sweep or the playtest harness, and why P0 is here (084 A). The original in `puzzles/city/` stays until A6. **no test**: no code changes; A4 and A5 read it.
3. [ ] **The schematic fixtures, copied byte for byte** into `puzzles/fixtures/`: `06-the-spark`, `09-shrine-circuit`, `10-around-the-dead-post`, `11-the-small-fuse`, `12-which-fuse`, `16-behind-the-first`, `20-battery-run`, `21-wake-the-relay`, `49-two-cells`, `61-charge-it-first`, `city-two-ways-round` (the `.json`, and its `.md`, whose check block `convert.test.ts` replays) and `lamp-row.grid.json` with `lamp-row.md` (the street-scope map `grid.test.ts` uses and the brief names). These are the minimum the M sections' readers need (see *What reads the schematic panels*); the README says which tests read each. The originals stay until M6. **no test**.
2. [ ] **Nothing lists it.** The reviewer confirms the four sweeps (`main.ts`'s glob of `puzzles/city/**`, `cityPuzzlesWithBlocks`, the fit sweep, `cityIds`) and `puzzlesWithBlocks` (top level and `locked/` only) do not reach `puzzles/fixtures/`. **no test**.

**Count.** 0. **Files.** `puzzles/fixtures/` (new). **Must not:** `puzzles/city/`, any code.

---

### A4 · Renderer tests and the title off the old puzzles (renderer). Branch `ticket/084a4-renderer-off-pilots`, after A3 merges
**Goal.** No renderer file reads a pilot or `puzzles/city/city-two-ways-round`, and the title backdrop stands on stage 01 of the series, the first thing a player plays.

**Acceptance criteria.**
1. [ ] **P0 by its fixture path.** `circuitdraw.test.ts`, `cityframe.test.ts`, `overlay.test.ts` and `windows.test.ts` (all three reads) read `puzzles/fixtures/city-two-ways-round.city.json`. `overlay.test.ts` also reads `puzzles/fixtures/09-shrine-circuit.json` (line 20; widened 28 Nov 2026 so that B, which adds cases to the same file, has one file to rebase on, not two). Only the path changes: no `it(` line, assertion or name is edited. **test** (existing, unedited cases).
2. [ ] **The title stands on `s01-first-light`.** `title3d.ts`'s glob and its error text name `puzzles/city/s01-first-light.city.json`; `title3d.test.ts`'s fixture line reads it. **test** (existing): the composition case passes on s01's target building. If it does not (the building sits wrong for the poses), the builder stops and reports with the numbers and a screenshot; it does not retune `TITLE_VIEW` on its own judgement.
3. [ ] **The title looks right.** `npm run dev`, `?title=title` and `?title=splash`: the building on the right third, the moon in the upper half. Screenshots before and after in the reply. **browser**.

**Count.** 0 added or rewritten (path lines only). **Files.** the five test files above, `src/render3d/title3d.ts` (the glob and its text). M5 has the renderer's other panel readers. **Must not:** `TITLE_VIEW` and the poses (criterion 2's stop rule), any other folder.

---

### A5 · Grid-simulator tests off the old puzzles (grid-simulator). Branch `ticket/084a5-tools-off-pilots`, after A3 merges, beside A4
**Goal.** No grid-simulator test reads `puzzles/city/city-two-ways-round`.

**Acceptance criteria.**
1. [ ] **P0 by its fixture path** in `src/city/circuit/convert.test.ts`, `tools/analyze.test.ts`, `tools/check.test.ts` and `tools/fit.test.ts` (`P0_FILE`). Only the path changes, except criterion 3's line. If a case needs the note beside the file (`check.test.ts`, `fit.test.ts`), `noteFor` reads `puzzles/fixtures/city-two-ways-round.md`, the schematic's note, whose check block is identical to the city note's (`city-two-ways-round.city.md`, A3). **test** (existing, unedited cases).
2. [ ] **The sweeps still pass** with whatever `puzzles/city/` holds: the fit sweep in `fit.test.ts` runs unedited. **test** (existing).
3. [ ] **The no-argument list names a series file** (re-cut 28 Nov 2026, from A3's review). `tools/check.test.ts`'s case "npm run check names a city file, and with no argument it lists the city puzzles too" asserted `cityPuzzlesWithBlocks()` contains P0; with P0 in `puzzles/fixtures/`, which the sweep rightly does not read, that fails. The assertion becomes `toContain` the path of `puzzles/city/s01-first-light.city.json` (a series file with a check block in its note), and `not.toContain` the fixture's path. The rest of the case (the CLI run on P0 by its named path, `PASS city-two-ways-round`) keeps its words. **test**: 1 rewritten.

**Count.** 1 rewritten. **Files.** the four test files above. **Must not:** `tools/check.ts`, `tools/fit.ts`, `src/city/circuit/` code, `puzzles/`.

---

### A6 · The old puzzles go (puzzle-designer). Branch `ticket/084a6-old-puzzles-out`, after A4 and A5 merge
**Goal.** `puzzles/city/` holds only the series (and `tb-two-clocks` if Josh keeps it), so the dev Map menu lists only what players play.

**Acceptance criteria.**
1. [ ] **Deleted:** the 16 pilots `puzzles/city/01-*.city.json` to `16-*.city.json` with their notes, `puzzles/city/city-two-ways-round.city.json` and its note, and `tb-two-clocks.city.json` and its note (Josh: "It goes too (Recommended)"). The schematic panels go in M6. **no test**.
2. [ ] **Nothing breaks.** CI's `test` check reaches the sweeps (`fit.test.ts`, `pulsedir.test.ts`, `check.test.ts`), and they pass on the smaller folder. `grep -rn` over `src/`, `tools/` and `tests/` for each deleted id finds only string fixtures (`maps.test.ts`, `progress.test.ts`, `win.test.ts`, `view3d.test.ts`) and comments; the reply lists them. **test** (existing).
3. [ ] **The docs say it.** `puzzles/SCHEMA.md`'s series paragraph: only series puzzles are in `puzzles/city/`; the pilots, P0 and `tb-two-clocks` were removed by 084 A6 (Josh, 28 Nov 2026: "All 25 series puzzles + remove the old puzzles."), and P0 lives on as a fixture in `puzzles/fixtures/`. `puzzles/series-v1.md` and the design notes are left as history. **no test**.
4. [ ] **The Map menu.** `npm run dev`: the HUD's Map menu lists `01 · First light` to `25 · ...`, nothing else; the stage select is unchanged. **browser**.

**Count.** 0. **Files.** `puzzles/city/` (deletions only), `puzzles/SCHEMA.md` (that paragraph). **Must not:** `puzzles/fixtures/`, the series files, the schematic panels, any code. The playtest harness's comment naming the pilots is the playtester's and waits for the next release.

---

### B · Goal markers, edge arrows, the idle pulse and the symbol anchors (renderer). Branch `ticket/084b-markers-pulse`, after A1 and A4 merge
**Goal.** Over each goal building floats a marker with its name that pulses until the building is lit; when the building is off screen an arrow at the screen's edge points to it. Every breaker and switch the player can throw breathes softly before it is hovered. The renderer reports where each symbol it drew stands, for C's callouts and D's guide.

**Acceptance criteria.**
1. [ ] **`goalMarkers(...)`**, pure, in `overlay.ts`: for each target lamp, its name (A1's `buildingNames`, from the converted puzzle's `target`, `priority` and file lamps, hidden ids left out), and a point `GOAL_MARKER_UP_PX` above the projected top of its building (its roof height from `buildingHeights`, at its footprint centre). On screen: `{ id, name, x, y, onScreen: true, pulse }`. Off the free area (outside the canvas less the HUD insets, or behind the camera): `onScreen: false`, the point clamped `GOAL_ARROW_INSET_PX` inside the free area's edge on the line from its centre toward the building (flipped when behind the camera), and `angle`, the arrow's direction. `pulse` is 0 to 1 on a `GOAL_PULSE_S` cycle while the building is not lit (lit = in `state.lit` and no brownout), and 1, steady, once lit and during the Relight. **test**: 2 cases on a typed fixture with a fake `project`: (a) on screen: above the roof point, pulsing while dark, steady once lit; a brownout makes it pulse again; (b) off screen to the right and behind the camera: clamped inside the right edge and the opposite edge respectively, with the angle pointing out.
2. [ ] **Drawn.** `paintOverlay` draws each marker as the target star and the name in a small dark pill; its scale and alpha follow `pulse`. An edge arrow is a chevron with the name beside it, kept inside the free area and off the HUD blockers. Constants (`GOAL_*`) are exported for Josh to tune by eye. **browser** (criterion 6).
3. [ ] **The idle pulse.** `OverlayIcon` gains `idle?: number` (0 to 1): set on a breaker without a timer, a plain or spring switch, and a relay only while current reaches it, on an `IDLE_PULSE_S` cycle; absent on the hovered icon, on every icon during the Relight, and on every other type. `paintOverlay` draws it as a soft ring (`IDLE_RING_*`). `MapOverlay` gains `focus?: string | null` (the id a callout or guide step points at, from C and D): that icon, break or marker gets a brighter, steady ring instead. **test**: 1 case in `overlay.test.ts` on a fixture with a breaker, a timed breaker, a dead relay, a live relay and a lamp: `idle` is set on the breaker and the live relay only, is absent on the hovered breaker, and absent everywhere with the Relight running.
4. [ ] **`symbols()` and `goalArrowAt(x, y)`**, a new `MapSymbols` interface in `maprender.ts`, kept separate so existing fakes compile. `symbols()` returns the `SymbolAnchor`s (`src/core/onboarding.ts`) of the last frame drawn: one per drawn icon, label, preview number, break and marker, classified by `SymbolKind`'s doc, in draw order; nothing for what was not drawn (an unreadable fault is not drawn, so it is never reported). `goalArrowAt` returns the lamp id of an edge arrow under the point, else null; `hitTest` and `placeAt` return null there, so a click on an arrow never throws or repairs what lies under it. **test**: 1 case, on criterion 3's fixture with a readable and an unreadable cut: the kinds reported are exactly the expected set, with the readable break and its `load-delta`, and nothing for the unreadable one.
5. [ ] **Cost.** With `perf=1` on `s25-the-whole-chain`, the frame time with markers and pulses is within 1 ms of `main`'s; the builder gives both, on Josh's PC, while the pane is shown. **no test**.
6. [ ] **How it looks.** `npm run dev`, `s06-behind-the-fuse` and `s23-the-priests-list`: the markers float over the goal buildings and pulse until each is lit; pan one off screen and its arrow sits at the edge pointing at it; breakers and switches breathe, the hovered one does not; nothing pulses in the Relight. **browser**.

**Count.** 4 added. **Files.** `src/render3d/overlay.ts`, `overlay.test.ts`, `cityview.ts` (drawing, `symbols`, `goalArrowAt`, the hit guard), `maprender.ts` (`MapSymbols`, `MapOverlay.focus`), `glyphs.ts` only if the chevron needs a glyph. **Must not:** `src/core/`, `src/ui/`, `src/main.ts` (C wires it), `src/grid/`, `src/play/`, `title3d.ts` (A4's).

---

### C · First-time callouts (ui). Branch `ticket/084c-first-callouts`, after A2 and B merge
**Goal.** The first time the player meets each symbol, a small bubble points at it and says what it is in one plain line, with a "Got it" button. Each shows once per player, one at a time. Clicking an edge arrow centres its building, as the goal list does.

**Acceptance criteria.**
1. [ ] **`nextCallout(anchors, seen, blocked)`**, pure, in a new `src/ui/onboarding.ts`: the first kind in `CALLOUT_ORDER` with an on-screen anchor in `anchors` and not in `seen`, with its first anchor; null when `blocked` or nothing is due. `CALLOUT_ORDER` is `goal, feed, feed-load, breaker, switch, load-delta, building, fusebox, fuse-load, blown-fuse, break, dead-lamp, junction, dead-junction, battery, relay, spring, timer`. `CALLOUT_TEXT` holds one line per kind (drafts below; Josh tunes the words). **test**: 2 cases: (a) the order, skipping seen kinds and off-screen anchors; (b) `blocked` gives null.
2. [ ] **When it shows.** `blocked` is true during the Relight, on the win splash, on the splash, title and stage select screens, while a guide runs (D2), and before the first frame's `symbols()`. Dismissed by "Got it" (focusable, Enter works) or by the player's next throw or repair; either marks the kind seen. A callout whose anchor leaves the screen hides, not seen, until it is back. The bubble never covers its anchor's 44 px hit circle (it sits beside it, by `promptPosition` with the HUD blockers to avoid), and it is in `measureBlockers` so a click on it is not a click on the map. Its text is in the DOM, so a screen reader reads it. `MapOverlay.focus` is the shown callout's id. **browser** (criterion 4); the Relight block is criterion 1's case (b).
3. [ ] **Seen, saved.** The seen kinds are saved under `rest-circuits.onboarding.v1` (`loadSeen` / `saveSeen`, bad or missing data reads as none); the stage select's clear-progress clears them too. **test**: 1 case: save, load, a corrupt value reads as empty.
4. [ ] **A first play.** Clear progress, then play s01 to s06 (`npm run dev`): each new symbol gets one callout the first time it shows, none twice; s01's first is the goal marker, then the feed. Clicking an edge arrow (`goalArrowAt`, wired in `main.ts`) centres its building. Also in the itch build (`npm run build:itch -- --build-only`, ticket 083) on s01. **browser**.

**Draft lines (Josh tunes):** goal "Building 1 is the one to light." (its name); feed "The feed. All the power starts here."; feed-load "Load now, of the most the feed can carry. Go over and everything goes dark."; breaker "A breaker. Click it to turn its line on or off."; switch "A switch. Click it to send the power down its other line."; load-delta "What clicking this would add to the load, or take off it."; building "A building on the line. Lit, it adds its load."; fusebox "A fuse box. Too much load through it and the fuse blows."; fuse-load "Load through this fuse, of the most it can take."; blown-fuse "A blown fuse. Nothing gets past it until you fit a fuse."; break "A broken cable. Click it to mend it with a wire."; dead-lamp "A dead bulb. Click it to fit a bulb."; junction "A junction. The power splits here."; dead-junction "A dead junction. It takes two wires to mend."; battery "A battery. It charges while power reaches it; click to let it out."; relay "A relay. It only moves while power reaches it."; spring "A spring switch. It falls back when its power goes."; timer "A timed breaker. Its clock opens and closes it, not you."

**Count.** 3 added. **Files.** `src/ui/onboarding.ts` and its test (new), `src/ui/index.ts` (the bubble), `src/ui/progress.ts` (clearing the key with progress), `src/main.ts` (reading `symbols()`, passing `focus`, the arrow click). **Must not:** `src/render3d/`, `src/core/`, `src/play/`.

---

### D1 · Guides for s01 to s03 (puzzle-designer). Branch `ticket/084d1-guides`, after A1 merges; merges after A1b (re-cut 28 Nov 2026: until A1b, a file with a `guide` fails conversion)
**Goal.** Each of the first three stages carries a short guide that walks a new player through its one idea: point at the control, say what it does, let them try.

**Acceptance criteria.**
1. [ ] **A `guide` in each of `s01-first-light`, `s02-this-way-or-that`, `s03-not-enough-for-all`**, 3 to 6 steps, every text naming buildings by A1's numbers ("Building 1") and no step longer than 140 characters. Each guide ends on a `complete` step (the player finishes the job themselves); no step throws or repairs anything for them. s01 teaches the goal marker, the feed and its "x of y", a breaker and its "+n"; s02 the switch; s03 the brownout and shedding. Nothing else in the files changes: the layout, the check block and the analyzer numbers are as they are. **test** (existing): the fit sweep validates each file, guide included, through A1.
2. [ ] **The notes say it.** Each note gains a *Guide* section: the steps in order and why each is there. `puzzles/SCHEMA.md`'s city section gains the `guide` field (shape as A1 checks it, the `until` kinds, "s01 to s03 only for now"). **no test**.
3. [ ] **Josh reads the steps** in the design notes before D2 ships them; his words go under *What it taught us*. **no test**.

**Count.** 0. **Files.** the three series files and notes, `puzzles/SCHEMA.md` (the `guide` lines). **Must not:** any other puzzle, any code.

---

### D2 · The guided start (ui). Branch `ticket/084d2-guided-start`, after C and D1 merge
**Goal.** On s01 to s03, until the player has won the stage once, the guide's steps show one at a time in C's bubble, pointing at their control, and each waits for the player to do the thing.

**Acceptance criteria.**
1. [ ] **`guideStep(guide, index, event | state)`**, pure, in `src/ui/onboarding.ts`: whether the current step is done. `next` by its button; `throw` by a `breaker:thrown` or `switch:thrown` of that id that is not a timer's flip or a spring's return; `repair` by `repair:completed` at that id; `lit` and `complete` read from the state, so a step already true when shown is done at once. **test**: 1 case covering the five kinds, the spring return and the timer flip not counting.
2. [ ] **When it runs.** A file with a `guide` runs it when the stage has no win in `progress`; never during the Relight or on the win splash. While it runs, C's callouts are blocked, and every kind a step points at counts as seen when the guide ends. Reset (the puzzle's) starts it again at step 1; Undo does not move it back. A "Skip guide" button ends it. A step whose `at` is off screen calls `centreOn(at)` when it starts; `MapOverlay.focus` is its `at`. **test**: 1 case: a guide marks its pointed kinds seen at the end and C's `nextCallout` is blocked while it runs.
3. [ ] **A first play.** Clear progress; play s01 to s03 following the guide, then replay s01 (no guide), then clear progress and Skip on s02. **browser**.

**Count.** 2 added. **Files.** `src/ui/onboarding.ts` and its test, `src/ui/index.ts`, `src/main.ts` (the bus events to the guide). **Must not:** `src/render3d/`, `src/core/`, `src/play/`, `puzzles/`.

---

### E1 · The "why" line on a failure (ui). Branch `ticket/084e1-why-line`, after C merges
**Goal.** When a move visibly fails, the notice says why in plain words, with the numbers, so a wrong move teaches.

**Acceptance criteria** (Josh, 28 Nov 2026, on Open question 4: "Replace (Recommended)").
1. [ ] **Brownout:** "Too much load: 9 of 6" (one feed), "Too much load on North: 5 of 4" (each over feed on a multi-feed map), from the event's numbers, replacing today's "Brownout: ..." words in `noticeFor` and `brownoutNotices`. The HUD row's "· Brownout" is a readout and stays. **test**: rewrite the existing brownout case in `logic.test.ts` ("says brownout with the powersource level...") and the three notice cases in `feeds.test.ts` ("names the one over feed...", "gives one notice per over feed...", "uses the no-limit form..."): 4 rewritten.
2. [ ] **Fuse blow:** "Too much load for that fuse: 4 of 3", from `fuse:blown`'s `load` and `rating`, replacing "Lv3 Fuse blew: carrying 4". **test**: rewrite the existing case "names the fuse level and what it carried when a fuse blows" (1 rewritten).
3. [ ] **Short of parts:** a click on a readable fault without the parts (a `repair-refused` log entry) gives "Needs 2 wires; you have 1." **test**: 1 added.
4. [ ] **Seen in play.** `s03-not-enough-for-all` (brownout), `s08-the-small-box` (fuse blow), `s05-not-that-one` (the dead junction short of a wire). **browser**.

**Count.** 5 rewritten, 1 added: 6. **Files.** `src/ui/logic.ts`, `logic.test.ts`, `feeds.test.ts`, `src/main.ts` (the `repair-refused` notice, as the relay one is wired). **Must not:** the HUD rows, the overlay labels, the hover prompts (`src/play/prompt.ts`), `src/core/words.ts`.

---

### E2a, E2b · s04 to s10 re-laid with teaching traps (puzzle-designer, on model Fable 5.2). Branches `ticket/084e2a-relay-04-07`, then `ticket/084e2b-relay-08-10`
**Goal.** Each of s04 to s10 keeps its lesson (its row of `puzzles/series-v1.md`) and gains one tempting wrong move that visibly fails, with E1's line saying why, so a player who clicks at random learns from what happens rather than getting through by luck.

**Acceptance criteria** (each PR, for its puzzles).
1. [ ] **Re-laid in place:** the same ids and file names (so stage numbers and saved progress hold), the same lesson, on the city as the fit tool allows. Each puzzle's tempting wrong move ends in a failure E1 explains (a brownout, a fuse blow, or a repair refused for parts) or a refused relay ("No power at that relay"), visible on the city when it happens. A wrong move whose only sign is "nothing changed" does not count. **no test**.
2. [ ] **The check block holds it:** a trap named for the tempting move whose `expect` names the failure (`brownout: true`, `blown: [...]`, or `complete: false` with the refused repair), with a `recover` that still wins. `npm run check` and `npm run analyze` pass on each; the notes carry the new numbers. **test** (existing): the fit sweep replays each block.
3. [ ] **Words.** Every player-facing name in the notes' intended read and in the series table is Building N by A1's rule. The analyzer's minimum stays within 1 of today's for each puzzle unless the note says why. Later stages (s11 to s25) are not edited; the note of each re-laid puzzle says which later stage leans on it and that the lesson is unchanged. **no test**.
4. [ ] **Josh plays each** (`npm run dev`), as the puzzle loop says; his words go under *What it taught us*. E2b starts after his word on E2a. **browser**.
5. [ ] **The tips of the re-laid new-mechanic puzzles** (widened 28 Nov 2026 for section T; written here because the designer re-laying the file knows its new Building numbers, and it saves a third pass over the same files). E2a gives `s04-the-spark`, `s05-not-that-one` and `s06-behind-the-fuse` a `tips` box; E2b gives `s08-the-small-box` one; `s07`, `s09` and `s10` get none (*The new-mechanic levels*, section T). Each box follows T2's rules (criteria 1 and 2 of T2a: the mechanic in the table, Building N names, no solution and no trap). **test** (existing): the fit sweep validates each file through T1.

**Count.** 0 each. **Files.** `puzzles/city/s04-*` to `s07-*` (E2a), `s08-*` to `s10-*` (E2b), their notes, `puzzles/series-v1.md` (those rows). **Must not:** s01 to s03 (D1's and T2a's), s11 to s25, any code.

---

### T · The tips box (added 28 Nov 2026). Four PRs: T1 (lead-architect), T2a and T2b (puzzle-designer), T3 (ui); s04, s05, s06 and s08's boxes are written in E2a and E2b
**G1 and answers (Josh, 28 Nov 2026, on cards, relayed by the main session):**
- **G1** on section T, A1b and the re-cuts (E2a, E2b, A5): "Approve (Recommended)".
- **T-1, s09 and s10:** "Leave them out (Recommended)". No box on either; the table stands.
- **T-2, the clock while the box is open:** "Holds, always (Recommended)". T3 criterion 4 stands: at the start and when the Tips button reopens it.
- **T-3, a stage already won:** "Until won (Recommended)". T3 criterion 1 stands: the box opens at the start until the stage is won once; after that the Tips button opens it.

**Josh, 28 Nov 2026, in chat:** "I would like to add a tips box to each level explaining the new mechanics. Further more I would like to add a goal description to level 1 in addition to the description of the first puzzle mechanic. The breaker switch."
**His answers on cards, the same day:**
- When it shows: "Open at start, closable (Recommended)". It opens when the level starts, explains what is new in this level, closes with "Got it", and a Tips button reopens it.
- Which levels: "Only new-mechanic levels". Only series levels that bring in a new mechanic get a box; the rest get none.
- Fit with the section C callouts: "Keep both (Recommended)". The tips box explains the level's mechanic; the C callouts still point at each symbol the first time it appears.
- Level 1's goal: "In the tips box (Recommended)". s01's box says the goal first (the priests want certain buildings lit; get power to them), then explains the breaker.

**Goal.** When a player starts a series level that brings in a new mechanic, a box opens that says in a few plain lines what the new thing is and how it behaves; on s01 it first says what the game asks of them. "Got it" closes it, a Tips button opens it again, and nothing else on screen talks over it.

#### The new-mechanic levels (the architect's reading, from each note's *New concept* and `puzzles/series-v1.md`)
A level brings in a new mechanic when it puts into play a piece, a part, a fault, a limit or a rule of the brief's *Rules* that no earlier stage has. A reasoning move (a way to use what is already known) is not one, even where the note calls it the *New concept*: the box would be telling the player the solution. s04 to s10 are being re-laid in E2 and keep their lessons (E2 criterion 1), so the reading holds for them.

| Stage | Box | What it explains (the designer words it) |
| --- | --- | --- |
| s01 First light | **yes** (T2a) | First the goal: the priests want certain buildings lit, here Building 1; get power from the feed to it. Then the breaker: a whole wire that is dark stops at an open breaker; click it to close it and let the power on. |
| s02 This way or that | **yes** (T2a) | The switch: it sends power down one of its two lines, so lighting one line darkens the other; a switch with no power reaching it changes nothing you can see. |
| s03 Not enough for all | **yes** (T2a) | Capacity and brownout: the feed carries so much and no more ("x of y"); over it, every building flickers and none counts as lit, so something must go dark. |
| s04 The spark | **yes** (E2a) | The damaged cable: a break sparks only while power reaches it; a dark line shows nothing, broken or not; a wire mends it. |
| s05 Not that one | **yes** (E2a) | Scarce parts and the dead junction: a part spent is gone; a dead junction takes two wires. |
| s06 Behind the fuse | **yes** (E2a) | The fuse box and the dead building: a blown fuse darkens everything past it and is mended with a fuse; a dark building on a live line wants a bulb; a fault can hide behind another. |
| s07 The long way | no | A reroute: a reasoning move with s02's switch and s05's junction. |
| s08 The small box | **yes** (E2b) | The fuse rating: a fuse box carries so much for what is past it; over it the fuse blows, and the blow costs a fuse. |
| s09 Two ways round | no | The ring is a shape: s02's switch and s04's break on a loop. (T-1, Josh: "Leave them out (Recommended)".) |
| s10 Count the dark | no | A dead building draws nothing until its bulb goes in: the brief's capacity rule (only lit buildings load the feed) on s06's piece. (T-1, Josh: "Leave them out (Recommended)".) |
| s11 Leave it open | no | A break as the open point between two boxes: s04 and s08 together. |
| s12 Draw the line | **yes** (T2b) | Two feeds: each has its own limit; joined, they do not pool, and each building is carried by the nearer feed. |
| s13 Look from behind | no | Reading a fault from its far side: a reasoning move. |
| s14 Split the dark | no | A dark stretch goes to one box whole: s08 on s11's ring. |
| s15 The fuse above | **yes** (T2b) | Nested fuse boxes: a building behind two boxes has two limits over it, and room in the small one says nothing about the one above. |
| s16 Let it blow | no | The deliberate blow is a technique with s08's rule; a tip would be the solution. |
| s17 The back door | **yes** (T2b) | The relay: it moves only while power reaches it, and keeps its place when the power goes. |
| s18 Make before break | **yes** (T2b) | The spring switch: it stays thrown only while power reaches it, and falls back the moment it goes dark. |
| s19 The cell | **yes** (T2b) | The battery: it fills while a feed reaches it; let out, it lights its far side for as long as it holds; its light trips no fuse and wins nothing; Undo does not refill it. |
| s20 Turn and turn about | **yes** (T2b) | The timed breaker: a clock throws it, never you; what is dark waits for its turn. |
| s21 to s25 | no | Combinations of the above; s25's note says "No new piece". |

**Thirteen boxes:** s01, s02, s03, s04, s05, s06, s08, s12, s15, s17, s18, s19, s20.

#### How it sits with the guide (D2) and the callouts (C)
One voice at a time, in this order:
1. **The tips box** opens when the stage opens. While it is open, C's callouts are blocked, no guide step shows, the map takes no throw, repair or hover (it is in `measureBlockers`, and it is modal over the canvas), and the clock holds (T-2, Josh: "Holds, always (Recommended)").
2. **The guide** (s01 to s03 only, D2) starts when the box closes, not when the stage opens.
3. **C's callouts** follow once the guide ends (D2 already blocks them while it runs). On a stage without a guide they follow the box at once.
The box says *what* the new thing is and *why it matters*; the guide says *where* it is and lets the player try; the callouts name each symbol once. So on s01 the box gives the goal and the breaker in words, then the guide points at Building 1's marker and the breaker. T2a does not edit D1's guide steps; if a step repeats the box nearly word for word, the note says so and Josh decides.

---

#### T1 · The tips field checked in core (lead-architect). Branch `ticket/084t1-tips-core`, after G1 on T
**Goal.** A city puzzle's `tips` is checked when it loads, so T2's files and T3's box code against a checked shape.
1. [ ] **`validateCityPuzzle` checks `tips`** (`PuzzleTips`, `src/core/onboarding.ts`, written with this cut). Absent is fine. Present, it is an object with exactly the keys `title` and `lines`; `title` a non-empty string of at most `TIPS_TITLE_MAX` (40) characters; `lines` an array of 1 to `TIPS_MAX_LINES` (4) non-empty strings of at most `TIPS_LINE_MAX` (160) characters each. Each problem is one message, `tips: ...`. A plain map (`validatePuzzle`) refuses it ("tips is only for a city puzzle"), as it does `guide`. **test**: 1 case in `load.test.ts`: a fixture with a valid two-line box loads; the same fixture with an extra key, an empty title and a fifth line gives exactly those three messages.

**Count.** 1 added. **Files.** `src/core/load.ts`, `src/core/load.test.ts`. **Must not:** `words.ts`, the guide's checks, any other folder. Beside M1 (it edits `load.test.ts` too).

#### T2a · Tips for s01 to s03 (puzzle-designer). Branch `ticket/084t2a-tips-01-03`, after D1, A1b and T1 merge
**Goal.** The first three stages each open with a box that explains their one new idea, and s01's says the goal first.
1. [ ] **A `tips` box in each of `s01-first-light`, `s02-this-way-or-that` and `s03-not-enough-for-all`**, explaining the mechanic in the table above. s01's first line is the goal (the priests want certain buildings lit; here, Building 1; get power from the feed to it), and its next line or lines the breaker. Titles in the form "New: the breaker" (s01 may read "Your first job"). **test** (existing): the fit sweep validates each file, tips included, through T1, and converts it through A1b.
2. [ ] **The words** (these rules hold for every box, T2b's and E2's too): buildings by A1's numbers ("Building 1"), never a place name or a lamp id; plain words, no jargon the game does not show; the box explains the rule, never the winning move or the trap; no line over 160 characters. **no test**: the reviewer reads each box against the note's *The trap*.
3. [ ] **Nothing else changes** in the three files: layout, guide (D1's), check block and analyzer numbers as they are. **no test**.
4. [ ] **Notes and schema.** Each note gains a *Tips* section: the box's text and why each line is there. `puzzles/SCHEMA.md`'s city section gains the `tips` field (shape as T1 checks it; "only on a stage that brings in a new mechanic"), beside D1's `guide` lines. **no test**.
5. [ ] **Josh reads the words** in the notes before T3 ships them; his words go under *What it taught us*. **no test**.

**Count.** 0. **Files.** the three series files and notes, `puzzles/SCHEMA.md` (the `tips` lines). **Must not:** the guides, any other puzzle, any code.

#### T2b · Tips for s12, s15, s17, s18, s19 and s20 (puzzle-designer). Branch `ticket/084t2b-tips-12-20`, after A1b and T1 merge, beside T2a
**Goal.** Each later stage that brings in a new piece opens with a box explaining it.
1. [ ] **A `tips` box in each of `s12-draw-the-line`, `s15-the-fuse-above`, `s17-the-back-door`, `s18-make-before-break`, `s19-the-cell` and `s20-turn-and-turn-about`**, explaining the mechanic in the table, under T2a criterion 2's rules. Nothing else in the files changes. **test** (existing): the fit sweep validates and converts each.
2. [ ] **Notes.** Each note gains a *Tips* section, as T2a's. **no test**.
3. [ ] **Josh reads the words** before T3 ships; his words go under *What it taught us*. **no test**.

**Count.** 0. **Files.** those six series files and notes. **Must not:** `puzzles/SCHEMA.md` (T2a's), every other puzzle, any code.

#### T3 · The tips box (ui). Branch `ticket/084t3-tips-box`, after D2, T1 and T2a merge
**Goal.** On a stage whose file has `tips`, the box opens when the stage starts, holds everything else until "Got it", hands over to the guide or the callouts, and opens again from a Tips button.
1. [ ] **`firstPlayOrder(hasTips, hasGuide, won)`**, pure, in `src/ui/onboarding.ts`: the order the stage's onboarding runs in, from `"tips"`, `"guide"`, `"callouts"`. Not yet won: tips (if any), then guide (if any), then callouts. Won: callouts only (the box starts closed and the Tips button stays; T-3, Josh: "Until won (Recommended)"). **test**: 1 case: s01's shape unwon gives tips, guide, callouts; won gives callouts; tips without a guide gives tips, callouts; neither gives callouts.
2. [ ] **`tipsBox(state, event)`**, pure, the box's open or closed state over `start`, `got-it`, `reopen`, `relight`, `win-splash`, `reset`. `start` opens it as criterion 1 says; `got-it` closes it; `reopen` opens it except during the Relight and on the win splash; `relight` closes it; `reset` (the puzzle's) leaves it as it is. **test**: 1 case over that sequence, the Relight's refusal included (*The Relight can't be interrupted*).
3. [ ] **Drawn.** A box in the DOM (the text a screen reader reads): the title, the lines, a "Got it" button focused when it opens (Enter and Escape close it). A Tips button in the HUD, only on a stage with `tips`, focusable, reopens it. While open: in `measureBlockers`, and the map takes no throw, repair or hover; C's `nextCallout` gets `blocked`; D2's guide waits and starts on close; `MapOverlay.focus` is null. **browser** (criterion 5).
4. [ ] **The clock holds while it is open** (T-2, Josh: "Holds, always (Recommended)"): `main.ts` passes `play.tick` a dt of 0 while the box is open, so a timer, a battery and the stage's time stand still. No change to `src/play/`. **browser** (criterion 5, on s20).
5. [ ] **A first play.** Clear progress; s01: the box opens with the goal and the breaker, "Got it", then the guide starts; finish it, then the callouts. Replay s01: no box at start, Tips opens it. s04 (once E2a has its box) or s12: box, then callouts. s20: the timed breaker does not flip while the box is open. Nothing opens during the Relight or on the win splash. Also in the itch build on s01. **browser**.

**Count.** 2 added. **Files.** `src/ui/onboarding.ts` and its test, `src/ui/index.ts` (the box, the Tips button), `src/main.ts` (the start, the order with the guide, the dt hold), `index.html` only if the box needs a style rule beside the existing ones. **Must not:** `src/render3d/`, `src/core/`, `src/play/`, `puzzles/`. May not share a PR with D2 or E1 (it waits on D2; E1's cases with it would be 8, under the cap, but they touch the same lines of `main.ts` for different reasons).

---

### M · Off the schematic panels, then the panels go (Josh, 28 Nov 2026: "Remove them too"). Six PRs: M1 to M5 side by side after A3, then M6
Each of M1 to M5 changes only which file its tests read (A3's `puzzles/fixtures/` copies) and removes the sweeps that only existed for the 66-map corpus. Removed tests do not count against the cap. None of them touches `overlay.ts`, `overlay.test.ts`, `cityview.ts`, `src/ui/index.ts`, `logic.ts` or `main.ts`, so none blocks B to E.

#### M1 · Core tests off the panels (lead-architect). Branch `ticket/084m1-core-fixtures`, after A3 merges
1. [ ] `load.test.ts` and `check.test.ts` read `09-shrine-circuit` and `20-battery-run` from `puzzles/fixtures/`. Path lines only. **test** (existing).
2. [ ] **Removed:** `load.test.ts`'s "every puzzle file in puzzles/ validates" (each fixture is validated by the test that loads it), `check.test.ts`'s "every check block in puzzles/*.md is valid" (the city notes' blocks are replayed by the fit sweep), and `words.test.ts`'s "every lamp id in puzzles/ has a place kind" (`placeKind` drew the removed 2D map's footprints and has no caller outside its test). The reply lists the cases removed. **no test**.
3. [ ] `src/core/check.ts`'s doc comment says a note is `puzzles/city/<id>.md` (or a fixture's). **no test**.

**Count.** 0 added or rewritten. **Files.** `src/core/load.test.ts`, `check.test.ts`, `words.test.ts`, `check.ts` (comment only). **Must not:** `load.ts`, `words.ts` (A1's), any other folder.

#### M2 · Grid-simulator tests and tools off the panels (grid-simulator). Branch `ticket/084m2-grid-fixtures`, after A3 merges; may share A5's PR (5 cases together)
1. [ ] **Paths:** `src/grid/grid.test.ts` (`PUZZLES` and `lamp-row.grid.json`), `battery.test.ts`, `culprit.test.ts`, `fuseload.test.ts`, `spring.test.ts`; `src/city/circuit/convert.test.ts` (`city-two-ways-round.json` and `.md`); `tools/analyze.test.ts` (`load`), `check.test.ts` (`load`, the shrine copy), `fit.test.ts` (the schematic), `sections.test.ts`, all to `puzzles/fixtures/`. **test** (existing).
2. [ ] **Rule 8 kept on the fixtures.** `feeds.test.ts`'s "every map ... behaves as before on one feed" sweeps the schematic files in `puzzles/fixtures/` (skipping `.city.json`), and its "finds the maps" floor becomes at least 10. **test**: 1 rewritten.
3. [ ] **The Undo equivalence on kept shapes.** `analyze.test.ts`'s D2 table (`07`, `11`, `13`, `14`) becomes `11-the-small-fuse` (a fuse), `16-behind-the-first` (a hidden fault) and `city-two-ways-round` (the ring), all fixtures. **test**: 3 rewritten.
4. [ ] **Removed:** `analyze.test.ts`'s two ladder cases (`01 = 1, 02 = 2, 09 = 3` and the README ladder), and `tools/check.test.ts`'s "D1 in the gate" describe (it sweeps `puzzles/` top level, empty after M6; the city notes are replayed by the fit sweep). **no test**.
5. [ ] **The tools.** `tools/check.ts` keeps `puzzlesWithBlocks` (an empty list is fine); `tools/fitrun.ts`'s default `--out` becomes `puzzles/city/` (no longer beside the schematic, so a fixture input never writes into `puzzles/fixtures/city/`); the usage lines of `analyze.ts`, `fitrun.ts` and `check.ts` name `puzzles/city/<id>.city.json`. **no test**.

**Count.** 4 rewritten (5 with A5's 1, if they share a PR). **Files.** the test files in criterion 1, `feeds.test.ts`, `tools/check.ts`, `tools/fitrun.ts`, `tools/analyze.ts` (usage lines). **Must not:** `src/grid/` code, `src/city/circuit/` code, `puzzles/`.

#### M3 · Play tests off the panels (interaction). Branch `ticket/084m3-play-fixtures`, after A3 merges
1. [ ] `src/play/play.test.ts`, `elapsed.test.ts`, `lastentry.test.ts`, `pan.test.ts` and `click-event.test.ts` read `09-shrine-circuit` and `21-wake-the-relay` from `puzzles/fixtures/`. Path lines only. **test** (existing).

**Count.** 0. **Files.** those five test files. **Must not:** `src/play/` code.

#### M4 · The picker's test off the panels (ui). Branch `ticket/084m4-ui-fixtures`, after A3 merges
1. [ ] `src/ui/maps.test.ts` imports `../../puzzles/fixtures/09-shrine-circuit.json`. The glob key it is filed under (`"../puzzles/09-shrine-circuit.json"`) is a string in the fixture and stays, since the case proves a schematic path is not listed. **test** (existing).

**Count.** 0. **Files.** `src/ui/maps.test.ts`. **Must not:** anything else (A2, C, D2 and E1 are the ui's other PRs).

#### M5 · Renderer tests off the panels (renderer). Branch `ticket/084m5-render-fixtures`, after A3 merges, beside B
1. [ ] `src/render3d/look.test.ts` and `relight3d.test.ts` read `puzzles/fixtures/09-shrine-circuit.json`. (`overlay.test.ts`'s read is A4's.) **test** (existing).
2. [ ] **The style guide's chapter 16 case** keeps its check that the chapter names the three maps, and drops the line that each is `puzzles/<id>.json` (that view was removed in 081, and the chapter is history). **test**: 1 rewritten.

**Count.** 1 rewritten. **Files.** `look.test.ts`, `relight3d.test.ts`, `styleguide.test.ts`. **Must not:** `overlay.test.ts` (A4's, then B's), `docs/city-style/`, any code.

#### M6 · The schematic panels go (puzzle-designer). Branch `ticket/084m6-panels-out`, after A6 and M1 to M5 merge; may share A6's PR
1. [ ] **Deleted:** every `puzzles/*.json` and `puzzles/*.grid.json` (the 64 numbered, `city-two-ways-round.json`, `lamp-row.grid.json`), their notes `puzzles/<id>.md`, and `puzzles/README.md` (the ladder). **Kept:** `puzzles/SCHEMA.md`, `puzzles/series-v1.md` (history), `puzzles/city/`, `puzzles/fixtures/`. **no test**.
2. [ ] **Nothing breaks.** CI's `test` check passes; a grep over `src/`, `tools/` and `tests/` for each deleted id finds only `puzzles/fixtures/` paths, string fixtures and comments, listed in the reply. **test** (existing).
3. [ ] **SCHEMA.md** opens: the schema is the plain map `src/grid/` plays; the files are city puzzles in `puzzles/city/` (*City puzzles*), and schematic files remain only as test fixtures in `puzzles/fixtures/` (084 M6; Josh, 28 Nov 2026: "Remove them too"). The check-block examples name `puzzles/city/<id>.city.json`. Nothing else in it changes. **no test**.

**Count.** 0. **Files.** `puzzles/` top level (deletions), `puzzles/SCHEMA.md`. **Must not:** `puzzles/city/`, `puzzles/fixtures/`, any code.

#### Main session: lines to change in `CLAUDE.md`, `docs/prototype-brief.md` and `.claude/agents/puzzle-designer.md` (with M6, not by an agent)
- `CLAUDE.md` line 3: "City puzzles live in `puzzles/city/`; the schematic panels in `puzzles/` stay as their source until they are fitted onto the city, with their schema in [puzzles/SCHEMA.md](puzzles/SCHEMA.md)." becomes "City puzzles live in `puzzles/city/`, with their schema in [puzzles/SCHEMA.md](puzzles/SCHEMA.md); the schematic panels were removed in ticket 084 (Josh, 28 Nov 2026: "Remove them too"), and the few the tests read are fixtures in `puzzles/fixtures/`."
- `CLAUDE.md` line 49 (the loop for a puzzle): "It writes `puzzles/<id>.grid.json` and `puzzles/<id>.md` ... and runs `npm run analyze puzzles/<id>.grid.json`." becomes "It writes `puzzles/city/<id>.city.json` and `puzzles/city/<id>.md` ... and runs `npm run analyze puzzles/city/<id>.city.json`."
- `CLAUDE.md` line 51: "copy the file to `puzzles/locked/`" becomes "copy the file to `puzzles/city/locked/`" (where the Map menu reads locked copies, `src/ui/maps.ts`). Line 9's rule ("Puzzles in `puzzles/locked/` are never edited") reads `puzzles/city/locked/` to match; the hook's path is the main session's to check.
- `docs/prototype-brief.md` line 88: the `puzzles/` row "Map files and their design notes" becomes "City puzzles (`puzzles/city/`) and their design notes; test fixtures (`puzzles/fixtures/`)"; line 89's `puzzles/locked/` becomes `puzzles/city/locked/`.
- `docs/prototype-brief.md` line 97: "`puzzles/lamp-row.grid.json`" becomes "`puzzles/fixtures/lamp-row.grid.json`".
- `docs/prototype-brief.md` lines 101 and 103 ("The eight maps load, pass the analyzer..."; "the analyzer runs over every map in CI"): the eight schematic maps are gone. Proposed: "The series puzzles load, pass the analyzer and can each be played to the Relight" and "the fit sweep replays every city puzzle in CI". These are the brief's *Done when*, so the wording is Josh's to confirm; none is a GDD rule.
- `.claude/agents/puzzle-designer.md` lines 3, 12, 23 and 30: `puzzles/<id>.json`, `.grid.json` and `npm run analyze puzzles/<id>.grid.json` become the `puzzles/city/` forms, and line 12's example `puzzles/09-shrine-circuit.json` becomes `puzzles/city/s01-first-light.city.json`.

---

### F · Performance (placeholder; renderer expected). No branch until Alice answers
Josh: "Ask Alice first (Recommended)". Nothing is built. The main session asks Alice, through Josh: the device (laptop or desktop, its make, its graphics if known), the operating system, the browser and its version, whether she played the itch.io page, which stages were slow, whether it is slow all the time or only when the camera moves, and the window size. When the answer is in, the architect re-cuts F with real criteria (likely the renderer, reading 081 F's `perf=1` numbers against her device class).

---

## Files
Per section, above (M1 to M6 included). This cut: `tickets/084-first-play.md`, `src/core/onboarding.ts` (new: `SymbolKind`, `SymbolAnchor`, `GuideUntil`, `GuideStep`, `GUIDE_TEXT_MAX`), `src/core/citycircuit.ts` (`CityPuzzle.guide?`), `src/core/index.ts` (the export), `tickets/rules-coverage.md` (two rows). The re-cut of 28 Nov 2026 (T, A1b): this file, `src/core/onboarding.ts` (adds `PuzzleTips`, `TIPS_TITLE_MAX`, `TIPS_LINE_MAX`, `TIPS_MAX_LINES`), `src/core/citycircuit.ts` (`CityPuzzle.tips?`), `tickets/rules-coverage.md` (the Relight row names 084 T3).

## Interfaces
- **In core now (this cut):** `src/core/onboarding.ts` as listed, exported from `src/core/index.ts`; `CityPuzzle.guide?: readonly GuideStep[]`. Typechecked (`npx tsc --noEmit`, clean). The validator for `guide` and `buildingNames` are A1's, after G1.
- **Added by B, in the renderer's own file:** `MapSymbols { symbols(): readonly SymbolAnchor[]; goalArrowAt(x: number, y: number): string | null }` and `MapOverlay.focus?: string | null` in `src/render3d/maprender.ts`. C and D2 code against them after B merges.
- **Added by A2:** `UIDeps.names?: ReadonlyMap<string, string>`.
- **No new event, no new dependency.** The guide listens to the existing `breaker:thrown`, `switch:thrown` and `repair:completed`.
- **In core now (the T re-cut):** `PuzzleTips { title: string; lines: readonly string[] }`, `TIPS_TITLE_MAX` (40), `TIPS_LINE_MAX` (160), `TIPS_MAX_LINES` (4) in `src/core/onboarding.ts` (exported through `src/core/index.ts`'s existing `export *`); `CityPuzzle.tips?: PuzzleTips`. Typechecked (`npx tsc --noEmit`, clean). The validator is T1's; the conversion's drop is A1b's.
- **Added by T3, in the ui's own file:** `firstPlayOrder` and `tipsBox` in `src/ui/onboarding.ts`. No new event: the clock hold is a dt of 0 in `main.ts`'s frame loop. No new dependency.

## Open questions (for Josh)
The first four were answered or settled on 28 Nov 2026 (see *Josh's answers* at the top): 1 "It goes too (Recommended)"; 2 "Remove them too"; 3 not asked, his earlier "Idle pulse (Recommended)" stands, breakers and switches only; 4 "Replace (Recommended)".

Section T: closed on 28 Nov 2026, on cards (see the top of section T): T-1, s09 and s10, "Leave them out (Recommended)"; T-2, the clock while the box is open, "Holds, always (Recommended)"; T-3, a stage already won, "Until won (Recommended)". The cut was written to these defaults, so no section changes.
