"""
Cache configuration and TTL settings.
"""
# Cache TTL configuration (in seconds)
CACHE_TTL = {
    "matches_df": 900,        # 15 minutes - rarely changes
    "matches_list": 900,      # 15 minutes - same as above
    "events_df": 600,         # 10 minutes - match data stable
    "important_moments": 600, # 10 minutes - computed from events
    "game_phases": 600,       # 10 minutes - computed from events
    "plotly_viz": 600,        # 10 minutes - expensive to compute
    "passing_network": 600,   # 10 minutes - expensive to compute
    "possession_scene": 300,  # 5 minutes - very expensive
    "team_logo": 3600,        # 1 hour - logos rarely change
    "default": 600,           # 10 minutes default
}

# Cache size configuration
DEFAULT_CACHE_MAXSIZE = 1000

