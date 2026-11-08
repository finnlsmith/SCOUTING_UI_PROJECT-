"""Endpoints that expose the football data sources stored in S3.

The raw files are never streamed through the API (some are over 1 GB). Clients list
what is available and receive short-lived presigned S3 URLs to download directly.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

import data_sources as ds

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])
logger = logging.getLogger(__name__)

PRESIGN_SECONDS = 900  # 15 minutes
MAX_KEYS = 1000


def _s3():
    # Imported lazily so the module loads without AWS configured.
    from cache.s3_client import s3
    return s3


def _require_source(source_id: str) -> dict:
    source = ds.get_source(source_id)
    if source is None:
        raise HTTPException(status_code=404, detail=f"Unknown data source '{source_id}'")
    if source.get("private_only") and not ds.serve_private():
        raise HTTPException(
            status_code=403,
            detail=f"'{source_id}' is flagged private_only and DATASETS_SERVE_PRIVATE is off",
        )
    return source


@router.get("", summary="List all registered data sources")
def list_datasets():
    sources = [ds.public_view(s) for s in ds.all_sources()
               if not (s.get("private_only") and not ds.serve_private())]
    return {"count": len(sources), "sources": sources}


@router.get("/{source_id}", summary="Details for one data source")
def get_dataset(source_id: str):
    return ds.public_view(_require_source(source_id))


@router.get("/{source_id}/files", summary="List the files of a source in S3")
def list_dataset_files(
    source_id: str,
    prefix: str = Query("", description="Sub-path inside the source, e.g. 'Event Data/'"),
    limit: int = Query(200, ge=1, le=MAX_KEYS),
    token: Optional[str] = Query(None, description="continuation_token from a previous page"),
):
    source = _require_source(source_id)
    if ".." in prefix or prefix.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid prefix")

    client = _s3()
    root = ds.s3_prefix(source)
    kwargs = {"Bucket": client.bucket, "Prefix": root + prefix, "MaxKeys": limit}
    if token:
        kwargs["ContinuationToken"] = token
    try:
        resp = client.client.list_objects_v2(**kwargs)
    except Exception as e:
        logger.error(f"S3 list failed for {source_id}: {e}")
        raise HTTPException(status_code=502, detail="Could not list files from S3")

    files = [
        {"key": o["Key"][len(root):], "size_bytes": o["Size"], "last_modified": o["LastModified"].isoformat()}
        for o in resp.get("Contents", [])
    ]
    return {
        "source": source_id,
        "count": len(files),
        "files": files,
        "next_token": resp.get("NextContinuationToken"),
    }


@router.get("/{source_id}/download", summary="Presigned download URL for one file")
def download_dataset_file(
    source_id: str,
    key: str = Query(..., description="File path inside the source, as returned by /files"),
):
    source = _require_source(source_id)
    if ".." in key or key.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid key")

    client = _s3()
    full_key = ds.s3_prefix(source) + key
    try:
        client.client.head_object(Bucket=client.bucket, Key=full_key)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found in this source")

    url = client.client.generate_presigned_url(
        "get_object",
        Params={"Bucket": client.bucket, "Key": full_key},
        ExpiresIn=PRESIGN_SECONDS,
    )
    return {"url": url, "expires_in": PRESIGN_SECONDS}
