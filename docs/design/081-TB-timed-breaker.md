# 081 TB · The timed breaker: the rule and why (lead-architect, 26 Nov 2026)

**Approved (G1) 26 Nov 2026**, on cards: "Approve (Recommended)"; TB-Q1 "Real seconds (Recommended)", TB-Q2 "Breaker, on/off (Recommended)", TB-Q3 "Clock only (Recommended)", TB-Q4 "In 16-20 (Recommended)". The criteria are in `tickets/081-puzzles-on-the-city.md`, section TB.

Josh, 26 Nov 2026, in chat: "I want to add another puzzle piece. I want to add a timed breaker I think it would add an interesting twist to a puzzle if a timer powered different sections at different times and you had to work between them." (His correction, the same day: "Add an interesting twist", for "10 interesting twist".)

## 1. How time works today (read at `main` c77066c)

- **One clock, real seconds.** `Grid.advance(dt)` is the simulator's only time input. `src/play/play.ts`'s `tick(dt)` calls it every frame. Only the battery uses it: it charges at 1/s while live, and drains at 1/s once released. On a map without a battery, `advance` returns at once.
- **Time is not undoable.** Undo leaves a battery's charge and its released flag alone (SCHEMA, "Battery, derived rules").
- **The check and the analyzer model time the same way.** After every click, `clickSeconds` pass (default 1). The check block has `wait:<seconds>`, and the analyzer's `wait` move is 0.5 s. The analyzer's state key leaves out the elapsed time, because "nothing but a battery's charge depends on it". Waits are offered only on battery maps.
- **The relay and the spring are time-free.** A relay can be thrown only while current reaches it. A spring falls back whenever no current reaches it. Both are settle rules, not clocks.
- **`src/night/` does not exist.** The night clock is deferred to the street layer (brief: "No night clock, shocks or walking in this scope"). The timed breaker is not a night clock.

## 2. The proposed rule, in short

A timed breaker is a **breaker that a clock throws, never the player**. It is closed for `closed` seconds, then open for `open` seconds, and repeats. It runs on the battery's clock (real seconds through `advance`), which starts at the player's first move. Two timed breakers out of phase feed two sections in turn, and the player works in each section while its window is open.

What makes it a puzzle comes from the rules that already exist, which now become rules about *when*:

| Existing rule | Past a timed breaker, it becomes |
| --- | --- |
| A fault is read only while current reaches it, and mended only while readable | You can read and mend a section's faults only during its window |
| A relay is thrown only while live | A relay can be set only inside its window, and keeps that setting after the window closes |
| A spring falls back when unpowered | A spring falls back each time the window closes, unless another road holds it first |
| A battery charges only from the feed's live flow | It charges only during the window. Released, it carries a section through the closed part of the cycle |
| A fuse over its rating blows when powered | A flip that powers too much load blows the fuse, with no click to blame. The numbers show it in red before it happens |
| Capacity: over it, brownout | One flip can brown the section out, and the next can clear it |
| Win: every target lit, no brownout | Judged at every moment, flips included. A target that only a window feeds can be part of the win, at that moment |

## 3. Why real seconds (Q1's recommendation)

- **It is one clock.** The battery already runs on real seconds. A step-per-move timer would give a map with both pieces two clocks that disagree, and puzzles 19 to 25 plan batteries.
- **The tools already handle it.** The check's `wait:`, the analyzer's `wait` move and `--click-seconds` already model real time. The cost is in the analyzer: its state key gains the clock's phase. The validator caps the map's whole cycle at 60 s, so the state count grows at most 120 times.
- **The risk is reflexes.** A puzzle about thinking must not become one about speed. Three guards:
  - the clock starts at the first move, so reading the map is free;
  - the schedule is on screen, and the coming flip's change is shown before it happens;
  - each series puzzle must still win when the analyzer is run with `--click-seconds 3`, a slow player, in the same fewest clicks.
- **The other option**, one step per move, is turn-based and lets Undo rewind the clock. It needs a "Wait" control in `src/play/` and `src/ui/`, and leaves the battery on a second clock.

## 4. A worked example (TB6's trial, as an idea; the designer lays its own)

There are two blocks, A and B, and one feed. `tb_A` (closed 6, open 6, offset 0) feeds block A, and `tb_B` (closed 6, open 6, offset 6) feeds block B, so exactly one block is live at any time. The target is in B, behind a damaged cable. The relay that routes B's line to the target sits in A's section. The one wire must be spent in B.

- **The read.** In A's window, set the relay while it is live. Then wait. In B's window, the spark shows on B's line; mend it, and B's target lights while `tb_B` is closed. That is the win.
- **The trap.** Mending first, in B's window, lights nothing, because the relay still points away. The relay can't be thrown until A's window comes round again. That costs a wait, not a dead end (the band for 16 to 25: "recoverable by a part or a wait").

## 5. What this does not touch

- **No GDD Decided rule changes.** Each one holds as worded:
  - *Breakers conduct unless faulted, and a breaker cuts everything downstream.* A closed timed breaker conducts; an open one cuts.
  - *Faults hide faults.* Nothing past an open timed breaker reads, and section V's numbers keep `known` as they do today.
  - *The Relight can't be interrupted.* The clock stops at the win.

  The GDD's "Breakers and switches" table is Draft, and the GDD is not reworded for the minigame (Josh, 25 Nov 2026, question 20). The night's 15 minutes (Decided, 07) belong to the street layer and are not touched.
- **No city grammar rule or number.** On the city, a timed breaker is placed as a breaker: the same pole need (2), the branch-pole rule and W1's rules. So no `pipeline-designer` pre-check.
- **No new dependency.**
