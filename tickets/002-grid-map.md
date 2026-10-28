# 002 · Grid simulator: map scope

owner: grid-simulator
status: review-passed
branch: ticket/002-grid-map

## Goal
Given a map and the player's throws and repairs, the simulator says what carries power, what is lit, what the player can read, whether the section is browned out, and whether the job is done. Pure logic; the renderer and interaction only read its state and events. This module is copied unchanged into the 3D game.

## Acceptance criteria
All as Vitest tests in `src/grid/`, each named for the rule. Fixtures: `puzzles/shrine-circuit.json`, `puzzles/lamp-row.grid.json`, plus small inline maps.
- [ ] Power flows from the feed outward along lines; a node or line with an unrepaired blocking fault conducts nothing past it. `flowFrom` records which node each powered line is fed from.
- [ ] Lamps are leaves: a `dead-lamp` never changes power anywhere else.
- [ ] A breaker conducts only while closed; a switch passes current only to `outputs[selected]` (the unselected output line is dead; current may enter the switch from any non-output line).
- [ ] Readability: a fault is readable only when current reaches it. Shrine circuit at start: readable = {f1}. Lamp Row at start: readable = {f1, f2, f7}; after repairing `fb_A` (give it a fuse), readable = {f1, f3, f4, f7}. `sparking` = lines with a readable `damaged-cable`.
- [ ] Fuse rating: after any change, a powered fusebox whose downstream lit load exceeds `rating` gains a new `blown-fuse` fault and emits `fuse:blown`; repeat until stable. Absent rating never blows; absent load = 1.
- [ ] Capacity: if total lit load > `capacity`, `brownout` is true; `grid:brownout` fires when it changes. `capacity: null` never browns out.
- [ ] `repairAt(id)` repairs the fault at a node or line: refused with `no-fault`, `unreadable`, or `needs-parts` (saying part, count, have); on success consumes `count` parts of that kind and emits `repair:completed`.
- [ ] `complete` = every `target` lamp lit and no brownout (`target` absent = every lamp). `job:completed` fires exactly once; after it, throws and repairs are refused (the Relight can't be interrupted).
- [ ] Shrine circuit is won in exactly three actions: throw `sw_1`, repair `l_b`, throw `br_street`; after step 2 it is browned out with load 6; after step 3 load is 3.
- [ ] `undo()` restores the previous throws, faults and parts; `reset()` returns to the file's state. `actions` counts throws and repairs.
- [ ] Deterministic; imports nothing from `src/render`, `src/play`, `src/ui` or the DOM.

## Files
`src/grid/`

## Interfaces
Export from `src/grid/index.ts` (the renderer codes against this in parallel, so keep the names):
```ts
createGrid(puzzle: Puzzle, bus?: EventBus): Grid
interface Grid {
  state(): GridState
  throwBreaker(nodeId: string): boolean
  throwSwitch(nodeId: string): boolean
  repairAt(at: string): RepairResult
  undo(): boolean
  reset(): void
}
interface GridState {
  powered: ReadonlySet<string>          // node and line ids carrying current
  flowFrom: ReadonlyMap<string, string> // powered line id -> node id the current enters from
  lit: ReadonlySet<string>              // lamps with power and no fault (even in brownout; see brownout)
  readableFaults: ReadonlySet<string>   // fault ids
  sparking: ReadonlySet<string>         // line ids
  fuseLoad: ReadonlyMap<string, number> // fusebox id -> feed-lit load downstream of it (what the blow check compares to rating); 0 if unpowered or blown (ticket 012)
  batteries: ReadonlyMap<string, { charge: number; capacity: number; released: boolean; charging: boolean }> // ticket 008
  faults: readonly Fault[]
  breakers: ReadonlyMap<string, boolean>
  switches: ReadonlyMap<string, 0 | 1>
  parts: readonly Part[]
  targets: readonly string[]
  load: number
  capacity: number | null
  brownout: boolean
  complete: boolean
  actions: number
}
type RepairResult =
  | { ok: true; fault: Fault }
  | { ok: false; reason: "no-fault" | "unreadable" | "needs-parts"; needs?: { part: Part; count: number; have: number } }
```
Types you need beyond `src/core/` go in `src/grid/`. Ask the lead-architect for anything that belongs in `src/core/`.

## Open questions
none
