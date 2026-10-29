# 30 · Which break — design note

The shrine and the well share a post at the end of two cables, one from the north box and one from the south. Both cables are broken. Enoch has one wire. The south branch is switched off at its breaker, so only the north break shows.

**Element under test:** scarce parts, two breaks and one wire, decided by fuse ratings. Which break to spend the wire on: the one you can see, whose fuse box can't carry the post, or the one behind a dark breaker, whose box can if the mill makes room.

## The map

15 nodes, 15 lines, 2 faults. Feed capacity 3. Parts: wire, fuse.

| Branch | Controls | Lamps (load) | Break to the post `jT` |
| --- | --- | --- | --- |
| North | `fb_N` ≤1 | `lane` 1 (priority) | `l_A`, damaged, readable |
| South | `br_S` (**open**) → `fb_S` ≤3 | `mill` 2 behind `br_mill` (closed) | `l_B`, damaged, hidden |
| Yard | `br_yard` (closed) | `yard` 1 (priority) | — |

`jT` carries `shrine` 1 and `well` 1 (both targets): 2 in all.

## The intended read

1. The map opens at 2 of 3: lane and yard. `fb_N`'s bar is full (1 of 1). A **spark** on `l_A`, between the north box and the shrine's post.
2. Count: the post is 2; the north box is rated 1 and already full. That break leads nowhere. What's behind the south breaker?
3. Close `br_S`. The mill lights (`fb_S` 2 of 3), feed 4 of 3: **brownout**, and a spark on `l_B`.
4. Count the south box: mill 2 + post 2 = 4 against 3. Open `br_mill`: brownout clears.
5. Repair `l_B`. Shrine and well light through `fb_S` (2 of 3). Feed: lane + yard + 2 = 4 of 3, brownout again.
6. Open `br_yard`. 3 of 3. **Win.**

## The trap

The only fault on screen at the start is the north spark, and Enoch holds exactly one wire. Repairing it puts the post's 2 on a box rated 1: **`fb_N` blows** (load 3, rating 1, culprit `shrine`). Readable before the click (the bar is full, the post's lamps are marked 1 + 1) and after (✕, shock to the shrine). It is **not recoverable with parts**: repairing `fb_N` with the fuse blows it again at once, and the wire is gone. Undo is the way back, and the state says why: a ✕ on a box rated 1 with the post still joined to it.

This is a first-move dead end, and it is placed here on purpose: rungs 22 and 14 taught "look behind the dark before you spend", and this rung tests it with a breaker instead of a switch. The spare fuse covers the softer mistake: repairing `l_B` before opening the mill blows `fb_S` (4 against 3); open `br_mill`, repair `fb_S`, and the job finishes.

**Ticket 013.** A repair that blows again at once is the pattern Josh called off-track on *Which fuse* (28 Oct 2026). Here the reason is on the map (a closed spur, lamp loads against the rating), but this trap reads best once ticket 013 C shows *would blow again: N load on ≤R* on the blown fuse's hover. Play it after 013, or expect the re-blow to need explaining.

## What this map tests

- Whether a dark, closed-off branch reads as unexplored rather than irrelevant.
- Whether a full fuse bar stops a repair before it happens (the 12-which-fuse lesson, now with a part at stake).
- The GDD review's question in its sharpest form: two possibilities, one part, and reasoning decides.

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 15. Lines: 15. Faults: 2 (`f1` `l_A` readable; `f2` `l_B` behind the open `br_S`). Readable at start: 1 of 2.
- Parts given: wire, fuse. Parts needed: wire (plus the fuse if `l_B` is repaired before the mill is shed).
- Fewest actions to win: 4 (close `br_S`, open `br_mill`, open `br_yard`, repair `l_B`).
- Final load: 3 of 3 (lane, shrine, well). `fb_N` 1 of 1, `fb_S` 2 of 3.
- Winning control settings: 1 of 8 (`br_S` closed, `br_mill` open, `br_yard` open).
- Reachable states: 52. Dead-end states: 24 (wire spent on `l_A`, or both blows taken).
- Obvious first move (repair `l_A`): blows `fb_N`, load 3 > 1, culprit `shrine`; **dead end**, Undo recovers.

## What it taught us

