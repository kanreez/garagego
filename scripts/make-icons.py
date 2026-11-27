"""Draws the GarageGo icons (an ochre garage door with a stencilled G) into assets/images
and the web build's public/ folder. Run: python scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf"
OCHRE = (168, 112, 42)
CONCRETE = (237, 235, 228)
GRAPHITE = (35, 39, 43)

def door(size: int, pad: float = 0.0, rounded: bool = True, bg=None) -> Image.Image:
    """The logo door inside a size x size square. pad = fraction of margin around the door."""
    img = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = int(size * pad)
    x0, y0, x1, y1 = m, m, size - m - 1, size - m - 1
    w = x1 - x0
    radius = int(w * 0.10) if rounded else 0
    d.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=OCHRE)
    d.rounded_rectangle((x0, y0, x1, y0 + int(w * 0.16)), radius=radius, fill=(113, 75, 28))
    d.rectangle((x0, y0 + int(w * 0.08), x1, y0 + int(w * 0.16)), fill=(113, 75, 28))
    ribs = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ribs)
    step = max(4, int(w * 0.075))
    y = y0 + int(w * 0.16) + step
    while y < y1 - step:
        rd.line((x0, y, x1, y), fill=(130, 86, 32, 255), width=max(1, int(w * 0.012)))
        y += step
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=255)
    img.paste(ribs, (0, 0), Image.composite(ribs.split()[3], Image.new("L", (size, size), 0), mask))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(FONT), int(w * 0.78))
    bbox = d.textbbox((0, 0), "G", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    gx = x0 + (w - tw) // 2 - bbox[0]
    gy = y0 + int(w * 0.20) + (w - int(w * 0.20) - th) // 2 - bbox[1] - int(w * 0.02)
    d.text((gx, gy), "G", font=font, fill=(255, 255, 255))
    return img

def on_square(size: int, door_pad: float) -> Image.Image:
    """Opaque icon: the door centred on a concrete square (iOS/Android home-screen icons)."""
    base = Image.new("RGBA", (size, size), CONCRETE + (255,))
    base.alpha_composite(door(size, pad=door_pad))
    return base.convert("RGB")

def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print("wrote", path.relative_to(ROOT), img.size)

assets = ROOT / "assets/images"
public = ROOT / "public"

save(on_square(1024, 0.17), assets / "icon.png")
save(door(432, pad=0.22, rounded=True), assets / "android-icon-foreground.png")
save(Image.new("RGB", (432, 432), CONCRETE), assets / "android-icon-background.png")
save(door(1024, pad=0.14), assets / "splash-icon.png")
save(on_square(48, 0.06), assets / "favicon.png")

save(on_square(192, 0.15), public / "icon-192.png")
save(on_square(512, 0.15), public / "icon-512.png")
save(on_square(512, 0.30), public / "icon-maskable-512.png")
save(on_square(180, 0.13), public / "apple-touch-icon.png")
save(on_square(32, 0.04), public / "favicon.png")
