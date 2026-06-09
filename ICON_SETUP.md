# CANA — App Icon (full-bleed)

## What changed
- The original tree artwork is back (the geometric one was scrapped).
- The icon is now **full-bleed**: the artwork fills the whole square and the
  system applies the rounded corners. The old icon sat in a smaller rounded
  inset, which looked small/double-rounded on recent macOS (Tahoe / 26).

## ⚠️ Copyright note (unchanged risk)
This tree was originally sourced from the internet and is kept here only as a
placeholder at your request. It still carries a copyright-infringement risk.
**Do not submit to the App Store with this artwork** until a graphic designer
replaces it with a genuinely original mark. The size/full-bleed fix here is
purely visual and does not change the rights situation.

## macOS (Electron) — automatic
`build/icon.icns` is regenerated full-bleed. Rebuild the .dmg
("Build CANA app.command"). If Finder shows the old icon, that's icon caching:
`sudo rm -rf /Library/Caches/com.apple.iconservices.store; killall Dock Finder`

## iOS (Xcode) — one manual step
The `ios/` folder isn't in the zip, so set the icon once:
1. Xcode ▸ **App ▸ Assets ▸ AppIcon**.
2. Drag **`public/AppIcon-1024.png`** (1024×1024, opaque, no transparency) onto
   the **1024pt "App Store"** well. Xcode generates the rest.
3. Build & Run. iOS rounds the corners itself.
