#!/usr/bin/env python3
"""Fledge customer panel — favicon / PWA icon generator (SVG-first).

Mark: Heroicons v2 `home` (24px solid, MIT © Tailwind Labs) in white on the
sky→blue rounded tile that matches the panel accents (blue-500 / sky-500).
SVG is the source of truth; every PNG/ICO is rasterised from those same SVG
strings with cairosvg (no hand-drawn shapes, no PIL path guessing).

The mark's placement is MEASURED, not hardcoded: a probe render of the glyph
gives its exact ink box, and every target (tile mark, maskable, badge) is
centred and scaled from that box. This is what keeps the glyph optically
centred — the old hardcoded transform shipped ~6% off-centre (up-left).

Requires cairosvg:
    python3 -m venv /tmp/pipenv && /tmp/pipenv/bin/pip install cairosvg
Run from the customer-panel root:
    /tmp/pipenv/bin/python scripts/generate-icons.py

When the artwork changes, bump BOTH the `?v=` on the manifest icon URLs
(public/manifest.webmanifest) AND the `manifest:` href in src/app/layout.tsx —
an installed Android WebAPK / desktop PWA shortcut only re-reads its launcher
icon when Chrome sees the manifest change; the URL bump makes that check fire
on the next launch instead of Chrome's lazy schedule. (There is no API to
force-update an already-installed PWA icon instantly: reinstall is the
immediate path, the manifest change lands within ~a day.)
"""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

try:
    import cairosvg
except ModuleNotFoundError:  # pragma: no cover - env setup hint
    raise SystemExit(
        "cairosvg is required (SVG -> PNG). Create the venv first:\n"
        "  python3 -m venv /tmp/pipenv && /tmp/pipenv/bin/pip install cairosvg\n"
        "then run: /tmp/pipenv/bin/python scripts/generate-icons.py"
    )

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "public" / "icons"
APP = ROOT / "src" / "app"

CANVAS = 512
TILE_RADIUS = 112
GRAD_TOP = "#0EA5E9"  # sky-500
GRAD_BOT = "#2563EB"  # blue-600

# Longest ink edge of the tile mark, as a fraction of the canvas.
MARK_FRACTION = 0.64
# Maskable icons keep their glyph inside the maskable safe zone.
MASKABLE_MARK_SCALE = 0.8
# Notification badge (Android status bar / Chrome tray): white glyph on a
# transparent canvas — Android masks it to a monochrome silhouette — sized to
# fill the small badge slot.
BADGE_MARK_FRACTION = 0.8
# Probe scale used to measure the glyph's ink box (24-unit glyph coords).
PROBE_SCALE = 20

# Heroicons v2 `home` (solid, 24-unit box) — MIT, https://heroicons.com
ICON_PATHS = (
    "M11.4697 3.84099C11.7626 3.5481 12.2374 3.5481 12.5303 3.84099L21.2197 12.5303C21.5126 "
    "12.8232 21.9874 12.8232 22.2803 12.5303C22.5732 12.2374 22.5732 11.7626 22.2803 11.4697"
    "L13.591 2.78033C12.7123 1.90165 11.2877 1.90165 10.409 2.78033L1.71967 11.4697C1.42678 "
    "11.7626 1.42678 12.2374 1.71967 12.5303C2.01256 12.8232 2.48744 12.8232 2.78033 12.5303"
    "L11.4697 3.84099Z",
    "M12 5.43198L20.159 13.591C20.1887 13.6207 20.2191 13.6494 20.25 13.6771V19.875C20.25 "
    "20.9105 19.4105 21.75 18.375 21.75H15C14.5858 21.75 14.25 21.4142 14.25 21V16.5C14.25 "
    "16.0858 13.9142 15.75 13.5 15.75H10.5C10.0858 15.75 9.75 16.0858 9.75 16.5V21C9.75 "
    "21.4142 9.41421 21.75 9 21.75H5.625C4.58947 21.75 3.75 20.9105 3.75 19.875V13.6771C3.78093 "
    "13.6494 3.81127 13.6207 3.84099 13.591L12 5.43198Z",
)


