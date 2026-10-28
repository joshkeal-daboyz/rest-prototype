# 005 · Render a panel

owner: renderer
status: open
branch: ticket/005-render-panel
depends on: 002

## Goal
Josh opens `first-box` and sees a dark fuse box: terminals, wires, the fuse holder, the breaker, the feed, and the two loads. Probed spots show live pulses or a dead line; the damaged wire sparks; a repair ring fills; and when the job completes, the Relight runs through the panel and lights the loads.

## Acceptance criteria
Josh checks in the browser unless marked (test).
- [ ] The panel is drawn from `Puzzle` + `GridState` only; the renderer imports from `src/core/` and nothing else in `src/`. (test: a static import check)
- [ ] Unprobed spots show no current state. Probed live lines show pulses moving **away from the feed**; probed dead lines are flat and dull. Direction is obvious at a glance.
- [ ] Sparks on a `damaged-cable` line show without a probe.
- [ ] A blown fuse is drawn identically to a good one until both sides are probed.
- [ ] Lit lamps glow with a pool; dark ones don't. Light states never depend on colour alone (motion, shape or brightness differs too).
- [ ] The repair ring is drawn at a given spot from `{ progress: 0..1, mark?: 0..1 }` supplied by the caller.
- [ ] On `job:completed`, the Relight: power travels from the feed along the lines at a visible speed and loads ignite in order of distance with a flare; 1.5–3 s total for `first-box`. Pure ordering/timing logic in a tested module. (test: Relight order for first-box is [lamp_a, lamp_b] or tie)
- [ ] 60 fps on an integrated GPU for a 30-node panel; no allocations in the draw loop (geometry precomputed per puzzle).

## Files
`src/render/`

## Interfaces
```ts
createPanelRenderer(canvas: HTMLCanvasElement, puzzle: Puzzle): PanelRenderer
interface PanelRenderer {
  draw(state: GridState, overlay: { hover?: string; ring?: { at: string; progress: number; mark?: number }; relightT?: number }, timeSeconds: number): void
  hitTest(x: number, y: number): string | null     // node or line id under a point, for src/play
  resize(): void
}
```

## Open questions
none
