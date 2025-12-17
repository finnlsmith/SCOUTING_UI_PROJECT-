"""
Sample event data fixtures for testing.
"""
import pandas as pd


def get_sample_events_df():
    """Get sample events DataFrame with shots."""
    return pd.DataFrame({
        'type': ['Shot', 'Shot', 'Pass', 'Shot', 'Shot'],
        'team': ['Italy', 'England', 'Italy', 'Italy', 'England'],
        'player': ['Player1', 'Player2', 'Player3', 'Player1', 'Player4'],
        'location': [
            '[60, 40]',
            '[100, 50]',
            '[50, 30]',
            '[80, 45]',
            '[90, 35]'
        ],
        'shot_outcome': ['Goal', 'Saved', None, 'Off T', 'Goal'],
        'shot_statsbomb_xg': [0.5, 0.3, None, 0.1, 0.8],
        'period': [1, 1, 1, 2, 2],
        'timestamp': ['00:15:30', '00:25:45', '00:10:20', '00:50:10', '01:05:00'],
    })


def get_sample_shots_only_df():
    """Get sample events DataFrame with only shots."""
    return pd.DataFrame({
        'type': ['Shot', 'Shot', 'Shot'],
        'team': ['Italy', 'England', 'Italy'],
        'player': ['Player1', 'Player2', 'Player1'],
        'location': [
            '[60, 40]',
            '[100, 50]',
            '[80, 45]'
        ],
        'shot_outcome': ['Goal', 'Saved', 'Off T'],
        'shot_statsbomb_xg': [0.5, 0.3, 0.1],
        'period': [1, 1, 2],
        'timestamp': ['00:15:30', '00:25:45', '00:50:10'],
    })


def get_sample_passes_df():
    """Get sample events DataFrame with passes."""
    return pd.DataFrame({
        'type': ['Pass', 'Pass', 'Pass'],
        'team': ['Italy', 'Italy', 'England'],
        'player': ['Player1', 'Player2', 'Player3'],
        'location': [
            '[50, 30]',
            '[60, 40]',
            '[70, 50]'
        ],
        'pass_recipient': ['Player2', 'Player3', 'Player4'],
        'period': [1, 1, 2],
        'timestamp': ['00:10:20', '00:15:30', '00:50:10'],
    })


def get_minimal_events_df():
    """Get minimal events DataFrame for basic tests."""
    return pd.DataFrame({
        'type': ['Shot'],
        'team': ['Italy'],
        'location': ['[60, 40]'],
        'period': [1],
        'timestamp': ['00:15:30'],
    })


def get_empty_events_df():
    """Get empty events DataFrame."""
    return pd.DataFrame(columns=['type', 'team', 'location', 'period', 'timestamp'])


def get_events_without_shots():
    """Get events DataFrame without any shots."""
    return pd.DataFrame({
        'type': ['Pass', 'Pass', 'Duel'],
        'team': ['Italy', 'England', 'Italy'],
        'location': [
            '[50, 30]',
            '[60, 40]',
            '[70, 50]'
        ],
        'period': [1, 1, 2],
        'timestamp': ['00:10:20', '00:15:30', '00:50:10'],
    })


def get_high_xg_shot():
    """Get a single high xG shot event."""
    return pd.DataFrame({
        'type': ['Shot'],
        'team': ['Italy'],
        'player': ['Player1'],
        'location': ['[100, 40]'],
        'shot_outcome': ['Goal'],
        'shot_statsbomb_xg': [0.9],
        'period': [1],
        'timestamp': ['00:20:00'],
    })

