# The ladder

All 64 maps in one sequence. 01–56 are ranked easiest first; the deep tier 57–64 is appended at the end rather than ranked (see below). The file name's number is the order: `NN-<slug>.json` and its note `NN-<slug>.md`, and the picker lists them in that order. `lamp-row.grid.json` is a street, not a map, and isn't on the ladder.

**How it was ranked (28 Oct 2026).** Each map was brute-forced over the real `createGrid` (battery maps with time: a click is 1 s, a wait 0.5 s). The ranking weighs, in order: fewest clicks to win (a battery release counts as a click), how tight the win is (winning control settings, slack), the share of reachable states that can no longer win without Undo, whether an obvious first move is a dead end, and how many traps or mechanics are in play at once. Battery maps get a little extra for the window. Two rules override the numbers: each element (breaker, switch, capacity, fault, fuse rating, ring, relay, battery) comes in on a gentle map before any map that relies on it, and a map that a note says builds on another comes after it. The reorganization (ticket 018) changed only ids, names, file names and note text. Three maps (13, 22, 38 today) also carry their designers' final revisions (a porch lamp added on 13; capacity 4 to 3 on 22; `fb_L` rating 4 to 5 on 38), which were still uncommitted when the files were renamed.

**Two feeds and Meet in the middle ranked (ticket 029, 29 Oct 2026).** The two maps of ticket 015 (several powersources) were first appended as 55 and 56, unranked, so no file was renumbered. Josh played them and found them easy: "55/56 are EASY those should be moved WAAAYYYY down the ladder." They now sit where the ranking puts them: **05 Two feeds** just after 04 (it needs only capacity and the switch), and **15 Meet in the middle** just after the first ring (14) and after 05. Every map between moved up: old 05–13 by one (to 06–14), old 14–54 by two (to 16–56). 01–04 and 57–64 kept their numbers. Only ids, names, file names and note text changed; the old → new ids are in the ticket 029 table below. Both maps are version 5 and need ticket 015's simulator.

Min clicks for 49 and 54 are from their notes (the search runs out of time on them); the rest are from the search.

