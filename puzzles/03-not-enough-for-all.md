# 03 · Not enough for all — design note

Nothing is broken. The feed is failing: it carries 4, and the square asks for 6. The priests want the shrine lit tonight. Something has to go dark.

**Element under test:** capacity as a choice. Everything works; capacity covers some pairs of the three branches and not others. The player chooses which to shed, and the target decides which choice is right.

## The intended read

The map opens with all three breakers closed and the whole section **browned out**: every lamp flickers, load 6 of 4. No faults, no parts. Three branches leave the hub `j0`, each behind its own breaker:

| Branch | Breaker | Lamps | Load |
| --- | --- | --- | --- |
| A, the shrine | `br_A` | shrine (2, target), lantern (1) | 3 |
| B, the homes | `br_B` | home_1, home_2 (priority) | 2 |
| C, the market | `br_C` | market | 1 |

Pairs: A + B = 5 (too much), A + C = 4 (fits), B + C = 3 (fits).

1. Count. The shrine's branch must stay on (it is the target), and 3 + 2 is over, 3 + 1 fits.
2. Throw `br_B`. The homes go dark. Load 4 of 4: the shrine, the lantern and the market light. **Win.**

## The trap

Two wrong instincts, both natural. Shed the heaviest branch (`br_A`, load 3): the brownout clears and the homes and market light, but the shrine is on that branch and stays dark. Shed the least valued branch to protect the tribe's homes (`br_C`, the market): load 5, still a brownout. The only answer the arithmetic and the target allow is to darken the homes, the priority lamps; restraint has a price and the player has to choose to pay it.

## What this map tests

- Whether capacity produces a real choice and whether brownout reads clearly (brief, question 2; GDD review, finding 1, *capacity, small*).
- Whether "brownout cleared but target dark" reads as *not done* rather than as *done*.
- Whether darkening priority lamps on purpose lands as a choice (restraint) or as a punishment.

## Expected numbers (by hand; the analyzer isn't built yet)

- Nodes: 12. Faults: 0. Parts given: none. Parts needed: none.
- Faults readable at start: 0 of 0. Load at start 6 of 4: brownout.
- Fewest actions to win: 1 (throw `br_B`).
- Final load: 4 of 4. No fuses.
- Winning configurations: 2 of the 8 breaker settings: `br_B` off (load 4, market lit), or `br_B` and `br_C` off (load 3, market dark). The first is strictly better: one action, one more lamp.

Checked against the real simulator (`createGrid`): brownout at 6 at start, the one-throw win at 4 of 4, shedding `br_A` clears the brownout without completing, shedding `br_C` stays browned out, and a brute-force pass over all 8 breaker settings finds exactly the 2 winners above.

## What it taught us

*(Josh's verdict goes here, in his words.)*
