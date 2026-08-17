#!/bin/sh
set -e
out=$(mktemp -d)/icon.iconset
mkdir -p "$out"
for pair in "16 16x16" "32 16x16@2x" "32 32x32" "64 32x32@2x" "128 128x128" "256 128x128@2x" "256 256x256" "512 256x256@2x" "512 512x512" "1024 512x512@2x"; do
  size=${pair%% *}
  name=${pair##* }
  sips -z "$size" "$size" resources/icon.png --out "$out/icon_$name.png" > /dev/null
done
iconutil -c icns "$out" -o resources/icon.icns
echo "resources/icon.icns"
