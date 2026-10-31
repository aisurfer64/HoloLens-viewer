# Turn the rendered plate face into the textures the 3D plaque uses:
#   plaque-face.jpg  colour map: brushed-silver plate with printed ink and a gold seal
#   plaque-rm.jpg    G = roughness, B = metalness (three.js roughnessMap / metalnessMap)
import sys, numpy as np
from PIL import Image
src, outdir = sys.argv[1], sys.argv[2]
c = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
H, W, _ = c.shape
r, g, b = c[..., 0], c[..., 1], c[..., 2]
rng = np.random.default_rng(7)

# Long horizontal brushing streaks: coarse noise stretched along x plus fine grain.
def streaks(cols, amp):
    n = rng.standard_normal((H, cols)).astype(np.float32)
    xs = np.linspace(0, cols - 1, W)
    i0 = np.floor(xs).astype(int); i1 = np.minimum(i0 + 1, cols - 1); t = (xs - i0)[None, :]
    return amp * (n[:, i0] * (1 - t) + n[:, i1] * t)
brush = streaks(12, 0.6) + streaks(90, 0.35) + 0.15 * rng.standard_normal((H, W)).astype(np.float32)
brush = (brush - brush.mean()) / brush.std()

gold = ((r - b) > 0.25) & (g > 0.5 * r) & (r > 0.4)
ink = np.clip(1 - c.min(2), 0, 1)
ink[gold] = 0

# colour only gets the long streaks (fine grain lives in the roughness map and would bloat the JPEG)
tone = streaks(12, 0.6) + streaks(90, 0.35)
tone = (tone - tone.mean()) / tone.std()
silver = np.array([0.84, 0.85, 0.87], np.float32) * (1 + 0.015 * tone)[..., None]
face = c * silver
face[gold] = c[gold]
Image.fromarray((np.clip(face, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{outdir}/plaque-face.jpg', quality=86, optimize=True, progressive=True)

rough = 0.36 + 0.025 * brush
rough = rough * (1 - ink) + 0.85 * ink
rough[gold] = 0.24
metal = 1 - ink
rm = np.stack([np.ones_like(rough), np.clip(rough, 0, 1), np.clip(metal, 0, 1)], -1)
Image.fromarray((rm * 255 + 0.5).astype(np.uint8)).resize((W // 2, H // 2), Image.BILINEAR).save(f'{outdir}/plaque-rm.jpg', quality=90, optimize=True)
print('size', W, 'x', H)
