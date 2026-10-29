# 029 · Move 55 and 56 down the ladder: 55 becomes 05, 56 becomes 15

owner: puzzle-designer (P), lead-architect (0), grid-simulator (A), interaction (B), renderer (C), ui (D)
status: approved (G1, Josh, 29 Oct 2026: "approved")
branch: `ticket/029-ladder-reorder` (one branch for all parts, as 018)

## Josh's words
"55/56 are EASY those should be moved WAAAYYYY down the ladder. they aren't there"

"I want all of the things you mentioned"

## Goal
`55-two-feeds` and `56-meet-in-the-middle` sit where their difficulty puts them. This is the placement proposed in `puzzles/README.md`:
- 55 goes just after 04: it needs only capacity and the switch.
- 56 goes just after the first ring (13 today), and after 55.

The picker, Next level, the win splash's "All levels done", `?puzzle=` and the city all follow the new numbers. Every test loads the renamed file and asserts what it asserted before. Nothing about any map's content changes, and no rule changes. `npm run gate` is green.

## Approach: shift-all renumber, scripted
The file number is the order: the picker sorts by path, Next uses the picker order, and the city places a map by its leading number. So the only way to move a map is to renumber it and every map it passes. **No production code changes.**

**Which ids stay.**
- **01–04 keep their ids.**
- **57–64 keep their ids**, because two maps move up and two slots free up at 55–56.
- **Everything between shifts.**
  - Old 05–13 move up by 1, to 06–14.
  - Old 14–54 move up by 2, to 16–56.
- That is **52 maps (104 files)** renamed, and 12 unchanged.

**The script** (P writes it in its scratchpad; not committed). A probe of it on a scratch copy of `main` at `6e57033` ran clean:
1. **One pass over the full ids.**
   - The pattern is `(?<![\w-])(<old id>|…)(?![\w-])`, and each match is looked up in the table once.
   - It is never a chain of `sed`s. `27-open-point` and `45-open-point` share a slug, and bare numbers are never rewritten.
2. **The leading number in each moved map's text.**
   - In the JSON: the `"name": "NN · …"` prefix.
   - In the note: the `# NN · …` heading.
3. **Two-phase rename:** every moved file goes to `__tmp__<old>` first, then to `<new>`.
4. **Use plain filesystem renames, not `git mv`.**
   - Agents don't stage. The main session commits.
   - Each file changes only one or two lines, so git records it as a rename (`R` in `git diff -M --stat`).
5. **`puzzles/README.md` is excluded from the script.**
   - Its 018 table must keep its "new id" column as it was.
   - P edits the README by hand (see P below).

**Probe result** (the same rewrite applied to `src/**/*.test.ts` as well): 782 of 785 tests pass. The three that fail are the ones listed under C below, and no other test fails.
- The district layout tests pass, including no overlap, bounds inside, the footprint clip, and the 07/08 neighbour strip (now two different maps).
- `load.test.ts` validates all 64 renamed files.

## Old id → new id (ticket 029)
| Old id | New id |
| --- | --- |
| `01-first-light` … `04-the-tired-feed` | unchanged |
| `55-two-feeds` | `05-two-feeds` |
| `05-the-spark` | `06-the-spark` |
| `06-past-the-fuse` | `07-past-the-fuse` |
| `07-where-it-stops` | `08-where-it-stops` |
| `08-shrine-circuit` | `09-shrine-circuit` |
| `09-around-the-dead-post` | `10-around-the-dead-post` |
| `10-the-small-fuse` | `11-the-small-fuse` |
| `11-which-fuse` | `12-which-fuse` |
| `12-one-box-three-lamps` | `13-one-box-three-lamps` |
| `13-ring-from-the-east` | `14-ring-from-the-east` |
| `56-meet-in-the-middle` | `15-meet-in-the-middle` |
| `14-behind-the-first` | `16-behind-the-first` |
| `15-count-the-dark` | `17-count-the-dark` |
| `16-the-long-way-round` | `18-the-long-way-round` |
| `17-why-it-blew` | `19-why-it-blew` |
| `18-battery-run` | `20-battery-run` |
| `19-wake-the-relay` | `21-wake-the-relay` |
| `20-look-both-ways` | `22-look-both-ways` |
| `21-make-room` | `23-make-room` |
| `22-one-wire` | `24-one-wire` |
| `23-only-the-relays` | `25-only-the-relays` |
| `24-far-one-first` | `26-far-one-first` |
| `25-switch-before-breaker` | `27-switch-before-breaker` |
| `26-last-light` | `28-last-light` |
| `27-open-point` | `29-open-point` |
| `28-which-break` | `30-which-break` |
| `29-leave-the-ring-open` | `31-leave-the-ring-open` |
| `30-read-it-in-the-window` | `32-read-it-in-the-window` |
| `31-take-the-feed-out` | `33-take-the-feed-out` |
| `32-main-fuse` | `34-main-fuse` |
| `33-cell-light` | `35-cell-light` |
| `34-set-it-dark` | `36-set-it-dark` |
| `35-spend-the-fuse-first` | `37-spend-the-fuse-first` |
| `36-look-behind` | `38-look-behind` |
| `37-what-is-left` | `39-what-is-left` |
| `38-the-priests-list` | `40-the-priests-list` |
| `39-room-to-charge` | `41-room-to-charge` |
| `40-two-windows` | `42-two-windows` |
| `41-parent-fuse` | `43-parent-fuse` |
| `42-set-in-the-light` | `44-set-in-the-light` |
| `43-live-relays` | `45-live-relays` |
| `44-read-it-from-behind` | `46-read-it-from-behind` |
| `45-open-point` | `47-open-point` |
| `46-the-old-arrangement` | `48-the-old-arrangement` |
| `47-two-cells` | `49-two-cells` |
| `48-the-whole-quarter` | `50-the-whole-quarter` |
| `49-thrown-twice` | `51-thrown-twice` |
| `50-wire-short` | `52-wire-short` |
| `51-from-behind` | `53-from-behind` |
| `52-the-whole-circuit` | `54-the-whole-circuit` |
| `53-leave-it-blown` | `55-leave-it-blown` |
| `54-whole-ward` | `56-whole-ward` |
| `57-the-back-door` … `64-the-whole-chain` | unchanged |

