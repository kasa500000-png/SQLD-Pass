"""Rebuild SQLD Pass brand assets with Pillow and the bundled OFL font."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
out = root / 'assets' / 'brand'
out.mkdir(parents=True, exist_ok=True)
size = 2048
blue = '#2457D6'

def mark(background):
    image = Image.new('RGBA', (size, size), background)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(root / 'assets/fonts/pretendard/Pretendard-ExtraBold.otf'), 1100)
    draw.text((1024, 925), 'S', font=font, anchor='mm', fill='white')
    draw.rounded_rectangle((1150, 1210, 1530, 1590), radius=115, fill='#C7F1DC')
    draw.line([(1235, 1390), (1303, 1455), (1445, 1318)], fill='#145E40', width=45, joint='curve')
    return image.resize((1024, 1024), Image.Resampling.LANCZOS)

mark(blue).convert('RGB').save(out / 'icon.png')
adaptive = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
adaptive.alpha_composite(mark((0, 0, 0, 0)).resize((820, 820), Image.Resampling.LANCZOS), (102, 102))
adaptive.save(out / 'adaptive-foreground.png')
mark(blue).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS).save(out / 'play-icon.png')
print('Generated icon.png (1024 RGB), adaptive-foreground.png, play-icon.png (512 RGB).')
