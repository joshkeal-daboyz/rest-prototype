# The ladder

All 54 maps in one sequence, easiest first. The file name's number is the order: `NN-<slug>.json` and its note `NN-<slug>.md`, and the picker lists them in that order. `lamp-row.grid.json` is a street, not a map, and isn't on the ladder.

**How it was ranked (28 Oct 2026).** Each map was brute-forced over the real `createGrid` (battery maps with time: a click is 1 s, a wait 0.5 s). The ranking weighs, in order: fewest clicks to win (a battery release counts as a click), how tight the win is (winning control settings, slack), the share of reachable states that can no longer win without Undo, whether an obvious first move is a dead end, and how many traps or mechanics are in play at once. Battery maps get a little extra for the window. Two rules override the numbers: each element (breaker, switch, capacity, fault, fuse rating, ring, relay, battery) comes in on a gentle map before any map that relies on it, and a map that a note says builds on another comes after it. The reorganization changed only ids, names, file names and note text. Three maps (12, 20, 36) also carry their designers' final revisions (a porch lamp added on 12; capacity 4 to 3 on 20; `fb_L` rating 4 to 5 on 36), which were still uncommitted when the files were renamed.

Min clicks for 47 and 52 are from their notes (the search runs out of time on them); the rest are from the search.

| # | Name | What it teaches | Min clicks |
| --- | --- | --- | --- |
| 01 | First light | The breaker | 1 |
| 02 | This way or that | The switch: one line or the other | 2 |
| 03 | Not enough for all | Capacity: choose what goes dark | 1 |
| 04 | The tired feed | Capacity across four branches | 3 |
| 05 | The spark | A damaged cable, mended with a wire | 3 |
| 06 | Past the fuse | Blown fuse and dead bulb; faults hide faults; shed for capacity | 3 |
| 07 | Where it stops | Read where the current stops; a dead junction costs two wires | 1 |
| 08 | The shrine circuit | Reroute round a repair you can't afford, then capacity | 3 |
| 09 | Around the dead post | Reroute instead of repair, then shed | 4 |
| 10 | The small fuse | Fuse rating: a box over its rating blows | 3 |
| 11 | Which fuse | Move loads between fuses, a chain of two moves; spring switch | 3 |
| 12 | One box, three lamps | A shared fuse: its rating and the feed are two limits | 3 |
| 13 | Ring from the east | Ring main: which end can carry it | 3 |
| 14 | Behind the first | Faults hide faults; leave the lure | 2 |
| 15 | Count the dark | A dead lamp draws nothing until its bulb goes in | 5 |
| 16 | The long way round | Reroute under scarce parts and two ratings | 5 |
| 17 | Why it blew | A blown fuse has a cause: shed before fitting | 5 |
| 18 | The battery run | Battery and relays: charge, release, throw, let the feed in | 4 |
| 19 | Wake the relay | Relay versus plain switch, one easy window | 4 |
| 20 | Look both ways | One wire: look down both routes before spending | 3 |
| 21 | Make room | Move a load onto a fuse with room | 5 |
| 22 | One wire, two breaks | Two breaks, one wire; the right one is hidden | 4 |
| 23 | Only the relays | Spend a short window only on the relays | 6 |
| 24 | The far one first | Order of throws inside the window | 5 |
| 25 | Switch before breaker | Set the switch before the feed; two blow traps, one spare | 5 |
| 26 | Last light | A whole fuse layout before the fuse goes in | 6 |
| 27 | The open point | Ring: a break left open splits the load | 5 |
| 28 | Which break | Which break gets the wire, decided by ratings | 4 |
| 29 | Leave the ring open | Ring partition and which break, together | 6 |
| 30 | Read it in the window | The battery's window lights hidden faults; spend after reading | 5 |
| 31 | Take the feed out | Release only once the feed is out of the battery's path | 7 |
| 32 | The main fuse | Nested fuses: a main fuse over two sub-fuses | 6 |
| 33 | By cell light | The cell shows hidden breaks on a ring; one wire | 5 |
| 34 | Set it in the dark | Order of throws: set downstream switches before current | 7 |
| 35 | Spend the fuse first | Faults hide faults as a spending order | 5 |
| 36 | Look behind it first | Look behind a cheap fault before paying for it | 6 |
| 37 | What's left in it | Battery charge as a budget; one wire | 6 |
| 38 | The priests' list | Several targets, capacity; homes go dark by routing | 8 |
| 39 | Room to charge | Shed load on a full fuse to charge the battery | 8 |
| 40 | Two windows | Two windows with a recharge between | 8 |
| 41 | The fuse above the fuse | Nested fuses: the child has room, the parent doesn't | 8 |
| 42 | Set in the light | Relays without a battery: shed before the relay goes live | 9 |
| 43 | Relays only move live | Relay order under ratings; a dead lamp as the only shed | 10 |
| 44 | Read it from behind | Read a hidden fault from its far side | 7 |
| 45 | The open point | Ring: set the open point before closing the ring | 7 |
| 46 | The old arrangement | Which fuse as a full re-plan | 9 |
| 47 | Two cells | Two cells; one charges only while a section is shed | 11 |
| 48 | The whole quarter | Synthesis: relay-fed ring, open point left broken | 10 |
| 49 | Thrown twice | Relays as a ring's open points; one throw order fits the window | 7 |
| 50 | One wire short | More breaks than wires; deduce from the map's shape | 9 |
| 51 | Reach it from behind | Borrow another fuse's headroom to set relays | 11 |
| 52 | The whole circuit | Battery capstone: two cells, a ring of relays, a hidden fault | 12 |
| 53 | Leave it blown | The ring's open point is a blown fuse: leave it | 12 |
| 54 | The whole ward | Capstone: main fuse equals capacity; the order targets are lit | 13 |

## Old id → new id

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
