#!/usr/bin/env python3
"""Build resources/icon.icns following the Apple icon grid.

Composes a 1024x1024 transparent canvas holding a centered 824x824
rounded-rect tile (corner radius ~185px) filled with the app's black,
with the white wordmark centered on top. Emits the full iconset and
runs `iconutil` (macOS only) to produce the .icns.

Usage: python3 scripts/make-mac-icon.py
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageStat

REPO_ROOT = Path(__file__).resolve().parent.parent
RESOURCES = REPO_ROOT / "resources"
SOURCE_ICON = RESOURCES / "icon.png"
WORDMARK_SOURCE = RESOURCES / "wordmark-icon-source.png"
OUTPUT_ICNS = RESOURCES / "icon.icns"

CANVAS_SIZE = 1024
TILE_SIZE = 824
CORNER_RADIUS = 185
WORDMARK_WIDTH_FRACTION = 0.80
SUPERSAMPLE = 4


def sample_tile_color(icon_path: Path) -> tuple:
    """Sample the dominant background color of the existing full-bleed icon."""
    im = Image.open(icon_path).convert("RGBA")
    colors = im.getcolors(maxcolors=1_000_000)
    if not colors:
        raise RuntimeError(f"could not read colors from {icon_path}")
    colors.sort(key=lambda c: -c[0])
    _, color = colors[0]
    return color


def build_rounded_tile(size: int, radius: int, fill: tuple) -> Image.Image:
    """Draw a rounded-rect tile at 4x supersampling and downscale for clean corners."""
    big_size = size * SUPERSAMPLE
    big_radius = radius * SUPERSAMPLE
    tile = Image.new("RGBA", (big_size, big_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tile)
    draw.rounded_rectangle(
        [0, 0, big_size - 1, big_size - 1], radius=big_radius, fill=fill
    )
    return tile.resize((size, size), Image.LANCZOS)


def trimmed_wordmark(wordmark_path: Path) -> Image.Image:
    wm = Image.open(wordmark_path).convert("RGBA")
    bbox = wm.split()[-1].getbbox()
    if bbox is None:
        raise RuntimeError(f"wordmark source {wordmark_path} has no visible pixels")
    return wm.crop(bbox)


def alpha_weighted_centroid_y(image: Image.Image) -> float:
    """Mean y of the image's alpha channel, weighted by alpha value per row.

    This slanted script wordmark carries more ink in its upper rows (the
    tall upstroke) than its lower rows, so its trimmed bbox center sits
    below where the mark visually reads as centered. Centroid-based
    placement corrects for that instead of eyeballing an offset.
    """
    alpha = image.split()[-1]
    width, height = alpha.size
    total = 0.0
    weighted = 0.0
    for y in range(height):
        row_sum = ImageStat.Stat(alpha.crop((0, y, width, y + 1))).sum[0]
        total += row_sum
        weighted += row_sum * y
    return weighted / total if total else height / 2


def compose_master(tile_fill: tuple) -> Image.Image:
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))

    tile = build_rounded_tile(TILE_SIZE, CORNER_RADIUS, tile_fill)
    tile_offset = (CANVAS_SIZE - TILE_SIZE) // 2
    canvas.alpha_composite(tile, (tile_offset, tile_offset))

    wordmark = trimmed_wordmark(WORDMARK_SOURCE)
    target_width = int(TILE_SIZE * WORDMARK_WIDTH_FRACTION)
    scale = target_width / wordmark.width
    target_height = max(1, round(wordmark.height * scale))
    wordmark = wordmark.resize((target_width, target_height), Image.LANCZOS)

    # Horizontal: bbox-centered (the left/right ink imbalance is small,
    # under 2% of width, so bbox centering already reads centered).
    wm_x = (CANVAS_SIZE - wordmark.width) // 2

    # Vertical: center the alpha-weighted centroid, not the bbox, since
    # this wordmark's ink mass sits well above its bbox midpoint.
    centroid_y = alpha_weighted_centroid_y(wordmark)
    wm_y = round(CANVAS_SIZE / 2 - centroid_y)

    canvas.alpha_composite(wordmark, (wm_x, wm_y))

    return canvas


BASE_SIZES = [16, 32, 128, 256, 512]
DOUBLES = {16: 32, 32: 64, 128: 256, 256: 512, 512: 1024}


def emit_iconset(master: Image.Image, iconset_dir: Path) -> None:
    iconset_dir.mkdir(parents=True, exist_ok=True)
    for size in BASE_SIZES:
        master.resize((size, size), Image.LANCZOS).save(
            iconset_dir / f"icon_{size}x{size}.png"
        )
    for base, doubled in DOUBLES.items():
        master.resize((doubled, doubled), Image.LANCZOS).save(
            iconset_dir / f"icon_{base}x{base}@2x.png"
        )


def run_iconutil(iconset_dir: Path, output_path: Path) -> None:
    subprocess.run(
        ["iconutil", "-c", "icns", str(iconset_dir), "-o", str(output_path)],
        check=True,
    )


def main() -> None:
    tile_fill = sample_tile_color(SOURCE_ICON)
    print(f"Sampled tile color from {SOURCE_ICON.name}: {tile_fill}")

    master = compose_master(tile_fill)

    with tempfile.TemporaryDirectory() as tmp:
        iconset_dir = Path(tmp) / "icon.iconset"
        emit_iconset(master, iconset_dir)
        run_iconutil(iconset_dir, OUTPUT_ICNS)
    print(f"Wrote {OUTPUT_ICNS}")

    preview_dir = REPO_ROOT / ".superpowers" / "sdd" / "mac-icon"
    preview_dir.mkdir(parents=True, exist_ok=True)
    preview_path = preview_dir / "icon-preview-512.png"
    master.resize((512, 512), Image.LANCZOS).save(preview_path)
    print(f"Wrote preview {preview_path}")


if __name__ == "__main__":
    if sys.platform != "darwin":
        print("iconutil is macOS-only; this script must run on macOS.", file=sys.stderr)
        sys.exit(1)
    main()
