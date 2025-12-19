# Requirements Testing Guide

This guide helps you verify that the consolidated `requirements.txt` works correctly for both notebooks and backend.

## What Changed

✅ **Before:** Two separate requirements files
- `requirements.txt` (root) - for notebooks
- `backend/requirements.txt` - for API

✅ **After:** One comprehensive requirements file
- `requirements.txt` (root) - for everything

---

## Step 1: Clean Environment Test

### Fresh Install Test

1. **Remove old virtual environment:**
```bash
cd /path/to/Columbia-MSDS-F25-Soccer
rm -rf .venv
rm -rf backend/.venv  # if it exists
```

2. **Create new environment with consolidated requirements:**
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

3. **Verify installation:**
```bash
pip list | grep -E "fastapi|uvicorn|pandas|numpy|matplotlib|plotly|boto3|jupyter"
```

Expected output should show all these packages installed.

---

## Step 2: Test Backend API

### Start the Backend

```bash
cd backend
source ../.venv/bin/activate  # activate from root
uvicorn app:app --reload
```

### Verify Backend Works

✅ **Check 1: Server starts without import errors**
- Look for: `INFO: Application startup complete.`
- Should NOT see: `ModuleNotFoundError` or `ImportError`

✅ **Check 2: Visit interactive docs**
```bash
# In browser, open:
http://localhost:8000/docs
```
- Should load without errors
- All 8 endpoints visible

