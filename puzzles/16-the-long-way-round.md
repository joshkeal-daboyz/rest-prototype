# 16 · The long way round — design note

The shrine and the gate share a post at the end of the lane. A short cable runs to it from a fuse box by the hub, and that box has blown. A long cable runs round through the south: a switch, a second blown box, a stall, and a break. Enoch has two fuses and a wire. The feed is already full.

**Element under test:** the reroute instead of the obvious repair, under scarce parts and two fuse ratings. The short way is one fuse away and can never hold; the long way costs a fuse and a wire and a shed lamp. Faults hide faults along it.

## The map

16 nodes, 16 lines, 3 faults. Feed capacity 3. Parts: fuse, fuse, wire.

| Route | Path to post `jT` | Faults |
| --- | --- | --- |
| Short | `fb_D` ≤2 → `jT` | `fb_D` **blown** (readable) |
| Long | `sw_L` (0 → `market` 1, start; 1 → long way) → `fb_L` ≤3 → `jL` → `l_L` → `jT`; `stall` 1 behind `br_st` (closed) on `jL` | `fb_L` **blown** (hidden), `l_L` damaged (hidden behind `fb_L`) |

`jT` carries `shrine` 2 and `gate` 1 (targets): 3. Homes: `br_hm` (closed) → `home_1`, `home_2` (1 each, priority).

## The intended read

1. The map opens at 3 of 3: market and homes. `fb_D` buzzes, one fuse from the targets. But the post is 3 and `fb_D` is rated 2: mended, it blows again.
2. Throw `sw_L` to the long way. The market goes dark; `fb_L` buzzes.
3. Repair `fb_L`. The stall lights (`fb_L` 1 of 3); pulses stop at a **spark** on `l_L`.
4. Count the long box: stall 1 + post 3 = 4 against 3. Open `br_st`.
5. Repair `l_L`. Shrine and gate light, `fb_L` 3 of 3. Feed 3 + homes 2 = 5 of 3, **brownout**.
6. Open `br_hm`. 3 of 3. **Win.**

## The trap

The blown fuse by the hub is the nearest fault to the shrine and the only one on screen, and Enoch carries a fuse for it. Repairing it puts 3 on a box rated 2: **`fb_D` blows again** (culprit `shrine`). Readable: the ✕ returns and the shock runs straight to the shrine, whose label says 2, next to the gate's 1. Recoverable with the part on hand: the second fuse is enough for the long way, and nothing else is lost. A player who repairs `fb_D` twice has no fuse for `fb_L`; Undo clears it.

The second trap is the 11-which-fuse lesson on the long route: repairing `l_L` with the stall still on gives `fb_L` 4 against 3, and it blows (culprit `shrine`). With one fuse left, open `br_st` and repair `fb_L`; it holds. Taking both traps leaves no fuse for the second blow.

**Ticket 013.** A repair that blows again at once is the pattern Josh called off-track on *Which fuse* (28 Oct 2026). Here the reason is on the map (the post's lamps, shrine 2 + gate 1, against `fb_D`'s 2; it can never hold), but this trap reads best once ticket 013 C shows *would blow again: N load on ≤R* on the blown fuse's hover. Play it after 013, or expect the re-blow to need explaining.

## What this map tests

- The shrine circuit's question at a larger scale: does the reroute read as the clever answer when the obvious repair is a fuse you can afford, not a part you lack? Here the obvious repair is affordable and still wrong.
- Whether players count a box's rating against the post's total before spending (shrine 2 + gate 1 against 2).
- Whether faults revealed one by one along a long route (blown box, then spark) keep the player counting at each step.

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 16. Lines: 16. Faults: 3 (`f1` `fb_D` readable; `f2` `fb_L` behind the switch; `f3` `l_L` behind `f2`). Readable at start: 1 of 3.
- Parts given: 2 fuses, 1 wire. Parts needed: 1 fuse, 1 wire (2 fuses after either trap).
- Fewest actions to win: 5 (throw `sw_L`, repair `fb_L`, open `br_st`, repair `l_L`, open `br_hm`).
- Final load: 3 of 3 (shrine, gate). `fb_L` 3 of 3; `fb_D` stays blown.
- Winning control settings: 1 of 8 (`sw_L` long, `br_st` open, `br_hm` open).
- Reachable states: 70. Dead-end states: 24 (two blows taken).
- Obvious first move (repair `fb_D`): blows, load 3 > 2, culprit `shrine`; still winnable. Traced: repair `fb_D` (blow), `sw_L`, repair `fb_L`, `br_st`, repair `l_L` (5/3 brownout), `br_hm` completes at 3/3 with no parts left.

## What it taught us

