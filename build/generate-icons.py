import os
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageDraw

os.makedirs('assets/icons', exist_ok=True)

# Master SVG for Concept 4: The Modern Expansion Quote (Quotation marks with cursor bar on Azure Blue squircle)
SVG_CONTENT = """<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="squircle">
      <rect x="24" y="24" width="464" height="464" rx="114" />
    </clipPath>
    <linearGradient id="bg" x1="120" y1="24" x2="392" y2="488" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3296FD"/>
      <stop offset="100%" stop-color="#1872DE"/>
    </linearGradient>
  </defs>

  <!-- Blue Squircle Background -->
  <g clip-path="url(#squircle)">
    <rect x="24" y="24" width="464" height="464" fill="url(#bg)"/>

    <!-- 45-degree long shadow -->
    <path d="M 268 164
             L 488 384
             L 488 488
             L 348 488
             L 100 280
             L 170 274
             L 196 274
             L 268 274
             Z"
          fill="#1058B8"
          fill-opacity="0.32" />

    <!-- Additional shadow under cursor bar -->
    <path d="M 280 382
             L 386 488
             L 488 488
             L 488 438
             L 418 382
             Z"
          fill="#0D4FA8"
          fill-opacity="0.25" />

    <!-- Left Quote Mark -->
    <path d="M 98 274
             L 98 214
             C 98 162 128 136 162 136
             L 170 164
             C 146 166 132 182 132 208
             L 168 208
             L 168 274
             Z"
          fill="#FFFFFF" />

    <!-- Right Quote Mark -->
    <path d="M 196 274
             L 196 214
             C 196 162 226 136 260 136
             L 268 164
             C 244 166 230 182 230 208
             L 266 208
             L 266 274
             Z"
          fill="#FFFFFF" />

    <!-- Text Cursor / Underscore -->
    <rect x="278" y="348" width="140" height="34" rx="4" fill="#FFFFFF" />
  </g>
</svg>"""

with tempfile.TemporaryDirectory() as tmpdir:
    svg_path = os.path.join(tmpdir, 'icon.svg')
    with open(svg_path, 'w') as f:
        f.write(SVG_CONTENT)
    
    # Render master high-res raster using macOS qlmanage (WebKit native renderer)
    subprocess.run(
        ['qlmanage', '-t', '-s', '512', '-o', tmpdir, svg_path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True
    )
    
    rendered_png = os.path.join(tmpdir, 'icon.svg.png')
    master_img = Image.open(rendered_png).convert('RGBA')

    # Apply true alpha transparency mask to eliminate opaque white canvas from qlmanage
    scale = 4
    ms = 512 * scale
    mask_hi = Image.new('L', (ms, ms), 0)
    m_draw = ImageDraw.Draw(mask_hi)
    m_draw.rounded_rectangle([24 * scale, 24 * scale, 488 * scale, 488 * scale], radius=114 * scale, fill=255)
    mask = mask_hi.resize((512, 512), Image.Resampling.LANCZOS)

    r, g, b, _ = master_img.split()
    master_transparent = Image.merge('RGBA', (r, g, b, mask))

    # Downscale using high-precision Lanczos resampling
    for size in [16, 32, 48, 128]:
        resized = master_transparent.resize((size, size), Image.Resampling.LANCZOS)
        # Ensure corners have absolute zero alpha (prevent faint interpolation halo)
        arr = np.array(resized)
        arr[arr[:, :, 3] < 15, 3] = 0
        cleaned = Image.fromarray(arr)
        out_path = f'assets/icons/icon-{size}.png'
        cleaned.save(out_path)
        print(f'Generated {out_path} ({size}x{size})')

print('All SayMore icons generated successfully with transparent background.')