def _path_elems() -> str:
    return "".join(f'<path d="{d}"/>' for d in ICON_PATHS)


def raster(svg: str, size: int) -> Image.Image:
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def _glyph_ink_box() -> tuple[float, float, float, float]:
    """Ink box (gx0, gy0, gw, gh) of ICON_PATHS in 24-unit glyph coordinates.

    Measured from a probe render at a known scale (no translation), so the
    maths stays correct even if the glyph paths are swapped for another icon.
    """
    probe = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">'
        f'<g transform="scale({PROBE_SCALE})" fill="#ffffff">{_path_elems()}</g></svg>'
    )
    bbox = raster(probe, CANVAS).split()[-1].getbbox()
    if bbox is None:  # pragma: no cover - the glyph always renders ink
        raise RuntimeError("glyph probe render came out empty; cannot place the mark")
    gx0 = bbox[0] / PROBE_SCALE
    gy0 = bbox[1] / PROBE_SCALE
    gw = (bbox[2] - bbox[0]) / PROBE_SCALE
    gh = (bbox[3] - bbox[1]) / PROBE_SCALE
    return gx0, gy0, gw, gh


def _mark_transform(fraction: float) -> str:
    """Transform placing the glyph's ink box centred, longest edge = fraction."""
    gx0, gy0, gw, gh = _glyph_ink_box()
    s = fraction * CANVAS / max(gw, gh)
    tx = (CANVAS - s * gw) / 2 - s * gx0
    ty = (CANVAS - s * gh) / 2 - s * gy0
    return f"translate({tx:.4f} {ty:.4f}) scale({s:.5f})"


def svg_doc(*, radius: int = TILE_RADIUS, mark_scale: float = 1.0) -> str:
    """Rounded-tile mark (favicon + PWA icons). radius=0 → full-bleed square."""
    icon = (
        f'<g transform="{_mark_transform(MARK_FRACTION * mark_scale)}" fill="#ffffff">'
        f"{_path_elems()}</g>"
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">'
        f'<title>Fledge</title><defs><linearGradient id="tile" x1="0" y1="0" x2="0" '
        f'y2="{CANVAS}" gradientUnits="userSpaceOnUse"><stop stop-color="{GRAD_TOP}"/>'
        f'<stop offset="1" stop-color="{GRAD_BOT}"/></linearGradient></defs>'
        f'<rect x="0" y="0" width="{CANVAS}" height="{CANVAS}" rx="{radius}" fill="url(#tile)"/>'
        f"{icon}</svg>"
    )


def badge_svg_doc() -> str:
    """Notification badge: white glyph, transparent background, no tile."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">'
        f"<title>Fledge badge</title>"
        f'<g transform="{_mark_transform(BADGE_MARK_FRACTION)}" fill="#ffffff">'
        f"{_path_elems()}</g></svg>"
    )


def main() -> None:
    rounded = svg_doc()
    flat = svg_doc(radius=0)
    flat_small_mark = svg_doc(radius=0, mark_scale=MASKABLE_MARK_SCALE)

    (ICONS / "favicon.svg").write_text(rounded)
    print(f"wrote {(ICONS / 'favicon.svg').relative_to(ROOT)}")

    for svg, size, name in (
        (rounded, 32, "favicon-32.png"),
        (flat, 180, "apple-touch-icon.png"),
        (rounded, 192, "icon-192.png"),
        (rounded, 512, "icon-512.png"),
        (flat_small_mark, 192, "icon-maskable-192.png"),
        (flat_small_mark, 512, "icon-maskable-512.png"),
    ):
        raster(svg, size).save(ICONS / name)
        print(f"wrote {(ICONS / name).relative_to(ROOT)} ({size}x{size})")

    ico = raster(rounded, 256)
    ico.save(APP / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"wrote {(APP / 'favicon.ico').relative_to(ROOT)} (16/32/48)")

    # Notification badge — see badge_svg_doc.
    raster(badge_svg_doc(), 96).save(ICONS / "badge.png")
    print(f"wrote {(ICONS / 'badge.png').relative_to(ROOT)} (96x96)")


if __name__ == "__main__":
    main()
