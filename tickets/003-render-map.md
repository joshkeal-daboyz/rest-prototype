# 003 · Render a map

owner: renderer
status: review-passed
branch: ticket/003-render-map
depends on: 002 (interface only; build against the `GridState` in ticket 002 and merge after it)

## Goal
Josh opens the shrine circuit and sees a dark town section: the feed with its capacity, cables, junctions, the fuse box with its rating, breakers and switches with the tribe's marks, lamps with their load, the shrine marked as the target. Live cables pulse away from the feed; the damaged cable sparks when live; brownout makes every lamp flicker; the Relight runs when the job completes.

## Acceptance criteria
Josh checks in the browser unless marked (test).
- [ ] Drawn from `Puzzle` + `GridState` only; imports from `src/core/` and the types in `src/grid/`, nothing else in `src/`. (test: a static import check over the folder)
- [ ] Map coordinates fit the canvas with padding; `resize()` refits. `hitTest(x, y)` returns the node or line id under a point (nodes win over lines). (test: pure geometry in a tested module)
- [ ] Powered lines show pulses moving from `flowFrom[line]` to the other end; dead lines are flat and dull. Direction is obvious at a glance.
- [ ] Sparks on `sparking` lines. A readable `dead-junction` / `blown-fuse` / `dead-lamp` gets a visible mark; an unreadable one looks like a healthy node.
- [ ] Breaker shows open/closed; switch shows which output it points at; fusebox shows rating; lamp shows load; feed shows `load / capacity`.
- [ ] Lit lamps glow with a light pool; in `brownout` every lamp flickers and the feed readout is drawn in the alarm colour. Light states never depend on colour alone.
- [ ] Target lamps are marked (ring + glyph). Hovered element (given by the caller) is highlighted.
- [ ] The Relight: on `complete`, the caller passes `relightT` (seconds since completion); power travels from the feed along powered lines at a visible speed and lamps ignite in order of path distance with a flare; 2–4 s total for the shrine circuit. Ordering/timing logic is pure and tested. (test: shrine-circuit ignition order has `flood` before `shrine`)
- [ ] No allocations in the draw loop; geometry precomputed per puzzle.

## Files
`src/render/`

## Interfaces
```ts
createMapRenderer(canvas: HTMLCanvasElement, puzzle: Puzzle): MapRenderer
interface MapRenderer {
  draw(state: GridState, overlay: { hover?: string | null; relightT?: number }, timeSeconds: number): void
  hitTest(x: number, y: number): string | null
  resize(): void
}
```

## Open questions
none
