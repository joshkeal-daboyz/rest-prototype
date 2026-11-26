# 16 · Let it blow — design note (series v1, puzzle 16; ticket 081 NB1)

A new puzzle designed on the city (ticket 081 sections N4 and NB1; `puzzles/series-v1.md`, row 16). It has no schematic and no `from`. **It is the first puzzle where a fuse is blown on purpose**, and that is the new thing in it.

Josh, 26 Nov 2026: "I would like the game the game to include challenges where you intentionally blow fuses to resuce load on a branch to complete objectives as well."

- **New concept:** the deliberate blow. A heavy building with no breaker of its own can still be taken off the wire: overload the fuse box above it. The box blows, and everything behind it goes dark and leaves the load of every box and feed above.
- **The reasoning move:** "red, on purpose": before throwing a red breaker, ask which box the red names, what that box takes with it when it goes, and whether any of that is wanted.
- **Builds on:** 3 (choose what goes dark), 8 (a red breaker means "not yet": find what shares its box), 11 and 14 (which box a stretch of wire lands on is decided by the breakers at its two ends), 13 (a second road reaches the back of a fault), 15 (a mother fuse over a child: two bars over one building).
- It uses no switch, relay, spring, battery, timed breaker or second feed.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:11`, `block:7:11` and `block:8:10`**, three in a row along the city's south edge: `block:6:11` and `block:7:11` touch across `z:7`, `block:7:11` and `block:8:10` across `z:8`.
- The wire comes in along `block:6:11`'s south street through the mother fuse to the corner at `z:7`, and there goes round the empty square, `block:7:11`: one way up `z:7` and along the square's north side, the other way along its south side and up `z:8`. The two ways meet at an open breaker on the north side. From the square's south-east corner a spur crosses `z:8` to the infirmary on `block:8:10`.
- The feed stands on `block:5:10`'s crossing pole, across `z:6` from `block:6:11`'s south-west corner. One entering span.
- Capacity **13**; `fb_m` (the mother, on `block:6:11`'s south street) rated **10**; `fb_c` (the child, on `z:8`) rated **5**. Own numbers 7, 7 and 5, raised once by `npm run fit -- --raise` for the 6 scenery buildings the solution lights (3 before the mother, 3 behind it, none behind the child).
- Targets: `bath_house`, `infirmary`. Priority: `homes`. Parts: **1 bulb, 1 fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:6:lo:507.50` (crossing, block:5:10, +x side) | 249.25, 507.50 |
| `fb_m` | fuse box | pole `pole:x:14:lo:326.67` (slot, block:6:11, +z side) | 326.67, 514.25 |
| `j_1` | junction | pole `pole:z:7:lo:507.50` (end, block:6:11, +x side) | 344.25, 507.50 |
| `br_o` | breaker, closed | pole `pole:z:7:hi:472.50` (crossing, block:7:11, -x side) | 360.75, 472.50 |
| `j_x` | junction | pole `pole:x:13:hi:367.50` (end, block:7:11, -z side) | 367.50, 465.75 |
| `bath_house` | lamp, load 2, **target** | building `block:7:9\|outer\|+z\|73,89`, by its drop from `pole:x:13:hi:367.50` | 367.50, 450.00 |
| `br_s` | breaker, open | pole `pole:x:13:hi:390.83` (slot, block:7:11, -z side) | 390.83, 465.75 |
| `j_c` | junction | pole `pole:z:8:lo:472.50` (end, block:7:11, +x side) | 409.25, 472.50 |
| `foundry` | lamp, load 4 | building `block:8:10/a\|outer\|-x\|85,92`, by its drop from `pole:z:8:lo:472.50` | 425.00, 467.50 |
| `homes` | lamp, load 1, priority | building `block:8:10/a\|outer\|-x\|85,94`, by its drop from `pole:z:8:lo:472.50` | 425.00, 472.50 |
| `fb_c` | fuse box | pole `pole:z:8:lo:495.83` (slot, block:7:11, +x side) | 409.25, 495.83 |
| `j_2` | junction | pole `pole:z:8:lo:507.50` (end, block:7:11, +x side) | 409.25, 507.50 |
| `br_t` | breaker, open | pole `pole:z:8:hi:507.50` (crossing, block:8:10, -x side) | 420.75, 507.50 |
| `infirmary` | lamp, load 5, **target** | building `block:8:10/b\|outer\|+z\|85,101`, by its drop from `pole:x:14:lo:427.50` | 427.50, 510.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_f` | `feed` → `fb_m` | 7 spans: 1 cross, 1 corner, 5 along (over `z:6`, along `x:14`) | 80.21 |
| `l_m` | `fb_m` → `j_1` | 2 spans: 1 along, 1 corner (along `x:14`) | 20.38 |
| `l_o` | `j_1` → `br_o` | 4 spans: 3 along, 1 cross (along `z:7`, over `z:7`) | 51.50 |
| `l_x0` | `br_o` → `j_x` | 1 span: 1 corner | 9.55 |
| `l_bath` | `j_x` → `bath_house` | drop | — |
| `l_t0` | `j_1` → `j_2` | 6 spans: 1 cross, 2 corner, 3 along (over `z:7`, along `x:14`) | 70.59 |
| `l_t1` | `j_2` → `br_t` | 1 span: 1 cross (over `z:8`) | 11.50 |
| `l_inf` | `br_t` → `infirmary` | 1 span: 1 corner + drop | 9.55 |
| `l_c0` | `j_2` → `fb_c` | 1 span: 1 along (along `z:8`) | 11.67 |
| `l_c1` | `fb_c` → `j_c` | 2 spans: 2 along (along `z:8`) | 23.33 |
| `l_foundry` | `j_c` → `foundry` | drop | — |
| `l_homes` | `j_c` → `homes` | drop | — |
| `l_s` | `j_c` → `br_s` | 2 spans: 1 corner, 1 along (along `x:13`) | 21.21 |
| `l_x1` | `br_s` → `j_x` | 2 spans: 2 along (along `x:13`) | 23.33 |

Fault (1): `f_bulb`, the infirmary's dead bulb, dark at the start behind its open breaker `br_t`.

**The picture.** `block:7:11` is an empty square with poles on all its sides and almost no houses, so every number on this map is small. Round the square from the corner at `z:7` (`j_1`): north up `z:7` past two houses, across to **`br_o` (closed)** at the square's north-west corner, the bath house's pole, **`br_s` (open)** on the north side, the foundry and the tribe's homes on one pole at the north-east corner, down `z:8` to **the child box**, the south-east corner (`j_2`), and back along the south side to `j_1`. The bath house's short wire has a breaker at each end: one to the mother's side, one into the child's branch.

**The street crossings between blocks:** `l_o` crosses `z:7` from `block:6:11` to `block:7:11` at the top (`br_o`'s pole); `l_t0` crosses `z:7` at the bottom; `l_t1` crosses `z:8` from `block:7:11` to `block:8:10` (`br_t`'s pole).

**No breaker or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb_m` | `pole:x:14:lo:326.67` | 2 spans, both its own (`l_f` in from `x:14:lo:315.83`, `l_m` out to `x:14:lo:337.50`); no drop |
| `fb_c` | `pole:z:8:lo:495.83` | 2 spans, both its own (`l_c0` in from `z:8:lo:507.50`, `l_c1` out to `z:8:lo:484.17`); no drop |
| `br_o` | `pole:z:7:hi:472.50`, `block:7:11`'s crossing pole | 2 spans, both its own (`l_o`, the crossing of `z:7`; `l_x0`, the corner span to the bath house's pole); no drop |
| `br_s` | `pole:x:13:hi:390.83` | 2 spans, both its own (`l_s` in from `x:13:hi:402.50`, `l_x1` out to `x:13:hi:379.17`); no drop |
| `br_t` | `pole:z:8:hi:507.50`, `block:8:10`'s crossing pole | 2 spans, both its own (`l_t1`, the crossing of `z:8`; `l_inf`, the corner span to the infirmary's pole); no drop |

