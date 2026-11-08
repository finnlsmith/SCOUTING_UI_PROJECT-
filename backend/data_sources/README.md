# Data sources

`registry.json` is the single list of every football data source in the project (license, size, what it can answer, where it lives in S3). The raw files are **not** in git; they live in S3 under `datasets/<id>/`.

## One-time setup (on the computer that holds the raw data)

1. In **your own** AWS account, create an S3 bucket and an IAM user/key that can read and write only that bucket.
2. `aws configure` (keys go in `~/.aws`, never in this repo).
3. Check what will be uploaded:
   ```bash
   python scripts/upload_datasets.py --research-root "<path to Research folder>" --bucket <your-bucket> --list
   ```
4. Dry run one source, then upload it:
   ```bash
   python scripts/upload_datasets.py --research-root "<path>" --bucket <your-bucket> --only metrica_sample
   python scripts/upload_datasets.py --research-root "<path>" --bucket <your-bucket> --only metrica_sample --execute
   ```
   Without `--execute` nothing is uploaded. The script never deletes anything in S3.
5. Upload the rest, smallest first, then the large ones (`pff_wc2022`, `statsbomb_open`).

## Pointing the app at the bucket

Set these on the backend (local `backend/.env` and the Render service environment):

```
S3_BUCKET_NAME=<your-bucket>
AWS_REGION=<bucket region>
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
DATASETS_SERVE_PRIVATE=true   # false blocks the private_only sources
```

The bucket also needs the app's existing root-level files (`matches_df.csv`, etc.).

## API

| Endpoint | What it does |
| --- | --- |
| `GET /api/datasets` | all registered sources |
| `GET /api/datasets/{id}` | one source |
| `GET /api/datasets/{id}/files?prefix=&limit=&token=` | files in S3 (paged) |
| `GET /api/datasets/{id}/download?key=` | 15-minute presigned download URL |

Files are never streamed through the API (some are over 1 GB). Use the presigned URL.

## Not in S3 yet

- `skillcorner_opendata_2425`: not downloaded anywhere. Clone `https://github.com/SkillCorner/opendata` (git lfs), set its `local_path`, then upload.
- `elastic`: clone `https://github.com/hyunsungkim-ds/elastic`; it is code, not data.
