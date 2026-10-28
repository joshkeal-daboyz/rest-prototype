# 015 · More than one powersource on a map

owner: lead-architect (0), grid-simulator (A), renderer (B), interaction (C), ui (D), puzzle-designer (E)
status: in progress (G1: Josh, "I approve", with the defaults proposed in chat)
branch: one per part, `ticket/015-multiple-powersources-<part>`

## Josh's words
"We could also add puzzles with multiple powersources."

## Goal
A map can have two or more feeds (*powersources*), each with its own Lv capacity. Each feed carries the lamps nearest to it, and each is judged against its own level, so the player balances load **between** sources: moving a Lv2 lamp from the tired north feed to the south one with a switch is a move. Every existing map (one `feed`, top-level `capacity`) plays exactly as before.

## The rules, as cut (Draft, Josh's to tune)
1. **Separate pools.** Each feed has its own `capacity`. Capacities never add up into one shared pool: a shared pool would make a second source the same as one bigger source, and there would be no puzzle.
2. **Who carries what: nearest feed, the existing rule generalised.** Current spreads breadth-first from **all feeds at once**, seeded in the order the feeds appear in `nodes`. Every powered node and line is carried by exactly one feed: the one with the fewest hops to it; on a tie, the one the simulator reaches first (earlier feed in `nodes`, then the file's `lines` order, as now). A lamp's load counts toward that feed only, and toward the fuseboxes on that path only. One feed reproduces today's behaviour exactly. Where two feeds' flows meet, the meeting line is live and carries no load across; both feeds never share one lamp.
3. **Brownout is judged per feed, and the whole section browns out.** Feed *f* is over when the load it carries exceeds its `capacity`. If **any** feed is over, the section browns out as now: every lamp flickers, none count as lit, no win. (The brief's Draft rule says "the whole section browns out"; this keeps it. A local brownout is an open question below.)
4. **Fuses** are unchanged: a fusebox's load is the load carried through it, whichever feed that comes from; the blow check, `fuseLoad` and `wouldBlow` use the merged flow.
5. **Batteries** charge from **any** feed's flow reaching their `input` (the "feed's own flow" is now the union of every feed's flow). A released battery's far side stays free of fuse and brownout checks and counts toward no feed. Unchanged otherwise.
6. **Win:** every target lamp lit by some feed's flow (not only a released battery) and no brownout.
7. **Readability, spring switches, relays:** "current reaches it" means any feed or a released battery, as now. A fault can be read from either side.
8. **Existing maps:** a file with one feed and no feed `capacity` behaves identically; every existing test passes unchanged.

## Acceptance criteria
- [ ] **0 (lead-architect, at G1, before A):** the Interfaces below written into `src/core/` with validator tests in `src/core/load.test.ts`: two feeds without per-feed `capacity` is an error; per-feed `capacity` or >1 feed with `version` < 5 is an error; a non-string feed `name` is an error; every file in `puzzles/` still validates. `puzzles/SCHEMA.md` → draft 5 with rules 1–8.
- [ ] **A (grid-simulator):** Vitest tests in `src/grid/`, one per rule: (1) two feeds of Lv2 and Lv2 with three Lv1 lamps nearest the first browns out though the total (3) is under the sum (4); (2) attribution: a ring between two feeds puts each lamp on the nearer feed, a tie goes to the feed listed first, and `feedOf` reports it; throwing a switch that lengthens one side moves the lamp to the other feed; (3) one feed over → `brownout` true, `grid:brownout` carries `over: [thatFeed]`; (4) a fusebox fed from the second feed blows on that feed's load; (5) a battery charges from the second feed; (6) win needs no feed over; (7) a fault behind feed A's break is readable from feed B's side; (8) **every JSON file in `puzzles/`** gives `feeds` with one entry whose `load`/`capacity` equal the old `load`/`capacity`, and the existing test files pass without edits. Pure; no imports outside `src/core/`.
- [ ] **B (renderer, after A and 014 A):** each feed draws its own caption in 014's words (`Lv4 Powersource`, `using 3 of 4`); with two or more feeds, the feed's name above it (`North`). Only the feed that is over gets the alarm (`!`, shake); brownout flicker stays section-wide. Pulses leave every feed. Pure label/state helpers tested; Josh checks in the browser on E's maps.
- [ ] **C (interaction, after A and 014 B):** with two or more feeds, hover on a feed reads `North · Lv4 Powersource — using 3 of 4`; hover on a healthy lamp adds its carrier: `Lv2 Lamp · on North`; one-feed maps keep 014's strings. Tests.
- [ ] **D (ui, after A and 014 C):** the HUD shows one readout row per feed (`North · Lv4 Powersource — using 3 of 4`), in file order, `· Brownout` on the row(s) over; one-feed maps keep the single 014 row. The brownout notice names the feed: `Brownout: North Lv4 Powersource using 5 of 4`. `src/main.ts` passes `over` through. Tests in `src/ui/`.
- [ ] **E (puzzle-designer, after A):** two maps, version 5, with notes: **Two feeds** (the simplest: one switch moves a Lv2 lamp from the full feed to the spare one; trap: lighting it from the near, full feed browns out though the total fits) and **Meet in the middle** (a ring between two feeds; a breaker or switch changes which feed is nearer to the target; trap: the attribution). Verified against the simulator: the winning sequence, the trap's brownout and which feed is over, and how many switch/breaker settings win. No locked map touched.

## Files
- 0: `src/core/`, `puzzles/SCHEMA.md`
- A: `src/grid/`
- B: `src/render/`
- C: `src/play/`
- D: `src/ui/`, `src/main.ts` (passing `over` to `noticeFor` only)
- E: `puzzles/<new id>.json`, `puzzles/<new id>.md`

## Order
013 merges → 0 → A (A also branches after 013 A, which changed `src/grid/grid.ts`) → B, C, D in parallel, each after its 014 part → E can start as soon as A merges.

## Interfaces
Written by the lead-architect in part 0, on the part-0 branch (not now: `src/core/` has 013's uncommitted changes in the working tree). All additive; nothing existing changes meaning.
```ts
// src/core/schema.ts
export interface FeedNode extends NodeBase {
  type: "feed";
  /** This feed's limit; overrides the top-level `capacity`. Required when the map has two or more feeds. Draft 5. */
  capacity?: number | null;
  /** Display name when a map has several feeds ("North"). Absent = the id, underscores as spaces. Draft 5. */
  name?: string;
}
// Puzzle.version: 3 | 4 | 5. Top-level `capacity` stays required: on a one-feed map it is the feed's limit
// (unless the feed has its own); on a multi-feed map it is unused and should be null.

// src/core/state.ts — the grid-simulator makes GridState extend it in part A.
export interface FeedReadout { load: number; capacity: number | null; over: boolean }
export interface FeedState {
  /** Per feed id, in file order. One entry on a one-feed map, equal to the old load/capacity. */
  feeds: ReadonlyMap<string, FeedReadout>;
  /** Powered node or line id -> the feed whose flow carries it (feed flow only; a battery-only node is absent). */
  feedOf: ReadonlyMap<string, string>;
}

// src/core/events.ts
"grid:brownout": { brownout: boolean; load: number; capacity: number; over?: readonly string[] };
// `over`: the feed ids over their capacity (empty when cleared). `load`/`capacity` stay the totals for old readers.
```
`GridState.load` stays the total feed-carried load; `GridState.capacity` becomes the sum of feed capacities (null if any is null), a summary only: per-feed judging uses `feeds`. Validator: `feeds !== 1` error becomes `feeds >= 1`. No new dependencies.

## GDD check
- *"Power flows from the feed outward"* (Decided): read as the direction of flow, it holds: power flows outward from each feed. The wording is singular. **Not changed here**; if Josh reads the rule as "exactly one source", this ticket waits for him to amend the GDD.
- *Faults hide faults* and the fault signatures (Decided): unchanged, but a second feed can light the far side of a fault. A blown fuse between two feeds shows current in on both sides and none through, which still reads as "in, none out". Part E's notes must say where this happens.
- Capacity, brownout and fuse rating are **Draft** in the brief; rules 1–3 tune them, Josh's to approve.
- "Exactly one feed" was a schema rule (`SCHEMA.md`), not a GDD rule; draft 5 relaxes it.

## Open questions
- **Local brownout?** Cut as "any feed over → the whole section browns out" (the brief's Draft rule). The alternative: only the lamps the over feed carries flicker and the rest still count. That's more forgiving, and it changes a Draft rule. Josh's call after playing E's maps.
- **"Powersource" in files:** the node type stays `feed` in JSON and code (the 3D game's contract); "Powersource" is screen text only (ticket 014). OK?
- Should a map be able to give one feed **no** limit (`capacity: null`) beside a limited one? Allowed as cut; say if not.
