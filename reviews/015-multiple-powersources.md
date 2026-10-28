ticket: 015-multiple-powersources
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A map can have two or more feeds, each with its own Lv capacity. The nearest feed carries each node (ties go to the earlier feed, then line order). Any feed over its own limit browns out the whole section. Every one-feed map plays exactly as before. The ticket spans core types and words (0), the simulator (A), renderer (B), hover (C), HUD and notices (D), and two new maps (E).

## Does the branch do it?
I ran `npm run typecheck` (clean) and `npm test` (22 files, 455 tests, all green) on `ticket/015` in D:\rp-015.

- **0 (core).** `FeedNode.capacity/name`, `version: 5`, `FeedInfo` with `puzzleFeeds`, `FeedReadout`/`FeedState`, `grid:brownout.over?` and the four word functions are all in `src/core/`, as the Interfaces section specifies. `load.test.ts` covers each validator case the ticket lists, including null beside limited, duplicate shown names and top-level capacity not null. The sweep also covers every file in `puzzles/`: one-feed maps give one feed with the old capacity, and the final commit adds a second sweep for multi-feed maps. `words.test.ts` covers the new functions. SCHEMA.md is now draft 5 and states rules 1–8. The only edit to an existing test is renaming "exactly one feed" to "at least one feed", which the validator change requires.
- **A (grid).** `GridState extends RepairForecast, FeedState` (`src/grid/types.ts`). `flow()` now takes a list of roots and runs one breadth-first search seeded with every feed in file order. That gives fewest hops, ties to the earlier feed, then line order, and one carrier per node and line. A line where two flows meet is marked powered but its far node is not re-entered, so it carries no load across. Limits come from `puzzleFeeds`, not from `puzzle.capacity`. Brownout is `some(feed.over)`. Fuse `sub` totals walk the `parent` forest, so a lamp counts toward the fuses on its own feed's path only. Battery `charging` and win both use the merged feed flow. Battery-only nodes stay out of `feedOf` and out of the load. Tests in `src/grid/feeds.test.ts`, one or more per rule:
  - (1) "two Lv2 feeds with three Lv1 lamps nearest the first brown out…"
  - (2) the chain/ring attribution, the tie in both feed orders, and "throwing a switch that lengthens one side moves the lamp to the other feed"
  - (3) entering, clearing with `over: []`, moving the over feed during a brownout, both feeds over in file order, and no event when the over set is unchanged
  - (4) a fusebox on the second feed blows
  - (5) a battery charges from the second feed
  - (6) win needs no feed over
  - (7) a fault behind A's breaker is readable from B's side, with the one-feed control case
  - (8) every one-feed map's `feeds` equals `load`/`capacity`, and `grid:brownout` has no `over` key

  The pre-existing grid test files are untouched.
- **B (render).** `src/render/feedcaps.ts` builds captions once and rebuilds a feed's strings only when that feed's load or capacity changes. The heading appears only on multi-feed maps. `isOver` uses the feed's own `over` on multi-feed maps and the section brownout on one-feed maps. `map-renderer.ts` loops over feeds, and `relight.ts` seeds distance 0 at every feed. Tested in `feedcaps.test.ts`. `render.test.ts` gained two fixture fields (`feeds`, `feedOf`), which the typecheck forces now that `GridState` is larger. It is not a behaviour edit.
- **C (play).** `prompt.ts` gives `North · Lv4 Powersource — using 3 of 4` on a feed and `Lv2 Lamp · on North` on a lamp that a feed carries. Only multi-feed maps take these paths, and they are built from the core words. `prompt.multifeed.test.ts` covers each string, the no-limit form and an unpowered lamp. The existing play tests pass unedited.
- **D (ui).** `capacityRows` returns the single `capacityReadout` row on a one-feed map, and on a multi-feed map one row per feed in file order, with ` · Brownout` and the alarm only on rows that are over. `brownoutNotices` gives one notice per over feed. In `main.ts`, the one-feed path (no `over`) still calls `noticeFor` exactly as before. Covered by `src/ui/feeds.test.ts`; the existing ui tests pass unedited. The extra `main.ts` line (`feeds` passed to `mountUI`) is outside the Files entry "notice wiring only". The UI has no other way to get the feed names, the change is a single, additive line, and it adds no rule. I judge it acceptable and a matter for the ticket's wording, not a blocker.
- **E (puzzles).** Both maps validate as version 5 and are appended to the README ladder with an explanation. No locked map is touched. I brute-forced both over the real `createGrid`:
  - **55:** starts North 3/3, South 2/4. Throwing `sw_s` wins (1 of 4 settings). Closing `br_n` browns out with North at 5/3 and `over: ["north"]`. Both thrown gives North 5/3 and South 1/4, with the shrine still on North. Swapping the feed order changes no node's carrier. All of this matches the note.
  - **56:** starts West 2/3, East 3/4. Exactly 1 of 16 settings wins (`sw_w` long, `sw_e` short, `br_sh` closed, `br_g` open), and 7 of 16 brown out. The trap matches the note: `br_sh` (with or without `br_g`) gives West 4/3 over. `sw_e` moves the well to West (3/3), and adding the shrine gives 5/3. `sw_w` + `br_sh` with the gate on gives East 5/4 over. Both switches long gives the same split as the start. Swapping the feed order changes no node's carrier. All of this matches the note.

  Both notes honestly say `npm run analyze` could not run. `tools/analyze.ts` doesn't exist on `main` either, so this is not the branch's fault.

## Rule conflicts and risks
- None found on purity: `src/grid/` imports only `../core` and itself. `src/core/load.ts` importing `./words` stays inside core. No new dependency.
- The Decided rule "Power flows from the feed outward" is read as the direction of flow, as the ticket's GDD check sets out; the branch doesn't change it. The rules that do change (capacity, brownout) are Draft. Josh should still confirm the singular reading.
- The one-feed DOM changes slightly: the capacity row is now a child `.readout.capacity` inside a flex wrapper. The CSS selectors still match. Josh should glance at it in the browser.
- Simulator note, not a defect: once `job:completed` fires, further actions are ignored. Anyone brute-forcing settings must throw the switches before the breakers, or the counts come out wrong. This tripped my first pass.

## Must fix
none

## Could improve
1. `src/grid/feeds.test.ts`, rule (1) test: the ticket says the total (3) is *under* the sum (4). The fixture adds a `b1` lamp, so the total equals the sum (4 of 4). Drop `b1`, or add a case with total 3, so the test asserts the case the ticket names.
2. `src/render/labels.ts`: `feedNamedCaption` is unused. Remove it (extra scope).
3. `src/play/prompt.ts`: `puzzleFeeds(puzzle)` is rebuilt on every hover call. Compute it once per map, as the renderer does.
4. Ticket Files list: record that D also touched `main.ts` to pass `feeds` into `mountUI`. Alternatively, pass the puzzle and let `src/ui` call `puzzleFeeds` itself.
5. Run `npm run analyze` on 55 and 56 once `tools/analyze.ts` exists, and paste its numbers into the notes.
