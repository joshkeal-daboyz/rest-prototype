# Two clocks — design note (ticket 081 TB6, the timed breaker's trial)

A trial puzzle for the timed breaker, designed on the city. It has no schematic and no `from`. Its id is not `sNN`, so it is not a stage: Josh plays it from the Map menu (N-Q1).

Josh, 26 Nov 2026: "I want to add another puzzle piece. I want to add a timed breaker I think it would add an interesting twist to a puzzle if a timer powered different sections at different times and you had to work between them." His design answers: "Real seconds (Recommended)", "Breaker, on/off (Recommended)", "Clock only (Recommended)". On whether this puzzle should wait for the joint-flip preview fix: "Build TB6 now".

- **Element under test:** the timed breaker. Two of them, out of phase, each feeding its own block.
- **The reasoning move:** before you send one block's current into the other, ask where it will go when it gets there. That was set by a relay only the other clock can power, so it must be set while that clock is on.
- **What it leans on:** the relay (thrown only while current reaches it, keeps its place), the fuse rating, and a dead lamp. None of them is the lesson. *Why they are here* says why the puzzle cannot do without the first two.

## Why they are here: what makes two windows necessary

The win is judged at one moment, and at any moment only one of the pair is closed. So the winning current is one block's alone, and everything on its road can be reached in that block's own window, working outward from the breaker: a fault reads when current reaches it, and a relay is live when current reaches it. With breakers, switches and faults alone, a map on an alternating pair can always be finished in one window. I checked this on the simulator before laying anything:

- A switch cannot be entered through one of its outputs, so a relay "in A that routes B's line" is either on B's road (and then B's current reaches it, and it can be thrown in B's window) or not on it (and then its position does not matter to B).
- The worked example in `docs/design/081-TB-timed-breaker.md` section 4 does not hold for that reason: after the mend in B's window, B's current reaches the relay, and it can be thrown there.

Work in the other window becomes necessary only when arriving unprepared does harm that cuts the current again. A brownout does not (the relay stays live and can be thrown through the flicker). **A blown fuse does**: it cuts B's current at the box, the relay in A goes dead to B, and only A's clock can reach it. So this puzzle has one rated fuse box, and a spare fuse in the kit so that the harm is a lesson and not a dead end.