✅ **Check 3: Test an endpoint**
```bash
curl http://localhost:8000/api/matches
```
- Should return JSON (may error if AWS not configured, that's OK)
- Should NOT have import errors

---

## Step 3: Test Notebooks

### Test All 9 Notebooks Run

With the environment activated, test each notebook:

```bash
source .venv/bin/activate
jupyter notebook
```

**Notebooks to Test:**

1. ✅ `initial_EDA.ipynb`
   - Run all cells
   - Should complete without `ImportError`

2. ✅ `match_EDA.ipynb`
   - Run all cells
   - Check: pandas, numpy, matplotlib imports work

3. ✅ `dataset_initial_EDA.ipynb`
   - Check: sqlite3, pandas, numpy work

4. ✅ `blue_phases_eda.ipynb`
   - Check: matplotlib.patches, numpy, pandas work

5. ✅ `game_phases_eda_new.ipynb`
   - Check: json, pandas, matplotlib work

6. ✅ `passing_network_test.ipynb`
   - Check: json, ast work

7. ✅ `playing_thru_lines_EDA.ipynb`
   - Check: matplotlib imports work

8. ✅ `crossing_effectiveness_eda.ipynb`
   - Check: PIL, scipy work
   - Verify: `from PIL import Image` succeeds
   - Verify: `from scipy.interpolate import RegularGridInterpolator` succeeds

9. ✅ `shot_scenes_EDA.ipynb`
   - Check: matplotlib.gridspec works

10. ✅ `sync_event_tracking.ipynb`
    - Check: basic imports work

11. ✅ `moment_label_metric.ipynb`
    - Check: typing, numpy, pandas work

### Quick Import Test (All Notebooks)

Create a test cell in any notebook and run:

```python
# Test all critical imports
import json
import math
import ast
from typing import Any, Dict, Iterable, List, Optional, Tuple
from collections import OrderedDict

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Rectangle, ConnectionPatch, Polygon
import matplotlib.patches as patches
import matplotlib.gridspec as gridspec
import matplotlib.lines as mlines
import matplotlib.image as mpimg
from matplotlib.offsetbox import OffsetImage, AnnotationBbox

from PIL import Image
from scipy.interpolate import RegularGridInterpolator

import plotly.graph_objects as go

print("✅ All imports successful!")
```

Expected: `✅ All imports successful!`

---

## Step 4: Verify Pinned Versions

### Check Version Consistency

```bash
pip freeze > installed_versions.txt
cat installed_versions.txt
```

Verify these key packages match `requirements.txt`:

```bash
grep -E "numpy|pandas|matplotlib|fastapi|uvicorn|plotly|boto3|jupyter" installed_versions.txt
```

Expected matches:
- `numpy==2.2.6`
- `pandas==2.3.3`
- `matplotlib==3.10.6`
- `fastapi==0.115.6`
- `uvicorn==0.34.0`
- `plotly==5.24.1`
- `boto3==1.35.93`

---

## Step 5: Cross-Platform Test (Optional)

If team members use different OS:

### macOS
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Run tests above
```

### Windows
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
# Run tests above
```

### Linux
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Run tests above
```

Note: `appnope` (macOS only) is safe to install on all platforms - it's simply ignored on non-macOS.

---

## Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'fastapi'"

**Solution:**
```bash
# Make sure you're using the root requirements.txt
cd /path/to/Columbia-MSDS-F25-Soccer
pip install -r requirements.txt
```

### Issue: "ModuleNotFoundError: No module named 'scipy'"

**Solution:**
```bash
# scipy was added to new requirements
pip install -r requirements.txt --upgrade
```

### Issue: Backend starts but notebooks fail

**Solution:**
```bash
# Verify jupyter is installed
pip list | grep jupyter
# Should show: jupyter, ipykernel, ipython, etc.

# If missing:
pip install -r requirements.txt
```

### Issue: Notebooks work but backend fails

**Solution:**
```bash
# Verify FastAPI dependencies
pip list | grep -E "fastapi|uvicorn|starlette"

# If missing:
pip install -r requirements.txt
```

### Issue: Version conflicts

**Solution:**
```bash
# Clean install
deactivate
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Acceptance Criteria Checklist

Use this checklist to verify all requirements are met:

- [ ] ✅ Single `requirements.txt` in project root exists
- [ ] ✅ `backend/requirements.txt` deleted
- [ ] ✅ All versions pinned (format: `package==X.Y.Z`)
- [ ] ✅ Backend server starts without import errors
- [ ] ✅ `/docs` loads successfully
- [ ] ✅ At least one API endpoint returns data
- [ ] ✅ All 9+ notebooks can be opened
- [ ] ✅ Sample notebook runs all cells without `ImportError`
- [ ] ✅ PIL/Pillow import works (for crossing_effectiveness_eda.ipynb)
- [ ] ✅ scipy import works (for crossing_effectiveness_eda.ipynb)
- [ ] ✅ plotly import works (for match_EDA.ipynb)
- [ ] ✅ README setup instructions updated
- [ ] ✅ One environment works for both backend and notebooks

---

## Final Verification Commands

Run these to confirm everything works:

```bash
# 1. Check environment
source .venv/bin/activate
python --version
pip --version

# 2. Verify all key packages
python -c "import fastapi, uvicorn, pandas, numpy, matplotlib, plotly, boto3, scipy; print('✅ All imports OK')"

# 3. Test backend imports
cd backend
python -c "from app import app; print('✅ Backend app imports OK')"

# 4. Test notebook imports  
cd ..
python -c "import jupyter; print('✅ Jupyter OK')"

# 5. Check for conflicts
pip check
```

Expected: All commands succeed with ✅ messages and no errors.

---

## Next Steps After Testing

Once all tests pass:

1. **Commit changes:**
```bash
git add requirements.txt
git add backend/  # to register deletion
git add README.md
git commit -m "Consolidate requirements into single root file

- Removed backend/requirements.txt
- Created comprehensive requirements.txt with all dependencies
- Pinned all versions for reproducibility
- Updated README setup instructions
- Tested: backend and all notebooks work correctly"
```

2. **Update team:**
   - Notify team to delete their `backend/.venv` 
   - Everyone should create fresh `.venv` from root
   - Share this testing guide

3. **CI/CD update** (if applicable):
   - Update any CI scripts to use root `requirements.txt`
   - Update Docker files to copy from root

---

## Success Criteria Summary

✅ **All notebooks run without import errors**
✅ **Single, comprehensive requirements.txt in project root**
✅ **All versions pinned for reproducibility**
✅ **Backend functions correctly with updated requirements**
✅ **README setup instructions work correctly**
✅ **No dependency conflicts reported by `pip check`**

**Task Complete!** 🎉