## The city (verified, nothing breaks)
`districtOf(n)` puts map 01 on the hub and maps 02–64 along 8 spokes of 8 slots. Ladder 2–9 is on spoke 0, 10–17 on spoke 1, and so on.
- **A moved map takes the district of its new number.**
  - Old 05–13 each move one slot outward. Old 09 crosses from the end of spoke 0 to the start of spoke 1.
  - `05-two-feeds` sits on spoke 0, and `15-meet-in-the-middle` on spoke 1.
- **Districts are identical squares,** and every test on them is generic (bounds inside, footprint clipped to the district, no overlap). So a shift only moves the backdrop under a map and changes its neighbours.
- **The four maps clipped to their district today** (31, 53, 54, 59) become 33, 55, 56 and 59, and they are clipped exactly as before.
- **Josh will see** a different patch of town around each moved map. Nothing else changes.

## Parts
All parts are independent (disjoint files) and run **in parallel in the one working tree**, on `ticket/029-ladder-reorder`, the same way as 018:
- No agent runs `git add`, `commit`, `stash`, `checkout`, `reset`, `restore`, `mv` or `switch`.
- Each part checks only its own folder: `npx vitest run src/<folder>`, or `npx vitest run src/core/load.test.ts` for P.
- Each part reports the files it changed and its folder's test count.

| Part | Owner | Files | What |
| --- | --- | --- | --- |
| P | puzzle-designer | `puzzles/*.json`, `puzzles/*.md` (not `locked/`, which is empty) | Rename the 104 files, rewrite the ids, the `name` prefixes, the note headings and the full-id cross-references (script above). Then go through all 64 notes by hand for **bare** ladder numbers the script can't know: "map 56", "after 13", "see 18", "(B05)". Each one that names a moved map gets its new number, unless it is a historical tag such as `(B05)`, which stays. |
| P | puzzle-designer | `puzzles/README.md` | Rows reordered: 55 after 04, 56 after the old 13. Renumbered 01–64. Intro and the "55 and 56" paragraph rewritten: they are now ranked, at 05 and 15, by ticket 029. A new section, **"Ticket 029: old id → new id"**, with the table above. The 018 table stays as written, with a one-line pointer to the 029 table. |
| 0 | lead-architect | `src/core/load.test.ts` | `08-shrine-circuit` → `09-shrine-circuit` (5 reads, 1 comment). |
| 0 | lead-architect | `tickets/026-buildings-focus.md`, `tickets/027-larger-maps.md` | Only the map ids and numbers that name a map, mapped by the table. In 026, Josh's browser list. In 027: `08`, `05-the-spark`, `47`, `54-whole-ward`, and "today 31, 53, 54, 59" → "33, 55, 56, 59". The meaning is unchanged. These are open tickets, so their builders code against the new ids. |
| A | grid-simulator | `src/grid/grid.test.ts`, `fuseload.test.ts`, `culprit.test.ts`, `spring.test.ts`, `battery.test.ts`, `blownlamps.test.ts` | File paths and ids: 08 → 09, 11 → 12, 18 → 20. The comment in `blownlamps` changes 17 → 19, but its inline puzzle (`"ladder-08-why-it-blew"`) stays as is. |
| B | interaction | `src/play/play.test.ts`, `elapsed.test.ts`, `click-event.test.ts`, `pan.test.ts` | 08 → 09; `19-wake-the-relay` → `21-wake-the-relay`. |
| C | renderer | `src/render/render.test.ts`, `readable-failures.test.ts`, `pan.test.ts`, `city.test.ts`, `places.test.ts` | Paths: 08 → 09, 18 → 20. **The three the script can't fix:** (1) `city.test.ts` "reads the leading digits" uses `08-where-it-stops` → 8, `locked/08-where-it-stops` → 8, `15-meet-in-the-middle` → 15. (2, 3) `places.test.ts` lines 94 and 164: `o.key.startsWith("08")` → `o.key === "09-shrine-circuit"`, so the test pins the map by id and not by number. The title "map 08" → "map 09". Line 226's `locked/07-where-it-stops` → `locked/08-where-it-stops`. The neighbour pairs `[7, 8]`, `[1, 2]` stay. |
| D | ui | `src/ui/maps.test.ts`, `src/ui/win.test.ts` | `maps.test.ts`: 08 → 09 throughout (import path, keys, the duplicate-key message). `win.test.ts`'s fake list: its last open entry becomes `{ id: "64-the-whole-chain", name: "64 · The whole chain" }`, and its assertion is unchanged ("null on the last open map"). |

