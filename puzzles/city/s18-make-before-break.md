# 18 · Make before break — design note (series v1, puzzle 18)

A new puzzle designed on the city (ticket 081 section N4; `puzzles/series-v1.md`, row 18). It has no schematic and no `from`. **It is the first puzzle with a spring switch**, and the spring is the new thing in it.

- **New concept:** the spring switch. It stays thrown only while current reaches it; the moment it is dark it falls back to where it started. It is the relay's opposite: a relay keeps its place without power, a spring loses it.
- **The reasoning move:** make before break. To move a held spring from one feed to another, the second must reach it before the first lets go.
- **Builds on:** 3 (a full feed: choose what goes dark), 10 (a bulb is a load event), 12 (two feeds; joined is not pooled; a breaker draws the line), 15 (handing a building from one feed to the other: there, let go first), 16 (a blow, where the hand-over goes wrong), 17 (the relay, and its hand-over through the dark).
- It uses no battery or timed breaker.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:7:5` (to the north) and `block:7:7` (to the south)**, which touch across `x:8`. North's wire runs along `block:7:5`'s south street to its south-east corner and up `z:8` to the spring. South's wire runs along `block:7:7`'s south street, up its east street, and crosses `x:8` to that same corner.
- **North** stands on `block:6:6`'s landing pole, across `z:7` from `block:7:5`'s south-west corner. **South** stands on `block:6:6`'s south-east corner pole, across `z:7` from `block:7:7`'s south-west corner. Each has one entering span. Both feeds are on the left of the view, 70 m apart.
- North capacity **8**, South capacity **12**; `fb_e` (South's fuse box, on `block:7:7`'s south street) rated **11**. Own numbers 6, 4 and 3, raised once by `npm run fit -- --raise` for the 10 scenery buildings the solution lights (2 on North, 8 on South behind the box). The top-level capacity is null (`version` 5).
- Targets: `bell_tower`, `school`. Priority: `homes`. Parts: **2 bulbs, 1 wire, 1 fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `north` | feed "North" | pole `pole:z:7:lo:242.50` (landing, block:6:6, +x side) | 344.25, 242.50 |
| `south` | feed "South" | pole `pole:z:7:lo:312.50` (end, block:6:6, +x side) | 344.25, 312.50 |
| `j_w` | junction | pole `pole:z:7:hi:242.50` (crossing, block:7:5, -x side) | 360.75, 242.50 |
| `school` | lamp, load 3, **target** | building `block:7:5\|outer\|-x\|73,47`, by its drop from `pole:z:7:hi:242.50` | 365.00, 242.50 |
| `br_1` | breaker, closed | pole `pole:x:8:lo:390.83` (slot, block:7:5, +z side) | 390.83, 249.25 |
| `j_s` | junction | pole `pole:x:8:lo:402.50` (end, block:7:5, +z side) | 402.50, 249.25 |
| `sp` | spring switch, position 0 `l_tan`, 1 `l_bell`; set 0 | pole `pole:z:8:lo:231.25` (slot, block:7:5, +x side) | 409.25, 231.25 |
| `tannery` | lamp, load 5 | building `block:7:5\|outer\|+x\|80,45`, by its drop from `pole:z:8:lo:231.25` | 405.00, 232.50 |
| `bell_tower` | lamp, load 3, **target** | building `block:8:5\|outer\|-x\|85,43`, by its drop from `pole:z:8:lo:214.50` | 425.00, 217.50 |
| `j_e` | junction | pole `pole:z:7:hi:312.50` (crossing, block:7:7, -x side) | 360.75, 312.50 |
| `homes` | lamp, load 1, priority | building `block:7:7\|outer\|-x\|73,60`, by its drop from `pole:z:7:hi:312.50` | 365.00, 312.50 |
| `fb_e` | fuse box | pole `pole:x:9:lo:367.50` (end, block:7:7, +z side) | 367.50, 319.25 |
| `r_e` | relay, position 0 `l_yard`, 1 `l_tie`; set 0 | pole `pole:x:9:lo:379.17` (slot, block:7:7, +z side) | 379.17, 319.25 |
| `yard` | lamp, load 2 | building `block:7:7\|outer\|+z\|74,62`, by its drop from `pole:x:9:lo:379.17` | 377.50, 315.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_n` | `north` → `j_w` | 1 span: 1 cross (over `z:7`) | 16.50 |
| `l_school` | `j_w` → `school` | drop | — |
| `l_1` | `j_w` → `br_1` | 3 spans: 1 corner, 2 along (along `x:8`) | 32.88 |
| `l_1s` | `br_1` → `j_s` | 1 span: 1 along (along `x:8`) | 11.67 |
| `l_sp` | `j_s` → `sp` | 2 spans: 1 corner, 1 along (along `z:8`) | 20.80 |
| `l_tan` | `sp` → `tannery` | drop | — |
| `l_bell` | `sp` → `bell_tower` | 1 span: 1 along (along `z:8`) + drop | 16.75 |
| `l_s` | `south` → `j_e` | 1 span: 1 cross (over `z:7`) | 16.50 |
| `l_homes` | `j_e` → `homes` | drop | — |
| `l_e1` | `j_e` → `fb_e` | 1 span: 1 corner | 9.55 |
| `l_e2` | `fb_e` → `r_e` | 1 span: 1 along (along `x:9`) | 11.67 |
| `l_yard` | `r_e` → `yard` | drop | — |
| `l_tie` | `r_e` → `j_s` | 9 spans: 6 along, 2 corner, 1 cross (along `x:9`, along `z:8`, over `x:8`). **Fault `f_t`** on `x:8:hi:402.50~x:8:lo:402.50` | 98.93 |

