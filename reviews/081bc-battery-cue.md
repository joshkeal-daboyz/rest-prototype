ticket: 081bc-battery-cue
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
BC0 adds `"battery"` to `LoadPreviewKind`. BC1 gives each clickable battery a preview entry (release with the state's charge, or stop if released) and keeps released batteries released in the base and every what-if. BC2 has `previewKey` read each battery's `released` flag and whether its charge is above 0. Nothing new is drawn until BC3, which is a later PR.

## Does the branch do it?
Diffed against `origin/main` (17ee737). The local `main` is behind it, so `main...` also shows N3's already-merged files. The diff touches `src/core/preview.ts`, `src/grid/preview.ts` and its test, `src/ui/preview.ts` and its test, `tickets/rules-coverage.md`, and the ticket file. All of these are listed for BC0 to BC2.

**BC0.1 (the type).** `src/core/preview.ts`: the kind is `"breaker" | "switch" | "repair" | "battery"`. The doc comment says what a battery entry is, says the seconds belong to the state and are not a field of the entry, and names battery ids as `LoadPreview` keys. Met.

**BC0.2 (rules coverage).** `tickets/rules-coverage.md` adds BC1 to "Faults hide faults". Met.

**BC1.1 (the battery's entry).** `src/grid/preview.ts`, the `n.type === "battery"` branch:
- Released: it drops the id from `running` (stop).
- Charge above 0: it adds the id (release).
- Charge 0, not released: it skips (`continue`, no entry).

It goes through the shared `entry()`, so `delta`, `over`, `blows` and `lines` are measured exactly as for a throw. The case "battery entry: ..." in `src/grid/preview.test.ts` uses the ticket's fixture: feed, then battery, then relay to two lamps, with an unread break `k` on `la`. It checks:
- Charged and not released: `kind: "battery"`, `delta: 0`, `over: false`, `on: ["lo","la","la2"]`, `off: []`. `la2` lies past the unread break, so it counts as sound.
- With `k` known: `on: ["lo","la"]`.
- Released: `on: []`, `off: ["lo","la"]`.
- Charge 0: no entry.

The released `off` leaves out `la2`, and that is right by "readable means current reaches it". Once the battery runs, current reaches `k`, so it is in `readableFaults` and is real in both runs. The test's name says so. Met.

**BC1.2 (released batteries in every what-if).** `view()` takes each battery's charge from `state.batteries`. `fresh()` releases every battery in `running` (released, charge above 0) before reading the state. `run()` and `entry()` default to `running`, so the base, the throws, the switches, the repairs and the timed-breaker entries all see a running battery. A map with no battery gives an empty `running` and an unchanged `view`, so its output is the same as before. The relay check, in the same case, runs on a released grid: `running.get("sw")?.lines` is `{ on: ["lb"], off: ["la"] }`. Met.

**BC1.3 (unchanged elsewhere).** Only new cases were added; the existing V2, NC1, TB1 and TB1b1 cases are not edited, and all 7 cases in the file pass. Timed breakers still read `state.timers` as before. The imports are still only `../core` (types) and `./grid`, with no DOM or timer. Met.

**BC1.4 (cost).** Each battery adds one `entry()` call, which is one lit and one real fresh grid. Other entries gain only a loop of `release` calls on the grids they already build. Met.

**BC2.1 (the key).** `src/ui/preview.ts` appends `[id, released, charge > 0]` per battery, sorted by id. It reads no charge value. The case "a battery's release, stop, running flat and first charge from 0 change the key ..." in `src/ui/preview.test.ts` checks:
- 0.3 s of charging gives the same key;
- release, stop, running flat after `advance(3)`, and the first charge from 0 each change it.

Met.

**BC2.2.** `src/main.ts` is untouched, and the TB1b3 and V4 cases are not edited. They pass (3 cases in the file). Met.

**Count.** 2 new `it(` cases against the ticket's cap of 3 for PR 1. BC1's two asked-for cases are folded into one, which is within the cap. I ran `npx vitest run --maxWorkers=2 src/grid/preview.test.ts src/ui/preview.test.ts`: 10 passed, 608 ms.

## Rule conflicts and risks
- **Purity:** `src/grid/` still imports only types from `src/core` and its own `./grid`, with no DOM or timer. The 3D game can take it as it is.
- **GDD rules:** "Faults hide faults" holds: the battery entry uses the same seen-faults view, and the test pins it. Lamps stay leaves in the fixture. The preview is still a read-only what-if; `fresh()` builds throwaway grids and never touches the live one.
- `fresh()` calls `release` on the throwaway grids, which starts their clocks and emits `battery:released` on their own buses. Those grids are dropped at once, so nothing escapes. No risk found.
- No new dependency, no Decided rule changed, no file outside the listed folders.

## Must fix
none

## Could improve
1. `src/grid/preview.test.ts`: the BC1 case title is a whole paragraph. A shorter rule name would read better in failures ("battery entry: release lights its far side, stop darkens it, empty has none"). The comment already carries the detail.
2. BC1 criterion 2 also names "a breaker on its far side has the lines that breaker cuts". The code covers it through the same `running` default, but no case checks it. The ticket asks only for the relay case, so this is optional.
3. Ticket BC1.1 says that when released, "the entry's `off` is those lines". As the test shows, it is those lines minus whatever lies past a break that became readable once the battery ran. A word in the ticket (the architect's file) would stop BC3's builder reading it the other way.
