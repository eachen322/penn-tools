#!/usr/bin/env python3
"""Capture the preview screenshots shown on the PennTools dashboard tiles.

Usage:
    python3 scripts/capture-tool-screenshots.py            # every tool
    python3 scripts/capture-tool-screenshots.py 7 stactab  # just these

Internal tools are captured from the local dev server, so run `pnpm dev`
first, below the site header. The capture is signed out, so tools that need
a signed-in user show their sign-in screen; take those by hand instead. Needs Google Chrome and Pillow (`pip install pillow`). Images are
written to apps/web/public/dashboard/{id}.jpg at 640x400.

To add a tool, add a row to TARGETS. A `crop` box (left, top, right, bottom)
is in pixels of a 1280px-wide window that is `height` tall; use it when the
top of the page isn't representative.
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "apps/web/public/dashboard"
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)
LOCAL = os.environ.get("PENNTOOLS_URL", "http://localhost:3000")
SIZE = (640, 400)
HEADER = 56  # --header-height in apps/web/src/app/globals.css


def local(path: str) -> dict:
    """A page on the dev server, cropped to the 1280x800 below the site header."""
    return {"url": f"{LOCAL}{path}", "height": 800 + HEADER, "crop": (0, HEADER, 1280, 800 + HEADER)}


TARGETS = {
    # Community tools (apps/web/src/data/communityTools.ts)
    "quakercal": {"url": "https://quakercal.vercel.app/"},
    "mba-tech-internships": {
        # The README, not GitHub's file listing.
        "url": "https://github.com/TrevorDohm/MBA-Tech-Internships-2027",
        "height": 2400,
        "crop": (24, 750, 936, 1320),
    },
    "pm-zero-to-one": {"url": "https://pmzerotoone.netlify.app/"},
    "roic-tree-generator": {"url": "https://roic-tree-generator.vercel.app/"},
    "defluffer": {"url": "https://itayzit.github.io/defluffer/"},
    "thankyougpt": {"url": "https://thank-you-gpt.com"},
    "stactab": {
        # The extension's promo image on its Chrome Web Store listing.
        "url": "https://chromewebstore.google.com/detail/stactab/hdfcdcoogjkdogmnhhopkekanpldoefh",
        "crop": (190, 348, 790, 718),
    },
    "ai-compass": {"url": "https://akshitkalra.com/aicompass"},
    # Registered tools (tools/*), keyed by manifest id
    "resume-customizer": local("/tools/resume-customizer"),
    "career-canvas": local("/tools/career-canvas"),
    "coursematch-assist": local("/tools/coursematch-assist"),
    "penn-planner": local("/tools/penn-planner"),
    "pitch-coach": local("/tools/pitch-coach"),
    "platform-playground": local("/tools/platform-playground"),
    "askpenn": local("/tools/askpenn"),
}


def screenshot(url: str, height: int, dest: Path) -> bool:
    # Some pages (GitHub) keep Chrome alive after the screenshot is written,
    # so wait for the file rather than for the process.
    proc = subprocess.Popen(
        [
            CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--virtual-time-budget=10000", f"--window-size=1280,{height}",
            f"--screenshot={dest}", url,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        proc.wait(timeout=45)
    except subprocess.TimeoutExpired:
        proc.kill()
    return dest.exists() and dest.stat().st_size > 0


def capture(tool_id: str, target: dict, tmp: Path) -> bool:
    raw = tmp / f"{tool_id}.png"
    if not screenshot(target["url"], target.get("height", 800), raw):
        return False
    im = Image.open(raw).convert("RGB")
    if "crop" in target:
        im = im.crop(target["crop"])
    else:
        im = im.crop((0, 0, 1280, 800))
    # Fill 640x400, center-cropping any crop box with a different shape.
    scale = max(SIZE[0] / im.width, SIZE[1] / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - SIZE[0]) // 2, 0
    im = im.crop((left, top, left + SIZE[0], top + SIZE[1]))
    im.save(OUT_DIR / f"{tool_id}.jpg", quality=82, optimize=True, progressive=True)
    return True


def main() -> int:
    ids = sys.argv[1:] or list(TARGETS)
    unknown = [i for i in ids if i not in TARGETS]
    if unknown:
        print(f"Unknown tool ids: {', '.join(unknown)}", file=sys.stderr)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failed = []
    with tempfile.TemporaryDirectory() as tmp:
        for tool_id in ids:
            ok = capture(tool_id, TARGETS[tool_id], Path(tmp))
            print(f"{'ok  ' if ok else 'FAIL'} {tool_id}")
            if not ok:
                failed.append(tool_id)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
