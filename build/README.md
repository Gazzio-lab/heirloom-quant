# build/ — packaging assets

Drop these files in this folder before running electron-builder:

- `icon.icns` — macOS icon (1024×1024 source recommended)
- `icon.ico`  — Windows icon (256×256 multi-resolution)
- `icon.png`  — Linux/AppImage icon (512×512+)
- `entitlements.mac.plist` — optional mac codesign entitlements

If you don't supply icons, electron-builder uses Electron's default and
emits warnings — the build still succeeds.

Generate from a single 1024×1024 PNG:

```sh
# macOS .icns (uses sips + iconutil, both ship with macOS)
mkdir icon.iconset
sips -z 16 16     source.png --out icon.iconset/icon_16x16.png
sips -z 32 32     source.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     source.png --out icon.iconset/icon_32x32.png
sips -z 64 64     source.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   source.png --out icon.iconset/icon_128x128.png
sips -z 256 256   source.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   source.png --out icon.iconset/icon_256x256.png
sips -z 512 512   source.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   source.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 source.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
```
