# Frontend Components Overview

**ErrorBanner.js**
Displays a prominent error message at the top of the UI. Used for both hard (blocking) errors and soft warnings, with a dismiss button for the user to clear it. Centralizes error visibility for the app.

**FileUpload.js**
Provides the UI for uploading CSV files to the backend. Contains the file input, upload button, visual feedback for uploading status, and a success message. Used when users want to visualize their own data rather than choosing from preloaded matches.

**MatchSelector.js**
Renders the dropdown menu for selecting a match from the list fetched from the backend. Handles the flip sides checkbox, and includes a reset button to clear the current selection. Integrates with match loading logic and UI features that depend on a selected match.

**MatchViz.js**
The main component that ties together all logic & UI features for the shot visualization tool. Orchestrates state from various hooks, shows error messages, renders the upload and match select UIs, passes data to Scoreboard and shot map components, and contains the main page layout. Acts as the "page controller" for the visualization feature of the app.

**Scoreboard.js**
Shows a summary of the currently selected or uploaded match: teams, goals, shots, shots on target, xG, and competition stage. Receives all data as props and renders it in a clean comparison table. Used for giving users match context above the visual plot.

**ShotMapButtons.js**
Provides buttons for toggling the shot map view between just the home team, just the away team, or both teams. Allows users to explore shot map data filtered by team with a single click.

**ShotMapPlot.js**
Responsible for rendering the actual shot map plot using Plotly. Displays either a loading message, a fallback message for no data, or the interactive shot map itself. Isolates the plotting logic/UI so it can be reused and styled independently.

**useMatchData.js**
Custom React hook for fetching the matches list from the backend API. Handles loading, error, and provides a setter for error state. Abstracts and encapsulates the match list fetching logic for use in any component (primarily MatchViz).

**useUpload.js**
Custom React hook to manage CSV file upload flow: controls the file input state, uploading logic, success/error state, and the async upload function itself. All upload logic is consolidated so that the UI component can stay simple and focused solely on rendering.

**useVisualization.js**
Custom React hook for managing the fetching and state related to plot data (figData) and match stats from the backend. Offers functions to load an overall match, individual team shot maps, or both, as well as controlling loading state and plot data. Used by the main visualization logic flow.

**AboutPage.js**
