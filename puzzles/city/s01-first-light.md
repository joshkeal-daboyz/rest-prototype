# 01 · First light — design note (series v1, puzzle 1)

A new puzzle designed on the city (ticket 081 section N1; `puzzles/series-v1.md`, row 1). It has no schematic and no `from`. **Re-laid 26 Nov 2026 (section NR)** so that each breaker stands on a single run; see "The re-lay" below.

- **New concept:** the breaker. A wire that is whole and still dark stops at an open breaker; closing it lets the current on.
- **The reasoning move:** trace the gold building's wire back to the feed, and close the breaker that wire passes through.
- **Builds on:** nothing. It uses no switch, fault, part, fuse box, relay, spring, battery or second feed, and the feed has room for every building on the map at once.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:4:8`**, at the corner where `z:5` meets `x:11`. The feed stands across `z:5`.
- Capacity **5**: its own two buildings (2), raised once by `npm run fit -- --raise` for the 3 scenery buildings its solution lights. Nothing binds: the most the map can draw, with both breakers closed, is 5 of 5.
- Target: `shrine`. Priority: `home`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (reads outward, `FEED_CLEAR_M`, no crossing spans; it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:5:hi:402.50` (crossing, block:5:8, across `z:5`) | 185.75, 402.50 |
| `j0` | junction | pole `pole:z:5:lo:402.50` (end, block:4:8, +x side) | 169.25, 402.50 |
| `br_shrine` | breaker, open | pole `pole:x:11:lo:142.50` (slot, block:4:8, +z side) | 142.50, 409.25 |
| `shrine` | lamp, load 1, **target** | building `block:4:8/b\|outer\|+z\|26,80`, by its drop from `pole:x:11:lo:132.50` | 132.50, 405.00 |
| `br_home` | breaker, open | pole `pole:z:5:lo:374.50` (slot, block:4:8, +x side) | 169.25, 374.50 |
| `home` | lamp, load 1 | building `block:4:8/b\|outer\|+x\|32,72`, by its drop from `pole:z:5:lo:366.50` | 165.00, 367.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `z:5`) | 16.50 |
| `l_south` | `j0` → `br_shrine` | 3 spans: corner (into `x:11`), 2 along | 29.55 |
| `l_shrine` | `br_shrine` → `shrine` | 1 span: along `x:11`, + drop | 10.00 |
| `l_east` | `j0` → `br_home` | 2 spans: along `z:5` | 28.00 |
| `l_home` | `br_home` → `home` | 1 span: along `z:5`, + drop | 8.00 |

**What each breaker's pole carries** (every span and drop the city has at that pole, a line's or not):

| Control | Pole | Every wire that meets there |
| --- | --- | --- |
| `br_shrine` | `pole:x:11:lo:142.50`, a slot pole in mid street | 2 wires. The span from `pole:x:11:lo:152.50` (`l_south`, in) and the span to `pole:x:11:lo:132.50` (`l_shrine`, out). No drop, no crossing span, no corner span, no other node. |
| `br_home` | `pole:z:5:lo:374.50`, a slot pole in mid street | 2 wires. The span from `pole:z:5:lo:390.50` (`l_east`, in) and the span to `pole:z:5:lo:366.50` (`l_home`, out). No drop, no crossing span, no corner span, no other node. |

The one split is `j0`, the plain corner pole where the feed's wire lands. It holds no control and no drop: its three spans are the feed's crossing, the corner span into `x:11` and the first span up `z:5`.

Scenery (section S), 3 buildings, each 1:

| Building | Hangs on | Live when |
| --- | --- | --- |
| `block:4:8/b\|outer\|+z\|29,80` | `l_south`'s carrier pole `pole:x:11:lo:152.50`, before the breaker | always |
| `block:4:8/b\|outer\|+x\|32,77` | `l_east`'s carrier pole `pole:z:5:lo:390.50`, before the breaker | always |
| `block:2:10/a\|outer\|-z\|25,86` (across `x:11`) | the shrine's pole `pole:x:11:lo:132.50`, past `br_shrine` | `br_shrine` closed |

## The re-lay (section NR, 26 Nov 2026)

