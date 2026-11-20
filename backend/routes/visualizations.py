"""
Visualization routes module.

This module defines FastAPI routes for match visualizations.
All business logic has been extracted to the visualizations package.
"""

from fastapi import APIRouter, Query
from fastapi import HTTPException

# Import visualization functions
from visualizations.player_tables import player_tables
from visualizations import (
    get_match_viz,
    passing_network_like_matplotlib,
    important_moments,
    game_phases,
    possession_scene
)

router = APIRouter(tags=["Match Visualizations"])


@router.get("/api/match/{filename}/viz", summary="Generate shot map visualization")
async def viz_route(
    filename: str,
    team: str | None = Query(default=None, description="Filter by specific team name")
):
    """
    Generate an interactive shot map visualization for a match.
    
    Creates a Plotly-based shot map showing all shots with xG values, outcomes (goals vs misses),
    and optional team filtering. Includes scoreboard statistics and pitch overlay.
    
    **Path Parameters:**
        - **filename** (str): S3 key of the match events file (e.g., "events_3788741.csv")
        
    **Query Parameters:**
        - **team** (str, optional): Filter shots for a specific team
        
    **Returns:**
        dict: Plotly figure with shot locations, xG sizes, and pitch markings
        
    **Raises:**
        - HTTPException 404: File not found in S3 or no shots in match
        - HTTPException 400: Missing required columns (type, location)
    """
    return await get_match_viz(filename=filename, team=team)


@router.get(
    "/api/match/{filename}/passing_network",
    summary="Generate passing network visualization",
)
async def passing_network_route(
    filename: str,
    team: str = Query(..., description="Team name to generate passing network for"),
    min_passes: int = Query(1, ge=1, description="Minimum passes between players to display"),
    flip: bool = Query(False, description="Flip the pitch orientation horizontally"),
    subs: bool = Query(False, description="Show substitutes in place of the players they replaced"),
    period: int | None = Query(None, description="Only this period (use with start/end)"),
    start: float | None = Query(None, description="Window start: match clock in seconds (exclusive)"),
    end: float | None = Query(None, description="Window end: match clock in seconds (inclusive)"),
):
    """
    Generate an interactive passing network visualization for a team.
    
    Creates a network graph showing passing connections between players with nodes
    representing average player positions and edges weighted by pass frequency.
    Automatically filters to Starting XI if lineup data is available.
    
    **Path Parameters:**
        - **filename** (str): S3 key of match events file (e.g., "events_3788741.csv")
        
    **Query Parameters:**
        - **team** (str, required): Team name for which to generate network
        - **min_passes** (int, optional): Minimum passes between two players to show edge (default: 1)
        - **flip** (bool, optional): Flip pitch horizontally (default: false)
        - **subs** (bool, optional): Show substitutes in place of the players they replaced (default: false)
        
    **Returns:**
        dict: Plotly figure with player nodes and passing edges
        
    **Raises:**
        - HTTPException 400: Missing required columns or invalid team name
        - HTTPException 404: Match file not found in S3
    """
    return await passing_network_like_matplotlib(
        filename=filename,
        team=team,
        min_passes=min_passes,
        flip=flip,
        subs=subs,
        period=period, start=start, end=end,
    )


@router.get(
    "/api/match/{filename}/important_moments",
    summary="Extract important match moments",
)
async def important_moments_route(filename: str):
    """
    Extract and return key moments from a match.
    
    Identifies significant events including high-probability shots, goals, own goals,
    and penalty-winning fouls. Results are sorted chronologically by period and timestamp.
    
    **Path Parameters:**
        - **filename** (str): S3 key of match events file (e.g., "events_3788741.csv")
        
    **Returns:**
        list[dict]: Array of important moment objects
        - who (str): Player name (abbreviated)
        - when (str): Match time (MM:SS)
        - what (str): Event type (Shot, Own Goal Against, Foul Won)
        - outcome (str): Result (Goal, Saved, Penalty Won, etc.)
        - xg (float, optional): Expected goals value (0-1)
        - team (str): Team name
        - period (int): Match period (1, 2, 3 for ET, 4 for pens, 5 for post-match)
        
    **Filtering Criteria:**
        - Shots with xG >= 0.08 or outcome = Goal
        - All own goals against
        - All penalty-winning fouls
        - Events before 120:00 (excludes penalty shootouts)
        
    **Raises:**
        - HTTPException 500: File processing error
    """
    return await important_moments(filename=filename)


