# Grid puzzle schema (draft 3)

A puzzle is one JSON file in `puzzles/`. The same graph describes a **map** (the power-routing minigame: a town section seen whole) and a **street** (the later layer where Enoch walks it); `scope` says which. In the 3D game a map file becomes `levels/<name>.grid.json`. Nothing in it refers to 2D drawing except `pos`.

```jsonc
{
  "id": "shrine-circuit",
  "name": "The shrine circuit",
  "version": 3,
  "scope": "map",                   // "map" (the minigame) or "street" (the outer loop, later)
  "capacity": 4,                    // max total lamp load the feed carries; null = unlimited
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
| `feed` | source | Exactly one per puzzle. Power originates here; `capacity` is its limit. |
| `breaker` | when `closed` | The player toggles it. Cuts everything downstream. Marked by the tribe. |
| `switch` | to `outputs[selected]` only | Sends power down one of two lines leaving it. Marked by the tribe. |
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

- **Readable:** a fault is readable only when current reaches it. Everything downstream of an unrepaired blocking fault is dark and gives no information. A dead branch's faults are discovered when a switch or repair brings power to it.
- **Brownout:** if the total `load` of lamps that would be lit exceeds `capacity`, the section browns out: every lamp counts as dark and flickers. Shed load with breakers and switches. Lamps with faults don't count toward load.
- **Fuse blow:** when power is applied, a fusebox whose downstream would-be-lit load exceeds its `rating` gains a `blown-fuse` fault. Checked before brownout.
- **Win:** every `target` lamp lit and no brownout.

## Events

`grid:changed`, `breaker:thrown`, `switch:thrown`, `fuse:blown`, `repair:completed`, `grid:brownout` (entered or cleared), `job:completed`. Street scope later adds the night events.
