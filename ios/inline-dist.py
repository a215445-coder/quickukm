#!/usr/bin/env python3
"""Inline the built Vite app into one HTML file for the offline iOS shell."""

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
WWW = ROOT / "ios" / "QuickUKM" / "www"

index_path = DIST / "index.html"
if not index_path.exists():
    raise SystemExit("dist/index.html is missing — run `npm run build -- --base=./` first.")

html = index_path.read_text(encoding="utf-8")

js_match = re.search(r'<script[^>]*src="([^"]+)"[^>]*></script>', html)
css_match = re.search(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', html)
if not js_match or not css_match:
    raise SystemExit("Could not find the built JS/CSS tags in dist/index.html.")

js_path = DIST / js_match.group(1).lstrip("./")
css_path = DIST / css_match.group(1).lstrip("./")
js = js_path.read_text(encoding="utf-8").replace("</script>", r"<\/script>")
css = css_path.read_text(encoding="utf-8")

html = html.replace(
    js_match.group(0),
    '<script type="module">\n' + js + "\n</script>",
)
html = html.replace(css_match.group(0), "<style>\n" + css + "\n</style>")

# The native shell does not need PWA files; its Info.plist controls the status bar.
html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', "", html)
html = re.sub(r'<link[^>]*rel="apple-touch-icon"[^>]*>\s*', "", html)
html = re.sub(r'<link[^>]*rel="modulepreload"[^>]*>\s*', "", html)

WWW.mkdir(parents=True, exist_ok=True)
for child in WWW.iterdir():
    if child.is_dir():
        shutil.rmtree(child)
    else:
        child.unlink()
(WWW / "index.html").write_text(html, encoding="utf-8")
print(f"Wrote {WWW / 'index.html'} ({len(html):,} bytes)")
