# 21 · Wake the relay — design note

The second battery map, straight after 20-battery-run. The shrine is past one relay, set to the old mill. A relay only moves while current reaches it, and the feed can't reach this one without carrying the mill through a small fuse. A battery by the gate fills from the feed. Fill it, let it go into the section, throw the relay while it lasts, and then let the feed in. Next to the relay is a plain switch, the kind that moves in the dark. Clicking both is how the player learns which kind is which.

**Element under test:** the battery as temporary power for a relay (Josh's steer: charge, release, throw the relay inside the window, then the feed takes over). There's no time pressure: the window is 8 s and the job inside it is one click.

## The map

12 nodes, 12 lines, no faults. Feed capacity 2. Enoch brings 2 fuses.

| Piece | What it is |
| --- | --- |
| `feed` → `j1` → `gate` | Load 1, priority. Lit from the start: the feed is live. |
| `j1` → `bat` | Battery, capacity 8 s, charge 0. Fills from the feed as soon as the map opens. |
| `j1` → `br_E` (open) → `fb_E` ≤1 → `j_E` → `rl` | The feed's way into the section. |
| `bat` → `j_E` | The battery's far side reaches the same junction, past the fuse. |
| `rl` | **Relay.** Position 0 → `mill` (load 3), position 1 → `sw_p`. Starts at 0. |
| `sw_p` | **Plain switch.** Position 0 → `well` (load 1), position 1 → `shrine` (load 1, target). Starts at 0. |

Winning route: `br_E` → `fb_E` → `rl` (1) → `sw_p` (1) → `shrine`. Load 2 of 2; `fb_E` 1 of 1.

## The intended read

1. The gate is lit and the section is dark. The battery is filling.
2. Click `sw_p`: it moves, dark as it is. Click `rl`: it doesn't move. That's the difference between a plain switch and a relay, learned in two clicks.
3. Read `rl`: it points at the mill (3), and `fb_E` is rated 1. The feed can't come in until the relay is set.
4. Release the battery. Its current runs `j_E` → `rl` → mill, and the mill lights as a clock. `rl` is live.
5. Throw `rl` to 1. The battery now reaches `sw_p`: the shrine lights if `sw_p` is already thrown, the well if not (throw it now or later; it's plain).
6. The shrine is lit by the battery, but the job isn't done. Close `br_E`, during the window or after. The feed takes over. **Win.**

## The trap

**Closing `br_E` first**, the most obvious click on the map. The feed runs into the mill through `rl` as it stands: 3 through a fuse rated 1, and **`fb_E` blows** (the notice names the mill). This is how the map shows why the battery is there. You can see it coming beforehand (the relay drawn toward the mill, `fb_E`'s rating 1) and read it afterwards (✕, *Repair (fuse)*, the culprit). It's recoverable: the battery's way in doesn't pass `fb_E`, so charge, release, throw `rl`, then repair `fb_E`, and it holds. Repairing at once, before `rl` is set, re-blows it and spends one fuse; the second fuse still finishes the job. Only two premature repairs leave the map stuck, and Undo clears that.

Leaving `sw_p` on the well is harmless: the feed lights the well (1 through `fb_E` ≤1), the shrine stays dark, and the plain switch can be thrown with the feed on.

## What this map tests

- Whether "a relay moves only in the light, a plain switch moves any time" reads from two clicks, with no text.
- Whether the battery reads as *borrowed* power: the shrine lit by the battery doesn't win, and the feed's light does.
- Whether the mill lighting on release reads as "the section is awake now" and not as a mistake.

## Expected numbers

Analyzer (`npm run analyze`) not built: these come from a throwaway time-aware search over the real `createGrid`. Every click is preceded by `advance(1.5)`, the 20-battery-run pace for a first-time player; waits are `advance(1.5)` or a full fill; no Undo.

- Nodes 12, lines 12, faults 0. Parts given: 2 fuses. Parts needed: none (1 fuse if `br_E` was closed first).
- Switches: **1 relay** (`rl`), **1 plain** (`sw_p`).
- Faults readable at start: 0 of 0.
- **Fewest clicks: 4.** `sw_p` (any time), release, `rl`, `br_E`. The release isn't an undoable action, so the simulator's `actions` count reads 3. Any charge over 1.5 s is enough; the battery is full after 8 s.
- Final load 2 of 2 (gate, shrine). `fb_E` 1 of 1.
- **Winning settings: 1 of 8** (`br_E` closed, both switches at 1).
- Reachable states 1377 (charge counted). **Dead ends 264, all of them "`fb_E` blown, no fuse left"**, which takes two premature repairs. Every first move is winnable, including `br_E` (it blows `fb_E`, and that's recoverable).
- Checked by script: `rl` is stuck at the start and stays stuck with a full battery until release; `sw_p` moves dark; release lights the mill; the shrine lit by the battery alone doesn't complete; `rl` holds after the battery goes flat; breaker first blows `fb_E` (culprit `mill`), and a premature repair re-blows it while the last fuse still finishes the job; a 2 s charge is enough.

## What it taught us

