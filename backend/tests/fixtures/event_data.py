"""
Test fixtures for event data.
"""
import pandas as pd
import numpy as np


def get_sample_events_df():
    """Return a sample events DataFrame with various event types."""
    return pd.DataFrame({
        'id': ['event1', 'event2', 'event3', 'event4', 'event5', 'event6'],
        'type': ['Shot', 'Shot', 'Pass', 'Shot', 'Foul', 'Shot'],
        'team': ['Italy', 'Italy', 'England', 'England', 'Italy', 'Italy'],
        'location': [
            '[102.5, 35.2]',  # Goal
            '[98.3, 42.1]',   # Off target
            '[50.0, 40.0]',   # Pass (not a shot)
            '[105.0, 38.0]',  # Saved
            '[60.0, 40.0]',   # Foul
            '[110.0, 40.0]'   # Blocked
        ],
        'shot_statsbomb_xg': [0.45, 0.12, None, 0.85, None, 0.35],
        'shot_outcome': ['Goal', 'Off T', None, 'Saved', None, 'Blocked'],
        'player': ['Player A', 'Player B', 'Player C', 'Player D', 'Player E', 'Player F'],
        'minute': [23, 45, 12, 67, 34, 89],
        'second': [15, 30, 5, 12, 20, 45],
        'period': [1, 1, 1, 2, 1, 2],  # Required for important_moments
        'timestamp': ['00:23:15', '00:45:30', '00:12:05', '00:67:12', '00:34:20', '00:89:45'],  # Required for important_moments
    })


def get_sample_shots_only_df():
    """Return events DataFrame with only shot events."""
    events = get_sample_events_df()
    return events[events['type'] == 'Shot'].copy()


def get_sample_passes_df():
    """Return events DataFrame with only pass events."""
    return pd.DataFrame({
        'id': ['pass1', 'pass2', 'pass3'],
        'type': ['Pass', 'Pass', 'Pass'],
        'team': ['Italy', 'Italy', 'England'],
        'location': ['[50.0, 40.0]', '[55.0, 45.0]', '[60.0, 40.0]'],
        'pass_outcome': [None, None, 'Incomplete'],  # None = completed
        'player': ['Player A', 'Player B', 'Player C'],
    })


def get_minimal_events_df():
    """Return minimal events DataFrame with only required columns."""
    return pd.DataFrame({
        'id': ['event1'],
        'type': ['Shot'],
        'location': ['[102.5, 35.2]'],
    })


def get_empty_events_df():
    """Return empty events DataFrame."""
    return pd.DataFrame(columns=['id', 'type', 'location'])


def get_events_without_shots():
    """Return events DataFrame with no shot events."""
    return pd.DataFrame({
        'id': ['event1', 'event2'],
        'type': ['Pass', 'Foul'],
        'location': ['[50.0, 40.0]', '[60.0, 40.0]'],
    })


def get_high_xg_shot():
    """Return a single high xG shot event."""
    return pd.DataFrame({
        'id': ['high_xg_shot'],
        'type': ['Shot'],
        'team': ['Italy'],
        'location': ['[110.0, 40.0]'],  # Close to goal
        'shot_statsbomb_xg': [0.85],
        'shot_outcome': ['Goal'],
        'player': ['Star Player'],
    })

