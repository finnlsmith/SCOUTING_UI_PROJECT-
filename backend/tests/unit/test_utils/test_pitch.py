"""
Unit tests for pitch utility functions.
"""
import pytest
import plotly.graph_objects as go
from utils.pitch import make_pitch


@pytest.mark.unit
class TestPitch:
    """Test pitch drawing functions."""
    
    def test_make_pitch_creates_figure(self):
        """Test make_pitch creates a figure with shapes."""
        # Arrange
        fig = go.Figure()
        
        # Act
        result = make_pitch(fig)
        
        # Assert
        assert result is not None
        assert len(result.layout.shapes) > 0
    
    def test_make_pitch_has_outline(self):
        """Test make_pitch includes pitch outline."""
        # Arrange
        fig = go.Figure()
        
        # Act
        result = make_pitch(fig)
        
        # Assert
        shapes = result.layout.shapes
        outline = [s for s in shapes if hasattr(s, 'type') and s.type == 'rect' and hasattr(s, 'x0') and s.x0 == 0 and hasattr(s, 'x1') and s.x1 == 120]
        assert len(outline) > 0
    
    def test_make_pitch_has_halfway_line(self):
        """Test make_pitch includes halfway line."""
        # Arrange
        fig = go.Figure()
        
        # Act
        result = make_pitch(fig)
        
        # Assert
        shapes = result.layout.shapes
        halfway = [s for s in shapes if hasattr(s, 'type') and s.type == 'line' and hasattr(s, 'x0') and s.x0 == 60]
        assert len(halfway) > 0
    
    def test_make_pitch_has_penalty_boxes(self):
        """Test make_pitch includes penalty boxes."""
        # Arrange
        fig = go.Figure()
        
        # Act
        result = make_pitch(fig)
        
        # Assert
        shapes = result.layout.shapes
        penalty_boxes = [
            s for s in shapes 
            if hasattr(s, 'type') and s.type == 'rect' 
            and ((hasattr(s, 'x0') and s.x0 == 0) or (hasattr(s, 'x1') and s.x1 == 120))
            and hasattr(s, 'x0') and hasattr(s, 'x1') and (s.x1 - s.x0) == 18  # 18-yard box width
        ]
        assert len(penalty_boxes) >= 2  # Two penalty boxes
    
    def test_make_pitch_custom_linecolor(self):
        """Test make_pitch accepts custom line color."""
        # Arrange
        fig = go.Figure()
        
        # Act
        result = make_pitch(fig, linecolor="blue")
        
        # Assert
        shapes = result.layout.shapes
        # Check that at least one shape has blue color
        colors = [s.line.color for s in shapes if hasattr(s, 'line') and hasattr(s.line, 'color')]
        assert 'blue' in colors
    
    def test_make_pitch_custom_linewidth(self):
        """Test make_pitch accepts custom line width."""
        # Arrange
        fig = go.Figure()
        
        # Act
        result = make_pitch(fig, lw=5)
        
        # Assert
        shapes = result.layout.shapes
        widths = [s.line.width for s in shapes if hasattr(s, 'line') and hasattr(s.line, 'width')]
        assert 5 in widths
    
    def test_make_pitch_preserves_existing_shapes(self):
        """Test make_pitch doesn't remove existing shapes."""
        # Arrange
        fig = go.Figure()
        fig.add_shape(type="circle", x0=50, y0=50, x1=60, y1=60)  # Existing shape
        initial_shapes = len(fig.layout.shapes) if fig.layout.shapes else 0
        
        # Act
        result = make_pitch(fig)
        
        # Assert
        final_shapes = len(result.layout.shapes)
        assert final_shapes > initial_shapes  # Should add pitch shapes
    
    def test_make_pitch_has_goals(self):
        """Test make_pitch includes goal indicators."""
        # Arrange
        fig = go.Figure()
        
        # Act
        result = make_pitch(fig)
        
        # Assert
        shapes = result.layout.shapes
        goals = [
            s for s in shapes 
            if hasattr(s, 'type') and s.type == 'rect' 
            and ((hasattr(s, 'x0') and s.x0 == -2) or (hasattr(s, 'x1') and s.x1 == 122))  # Goals extend beyond pitch
        ]
        assert len(goals) >= 2  # Two goals