Test titles that name a map by id take the new id. Titles in plain words stay.

## Acceptance criteria
- [ ] **(Vitest, P)** `npx vitest run src/core/load.test.ts`: every file in `puzzles/` validates, still 64 maps + `lamp-row`.
- [ ] **(script check, P)** Every map's id equals its file name. Its `name` and its note's heading start with the file's number. The numbers 01–64 are each used exactly once, with no gap.
- [ ] **(diff, main session)** `git diff -M --stat` on the branch shows 104 renames (`R`). Each moved JSON changes only its `id` and `name` lines, plus any full-id text. Node, line, fault, part and target content is byte-identical. Check: `JSON.stringify` of every file with `id` and `name` removed equals its old twin.
- [ ] **(grep, main session)** None of the 52 old ids that change (full `NN-slug`, from the table) appears in `src/` or in the notes. The exceptions are the README's 018 and 029 tables and closed tickets.
  - No old full id equals any new one, so a grep for each is exact.
  - The two `open-point` maps move from 27 and 45 to 29 and 47. Neither new id is an old id.
- [ ] **(Vitest, each code part)** Every changed test keeps asserting the same thing: the same `expect`s, values and element ids. Only a path, a map id, a title's map name, or the C/D items above change. No test is added, removed, skipped or loosened.
- [ ] **(gate, main session)** `npm run gate` is green on `ticket/029-ladder-reorder`. The test count equals `main`'s, file for file (**785** at `6e57033`).
- [ ] **(city, Vitest, C)** `src/render/city.test.ts` and `streets.test.ts` pass **unchanged** apart from the lines named above. In particular, every map's bounds sit inside the district of its new number, and no districts overlap.
- [ ] **(Josh, browser)** `npm run dev`:
  - The picker reads 01 First light … 04 The tired feed, **05 Two feeds**, 06 The spark … 14 Ring from the east, **15 Meet in the middle**, 16 Behind the first … 64 The whole chain.
  - Win 04: Next goes to 05 Two feeds. Win 14: Next goes to 15.
  - Win 64: "All levels done."
  - `?puzzle=05-two-feeds` opens it. An old link such as `?puzzle=56-meet-in-the-middle` opens map 01, as any unknown id does today.

## Files
Per part, as in the table. Out of scope for every part: production code (`src/**` apart from `*.test.ts`), `puzzles/locked/`, `puzzles/SCHEMA.md`, `docs/`, `.claude/`, and closed tickets. Closed tickets keep the ids that were true when they were written, as with 018.

## Order
- **Before 026 A and the 027 parts start.**
  - Their branches (`ticket/026-buildings-focus-a`, `ticket/027-larger-maps`) are still at `6e57033`, with no commits. They should branch again from main after 029 merges, so they never code against the old ids.
  - `ticket/026-buildings-focus-b` has one commit, in `src/ui/logic.ts`, `logic.test.ts` and `main.ts`, which name no map id. Its rebase is clean.
- About half a day in total. P is most of it.
- When all six parts report, the main session runs `npm run gate` once, checks the count and the diff, and makes one commit with Josh's words.

## Interfaces
None. No `src/core/` type, schema, event or production code change. No new dependencies.

## Follow-up (not in this ticket; listed, not fixed)
- `.claude/agents/sound.md` names `17-why-it-blew`, `55-two-feeds` and `19-wake-the-relay`. They become `19-why-it-blew`, `05-two-feeds` and `21-wake-the-relay`. That file is agent configuration, so the main session or Josh edits it.
- `.claude/agents/puzzle-designer.md` still names `shrine-circuit` (from 018's follow-up), now `09-shrine-circuit`.
- Session logs already downloaded record the old ids. The 029 table translates them.

## Open questions
1. **Old links:** an old `?puzzle=` link (old id) opens map 01, as any unknown id does today. Should the picker also accept the old ids as aliases for a while? That would be a small ui part with a table in code. Cut **without** aliases: this is a prototype, and the README table is the record.
2. **Other easy maps out of place?** 55 and 56 move here. The README's ranking also had the deep tier 57–64 "appended, not ranked", but on purpose: depth, not clicks. Leave 57–64 at the end, as cut? Any other map you found easy, I can fold into this same renumber now, which is cheaper than a second one later.
