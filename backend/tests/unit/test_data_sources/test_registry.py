"""Unit tests for the data source registry and the upload command builder."""
import importlib.util
import json
from pathlib import Path

import pytest

import data_sources as ds

UPLOAD_SCRIPT = Path(__file__).resolve().parents[4] / "scripts" / "upload_datasets.py"


def _load_upload_module():
    spec = importlib.util.spec_from_file_location("upload_datasets", UPLOAD_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.mark.unit
def test_registry_is_valid_json_with_unique_ids():
    ids = [s["id"] for s in ds.all_sources()]
    assert len(ids) == len(set(ids))
    assert len(ids) >= 10


@pytest.mark.unit
@pytest.mark.parametrize("field", ["id", "name", "kind", "description", "license", "private_only", "approx_size_gb"])
def test_every_source_has_required_fields(field):
    for s in ds.all_sources():
        assert field in s, f"{s.get('id')} is missing {field}"


@pytest.mark.unit
def test_local_paths_are_relative_and_safe():
    for s in ds.all_sources():
        lp = s.get("local_path")
        if lp:
            assert not lp.startswith("/")
            assert ".." not in lp


@pytest.mark.unit
def test_private_only_sources_are_the_scraped_ones():
    private = {s["id"] for s in ds.all_sources() if s["private_only"]}
    assert private == {"openplay", "whoscored_pl2021"}


@pytest.mark.unit
def test_s3_prefix_and_public_view_hide_local_paths():
    src = ds.get_source("pff_wc2022")
    assert ds.s3_prefix(src) == "datasets/pff_wc2022/"
    view = ds.public_view(src)
    assert "local_path" not in view
    assert view["uploadable"] is True


@pytest.mark.unit
def test_sources_without_local_data_are_not_uploadable():
    assert ds.is_uploadable(ds.get_source("skillcorner_opendata_2425")) is False
    assert ds.is_uploadable(ds.get_source("elastic")) is False


@pytest.mark.unit
def test_serve_private_env(monkeypatch):
    monkeypatch.delenv("DATASETS_SERVE_PRIVATE", raising=False)
    assert ds.serve_private() is True
    monkeypatch.setenv("DATASETS_SERVE_PRIVATE", "false")
    assert ds.serve_private() is False


@pytest.mark.unit
def test_upload_command_is_dry_run_by_default_and_never_deletes():
    up = _load_upload_module()
    src = ds.get_source("pff_wc2022")
    cmd, _ = up.build_command(src, "datasets", "/data/Research", "my-bucket", "us-east-2", execute=False)
    assert "--dryrun" in cmd
    assert "--delete" not in cmd
    assert cmd[:3] == ["aws", "s3", "sync"]
    assert "s3://my-bucket/datasets/pff_wc2022/" in cmd
    assert "_cache/*" in cmd


@pytest.mark.unit
def test_upload_command_include_filter_comes_after_exclude_all():
    up = _load_upload_module()
    src = ds.get_source("whoscored_pl2021")
    cmd, _ = up.build_command(src, "datasets", "/data/Research", "b", "us-east-2", execute=True)
    assert "--dryrun" not in cmd
    assert cmd.index("--exclude") < cmd.index("--include")
    assert "20-21_plEventsData.csv" in cmd
