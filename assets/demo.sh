#!/usr/bin/env bash
# vhs 0.12 cannot encode with ffmpeg 9 (it exits without writing a GIF), so
# record raw frames with vhs and encode them here: composite the text and
# cursor layers, add the padding vhs would have drawn, and hand off to gifski.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf frames composed && mkdir composed
sed 's|^Output demo.gif|Output frames/|' demo.tape > .frames.tape
vhs .frames.tape >/dev/null
rm .frames.tape
for t in frames/frame-text-*.png; do
  n=${t##*-}
  magick "$t" "frames/frame-cursor-$n" -composite \
    -bordercolor '#1e1e2e' -border 28 "composed/$n"
done
gifski --fps 20 --quality 85 --width "$(magick identify -format %w composed/00001.png)" -o demo.gif composed/*.png
rm -rf frames composed
ls -la demo.gif
