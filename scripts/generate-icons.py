#!/usr/bin/env python3
"""Fledge customer panel — favicon / PWA icon generator (SVG-first + Pillow).

The mark: a flat geometric house on a sky→blue rounded tile (panel accents
blue-500/sky-500). No owl anywhere here — the owl PNGs under
`public/badges/` are trust badges and stay badges.

SVG-first: `public/icons/favicon.svg` is the vector source browsers get.
Every PNG/ICO is redrawn from the SAME 512-unit coordinates with Pillow
(4x supersample → LANCZOS), so no cairosvg/rsvg/inkscape is required.

Run from the customer-panel root:

    python3 scripts/generate-icons.py

Writes:
    public/icons/favicon.svg            vector source (rounded tile)
    public/icons/favicon-32.png         tab favicon
    public/icons/apple-touch-icon.png   iOS home screen (full-bleed square)
    public/icons/icon-192.png           PWA "any" (rounded tile)
    public/icons/icon-512.png           PWA "any" (rounded tile)
    public/icons/icon-maskable-{192,512}.png  PWA maskable (full-bleed, 80% mark)
    src/app/favicon.ico                 multi-size 16/32/48
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "public" / "icons"
APP_FAVICON = ROOT / "src" / "app" / "favicon.ico"

# ---- palette (panel accents: sky-500 → blue-600) ----
SKY = "#0EA5E9"
BLUE = "#2563EB"
WHITE = "#FFFFFF"

# ---- geometry, 512-unit canvas (SVG and Pillow share these) ----
CANVAS = 512
TILE_RADIUS = 112          # squircle-ish tile corner
STROKE = 20                # centred round-join stroke: rounds the roof corners
MARK_CENTER = (256, 266)   # optical centre of the house
# roof path (stroke expands it by STROKE/2 = 10 on every side)
ROOF = [(256, 118), (108, 248), (404, 248)]
# body rect (x, y, w, h) — drawn with a centred STROKE outline as well
BODY = (158, 248, 196, 170)
BODY_RADIUS = 16
# door knock-out: arch top (circle) + rect below
DOOR = (208, 322, 96, 106)  # x, y, w, h
DOOR_ARCH_R = 48

SUPERSAMPLE = 4


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def gradient_square(px: int) -> Image.Image:
    """Vertical sky→blue linear gradient, same stops as the SVG def."""
    top, bottom = hex_rgb(SKY), hex_rgb(BLUE)
    img = Image.new("RGB", (px, px))
    draw = ImageDraw.Draw(img)
    for y in range(px):
        t = y / (px - 1)
        draw.line(
            [(0, y), (px, y)],
            fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)),
        )
    return img


def render(px: int, *, radius_units: int = TILE_RADIUS, mark_scale: float = 1.0) -> Image.Image:
    """Render one icon at `px` square, in 512-unit geometry."""
    k = px / CANVAS
    cx, cy = MARK_CENTER

    def p(x: float, y: float) -> tuple[float, float]:
        return (cx + (x - cx) * mark_scale) * k, (cy + (y - cy) * mark_scale) * k

    icon = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    tile = Image.new("L", (px, px), 0)
    ImageDraw.Draw(tile).rounded_rectangle(
        [0, 0, px - 1, px - 1], radius=round(radius_units * k), fill=255
    )
    icon.paste(gradient_square(px), (0, 0), tile)

    # house layer (white), then knock the door out of it
    house = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    hd = ImageDraw.Draw(house)
    stroke = max(1, round(STROKE * k * mark_scale))
    roof = [p(x, y) for x, y in ROOF]
    hd.polygon(roof, fill=WHITE)
    hd.line(roof + [roof[0]], fill=WHITE, width=stroke, joint="curve")
    bx, by, bw, bh = BODY
    hd.rounded_rectangle(
        [p(bx, by), p(bx + bw, by + bh)],
        radius=round(BODY_RADIUS * k * mark_scale),
        fill=WHITE,
        outline=WHITE,
        width=stroke,
    )
    dx, dy, dw, dh = DOOR
    hd.rectangle([p(dx, dy + DOOR_ARCH_R), p(dx + dw, dy + dh)], fill=(0, 0, 0, 0))
    hd.ellipse([p(dx, dy), p(dx + dw, dy + 2 * DOOR_ARCH_R)], fill=(0, 0, 0, 0))

    return Image.alpha_composite(icon, house)


def render_svg() -> str:
    """Vector source — same numbers, same gradient stops."""
    roof = " ".join(f"{x},{y}" for x, y in ROOF)
    bx, by, bw, bh = BODY
    dx, dy, dw, dh = DOOR
    arch = DOOR_ARCH_R
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-labelledby="title">
<title id="title">Fledge</title>
<!-- Flat geometric house mark on a sky-to-blue tile. Owl artwork is for trust
     badges only (public/badges) — never the app icon. Regenerate with
     `python3 scripts/generate-icons.py` from the customer-panel root. -->
<defs>
<linearGradient id="tile" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="512">
<stop stop-color="{SKY}"/><stop offset="1" stop-color="{BLUE}"/>
</linearGradient>
</defs>
<rect width="512" height="512" rx="{TILE_RADIUS}" fill="url(#tile)"/>
<g fill="{WHITE}" stroke="{WHITE}" stroke-width="{STROKE}" stroke-linejoin="round">
<polygon points="{roof}"/>
<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="{BODY_RADIUS}"/>
</g>
<path d="M{dx} {dy + dh}V{dy + arch}a{arch} {arch} 0 0 1 {dw} 0v{dh - arch}Z" fill="url(#tile)"/>
</svg>
"""


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)

    svg_path = ICONS / "favicon.svg"
    svg_path.write_text(render_svg(), encoding="utf-8")
    print(f"wrote {svg_path.relative_to(ROOT)}")

    master = render(CANVAS * SUPERSAMPLE)

    def save(img: Image.Image, size: int, path: Path) -> None:
        img.resize((size, size), Image.Resampling.LANCZOS).save(path)
        print(f"wrote {path.relative_to(ROOT)} ({size}x{size})")

    save(master, 32, ICONS / "favicon-32.png")
    save(render(CANVAS * SUPERSAMPLE, radius_units=0), 180, ICONS / "apple-touch-icon.png")
    save(master, 192, ICONS / "icon-192.png")
    save(master, 512, ICONS / "icon-512.png")
    maskable = render(CANVAS * SUPERSAMPLE, radius_units=0, mark_scale=0.8)
    save(maskable, 192, ICONS / "icon-maskable-192.png")
    save(maskable, 512, ICONS / "icon-maskable-512.png")

    ico = master.resize((48, 48), Image.LANCZOS)
    ico.save(APP_FAVICON, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"wrote {APP_FAVICON.relative_to(ROOT)} (16/32/48)")


if __name__ == "__main__":
    main()
