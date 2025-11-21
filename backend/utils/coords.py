import json
import numpy as np

def _to_xy(val):
    try:
        arr = json.loads(val) if isinstance(val, str) else val
        if isinstance(arr, (list, tuple)) and len(arr) >= 2:
            return float(arr[0]), float(arr[1])
    except Exception:
        pass
    return (np.nan, np.nan)