# 30 · Read it in the window — design note

The shrine sits beyond the east relay, two routes past it, and Enoch has two wires. The feed can't go in until the relay is thrown, and the relay needs the battery. The battery has a second line, into the shrine's end of both routes, so its window lights the routes from behind as well: for a few seconds the player can see faults the feed could never show, because they sit behind the first break. Read in the window, then spend.

**Element under test:** the battery's window as the relay's temporary power **and** as the only light on hidden faults; scarce wires spent after reading. Supporting: a plain switch picking the route.

**Switches on this map.** `rl` is a **relay** (powered: only moves while current reaches it; holds). `sw_R` is a **plain switch** (powerless: moves any time). One breaker: `br_E`.

## The map

14 nodes, 16 lines, 3 faults. Enoch brings two wires and two fuses. Feed capacity 2. Battery: capacity 4 s, starts empty, charges from the start.

| Piece | What it is |
| --- | --- |
| `feed` → `j1` | The live hub. **yard** (load 1, priority) lit from the start. `j1` → `bat` (input `l_bin`). |
| `bat` far side | Two lines: → `rl`, and → `j_t` (the shrine's end of both routes). |
| `j1` → `br_E` (open) → `fb_E` (≤1) → `rl` | The feed's way east. |
| `rl` (relay) | 0 (start) → **mill** (load 3). 1 → `sw_R`. |
| `sw_R` (plain) | 0 (start) → north: `l_n1` (**damaged**) → `jN1` → `jN2` (**dead junction**) → `j_t`. 1 → south: `jS` (**dead junction**) → `j_t`. |
| `j_t` → **shrine** | Load 1, the target. |

Win: south route, `jS` repaired (2 wires), shrine + yard by the feed, 2 of 2. North needs 3 wires (1 + 2); there are 2.

## The intended read

1. The yard is lit, the battery fills. `rl` refuses a click; `sw_R` moves (plain). Nothing east is readable.
2. **Release** at full (4 s). Two things wake: the mill lights through `rl` (the window's clock), and from behind, `j_t` lights the shrine (borrowed light, not the job) and runs back up both routes: **`jN2` fizzes** on the north and **`jS` fizzes** on the south.
3. **Throw `rl`** to 1 inside the window. Current now also reaches `sw_R`'s side: on the north (`sw_R` at 0), **`l_n1` sparks**.
4. Count it: north is a cable (1 wire) *and* the junction behind it (2 wires) = 3. South is one junction = 2, and the battery's light reached `jS` from both ends, so there's nothing else on it. **South.**
5. Set `sw_R` to 1 (any time: it's plain). **Close `br_E`.** The feed runs `fb_E` → `rl` → `sw_R` → `jS` (readable from the front too). **Repair `jS`** (2 wires): the shrine lights by the feed. **Win**, 2 of 2.

(The repair can also be done inside the window, where the battery makes `jS` readable from behind.)

## The trap

From the front, the north route shows one spark on `l_n1`, a one-wire fix, and the south shows a dead junction, a two-wire fix. The cheap spark is the obvious spend. **Repair `l_n1`** and the feed runs on to `jN2`, which fizzes: *Needs: wire ×2, have 1*. Throw `sw_R` south and `jS` says the same. The job is lost on this run, and the map says why: both remaining faults name two wires against the one in the satchel. Undo gives the wire back.

The battery is what makes this a choice and not a guess: released, it shows `jN2` before any wire is spent. A player who releases, throws `rl` and closes `br_E` without looking at what lit up behind has used the battery only as a relay key and missed what it was showing.

Smaller traps: releasing the battery and spending both wires on `jN2` (readable from behind, so the game allows it) leaves the north's cable with no wire. Closing `br_E` before `rl` is thrown blows `fb_E` (mill 3 on ≤1); the battery's path to `rl` doesn't run through `fb_E`, so set `rl` in the window, then repair `fb_E` (holds: 0 or 1 behind it). There are two fuses, so one premature repair (one that blows again) is survivable.

## What this map tests

- Whether players look at what the battery's window lights, not just at the relay: the from-behind read is the point (GDD review, finding 1: "ambiguous dark", read before you spend).
- Whether "the shrine is lit but the job isn't done" still reads with the battery lighting it from a second side.
- Whether the plain/relay pair reads: `sw_R` can be set in the dark, `rl` can't.

## Expected numbers

The analyzer (`npm run analyze`) isn't built yet. Numbers come from a brute-force search over the real simulator (`createGrid`, `advance`, `release`), every click followed by *p* seconds, "wait" = *p* seconds; *p* = 1 s unless stated.

- Nodes: 14. Lines: 16. Faults: 3 (`f_n1` cable, `f_n2` junction, `f_s` junction). Parts given: 2 wires, 2 fuses. Parts needed: 2 wires (`jS`); fuses are spares for a `br_E`-first blow.
- Faults readable at the start: **0 of 3**. On release: `f_n2`, `f_s` (from behind). After `rl` is thrown live: `f_n1` too. The feed alone, after `rl`, reads `f_n1` (north) or `f_s` (south), never `f_n2` until `l_n1` is repaired.
- Wait to fill: 4 s (a 2 s charge is enough for the one relay at *p* = 1; a full charge gives time to read).
- Fewest actions to win: **5**: `sw_R`, release, `rl`, `br_E`, repair `jS` (simulator `actions` 4). Fastest: 6 s at *p* = 1, 9 s at *p* = 1.5, 3 s at *p* = 0.5 (each including the minimum charge).
- Final load: 2 of 2 (yard, shrine). `fb_E` 1/1.
- Winning control settings: **1 of 8** (`br_E` closed, `rl` 1, `sw_R` 1).
- Reachable states (*p* = 1): 1,341, of which 800 can't win without Undo: 272 are the trap (`l_n1` repaired, 1 wire left against two 2-wire junctions), 272 spent both wires on `jN2`, 256 spent both fuses on repairs that blew again (in combination with either).
- First moves: all recoverable (`br_E` blows `fb_E`; the spare covers it). `rl` is refused (dark).
- Checked: charge 4 → release reads `f_n2` and `f_s`, the shrine lit by the battery doesn't complete → `rl` → `br_E` → repair `l_n1` → `jN2` refused (*needs 2, have 1*) → `sw_R` south → `jS` refused. The intended line completes with 0 wires and 2 fuses left.

## What it taught us