Faults (3): `f_bulb`, the school's dead bulb, **flickering at the start** (North reaches it); `f_t`, a break on the tie's last span, the crossing of `x:8`, **sparking at the start** on North's side; `f_bell`, the bell tower's dead bulb, dark at the start behind the spring's second position.

**The picture.** North's wire: the school on its first pole, the south street of `block:7:5`, **`br_1` (closed)**, the corner pole (`j_s`), and one pole up `z:8` to **the spring**. The spring's pole carries the tannery's drop (where it rests); its other wire goes one span north to the bell tower's pole (where it is thrown). The bell tower stands across `z:8`. South's wire: the tribe's homes on its first pole, **the fuse box**, **the relay** with the yard on its pole; the relay's other wire, **the tie**, runs along `block:7:7`'s south street, up its east street, and across `x:8` to `j_s`. The tie is broken on that last crossing, a span from the corner.

**The street crossing between blocks:** the tie's last span, over `x:8`, from `block:7:7`'s crossing pole to `block:7:5`'s corner pole. It is the broken span.

**No breaker, relay, spring or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `br_1` | `pole:x:8:lo:390.83` | 2 spans, both its own (`l_1` in from `x:8:lo:379.17`, `l_1s` out to `x:8:lo:402.50`); no drop |
| `sp` | `pole:z:8:lo:231.25` | its own three wires and nothing else: along from the south (`l_sp`), the tannery's drop (`l_tan`, position 0), along north (`l_bell`, position 1). One out goes straight into a building's drop ("Allow it (Recommended)") |
| `fb_e` | `pole:x:9:lo:367.50` | 2 spans, both its own (`l_e1`, the corner span from South's first pole; `l_e2` out to `x:9:lo:379.17`); no drop |
| `r_e` | `pole:x:9:lo:379.17` | its own three wires and nothing else: along from the west (`l_e2`), the yard's drop (`l_yard`, position 0), along east (`l_tie`, position 1) |

Scenery (section S), 10 buildings, all lit at the win: 2 on North's south street before `br_1` (one of them `block:7:7`'s, across `x:8`); 1 on the corner pole `j_s` (it goes with whichever feed holds the corner); 7 on the tie (5 of `block:7:7`'s, 2 of `block:8:7`'s across `z:8`), dark until the relay is thrown.

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:7:5` | Throws the spring; reads the bell tower's dead socket; mends the tie where it lands; opens `br_1`; fits both bulbs | The spring, the breaker that lets North go, and both targets' wires are on its poles |
| `block:7:7` | Throws the relay (the yard dark, the tie's street lit). Reads South's box: 7 of 11 with the street on, so room for 4 | South's only wire to the spring starts here, and the box that decides what South may find at the end of it is here |

The relay on `block:7:7` is what brings a second feed to the corner of `block:7:5`. The breaker on `block:7:5` is what puts the bell tower on `block:7:7`'s fuse box. Opened a click too early, it is `block:7:7`'s box that blows.

## The intended read from the default camera

The camera opens on both blocks, `block:7:5` above. **The school is the dark building at `block:7:5`'s south-west corner, at the left, flickering red at its socket. The bell tower is on the right, across `z:8` from `block:7:5`'s east street, dark.** The tannery is lit beside the spring, one pole up `z:8`.

1. North's wire is lit from the left along the middle street to the corner, where the tannery burns. **North 8 of 8.** The school flickers (+3, **red**). A **spark** at the corner, on a wire that crosses the street south. South's wire, bottom left: the homes, a fuse box (**2 of 11**), a relay with the yard on its pole, and a dark street. South 3 of 12. Two bulbs, a wire and a fuse in hand.
2. The bell tower is behind the spring, and the spring rests on the tannery. **Throw the spring** (−2): the tannery goes dark, and the bell tower's socket **flickers**. It wants a bulb too. North 3 of 8.
3. Two dead buildings, 3 each, and North has room for 5. One of them has to be carried by South. The school hangs on North's first pole. So it is the bell tower, by the tie.
4. **Throw the relay** (+5): the yard goes dark and the tie's street lights, seven houses, up to the spark at the crossing. South's box reads **7 of 11**. Room for 4: the corner house and the bell tower. Not for the tannery's 5.
5. So South must find the spring already thrown, and the spring is thrown only while North holds it. **Mend the tie now** (+0, white), with North still on. Nothing changes: the two feeds meet at the corner, and North, the nearer, still carries it.
6. **Open `br_1`** (+0). North lets go. The spring does not move: South was already there. South 9 of 12, its box 8 of 11.
7. Fit the bell tower's bulb (+3, white): South 12 of 12, its box 11 of 11. Fit the school's (+3, white): North 5 of 8. **Win.**

**Hidden at the start (1 fact):** the bell tower's dead bulb, behind the spring's second position. Throwing the spring shows it. **Layers (4):** North cannot light both; South can take the bell tower but not the tannery; the spring has to be held across the hand-over; the bulbs go in where there is room.

## The trap

**Opening `br_1` to take the bell tower off North drops the spring: when South arrives it finds the tannery, and its fuse box blows.**

This is the hand-over as every earlier puzzle taught it. In puzzle 15 the long house left West for North by opening one breaker and then closing the other, and joining first was the mistake. In puzzle 17 the relay was set, the back door shut, and the front opened, with a dark gap between. Here the same order, the spring thrown, `br_1` opened, then the relay and the tie, fails in the gap: the spring snaps back to the tannery the moment it is dark. Nothing is red when `br_1` is opened (it reads −1, white). The red comes two clicks later, on the tie's mend: **+6, red**, naming South's box.

**It is readable:** the spring's ribbon springs back when `br_1` opens; the mend's red; then the bolt along the tie's street to the box, and the street dark. **It is recovered by a part and the right order:** close `br_1` (North wakes the spring, with a flicker: it is carrying the tie's street as well), throw the spring, fit the spare fuse in South's box (white now), open `br_1`.

**Fit it and it blows again** (a designed trap, NB-Q2: "Allow it too"). With the spring fallen back, the blown box's number reads **+13, red** and the prompt warns (*would blow again: 13 load on ≤11*). Fitted, it blows at once and the fuse is gone. One Undo returns it. The relay, on the dead street, is still where it was thrown. The spring is not. The two stand a block apart in the same failed state, and that is the difference between them.

**The free traps.** Both bulbs on North: 9 of 8, a brownout; bring South and open `br_1`. The tie mended before the relay is thrown (its number is red, +7): North takes the tie's street, 15 of 8; throw the relay and South takes it back.

## What it builds on, and its depth of read

- **15 and 17 are the trap.** Both taught a hand-over with a gap. The spring is the piece that cannot cross one.
- **12 is the answer.** Joined is not pooled, and a breaker draws the line: mending the tie changes nothing, and opening `br_1` afterwards is what moves the bell tower to South.
- **3 and 10 are the reason.** North is full, and each bulb is 3 more on whoever carries its building.
- **16** is what the wrong order costs: a blow, and a spare fuse that blows again unless the cause is put right first.
- **Depth of read: 8.** Before the first part is spent the player must hold: (1) the bell tower is behind the spring, which rests on the tannery and is held only while live; (2) thrown, North is at 3 of 8, with two dead buildings of 3 each to light: one must go to South; (3) the school cannot (it is on North's first pole), so the bell tower must; (4) South reaches the corner only by the relay and the tie, and with the tie's street on its box has room for 4; (5) that is the bell tower and the corner house, and not the tannery: South must not meet the spring at rest; (6) the spring falls back the moment North lets go, so North holds until South is joined; (7) joined, North still carries, and `br_1` is what hands it over; (8) the tie's mend comes after the relay's throw, or its street lands on North. Puzzle 17 asks for 8.

## The numbers (section V) and the hover cue

- At the start: the spring **−2** (the tannery off, the bell tower on: the number counts the unread bulb as sound); `br_1` −6; the relay +5 white; the school's bulb **+3 red** (North); the tie's spark **+7 red** (North would take its street).
- After the spring: both bulbs +3 white (either fits; the second will not). After one of them: the other **+3 red**.
- After the relay: the tie's spark **+0 white**. After the mend: `br_1` **+0 white**, with the spring thrown.
- With the spring at rest and the relay thrown: the tie's spark **+6 red, blows `fb_e`**; after the mend, `br_1` +0 **red**, blows `fb_e`. The same breaker, white or red by where the spring stands.
- After `br_1`: the spring reads +5 red, blows `fb_e` (throwing it back would bring the tannery to South).
- The hover cue on `br_1`, after the mend, lights nothing new and darkens nothing: that is the make, already made. Before the mend it darkens the corner and the spring's wire.
- **A fact only the HUD shows:** North's own limit and load (8 of 8, then 3 of 8). The city has no bar for a feed. What the city shows is the red on the second bulb. South's side is on the city: its fuse box's bar is South's load less the homes. Which feed carries the corner after the tie is mended is also HUD-only; the map does not need it read, because nothing changes until `br_1` opens. Both are under **To watch**.

## The tribe's homes

`homes` (priority) is on South's first pole, before its box: lit at the start and **lit at the win**. A blow of South's box leaves them lit. The win costs the tribe the tannery (5) and the yard (2), dark for good: the spring is held off the one and the relay turned from the other. It lights the seven houses of the tie's street, which were dark.

## Changed from the plan's row

- **Kept from row 18** ("Keep it live"): the spring switch; make before break; the heavy building that has to go dark sits where the spring rests, so cutting the road drops the spring and brings it back.
- **Changed:** the row was a spring and capacity alone, with 3 breakers, no faults, no parts and no fuse ("18 drops the fuse on purpose so the spring is the only new thing"). Built: **two feeds, a relay, one rated fuse box, 1 breaker, 3 faults, 2 bulbs, a wire and a fuse.** Without a rated box the wrong order costs nothing: a feed that meets the spring at rest only browns out, and a spring can be thrown through a brownout. `tb-two-clocks` found the same of the relay. The rated box on the second road is what makes the order matter; the spare fuse makes the mistake a lesson and not a dead end. The second road is a second feed (N4's starting point: "Two feeds (12) make a natural hand-over"). The relay is South's door to the tie, and stands beside the spring to be compared with it.
- **Dropped moves, for N5:** a spring held by something other than a feed (row 24, "Hold the spring", wants a battery to hold it); a switch that is both relay and spring. Neither has been shown. What has: a spring falls back when dark, and can be handed between two feeds only joined.
- **Size:** 3 / 2 bulbs, wire, fuse / 1 spring, 1 relay, 1 breaker, 1 fuse box, 2 feeds; 2 blocks (the row: 0 / 0 / 1 spring, 3 breakers).

## Limits passed

None. 6 clicks, 1 hidden fact, 3 faults, 6 own buildings, 2 blocks.

## Series rules

- **Reuse is free.** A blow is what the wrong order costs, and "fit it and it blows again" is a designed trap, named above and readable before the fit.
- **Kit: 2 bulbs, 1 wire, 1 fuse.** Puzzle 17's is two wires and a fuse. **Puzzle 19's must not be two bulbs, a wire and a fuse.**
- **Heavy building: the tannery** (load 5). Puzzle 17's is the mill. **Puzzle 19's must not be the tannery.**
- **Shrine count: 2 of 5.** No shrine here.
- District `block:7:5`, `block:7:7`. Neither has been used by the series. It shares no block with puzzle 17 (`block:0:4`, `block:3:4`). **Puzzle 19 must not use `block:7:5` or `block:7:7`.** The bell tower stands on `block:8:5`, across `z:8`; its drop hangs from `block:7:5`'s pole. Both feeds' poles are on `block:6:6`.
- **Districts used by 1 to 18**, none to be a district again: `block:4:8`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, `block:7:1` + `block:8:1`, `block:3:0` + `block:0:0`, `block:0:4` + `block:0:2`, `block:4:8` + `block:5:8`, `block:6:11` + `block:7:11` + `block:8:10`, `block:0:4` + `block:3:4`, and now `block:7:5` + `block:7:7`.

## Expected numbers

`npm run analyze puzzles/city/s18-make-before-break.city.json`:

| | |
| --- | --- |
| States | 96, exhaustive |
| Solvable | yes |
| Fewest clicks | 6 (`sp`, `r_e`, `repair:school`, `repair:bell_tower`, `repair:l_tie`, `br_1`) |
| Winning click orders | 108 |
| Winning configurations | **1** (the spring thrown, the relay at the tie, `br_1` open, the tie mended, both bulbs in, no box blown) |
| Parts used | bulb, bulb, wire (3 of 4; the fuse is a spare) |
| Feeds at the shortest win | North 5 of 8, South 12 of 12 |
| Fuses that blow on a shortest win | none |
| Fuses that blow on some move | `fb_e` |
| First moves | `br_1`, `sp`, `r_e`, `repair:school`, `repair:l_tie` |
| Dead-end states | 12 of 96 (12.5%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the bell tower's dead bulb |

**No win without the spring thrown and held:** the bell tower hangs only on its second position, and the one winning configuration has it there, with `br_1` open, so South is holding it.

Loads, replayed on the conversion: start North 8 of 8, South 3 of 12, `fb_e` 2 of 11; the spring North 3; the relay South 8, `fb_e` 7; the tie's mend no change; `br_1` North 2, South 9, `fb_e` 8; the bell tower's bulb South 12 of 12, `fb_e` 11 of 11; the school's bulb North 5 of 8, win. The trap: 13 on `fb_e`'s 11.

**The obvious wrong first move** is not the first click: every first move is safe, and the spring's throw is right. It is the second: `br_1`, opened to take load off North. Read: the spring falls back; two clicks on, the tie's mend is red and names South's box. If the red is pushed, the box blows: recovered by **the spare fuse**, after North has woken the spring and it has been thrown again. The dead-end states are the ones with the fuse spent while the spring is at rest. The check block replays the early break, the fuse fitted at once, both bulbs on North, and the tie mended first.

**Where it stands against 17, said plainly.** By the analyzer it is easier: 108 winning click orders against 16, and 12.5% dead-end states against 63.7%. No first move is a dead end. It reads as deep (8 facts against 8), and it has what 17 does not: the wrong order is the order the last three puzzles taught, and nothing is red when the mistake is made. Its bite is softer on purpose: this is the first spring, and the fall-back has to be seen, understood and survived once. Whether that is enough of a climb is Josh's to say when he plays it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sp", "r_e", "repair:l_tie", "br_1", "repair:bell_tower", "repair:school"],
  "traps": [
    { "name": "let North go before South holds the spring",
      "moves": ["sp", "br_1", "r_e", "repair:l_tie"],
      "expect": { "blown": ["fb_e"], "readable": ["blown-fb_e"], "lit": ["homes"], "complete": false },
      "recover": ["br_1", "sp", "repair:fb_e", "br_1", "repair:bell_tower", "repair:school"] },
    { "name": "fit the spare fuse with the spring at rest and it blows again",
      "moves": ["sp", "br_1", "r_e", "repair:l_tie", "repair:fb_e"],
      "expect": { "blown": ["fb_e"], "readable": ["blown-fb_e"], "complete": false },
      "recover": ["undo", "br_1", "sp", "repair:fb_e", "br_1", "repair:bell_tower", "repair:school"] },
    { "name": "both bulbs on North",
      "moves": ["sp", "repair:school", "repair:bell_tower"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["r_e", "repair:l_tie", "br_1"] },
    { "name": "mend the tie before the relay is thrown",
      "moves": ["repair:l_tie"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["r_e", "sp", "br_1", "repair:bell_tower", "repair:school"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds both blocks, both feeds' poles at the left, and the bell tower across `z:8` at the right.
- The spring reads as a spring (the coiled ribbon), and the relay as a relay, and the two can be told apart at a glance: they are 90 m apart, on different blocks.
- The spring's fall-back is seen when `br_1` opens: the icon moves, with nothing clicked on it.
- The spark at the corner shows at the start, on the crossing span of `x:8`, on North's side.
- The bell tower's drop crosses `z:8` (about 16 m); it reads as hung from the pole north of the spring's.

## To watch when Josh plays it

- Whether he opens `br_1` before South is joined, and if he does, whether he sees the spring fall back when it happens or only when the red turns up two clicks later.
- Whether the spring reads as different from the relay before it misbehaves: the ribbon, the prompt's words.
- **North's limit is only in the HUD.** Whether "North is full" is read from the red on the bulbs alone. If it is not, this puzzle wants a bar on the feed's pole, and that is a renderer question, not this map's.
- Whether mending the tie with North still on, a click that changes nothing on screen, feels like the answer or like a wasted wire.
- Whether the same breaker reading white or red by where the spring stands is noticed.
- Whether the relay and the spring, left side by side in the failed state (one kept its place, one did not), teach the difference.
- Whether four parts in hand is too many to hold.

## What it taught us