The two relays do two jobs each. `r_b` binds the hand-over to B's window, and keeps A's current out of B (a switch sends current out, never back in), so A can never carry the mill. `r_a` is the thing that must be set ahead.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:6` (A, to the north) and `block:6:8` (B, to the south)**, facing each other across `x:9`. The feed stands across `z:6` from A's south-west corner, on `block:5:7`.
- **A's clock** `tb_a`: closed 8 s, open 8 s, offset 0. **B's clock** `tb_b`: closed 8 s, open 8 s, offset 8. Exactly one is closed at any time. The view opens on A's window, and the clock starts at the first move.
- Capacity **18**, fuse box `fb` rating **10**: their own 4 and 3, raised once by `npm run fit -- --raise` for the scenery its solution lights. The capacity is never the question on this map.
- Targets: `shrine` (in A) and `mill` (in B). Priority: `kiln`. Parts: **1 bulb, 1 fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **No breaker, relay or fuse box on a branch pole, counting any third wire.** What each pole carries is in the table.

| Node | Type | Place | Metres (x, z) | What its pole carries |
| --- | --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:6:lo:312.50` (crossing, block:5:7, across `z:6`) | 249.25, 312.50 | |
| `j_0` | junction | pole `pole:x:9:lo:272.50` (end, block:6:6), A's south-west corner | 272.50, 319.25 | |
| `tb_a` | timed breaker, closed at the start | pole `pole:x:9:lo:283.33` (slot, no drop) | 283.33, 319.25 | two spans and nothing else: along to `j_0` (`l_fa`), along east (`l_a`) |
| `j_a` | junction | pole `pole:x:9:lo:337.50` (end, block:6:6), A's south-east corner | 337.50, 319.25 | |
| `shrine` | lamp, load 1, **target**, dead lamp | building `block:6:6/b\|outer\|+z\|65,62`, by its drop from `j_a`'s pole | 337.50, 315.00 | |
| `r_a` | relay, position 0 `l_kiln`, 1 `l_store`; set 0 | pole `pole:z:7:lo:289.17` (slot, block:6:6) | 344.25, 289.17 | its own three wires and nothing else: along from the south (`l_ra`), along north (`l_kiln`), and the store's drop (`l_store`) |
| `kiln` | lamp, load 3, priority | building `block:6:6/a\|outer\|+x\|67,54`, by its drop from `pole:z:7:lo:277.50` | 340.00, 277.50 | |
| `store` | lamp, load 1 | building `block:6:6/a\|outer\|+x\|67,56`, by its drop from `r_a`'s pole | 340.00, 287.50 | |
| `tb_b` | timed breaker, open at the start | pole `pole:x:9:hi:272.50` (crossing, block:6:8, no drop), B's north-west corner | 272.50, 335.75 | two spans and nothing else: the crossing from `j_0` (`l_fb`), the corner south (`l_b`) |
| `fb` | fuse box, rating 10 | pole `pole:x:10:lo:299.50` (slot, no drop) | 299.50, 374.25 | two spans and nothing else: along from the west (`l_b`), along east (`l_m`) |
| `j_m` | junction | pole `pole:x:10:lo:315.83` (slot) | 315.83, 374.25 | |
| `mill` | lamp, load 1, **target** | building `block:6:8/b\|outer\|+z\|62,73`, by its drop from `j_m`'s pole | 317.50, 370.00 | |
| `r_b` | relay, position 0 `l_yard`, 1 `l_tie`; set 0 | pole `pole:z:7:lo:355.00` (slot, block:6:8) | 344.25, 355.00 | its own three wires and nothing else: along from the south (`l_rb`), along north (`l_tie`), and the yard's drop (`l_yard`) |
| `yard` | lamp, load 1 | building `block:6:8/b\|outer\|+x\|67,70`, by its drop from `r_b`'s pole | 340.00, 352.50 | |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j_0` | 2 spans: crossing (over `z:6`), corner | 26.05 |
| `l_fa` | `j_0` → `tb_a` | 1 span: along `x:9` | 10.83 |
| `l_a` | `tb_a` → `j_a` | 5 spans: along `x:9`, A's south street | 54.17 |
| `l_shrine` | `j_a` → `shrine` | drop | — |
| `l_ra` | `j_a` → `r_a` | 3 spans: the south-east corner, up `z:7` | 32.88 |
| `l_kiln` | `r_a` → `kiln` | 1 span along `z:7`, then the drop | 11.67 |
| `l_store` | `r_a` → `store` | drop | — |
| `l_fb` | `j_0` → `tb_b` | 1 span: crossing (over `x:9`) | 16.50 |
| `l_b` | `tb_b` → `fb` | 7 spans: down `z:6`, the south-west corner, along `x:10` | 71.09 |
| `l_m` | `fb` → `j_m` | 1 span: along `x:10` | 16.33 |
| `l_mill` | `j_m` → `mill` | drop | — |
| `l_rb` | `j_m` → `r_b` | 4 spans: along `x:10`, the south-east corner, up `z:7` | 43.71 |
| `l_yard` | `r_b` → `yard` | drop | — |
| `l_tie` | `r_b` → `j_a` | 3 spans: up `z:7`, B's north-east corner, crossing (over `x:9`). No building hangs on it | 38.55 |

**The picture.** The two blocks face each other across `x:9`. Both clocks are at the west end of that street, a street's width apart, beside the feed. A's wire runs east along the north side of `x:9` to the shrine on the corner, then north up `z:7` to `r_a`, the store and the kiln. B's wire goes the long way round its block (west side, south side, east side), past the fuse box and the mill, to `r_b`. From `r_b` the tie crosses `x:9` to the shrine's corner. Clocks in the west, relays in the east, one above the other on `z:7`.

Fault (1): `f_bulb`, the shrine's dead lamp. It flickers red at the socket from the start, because A's current reaches it.

Scenery (section S), 15 buildings:
- **Always lit, 1:** the corner house at `j_0`, before both clocks.
- **On A's wire, 5:** 4 along `l_a` (2 of them `block:6:8`'s north-facing houses, across `x:9`: they hang from A's poles, so they keep A's clock), 1 on `l_ra` (across `z:7`).
- **On the kiln's wire, 1** (across `z:7`).
- **On B's wire before the fuse box, 6:** along `l_b` (3 across `z:6`).
- **Behind the fuse box, 2:** along `l_rb` (1 across `x:10`).

## The windows, and what is done in each

| Window | Fed | What only this window allows |
| --- | --- | --- |
| **A's** (0 to 8 s, 16 to 24 s, ...) | A's south street, the shrine, `r_a` and what it points at | Throw `r_a`. Before the hand-over, nothing else can reach it. (The bulb can go in here too.) |
| **B's** (8 to 16 s, 24 to 32 s, ...) | B's three streets, the fuse box, the mill, `r_b` and what it points at | Throw `r_b`. Fit a fuse in `fb` if it has blown. |

## The intended read from the default camera

