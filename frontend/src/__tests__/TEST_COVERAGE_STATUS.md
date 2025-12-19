# Frontend Component Test Coverage Status

## ✅ Tested Components (3/16)

1. **ErrorBanner** ✅
   - Test file: `ErrorBanner.test.js`
   - Coverage: 100%
   - Tests: 7 tests passing

2. **MatchSelector** ✅
   - Test file: `MatchSelector.test.js`
   - Coverage: 100%
   - Tests: 10 tests passing

3. **Scoreboard** ✅
   - Test file: `Scoreboard.test.js`
   - Coverage: 100%
   - Tests: 16 tests passing

---

## ❌ Untested Components (13/16)

### Simple Components (Easy to Test)

4. **LoadingSkeleton** ❌
   - Simple component with multiple variants (PlotSkeleton, TextSkeleton, ButtonSkeleton, CardSkeleton)
   - Priority: **High** - Used frequently, simple to test

5. **ThemeToggle** ❌
   - Button component with theme switching
   - Requires ThemeContext mock
   - Priority: **High** - User-facing feature

6. **Sidebar** ❌
   - Navigation component
   - Priority: **Medium**

7. **AboutPage** ❌
   - Static page component
   - Priority: **Low** - Mostly static content

8. **ContactUs** ❌
   - Static page component
   - Priority: **Low** - Mostly static content

9. **LandingPage** ❌
   - Landing page component
   - Priority: **Medium**

10. **TournamentsPage** ❌
    - Page component
    - Priority: **Medium**

### Complex Components (Harder to Test)

11. **Layout** ❌
    - Wrapper component with routing
    - Priority: **Medium** - Important but complex

12. **ErrorBoundary** ❌
    - Error boundary component (requires error simulation)
    - Priority: **Medium** - Important for error handling

13. **ShotMapButtons** ❌
    - Button group component
    - Priority: **Low**

14. **PassingNetworkButtons** ❌
    - Button component
    - Priority: **Low**

15. **ShotMapPlot** ❌
    - Plotly visualization component
    - Priority: **Low** - Requires Plotly mocking

### Very Complex Components

16. **MatchViz** ❌
    - Main visualization component (238 lines)
    - Has many sub-components:
      - KeyMomentsSection
      - GamePhasesSection
      - GamePhaseCard
      - PhaseMetricsTable
      - PhaseEventMaps
      - PhaseBoxEntryMaps
      - PitchSVG
      - EventMapSVG
      - BoxEntryMapSVG
    - Priority: **Low** - Very complex, would need integration tests

---

## 📊 Test Coverage Summary

- **Tested**: 3 components (19%)
- **Untested**: 13 components (81%)
- **Total Tests**: 33 component tests
- **Test Pass Rate**: 100% (all component tests passing)

## 🎯 Recommended Next Steps

### Phase 1: Simple Components (Quick Wins)
1. **LoadingSkeleton** - Multiple simple components
2. **ThemeToggle** - Single button with context
3. **Sidebar** - Navigation component

### Phase 2: Page Components
4. **AboutPage** - Static content
5. **ContactUs** - Static content
6. **LandingPage** - Landing page
7. **TournamentsPage** - Tournament listing

### Phase 3: Complex Components
8. **Layout** - Wrapper with routing
9. **ErrorBoundary** - Error handling
10. **ShotMapButtons** / **PassingNetworkButtons** - Button groups

### Phase 4: Advanced
11. **ShotMapPlot** - Plotly component (requires mocking)
12. **MatchViz** - Integration tests recommended

---

## 📝 Notes

- **Hooks** are also untested (`useMatchData`, `useUpload`, `useVisualization`)
- **Sub-components** of MatchViz are untested
- Current focus should be on **simple, frequently-used components** first

