# 008 · Battery and relay switches: grid rules

owner: grid-simulator
status: open (awaiting G1)
branch: ticket/008-battery-grid

## Josh's request
"I want a battery that you can charge and you have a limited amount of time to flip switches to solve other portions of a puzzle."

## The mechanic, as cut
Two new pieces that work together:

- **Battery** (node type `battery`): sits on the grid like a junction with one side toward the feed and one side away. While it is connected to live power and not released, it **charges** at 1 unit per second up to `capacity` (units are seconds of discharge). The player clicks it to **release**: it becomes a second source, powering everything on its far side for `charge` seconds, draining 1 unit per second, then goes flat. Click again to stop the release early and keep what's left. A battery that is charging contributes no load; a released battery's far side counts toward the feed's capacity only if the feed also reaches it (no double counting). Charge is kept across undo/reset as the file's `charge` value (default 0).
- **Relay switch** (a `switch` with `"relay": true`): can only be thrown while current reaches it. A switch in a dead section is stuck. The tribe marks relays differently (renderer's job).

Together: the player charges the battery from the feed, releases it, and has `charge` seconds of power in a section the feed can't reach, during which the relay switches there can be thrown. Switches stay where they were thrown after the battery goes flat, so the window is for *setting* the section, not keeping it lit.

Time: the grid gains `advance(dtSeconds)`; the play layer calls it every frame. Nothing else in the simulator depends on time, so maps without a battery behave exactly as before.

## Acceptance criteria
Vitest tests in `src/grid/`, each named for the rule. Fixture: a small inline map plus `puzzles/battery-run.json` once the puzzle-designer writes it.
- [ ] A battery charges at 1/s only while connected to live power on its feed side and not released; it stops at `capacity`.
- [ ] `release(nodeId)` makes it a source for its far side while `charge > 0`; charge drains at 1/s; at 0 it stops being a source and `battery:flat` fires. `release` again stops it early.
- [ ] A relay switch's `throwSwitch` returns false and changes nothing while no current reaches it; it throws normally while powered (by the feed or by a released battery). A thrown relay stays thrown after power is lost.
- [ ] Load accounting: lamps powered only by a released battery don't count toward the feed's `capacity`; a charging battery adds no load; a lamp reachable from both counts once.
- [ ] Readability: faults on the battery's far side become readable while it is released (current reaches them).
- [ ] `advance(dt)` is the only time input; a map with no battery is unchanged by `advance`. Deterministic.
- [ ] `GridState` gains `batteries: ReadonlyMap<string, { charge: number; capacity: number; released: boolean; charging: boolean }>`.
- [ ] Maps without these fields behave exactly as before (the whole existing suite still passes).

## Files
`src/grid/`

## Interfaces
Schema draft 4 additions (lead-architect writes these into `src/core/` and `puzzles/SCHEMA.md` on G1):
```ts
interface BatteryNode extends NodeBase { type: "battery"; capacity: number; charge?: number; input: string /* line id on the feed side */ }
interface SwitchNode { ...; relay?: boolean }
```
`Grid` gains `advance(dtSeconds: number): void` and `release(nodeId: string): boolean`.
Events: `battery:released { nodeId }`, `battery:flat { nodeId }`.

## Open questions (for G1)
- Charge and discharge at 1 unit/s is the simplest first rule. A `rate` field can come later if the tuning needs it.
- Does a released battery power its far side regardless of load, or does it have its own capacity? Cut as "regardless" (it's a time limit, not a load limit) until a puzzle needs otherwise.
