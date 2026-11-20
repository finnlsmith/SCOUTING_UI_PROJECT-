#!/usr/bin/env python3
"""Upload the football data sources in backend/data_sources/registry.json to S3.

Run this on the computer that holds the raw data. It shells out to `aws s3 sync`, which
streams files straight from where they are, so no extra local disk space is needed.

SAFE BY DEFAULT: without --execute it only does an `aws s3 sync --dryrun` and uploads nothing.
It never deletes anything in S3 (no --delete).

Examples:
  python scripts/upload_datasets.py --research-root "/Users/me/Downloads/DEV_ENVIRONMENT/data-science-jupyter-template-main/Research" --bucket my-bucket --list
  python scripts/upload_datasets.py --research-root ... --bucket my-bucket --only metrica_sample           # dry run
  python scripts/upload_datasets.py --research-root ... --bucket my-bucket --only metrica_sample --execute  # really upload
  python scripts/upload_datasets.py --research-root ... --bucket my-bucket --execute                       # everything

Credentials come from the normal AWS CLI configuration (aws configure / env vars / SSO).
This script never reads or prints keys.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

REGISTRY = Path(__file__).resolve().parent.parent / "backend" / "data_sources" / "registry.json"


def load_registry():
    with open(REGISTRY, "r", encoding="utf-8") as f:
        return json.load(f)


def build_command(source, root, research_root, bucket, region, execute):
    local = Path(research_root) / source["local_path"]
    dest = f"s3://{bucket}/{root}/{source['id']}/"
    cmd = ["aws", "s3", "sync", str(local), dest, "--only-show-errors"]
    if region:
        cmd += ["--region", region]
    # --exclude/--include are order-sensitive: exclude everything, then include what we want, then exclude the junk.
    if source.get("include"):
        cmd += ["--exclude", "*"]
        for pattern in source["include"]:
            cmd += ["--include", pattern]
    for pattern in source.get("exclude", []):
        cmd += ["--exclude", pattern]
    if not execute:
        cmd.append("--dryrun")
    return cmd, local


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--research-root", required=True, help="folder that local_path entries are relative to")
    p.add_argument("--bucket", required=True, help="destination S3 bucket (yours)")
    p.add_argument("--region", default="us-east-2")
    p.add_argument("--only", action="append", default=[], help="source id to upload (repeatable). Default: all uploadable")
    p.add_argument("--execute", action="store_true", help="actually upload (default is a dry run)")
    p.add_argument("--list", action="store_true", help="show what would be uploaded and whether each local path exists, then exit")
    args = p.parse_args()

    registry = load_registry()
    sources = [s for s in registry["sources"] if s.get("local_path")]
    if args.only:
        known = {s["id"] for s in registry["sources"]}
        unknown = [i for i in args.only if i not in known]
        if unknown:
            sys.exit(f"Unknown source id(s): {', '.join(unknown)}")
        sources = [s for s in sources if s["id"] in args.only]

    if args.list:
        for s in sources:
            local = Path(args.research_root) / s["local_path"]
            status = "OK     " if local.exists() else "MISSING"
            print(f"{status} {s['id']:<26} ~{s['approx_size_gb']:>6} GB  {local}")
        return

    if shutil.which("aws") is None:
        sys.exit("The AWS CLI ('aws') is not installed or not on PATH.")

    mode = "UPLOADING" if args.execute else "DRY RUN (nothing is uploaded; add --execute to upload)"
    print(f"{mode} -> s3://{args.bucket}/{registry['s3_prefix_root']}/\n")

    failures = []
    for s in sources:
        cmd, local = build_command(s, registry["s3_prefix_root"], args.research_root, args.bucket, args.region, args.execute)
        if not local.exists():
            print(f"[skip] {s['id']}: local path not found: {local}")
            failures.append(s["id"])
            continue
        print(f"[{s['id']}] ~{s['approx_size_gb']} GB")
        if subprocess.run(cmd).returncode != 0:
            failures.append(s["id"])

    if failures:
        print(f"\nProblems with: {', '.join(failures)}")
        sys.exit(1)
    print("\nDone." if args.execute else "\nDry run finished. Re-run with --execute to upload.")


if __name__ == "__main__":
    main()
