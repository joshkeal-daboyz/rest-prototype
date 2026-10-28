# The battery run — design note

The east section's two relays are set the wrong way: as they stand, the feed would push power through them into the old mill, and the mill's load would blow the east fusebox. Relays can only be thrown while current reaches them, so Enoch can't set them from the dark. There is a battery by the yard. He fills it from the feed, lets it go into the east section, and throws the relays while it lasts. Then the feed can go in.

Josh's words: "I want a battery that you can charge and you have a limited amount of time to flip switches to solve other portions of a puzzle."

**Element under test:** the battery and relay switches (ticket 008). Charge it, release it, set a dead section inside the window, then let the feed in.

## The map

11 nodes, 12 lines, no faults, no parts. Feed capacity 2.

| Piece | What it is |
| --- | --- |
| `feed` → `j1` | The live hub. `yard` (load 1, priority) is lit from the start. |
| `j1` → `bat` | The battery (capacity 8 s, charge 0). Its input is `l_in`; it charges from the feed as soon as the map opens. |
| `bat` → `rl_1` | The battery's far side reaches the near relay, `rl_1`. |
| `rl_1` | Relay. Position 0 → `j_m` → `rl_2` (it carries the battery's current on to the far relay). Position 1 → `shrine`. |
| `rl_2` | Relay. Position 0 → `mill` (load 3). Position 1 → back into `rl_1`. |
| `j1` → `br_east` → `fb_east` → `rl_2` | The feed's own way into the section: a breaker, open, and a fusebox rated 1. |
| `shrine` | Load 1. The target. |

The feed's winning route: `br_east` → `fb_east` → `rl_2` (position 1) → `rl_1` (position 1) → `shrine`. Load 2 of 2 with the yard.

## The intended read

1. The map opens with the yard lit and the east section dark. The relays don't move when clicked (no current). The battery is empty and filling.
2. The player tries the obvious thing: close `br_east`. The feed runs through `rl_2` as it stands, into the mill: 3 through a fuse rated 1. **The fuse blows**, the section stays dark, and there is no spare fuse. (Undo puts it back.)
3. Wait while the battery fills: 8 seconds.
4. Release it. The battery's current runs `rl_1` (position 0) → `j_m` → `rl_2` → the mill, which lights for the length of the window. Both relays are live.
5. Throw `rl_2` first (to 1), then `rl_1` (to 1). The shrine lights from the battery, but the job isn't done: a lamp lit only by a battery never completes it.
6. Close `br_east`, during the window or after it goes flat. The feed runs through the set relays to the shrine, the mill stays out of its path, the fuse holds. **Win**, and the Relight.

## The trap

Two of them, both about using the window well. The near relay, `rl_1`, is the one the battery reaches first and the natural first click, but it is also the battery's only path to `rl_2`: throw it first and the far relay goes dead, so the player has to throw `rl_1` back, throw `rl_2`, and throw `rl_1` again, which takes twice as long. With a full 8 s battery that mistake is survivable; released at half charge or less, it isn't, and the player has to stop, recharge and try again.

The quieter trap is impatience: releasing before the battery is full. At 2 s of charge, a first-time player at a click every 1.5 s sets one relay and the battery runs flat before the second.

Behind both sits the shortcut that doesn't work: closing `br_east` first blows the fuse, which is how the map tells the player why the battery exists.

## What this map tests

- Whether "charge, release, act inside the window" reads without text: the battery filling, the section waking up, the mill lighting as a clock.
- Whether a relay being stuck in the dark reads as a rule (the tribe's relay marking) and not as a bug.
- Whether "the shrine is lit but the job isn't done" reads as *not yet*: the battery's light is borrowed, the feed's is the job.
- Whether 8 s is tight but fair. The intended sequence takes about 3 s at a relaxed click pace; the wrong-order recovery about 6 s.

## Expected numbers (by hand; the analyzer isn't built yet)

- Nodes: 11. Faults: 0. Parts given: none. Parts needed: none.
- Faults readable at start: 0 of 0. A blown `fb_east` appears only if the player closes `br_east` early.
- Wait to fill: 8 s from the map opening (charge 0, capacity 8).
- Fewest actions to win: 4: release, throw `rl_2`, throw `rl_1`, close `br_east` (the release isn't an undoable action, so the simulator's `actions` count reads 3).
- Final load: 2 of 2 (yard and shrine). `fb_east` carries 1 of 1.
- Winning configurations: 1 of the 8 settings of `rl_1`, `rl_2` and `br_east` (both relays to 1, breaker closed).

Checked against the real simulator (`createGrid`, `advance`, `release`) with a throwaway script, modelling a first-time player's click every 1.5 s: both relays are stuck at the start and stay stuck with a full battery until it is released; `advance(8)` fills it; release, `rl_2` at 1.5 s, `rl_1` at 3 s, then `br_east` (after the battery goes flat, or inside the window at 4.5 s) completes with load 2 of 2 and no fuse blown; the shrine lit by the battery alone does not complete; released after `advance(2)`, the battery goes flat before the second relay; wrong order recovers inside a full window (done by 6 s) but not from a 4 s charge; closing `br_east` first blows `fb_east` and undo restores it; a brute force over all 8 settings finds exactly the one winner.

Note on time: the simulator's relay throws are instant, so the window is a limit on the player's hands and eyes, not on the number of clicks. A player who clicks two relays in under 2 s can win from a 2 s charge. The 1.5 s pace is a guess for a first-time player; Josh tunes `capacity` by playing.

## What it taught us

*(Josh's verdict goes here, in his words.)*
