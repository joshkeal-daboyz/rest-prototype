# 31 · Take the feed out — design note

This time the battery has no line of its own into the relays. It hangs off the bakery's trunk, charging from it and feeding back into it, and the only way east, for the battery and the feed alike, is the trunk's breaker and its small fuse. While the feed is in the trunk, opening the way east lets the feed through to the relays too, and it blows the fuse. So the release has to wait until the feed is out of the trunk, and taking the feed out stops the charge, so the charge has to come first.

**Element under test:** the battery as the relays' temporary power, **released only after the feed is set up**: charge, cut the feed out of the battery's path, release, throw, let the feed back. Supporting: a plain switch on the way to the relays.

**Switches on this map.** Relays (powered: only move while current reaches them; hold): `rl1`, `rl2`. Plain switch (powerless: moves any time): `sw_P`. Breakers: `br_F` (the trunk's feeder), `br_E` (the way east).

## The map

16 nodes, 16 lines, no faults. Enoch brings two fuses. Feed capacity 2. Battery: capacity 3 s, starts empty.

| Piece | What it is |
| --- | --- |
| `feed` → `j0` → `br_F` (closed) → `j_w` | The trunk. `j_w` → **bakery** (load 1, target), lit from the start. |
| `j_w` → `bat` (input `l_in`) | The battery charges from the trunk. |
| `bat` → `j_e`, and `j_w` → `j_e` | The battery's far side joins the trunk again at `j_e`. |
| `j_e` → `br_E` (open) → `fb_E` (≤1) → `sw_P` | The only way east, for both. |
| `sw_P` (plain) | 0 → `rl1`. 1 (start) → tower (load 1). |
| `rl1` (relay) | 0 (start) → **mill** (load 3). 1 → `rl2`. |
| `rl2` (relay) | 0 (start) → **forge** (load 2). 1 → **shrine** (load 1, target). |

Win: bakery + shrine by the feed, 2 of 2; `fb_E` 1/1.

## The intended read

1. The bakery is lit and the battery is filling from the trunk. The relays refuse clicks. `sw_P` moves (plain).
2. The battery's far side goes back into the same trunk. Any current it sends east goes through `br_E` and `fb_E`, and so does the feed's. With the feed in the trunk, closing `br_E` with `sw_P` on the relays sends the feed into `rl1` → mill: a blow.
3. Let the battery fill (3 s). Set `sw_P` to the relays (plain; any time).
4. **Open `br_F`.** The trunk goes dark, the bakery too, and the battery stops charging (that's why it filled first). **Close `br_E`**: nothing, the trunk is dead.
5. **Release.** The battery lights the trunk (the bakery glows, borrowed) and runs `br_E` → `fb_E` → `sw_P` → `rl1` → mill. No blow: the battery's side has no fuse check. **Throw `rl1`** (the forge lights), **throw `rl2`** (the shrine lights).
6. **Close `br_F`.** The feed runs into the trunk and east through the set relays: bakery + shrine, `fb_E` 1/1. **Win.**

## The trap

18-battery-run taught: release, throw, then let the feed in. Here the player releases with the trunk still fed, watches the battery's current stop at the open `br_E`, and closes it to let the battery through. The feed goes through with it: `fb_E` → `rl1` → mill, 3 on ≤1, **`fb_E` blows** (culprit: mill). A blown fuse blocks the battery as well, so the window is wasted with the relays unmoved.

The read: the culprit is the feed, which arrived through the same breaker. Recovery uses the spare fuse and a trick worth learning. Repairing `fb_E` while the feed is in the trunk blows it again. Instead: open `br_F` (feed out), release, and `fb_E` is readable in the battery's light. **Repair it there**, where nothing can blow it, and carry on throwing. If the window runs out before `rl2`, recharging needs the feed back in the trunk, so open `br_E` first (with `rl1` set, `rl2` still sends the forge's 2 to `fb_E`), close `br_F`, fill, and go round again.

The other mistake, opening `br_F` before the battery is full, is readable (the battery's charge stops climbing, its input line is dark) and cheap: close `br_F` again with `br_E` open.

`sw_P` is the plain switch on the path. It has to point at `rl1` for the battery to reach the relays, and it doesn't need the window: set it while the battery fills.

## What this map tests

- Whether players see that a battery and the feed can share a path, and that the release has to wait for the feed to be taken out of it, rather than replaying 18-battery-run's "release, then feed".
- Whether "repair the fuse in the battery's light" is found. The battery's side is free of the fuse check, so a repair there can't blow.
- Whether the order "charge, then isolate" reads from the charging line going dark when `br_F` opens.

## Expected numbers

The analyzer (`npm run analyze`) isn't built yet. Numbers come from a brute-force search over the real simulator (`createGrid`, `advance`, `release`), every click followed by *p* seconds, "wait" = *p* seconds; *p* = 1 s unless stated.

- Nodes: 16. Lines: 16. Faults: 0. Parts given: 2 fuses. Parts needed: none on the intended route; 1 if `fb_E` blew.
- Faults readable at the start: 0 of 0.
- Wait to fill: 3 s, done before `br_F` opens (charging stops when it does).
- Fewest actions to win: **7**: `br_E`, `br_F`, `sw_P`, release, `rl1`, `rl2`, `br_F`, with the 3 s charge done while the trunk is still fed (simulator `actions` 6). At *p* = 1: 9 s, one window. At *p* = 1.5: two windows, 12 actions, 21 s (the recharge between needs `br_E` open, `br_F` closed, and back). At *p* = 0.5: 4.5 s.
- Final load: 2 of 2 (bakery, shrine). `fb_E` 1/1.
- Winning control settings: **1 of 32** (`br_F` and `br_E` closed, `sw_P` 0, both relays 1).
- Reachable states (*p* = 1): 951, of which 144 can't win without Undo. **All are fuse-short:** both fuses spent on repairs made with the feed in the trunk.
- First moves: all recoverable (`br_E` with `sw_P` on the tower holds, 2 of 2; `br_F`, `sw_P`, wait). The relays refuse.
- Checked: release with the trunk fed → `br_E` → `fb_E` blows, `rl1` refused. Recovery: `br_F` open → release → repair `fb_E` in the battery's light (holds) → `rl1` → flat → `br_E` open, `br_F` closed, fill 3 s → `br_F` open, `br_E` closed → release → `rl2` → `br_F` closed completes with one fuse left. `br_F` opened at charge 0: the battery stays at 0.

## What it taught us

