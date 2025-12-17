"""
Sample match data fixtures for testing.
"""
import pandas as pd


def get_sample_matches_df():
    """Get sample matches DataFrame."""
    return pd.DataFrame({
        'match_id': [3788741, 3788742, 3788743],
        'match_date': ['2021-07-11', '2021-07-10', '2021-07-09'],
        'home_team': ['Italy', 'England', 'Spain'],
        'away_team': ['England', 'Denmark', 'Italy'],
        'home_score': [1, 2, 0],
        'away_score': [1, 1, 1],
    })


def get_matches_list_response():
    """Get expected matches list response format."""
    return [
        {"file": "events_3788741.csv", "label": "2021-07-11 - Italy vs England – Events"},
        {"file": "frames_360_3788741.csv", "label": "2021-07-11 - Italy vs England – Frames 360"},
        {"file": "events_3788742.csv", "label": "2021-07-10 - England vs Denmark – Events"},
        {"file": "frames_360_3788742.csv", "label": "2021-07-10 - England vs Denmark – Frames 360"},
        {"file": "events_3788743.csv", "label": "2021-07-09 - Spain vs Italy – Events"},
        {"file": "frames_360_3788743.csv", "label": "2021-07-09 - Spain vs Italy – Frames 360"},
    ]

