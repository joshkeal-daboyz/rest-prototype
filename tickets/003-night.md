# 003 · Night: clock, pause, shocks, dawn, death

owner: grid-simulator
status: open
branch: ticket/003-night

## Goal
The night runs on game time while the panel is open. Probes and fetches cost seconds; dawn ends the night and keeps repairs; two shocks kill and roll back the night's repairs. Pure logic with time passed in.

## Acceptance criteria
Vitest tests in `src/night/`, each named for the rule.
- [ ] `advance(dt)` moves the clock; each step is capped (default 0.25 s) so a hidden tab never jumps the clock. (GDD Decided)
- [ ] `pause()`/`resume()` stop and start the clock; `night:paused` fires on each change.
- [ ] `spend(seconds, why)` charges a probe or a fetch to the clock immediately.
- [ ] At `night.minutes` the night ends with `night:dawn`; repairs made this night are **kept** and listed in the payload.
- [ ] `shock()` increments this night's count and emits `player:shocked`; the second shock is `fatal: true` and emits `night:death` listing this night's repairs, which the caller rolls back (the night module tracks the list via `recordRepair(faultId)`; it doesn't touch the grid).
- [ ] A new night resets the shock count and the repair list, increments `night`, and emits `night:started`.
- [ ] A live repair in progress when `pause()` is called is reported as `cancelled: "paused"` to the caller (the night module exposes `onPause` so `src/play/` can cancel; no shock).
- [ ] No DOM, no timers, no imports outside `src/core/`.

## Files
`src/night/`

## Interfaces
```ts
createNight(puzzle: Puzzle, bus: EventBus, opts?: { maxStep?: number }): Night
interface Night {
  advance(dtSeconds: number): void
  pause(): void; resume(): void
  spend(seconds: number, why: "probe" | "fetch" | "hold"): void
  shock(): { fatal: boolean }
  recordRepair(faultId: string): void
  startNight(): void
  state(): { night: number; elapsed: number; minutes: number; paused: boolean; shocks: number; over: "dawn" | "death" | null }
}
```

## Open questions
- Does a probe cost time in a panel the player has already fully read? (Brief says yes, always. Tune later.)