| # | Name | What it teaches | Min clicks |
| --- | --- | --- | --- |
| 01 | First light | The breaker | 1 |
| 02 | This way or that | The switch: one line or the other | 2 |
| 03 | Not enough for all | Capacity: choose what goes dark | 1 |
| 04 | The tired feed | Capacity across four branches | 3 |
| 05 | Two feeds | Two powersources: each has its own Lv limit; the total fitting isn't enough | 1 |
| 06 | The spark | A damaged cable, mended with a wire | 3 |
| 07 | Past the fuse | Blown fuse and dead bulb; faults hide faults; shed for capacity | 3 |
| 08 | Where it stops | Read where the current stops; a dead junction costs two wires | 1 |
| 09 | The shrine circuit | Reroute round a repair you can't afford, then capacity | 3 |
| 10 | Around the dead post | Reroute instead of repair, then shed | 4 |
| 11 | The small fuse | Fuse rating: a box over its rating blows | 3 |
| 12 | Which fuse | Move loads between fuses, a chain of two moves; spring switch | 3 |
| 13 | One box, three lamps | A shared fuse: its rating and the feed are two limits | 3 |
| 14 | Ring from the east | Ring main: which end can carry it | 3 |
| 15 | Meet in the middle | Two feeds on one street: the nearer feed (fewest hops) carries the lamp; a long-way switch moves the meeting point | 3 |
| 16 | Behind the first | Faults hide faults; leave the lure | 2 |
| 17 | Count the dark | A dead lamp draws nothing until its bulb goes in | 5 |
| 18 | The long way round | Reroute under scarce parts and two ratings | 5 |
| 19 | Why it blew | A blown fuse has a cause: shed before fitting | 5 |
| 20 | The battery run | Battery and relays: charge, release, throw, let the feed in | 4 |
| 21 | Wake the relay | Relay versus plain switch, one easy window | 4 |
| 22 | Look both ways | One wire: look down both routes before spending | 3 |
| 23 | Make room | Move a load onto a fuse with room | 5 |
| 24 | One wire, two breaks | Two breaks, one wire; the right one is hidden | 4 |
| 25 | Only the relays | Spend a short window only on the relays | 6 |
| 26 | The far one first | Order of throws inside the window | 5 |
| 27 | Switch before breaker | Set the switch before the feed; two blow traps, one spare | 5 |
| 28 | Last light | A whole fuse layout before the fuse goes in | 6 |
| 29 | The open point | Ring: a break left open splits the load | 5 |
| 30 | Which break | Which break gets the wire, decided by ratings | 4 |
| 31 | Leave the ring open | Ring partition and which break, together | 6 |
| 32 | Read it in the window | The battery's window lights hidden faults; spend after reading | 5 |
| 33 | Take the feed out | Release only once the feed is out of the battery's path | 7 |
| 34 | The main fuse | Nested fuses: a main fuse over two sub-fuses | 6 |
| 35 | By cell light | The cell shows hidden breaks on a ring; one wire | 5 |
| 36 | Set it in the dark | Order of throws: set downstream switches before current | 7 |
| 37 | Spend the fuse first | Faults hide faults as a spending order | 5 |
| 38 | Look behind it first | Look behind a cheap fault before paying for it | 6 |
| 39 | What's left in it | Battery charge as a budget; one wire | 6 |
| 40 | The priests' list | Several targets, capacity; homes go dark by routing | 8 |
| 41 | Room to charge | Shed load on a full fuse to charge the battery | 8 |
| 42 | Two windows | Two windows with a recharge between | 8 |
| 43 | The fuse above the fuse | Nested fuses: the child has room, the parent doesn't | 8 |
| 44 | Set in the light | Relays without a battery: shed before the relay goes live | 9 |
| 45 | Relays only move live | Relay order under ratings; a dead lamp as the only shed | 10 |
| 46 | Read it from behind | Read a hidden fault from its far side | 7 |
| 47 | The open point | Ring: set the open point before closing the ring | 7 |
| 48 | The old arrangement | Which fuse as a full re-plan | 9 |
| 49 | Two cells | Two cells; one charges only while a section is shed | 11 |
| 50 | The whole quarter | Synthesis: relay-fed ring, open point left broken | 10 |
| 51 | Thrown twice | Relays as a ring's open points; one throw order fits the window | 7 |
| 52 | One wire short | More breaks than wires; deduce from the map's shape | 9 |
| 53 | Reach it from behind | Borrow another fuse's headroom to set relays | 11 |
| 54 | The whole circuit | Battery capstone: two cells, a ring of relays, a hidden fault | 12 |
| 55 | Leave it blown | The ring's open point is a blown fuse: leave it | 12 |
| 56 | The whole ward | Capstone: main fuse equals capacity; the order targets are lit | 13 |
| 57 | The back door | Deep, 3 layers: the relay's front way blows; a back door with a hidden break; shut it again | 5 |
| 58 | Keep it live | Deep, 4 layers: a spring set through the back door; a break behind it; the front way must hold it before the back door lets go | 5 |
| 59 | Move the meeting | Deep, 4 layers, two feeds: shorten one feed's route so it carries the borrow; the short way is broken | 4 |
| 60 | Hold the spring | Deep, 5 layers: shed to charge; wire by cell light; throw the spring; the feed takes it before the window ends | 6 |
| 61 | Charge it first | Deep, 5 layers: borrow to set the charging relay; charge; walk two relays; feed in; a dead bulb | 8 |
| 62 | Two springs, one window | Deep, 5 layers: two springs in series; two hidden breaks; the feed comes in after the second spring | 8 |
| 63 | Keep the wire | Deep, 5 layers, two feeds: charge the cell from the free side; keep the one wire for the break the window shows | 6 |
| 64 | The whole chain | Deep capstone, 7 layers, two feeds: shed to charge, the shed shows a break, the mend moves a lamp onto the other feed's side; relay, spring, hand-over, bulb | 9 |

