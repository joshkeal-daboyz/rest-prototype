# 006 · Play a panel: probe, breaker, drag a part, repair, satchel, fetch, log

owner: interaction
status: open
branch: ticket/006-play-panel
depends on: 002, 003, 005

## Goal
Josh can play `first-box` end to end: probe spots, throw the breaker, drag the wire onto the break, hold until the ring fills, throw the breaker back, and watch the Relight. Trying it live gives a timing mark and a shock on a miss. Everything he does is logged with a time stamp.

## Acceptance criteria
Pure parts (the repair state machine, the satchel, the log format, time costs) have Vitest tests in `src/play/`; the rest Josh checks in the browser.
- [ ] Click a node or line = probe. Costs `probeSeconds` of night time via `night.spend`. Hovering shows *Probe*.
- [ ] Click the breaker/switch = throw it. Prompt *Throw breaker* / *Throw switch*.
- [ ] Drag a part from the satchel onto a spot and hold the button: a repair starts only if the spot has a fault needing that part; otherwise the prompt reads *Needs: wire* (or whatever the fault needs) or, on a good spot, the hold runs and nothing changes (the part comes back). (test)
- [ ] Release before the ring fills: cancelled, part kept. (test)
- [ ] On a powered spot the prompt reads *Live line. Cut the power, or hold to risk it.*; a timing mark appears on the ring; clicking as it passes completes, otherwise `night.shock()` and the repair cancels with the part kept. (test for the window logic)
- [ ] Pause (Esc or hidden tab) cancels a live repair with no shock. (test)
- [ ] On `night:death`, every repair recorded this night is undone through the grid (the faults come back); on `night:dawn`, nothing is undone and a new night can start.
- [ ] Satchel: `satchel` slots, filled from `startingParts`; **Fetch parts** refills from `startingParts` and costs `fetchSeconds`.
- [ ] The session log records every probe, throw, repair start/complete/cancel, shock, fetch, dawn and death with game time, and can be exported as JSON. (test for the format)
- [ ] No drawing and no HUD text: prompts and satchel state are exposed as data for `src/ui/`.

## Files
`src/play/`

## Interfaces
```ts
createPanelPlay(puzzle, grid, night, renderer, bus): PanelPlay
interface PanelPlay {
  attach(canvas: HTMLCanvasElement): () => void
  view(): { prompt: string | null; satchel: readonly (Part | null)[]; selected: number | null; ring?: {...}; hover?: string }
  fetchParts(): void
  exportLog(): string
  tick(dtSeconds: number): void      // advances night and the renderer's overlay
}
```

## Open questions
- Should a wrong part on a faulted spot be refused (prompt only) or allowed and wasted? Ticket says refused; brief says time only. Josh to tune after panel 4.
