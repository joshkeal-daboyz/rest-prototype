# 002 · Grid simulator: panel scope

owner: grid-simulator
status: open
branch: ticket/002-grid-panel

## Goal
Given a panel and the player's actions (probe, breaker, switch, repair), the simulator says what carries power, what the player can read, which lamps are lit, which fuses blew on load, and when the job is done. Pure logic; the renderer and interaction only read its state and events.

## Acceptance criteria
All as Vitest tests in `src/grid/`, each named for the rule. Use `puzzles/first-box.json` and `puzzles/lamp-row.grid.json` as fixtures.
- [ ] Power flows from the feed outward along lines; a node or line with an unrepaired blocking fault conducts nothing downstream. (brief: Rules)
- [ ] Lamps are leaves: a `dead-lamp` fault never changes power anywhere else.
- [ ] A breaker conducts only while `closed`; a switch only to `outputs[selected]`.
- [ ] **Readability, panel scope:** a node or line is readable only once probed this night *and* only if current can reach the probe point at the time of probing. Probing a dead panel records nothing. Probed spots stay readable for the night.
- [ ] **Signatures** derivable from state: `blown-fuse` = power into the fusebox, none out; `dead-lamp` = power reaches a dark lamp; `damaged-cable` = power up to the line and not past it. Sparks (`damaged-cable`) are visible without a probe: state exposes `sparking: string[]` regardless of probes.
- [ ] Faults hide faults: with `fb_A` blown in Lamp Row, exactly three faults are readable at the start (f1, f2, f7) even with everything probed; after f2 is repaired and power is on, f3 and f4 become readable.
- [ ] **Fuse rating:** when power is applied, a fusebox whose downstream lit-lamp load exceeds `rating` gains a new `blown-fuse` fault and emits `fuse:blown`. `rating` absent = never blows. `load` absent = 1.
- [ ] `repair(faultId)` removes the fault and emits `repair:completed`; the fault's part and hold come from `FAULT_RULES`. Repairing a spot with no fault is a no-op that returns `{ fixed: false }`.
- [ ] `job:completed` fires exactly once, when every lamp is lit (power on, no faults), and never while any lamp is dark.
- [ ] `grid:changed` fires once per state change with the right `reason`.
- [ ] Everything is deterministic and the module imports nothing from `src/render`, `src/play`, `src/ui` or the DOM.

## Files
`src/grid/`

## Interfaces
Export from `src/grid/index.ts`:
```ts
createGrid(puzzle: Puzzle, bus: EventBus): Grid
interface Grid {
  state(): GridState            // immutable snapshot
  probe(at: string): { live: boolean } | null   // null = nothing learned (dead panel)
  throwBreaker(nodeId: string): void
  throwSwitch(nodeId: string): void
  repair(faultId: string): { fixed: boolean }
  reset(): void                  // new night: probes clear, faults and repairs stay
}
interface GridState {
  powered: ReadonlySet<string>  // node and line ids carrying current
  lit: ReadonlySet<string>      // lamp ids
  probed: ReadonlySet<string>
  readableFaults: ReadonlySet<string>
  sparking: ReadonlySet<string>
  faults: readonly Fault[]      // current, including ones that blew on load
  breakers: ReadonlyMap<string, boolean>
  switches: ReadonlyMap<string, 0 | 1>
  complete: boolean
}
```
Add these to `src/core/` only through the lead-architect.

## Open questions
- Should a fuse that blows on load *also* count as the player's fault (i.e. is it a puzzle element or a punishment)? Brief treats it as the element under test in panel 7. Josh to confirm after playing it.
