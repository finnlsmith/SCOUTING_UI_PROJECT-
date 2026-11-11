# Known issues

## 1. Match page first shows charts from the wrong match (open)

**Seen:** 2026-11-11 on the live site, `/euro-2020`, selecting Italy vs England (`events_3795506.csv`).

**What happens:** The Shot Map and Passing Network first render another match's data
(Wales vs Switzerland, `events_3788744.csv`: Ben Davies, Aaron Ramsey...) while the scoreboard,
Match Facts and Key Moments correctly show the selected match. Clicking a team button
("Shot map - Italy", "Italy Network") loads the right data.

**Expected:** The charts should always show the selected match, with no clicking needed.

**Suspected cause (not confirmed):** In `frontend/src/components/MatchViz/index.js` the chart
state (`shotMapFigData`, `passNetFigData`) is not cleared when the match changes, and the
auto-load effects depend on team names that arrive later (`stats`) or come from a label regex
that may not match the dropdown labels.

**Also noticed, same session:**
- Game Phases was still on "Loading phases..." when first viewed (not checked whether it finished).
- Right after a cold start, a few requests failed with browser "CORS" errors
  (`/api/match/<file>/important_moments`). Calling the same URL directly returned 200 with the
  correct CORS headers, so this looks like the free Render instance still waking up or running
  low on memory, not a CORS misconfiguration.
