import os
from PIL import Image, ImageDraw

os.makedirs('assets/icons', exist_ok=True)

# Generate icon-16.png, icon-32.png, icon-48.png, icon-128.png
# We render at 4x resolution for perfect antialiasing and downscale with Lanczos
for size in [16, 32, 48, 128]:
    scale = 4
    s = size * scale
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = max(1, s // 14)
    radius = int(s * 0.28)

    # 1. Background squircle with subtle two-tone split: #6D63E6 on top, #5B5BD6 on bottom
    # Draw base bottom color
    draw.rounded_rectangle(
        [margin, margin, s - margin, s - margin],
        radius=radius,
        fill='#5B5BD6'
    )
    # Masked top half in #6D63E6
    top_mask = Image.new('L', (s, s), 0)
    draw_top_mask = ImageDraw.Draw(top_mask)
    draw_top_mask.rounded_rectangle(
        [margin, margin, s - margin, s - margin],
        radius=radius,
        fill=255
    )
    # Cut off bottom half of the mask
    draw_top_mask.rectangle([0, s // 2, s, s], fill=0)

    top_layer = Image.new('RGBA', (s, s), '#6D63E6')
    img.paste(top_layer, (0, 0), top_mask)

    # Re-draw on combined image
    draw = ImageDraw.Draw(img)

    # 2. Dimensions for white forward slash '/' and green vertical bar '|'
    stroke_w = int(s * 0.11)

    # Slash coordinates: from top-right to bottom-left
    slash_start = (int(s * 0.60), int(s * 0.26))
    slash_end = (int(s * 0.36), int(s * 0.74))

    # Green bar coordinates: vertical line on the right
    green_start = (int(s * 0.74), int(s * 0.44))
    green_end = (int(s * 0.74), int(s * 0.74))

    # Helper to draw thick antialiased capsule line
    def draw_capsule(p1, p2, color, w):
        draw.line([p1, p2], fill=color, width=w)
        r = w // 2
        draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=color)
        draw.ellipse([p2[0] - r, p2[1] - r, p2[0] + r, p2[1] + r], fill=color)

    # Draw white slash '/'
    draw_capsule(slash_start, slash_end, '#FFFFFF', stroke_w)

    # Draw green vertical bar '|' (#3DDC97)
    draw_capsule(green_start, green_end, '#3DDC97', stroke_w)

    # Downscale with high-quality resampling
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    out_path = f'assets/icons/icon-{size}.png'
    final_img.save(out_path)
    print(f'Generated {out_path} ({size}x{size})')

print('All Snippo icons generated successfully.')
