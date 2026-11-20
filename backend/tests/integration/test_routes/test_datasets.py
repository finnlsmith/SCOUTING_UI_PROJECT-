"""Integration tests for /api/datasets (S3 mocked with moto)."""
import pytest

BUCKET = "capstone-soccer-data"


@pytest.fixture
def seeded_s3():
    """Moto bucket with a few fake files, wired into the app's S3 client."""
    import boto3
    from moto import mock_aws
    from cache.s3_client import s3

    with mock_aws():
        s3_mock = boto3.client("s3", region_name="us-east-2")
        s3_mock.create_bucket(
            Bucket=BUCKET,
            CreateBucketConfiguration={"LocationConstraint": "us-east-2"},
        )
        s3_mock.put_object(Bucket=BUCKET, Key="datasets/metrica_sample/readme.md", Body=b"hello")
        s3_mock.put_object(Bucket=BUCKET, Key="datasets/metrica_sample/Sample_Game_1/events.csv", Body=b"a,b\n1,2\n")
        s3_mock.put_object(Bucket=BUCKET, Key="datasets/openplay/matches.parquet", Body=b"x")

        original_client, original_bucket = s3.client, s3.bucket
        s3.client, s3.bucket = s3_mock, BUCKET
        yield s3_mock
        s3.client, s3.bucket = original_client, original_bucket


@pytest.mark.integration
def test_list_datasets(client):
    r = client.get("/api/datasets")
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == len(body["sources"]) >= 10
    assert all("local_path" not in s for s in body["sources"])


@pytest.mark.integration
def test_get_dataset_and_404(client):
    assert client.get("/api/datasets/pff_wc2022").json()["name"].startswith("PFF")
    assert client.get("/api/datasets/nope").status_code == 404


@pytest.mark.integration
def test_private_sources_blocked_when_switched_off(client, monkeypatch):
    monkeypatch.setenv("DATASETS_SERVE_PRIVATE", "false")
    assert client.get("/api/datasets/openplay").status_code == 403
    ids = [s["id"] for s in client.get("/api/datasets").json()["sources"]]
    assert "openplay" not in ids and "whoscored_pl2021" not in ids


@pytest.mark.integration
def test_private_sources_served_by_default(client, monkeypatch):
    monkeypatch.delenv("DATASETS_SERVE_PRIVATE", raising=False)
    assert client.get("/api/datasets/openplay").status_code == 200


@pytest.mark.integration
def test_list_files_strips_source_prefix(client, seeded_s3):
    r = client.get("/api/datasets/metrica_sample/files")
    assert r.status_code == 200
    keys = {f["key"] for f in r.json()["files"]}
    assert keys == {"readme.md", "Sample_Game_1/events.csv"}  # openplay file not included


@pytest.mark.integration
def test_list_files_rejects_path_traversal(client, seeded_s3):
    assert client.get("/api/datasets/metrica_sample/files", params={"prefix": "../openplay/"}).status_code == 400


@pytest.mark.integration
def test_download_returns_presigned_url(client, seeded_s3):
    r = client.get("/api/datasets/metrica_sample/download", params={"key": "readme.md"})
    assert r.status_code == 200
    assert "readme.md" in r.json()["url"]
    assert r.json()["expires_in"] == 900


@pytest.mark.integration
def test_download_missing_and_traversal(client, seeded_s3):
    assert client.get("/api/datasets/metrica_sample/download", params={"key": "nope.txt"}).status_code == 404
    assert client.get("/api/datasets/metrica_sample/download", params={"key": "../openplay/matches.parquet"}).status_code == 400
