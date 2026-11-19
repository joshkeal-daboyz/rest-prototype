ticket: 057a-frontage
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A of 057: measure each stack piece's real wall plane from the GLB (`WALL_FRONT_M`), let `assembleStack` line pieces up on that plane (`align: "wall"`, default `"back"`), have the tile city pack with `"wall"`, and add check G1 (`frontage.ts`). G1 holds that no street-level wall stands behind the pavement's back edge, and it must fail on today's back-aligned packing. All of this serves Josh's 18 Nov ruling: "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."

## Does the branch do it?
This is round 2. I reviewed `2bfbebc` against round 1's `7dc79de`, and the whole branch against `8724149` (goal/city-style). Round 2 touches five files: `facade.ts`, `facade.test.ts`, `frontage.ts`, `frontage.test.ts`, and one comment in `tilecity.ts`. All are inside A's Files.

Checks I ran:
- `facade.test.ts` and `frontage.test.ts` on the gate worktree: 29 passed, 1 skipped. The real-GLB test now reports as a skip, not a pass.
- The caller's gate: tsc clean, 2305 passed, 8 skipped.
- My own re-measure of every base key on `D:\rest-prototype-main\assets\private\out\city-pack.glb`, using the branch's `measureWallPlane` plus my own plane listing (lowest and highest y, share of the width).

**Round 1 Must fix 1, the wall is the face that meets the pavement: closed.**
- **The ground rule.** `measureWallPlane(…, rule)` takes `"ground"` or `"floor"`. Under `"ground"` it skips any plane whose lowest vertex is above `WALL_GROUND_Y_M` (0.3 m), and its reach is `WALL_REACH_M` (0.6 m). Floor pieces keep round 1's rule through `WALL_FLOOR_REACH_M` (0.5 m), so OfficeOld floors stay at 0.
- **The re-pinned values reproduce on the GLB** under the ground rule:
  - Shop_01 0.219: the frame, y 0 to 2.12, 0.89 of the width. Not the 0.004 sign band.
  - Shop_04 0.557: y 0 to 0.9, 0.93 of the width.
  - Shop_06 0.520: the piers, y 0 to 2.43, 0.97 of the width. Not the 0.377 fascia.
  - Door_01 0.529: the full-width wall, 6.34 m², 0.98 of the width.
  - Shop_02, Shop_03, Shop_05, Door_02, both corners (front and side) and the apartments are unchanged.
- **The typed-in mesh test** "a sign band at the front bound loses to a shopfront that reaches the ground…" is the fixture I asked for. It also checks that a sign alone gives null under `"ground"` and is still taken under `"floor"`. "reaches 0.6 m for a ground piece and 0.5 m for a floor piece" pins both reaches at the edge.
- **The real-GLB `it`** reads the measuring rule from the recipes (a key that is a base anywhere is measured by `"ground"`). It uses `ctx.skip()` when the GLB is absent. This also closes round 1's Could improve 1.

**My re-measure: no street-level piece stands recessed behind the edge.**
- Every terrace base key (Shop_01 to 06, Door_01/02, Shop_Corner_01/02 front and open side) aligns on a plane that reaches the ground, is at least 0.97 m², and spans 0.89 to 0.98 of the piece's width.
- With that plane on the pavement's back edge, the frontmost face that meets the pavement stands between 0 and 0.529 m onto the pavement.
- The faces still behind the edge are set-back parts of the front, not a gap with nothing in it:
  - Door_01's door recess at 0.758 m behind the bound (0.80 of the width);
  - Shop_06's shop glass at 0.789 m (9.08 m²), between piers that stand on the edge;
  - Shop_02's glazing at 0.570 m.
  
  Putting Shop_06's glass on the edge would push its piers 0.79 m onto the pavement, past any reach in the ticket. I think the piers are the right choice, but Josh should see Shop_06 (Could improve 1).

**Criterion 1, measured wall planes: meets.** The pin test holds the new table. The coverage test and the real-GLB re-measure are as above. `facade.ts` stays pure (type imports from `../core` and `./models` only). Its header comment now gives the shops' interior offsets correctly (Shop_03 2.60), which closes round 1's Could improve 3.

