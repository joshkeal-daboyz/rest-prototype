# Grid puzzle schema (draft 5)

Draft 5 (ticket 015) allows **more than one feed** (powersource) on a map, each with its own `capacity` and an optional display `name`; see [Several powersources](#several-powersources-draft-5). It is additive: every draft 3/4 file means exactly what it did, and `version` is 3, 4 or 5. A file needs `version: 5` only to use a feed `capacity`, a feed `name`, or a second feed.

Draft 4 adds the **battery** node and the **relay** switch (ticket 008), and the optional **spring** flag on switches (ticket 013; no version bump, files without it are unchanged); `version` is 3 or 4. An absent or empty `target` means every lamp.

A puzzle is one JSON file in `puzzles/`. The same graph describes a **map** (the power-routing minigame: a town section seen whole) and a **street** (the later layer where Enoch walks it); `scope` says which. In the 3D game a map file becomes `levels/<name>.grid.json`. Nothing in it refers to 2D drawing except `pos`.

```jsonc
{
  "id": "shrine-circuit",
  "name": "The shrine circuit",
  "version": 3,
  "scope": "map",                   // "map" (the minigame) or "street" (the outer loop, later)
  "capacity": 4,                    // max total lamp load the feed carries; null = unlimited (multi-feed: null, see draft 5)
  "startingParts": ["wire"],        // what Enoch brought; repairs consume these
  "target": ["shrine"],             // lamp ids the priests want lit; all lit + no brownout = win
  "priority": ["street_1"],         // optional: lamps the tribe wishes stayed lit (score, not win)

  "nodes": [
    { "id": "feed",     "type": "feed",     "pos": [0, 0] },
    { "id": "br_main",  "type": "breaker",  "pos": [2, 0], "closed": true },
    { "id": "j1",       "type": "junction", "pos": [4, 0] },
    { "id": "fb_A",     "type": "fusebox",  "pos": [6, 2], "rating": 3 },     // max load it carries
    { "id": "sw_1",     "type": "switch",   "pos": [6, 0], "outputs": ["l_a", "l_b"], "selected": 0 },
    { "id": "shrine",   "type": "lamp",     "pos": [14, 0], "load": 1 }
  ],

  "lines": [
    { "id": "l_a", "from": "sw_1", "to": "j_dead" },
    { "id": "l_b", "from": "sw_1", "to": "j4", "overhead": true }     // overhead: street scope, needs a climb
  ],

  "faults": [
    { "id": "f1", "at": "j_dead", "kind": "dead-junction" },
    { "id": "f2", "at": "l_b",    "kind": "damaged-cable" }
  ],

  "decor": [ { "path": [[14, 4], [16, 5]] } ],   // optional: decorative wires that are NOT grid cables

  // street scope only
  "start": [1, 0], "night": { "minutes": 15 }, "satchel": 4,
  "favor": { "start": 0, "draw": 2, "offer": 1, "reward": 6 }, "lampReach": 5,
  "salvage": [ { "id": "s1", "pos": [8, 3], "part": "bulb" } ],
  "stores": { "pos": [1, 2] }
}
```

## Node types

| type | Conducts | Notes |
| --- | --- | --- |
| `feed` | source | Power originates here. Up to draft 4, exactly one per puzzle and the top-level `capacity` is its limit. Draft 5: one or more; optional `capacity` (number or null, overrides the top level; **required** on every feed when there are two or more) and `name` (screen name, e.g. `"North"`; absent = the id with underscores as spaces). |
| `breaker` | when `closed` | The player toggles it. Cuts everything downstream. Marked by the tribe. |
| `switch` | to `outputs[selected]` only | Sends power down one of two lines leaving it. Marked by the tribe. With `"relay": true` it can only be thrown while current reaches it, and stays where it was thrown after power is lost. With `"spring": true` it returns to its file `selected` whenever no current reaches it (a blown fuse upstream, an open breaker, a battery going flat) and stays thrown only while powered; the tribe marks it with a coiled ribbon. A switch can be both `relay` and `spring`. |
| `battery` | see note | `capacity` (seconds), optional `charge` (default 0), `input` (the line on the feed side). Charges at 1/s while the feed's current reaches it through `input` and it is not released. Click to **release**: it powers every other line at the node for `charge` seconds (draining at 1/s), then goes flat; click again to stop early. A released battery is a time limit, not a load limit: its far side doesn't count toward the feed's capacity unless the feed also reaches it. |
| `fusebox` | unless faulted or overloaded | Takes a fuse. `rating` is the load it carries; more and it blows when powered (a new `blown-fuse` fault). Absent = never blows. |
| `junction` | unless faulted | A split or bend. Can carry a `dead-junction` fault. |
| `lamp` | **leaf** | An endpoint with `load` (default 1). Lit when power reaches it, it has no fault, and the section isn't browned out. Never blocks. |

A node or line with an unrepaired fault does not conduct (except a lamp, which simply stays dark).

## Fault kinds

| kind | at | part | Signature on a live map |
| --- | --- | --- | --- |
| `dead-lamp` | a `lamp` | bulb | Pulses reach the post; the lamp is dark |
| `blown-fuse` | a `fusebox` | fuse | Pulses in, none out |
| `damaged-cable` | a line | wire | Pulses run up to a sparking break and stop. Sparks only while the line is live. |
| `dead-junction` | a `junction` | wire × 2 | Pulses in, none out, no fuse to blame |

Hold times (2 / 3 / 4 / 5 s) are in `FAULT_RULES` for the street layer; in map scope a repair is instant on click.

## Rules the simulator derives (never authored)

- **Every readable fault gives off a signal** (Josh, 27 Oct 2026, ticket 011): a damaged cable sparks (loudest), a dead junction fizzes across its stubs, a blown fuse buzzes, a dead lamp flickers red at the socket. Unreadable faults show nothing. A fault that needs more than one part is drawn with one gap per part. A lamp's brightness scales with its load (2–3× for load 3). This replaces the GDD's Draft line "sparks only on damaged cables".
- **Readable:** a fault is readable only when current reaches it. Everything downstream of an unrepaired blocking fault is dark and gives no information. A dead branch's faults are discovered when a switch or repair brings power to it.
- **Brownout:** if the total `load` of lamps that would be lit exceeds `capacity`, the section browns out: every lamp counts as dark and flickers. Shed load with breakers and switches. Lamps with faults don't count toward load.
- **Fuse load:** the simulator reports each fusebox's live load (`fuseLoad`): the total load of lamps lit by the feed's own flow downstream of it. The renderer draws it as a bar against `rating` (ticket 012).
- **Fuse blow:** when power is applied, a fusebox whose downstream would-be-lit load exceeds its `rating` gains a `blown-fuse` fault. Checked before brownout.
- **Nearer feeder carries the lamp:** current spreads from the feed breadth-first, so a lamp (or any node) reachable through two fuseboxes or both arms of a ring is carried by exactly one path: the one with the fewest hops (lines) from the feed; on a tie, the one the simulator reaches first, since at each node it follows that node's lines in the order of the file's `lines` list. Its load counts toward that fusebox only (for `fuseLoad`, the blow check and `wouldBlow`). Designers depend on this: to put a ring lamp under a given fuse, make that side shorter, or list its line first.
- **Spring switches:** after every settle (including one where a fuse just blew), each `spring` switch that no current reaches (from the feed or a released battery) returns to its file `selected`; if that moves current elsewhere, the settle repeats until no spring switch moves. A return emits `switch:thrown` with `spring: true`, is not an action, and is not an undo step (undo restores positions as before). A powered spring switch stays where the player put it.
- **Would blow again (`wouldBlow`):** for each fusebox with a readable blown fuse, the load it would carry if a fuse were fitted now with nothing else changed, when that exceeds its `rating`; 0 if the new fuse would hold. The hover prompt warns *would blow again: N load on ≤R*; the repair is still allowed (ticket 013).
- **Win:** every `target` lamp lit **by the feed's own flow** and no brownout. A lamp lit only by a released battery is lit for reading and drawing, but never completes the job: the battery's window is for setting a section, not keeping it lit.
- **Battery, derived rules:** the feed's current never passes through a battery to its far side (the battery is a dead end for the feed, so faults on its far side are hidden until it is released). A battery charges only from the feed's own flow, never from another battery. A released battery's far side is free of fuse and brownout checks. A flat battery starts recharging at once if the feed reaches it. Time is not undoable: `undo` leaves charge and released state alone and can move a relay that is now dead; `release` is not an action. `reset` returns every battery to the file's `charge`.

## Several powersources (draft 5)

Ticket 015; the rules below are **Draft**, Josh's to tune after playing. The simulator implements them in 015 part A; until then a multi-feed file validates but does not play. With one feed and no feed `capacity`, every rule reduces to the ones above.

```jsonc
{
  "version": 5,
  "capacity": null,                                   // unused on a multi-feed map; must be null
  "nodes": [
    { "id": "north", "type": "feed", "pos": [0, 0],  "capacity": 2, "name": "North" },
    { "id": "south", "type": "feed", "pos": [0, 10], "capacity": 4, "name": "South" }
    // ...
  ]
}
```

**Validation.** Two or more feeds need `version: 5`, a `capacity` key on every feed (`null` = no limit is allowed beside a limited feed), and a top-level `capacity` of `null`. A feed `capacity` or `name` on any map needs `version: 5`. `capacity` is null or a positive number; `name` a non-empty string. No two feeds may show the same name. A one-feed draft-5 map may give its feed its own `capacity`, which overrides the top level. `puzzleFeeds(puzzle)` (src/core/load.ts) is the one place that resolves each feed's name and limit.

1. **Separate pools.** Each feed is judged against its own `capacity`. Capacities never add into one shared pool.
2. **Nearest feed carries it.** Current spreads breadth-first from **all feeds at once**, seeded in the order the feeds appear in `nodes`. Every powered node and line is carried by exactly one feed: the one with the fewest hops to it; on a tie, the earlier feed in `nodes`, then the file's `lines` order (as in *Nearer feeder carries the lamp*). A lamp's load counts toward that feed only, and toward the fuseboxes on that path only. Where two feeds' flows meet, the meeting line is live and carries no load across. The simulator reports the carrier as `feedOf`.
3. **Brownout per feed, whole section.** A feed is over when the load it carries exceeds its `capacity`. If **any** feed is over, the whole section browns out as before: every lamp flickers, none count as lit.
4. **Fuses** are unchanged: a fusebox's load is the load carried through it, whichever feed it comes from.
5. **Batteries** charge from any feed's flow reaching their `input`. A released battery's far side counts toward no feed and is free of fuse and brownout checks.
6. **Win:** every target lamp lit by some feed's flow (not only a released battery) and no feed over.
7. **Reading, spring switches, relays:** "current reaches it" means any feed or a released battery. A fault can be read from either side; a blown fuse between two feeds shows current in on both sides and none through.
8. **Existing maps** (one feed, no feed `capacity`) behave identically.

**State.** The simulator's `GridState` adds `feeds` (per feed id, in file order: `{ load, capacity, over }`) and `feedOf` (powered id → carrying feed). `load` stays the total; `capacity` becomes the sum of the feeds' limits (null if any is null), a summary only.

**Player-facing words** (src/core/words.ts, tickets 014/017/015): `load` is shown as *LvN Lamp*, `rating` as *LvN Fuse*, `capacity` as *LvN Powersource*. On a multi-feed map a feed is *North · Lv4 Powersource* and a lamp's carrier *Lv2 Lamp · on North*.

## Events

`grid:changed`, `breaker:thrown`, `switch:thrown`, `fuse:blown`, `repair:completed`, `grid:brownout` (entered or cleared; on a multi-feed map it carries `over`, the ids of the feeds over their capacity in file order, empty when cleared, and also fires when that set changes during a brownout; absent on one-feed maps), `battery:released`, `battery:flat`, `job:completed`. `switch:thrown` carries `spring: true` when a spring switch returned on its own. `fuse:blown` carries `load`, `rating`, `culprit` (the lamp the action newly fed, largest load if several, or null) with its `path` from the fuse, and `lamps`: every lamp whose load counted toward `load` when it blew (powered by the feed's flow, downstream of the fusebox, not faulted, load > 0, lamps already lit included), each with its line path from the fuse, in flow discovery order; their loads sum to `load` (ticket 016). Street scope later adds the night events.

## Design checks (ticket 027)

A design note (`puzzles/<id>.md`) may carry one **check block**: a fenced code block tagged `check` holding JSON. It is the designer's claim about the map, made executable. `npm run check puzzles/<id>.json` (027 D1) replays it on the real simulator, and the gate replays every note's block, so a later simulator change that breaks a map fails CI. It lives in the note, not in a `.json` file, because every `.json` in `puzzles/` is loaded as a map. Types, the parser and the validator are in `src/core/check.ts` (`parseCheckBlock`, `validateCheck`, `parseCheckMove`); only the **first** block tagged `check` in a note is read.

````md
```check
{
  "clickSeconds": 1,
  "solution": ["br_street", "sw_1", "repair:l_b"],
  "traps": [
    { "name": "mend the dead junction first",
      "moves": ["repair:j_dead", "wait:2"],
      "expect": { "readable": ["f2"], "complete": false },
      "recover": ["undo", "sw_1", "repair:l_b"] }
  ],
  "sections": [
    { "id": "street", "nodes": ["feed", "br_main", "j1", "br_street", "fb_A", "j2", "street_1", "street_2", "street_3"], "parts": [] },
    { "id": "shrine", "nodes": ["sw_1", "j_dead", "j4", "flood", "j5", "shrine"], "parts": ["wire"] }
  ],
  "links": [
    { "line": "l_sw", "sides": { "street": { "lamp": { "load": 3, "must": true } }, "shrine": { "feed": { "capacity": 4 } } } }
  ]
}
```
````

**Moves** (strings), played in order from the file's start state:

| move | does |
| --- | --- |
| `<id>` | clicks a breaker or switch (throws it), or a battery (releases it, or stops it early) |
| `release:<battery>` | the same as clicking the battery, said plainly |
| `repair:<node or line id>` | repairs the fault there (spends its part). The id must be the `at` of a fault in the file, or a fusebox with a `rating` (a fuse that may blow in play) |
| `wait:<seconds>` | lets time pass (battery charge and drain); a positive number |
| `undo` | the player's undo |

After every click or repair, `clickSeconds` seconds pass (default **1**, the convention the notes use; `wait:` adds no extra time).

**Fields.**
- `solution` (required): the intended moves. Replayed, they must complete the job.
- `traps` (optional): each `{ name, moves, expect, recover }`, all required. `moves` run from the start; `expect` must then hold; then `recover` runs from that state and must complete the job. Names are unique. `expect` names at least one of:
  - `blown`: fuseboxes (with a `rating`) that gained a blown fault during the moves;
  - `brownout`: true or false;
  - `readable`: fault ids readable after the moves: a file fault's `id`, or `blown-<fusebox>` for a fuse that blew in play;
  - `lit`: lamps lit after the moves;
  - `complete`: only `false` (the trap did not win).
- `sections` (optional, for a large map): `{ id, nodes, parts? }`. Every node is in exactly one section. Each section's `parts` (absent = none) is its share of `startingParts`; together they add up to `startingParts` exactly, as multisets.
- `links` (with `sections` only): every line whose two ends are in different sections is listed once, as `{ line, sides }`. `sides` gives a **stub** for each of the two sections it joins, and no other: what that section sees in place of the link when it is analysed on its own (`npm run analyze -- --sections`, 027 D3):
  - `{ "feed": { "capacity": N | null } }`: power comes in here;
  - `{ "lamp": { "load": N, "must": true? } }`: power must leave here, with this load; `must: true` makes it a target of the sub-puzzle;
  - `"cut"`: the link is open for this section.

The validator returns every problem, one message each. The replay (D1) and the sectioned analysis (D3) read the block only after it validates.
