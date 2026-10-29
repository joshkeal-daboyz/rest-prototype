# 39 · What's left in it — design note

This battery has 4 s in it and won't take more: its charging line is cut, sparking where it leaves the gate. Enoch has one wire. Mending the line looks like the sensible first move, but the wire is the only wire, and something past the relays will need it. The battery's 4 s are enough if the order is right (26's lesson), and only if it is.

**Element under test:** **charge as a budget.** The battery's charge is all the relay time there is, and the one scarce part (a wire) is the only way to buy more. New over 26: no free recharge, and a part that the battery's own window shows is needed elsewhere.

## The map

16 nodes, 17 lines, 2 faults. Feed capacity 2. Enoch brings 2 fuses, **1 wire**.

| Piece | What it is |
| --- | --- |
| `feed` → `j1` → `gate` | Load 1, priority, lit. |
| `j1` → `j_b1` → `j_b2` → `bat` | Battery, capacity 8 s, **charge 4**. Its input line `l_in` is **damaged** (`cut_in`), sparking from the start: it doesn't charge. |
| `j1` → `br_E` (open) → `fb_E` ≤1 → `rl_1` | The feed's way in. |
| `rl_1` | **Relay.** 0 → `mill` (3); 1 → `rl_2`. Inputs: from `fb_E`, and from `j_m`. |
| `rl_2` | **Relay.** 0 → `j_m` (the `forge`, 2, and a line back to `rl_1`); 1 → `sw_p`. Inputs: from `rl_1`, and from `bat`. |
| `sw_p` | **Plain.** 0 → `well` (1); 1 → `shrine` (1, target) by `l_s`, **damaged** (`cut_shrine`), hidden until current reaches it. |

Winning route: `fb_E` → `rl_1` (1) → `rl_2` (1) → `sw_p` (1) → `l_s` (mended) → `shrine`. Load 2 of 2; `fb_E` 1 of 1.

## The intended read

1. The gate is lit. The battery shows 4 of 8 and isn't filling: its line sparks. One wire in the satchel.
2. Click around: `sw_p` moves (plain), so throw it to the shrine now. The two relays don't.
3. Read the battery's road: `bat` → `rl_2` → forge → `rl_1` → mill. `rl_2` is nearest the battery, so it goes last (26).
4. Release. Forge and mill light. Throw `rl_1` (1.5 s), then `rl_2` (3.0 s). The battery now runs `rl_2` → `sw_p` → `l_s`, and **`cut_shrine` sparks**. That's what the wire is for.
5. Close `br_E` (in the window or after). The feed runs up to `cut_shrine`. Mend it with the wire. **Win.** `cut_in` stays broken.

## The trap

**Mending the battery's line first.** It sparks from the opening frame, it's one wire, and a half-empty battery looks like the problem. With the line mended, the battery fills to 8 and the relays are easy, even in the wrong order. Then the feed comes in, `cut_shrine` sparks, and the repair says *needs wire, have 0*. Readable: the spark and the empty satchel. You couldn't see `cut_shrine` beforehand, so the lesson is 21's: don't spend the one part until the battery has shown you what's behind the relays.

**Recovery is Undo, and it works because time isn't undoable.** Undo back past the mend (5 undos on the intended line): the wire comes back, the relays go back to where they were, and the battery **keeps whatever charge it has**. Let it fill before undoing (it's charging while the line is mended), and the redo has a full 8 s. If the player undoes at once, the battery may have only about 3 s left, too little for two clicks at the modelled pace. They can mend again, wait, and undo again. That works, but it's fiddly (see below).

**Wasting the 4 s.** `rl_2` first cuts `rl_1` off. Recovering takes three clicks and the window holds two. The battery goes flat and doesn't refill, and release is refused. Readable: the empty battery and the sparking line. Recoverable the same way: mend the line, let it fill, set the relays, and the shrine's cable will want the wire; undo back past the mend with the battery full. Breaker first blows `fb_E` (culprit `mill`), as in 21, 25 and 26, and the 2 fuses cover it.

## What this map tests

- Whether players hold back the one part when a broken thing is sparking right there, now that the battery is what shows them where it's needed.
- Whether a battery that won't refill makes 26's order feel like it matters.
- **Whether "undo keeps the charge" reads as fair or as a cheat.** Josh's call; see the rule question below.

## Expected numbers

Analyzer not built: time-aware search over the real `createGrid`, a click every 1.5 s, no Undo (method as in 21).

- Nodes 16, lines 17, faults 2 (`cut_in`, `cut_shrine`). Parts given: 2 fuses, 1 wire. Parts needed: the wire, on `cut_shrine`.
- Switches: **2 relays** (`rl_1`, `rl_2`), **1 plain** (`sw_p`).
- Faults readable at start: 1 of 2 (`cut_in`). `cut_shrine` shows when current reaches `l_s`: the battery after both relays, or the feed.
- **Fewest clicks: 6.** `sw_p`, release, `rl_1`, `rl_2`, `br_E`, mend `l_s`. **No waiting**: the starting 4 s is the budget.
- Final load 2 of 2. `fb_E` 1 of 1. Left over: 2 fuses.
- **Winning settings: 1 of 16.**
- Reachable states 2846, winning 3. **Dead ends without Undo: 2783.** Nearly every line of play that mends `cut_in`, or wastes the window, can't win without Undo. By cause: `cut_shrine` unmendable (wire spent on `cut_in`) 2046; that plus `fb_E` blown with no fuse 528; window wasted with the wire still in hand 120; `fb_E` blown, no fuse 68; wire spent on `cut_shrine` from the battery side but the relays not set and the battery flat 15 + 6.
- First moves: `br_E` (blows, recoverable), `sw_p` and release are winnable; **mend `l_in` is a dead end without Undo** (that's the trap).
- Checked by script: the intended line completes with no blow; the battery's window shows `cut_shrine` sparking; mending `cut_in` first ends with *needs wire, have 0*, and filling then undoing past the mend gives back the wire with charge 8, which completes; undoing at once keeps only 3 s, and `rl_2` at 3.0 s is refused; wrong order runs the battery flat with release refused, and the mend, fill, set, undo route completes; stopping the battery early after one relay saves 2.5 s, and a second release still reaches `rl_2`.

## Rule question for Josh (not a change)

39 is recoverable only because Undo leaves charge alone (SCHEMA: "Time is not undoable"). That also makes an exploit legal: mend the battery's line, let it fill, undo the mend, and you have a full battery and the wire back. A player who knows it bypasses the budget. Two ways out, both Josh's call: keep the rule (the exploit is the recovery, and 39 is gentle), or make undoing a repair also take back the charge it let in. The second would make a wasted window here Reset-only, and the map would then need a second way to charge.

## What it taught us

