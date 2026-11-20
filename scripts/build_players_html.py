"""Build the Players section as ONE offline HTML file (no server, S3 or login needed).

1. saves every API response the section can ask for (scripts/snapshot_players.py; backend must be running), unless --data is given
2. builds the frontend in offline mode (SNAPSHOT=1: only the Players section, hash routes, one JS and one CSS file)
3. writes a single .html: styles, script and the saved data (gzip + base64) all inside it

Usage: python scripts/build_players_html.py <out.html> [--data players_snapshot.json]
"""
import base64
import gzip
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONT = ROOT / "frontend"


def main():
    out = Path(sys.argv[1]).resolve()
    data = Path(sys.argv[sys.argv.index("--data") + 1]).resolve() if "--data" in sys.argv else None
    if data is None:
        data = Path(tempfile.mkdtemp()) / "players_snapshot.json"
        subprocess.run([sys.executable, str(ROOT / "scripts/snapshot_players.py"), str(data)], check=True)

    build = FRONT / "build-offline"
    env = {**os.environ, "SNAPSHOT": "1", "BUILD_PATH": "build-offline", "GENERATE_SOURCEMAP": "false",
           "REACT_APP_BACKEND_URL": "http://offline.invalid/api", "CI": "false", "PUBLIC_URL": "."}
    subprocess.run(["npm", "run", "build"], cwd=FRONT, env=env, check=True)

    js = (build / "app.js").read_text().replace("</script", "<\\/script")
    css = (build / "app.css").read_text() if (build / "app.css").exists() else ""
    blob = base64.b64encode(gzip.compress(data.read_bytes(), 9)).decode()

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Playing at speed: the player card</title>
<style>{css}</style>
</head>
<body>
<div id="root"><p style="font-family:sans-serif;padding:40px">Loading the player card…</p></div>
<script type="text/plain" id="app-js">{js}</script>
<script type="text/plain" id="data-gz">{blob}</script>
<script>
(async () => {{
  const raw = Uint8Array.from(atob(document.getElementById("data-gz").textContent), c => c.charCodeAt(0));
  const text = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  window.__SNAPSHOT__ = JSON.parse(text);
  const s = document.createElement("script");
  s.textContent = document.getElementById("app-js").textContent;
  document.body.appendChild(s);
}})().catch(e => {{ document.getElementById("root").textContent = "Could not open this file in this browser: " + e.message; }});
</script>
</body>
</html>
"""
    out.write_text(html)
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
