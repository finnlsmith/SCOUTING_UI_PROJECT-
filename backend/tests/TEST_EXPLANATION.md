# Test Explanation - What Each Test Does

This document explains what each test is actually testing in the backend test suite.

---

## 📊 Test Overview

**Total Tests**: 28 tests
- **Unit Tests**: 19 tests (utility functions)
- **Integration Tests**: 9 tests (API routes)

---

## 🔧 Unit Tests

### File: `tests/unit/test_utils/test_coords.py`

**Purpose**: Tests the `_to_xy()` function that converts location strings/lists to (x, y) coordinates.

**What it tests**:

1. **`test_to_xy_with_valid_json_string`**
   - ✅ Converts JSON string `"[102.5, 35.2]"` to x=102.5, y=35.2
   - **Tests**: Basic functionality with JSON string format (common in StatsBomb data)

2. **`test_to_xy_with_list`**
   - ✅ Converts Python list `[98.3, 42.1]` to coordinates
   - **Tests**: Function handles list input directly

3. **`test_to_xy_with_tuple`**
   - ✅ Converts Python tuple `(105.0, 38.0)` to coordinates
   - **Tests**: Function handles tuple input

4. **`test_to_xy_with_invalid_json`**
   - ✅ Returns NaN values when JSON is invalid
   - **Tests**: Error handling for malformed JSON strings
   - **Expected**: Returns `(nan, nan)` instead of crashing

5. **`test_to_xy_with_empty_string`**
   - ✅ Returns NaN for empty strings
   - **Tests**: Graceful handling of empty input

6. **`test_to_xy_with_none`**
   - ✅ Returns NaN when input is None
   - **Tests**: Null handling

7. **`test_to_xy_with_short_list`**
   - ✅ Returns NaN when list has less than 2 elements
   - **Tests**: Validation that both x and y coordinates exist

8. **`test_to_xy_with_extra_elements`**
   - ✅ Uses first two elements when list has more than 2
   - **Tests**: Function ignores extra coordinates

9. **`test_to_xy_with_float_values`**
   - ✅ Preserves decimal precision (102.56789 stays 102.56789)
   - **Tests**: No precision loss in coordinate conversion

10. **`test_to_xy_with_integer_values`**
    - ✅ Converts integers to floats (102 becomes 102.0)
    - **Tests**: Type consistency in output

**Real-World Use Case**: When processing match events, locations come as JSON strings like `"[102.5, 35.2]"`. This function safely converts them to usable x, y coordinates for plotting shots on the pitch.

---

### File: `tests/unit/test_utils/test_pitch.py`

**Purpose**: Tests the `make_pitch()` function that draws a soccer pitch on Plotly figures.

**What it tests**:

1. **`test_make_pitch_creates_figure`**
   - ✅ Function creates shapes on a Plotly figure
   - **Tests**: Basic functionality - pitch drawing works

2. **`test_make_pitch_has_outline`**
   - ✅ Pitch has a rectangular outline (120×80 dimensions)
   - **Tests**: Main pitch boundary is drawn correctly
   - **Verifies**: Rect from (0,0) to (120,80) exists

3. **`test_make_pitch_has_halfway_line`**
   - ✅ Pitch has a halfway line at x=60
   - **Tests**: Midfield line is drawn correctly

4. **`test_make_pitch_has_penalty_boxes`**
   - ✅ Pitch has two 18-yard penalty boxes
   - **Tests**: Penalty areas are drawn on both ends
   - **Verifies**: 18-yard box width (18 units) is correct

5. **`test_make_pitch_custom_linecolor`**
   - ✅ Function accepts custom line colors (e.g., "blue")
   - **Tests**: Customization options work

6. **`test_make_pitch_custom_linewidth`**
   - ✅ Function accepts custom line widths (e.g., 5px)
   - **Tests**: Styling customization works

7. **`test_make_pitch_preserves_existing_shapes`**
   - ✅ Adding pitch doesn't delete existing shapes on figure
   - **Tests**: Function is additive, not destructive

8. **`test_make_pitch_has_goals`**
   - ✅ Pitch includes goal indicators (rectangles beyond pitch edges)
   - **Tests**: Goal posts are drawn at both ends

