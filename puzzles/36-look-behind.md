# 36 · Look behind it first — design note

The chapel is dark and the priests want it and the well lit. There are three ways to the chapel's hub and every one is broken. The one break you can see from the start costs a single wire, and Enoch has a single wire. Behind it is a junction that needs two.

**Element under test:** the brief's element 3, **faults hide faults**, as a planning problem: a repair that looks cheap reveals one you can't afford, so the player has to look behind a fault before paying for it. A second switch gives a free way to see behind the cheap break from the other side. Supporting: scarce parts (one of each) and a capacity shed.

## The map

14 nodes, 15 lines, 5 faults. Feed capacity 3. Enoch brings a wire, a fuse and a bulb.

| Route to `hub` | Faults on it, in the order current meets them |
| --- | --- |
| Upper: `sw_1` (pos 0) → `l_1a` → `jU` → `hub` | `l_1a` damaged (**visible at start**), then `jU` dead junction (wire × 2, hidden) |
| Lower: `sw_1` (pos 1) → `fb_L` ≤5 → `jM` → `l_m2` → `hub` | `fb_L` blown, then `l_m2` damaged (hidden). `jM` also feeds the `ovens` (2) through `br_ov`. |
| Back: `sw_2` (pos 1) → `jS` → `jU` | Reaches `jU` from the far side. `sw_2`'s other position lights the `homes` (2). |

`hub` → `chapel` (2, **dead lamp**, hidden) and `well` (1). Targets 2 + 1 = 3 = capacity.

## The intended read

1. The map opens with the homes lit (2 of 3) and one spark: `l_1a`, on the upper route, a wire's repair. The chapel and well are dark. Parts: one wire.
2. Don't spend it yet. What is past the spark? Throw `sw_2` to its back line. The homes go dark and current runs to `jU` from the far side: **pulses in, none out, no fuse**: a dead junction, drawn with two broken stubs (wire × 2). The upper route costs three wires and the back route two. Neither is affordable.
3. Throw `sw_1` to the lower route. `fb_L` shows the blown-fuse ✕. Repair it with the fuse. The ovens light (2 of 3) and `l_m2` **sparks**.
4. Repair `l_m2` with the wire. The hub goes live: the well lights, the chapel flickers red at the socket. Load 3 of 3.
5. Open `br_ov`: the ovens go dark (1 of 3). Bulb on the chapel: 3 of 3. **Win.**

## The trap

The spark on `l_1a` is the only fault on the map at the start, it's a wire's repair, and Enoch has exactly one wire. Repair it and current reaches `jU`: a dead junction, *needs wire × 2, have 0*. The lower route then needs a wire for `l_m2` that is already spent: **dead end**. It is readable (the fizzing junction and its two-wire cost; later the `l_m2` spark with no wire in hand), and Undo recovers it.

The fair way through is to look first: `sw_2` costs nothing and shows `jU` from behind. A player who opens the lower route first (fuse, then the `l_m2` spark) also learns the wire is wanted there before spending it. The map rewards either kind of looking and punishes only spending first.

## What this map tests

- Whether "faults hide faults" becomes a reason to scout before paying (GDD review finding 1: deduction, not repair-everything).
- Whether players use a second switch as a free probe (seeing behind a fault from the other side).
- Whether a dead junction's two-wire cost is now read off the map (14-behind-the-first's lesson; ticket 011's two stubs and hover).

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 14. Lines: 15. Faults: 5 (`f_1a`, `f_jU`, `f_fuse`, `f_m2`, `f_chapel`). Parts given: wire, fuse, bulb. Parts needed: all three.
- Faults readable at start: 1 of 5 (`f_1a`). `f_jU` shows behind `f_1a` or from `sw_2`'s back line; `f_fuse` when `sw_1` is thrown; `f_m2` after the fuse; `f_chapel` after `l_m2`.
- Fewest actions to win: **6** (`sw_2`, `sw_1`, repair `fb_L`, repair `l_m2`, open `br_ov`, bulb on `chapel`), in any of 30 orderings.
- Final load: **3 of 3**. `fb_L` carries 3 of 5 at the win (4 of 5 at most, with the ovens still on).
- Winning control settings: **1 of 8** (`sw_1` lower, `sw_2` back line, `br_ov` open).
- Reachable states: 48, of which 16 can't win without Undo; every one is the wire spent on `l_1a`.
- First moves: repairing `l_1a` is the dead end; every throw is safe.

## What it taught us