**What moved, and why.** The first lay was on `block:2:10`: both breakers one pole from the corner split, `br_side` on a pole that also held a scenery building's drop (lit while the breaker past it was open) and `br_front` on the shrine's own pole. Josh: "the breaker box rests on a split. One wire is on and the other is off until you turn on the switch."

The rule now is that a breaker's pole carries two wires and no more: one in, one out. Every pole of the city has at least two spans, so that means a mid-street pole with no building's drop, with the building one pole further on.

**Why it left `block:2:10`.** That block has four such poles and the two in mid street are both on `x:14`; every pole on `z:5` and `z:2` holds a drop. Two breakers on `x:14` alone are two breakers on one wire, one behind the other. Then the wrong breaker, pressed first, does nothing at all, and "nothing happens because no current reaches it" is puzzle 2's lesson. To keep this puzzle's own shape (two wires from one corner, a breaker on each, the wrong one lights a home) it moved to `block:4:8`, where both streets from the feed's corner have a bare pole with a building one pole past it. `block:4:8` is used by no series puzzle 1 to 10 (N2's branch read) and shares no block with puzzle 2 (`block:6:1`).

**What each street now reads as:** the corner, a lit house, a breaker on a bare pole, one dark span, the building.

## The intended read from the default camera

The camera opens on `block:4:8` and its four streets. **The shrine is on `x:11`, the block's south street, four poles west of the corner with `z:5`** (40 m of wire from the corner pole), carrying the target mark while dark. The feed's pole is across `z:5` from that corner.

1. One wire crosses `z:5` from the feed to `j0`, the corner pole, and splits. One half turns the corner and runs west along `x:11` past a lit house; the other runs north up `z:5` past a lit house. Each stops at a breaker icon on a bare pole, and past each breaker there is one dark span and a dark building. Nothing is broken. The HUD reads 2 of 5.
2. Trace the shrine's wire back. Its drop hangs from a pole on `x:11`; one span back is `br_shrine`; from there the wire runs past the lit house, round the corner, to `j0` and across to the feed. `br_home` is not on it: it is up the other street.
3. Close `br_shrine`. Pulses run on one span and down the drop; the shrine's windows light gold, and the house across the street lights with it. 4 of 5. **Win.**

## Guide (ticket 084 D1)

The file's `guide` walks a first-time player through this puzzle's one idea: the goal marker, the feed and its "x of y", a breaker and its "+n". It runs until the stage has been won once (084 D2 shows it; until D2 merges the field is checked on load and nothing draws it). Each step points at one thing, says one thing, and waits. No step throws anything for the player, and the last waits for the job to complete, so the player does the job.

Buildings are named by number, as the goal list names them (084 A1): `shrine` is Building 1 (the target), `home` is Building 2 (priority). The rest of this note keeps the lamp ids.

| # | Points at | Text | Waits for | Why it is there |
| --- | --- | --- | --- | --- |
| 1 | `shrine` | "This is Building 1, under the gold marker. The priests want it lit. That is the whole job." (90) | Next | The goal marker first: Alice could not tell which building the job named. It also says there is one thing to do, so the rest reads as how. |
| 2 | `feed` | "The box with the lightning bolt is the feed. All the power starts here and runs out along the wires." (100) | Next | The feed's icon: "the box with a lightning bolt" in her words, so the step uses them. It gives the wires a direction to be read in. |
| 3 | `feed` | "The feed reads 2 of 5: the load it carries now, of the most it can carry. Every lit building adds its load." (107) | Next | The "x of y" label, with the numbers on screen at the start (two scenery houses are lit: 2 of 5). Nothing binds here; puzzle 3 is where it does, and its guide starts from this sentence. |
| 4 | `br_shrine` | "This is a breaker. It is open, so the wire past it is dark. Clicking it closes it and lets the power through." (109) | Next | The puzzle's own concept, on the breaker the lesson needs. It waits for Next, not a throw, so the player reads what a breaker is before anything moves. |
| 5 | `br_shrine` | "The +2 beside it is the load closing it would add. 2 and 2 make 4 of 5, so the feed has room." (93) | Next | The "+n", as a sum against the feed's label: +2 is Building 1 and the house across the street on its pole. It is the same sum the win shows (4 of 5). |
| 6 | `shrine` | "Your turn. Follow Building 1's wire back to its breaker and click it." (69) | the job completes | The player does the job. It points at the goal, not at the breaker, and names the reasoning move (trace the wire back), so the trap is still there: `br_home` lights Building 2, harmlessly, and the step waits. |

