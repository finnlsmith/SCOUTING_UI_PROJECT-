"""
Unit tests for coordinate utility functions.
"""
import pytest
import json
import numpy as np
from utils.coords import _to_xy


@pytest.mark.unit
class TestCoords:
    """Test coordinate transformation functions."""
    
    def test_to_xy_with_valid_json_string(self):
        """Test _to_xy with valid JSON string location."""
        # Arrange
        location = '[102.5, 35.2]'
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert x == 102.5
        assert y == 35.2
    
    def test_to_xy_with_list(self):
        """Test _to_xy with list input."""
        # Arrange
        location = [98.3, 42.1]
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert x == 98.3
        assert y == 42.1
    
    def test_to_xy_with_tuple(self):
        """Test _to_xy with tuple input."""
        # Arrange
        location = (105.0, 38.0)
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert x == 105.0
        assert y == 38.0
    
    def test_to_xy_with_invalid_json(self):
        """Test _to_xy with invalid JSON string."""
        # Arrange
        location = 'invalid json'
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert np.isnan(x)
        assert np.isnan(y)
    
    def test_to_xy_with_empty_string(self):
        """Test _to_xy with empty string."""
        # Arrange
        location = ''
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert np.isnan(x)
        assert np.isnan(y)
    
    def test_to_xy_with_none(self):
        """Test _to_xy with None."""
        # Arrange
        location = None
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert np.isnan(x)
        assert np.isnan(y)
    
    def test_to_xy_with_short_list(self):
        """Test _to_xy with list that has less than 2 elements."""
        # Arrange
        location = [102.5]  # Only one element
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert np.isnan(x)
        assert np.isnan(y)
    
    def test_to_xy_with_extra_elements(self):
        """Test _to_xy with list that has more than 2 elements."""
        # Arrange
        location = [102.5, 35.2, 10.0]  # Three elements
        
        # Act
        x, y = _to_xy(location)
        
        # Assert - Should still work, just use first two
        assert x == 102.5
        assert y == 35.2
    
    def test_to_xy_with_float_values(self):
        """Test _to_xy preserves float precision."""
        # Arrange
        location = [102.56789, 35.12345]
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert x == 102.56789
        assert y == 35.12345
    
    def test_to_xy_with_integer_values(self):
        """Test _to_xy converts integers to floats."""
        # Arrange
        location = [102, 35]
        
        # Act
        x, y = _to_xy(location)
        
        # Assert
        assert x == 102.0
        assert y == 35.0
        assert isinstance(x, float)
        assert isinstance(y, float)