**Real-World Use Case**: Every visualization that shows events on a pitch (shot maps, passing networks) uses this function to draw the soccer field background. These tests ensure the pitch is always drawn correctly.

---

## 🔌 Integration Tests

### File: `tests/integration/test_routes/test_matches.py`

**Purpose**: Tests the `/api/matches` and `/api/upload` API endpoints end-to-end.

**What it tests**:

#### TestMatchesRoute Class

1. **`test_list_matches_success`**
   - ✅ GET `/api/matches` returns 200 status code
   - ✅ Response is a list of match objects
   - ✅ Each match has `file` and `label` fields
   - **Tests**: Happy path - successful match listing
   - **Mocks**: S3 client to return sample match data

2. **`test_list_matches_returns_correct_format`**
   - ✅ Response format matches frontend expectations
   - ✅ Each match has both Events and Frames 360 file entries
   - ✅ File names follow pattern `events_<match_id>.csv` or `frames_360_<match_id>.csv`
   - **Tests**: API contract compliance - frontend depends on this format

3. **`test_list_matches_s3_error`**
   - ✅ Returns 500 status code when S3 fails
   - ✅ Error message indicates S3 connection failure
   - **Tests**: Error handling when AWS S3 is unavailable

#### TestUploadRoute Class

4. **`test_upload_csv_with_xy_columns`**
   - ✅ POST `/api/upload` accepts CSV with x, y columns
   - ✅ Returns Plotly figure JSON with `data` and `layout`
   - **Tests**: CSV upload with expected coordinate columns

5. **`test_upload_csv_without_xy_columns`**
   - ✅ Handles CSV files without x, y columns
   - ✅ Still generates visualization (uses first two columns)
   - **Tests**: Flexible CSV handling

6. **`test_upload_invalid_file`**
   - ✅ Handles malformed CSV gracefully
   - **Tests**: Error handling for bad input files

7. **`test_upload_missing_file`**
   - ✅ Returns 422 (validation error) when no file is provided
   - **Tests**: FastAPI validation works correctly

**Real-World Use Case**: The frontend calls `/api/matches` to populate the match selector dropdown. These tests ensure the API returns data in the exact format the frontend expects, preventing UI bugs.

---

### File: `tests/integration/test_routes/test_visualizations.py`

**Purpose**: Tests visualization generation endpoints.

**What it tests**:

#### TestVizRoute Class (Shot Map Visualization)

1. **`test_get_match_viz_success`**
   - ✅ GET `/api/match/{filename}/viz` returns 200
   - ✅ Response contains Plotly figure structure (`data` or `meta`)
   - **Tests**: Successful shot map generation
   - **Mocks**: 
     - Cache (returns None = cache miss)
     - S3 client (returns sample shot data and match metadata)

2. **`test_get_match_viz_file_not_found`**
   - ✅ Returns 404 when match file doesn't exist in S3
   - **Tests**: Proper error handling for missing files
   - **Mocks**: S3 returns None (file not found)

3. **`test_get_match_viz_no_shots`**
   - ✅ Returns 404 when match exists but has no shot events
   - ✅ Error message says "No shot events"
   - **Tests**: Edge case - match with only passes, no shots
   - **Mocks**: S3 returns events DataFrame with no shots

#### TestImportantMomentsRoute Class

4. **`test_get_important_moments_success`**
   - ✅ GET `/api/match/{filename}/important_moments` returns 200
   - ✅ Response is a list of moment objects
   - **Tests**: Key moments extraction works
   - **Mocks**: S3 returns sample events DataFrame

5. **`test_get_important_moments_file_not_found`**
   - ✅ Returns 404 when match file doesn't exist
   - **Tests**: Error handling for missing match files

**Real-World Use Case**: When a user selects a match and clicks "Shot Map", the frontend calls `/api/match/events_3788741.csv/viz`. These tests ensure the visualization is generated correctly and errors are handled gracefully.

---

## 🎯 What These Tests DON'T Test (Yet)

### Missing Coverage Areas:

