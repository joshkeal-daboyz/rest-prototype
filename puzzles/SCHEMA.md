# Grid puzzle schema (draft 2)

A puzzle is one JSON file in `puzzles/`. The same graph describes a **panel** (the inside of one fuse box: the circuit-fixing minigame) and a **street** (fuse boxes, lamps and cables along Lamp Row); `scope` says which. In the 3D game a panel file is what opens when Enoch interacts with a fuse box, and a street file becomes `levels/<name>.grid.json`. Nothing in it refers to 2D drawing except `pos`.

Panel-specific fields (draft 2): `scope: "panel"`, `fusebox.rating` and `lamp.load` (a fuse carrying more load than its rating blows when powered), `probeSeconds` (night time one probe costs), and `fetchSeconds` (the stand-in for walking back to the stall until the street layer exists). In a panel, readability comes from **probing**: a node or line shows current only once the player has probed it, and probing a dead panel shows nothing. In a street, readability comes from the lamp's `lampReach`. Everything else below applies to both.

```jsonc
{
  "id": "lamp-row",                 // file name without extension
  "name": "Lamp Row",
  "version": 2,                     // schema version
  "scope": "street",                // "panel" (the minigame) or "street" (the outer loop)
  "probeSeconds": 3,                // panel: night time one probe costs
  "fetchSeconds": 90,               // panel: night time the "fetch parts" stand-in costs
  "start": [1, 0],                  // where Enoch begins each night
  "night": { "minutes": 15 },       // game-time length of a night
  "satchel": 4,
  "favor": { "start": 0, "draw": 2, "offer": 1, "reward": 6 },
  "lampReach": 5,                   // how far the raised lamp shows current
  "capacity": null,                 // null = unlimited; a number = max lamps lit at once (Draft)

  "nodes": [
    { "id": "feed",         "type": "feed",     "pos": [0, 0] },
    { "id": "breaker_main", "type": "breaker",  "pos": [2, 0], "closed": true },
    { "id": "j1",           "type": "junction", "pos": [6, 0] },
    { "id": "fb_A",         "type": "fusebox",  "pos": [12, 0], "rating": 3 },   // panel: max load it carries
    { "id": "sw_1",         "type": "switch",   "pos": [20, 0], "outputs": ["l_a", "l_b"], "selected": 0 },
    { "id": "lamp_01",      "type": "lamp",     "pos": [6, 2], "load": 1 }       // panel: load on its fuse
  ],

  "lines": [
    { "id": "l1", "from": "feed", "to": "breaker_main" },
    { "id": "l7", "from": "j5", "to": "j6", "overhead": true }   // overhead = needs a climb to repair
  ],

  "faults": [
    { "id": "f1", "at": "lamp_02", "kind": "dead-lamp" },
    { "id": "f2", "at": "fb_A",    "kind": "blown-fuse" },
    { "id": "f3", "at": "l7",      "kind": "damaged-cable" }
  ],

  "salvage": [
    { "id": "s1", "pos": [8, 3],  "part": "bulb" },
    { "id": "s6", "pos": [34, 3], "part": "random" }
  ],

  "stores": { "pos": [1, 2] },      // the offering stall; omit for a puzzle without stores

  "decor": [                        // optional: decorative wires that are NOT grid cables
    { "path": [[14, 4], [16, 5]] }
  ]
}
```

## Node types

| type | Conducts | Notes |
| --- | --- | --- |
| `feed` | source | Exactly one per puzzle. Power originates here. |
| `breaker` | when `closed` | The player toggles it. Cuts everything downstream. Marked by the tribe. |
| `switch` | to `outputs[selected]` only | Sends power down one of its lines. Marked by the tribe. (MVP in the GDD) |
| `fusebox` | unless faulted or overloaded | Takes a fuse. Marked by the tribe. In a panel, `rating` is the load it carries; more than that and it blows again when powered (a new `blown-fuse` fault). |
| `junction` | always | A split or bend in the run. Can carry a `dead-junction` fault (wire × 2). |
| `lamp` | **leaf** | An endpoint. Lit when power reaches it and it has no fault. A dead lamp never blocks the run. |

A node with an unrepaired fault does not conduct (except a lamp, which simply stays dark). A line with an unrepaired fault does not conduct.

## Fault kinds

| kind | at | part | hold (s) | Signature with the lamp raised |
| --- | --- | --- | --- | --- |
| `dead-lamp` | a `lamp` | bulb | 2 | Pulses reach the post; the lamp is dark |
| `blown-fuse` | a `fusebox` | fuse | 3 | Pulses in, none out |
| `damaged-cable` | a line | wire | 4 | Pulses run up to a sparking break and stop. Sparks are visible without the lamp. |
| `dead-junction` | a `junction` | wire × 2 | 5 | Pulses in, none out, no fuse box to blame (MVP) |

Parts: `bulb`, `fuse`, `wire`. `random` in a salvage spot means one of the three, chosen each night.

## Visibility rules the simulator derives (never authored)

- In a **panel**, a node or line shows its state only once **probed** this night, and only while current can reach the probe point (probing a dead panel shows nothing). Probed spots stay shown for the night.
- A fault is **readable** only when current reaches it: the player must see pulses stop. Everything downstream of an unrepaired blocking fault is dark and gives no information.
- `damaged-cable` sparks are visible from anywhere in view, with or without the lamp, so they are the one fault the player can find without reading.
- A repaired lamp that stays dark after the breaker goes on means there is an unfound blocking fault upstream. This is how "hidden" faults are found; the schema has no `hidden` flag.

## Events the simulator emits

Same names as the GDD: `grid:changed`, `repair:completed`, `repair:cancelled`, `breaker:thrown`, `switch:thrown`, `player:shocked`, `job:completed`, and from the night module `night:started`, `night:paused`, `night:dawn`, `night:death`.

## Open points for the first tickets

- Whether `pos` is in metres (so walking time is believable) or grid cells. Start with metres; the 3D level file will replace it anyway.
- `capacity`: count of lit lamps or a per-lamp load? Start with a count; the GDD's capacity design is Draft.
