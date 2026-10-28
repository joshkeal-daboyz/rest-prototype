# 015 · More than one powersource on a map

owner: lead-architect (0), grid-simulator (A), renderer (B), interaction (C), ui (D), puzzle-designer (E)
status: done (merged; Josh: "Merge, push")
branch: one per part, `ticket/015-<part>`: `ticket/015-0`, `ticket/015-a`, `-b`, `-c`, `-d`, `-e`

## Josh's words
"We could also add puzzles with multiple powersources."

## Goal
A map can have two or more feeds (*powersources*), each with its own Lv capacity. Each feed carries the lamps nearest to it, and each is judged against its own level, so the player balances load **between** sources: moving a Lv2 lamp from the tired north feed to the south one with a switch is a move. Every existing map (one `feed`, top-level `capacity`) plays exactly as before.

## The rules, as cut (Draft, Josh's to tune)
1. **Separate pools.** Each feed has its own `capacity`. Capacities never add up into one shared pool: a shared pool would make a second source the same as one bigger source, and there would be no puzzle.
2. **Who carries what: nearest feed, the existing rule generalised.** Current spreads breadth-first from **all feeds at once**, seeded in the order the feeds appear in `nodes`. Every powered node and line is carried by exactly one feed: the one with the fewest hops to it; on a tie, the one the simulator reaches first (earlier feed in `nodes`, then the file's `lines` order, as now). A lamp's load counts toward that feed only, and toward the fuseboxes on that path only. One feed reproduces today's behaviour exactly. Where two feeds' flows meet, the meeting line is live and carries no load across; both feeds never share one lamp.
3. **Brownout is judged per feed, and the whole section browns out.** Feed *f* is over when the load it carries exceeds its `capacity`. If **any** feed is over, the section browns out as now: every lamp flickers, none count as lit, no win. (The brief's Draft rule says "the whole section browns out"; this keeps it. A local brownout is an open question below.)
4. **Fuses** are unchanged: a fusebox's load is the load carried through it, whichever feed that comes from; the blow check, `fuseLoad`, `wouldBlow` and `fuse:blown`'s `lamps` (016) use the merged flow.
5. **Batteries** charge from **any** feed's flow reaching their `input` (the "feed's own flow" is now the union of every feed's flow). A released battery's far side stays free of fuse and brownout checks and counts toward no feed. Unchanged otherwise.
6. **Win:** every target lamp lit by some feed's flow (not only a released battery) and no brownout.
7. **Readability, spring switches, relays:** "current reaches it" means any feed or a released battery, as now. A fault can be read from either side.
8. **Existing maps:** a file with one feed and no feed `capacity` behaves identically; every existing test passes unchanged.

## The words (Josh's answer 1 on 017: the dot separator everywhere)
All built in `src/core/words.ts` (part 0); B, C and D call these and write no name format themselves. On a **one-feed map nothing changes**: 014/017's strings stay exactly as they are.

| Where | Multi-feed map | Built from |
| --- | --- | --- |
| Map, above a feed (B) | `North` | `FeedInfo.name` from `puzzleFeeds` |
| Map, feed caption (B) | `Lv4 Powersource`, `using 3 of 4`; alarm on the over feed only | existing `powersourceLabel`, `usingText` (via `src/render/labels.ts`) |
| Hover, feed (C) | `North · Lv4 Powersource — using 3 of 4` | `namedPowersourceLabel(name, capacity)` + ` — ` + `usingText(load, capacity)` |
| Hover, healthy powered lamp (C) | `Lv2 Lamp · on North` (unpowered or battery-only: `Lv2 Lamp`) | `lampOnLabel(load, name)` |
| HUD, one row per feed in file order (D) | `North · Lv4 Powersource — using 3 of 4`, plus ` · Brownout` on a row that is over | `namedPowersourceLabel` + ` — ` + `usingText` |
| Notice, brownout (D) | `Brownout: North · Lv4 Powersource using 5 of 4` (one notice per over feed, or one line per feed, D's choice) | `Brownout: ` + `namedPowersourceLabel` + ` ` + `usingText` |

## Acceptance criteria
- [x] **0 (lead-architect, Vitest in `src/core/`):** the Interfaces below written into `src/core/`. `src/core/load.test.ts`: two feeds without per-feed `capacity` is an error; per-feed `capacity`, a feed `name`, or >1 feed with `version` < 5 is an error; a non-string or empty feed `name` is an error; two feeds shown under the same name is an error; top-level `capacity` not null on a multi-feed map is an error; a feed `capacity: null` beside a limited one is allowed; every file in `puzzles/` still validates and `puzzleFeeds` gives each one feed with the old top-level `capacity`. `src/core/words.test.ts`: each new word function. `puzzles/SCHEMA.md` → draft 5 with rules 1–8. `npm run gate` green.
- [ ] **A (grid-simulator):** `GridState extends RepairForecast, FeedState` and fills `feeds`/`feedOf` on every settle, reading each feed's limit from `puzzleFeeds` (not from `puzzle.capacity`). Vitest tests in `src/grid/`, one per rule: (1) two feeds of Lv2 and Lv2 with three Lv1 lamps nearest the first browns out though the total (3) is under the sum (4); (2) attribution: a ring between two feeds puts each lamp on the nearer feed, a tie goes to the feed listed first, and `feedOf` reports it; throwing a switch that lengthens one side moves the lamp to the other feed; (3) one feed over → `brownout` true, `grid:brownout` carries `over: [thatFeed]`; moving the over-load from one feed to the other during a brownout fires again with the new `over`; clearing fires with `over: []`; (4) a fusebox fed from the second feed blows on that feed's load; (5) a battery charges from the second feed; (6) win needs no feed over; (7) a fault behind feed A's break is readable from feed B's side; (8) **every JSON map in `puzzles/`** gives `feeds` with one entry whose `load`/`capacity` equal `GridState.load`/`capacity`, and on a one-feed map `grid:brownout` has **no `over` key** (`src/grid/grid.test.ts` compares the payload with `toEqual`); the existing test files pass without edits. Pure; no imports outside `src/core/`.
- [ ] **B (renderer):** each feed draws its own caption (`Lv4 Powersource`, `using 3 of 4`, from `labels.ts` as now); with two or more feeds, the feed's name (`FeedInfo.name`) above it. Only the feed whose `feeds` entry is `over` gets the alarm (`! using 5 of 4 !`, shake); brownout flicker stays section-wide. Pulses leave every feed. Captions built once per map and rebuilt only when that feed's `load`/`capacity` change (no per-frame strings, as 014 A). Pure label/state helpers tested in `src/render/`; one-feed render tests pass unedited. Josh checks in the browser on E's maps.
- [ ] **C (interaction):** with two or more feeds, `src/play/prompt.ts` gives hover on a feed `North · Lv4 Powersource — using 3 of 4`, and on a healthy lamp carried by a feed `Lv2 Lamp · on North` (via `feedOf`); one-feed maps keep the 014/017 strings and the existing `src/play/` tests pass unedited. New tests for each multi-feed string.
- [ ] **D (ui):** `src/ui/logic.ts` gives one readout row per feed (`North · Lv4 Powersource — using 3 of 4`), in file order, ` · Brownout` on the row(s) over; one-feed maps keep the single 014 row (`capacityReadout` unchanged). The brownout notice names the over feed(s): `Brownout: North · Lv4 Powersource using 5 of 4`. `src/main.ts` builds that notice from the event's `over`, `puzzleFeeds(puzzle)` and `grid.state().feeds`; on one-feed maps (no `over`) it calls `noticeFor` exactly as now. Tests in `src/ui/`; existing `src/ui/` tests pass unedited.
- [ ] **E (puzzle-designer):** two maps, version 5, with notes: **Two feeds** (the simplest: one switch moves a Lv2 lamp from the full feed to the spare one; trap: lighting it from the near, full feed browns out though the total fits) and **Meet in the middle** (a ring between two feeds; a breaker or switch changes which feed is nearer to the target; trap: the attribution). Files `puzzles/55-<slug>.json` and `puzzles/56-<slug>.json` (+ `.md`), appended to the ladder in `puzzles/README.md` (see Open questions). Verified against the simulator: the winning sequence, the trap's brownout and which feed is over, and how many switch/breaker settings win. `npm run analyze` on each. No locked map touched.

## Files
- 0: `src/core/`, `puzzles/SCHEMA.md`, this ticket.
- A: `src/grid/`
- B: `src/render/`
- C: `src/play/`
- D: `src/ui/`, `src/main.ts` (the `grid:brownout` notice wiring only)
- E: `puzzles/55-<slug>.json`, `puzzles/56-<slug>.json`, their `.md` notes, the ladder table in `puzzles/README.md`

## Order
013, 014, 016, 017 and 018 have merged. **0** (this branch, `ticket/015-0`) → **A** branched from `main` after 0 merges → **B, C, D in parallel**, each branched from `main` after A merges (they read `feeds`/`feedOf` from `GridState`) → **E** after A merges (it can run beside B–D; Josh plays E's maps once B–D are in).

## Interfaces
Written in part 0 on `ticket/015-0`. All additive; nothing existing changes meaning. No new dependencies.

```ts
// src/core/schema.ts
export interface FeedNode extends NodeBase {
  type: "feed";
  capacity?: number | null;  // overrides top-level `capacity`; required (null allowed) when 2+ feeds. Draft 5.
  name?: string;             // screen name ("North"); absent = id with underscores as spaces. Draft 5.
}
// Puzzle.version: 3 | 4 | 5. Top-level `capacity` stays required; on a multi-feed map it must be null.

// src/core/load.ts — the one place the capacity/name rule lives. A–D read feeds through this.
export interface FeedInfo { id: string; name: string; capacity: number | null }
export function puzzleFeeds(puzzle: Puzzle): readonly FeedInfo[];  // file order; one-feed map → old capacity

// src/core/state.ts — STUB (like RepairForecast); A makes `GridState extends RepairForecast, FeedState`.
export interface FeedReadout { load: number; capacity: number | null; over: boolean }
export interface FeedState {
  feeds: ReadonlyMap<string, FeedReadout>;  // per feed id, file order, every feed (powered or not)
  feedOf: ReadonlyMap<string, string>;      // powered node/line id -> carrying feed id; battery-only absent; a feed maps to itself
}

// src/core/events.ts
"grid:brownout": { brownout: boolean; load: number; capacity: number; over?: readonly string[] };
// One-feed map: `over` absent (key not set), load/capacity as now. Multi-feed: `over` = over feed ids in file
// order ([] when cleared); also fires when the over set changes during a brownout; load = total feed-carried
// load, capacity = sum of the limited feeds' capacities (summary for old readers). Fires only if some feed is limited.

// src/core/words.ts — pure, no imports. B–D call these; none writes a name format itself.
export const NAME_SEP = " · ";
export function powersourceName(id: string, name?: string): string;              // "North" / "north feed"
export function namedPowersourceLabel(name: string, capacity: number | null): string; // "North · Lv4 Powersource"
export function onPowersourceText(name: string): string;                          // "on North"
export function lampOnLabel(load: number, feedName: string): string;              // "Lv2 Lamp · on North"
```
`GridState.load` stays the total feed-carried load; `GridState.capacity` becomes the sum of feed capacities (null if any is null), a summary only: per-feed judging uses `feeds`. Validator: `feeds !== 1` became `feeds >= 1`.

## GDD check
- *"Power flows from the feed outward"* (Decided): read as the direction of flow, it holds: power flows outward from each feed. The wording is singular. **Not changed here**; if Josh reads the rule as "exactly one source", this ticket waits for him to amend the GDD.
- *Faults hide faults* and the fault signatures (Decided): unchanged, but a second feed can light the far side of a fault. A blown fuse between two feeds shows current in on both sides and none through, which still reads as "in, none out". Part E's notes must say where this happens.
- Capacity, brownout and fuse rating are **Draft** in the brief; rules 1–3 tune them, Josh's to approve.
- "Exactly one feed" was a schema rule (`SCHEMA.md`), not a GDD rule; draft 5 relaxes it.

## Rules coverage
`tickets/rules-coverage.md` already maps "Capacity … per feed on multi-feed maps" and "Power flows from the feed outward (each feed)" to 015 A.

## Open questions
- **Local brownout?** Cut as "any feed over → the whole section browns out" (the brief's Draft rule). The alternative: only the lamps the over feed carries flicker and the rest still count. That's more forgiving, and it changes a Draft rule. Josh's call after playing E's maps.
- **"Powersource" in files:** the node type stays `feed` in JSON and code (the 3D game's contract); "Powersource" is screen text only (ticket 014). (Accepted with the defaults.)
- A feed may have **no** limit (`capacity: null`) beside a limited one: allowed and tested in part 0. (Accepted with the defaults.)
- **Where E's two maps sit on the ladder.** Cut as 55 and 56 at the end, so no existing file is renumbered. If Josh wants them earlier (they are gentle), that is a later reorganization like 018's, not part of this ticket.
- Part 0 made two validator rules stricter than the cut's "should": the top-level `capacity` **must** be null on a multi-feed map, and two feeds may not show the same name. Say if either should be relaxed.
