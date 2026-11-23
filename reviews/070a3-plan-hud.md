ticket: 070a3-plan-hud
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
On `?view=3d&city=plan` (dev builds) hide the puzzle HUD so the plan picture's title and top-left corner show on a phone, through one pure rule `planHidesHud(search, dev)` beside the viewer, exported from `src/render3d/index.ts`, and one `hidden` call in `main.ts`'s `view3d` branch. Every other address keeps its HUD.

## Does the branch do it?
Diff against abeb95f touches exactly the four listed files: 30 insertions, 1 deletion.

1. **The rule.** `src/render3d/planview.ts` adds `planHidesHud(search, dev)`, which returns `dev && view === "3d" && planViewRequested(search) !== null`. That is the criterion's definition word for word. It also matches when `renderer.ts` (line 38, unchanged) draws the plan view: `import.meta.env.DEV` and `planViewRequested(location.search)`, reached only through `main.ts`'s `view3d` branch. `src/render3d/index.ts` adds the one export line. `planview.test.ts` adds a `planHidesHud` describe block. It has the four true strings and the six false strings exactly as listed: the first true string with dev false, no `view=3d`, `city=tiles`, bare `view=3d`, `gallery=city`, and `""`. The `stage=nope` case is true, as the criterion wants, because `planViewRequested` returns a request and the viewer then shows its unknown-stage list. Each test is named for the rule it checks (hide on plan in dev, keep the HUD otherwise), not for the output it happens to produce. I ran `npx vitest run --maxWorkers=2 src/render3d/planview.test.ts`: 25 passed.
2. **The wiring.** `src/main.ts` adds one line in the `view3d` `.then`, after `make3d` is set and before `open(first)`: `if (m.planHidesHud(location.search, import.meta.env.DEV)) uiRoot.hidden = true;`. No other line of `main.ts` changes. `mountUI`, the insets and the frame loop are untouched. The main session's gate has tsc clean, which confirms `uiRoot` narrows at that point.
3. **Screenshots.** This is the main session's job. I did not check it, as instructed.
4. **R-8 / R-11.** No ladder, town, terrace, protocol-map or `src/city/` file is touched. The main session reports the gate green with more tests (2747 to 2757 passed). The diff stays inside the section's Files.

## Rule conflicts and risks
- No change under `src/grid/` or `src/night/`, no new dependency, and no GDD rule touched. `src/ui/`, `index.html`, `renderer.ts` and `tilecity.ts` are untouched, as the Must-not list requires.
- The `main.ts` edit falls under the section's explicit exception and is the single line it allows.
- Small risk, not a blocker: `planHidesHud` and `renderer.ts` each work out "is this the plan view" on their own. If one changes, the other can drift. Each calls `planViewRequested` under the same DEV guard, so today they agree.

## Must fix
none

## Could improve
1. `renderer.ts` could call `planHidesHud` (or a shared predicate) so the "plan view is drawn" decision lives in one place. That would be a later section's job, because `renderer.ts` is outside A3's Files.