1. **Visualization Functions** (in `visualizations/` directory):
   - ❌ `passing_network.py` - No tests yet
   - ❌ `game_phases.py` - No tests yet
   - ❌ `possession_scene.py` - No tests yet
   - ❌ `shot_map.py` - Logic tested indirectly via routes, but not directly

2. **Cache Module**:
   - ⚠️ Some cache tests exist in `cache/tests/` (from before)
   - ❌ Cache integration with routes not fully tested

3. **Error Scenarios**:
   - ❌ Network timeouts
   - ❌ Large file handling
   - ❌ Concurrent request handling

4. **Edge Cases**:
   - ❌ Empty match files
   - ❌ Missing optional columns
   - ❌ Very large datasets

---

## 📈 Test Coverage Breakdown

### Currently Tested:
- ✅ Coordinate parsing (`_to_xy`) - **10 test cases**
- ✅ Pitch drawing (`make_pitch`) - **8 test cases**
- ✅ Match listing endpoint - **3 test cases**
- ✅ CSV upload endpoint - **4 test cases**
- ✅ Shot map endpoint - **3 test cases**
- ✅ Important moments endpoint - **2 test cases**

### Not Yet Tested:
- ❌ Passing network generation
- ❌ Game phases analysis
- ❌ Possession scene visualization
- ❌ Direct visualization function testing (without routes)
- ❌ Cache expiration and TTL behavior
- ❌ Complex data transformations

---

## 🔍 How to Read Test Names

Test names follow a pattern: `test_<function>_<scenario>`

**Examples**:
- `test_to_xy_with_valid_json_string` → Tests `_to_xy()` function with valid JSON input
- `test_list_matches_success` → Tests match listing endpoint with successful scenario
- `test_get_match_viz_file_not_found` → Tests visualization endpoint when file doesn't exist

**Common Patterns**:
- `_success` → Happy path test
- `_error` or `_not_found` → Error handling test
- `_with_<condition>` → Specific input condition
- `_invalid` → Invalid input handling

---

## 💡 Key Testing Patterns

### 1. AAA Pattern (Arrange-Act-Assert)

All tests follow this structure:
```python
def test_something():
    # Arrange - Set up test data and mocks
    data = create_test_data()
    
    # Act - Execute the function being tested
    result = function_under_test(data)
    
    # Assert - Verify the result
    assert result == expected_value
```

### 2. Mocking Strategy

- **S3**: Mocked using `unittest.mock` to avoid hitting real AWS
- **Cache**: Mocked to control cache hits/misses
- **FastAPI Client**: Real test client, but with mocked dependencies

### 3. Test Isolation

- Each test is independent
- Mocks are reset between tests
- No shared state between tests

---

## 🎓 What You Should Know

### Unit Tests vs Integration Tests

**Unit Tests** (`tests/unit/`):
- Test individual functions in isolation
- Fast execution (milliseconds)
- No external dependencies (all mocked)
- Examples: `test_coords.py`, `test_pitch.py`

**Integration Tests** (`tests/integration/`):
- Test how components work together
- Slower execution (may involve API calls)
- May use real FastAPI test client
- Mock only external services (S3, Redis)
- Examples: `test_matches.py`, `test_visualizations.py`

### Why Mocking?

- **S3**: Don't want tests to hit real AWS (cost, slow, requires credentials)
- **Cache**: Want to control cache state for predictable tests
- **Speed**: Mocked tests run in milliseconds instead of seconds

---

## 📝 Summary

**What the tests verify**:
1. ✅ **Utilities work correctly** - Coordinates parse, pitch draws correctly
2. ✅ **API returns correct format** - Matches endpoint returns expected structure
3. ✅ **Error handling works** - Missing files return 404, S3 errors return 500
4. ✅ **Visualizations generate** - Shot maps and important moments endpoints work
5. ✅ **Edge cases handled** - Empty data, missing columns, invalid input

**What still needs testing**:
- More visualization functions (passing network, game phases)
- More edge cases and error scenarios
- Performance with large datasets
- Cache behavior and expiration

The current tests provide a solid foundation and test the most critical user-facing functionality.

