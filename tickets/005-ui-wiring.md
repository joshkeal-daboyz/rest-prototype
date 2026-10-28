# 005 · UI overlay and wiring

owner: ui
status: open
branch: ticket/005-ui-wiring
depends on: 002, 003, 004

## Goal
`npm run dev` opens the shrine circuit, playable to the Relight, with the parts on hand, the capacity readout, the targets, Undo / Reset, a map picker and a log download. `?puzzle=<id>` opens a given map.

## Acceptance criteria
- [ ] `src/ui/`: prompt text near the pointer from `play.view().prompt`; parts on hand as icons with text labels; `load / capacity` readout, red in brownout; the target list with lit/dark state; Undo, Reset, Download log; a map picker over every `scope: "map"` file in `puzzles/` and `puzzles/locked/` (marked). A win banner when complete. Keyboard reachable; text on every control. (test: which prompt/banner to show for a given state)
- [ ] `src/main.ts`: loads puzzles with `import.meta.glob("../puzzles/**/*.json", { eager: true })`, validates each with `src/core`, builds bus → grid → renderer → play → ui, and runs a `requestAnimationFrame` loop calling `play.tick`, `renderer.draw`, `ui.update`. Resizes on window resize.
- [ ] No game rules in `src/ui/` or `src/main.ts`.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass.

## Files
`src/ui/`, `src/main.ts`, `index.html` (styles)

## Interfaces
```ts
mountUI(root: HTMLElement, deps: { grid: Grid; play: MapPlay; puzzles: { id: string; name: string; locked: boolean }[]; current: string; onPick(id: string): void }): { update(): void }
```

## Open questions
none
