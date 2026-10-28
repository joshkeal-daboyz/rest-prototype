# 40 · Two windows — design note

Two chains of relays, west and east of the battery, every relay set toward a heavy lamp behind a small fuse. The battery reaches into both, but at a first-timer's pace one window sets two relays, and there are three that need it. So: set some, let the battery fill again, set the rest. The battery charges through the one relay that is live from the start, and that relay is also the last switch of the east chain. Throw it early and the charging stops.

**Element under test:** the battery as temporary power for relays across **two windows with a recharge between**, and knowing which relay doesn't need the battery at all. Supporting: a plain switch that doesn't need a window either.

**Switches on this map.** Relays (powered: only move while current reaches them; hold): `rB1`, `rB2`, `rA1`, `rA2`. `rB1` is fed by the feed from the start, so it's live without the battery. Plain switch (powerless: moves any time): `sw_A`. One breaker: `br_A`.

## The map

18 nodes, 19 lines, no faults. Enoch brings two fuses. Feed capacity 2. Battery: capacity 3 s, **starts full** (3 s).

| Piece | What it is |
| --- | --- |
| `feed` → `j1` | The hub. |
| `j1` → `rB1` (relay, live) | 0 (start) → `bat` (input `l_chg`: this is the charging line). 1 → `fb_B` (≤1) → `rB2`. |
| `rB2` (relay) | 0 (start) → **kiln** (load 2). 1 → **chapel** (load 1, target). |
| `bat` → `jb` | The battery's far side: `jb` → `rB2`, and `jb` → `rA1`. |
| `j1` → `br_A` (open) → `fb_A` (≤1) → `rA1` | The feed's way west. |
| `rA1` (relay) | 0 (start) → **forge** (load 2). 1 → `rA2`. |
| `rA2` (relay) | 0 (start) → **mill** (load 2). 1 → `sw_A`. |
| `sw_A` (plain) | 0 → **well** (load 1, target). 1 (start) → bakery (load 1). |

Win: well + chapel by the feed, 2 of 2; `fb_A` 1/1, `fb_B` 1/1.

## The intended read

1. The map is dark. The battery is full but not charging (`rB1` sends the feed into it, but it's already full). `rB1` is the only relay that answers a click; the other three refuse. `sw_A` moves (plain).
2. Set `sw_A` to the well now. It's plain: spending window time on it is waste.
3. **Window 1.** Release: the kiln and the forge light (both clocks). Throw `rA1` (the mill lights in the forge's place), then `rA2` (the well lights, borrowed). Flat. Or `rB2` and `rA1`: any two that are reachable.
4. **Recharge.** `rB1` is still at 0, so the feed fills the battery again: 3 s. Meanwhile close `br_A`: the west chain is set, the feed lights the well, `fb_A` 1/1.
5. **Window 2.** Release, throw `rB2` to the chapel.
6. **Last, `rB1`** to 1: the feed runs `fb_B` → `rB2` → chapel, 1/1. **Win**, 2 of 2. The battery stops charging, and that's fine now.

## The trap

`rB1` is the only relay that moves at the start, and it looks like the first step of the east chain. It's the last. Two ways it bites, both readable and recoverable without Undo because `rB1` stays live:

- **Thrown before `rB2` is set:** the feed runs `fb_B` → `rB2` → kiln, 2 on ≤1, and **`fb_B` blows** (culprit: kiln). And the battery's charging line goes dark. Throw `rB1` back: charging resumes. `fb_B` stays blown, out of sight behind `rB1`; once `rB2` is set, `rB1` to 1 makes it readable and one fuse repairs it (it holds at 1/1).
- **Thrown after `rB2` is set but before the west chain is done:** the chapel lights properly, which looks like progress, but the battery stops charging. When it runs flat there is no third window. The battery's charging glow is off and its line is dark; throw `rB1` back and it fills again.

The other trap is the window itself: at a click a second, a 3 s battery covers two throws. Spending one on `sw_A` (plain) or throwing `rA2` before `rA1` (it's dark until `rA1` moves) leaves a relay for the next window. That costs a recharge, not the job.

`br_A` first blows `fb_A` (forge 2 on ≤1), as on 18-battery-run; the battery's path to `rA1` doesn't run through `fb_A`. Two fuses cover one premature repair.

## What this map tests

- Whether players plan across windows: what to throw in this one, what waits for the next.
- Whether a relay that is live from the start reads as "doesn't need the battery" and as "last", from the charging line it feeds.
- Whether the plain/relay distinction saves window time in practice (`sw_A` set beforehand).
- The pace. A quick player (0.5 s a click) does all three relays in one window and never sees the recharge; that isn't a dead end, just a shorter solve. Josh tunes `capacity`.

## Expected numbers

The analyzer (`npm run analyze`) isn't built yet. Numbers come from a brute-force search over the real simulator (`createGrid`, `advance`, `release`), every click followed by *p* seconds, "wait" = *p* seconds; *p* = 1 s unless stated.

- Nodes: 18. Lines: 19. Faults: 0. Parts given: 2 fuses. Parts needed: none on the intended route; 1 per blow (`fb_B` if `rB1` goes early, `fb_A` if `br_A` goes early).
- Faults readable at the start: 0 of 0.
- Windows needed: **2 at *p* = 1** (fewest-action line: release, `rA1`, `rA2`, `br_A`, `sw_A`, release, `rB2`, `rB1`: 8 actions, 8 s; the recharge happens during the two clicks between windows). **3 at *p* = 1.5** (9 actions, 16.5 s, with waits). **1 at *p* = 0.5** (7 actions, 3.5 s).
- Final load: 2 of 2. `fb_A` 1/1, `fb_B` 1/1.
- Winning control settings: **1 of 64** (`br_A` closed, all four relays at 1, `sw_A` 0).
- Reachable states (*p* = 1): 3,273, of which 1,296 can't win without Undo. **All are fuse-short:** both fuses spent on repairs that blew again at once. No dead end comes from the windows or from `rB1`.
- First moves: all recoverable (`rB1` blows `fb_B` and is thrown back; `br_A` blows `fb_A`; release; `sw_A`). The other relays refuse.
- Checked: `rB1` first → `fb_B` blows → `rB1` back → two windows → `rB2` → `rB1` → repair `fb_B` completes with one fuse left. `rB1` after `rB2` in window 1 → the chapel lights by the feed, the battery stays at 0 → `rB1` back → it fills in 3 s → window 2 → `rA2`, `br_A`, `sw_A`, `rB1` completes. Spending a window click on `sw_A` leaves `rA2` refused when the battery runs flat.

## What it taught us

