# MatchViz Component Refactoring Guideline

## Overview

This document explains the refactoring approach taken to reduce the `MatchViz/index.js` component from **771 lines to 238 lines** (69% reduction) by extracting reusable components and custom hooks. 

### Goals of Refactoring

- ✅ Reduce main component file size
- ✅ Improve code organization and readability
- ✅ Create reusable components
- ✅ Enable better testing
- ✅ Separate concerns (UI, logic, state management)
- ✅ Maintain existing functionality

---

## Refactoring Strategy

### 1. Component Extraction Pattern

We followed a **bottom-up extraction** approach:

```
Large Component
  ↓ Extract Sections
Section Components (Key Moments, Game Phases)
  ↓ Extract Sub-Components
Sub-Components (Tables, Maps, Cards)
  ↓ Extract Utilities
Utility Components (SVG Renderers, Helpers)
```

### 2. Separation

- **UI Components**: Pure presentational components
- **Container Components**: State management and data fetching
- **Custom Hooks**: Reusable state logic
- **Utility Functions**: Pure functions for data transformation

---

## Component Breakdown

### Main Component: `index.js`

**Before**: 771 lines with everything inline  
**After**: 238 lines, orchestrates sub-components

**Responsibilities**:
- Top-level state management
- Component composition
- Error handling coordination
- Match selection logic

**Key Changes**:
- Removed inline sections (Key Moments, Game Phases)
- Removed complex SVG rendering
- Simplified Scoreboard props using helper function
- Delegated to specialized components

---

### Section Components

#### 1. `KeyMomentsSection.js`

**Extracted From**: Lines 279-346 in original file

**Responsibilities**:
- Display important match moments table
- Handle scene viewer navigation
- Manage moment selection state
- Fetch possession scene images

**State Management**:
- `selectedMomentIdx` - Currently selected moment
- `sceneImageBase64` - Fetched scene image
- `sceneLoading` - Loading state
- `sceneError` - Error state

**Props**:
```javascript
{
  selectedMatch: string,
  importantMoments: array,
  importantMomentsLoading: boolean,
  importantMomentsError: string,
  showImportantScenes: boolean,
  onToggleScenes: function
}
```

**Benefits**:
- Isolated moment viewing logic
- Can be tested independently
- Reusable for other match views

---

#### 2. `GamePhasesSection.js`

**Extracted From**: Lines 348-765 in original file

**Responsibilities**:
- Display game phases list
- Handle loading and error states
- Coordinate phase card rendering

**State Management**: Uses `useGamePhases` custom hook

**Props**:
```javascript
{
  selectedMatch: string
}
```

**Benefits**:
- Simplified main component
- Self-contained phase logic
- Easy to extend with new phase features

---

### Sub-Components

#### 3. `GamePhaseCard.js`

**Extracted From**: Individual phase rendering logic

**Responsibilities**:
- Display single phase information
- Show phase metrics
- Render phase maps (events, box entries)

**Props**:
```javascript
{
  phase: object,
  metrics: object,
  homeTeam: string,
  awayTeam: string
}
```

**Composition**:
- Uses `PhaseMetricsTable` for statistics
- Uses `PhaseEventMaps` for event visualization
- Uses `PhaseBoxEntryMaps` for box entry visualization

---

#### 4. `PhaseMetricsTable.js`

**Extracted From**: Inline table rendering in Game Phase Card

**Responsibilities**:
- Render phase statistics table
- Format metric values
- Display team comparisons

**Props**:
```javascript
{
  metrics: object,
  homeTeam: string,
  awayTeam: string
}
```

**Benefits**:
- Reusable table component
- Easy to modify metric display
- Testable in isolation

---

#### 5. `PhaseEventMaps.js`

**Extracted From**: Event map rendering (shots, cards, own goals)

**Responsibilities**:
- Display event maps for both teams
- Render legend
- Handle team-specific event data

**Props**:
```javascript
{
  shotMapData: object,
  homeTeam: string,
  awayTeam: string
}
```

**Composition**:
- Uses `EventMapSVG` for actual rendering

---

#### 6. `PhaseBoxEntryMaps.js`

**Extracted From**: Box entry map rendering

**Responsibilities**:
- Display box entry visualizations
- Show pass vs carry distinctions
- Handle team-specific data

**Props**:
```javascript
{
  boxEntryLocations: object,
  homeTeam: string,
  awayTeam: string
}
```

