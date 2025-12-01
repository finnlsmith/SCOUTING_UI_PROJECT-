"""
Test fixtures for match data.
"""
import pandas as pd


def get_sample_matches_df():
    """Return a sample matches DataFrame."""
    return pd.DataFrame({
        'match_id': [3788741, 3788742, 3788743],
        'match_date': ['2021-07-11', '2021-07-07', '2021-07-06'],
        'home_team': ['Italy', 'Spain', 'Denmark'],
        'away_team': ['England', 'Italy', 'England'],
        'home_score': [1, 1, 1],
        'away_score': [1, 2, 2],
        'competition_stage': ['Final', 'Semi-Final', 'Semi-Final'],
        'competition': ['UEFA Euro', 'UEFA Euro', 'UEFA Euro'],
    })


def get_sample_match_dict():
    """Return a sample match as a dictionary."""
    return {
        'match_id': 3788741,
        'match_date': '2021-07-11',
        'home_team': 'Italy',
        'away_team': 'England',
        'home_score': 1,
        'away_score': 1,
        'competition_stage': 'Final',
    }


def get_matches_list_response():
    """Return the expected matches list API response format."""
    return [
        {'file': 'events_3788741.csv', 'label': '2021-07-11 - Italy vs England – Events'},
        {'file': 'frames_360_3788741.csv', 'label': '2021-07-11 - Italy vs England – Frames 360'},
        {'file': 'events_3788742.csv', 'label': '2021-07-07 - Spain vs Italy – Events'},
        {'file': 'frames_360_3788742.csv', 'label': '2021-07-07 - Spain vs Italy – Frames 360'},
    ]

