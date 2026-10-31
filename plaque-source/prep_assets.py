# Cut the raster-only pieces (script title, patent drawing, signature) out of the
# design, upscale them, and turn the ink into an alpha channel on transparent PNGs.
import sys, numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')

def ink_png(box, scale, name, lo, hi, color=(0, 0, 0), blur=0.0, gray=False):
    c = im.crop(box)
    c = c.resize((c.width * scale, c.height * scale), Image.LANCZOS)
    a = np.asarray(c).astype(float)
    # drop any blue frame pixels that sneak into a crop
    blue = (a[..., 2] - a[..., 0]) > 40
    lum = a.mean(2)
    lum[blue] = 255
    L = Image.fromarray(lum.astype(np.uint8))
    if blur:
        L = L.filter(ImageFilter.GaussianBlur(blur))
    lum = np.asarray(L).astype(float)
    alpha = np.clip((hi - lum) / (hi - lo), 0, 1)
    rgba = np.zeros(a.shape[:2] + (4,), np.uint8)
    rgba[..., :3] = color
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(f'{out}/{name}.png', optimize=True)
    print(name, box, '->', rgba.shape[1], 'x', rgba.shape[0])

# Smooth-and-threshold makes the script lettering and signature read like clean vector ink.
ink_png((170, 280, 456, 702), 6, 'title', 70, 170, blur=4.0)
ink_png((780, 1436, 1084, 1512), 6, 'signature', 60, 185, blur=2.5)
ink_png((530, 500, 1064, 726), 4, 'drawing', 40, 235, color=(20, 20, 20), blur=1.2)
