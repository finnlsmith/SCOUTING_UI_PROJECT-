"""
Shared helper functions for visualizations.

Contains common utilities used across multiple visualization modules.
"""

import json
import ast
import pandas as pd
import numpy as np


def to_point(val):
    """Convert various location formats to [x, y] point."""
    if isinstance(val, (list, tuple, np.ndarray)) and len(val) == 2:
        return [float(val[0]), float(val[1])]
    if isinstance(val, str):
        try:
            arr = json.loads(val)
            if isinstance(arr, (list, tuple)) and len(arr) == 2:
                return [float(arr[0]), float(arr[1])]
        except Exception:
            try:
                arr = ast.literal_eval(val)
                if isinstance(arr, (list, tuple)) and len(arr) == 2:
                    return [float(arr[0]), float(arr[1])]
            except Exception:
                return None
    return None


def point_in_rect(point, rect):
    """Check if a point is inside a rectangle."""
    if not point:
        return False
    x, y = point
    (x0, y0, x1, y1) = rect
    return (x0 <= x <= x1) and (y0 <= y <= y1)


def parse_positions_cell(x):
    """Parse positions cell from lineup data (handles list/dict/string/NaN)."""
    if isinstance(x, list):
        return x
    if isinstance(x, dict):
        return [x]
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return []
    if isinstance(x, str):
        s = x.strip()
        if not s:
            return []
        # Try JSON first
        try:
            v = json.loads(s)
            return v if isinstance(v, list) else [v]
        except Exception:
            pass
        # Try Python literal (handles single quotes)
        try:
            v = ast.literal_eval(s)
            return v if isinstance(v, list) else [v]
        except Exception:
            # JSON-ish fallback
            s2 = s.replace("null", "None").replace("true", "True").replace("false", "False")
            try:
                v = ast.literal_eval(s2)
                return v if isinstance(v, list) else [v]
            except Exception:
                return []
    return []


def try_json(x):
    """Try to parse JSON from various formats."""
    if pd.isna(x):
        return None
    if isinstance(x, (list, dict)):
        return x
    s = str(x)
    try:
        return json.loads(s)
    except Exception:
        try:
            return json.loads(s.replace("'", '"'))
        except Exception:
            return None


def parse_point(pt):
    """Parse a point from list/tuple format."""
    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
        return float(pt[0]), float(pt[1])
    return None


def get_xy(loc_field):
    """Extract x, y coordinates from location field."""
    if isinstance(loc_field, (list, tuple)) and len(loc_field) >= 2:
        return float(loc_field[0]), float(loc_field[1])
    if isinstance(loc_field, str):
        try:
            arr = ast.literal_eval(loc_field)
            return (float(arr[0]), float(arr[1])) if isinstance(arr, (list, tuple)) and len(arr) >= 2 else (np.nan, np.nan)
        except:
            pass
    return (np.nan, np.nan)


def flip_y(y):
    """Flip Y coordinate (80 - y)."""
    return 80 - y if y is not None and not np.isnan(y) else y


def flip_x(x):
    """Flip X coordinate (120 - x)."""
    return 120 - x if x is not None and not np.isnan(x) else x


def format_player_name(full_name):
    """Format player name as 'F. Last'."""
    if not full_name:
        return ""
    if isinstance(full_name, float) and pd.isnull(full_name):
        return ""
    s = str(full_name).strip()
    if not s or s == 'N/A' or s.lower() == 'nan':
        return ""
    parts = s.split()
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0][0]}. {parts[-1]}"


def get_player(event):
    """Get player name from event, handling missing/None/NaN values."""
    if 'player' not in event:
        return ""
    val = event['player']
    if val is None:
        return ""
    if isinstance(val, float) and pd.isnull(val):
        return ""
    s = str(val).strip()
    if not s or s.lower() == 'nan' or s == 'N/A':
        return ""
    return s