It has no switch. The two exceptions Josh allowed are not used.

Scenery (section S), 6 buildings, all on `block:6:11` and all lit from start to win: 3 before the mother (the corner house at the feed's crossing, 2 on the south street); 1 behind the mother on the south street's last pole; 2 on `z:7`, on the way up to `br_o`. Nothing hangs behind the child but the foundry and the homes, and nothing on the bath house's wire but the bath house.

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:6:11` | Reads the mother's bar on the south street: **10 of 10** | The mother is the bar the infirmary fails. It is the only place that says why shedding the bath house is not enough |
| `block:7:11` | Opens `br_o`, closes `br_s` (the blow), opens `br_s`, closes `br_o`. Reads the child's bar: 5 of 5 | Both ends of the bath house's wire and the child box stand on the square's poles |
| `block:8:10` | Closes `br_t` to look (the infirmary's socket flickers), fits the bulb. Reads what the blow costs: the foundry and the tribe's homes, on one pole | The infirmary, its breaker, and the two buildings behind the child are here |

The red on `block:8:10` (the infirmary's breaker, then its bulb) is caused on `block:6:11` (the mother, full) and cured on `block:7:11` (the child blown by two breakers on the square). What the cure costs is back on `block:8:10`.

## The intended read from the default camera

The camera opens on the three blocks, `block:6:11` on the left. **The infirmary is the dark building at `block:8:10`'s south-west corner, on the far right at the bottom, behind a breaker just across `z:8`. The bath house is the lit building above the square's north-west corner (it stands across `x:13`). The foundry and the tribe's homes are the two lit buildings side by side at the square's north-east corner, across `z:8`.**

1. The wire comes in along the bottom left, through a fuse box (**10 of 10**) to the corner, and goes round the empty square both ways. Left and up: two houses, a breaker, the bath house. Right and up: a spur across the street to an **open breaker** and the dark infirmary; then a second fuse box (**5 of 5**), the foundry and the homes. Between the homes' corner and the bath house, on the square's north side, an **open breaker**. A bulb and a fuse in hand.
2. The infirmary's breaker reads **+5, red**, and the red names the first box. The mother is full.
3. Puzzle 8's question: what shares that box, and what can come off? The bath house has a breaker (−2), and the priests want it. The foundry is 4 and has no breaker at all. Open the bath house's breaker anyway and the infirmary is still red: 8 and 5 are 13.
4. The foundry and the homes fill the second box, 5 of 5. The open breaker on the north side would hang the bath house's wire on that box as well. With the bath house lit from its own side, that breaker reads **+0**: nothing would move.
5. **Open the bath house's breaker (`br_o`).** The bath house goes dark. The north-side breaker now reads **+2, red**, and the red names the small box: 7 on 5.
6. What goes with it: the foundry, the homes and, for now, the bath house. The priests asked for none of the first two. **Close `br_s`.** A bolt runs to the child box; the foundry and the homes go dark. The mother reads 3 of 10.
7. Bring the bath house back. Its own breaker now reads **+7**: its wire still runs on into the child's branch, and would relight the foundry from behind. **Open `br_s` first** (+0), then close `br_o` (+2). The bath house is lit, the mother at 5 of 10.
8. Close the infirmary's breaker (+5, white). Nothing lights: its socket flickers. **Fit the bulb** (+5, white). The mother 10 of 10, the feed 13 of 13. **Win.**

**Hidden at the start (1 fact):** the infirmary's dead bulb, behind its open breaker. Closing the breaker shows it and costs nothing while the bulb is dead (the number on it reads high until then, as puzzle 14 taught). **Layers (4):** the mother's bar and the shed that is not enough; the blow (which wire to hang on the child, and what the blow takes); the way back (the bath house without the foundry); the infirmary's road (the look, the bulb).

## The trap

**The only breaker under the full box is the bath house's: shed it, light the infirmary, and the mother blows, because the 4 that had to go has no breaker.**

This is the move puzzles 3 and 8 taught, and the obvious first one: something must come off the mother, and one breaker under it sheds load. Open `br_o` (−2), close the infirmary's breaker, fit the bulb on its red number. 8 and 5 on a box rated 10: a bolt along the south street, and both streets dark. It is readable before (the bulb reads +5 red and names the mother, whose bar reads 8 of 10) and after (the blown mother). It is recovered **by a part**: open the infirmary's breaker, fit the spare fuse in the mother, and go on. The click itself, `br_o`, is also the first click of the answer; what is wrong is stopping there.

**Put the bath house back too soon.** After the blow, close `br_o` with `br_s` still closed: the bath house lights, and so do the foundry and the homes, fed from behind through the bath house's wire. The mother is back at 10 of 10 and the infirmary is red again. Nothing is lost: open `br_s`. Puzzle 13 taught that a second road reaches the back of a fault; here it undoes the blow.

**Fit it and it blows again** (a designed trap, Josh, NB-Q2: "Allow it too"). The spare fuse fits the blown child. With `br_s` still closed the prompt warns (*would blow again: 7 load on ≤5*) and its number reads +7 red; fitted, it blows at once and the fuse is gone. One Undo returns it.

**Give the foundry its fuse back.** With `br_s` open the spare holds in the child (+5, white): the foundry and the homes come back, the mother is at 10 of 10, and the infirmary's bulb is red for good. One Undo. The tribe's homes are what makes this tempting.

## What it builds on, and its depth of read

- **3 and 8 are the trap.** "Take something off the full box" is right, and the only thing a breaker can take off is too small and is wanted.
- **15 is held against it.** 15 taught two bars over one building, and that the room is made under the mother on another branch. Here the other branch has no breaker, so the child box is used as one.
- **11 and 14 are the tool.** Which box a stretch of wire lands on is decided by the breakers at its ends. The bath house's wire is moved onto the child to overload it, and moved back.
- **13 is the way back.** A second road reaches behind a fault. After the blow the bath house's wire is that road, so its far breaker must be opened before its near one is closed.
- **Depth of read: 7.** Before the blow the player must hold: (1) the infirmary is 5 and hangs under the mother, which is 10 of 10; (2) the one breaker under the mother sheds 2, and it is a target's; (3) the foundry, 4, has no breaker, and with the homes it fills the child, 5 of 5; (4) the bath house's wire has a second breaker into the child's branch, and on the child it makes 7 on 5; (5) it lands on the child only once its own breaker is open (joined at both ends, nothing moves); (6) the blow takes the foundry, the tribe's homes and, until it is brought back, the bath house, and none of the first two is asked for; (7) the bath house comes back only after `br_s` is opened again, or the foundry returns with it. Puzzle 15 asks for 6.

## The numbers (section V) and the hover cue

- At the start: `br_t` **+5 red**, blows `fb_m` (it reads high: the bulb is dead); `br_o` −2; `br_s` +0.
- After `br_o`: `br_s` **+2 red, blows `fb_c`**. This is the move. `br_t` is still +5 red on `fb_m`.
- With both ends closed (`br_s` first): `br_o` reads +0 **red**, blows `fb_c`: opening it drops the bath house onto the child. Either order reaches the blow.
- After the blow: the blown child's own number reads +7 red (would blow again) while `br_s` is closed, +5 white once it is open. `br_o` reads +7 while `br_s` is closed (the bath house and the foundry's branch from behind), +2 once it is open. `br_t` +5 white.
- After `br_t`: the bulb +5 white.
- **How the player gets from "red means not yet" to "red, on purpose".** In puzzle 8 the red named the box the target hangs under, and the cure was to take load off it. Here two reds are on screen at once after `br_o`: the infirmary's names the mother, and `br_s`'s names the child. The infirmary is not behind the child. A red that names a box with nothing wanted behind it is an offer.
- **The fact that says the blow is affordable** is on the child's own pole run: two buildings hang behind it, the foundry and the homes, neither with a target's gold, and the bath house's wire, which has its own way back.
- The hover cue on `br_s` (NC2) lights the bath house's wire from the north-east corner; on `br_o`, after the blow, it lights the bath house's wire and the child's branch behind it, which is the warning for the second trap. The cue shows what a throw makes live, not what a blow darkens (Josh, NB-Q4: "As today (Recommended)").

## The tribe's homes, and what the blow costs

`homes` (priority, load 1) hangs on the foundry's pole behind the child box: lit at the start and **dark at the win**, with the foundry (4). There is no win that keeps them: the analyzer finds none with the child whole (below). The bath house goes dark for three clicks and comes back. The kit holds a spare fuse; it is for a mother blown by mistake, and fitting it in the child ends the job's chances (the last two traps).

## Changed from the plan's row

- **Replaces** the plan's row 16 ("Only moves live", the relay), which merges with row 17 into puzzle 17 (N4, **The order**). This puzzle is NB1, added by section NB after the plan was approved.
- **From NB1's goal as cut:** kept: a mother box that cannot hold the target, a heavy building no breaker can shed, a rated box over it, a red breaker thrown on purpose. **Changed:** the load that overloads the box is not extra load behind it. It is the bath house's wire, swung from the mother's side onto the child and back, on a loop round the square. A breaker behind a blown box is dead, and could be left open or closed at the win; that gave two winning configurations, under the band's floor of one. On the loop the breaker stays live after the blow and has one right position.
- **The obvious wrong move** (NB1's criterion 4) is the old shed, and it is the same click as the answer's first move. The check block holds it as the trap it becomes when the player stops there and lights the infirmary.
- **Size:** 1 / bulb, fuse / 3 breakers, 2 fuse boxes; 3 blocks.

## Limits passed

None. 6 clicks, 1 hidden fact, 1 fault, 5 own buildings, 3 blocks.

## Series rules

- **Reuse is free** (Josh, 26 Nov 2026). The blow is this puzzle's concept. "Fit it and it blows again" is a designed trap here (NB-Q2), named above and readable before the fit.
- **Kit: 1 bulb, 1 fuse.** Puzzle 15's is a fuse and a wire; puzzle 17's is two wires and a fuse.
- **Heavy building: the foundry** (load 4). Puzzle 15's is the long house; puzzle 17's is the mill.
- **Shrine count: 2 of 5.** No shrine here.
- District `block:6:11`, `block:7:11`, `block:8:10`. `block:7:11` and `block:8:10` have not been used by the series. `block:6:11` was puzzle 7's district (not a neighbour of 16); this puzzle uses its south street and its east face, where puzzle 7's wire did not go. It shares no block with puzzle 15 (`block:4:8`, `block:5:8`) or puzzle 17 (`block:0:4`, `block:3:4`). The bath house stands on `block:7:9`, across `x:13`; its drop hangs from `block:7:11`'s pole, so `block:7:9` is not in the district. The feed's pole is on `block:5:10`.
- **Districts used by 1 to 16**, none to be a district again: `block:4:8`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, `block:7:1` + `block:8:1`, `block:3:0` + `block:0:0`, `block:0:4` + `block:0:2`, `block:4:8` + `block:5:8`, and now `block:6:11` + `block:7:11` + `block:8:10`.

## Expected numbers

`npm run analyze puzzles/city/s16-let-it-blow.city.json`:

| | |
| --- | --- |
| States | 77, exhaustive |
| Solvable | yes |
| Fewest clicks | 6 (`br_o`, `br_s`, `br_o`, `br_s`, `br_t`, `repair:infirmary`; the note's order opens `br_s` before closing `br_o`, also 6) |
| Winning click orders | 34 |
| Winning configurations | **1** (`br_o` closed, `br_s` open, `br_t` closed, the child blown, the bulb in) |
| Parts used | bulb (1 of 2; the fuse is a spare) |
| Feed at the shortest win | 13 of 13 |
| Fuses that blow on a shortest win | **`fb_c`**, and no other |
| Fuses that blow on some move | `fb_c`, `fb_m` |
| First moves | `br_o`, `br_s`, `br_t` |
| Dead-end states | 16 of 77 (20.8%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the infirmary's dead bulb |

**No win without the blow** (NB1's criterion 1). The winning configuration is the only one, and the child is blown in it. Checked a second way on a scratch copy with `fb_c` given a rating it cannot reach (999): the analyzer explores all 28 states and reports `solvable: NO`. No breaker or repair takes the foundry off the mother.

Loads, replayed on the conversion: start 13 of 13 (`fb_m` 10 of 10, `fb_c` 5 of 5); `br_o` 11 (`fb_m` 8); `br_s` blows `fb_c`, 6 (`fb_m` 3); `br_s` no change; `br_o` 8 (`fb_m` 5); `br_t` no change; the bulb 13 of 13 (`fb_m` 10 of 10), win.

**The obvious wrong first move:** `br_o`, as the old shed. Read: the bath house, a target, goes dark, and the infirmary's breaker is still red on the mother. It is not a dead end (it is the answer's first click too). Pushed on (`br_t`, the bulb), the mother blows: recovered **by the spare fuse** once `br_t` is open. The dead-end states are the ones with the spare fuse spent in the child, or the mother blown with no fuse left. The check block replays the shed, the early return, the re-blow and the fuse in the child.

**Where it stands against 15:** it reads deeper (7 facts against 6), takes one click more (6 against 5), and has fewer winning click orders (34 against 36). Its share of dead-end states is lower (20.8% against 25.8%), because the wrong blow here has a spare fuse and 15's had none.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_o", "br_s", "br_s", "br_o", "br_t", "repair:infirmary"],
  "traps": [
    { "name": "the old shed, then light the infirmary",
      "moves": ["br_o", "br_t", "repair:infirmary"],
      "expect": { "blown": ["fb_m"], "readable": ["blown-fb_m"], "complete": false },
      "recover": ["br_t", "repair:fb_m", "br_s", "br_s", "br_o", "br_t"] },
    { "name": "put the bath house back with the far breaker still closed",
      "moves": ["br_o", "br_s", "br_o"],
      "expect": { "blown": ["fb_c"], "lit": ["bath_house", "foundry", "homes"], "complete": false },
      "recover": ["br_s", "br_t", "repair:infirmary"] },
    { "name": "fit the spare fuse in the child and it blows again",
      "moves": ["br_o", "br_s", "repair:fb_c"],
      "expect": { "blown": ["fb_c"], "readable": ["blown-fb_c"], "complete": false },
      "recover": ["undo", "br_s", "br_o", "br_t", "repair:infirmary"] },
    { "name": "give the foundry its fuse back",
      "moves": ["br_o", "br_s", "br_s", "br_o", "br_t", "repair:fb_c"],
      "expect": { "lit": ["bath_house", "foundry", "homes"], "complete": false },
      "recover": ["undo", "repair:infirmary"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds the three blocks, the feed's pole at the far left and the infirmary at the far right. The district is about 180 m wide and 60 m deep; the feed's wire is a long run along the bottom.
- The two fuse boxes read as two (the mother on the left block's south street, the child on `z:8`), and each bar can be read.
- The three breakers on and off the square can be told apart: `br_o` at its north-west corner, `br_s` on its north side, `br_t` across `z:8` at the bottom right.
- The foundry and the homes hang from one pole; both drops show.
- The bath house's drop crosses `x:13` (15 m); it reads as hung from the square's corner pole.

## To watch when Josh plays it

- Whether a red breaker reads as something he may throw on purpose at all, after 8 to 15 taught him not to.
- Whether he can tell which box each red names (the fuse label's red, section Y2). This puzzle turns on two reds naming two boxes.
- Whether the bath house's wire reads as one wire with a breaker at each end, and whether "it lands on whichever side is closed" is seen before the throw or found by throwing.
- Whether the foundry relighting from behind reads as the bath house's wire feeding it, or as the blow having failed.
- Whether losing the tribe's homes to the blow is felt as a cost.
- Whether the spare fuse in the kit suggests the blow, or suggests mending it.

## What it taught us