**57–64, the deep tier (28 Oct 2026)** are appended, not ranked, and nothing is renumbered. Josh found the ladder too easy and asked for puzzles several layers deep: each fix unlocks the next problem, the obvious first move is a trap, and the next layer's answer only shows once the one before is solved. The tier ramps from 3 layers (57) to 7 (64), using only mechanics already in the game (relays, springs, batteries, fuse ratings, hidden faults, two feeds and the nearer-feeder rule). Min clicks are lower than the late ladder's on purpose: the depth is in the forced order (every map has one essential order; 59 and 63 have exactly one winning click sequence), not in the count. Each note lists its layers, its trap, the fewest clicks, the number of winning click orders and the share of dead-end states, from a brute-force search over the real `createGrid` (battery maps: a click is 1 s, a wait 0.5 s; every window also fits at 1.5 s a click). 59, 63 and 64 are version 5 (two feeds); the rest are version 4.

## Old id → new id

Ticket 018's table, as written. Ticket 029 renumbered most of them again: for today's id, look the "new id" up in the ticket 029 table below.

| Old id | New id |
| --- | --- |
| `ladder-01-first-light` | `01-first-light` |
| `ladder-02-this-way-or-that` | `02-this-way-or-that` |
| `not-enough-for-all` | `03-not-enough-for-all` |
| `ladder-03-the-tired-feed` | `04-the-tired-feed` |
| `ladder-04-the-spark` | `05-the-spark` |
| `ladder-10-past-the-fuse` | `06-past-the-fuse` |
| `where-it-stops` | `07-where-it-stops` |
| `shrine-circuit` | `08-shrine-circuit` |
| `ladder-06-around-the-dead-post` | `09-around-the-dead-post` |
| `ladder-05-the-small-fuse` | `10-the-small-fuse` |
| `which-fuse` | `11-which-fuse` |
| `ladder-11-one-box-three-lamps` | `12-one-box-three-lamps` |
| `ladder-13-ring-from-the-east` | `13-ring-from-the-east` |
| `behind-the-first` | `14-behind-the-first` |
| `ladder-15-count-the-dark` | `15-count-the-dark` |
| `ladder-17-the-long-way-round` | `16-the-long-way-round` |
| `ladder-08-why-it-blew` | `17-why-it-blew` |
| `battery-run` | `18-battery-run` |
| `battery-01-wake-the-relay` (B01) | `19-wake-the-relay` |
| `ladder-12-look-both-ways` | `20-look-both-ways` |
| `ladder-07-make-room` | `21-make-room` |
| `ladder-19-one-wire` | `22-one-wire` |
| `battery-02-only-the-relays` (B02) | `23-only-the-relays` |
| `battery-03-far-one-first` (B03) | `24-far-one-first` |
| `ladder-16-switch-before-breaker` | `25-switch-before-breaker` |
| `ladder-09-last-light` | `26-last-light` |
| `ladder-28-open-point` | `27-open-point` |
| `ladder-14-which-break` | `28-which-break` |
| `ladder-18-leave-the-ring-open` | `29-leave-the-ring-open` |
| `battery-06-read-it-in-the-window` (B06) | `30-read-it-in-the-window` |
| `battery-08-take-the-feed-out` (B08) | `31-take-the-feed-out` |
| `ladder-21-main-fuse` | `32-main-fuse` |
| `battery-10-cell-light` (B10) | `33-cell-light` |
| `ladder-30-set-it-dark` | `34-set-it-dark` |
| `ladder-20-spend-the-fuse-first` | `35-spend-the-fuse-first` |
| `ladder-29-look-behind` | `36-look-behind` |
| `battery-04-what-is-left` (B04) | `37-what-is-left` |
| `ladder-24-the-priests-list` | `38-the-priests-list` |
| `battery-05-room-to-charge` (B05) | `39-room-to-charge` |
| `battery-07-two-windows` (B07) | `40-two-windows` |
| `ladder-31-parent-fuse` | `41-parent-fuse` |
| `ladder-25-set-in-the-light` | `42-set-in-the-light` |
| `ladder-33-live-relays` | `43-live-relays` |
| `ladder-23-read-it-from-behind` | `44-read-it-from-behind` |
| `ladder-22-open-point` | `45-open-point` |
| `ladder-26-the-old-arrangement` | `46-the-old-arrangement` |
| `battery-09-two-cells` (B09) | `47-two-cells` |
| `ladder-27-the-whole-quarter` | `48-the-whole-quarter` |
| `battery-11-thrown-twice` (B11) | `49-thrown-twice` |
| `ladder-32-wire-short` | `50-wire-short` |
| `ladder-34-from-behind` | `51-from-behind` |
| `battery-12-the-whole-circuit` (B12) | `52-the-whole-circuit` |
| `ladder-35-leave-it-blown` | `53-leave-it-blown` |
| `ladder-36-whole-ward` | `54-whole-ward` |
| (new, ticket 015) | `55-two-feeds` |
| (new, ticket 015) | `56-meet-in-the-middle` |