**Criterion 2, aligned on the wall: meets.** `stacks.ts` and `terrace.ts` did not change in round 2, so round 1's reasoning stands. With the new numbers, `stacks.test.ts`, `terrace.test.ts` and `tilecity.test.ts` still pass in the gate, far-gap floors included.

**Criterion 3, G1: meets, and is now independent of the table.**
- `frontageMetrics` takes an optional `FaceOffset`. The default stays `wallOffset`, so production behaviour is unchanged.
- `frontage.test.ts` pins `GROUND_FACE_M`: the frontmost face of at least 0.5 m² that reaches y ≤ 0.3 m, per ground key. All ten keys' values reproduce on my run, including Door_01's 0, Door_02's 0.005 and Corner_01's 0.073 front and 0.188 side.
- On every city in the criterion's range, the test asserts zero recessed pieces and `wallMax_m ≤ OVERLAP_MAX_M + tol` against this pin.
- "the independent pin fails a packing aligned on a face that is not the one at the pavement" moves Shop_01 bases back to the old sign-band alignment. Under the pin they then come out recessed by exactly 0.215 m. So G1 now catches the failure round 1 found, which the self-referencing table could not.
- The back-aligned failing fixture is kept.

**The overlap deviation.** `OVERLAP_MAX_M` and `WALL_REACH_M` were raised from the ticket's 0.5 m to 0.6 m.
- It is named in `facade.ts` ("the ticket's 0.5 m became 0.6 m after the 057 A review"), in `frontage.ts`, and in the test names.
- "reports how far the buildings overlap…" asserts that the largest front bound onto the pavement is Shop_04's 0.557 m on every city in range. That matches the largest ground-piece offset in the table among terrace keys.
- It is not in the ticket. The builder may not edit tickets, and the ticket's open question 4 (line 410) still says 0.5 m by default. The main session must put this to Josh (see Rule conflicts).

## Rule conflicts and risks
- **A deviation for Josh.** The ticket sets `OVERLAP_MAX_M = 0.5` (constants, line 393; open question 4, default 0.5 m), and the branch uses 0.6 m. This is the side Josh's words allow ("overlap a little"), and the real overlap is at most 0.557 m (Shop_04). It still changes a ticket number, so the main session should tell Josh, and the architect should record it in the ticket if he agrees.
- **OfficeOctagon_Base_01 moved from 0.174 to 0.595.** The ground test did not cause this: its 0.174 face starts at y 0.08 and would qualify. The wider reach let a slightly larger face win on area (5.01 m² against 4.87 m²; each covers about half the width, as an octagon's faces do).
  - It has no effect today. Offices are not terrace blocks (G1 does not see them), and `models3d.ts:891` assembles them with the default `"back"`.
  - If a later section aligns offices on `"wall"`, the octagon's 0.174 face would stand 0.42 m onto the pavement and its bound 0.6 m. That is allowed by the rule, but it is the most of any piece. See Could improve 2.
- G1's independent pin covers only the terrace base keys. For floors and offices it falls back to `wallOffset`. That is right for G1's scope: street-level pieces of terrace columns.
- No `src/grid/`, `src/night/`, `src/core/` or out-of-Files change. No new dependency. No GDD Decided rule changed in code.

## Must fix
none

## Could improve
1. When the main session shows Josh this branch, point him at a Shop_06 and a Door_01 frontage. Their piers or wall sit on the edge, and the glass or door sits 0.27 m or 0.23 m further back. I read that as a shopfront, not "a gap of nothing", but it is the one judgement call left in A.
2. `facade.ts`: consider pinning OfficeOctagon_Base_01 to its 0.174 face, either by an explicit override with a comment or by preferring the frontmost of planes within a few percent of the largest area. Do this before any section aligns offices on `"wall"`. Not needed for A.
3. Carried over from round 1, still open: section D (owner of `models3d.ts`) passes `{ align: TILE_STACK_ALIGN }` to `packTown` explicitly.
4. Carried over from round 1, still open: a committed digest pin of `packTown` on the three protocol maps.