@router.get(
    "/api/match/{filename}/game_phases",
    summary="Analyze match phases and momentum",
)
async def game_phases_route(filename: str):
    """
    Analyze match divided into phases based on key events.
    
    Segments the match into distinct tactical phases triggered by goals, half-time,
    red cards, and other significant events. Computes detailed metrics for each phase
    including possession, field position, and event statistics.
    
    **Path Parameters:**
        - **filename** (str): S3 key of match events file (e.g., "events_3788741.csv")
        
    **Returns:**
        dict: Object containing phases array and phase_metrics array
        
    **Phase Triggers:**
        - Match start
        - Goals (including own goals)
        - Half-time (Half End → Half Start)
        - Red cards
        - Extra time periods
        
    **Phase Metrics:**
        - Possession percentage (by pass count)
        - Box entries (within 18-yard box)
        - Final third entries
        - Shots, goals
        - Fouls, cards
        
    **Raises:**
        - HTTPException 500: File processing error
    """
    return await game_phases(filename=filename)


@router.get(
    "/api/match/{filename}/possession_scene",
    summary="Generate possession sequence visualization",
)
async def possession_scene_route(
    filename: str,
    possession: int = Query(..., description="Possession number to visualize")
):
    """
    Generate a comprehensive possession sequence visualization with player tracking.
    
    Creates a detailed static image showing player positions, movement trails, and
    event locations for a specific possession sequence using StatsBomb 360 data.
    
    **Path Parameters:**
        - **filename** (str): S3 key of match events file (e.g., "events_3788741.csv")
        
    **Query Parameters:**
        - **possession** (int, required): Possession sequence number to visualize
        
    **Response:**
        PNG image (base64 encoded) showing:
        - Soccer pitch with StatsBomb coordinates
        - Player positions from event data
        - Movement trails and passing sequences
        - Event markers (passes, shots, etc.)
        - Team colors and player labels
        
    **Returns:**
        dict: {"image_base64": <base64-encoded PNG image>}
        
    **Raises:**
        - HTTPException 404: File not found or possession number invalid
        - HTTPException 500: Image generation error
    """
    return await possession_scene(filename=filename, possession=possession)


@router.get(
    "/api/match/{filename}/player_tables",
    summary="Per-player attack and chance-creation tables for one team",
)
async def player_tables_route(
    filename: str,
    team: str = Query(..., description="Team name to build the tables for"),
    period: int | None = Query(None, description="Only this period (use with start/end)"),
    start: float | None = Query(None, description="Window start: match clock in seconds (exclusive)"),
    end: float | None = Query(None, description="Window end: match clock in seconds (inclusive)"),
):
    """
    Two tables of per-player counts for one team: attacking involvement (shots, xG, final third
    entries, box touches, goal-side receptions) and chance creation (line-breaking passes, carries
    and passes into the box, possession-ending actions, shot-creating actions).

    The line-breaking and goal-side counts use the 360 freeze frames, so they only cover events
    that have a frame; the response says how much is covered.
    """
    return await player_tables(filename=filename, team=team, period=period, start=start, end=end)


@router.get(
    "/api/match/{filename}/event_context",
    summary="The actions immediately before one event (a shot or a mistake)",
)
async def event_context_route(filename: str, event_id: str = Query(..., description="The event's id")):
    """
    What happened right before an event, ready to draw: the last few actions (passes, carries,
    dribbles, recoveries, the opposition's last touches) in the frame of the team that owns the event,
    plus the 60-second window to use for a passing network of the lead-up. Works the same for the
    whole match and for phases.
    """
    from cache import s3
    from fastapi import HTTPException
    from visualizations.event_context import event_context
    events = s3.get_dataframe(filename, cache_type="events_df")
    if events is None:
        raise HTTPException(status_code=404, detail=f"S3 key not found: {filename}")
    ctx = event_context(events, event_id)
    if not ctx:
        raise HTTPException(status_code=404, detail=f"No event with id {event_id}")
    return ctx


@router.get(
    "/api/match/{filename}/player_touches",
    summary="Where one player touched the ball",
)
async def player_touches_route(
    filename: str,
    team: str = Query(..., description="The player's team"),
    player: str = Query(..., description="The player's full name"),
    mode: str = Query("touches", pattern="^(touches|final_third_receptions)$"),
    period: int | None = Query(None, description="Only this period (use with start/end)"),
    start: float | None = Query(None, description="Window start: match clock in seconds (exclusive)"),
    end: float | None = Query(None, description="Window end: match clock in seconds (inclusive)"),
):
    """All of a player's touches, or just their receptions in the final third, in a window (a phase or
    the whole match)."""
    from cache import s3
    from fastapi import HTTPException
    from visualizations.event_context import apply_window, player_touches
    events = s3.get_dataframe(filename, cache_type="events_df")
    if events is None:
        raise HTTPException(status_code=404, detail=f"S3 key not found: {filename}")
    return player_touches(apply_window(events, period, start, end), team, player, mode)
