ticket: 081-t3b-goodbye-left
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
This is a follow-up to 081 T3 criterion 3, from Josh's card on 25 Nov 2026: "Move it left (Recommended)". The exit screen's goodbye line, "Rest: Circuits is closed. You can close this tab.", moves from the centre to the left. It lines up with the title's words and stays clear of the lit building on the right. Everything else about the exit screen stays as it is: any key or click goes back to the title, and there is no `window.close()`. The ticket file has no separate T3b section, so I judged against T3's criterion 3 and the card's wording.

## Does the branch do it?
- **Left, on the title's margin.** `index.html` line 122: `.screen-exit` now uses `left: 6vw; text-align: left`. That is the same 6vw left edge as `.title-name` (line 110), `.title-menu` (line 111) and `.screen-select` (line 116). The old `inset: 0` flex centring and `text-align: center` are gone. Met.
- **Clear of the building on the right.** `width: 40vw` with `overflow-wrap: break-word` keeps the line inside 6vw to 46vw, so it wraps in the left half and never reaches the right side of the screen. I could not check by eye whether T1's building starts right of 46vw at every aspect ratio. That is Josh's look in the browser.
- **Vertical place.** `top: 30vh` is the select panel's top. The title group is hidden on the exit screen (`src/ui/screens.ts` line 114, `titleGroup.hidden = screen !== "title"`), so nothing overlaps the line.
- **Any click still goes back.** The old rule filled the screen (`inset: 0`), and the new box is small. That doesn't matter: the click handler is on the document (`screens.ts` line 237, `doc.addEventListener("click", onClick)`), not on the line, and `.screens` keeps `pointer-events: none`. Any click anywhere still reaches `goTitle(false)`. The key path (line 212) is unchanged. Criterion 3 still holds.
- **Tests.** The branch adds or changes no test cases (0 of 15) and changes no TypeScript. A CSS position is a **browser** check, so having no test is correct. I had nothing of the branch's own to run.

## Rule conflicts and risks
- None against the hard rules. Only `index.html` changes in code: no change to `src/grid/` or `src/night/`, no new dependency, and no Decided rule touched. `index.html` styles for the screens are in T3's listed files.
- The branch also carries `cleanups/2026-11-25.md`, commit e14ae2a. It adds Josh's Delete answers for the T1 and T3 branches. That is the main session's cleanup record, not the builder's work, and it is outside the ticket's files. It is harmless to merge, but it is noted here so the merge doesn't surprise anyone.
- On a narrow phone screen (360 px), 40vw is about 144 px at the 22 px minimum font, so the line wraps to five or six short lines. It still reads, and the longest word ("Circuits") fits. This one is cosmetic only.

## Must fix
none

## Could improve
1. `index.html` `.screen-exit`: `width: max(40vw, 260px)` (or a `max-width: 600px` media rule) would wrap the line less on very narrow screens while staying in the left half on desktop. Only if Josh finds the phone view cramped.
2. A short T3b line in `tickets/081-puzzles-on-the-city.md` (the lead-architect's file), with Josh's card words, would put this change on the ticket's record next to T3.
