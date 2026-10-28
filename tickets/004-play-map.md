# 004 · Play a map

owner: interaction
status: review-passed
branch: ticket/004-play-map
depends on: 002, 003

## Goal
Josh clicks a breaker or switch to throw it and clicks a readable fault to repair it; a prompt names what the thing under the pointer is and what it needs; every action is logged.

## Acceptance criteria
Pure parts (prompt selection, the log format) have Vitest tests; the rest Josh checks in the browser.
- [ ] Pointer over an element → `view().hover` is its id and `view().prompt` is one of: *Throw breaker*, *Throw switch*, *Repair (wire)*, *Needs: wire × 2*, or null for anything else. Unreadable faults get no repair prompt. (test)
- [ ] Click a breaker/switch → `grid.throwBreaker/throwSwitch`. Click a readable fault → `grid.repairAt`; on `needs-parts` the prompt shows the shortfall for a second.
- [ ] Undo and Reset are exposed as methods (the UI gets buttons).
- [ ] After `job:completed`, clicks are ignored and `view().relightT` counts up from 0 (the Relight can't be interrupted).
- [ ] Session log: every throw, repair, refused repair, undo and reset with a monotonic step and wall-clock time; `exportLog()` returns JSON. (test)
- [ ] No drawing and no HUD text beyond the prompt string: the UI reads `view()`.

## Files
`src/play/`

## Interfaces
```ts
createMapPlay(puzzle: Puzzle, grid: Grid, renderer: MapRenderer, bus: EventBus): MapPlay
interface MapPlay {
  attach(canvas: HTMLCanvasElement): () => void
  view(): { hover: string | null; prompt: string | null; relightT: number | null }
  undo(): void; reset(): void
  exportLog(): string
  tick(dtSeconds: number): void
}
```

## Open questions
none
