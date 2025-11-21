def make_pitch(fig, linecolor="black", lw=2):
    """Add soccer pitch with goal mouths and posts."""
    pitch_shapes = [
        # Outline
        dict(type="rect", x0=0, y0=0, x1=120, y1=80, line=dict(color=linecolor, width=lw)),
        # Halfway line
        dict(type="line", x0=60, y0=0, x1=60, y1=80, line=dict(color=linecolor, width=lw)),
        # Penalty boxes
        dict(type="rect", x0=0, y0=18, x1=18, y1=62, line=dict(color=linecolor, width=lw)),
        dict(type="rect", x0=102, y0=18, x1=120, y1=62, line=dict(color=linecolor, width=lw)),
        # Six-yard boxes
        dict(type="rect", x0=0, y0=30, x1=6, y1=50, line=dict(color=linecolor, width=lw)),
        dict(type="rect", x0=114, y0=30, x1=120, y1=50, line=dict(color=linecolor, width=lw)),
        # Goals (extend beyond pitch)
        dict(type="rect", x0=-2, y0=36, x1=0, y1=44, line=dict(color="black", width=3)),
        dict(type="rect", x0=120, y0=36, x1=122, y1=44, line=dict(color="black", width=3)),
        # Center circle
        dict(type="circle", x0=50, y0=30, x1=70, y1=50, line=dict(color=linecolor, width=lw)),
        # Penalty spots
        dict(type="circle", x0=11, y0=39, x1=13, y1=41, line=dict(color=linecolor, width=lw)),
        dict(type="circle", x0=107, y0=39, x1=109, y1=41, line=dict(color=linecolor, width=lw)),
    ]
    fig.update_layout(shapes=pitch_shapes)
    return fig