## Ticket 029: old id → new id

The ids before ticket 029 (29 Oct 2026), and today's. 52 maps renamed; 01–04 and 57–64 unchanged. An old `?puzzle=` link with an old id opens map 01, as any unknown id does.

| Old id | New id |
| --- | --- |
| `01-first-light` … `04-the-tired-feed` | unchanged |
| `55-two-feeds` | `05-two-feeds` |
| `05-the-spark` | `06-the-spark` |
| `06-past-the-fuse` | `07-past-the-fuse` |
| `07-where-it-stops` | `08-where-it-stops` |
| `08-shrine-circuit` | `09-shrine-circuit` |
| `09-around-the-dead-post` | `10-around-the-dead-post` |
| `10-the-small-fuse` | `11-the-small-fuse` |
| `11-which-fuse` | `12-which-fuse` |
| `12-one-box-three-lamps` | `13-one-box-three-lamps` |
| `13-ring-from-the-east` | `14-ring-from-the-east` |
| `56-meet-in-the-middle` | `15-meet-in-the-middle` |
| `14-behind-the-first` | `16-behind-the-first` |
| `15-count-the-dark` | `17-count-the-dark` |
| `16-the-long-way-round` | `18-the-long-way-round` |
| `17-why-it-blew` | `19-why-it-blew` |
| `18-battery-run` | `20-battery-run` |
| `19-wake-the-relay` | `21-wake-the-relay` |
| `20-look-both-ways` | `22-look-both-ways` |
| `21-make-room` | `23-make-room` |
| `22-one-wire` | `24-one-wire` |
| `23-only-the-relays` | `25-only-the-relays` |
| `24-far-one-first` | `26-far-one-first` |
| `25-switch-before-breaker` | `27-switch-before-breaker` |
| `26-last-light` | `28-last-light` |
| `27-open-point` | `29-open-point` |
| `28-which-break` | `30-which-break` |
| `29-leave-the-ring-open` | `31-leave-the-ring-open` |
| `30-read-it-in-the-window` | `32-read-it-in-the-window` |
| `31-take-the-feed-out` | `33-take-the-feed-out` |
| `32-main-fuse` | `34-main-fuse` |
| `33-cell-light` | `35-cell-light` |
| `34-set-it-dark` | `36-set-it-dark` |
| `35-spend-the-fuse-first` | `37-spend-the-fuse-first` |
| `36-look-behind` | `38-look-behind` |
| `37-what-is-left` | `39-what-is-left` |
| `38-the-priests-list` | `40-the-priests-list` |
| `39-room-to-charge` | `41-room-to-charge` |
| `40-two-windows` | `42-two-windows` |
| `41-parent-fuse` | `43-parent-fuse` |
| `42-set-in-the-light` | `44-set-in-the-light` |
| `43-live-relays` | `45-live-relays` |
| `44-read-it-from-behind` | `46-read-it-from-behind` |
| `45-open-point` | `47-open-point` |
| `46-the-old-arrangement` | `48-the-old-arrangement` |
| `47-two-cells` | `49-two-cells` |
| `48-the-whole-quarter` | `50-the-whole-quarter` |
| `49-thrown-twice` | `51-thrown-twice` |
| `50-wire-short` | `52-wire-short` |
| `51-from-behind` | `53-from-behind` |
| `52-the-whole-circuit` | `54-the-whole-circuit` |
| `53-leave-it-blown` | `55-leave-it-blown` |
| `54-whole-ward` | `56-whole-ward` |
| `57-the-back-door` … `64-the-whole-chain` | unchanged |
