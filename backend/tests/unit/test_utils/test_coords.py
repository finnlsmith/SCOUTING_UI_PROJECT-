"""
Unit tests for utils.coords module.
Tests the _to_xy coordinate transformation function.
"""
import pytest
import numpy as np
from utils.coords import _to_xy


@pytest.mark.unit
class TestToXY:
    """Tests for _to_xy function."""

    def test_valid_json_string(self):
        """Test with valid JSON string."""
        result = _to_xy("[60, 40]")
        assert result == (60.0, 40.0)

    def test_valid_json_string_with_spaces(self):
        """Test with JSON string containing spaces."""
        result = _to_xy("[ 60 , 40 ]")
        assert result == (60.0, 40.0)

    def test_valid_list(self):
        """Test with Python list."""
        result = _to_xy([60, 40])
        assert result == (60.0, 40.0)

    def test_valid_tuple(self):
        """Test with Python tuple."""
        result = _to_xy((60, 40))
        assert result == (60.0, 40.0)

    def test_float_values(self):
        """Test with float values."""
        result = _to_xy([60.5, 40.7])
        assert result == (60.5, 40.7)

    def test_integer_values(self):
        """Test with integer values."""
        result = _to_xy([60, 40])
        assert result == (60.0, 40.0)

    def test_invalid_json_string(self):
        """Test with invalid JSON string."""
        result = _to_xy("invalid json")
        assert np.isnan(result[0])
        assert np.isnan(result[1])

    def test_empty_string(self):
        """Test with empty string."""
        result = _to_xy("")
        assert np.isnan(result[0])
        assert np.isnan(result[1])

    def test_none_value(self):
        """Test with None value."""
        result = _to_xy(None)
        assert np.isnan(result[0])
        assert np.isnan(result[1])

    def test_short_list(self):
        """Test with list that has less than 2 elements."""
        result = _to_xy([60])
        assert np.isnan(result[0])
        assert np.isnan(result[1])

    def test_list_with_extra_elements(self):
        """Test with list that has more than 2 elements (should use first 2)."""
        result = _to_xy([60, 40, 20])
        assert result == (60.0, 40.0)

    def test_string_without_brackets(self):
        """Test with string that's not JSON array format."""
        result = _to_xy("60, 40")
        assert np.isnan(result[0])
        assert np.isnan(result[1])

    def test_nested_list(self):
        """Test with nested list (should fail gracefully)."""
        result = _to_xy([[60, 40]])
        assert np.isnan(result[0])
        assert np.isnan(result[1])

    def test_zero_values(self):
        """Test with zero values."""
        result = _to_xy([0, 0])
        assert result == (0.0, 0.0)

    def test_negative_values(self):
        """Test with negative values."""
        result = _to_xy([-10, -20])
        assert result == (-10.0, -20.0)

    def test_large_values(self):
        """Test with large coordinate values."""
        result = _to_xy([120, 80])
        assert result == (120.0, 80.0)

