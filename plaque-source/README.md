# Plaque face source

`face.html` lays out the plate (text, blue frame, seal, ribbon) at the design's pixel
coordinates. The script title, patent drawing and signature are cut from the original
design image by `prep_assets.py`.

To rebuild `assets/plaque-face.jpg` and `assets/plaque-rm.jpg` after editing `face.html`:

```sh
npm install playwright-core
CHROME_PATH=/path/to/chrome node render_face.mjs "$PWD/face.html" face_hi.png 2.5
python3 make_maps.py face_hi.png ../assets
```