The texts quote what is on screen at that step (the feed's label and the number by the control). If the layout, a load or the capacity changes, the guide's numbers change with it.

## The trap

**Two breakers, one on each street out of the corner; the one up `z:5` is on the home's wire, and closing it lights a home, harmlessly.**

**Still changed from the plan's row** ("the breaker nearest the target is on another wire"), as N1 found: on a 1-block district the feed's wire comes in at a corner and its lines leave along the block's two streets, so a building's own breaker is always between it and the corner and the other street's breaker is always the farther. Here `br_shrine` is 10 m from the shrine's pole and `br_home` 68 m by wire. The move is unchanged: the wire decides. A player who clicks the nearer breaker wins without tracing, which makes this a weaker trap than the row's; for a first puzzle that only teaches what a breaker is, I think that is right.

**What the re-lay changed in the trap:** nothing in kind. Before, both breakers stood within 13 m of the split and one of them shared its pole with a lit house's drop, so neither could be read. Now each is 28 m or more from the split with one wire through it.

## The numbers (section V)

**None is red**, because nothing binds. At the start `br_shrine` reads +2 (the shrine and the house across `x:11` on its pole) and `br_home` reads +1, both white: the numbers say both are safe, and do not say which is the shrine's. After `br_home`, `br_shrine` still reads +2.

## The tribe's homes

`home` (priority) starts dark. The win costs it nothing. A player who closes `br_home` first lights it, and still wins with it lit (5 of 5).

## Series rules

- Size 0 faults / 0 parts / 2 breakers, as the row. Own buildings: 2 (cap 8). Faults: 0 (cap 4).
- No fuse box, so no fuse blow.
- Kit: none (the plan's own empty kit for 1 to 3).
- Heavy building: none.
- **Shrine count: 1 of 5** (this puzzle).
- District `block:4:8`; puzzle 2 is on `block:6:1`. The feed's pole is on `block:5:8` and one scenery building on `block:2:10`; no series puzzle 1 to 10 is on either.
- **No breaker or switch on a branch pole:** held; the table above lists every wire at each breaker's pole.

## Expected numbers

`npm run analyze puzzles/city/s01-first-light.city.json` (on the conversion, scenery counted in the feed's load):

| | |
| --- | --- |
| States | 4, exhaustive |
| Solvable | yes |
| Fewest clicks | 1 (`br_shrine`) |
| Winning click orders | 1 |
| Winning configurations | 2 (`br_home` open or closed) |
| Parts used | none |
| Feed at the shortest win | 4 of 5 |
| Fuses that blow | none |
| Dead-end states | 0 of 4 (0.0%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | nothing |

**The obvious wrong first move:** `br_home`. Read: a house up `z:5` lights and the shrine stays dark, 3 of 5. Recovered by `br_shrine` with no Undo (5 of 5, win). The check block replays it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_shrine"],
  "traps": [
    { "name": "the breaker up the other street",
      "moves": ["br_home"],
      "expect": { "lit": ["home"], "brownout": false, "complete": false },
      "recover": ["br_shrine"] }
  ]
}
```

## To watch when Josh plays it

- Whether each breaker now reads as standing on one wire: live up to it, dark for one span past it.
- Whether the two houses lit from the start (one on each street, before each breaker) read as "the current gets this far", or as part of the job.
- Whether the house across `x:11` lighting with the shrine is noticed, and whether it matters.
- Whether the weaker trap is enough for a first puzzle.

## What it taught us

- Josh, 26 Nov 2026, on the first lay (on `block:2:10`): "Puzzle 1 is confusing because the breaker box rests on a split. One wire is on and the other is off until you turn on the switch."
- Josh, 26 Nov 2026, asked how to fix it, on a card: "Both (Recommended)" (the card's option: "Re-lay 1-3 so each breaker/switch sits on a single run, AND add a cue in the game: hovering or throwing one highlights exactly the wires it controls. The cue also helps every later puzzle.").
- What the re-lay changed (section NR): each breaker is now on a bare mid-street pole with one wire in and one wire out, a building one pole past it; to get such a pole on both streets the puzzle moved from `block:2:10` to `block:4:8`. Not yet replayed.
