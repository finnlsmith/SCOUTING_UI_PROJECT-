"""
Unit tests for utils.pitch module.
Tests the make_pitch function for adding soccer pitch shapes to Plotly figures.
"""
import pytest
import plotly.graph_objects as go
from utils.pitch import make_pitch


@pytest.mark.unit
class TestMakePitch:
    """Tests for make_pitch function."""

    def test_adds_pitch_to_figure(self):
        """Test that pitch shapes are added to figure."""
        fig = go.Figure()
        result = make_pitch(fig)
        
        assert result is fig  # Should return same figure object
        assert len(fig.layout.shapes) > 0

    def test_default_parameters(self):
        """Test with default parameters."""
        fig = go.Figure()
        make_pitch(fig)
        
        # Should have multiple shapes (outline, lines, boxes, etc.)
        assert len(fig.layout.shapes) >= 10

    def test_custom_line_color(self):
        """Test with custom line color."""
        fig = go.Figure()
        make_pitch(fig, linecolor="red")
        
        # Check that shapes have red color
        shapes = fig.layout.shapes
        assert len(shapes) > 0
        # Most shapes should have red color (goals might be black)
        colored_shapes = [s for s in shapes if hasattr(s, 'line') and s.line.color == "red"]
        assert len(colored_shapes) > 0

    def test_custom_line_width(self):
        """Test with custom line width."""
        fig = go.Figure()
        make_pitch(fig, lw=5)
        
        shapes = fig.layout.shapes
        assert len(shapes) > 0
        # Check that line width is applied
        width_shapes = [s for s in shapes if hasattr(s, 'line') and s.line.width == 5]
        assert len(width_shapes) > 0

    def test_preserves_existing_shapes(self):
        """Test that existing shapes on figure are preserved."""
        fig = go.Figure()
        # Add existing shape
        fig.add_shape(
            type="circle",
            x0=10, y0=10, x1=20, y1=20,
            line=dict(color="blue", width=1)
        )
        initial_count = len(fig.layout.shapes)
        
        make_pitch(fig)
        
        # Should have more shapes than before
        assert len(fig.layout.shapes) > initial_count

    def test_pitch_outline_exists(self):
        """Test that pitch outline rectangle exists."""
        fig = go.Figure()
        make_pitch(fig)
        
        shapes = fig.layout.shapes
        # Find outline rectangle (120x80)
        outline = [s for s in shapes if s.type == "rect" and 
                   hasattr(s, 'x0') and s.x0 == 0 and s.x1 == 120 and s.y0 == 0 and s.y1 == 80]
        assert len(outline) > 0

    def test_halfway_line_exists(self):
        """Test that halfway line exists."""
        fig = go.Figure()
        make_pitch(fig)
        
        shapes = fig.layout.shapes
        # Find halfway line (vertical line at x=60)
        halfway = [s for s in shapes if s.type == "line" and 
                   hasattr(s, 'x0') and s.x0 == 60 and s.x1 == 60]
        assert len(halfway) > 0

    def test_penalty_boxes_exist(self):
        """Test that penalty boxes exist."""
        fig = go.Figure()
        make_pitch(fig)
        
        shapes = fig.layout.shapes
        # Find penalty boxes (18x44 rectangles at each end)
        penalty_boxes = [s for s in shapes if s.type == "rect" and 
                        ((hasattr(s, 'x0') and s.x0 == 0 and s.x1 == 18) or
                         (hasattr(s, 'x0') and s.x0 == 102 and s.x1 == 120))]
        assert len(penalty_boxes) >= 2

    def test_goals_exist(self):
        """Test that goal rectangles exist."""
        fig = go.Figure()
        make_pitch(fig)
        
        shapes = fig.layout.shapes
        # Find goals (extend beyond pitch at x=-2 and x=120)
        goals = [s for s in shapes if s.type == "rect" and 
                ((hasattr(s, 'x0') and s.x0 == -2) or
                 (hasattr(s, 'x0') and s.x0 == 120))]
        assert len(goals) >= 2

    def test_center_circle_exists(self):
        """Test that center circle exists."""
        fig = go.Figure()
        make_pitch(fig)
        
        shapes = fig.layout.shapes
        # Find center circle
        circles = [s for s in shapes if s.type == "circle"]
        assert len(circles) >= 1  # At least center circle, possibly penalty spots