1. **The view opens on A's window, with the clock stopped.** A's south street is lit and the kiln burns at the top of `z:7`. The shrine on the corner is dark and flickers red at its socket. All of block B is dark. The HUD reads 10 of 18; a bulb and a fuse are in hand. Both timed breakers read "starts on your first move".
2. Fit the bulb. The shrine burns gold, 11 of 18. **The clock starts.**
3. At 8 s the clocks turn. Block A goes dark, shrine and all. Block B lights round three sides: the mill is gold, the yard is lit. 11 of 18. Eight seconds later they turn back. One target burns at a time, never both.
4. Follow the wires. A's wire and B's wire meet at one place: `r_b` has a second wire that crosses `x:9` to the shrine's corner. Thrown, it sends B's current to the shrine, so both targets would burn in B's window. It is live only in B's window.
5. In B's window, `r_b` reads **+9, red**. B's current would not stop at the shrine. It would run on up `z:7` to `r_a`, and `r_a` points at the kiln. The fuse box carries 4 now and is rated 10; the shrine's corner and the kiln make 13.
6. `r_a` is dead: A's clock is off, and nothing from B reaches it until `r_b` is thrown. **So it has to be thrown in A's window, before B's current comes.** Wait for A. Throw `r_a`: the kiln goes dark and the store lights, and nothing else is gained. 8 of 18.
7. Wait for B. `r_b` now reads **+6, white**. Throw it. The yard goes dark, the current crosses `x:9`, the shrine burns with the mill, and the fuse box carries 10 of 10. 17 of 18. **Win.**

A player who reads all of this in the opening view can throw `r_a` in A's first window and win at the first turn of the clocks.

**Hidden at the start:** no fault. What is hidden is all of block B, dark until its clock comes round, and with it the red number on `r_b`. **Layers (2):** one clock must carry both targets, and only B's can (A's current cannot pass `r_b`); then B's fuse box can carry them only if A's relay was set ahead.

## The trap

**Throwing `r_b` in B's window while `r_a` still points at the kiln blows the fuse box.** It is the move that looks like the answer: both targets are one throw from burning together, and the relay is live. The number on it is red, +9. A bolt runs from the box to the kiln, the box shows its ✕, and block B goes dark past it, mill and all.

**It is readable:** the red number beforehand, the bolt down the wires to the kiln, the ✕, and the blown fuse's own number, which reads +13 red (it would blow again) for as long as `r_a` points at the kiln.

**It is recoverable by a part and a wait, in both windows:** `r_a` is now dead in B's window (the box cuts B's current), so wait for A's window and throw it; the blown fuse's number turns white, +10. Wait for B's window and fit the spare fuse. `r_b` kept its place, so the current crosses at once and the job is won on the repair.

**Fitting the spare at once blows it too.** The prompt says so before the click ("would blow again"). After it there is no fuse left; Undo gives the fuse back, and the state shows why (the ✕, the red +13, the relay still at the kiln).

**The flip that blows a fuse, with no click to blame.** Hand over correctly before the bulb is in (no win yet), then throw `r_a` back to the kiln in A's window. Nothing happens until the clocks turn; then B's current meets the kiln and the box blows on the flip. This is TB rule 5's case. It is off the intended road and the spare fuse recovers it. **It is flagged beforehand:** from the moment `r_a` is thrown back, both timed breakers read +9 red, "blows fb", for the turn that is coming.

## The numbers (section V), and the next-flip cue

- `r_b` in B's window: **+9 red** with `r_a` at the kiln, **+6 white** with `r_a` at the store. The number chooses, and it is the lesson: the red is not about `r_b`, it is about a relay in the other block.
- `r_a` in A's window: −3, white. It shows a loss and no gain, which is why nobody throws it without the read.
- The bulb: +1, white.
- **The timed breakers' own next-flip numbers** (shown for every timer, the alternating pair included, since TB1b1 and TB1b2): at the start both read **+1, white** (the turn drops A's 10 and brings B's 11). On the intended road, with the bulb in and `r_a` at the store, both read **+3, white** before the turn. Before the flip that blows the fuse they read **+9, red**, and name `fb`. So the clock's number is white before every turn of this puzzle except that one. The intended read still leans on the relays' numbers; the clock's red is the warning for the one harm that comes with no click.

## The tribe's kiln

`kiln` (priority) is lit in A's windows at the start and **dark at the win**: `r_a` points at the store. The trap keeps it lit and loses the fuse.

## What it tests from the GDD review

Finding 1, "the puzzle is a walk, not a deduction". The timed breaker adds a deduction the other pieces cannot: the state of a section the player cannot touch right now decides whether a move here is safe. The player has to hold "where does this current go next, and who can change that, and when" before the throw.

For Josh's question, whether it is "an interesting twist": the puzzle is built so that both windows hold work that cannot be moved to the other one. If it plays as waiting for a light to change, that is the answer too.

