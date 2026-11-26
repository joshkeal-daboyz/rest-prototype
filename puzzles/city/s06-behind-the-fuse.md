# 06 · Behind the fuse — design note (series v1, puzzle 6)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 6). It has no schematic and no `from`.

- **New concept:** faults hide faults. A blown fuse darkens everything past it, and a dark line shows nothing that is wrong on it. What the kit is for may not be on screen yet.
- **The reasoning move:** open the dark before spending a part that might be wanted behind it. Fit the fuse, close the breaker, and only then decide where the bulb goes.
- **Builds on:** 1 (trace the target's wire back; an open breaker), 4 (a fault is read only by current), 5 (a part spent in the wrong place is gone; spend only on the target's wire).
- **New pieces met here:** the fuse box (a blown fuse, a ✕ on its box, mended with a fuse) and the dead building (a live drop and dark windows, mended with a bulb). The fuse's rating does not bind: the box carries its whole load, and fitting the fuse blows nothing. No switch, no ring, relay, spring, battery or second feed. No bulb takes the feed or the box over its limit (the most the map can draw is 8 of 8, with the home lit as well, which no win has).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:0:8`**, at the corner where `x:11` meets `z:0`, on the town's west edge. The feed stands across `x:11`.
- Capacity **8** and `fb` rating **3**: its own 2 and 1, each raised once by `npm run fit -- --raise` for the scenery its solution lights (6 buildings on the feed, 2 of them past the fuse).
- Target: `bath_house`. Priority: `home`. Parts: **1 fuse, 1 bulb**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **Each piece stands on a run** (Josh, 26 Nov 2026, on puzzles 1 to 3: "the breaker box rests on a split. One wire is on and the other is off"). The fuse box and the breaker are each on a pole with one wire in and one wire out and no building's drop. The only split is the plain corner pole `j0`.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:11:hi:27.50` (crossing, block:0:10, across `x:11`) | 27.50, 425.75 |
| `j0` | junction | pole `pole:x:11:lo:27.50` (end, block:0:8, +z side) | 27.50, 409.25 |
| `fb` | fuse box, rating 3, **blown** | pole `pole:z:0:hi:390.50` (slot, -x side) | 20.75, 390.50 |
| `br_bath` | breaker, open | pole `pole:z:0:hi:354.50` (slot) | 20.75, 354.50 |
| `bath_house` | lamp, load 1, **target**, **dead** | building `block:0:8/a\|outer\|-x\|5,68`, by its drop from `pole:z:0:hi:342.50` | 25.00, 342.50 |
| `home` | lamp, load 1, **dead** | building `block:0:8/b\|outer\|+z\|13,80`, by its drop from `pole:x:11:lo:65.50` | 67.50, 405.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `x:11`) | 16.50 |
| `l_fb` | `j0` → `fb` | 2 spans: corner (into `z:0`), along | 21.55 |
| `l_br` | `fb` → `br_bath` | 3 spans: along `z:0` | 36.00 |
| `l_bath` | `br_bath` → `bath_house` | 1 span: along `z:0`, + drop | 12.00 |
| `l_home` | `j0` → `home` | 3 spans: along `x:11`, + drop | 38.00 |

Faults (3): `f_fuse`, the blown fuse at `fb`; `f_home`, a dead bulb in the home; `f_bath`, a dead bulb in the bath house. The first two are live from the start and so readable from the start. `f_bath` is behind the blown fuse and the open breaker.

Scenery (section S), 6 buildings, each 1:

| Building | Hangs on | Live when |
| --- | --- | --- |
| `block:0:8/a\|outer\|-x\|5,79` | `l_fb`'s carrier pole, before the fuse | always |
| `block:0:8/b\|outer\|+z\|8,80`, and `block:0:10/a\|outer\|-z\|9,86` and `-z\|12,86` (across `x:11`) | `l_home`'s poles | always |
| `block:0:8/a\|outer\|-x\|5,75` and `-x\|5,71` | `l_br`'s two carrier poles, past the fuse | the fuse is in |

The two houses past the fuse light when it goes in: that is how the player sees the fuse has worked while the bath house is still dark.

## The intended read from the default camera

The camera opens on `block:0:8` and its four streets. **The bath house is on `z:0`, the block's west street, six poles up from the corner with `x:11`** (70 m of wire from the corner pole), carrying the target mark. The feed's pole is across `x:11` from that corner.

1. The feed's wire crosses `x:11` to `j0`, the corner pole, and splits. Along `x:11`: three live spans past lit houses to a **home with a live drop and dark windows**: a dead bulb. Up `z:0`: a lit house, then a fuse box with a **✕**, and past it the line is dark, through an open breaker, to the bath house. The HUD reads 4 of 8. In hand: one fuse, one bulb.
2. Two faults show and the kit has one part for each. The bath house's line shows nothing at all, because nothing past the ✕ is live (4's rule). What is wrong past the fuse cannot be known yet.
3. Fit the fuse. Two houses past it light; the line runs live to the open breaker, one pole short of the bath house. 6 of 8.
4. Close `br_bath`. The bath house's drop goes live and its windows stay dark: a second dead bulb, the one that was hidden. 6 of 8.
5. Two dark buildings, one bulb. The bath house is the target. Fit the bulb there: gold. 7 of 8. **Win.**

