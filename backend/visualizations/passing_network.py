"""
Passing network visualization module.

Generates interactive Plotly-based passing networks showing player connections.
"""

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import re
import traceback
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from utils.coords import _to_xy
from utils.pitch import make_pitch
from config.settings import TEAM_COLORS
from visualizations.helpers import parse_positions_cell


async def passing_network_like_matplotlib(filename: str, team: str, min_passes: int = 1, flip: bool = False):
    """
    Generate an interactive passing network visualization for a team.
    
    Args:
        filename: S3 key of match events file
        team: Team name to generate network for
        min_passes: Minimum passes between players to display
        flip: Flip pitch orientation horizontally
        
    Returns:
        JSONResponse with Plotly figure and metadata
        
    Raises:
        HTTPException: Various errors for missing data or processing failures
    """
    from cache import cache, s3
    
    # Build cache key including all parameters
    cache_key = f"passnet:{filename}:{team}:{min_passes}:{flip}:plotly"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="passing_network")
    if cached_result is not None:
        return JSONResponse(content=jsonable_encoder(cached_result))
    
    try:
        # -------- Load events CSV with caching --------
        events = s3.get_dataframe(filename, cache_type="events_df")
        if events is None:
            raise HTTPException(status_code=404, detail=f"S3 key not found: {filename}")
        cols = set(events.columns)

        # Minimum required geometry columns
        required_geom = {"location", "pass_end_location"}
        missing_geom = required_geom - cols
        if missing_geom:
            raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(sorted(missing_geom))}")

        if "type" not in cols or "team" not in cols:
            raise HTTPException(status_code=400, detail="Missing required columns 'type' and/or 'team'")

        # -------- Derive match_id from filename to locate lineups file(s) --------
        m = re.search(r"\d+", filename or "")
        match_id = m.group() if m else None

        # -------- Load lineups (best-effort) & build Starting XI whitelist --------
        starting_ids, starting_names = set(), set()

        async def _try_load_lineups():
            candidates = ["lineups_df.csv"]
            for key in candidates:
                try:
                    df = s3.get_dataframe(key, cache_type="events_df")
                    if df is not None:
                        return df
                except Exception:
                    continue
            return None

        lineups_df = await _try_load_lineups()

        if lineups_df is not None and "positions" in lineups_df.columns:
            lu = lineups_df.copy()
            lu["positions_parsed"] = lu["positions"].apply(parse_positions_cell)
            mask_start = lu["positions_parsed"].apply(
                lambda lst: any(
                    isinstance(d, dict) and (
                        d.get("start_reason") == "Starting XI"
                        or d.get("starting_reason") == "Starting XI"
                    )
                    for d in (lst or [])
                )
            )

            starters = lu[mask_start].copy()

            # Prefer player_id if present, else fallback to player names
            if "player_id" in starters.columns:
                with pd.option_context("mode.chained_assignment", None):
                    pid_series = pd.to_numeric(starters["player_id"], errors="coerce")
                starting_ids = set(pid_series.dropna().astype(int).tolist())
                # If player_id are not numeric (rare), keep raw values too
                if not starting_ids and starters["player_id"].notna().any():
                    starting_ids = set(starters["player_id"].astype(str).tolist())
            if "player" in starters.columns:
                starting_names = set(starters["player"].astype(str).tolist())

        # -------- Build events working frame & player ids/names --------
        df = events.copy()

        # Source/destination ids
        if "player_id" in cols:
            df["src_id"] = df["player_id"]
        else:
            df["src_name"] = df.get("player", "").astype(str)

        if "pass_recipient_id" in cols:
            df["dst_id"] = df["pass_recipient_id"]
        else:
            df["dst_name"] = df.get("pass_recipient", "").astype(str)

        # If ids missing, synthesize consistent ids from names
        if "src_id" not in df.columns or "dst_id" not in df.columns:
            src_names = df.get("src_name", pd.Series([], dtype=str)).astype(str)
            dst_names = df.get("dst_name", pd.Series([], dtype=str)).astype(str)
            all_names = pd.Index(src_names).append(pd.Index(dst_names)).astype(str).unique()
            name_to_id = {n: i for i, n in enumerate(all_names)}
            if "src_id" not in df.columns:
                df["src_id"] = src_names.map(name_to_id)
            if "dst_id" not in df.columns:
                df["dst_id"] = dst_names.map(name_to_id)

        # Map id -> display name
        id_to_name = {}
        if "player" in df.columns:
            id_to_name.update(
                df.loc[df["team"] == team, ["src_id", "player"]]
                  .dropna()
                  .drop_duplicates("src_id")
                  .set_index("src_id")["player"]
                  .astype(str)
                  .to_dict()
            )
        if "pass_recipient" in df.columns:
            add = (
                df.loc[df["team"] == team, ["dst_id", "pass_recipient"]]
                     .dropna()
                     .drop_duplicates("dst_id")
                     .set_index("dst_id")["pass_recipient"]
                     .astype(str)
                  .to_dict()
            )
            for k, v in add.items():
                id_to_name.setdefault(k, v)

        # -------- Build Starting XI id whitelist (fallback to names if needed) --------
        starting_id_whitelist = set()
        if starting_ids:
            # Normalize types if df["src_id"] is integer dtype
            try:
                if pd.api.types.is_integer_dtype(df["src_id"]):
                    starting_id_whitelist = set(int(i) for i in starting_ids)
                else:
                    starting_id_whitelist = set(starting_ids)
            except Exception:
                starting_id_whitelist = set(starting_ids)
        elif starting_names:
            # Map names to ids via id_to_name
            name_to_ids = {}
            for pid, nm in id_to_name.items():
                name_to_ids.setdefault(nm, set()).add(pid)
            for nm in starting_names:
                for pid in name_to_ids.get(nm, []):
                    starting_id_whitelist.add(pid)

        # -------- Filter to this team's completed passes (StatsBomb: pass_outcome NaN == completed) --------
        passes = df[(df["type"] == "Pass") & (df["team"] == team)].copy()
        if passes.empty:
            raise HTTPException(status_code=404, detail=f"No passes for team '{team}'")
        if "pass_outcome" in passes.columns:
            passes = passes[passes["pass_outcome"].isna()].copy()

        # Keep only Starting XI → both ends must be starters
        if starting_id_whitelist:
            passes = passes[
                passes["src_id"].isin(starting_id_whitelist)
                & passes["dst_id"].isin(starting_id_whitelist)
            ].copy()
            if passes.empty:
                raise HTTPException(
                    status_code=404,
                    detail=f"No completed passes among Starting XI for team '{team}'",
                )

        # -------- Coordinates (uses global helper _to_xy) --------
        passes[["sx", "sy"]] = passes["location"].apply(_to_xy).to_list()
        passes[["ex", "ey"]] = passes["pass_end_location"].apply(_to_xy).to_list()

        # -------- Touches (team-only; then restrict to starters if present) --------
        touches = (
            df.loc[df["team"] == team, "src_id"]
              .value_counts()
              .rename_axis("player_id")
              .reset_index(name="touches")
        )
        if starting_id_whitelist:
            touches = touches[touches["player_id"].isin(starting_id_whitelist)]

        # -------- Average positions: mean of start (as passer) + end (as receiver) --------
        start_pos = passes.groupby("src_id")[["sx", "sy"]].mean().rename(columns={"sx": "x_s", "sy": "y_s"})
        recv_pos = passes.groupby("dst_id")[["ex", "ey"]].mean().rename(columns={"ex": "x_r", "ey": "y_r"})
        recv_pos.index.name = "src_id"
        avg_pos = start_pos.join(recv_pos, how="outer").reset_index(names=["player_id"])
        avg_pos["x"] = avg_pos[["x_s", "x_r"]].mean(axis=1, skipna=True)
        avg_pos["y"] = avg_pos[["y_s", "y_r"]].mean(axis=1, skipna=True)
        avg_pos = avg_pos[["player_id", "x", "y"]]

        # -------- Edges: pass counts between pairs (min_passes threshold) --------
        edges = (
            passes.groupby(["src_id", "dst_id"], dropna=True)
                  .size().rename("count").reset_index()
                  .rename(columns={"src_id": "player_id", "dst_id": "pass_recipient_id"})
        )
        edges = edges[edges["count"] >= int(min_passes)]

        # -------- Nodes table --------
        nodes = avg_pos.merge(touches, on="player_id", how="left")
        nodes["touches"] = nodes["touches"].fillna(0).astype(int)
        nodes["name"] = nodes["player_id"].map(id_to_name).fillna(nodes["player_id"].astype(str))

        if flip:
            nodes["x"] = 120 - nodes["x"]

        # -------- Merge node coords onto edges --------
        edges = edges.merge(
            nodes[["player_id", "x", "y"]].rename(columns={"player_id": "player_id_src", "x": "sx", "y": "sy"}),
            left_on="player_id", right_on="player_id_src", how="left"
        ).merge(
            nodes[["player_id", "x", "y"]].rename(columns={"player_id": "player_id_dst", "x": "ex", "y": "ey"}),
            left_on="pass_recipient_id", right_on="player_id_dst", how="left"
        )

        # -------- Build Plotly figure --------
        fig = go.Figure()

        # Edges: gray lines, width ~ log(pass count)
        if not edges.empty:
            for r in edges.itertuples(index=False):
                sx, sy, ex, ey = float(r.sx), float(r.sy), float(r.ex), float(r.ey)
                width = float(0.5 + 0.5 * np.log1p(int(r.count)))
                fig.add_trace(go.Scatter(
                    x=[sx, ex], y=[sy, ey],
                    mode="lines",
                    line=dict(width=width, color="gray"),
                    opacity=0.5,
                    hoverinfo="text",
                    text=f"{id_to_name.get(r.player_id, r.player_id)} → {id_to_name.get(r.pass_recipient_id, r.pass_recipient_id)}<br>passes: {int(r.count)}",
                    showlegend=False,
                ))

        # Nodes: size ~ touches
        if not nodes.empty:
            size_list = (14 + 0.045 * nodes["touches"]).clip(lower=8, upper=32).astype(float).tolist()
            touches_list = nodes["touches"].astype(int).tolist()
            x_list = nodes["x"].astype(float).tolist()
            y_list = nodes["y"].astype(float).tolist()
            text_list = nodes["name"].astype(str).tolist()

            team_color = TEAM_COLORS.get(team, "#1f77b4")
            fig.add_trace(go.Scatter(
                x=x_list, y=y_list,
                mode="markers+text",
                text=text_list,
                textposition="top center",
                marker=dict(size=size_list, line=dict(width=2, color="black"), color=team_color),
                hoverinfo="text",
                textfont=dict(size=11),
                name="players",
                customdata=[[t] for t in touches_list],
                hovertemplate="<b>%{text}</b><br>touches: %{customdata[0]}<extra></extra>",
            ))

        fig = make_pitch(fig)
        fig.update_layout(
            title=f"Passing Network — {team} (size ~ touches){' — Starting XI' if starting_id_whitelist else ''}",
            xaxis=dict(showgrid=False, visible=False, range=[0, 120]),
            yaxis=dict(showgrid=False, visible=False, range=[0, 80]),
            plot_bgcolor="white", height=600, width=900
        )
        fig.update_yaxes(autorange="reversed")

        payload = fig.to_dict()
        payload.update({
            "team": team,
            "node_count": int(nodes.shape[0]),
            "edge_count": int(edges.shape[0]),
            "min_passes": int(min_passes),
            "starting_xi_filter_applied": bool(starting_id_whitelist),
            "match_id": match_id if match_id is not None else None,
        })
        
        # Cache the result
        cache.set(cache_key, payload, cache_type="passing_network")
        
        return JSONResponse(content=jsonable_encoder(payload))

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"passing_network failed: {type(e).__name__}: {e}")