**Composition**:
- Uses `BoxEntryMapSVG` for actual rendering

---

### Reusable SVG Components

#### 7. `PitchSVG.js`

**Extracted From**: Repeated pitch outline rendering

**Purpose**: Base SVG component for soccer pitch

**Features**:
- Standardized pitch dimensions (120×80)
- Optional attacking box highlighting
- Customizable viewBox

**Props**:
```javascript
{
  children: ReactNode,
  viewBox: string,
  highlightAttackingBox: 'left' | 'right' | null,
  className: string
}
```

**Benefits**:
- **DRY Principle**: No duplicate pitch rendering code
- Consistent pitch appearance
- Easy to update pitch styling globally

**Usage Example**:
```javascript
<PitchSVG highlightAttackingBox="right">
  {/* Event markers go here */}
</PitchSVG>
```

---

#### 8. `EventMapSVG.js`

**Extracted From**: Event rendering logic (duplicated ~150 lines)

**Purpose**: Render events (shots, cards, own goals) on pitch

**Features**:
- Handles different event types
- Renders outcome indicators (blocked, off-target)
- Supports pitch flipping

**Props**:
```javascript
{
  events: array,
  flip: boolean,
  className: string
}
```

**Event Types Handled**:
- Shots (with xG-based coloring)
- Red cards
- Own goals
- Blocked shots (red X)
- Off-target shots (red circle)

**Benefits**:
- Single source of truth for event rendering
- Consistent visual representation
- Easy to add new event types

---

#### 9. `BoxEntryMapSVG.js`

**Extracted From**: Box entry rendering logic (~100 lines)

**Purpose**: Render box entry locations and paths

**Features**:
- Distinguishes passes vs carries
- Highlights attacking penalty box
- Supports pitch flipping

**Props**:
```javascript
{
  entries: array,
  flip: boolean,
  attackingSide: 'left' | 'right',
  className: string
}
```

**Benefits**:
- Consistent box entry visualization
- Reusable across different contexts
- Easy to style globally

---

### Custom Hooks

#### 10. `useGamePhases.js`

**Extracted From**: Game phases state management and API calls

**Purpose**: Encapsulate game phases fetching and state

**Returns**:
```javascript
{
  gamePhases: array,
  gamePhaseLoading: boolean,
  gamePhaseError: string,
  gamePhaseTeams: object,
  gamePhaseMetrics: array
}
```

**Benefits**:
- **Separation of Concerns**: Data fetching separate from UI
- **Reusability**: Can be used in other components
- **Testability**: Hook can be tested independently
- **Maintainability**: Centralized API logic

**Usage Example**:
```javascript
const {
  gamePhases,
  gamePhaseLoading,
  gamePhaseError,
  gamePhaseTeams,
  gamePhaseMetrics
} = useGamePhases(selectedMatch);
```

---

### Utility Functions

#### 11. `formatScoreboardProps.js`

**Extracted From**: Complex Scoreboard prop formatting

**Purpose**: Transform stats object into Scoreboard component props

**Function Signature**:
```javascript
formatScoreboardProps(stats: object): object
```

**Benefits**:
- **Readability**: Cleaner JSX in main component
- **Testability**: Pure function, easy to test
- **Reusability**: Can be used elsewhere
- **Maintainability**: Single place to update formatting logic

---

## File Structure

```
MatchViz/
├── index.js                      # Main component (238 lines)
├── KeyMomentsSection.js          # Key moments display
├── GamePhasesSection.js          # Game phases container
├── GamePhaseCard.js              # Individual phase card
├── PhaseMetricsTable.js          # Phase statistics table
├── PhaseEventMaps.js             # Event maps container
├── PhaseBoxEntryMaps.js          # Box entry maps container
├── PitchSVG.js                   # Reusable pitch component
├── EventMapSVG.js                # Event rendering
├── BoxEntryMapSVG.js             # Box entry rendering
├── useGamePhases.js              # Game phases hook
├── formatScoreboardProps.js      # Scoreboard helper
└── MatchViz.module.css           # Styles
```

## Summary

The refactoring successfully:

- ✅ **Reduced complexity**: 771 → 238 lines (69% reduction)
- ✅ **Improved maintainability**: Clear component structure
- ✅ **Enhanced reusability**: SVG components reusable elsewhere
- ✅ **Better testability**: Isolated, testable units
- ✅ **Maintained functionality**: Zero feature loss

---