**Hidden at the start (1 fact):** the bath house's dead bulb. It becomes readable when current reaches its drop, after the fuse and the breaker, neither of which can cost anything. **Layers (2):** the dark past the fuse (fuse, breaker), then the bulb.

## The trap

**A home with a live drop and dark windows asks for the one bulb; the target behind the blown fuse needs it.** As the plan's row. The kit matches what is on screen one for one, fuse to box and bulb to home, and the home is the tribe's. Fit the bulb there and the home lights (5 of 8); then the fuse and the breaker show a dark bath house on a live drop with no bulb left.

It is readable: once the dark is opened the bath house shows a dead bulb and the parts read no bulb. It is recovered by Undo, **one** if the mistake is seen at once, **three** if it is seen only after the fuse and the breaker (the bulb was the first of the three clicks). That second count is past the band's "one Undo" and is in the nature of the row: the fault that proves the mistake is the hidden one. If Josh wants it shorter, the breaker can start closed and it is two.

## The numbers (section V)

**None is red**, and the wrong move is not a load: it is a part spent in the wrong place. At the start `f_home` reads +1, the fuse reads +2 (the two houses past it; the bath house is behind an open breaker) and `br_bath` +0. After the fuse `br_bath` reads +1: it counts the unread bath house as sound, so it promises a light that does not come (a number can read high, never low). After the breaker the bath house's bulb reads +1 and the home's +1: the numbers do not choose between them.

## The tribe's homes

`home` (priority) is dark at the start, with a dead bulb, and **dark at the win**: the one bulb goes to the bath house.

## Series rules

- Size 3 faults / fuse, bulb / 1 breaker, as the row. Own buildings: 2. Faults: 3.
- One fuse box, start-blown; no move blows it (the analyzer: "fuses that blow on some move: none").
- **Kit: fuse, bulb.** Puzzle 5's kit is 2 wires, puzzle 7's is 1 wire: no repeat.
- Heavy building: none (puzzle 5 had none either; puzzle 8's is the mill).
- **Shrine count: 1 of 5** (puzzle 1; the target here is the bath house).
- District `block:0:8`; puzzle 5 is on `block:8:7`, puzzle 7 on `block:6:11`. The feed's pole and two scenery buildings are across `x:11` on `block:0:10`, which no series puzzle uses.
- Districts used so far, none to be a district again: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`.

## Expected numbers

`npm run analyze puzzles/city/s06-behind-the-fuse.city.json`:

| | |
| --- | --- |
| States | 9, exhaustive |
| Solvable | yes |
| Fewest clicks | 3 (`repair:fb`, `br_bath`, `repair:bath_house`) |
| Winning click orders | 2 (the fuse and the breaker in either order) |
| Winning configurations | **1** |
| Parts used | fuse, bulb (2 of 2) |
| Feed at the shortest win | 7 of 8; the box 3 of 3 |
| Fuses that blow | none, on any move |
| Dead-end states | 4 of 9 (44.4%): every state with the bulb in the home |
| First moves that lead only to dead ends | **1**: `repair:home` |
| Hidden at the start | 1: the bath house's dead bulb |

Loads, replayed on the conversion: start 4 of 8; the fuse 6; the breaker 6; win 7. The trap: `repair:home` 5 of 8, then the fuse and the breaker 7 of 8, the bath house dark.

**The obvious wrong first move:** `repair:home`. Read at once: the home lights, 5 of 8, and the bulb is gone with the ✕ still on the box. Read in full after `repair:fb`, `br_bath`: the bath house's drop is live, its windows dark, its bulb reads +1 and there is none in hand. Recovered by Undo (one, or three), then the solution. The check block replays both.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:fb", "br_bath", "repair:bath_house"],
  "traps": [
    { "name": "the bulb to the home",
      "moves": ["repair:home"],
      "expect": { "lit": ["home"], "readable": ["f_fuse"], "complete": false },
      "recover": ["undo", "repair:fb", "br_bath", "repair:bath_house"] },
    { "name": "the bulb to the home, found out after the dark is opened",
      "moves": ["repair:home", "repair:fb", "br_bath"],
      "expect": { "lit": ["home"], "readable": ["f_bath"], "complete": false },
      "recover": ["undo", "undo", "undo", "repair:fb", "br_bath", "repair:bath_house"] }
  ]
}
```

## To watch when Josh plays it

- Whether a live drop on dark windows reads as "dead bulb" on a building, here for the first time, before any prompt.
- Whether three Undos to take back a bulb feels fair at puzzle 6, or the breaker should start closed.
- Whether the two houses lighting past the fuse say "the fuse worked" clearly enough that the dark bath house reads as a second problem.
- The view opens with no job building lit: four scenery houses are, and the two job buildings are both dark. Whether the target still stands out.

## What it taught us