## Series rules it would carry (TB, "where it enters the series")

- At most 2 timed breakers: 2.
- Wins at `--click-seconds 3` in the same fewest clicks: yes, 3.
- The note names each window and what is done in it: the table above.
- Own buildings 5, faults 1, controls 2 relays and 1 fuse box. The fuse blow is the trap here, which the series caps (8 and 19 open on one); if this puzzle's idea enters N4, that cap is the architect's to weigh at the re-cut.
- It uses the relay before the series has taught it (N4). A trial outside the series may; inside it, the relay's own puzzle comes first.

## Expected numbers

`npm run analyze puzzles/city/tb-two-clocks.city.json`, at 1 s a click (the default) and at `--click-seconds 3`:

| | 1 s a click | 3 s a click |
| --- | --- | --- |
| States | 689, exhaustive | 657, exhaustive |
| Solvable | yes | yes |
| Fewest clicks | **3** | **3** |
| Waits on the shortest win | 12 (6 s) | 4 (2 s) |
| One shortest win | `r_a`, wait 6 s, `repair:shrine`, `r_b` | `r_a`, wait 2 s, `repair:shrine`, `r_b` |
| Winning click orders | 26 | 10 |
| Winning configurations | **1** (`r_a` at the store, `r_b` at the tie, the bulb in, the fuse whole) | **1** |
| Parts used | bulb (1 of 2 parts; the fuse is the spare) | bulb |
| Feed at the shortest win | 17 of 18 | 17 of 18 |
| Fuses that blow on a shortest win | none | none |
| Fuses that blow on some move | `fb` | `fb` |
| First moves | `r_a`, `repair:shrine` | `r_a`, `repair:shrine` |
| Dead-end states | 128 of 689 (18.6%) | 128 of 657 (19.5%) |
| First moves that lead only to dead ends | none | none |

The dead-end states are the ones with the fuse box blown and no fuse in hand: the spare was fitted while `r_a` still pointed at the kiln, or a second blow followed the first. Each shows the ✕ and an empty kit, and Undo returns the fuse.

Loads, replayed on the conversion: start 10 of 18; the bulb 11; `r_a` 8; B's window 11, the fuse box carrying 4 of 10; the win 17 of 18, the fuse box 10 of 10. The trap: 13 on the fuse box's 10.

**The obvious first move:** `repair:shrine`, the bulb for the dark shrine. It is right, it lights the shrine, and it starts the clock. The other possible first move, `r_a`, is also on the road. No first move does harm.

**The obvious wrong move** comes second: `r_b` on its red number in B's first window. Read and recovery are under **The trap**; the check block replays it, the spare fitted at once, and the flip that blows.

Time on the intended road: the bulb at 0 s, `r_a` before 8 s, `r_b` at 8 s. A player who meets the trap first wins at 24 s.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:shrine", "r_a", "wait:6", "r_b"],
  "traps": [
    { "name": "hand over while A's relay points at the kiln",
      "moves": ["repair:shrine", "wait:7", "r_b"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "lit": [], "complete": false },
      "recover": ["wait:7", "r_a", "wait:7", "repair:fb"] },
    { "name": "fit the spare fuse at once",
      "moves": ["repair:shrine", "wait:7", "r_b", "repair:fb"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["undo", "wait:6", "r_a", "wait:7", "repair:fb"] },
    { "name": "the flip that blows the fuse",
      "moves": ["r_a", "wait:7", "r_b", "wait:7", "r_a", "wait:7"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["wait:8", "r_a", "repair:shrine", "wait:6", "repair:fb"] }
  ]
}
```

## To watch when Josh plays it

- Whether "work between them" is felt: does he go looking in A's block for the reason `r_b` is red, and then wait for A's clock on purpose.
- Whether 8 s is the right window. It holds two unhurried clicks at 3 s each. If the wait for the other block drags, 6 s is the next thing to try; if he is rushed, 10 s.
- Whether the relays read. This is the first puzzle on the city with one. "Dead until its clock comes round" is the whole point here, so if the refused click and its prompt do not say that, the puzzle will not either.
- Whether the red +9 on `r_b` sends him to the kiln. Hovering `r_b` cues the wires it would feed (NC2); the wire that matters is the one past the shrine.
- Two of block B's houses, on the north side facing `x:9`, light with A's clock, because their drops hang from A's poles. Whether that muddies "this block, this clock".
- The spare fuse in the kit is a tell that a fuse can blow. Whether that is a fair hint or gives the trap away.
- The numbers 18 and 10 are large because 15 scenery buildings draw from the feed. Whether "10 of 10" on the fuse box at the win reads as tight or as noise.

## What it taught us
