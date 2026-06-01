#!/bin/bash
#
# Build CANA.app — double-click to turn this project into a real Mac app.
#
# This runs ONCE (or whenever you change the app). It produces:
#   release/CANA-<version>-arm64.dmg   (Apple Silicon)
#   release/CANA-<version>.dmg          (Intel)
# Open the .dmg and drag CANA into Applications. After that, CANA launches
# from Launchpad / Applications like any other Mac app — no Terminal, ever.
#

cd "$(dirname "$0")" || exit 1

clear
echo "======================================"
echo "          Building CANA.app"
echo "======================================"
echo ""

# 1) Node.js must be present (you installed this earlier from nodejs.org).
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "  1. Go to https://nodejs.org, download the green 'LTS' installer, run it."
  echo "  2. Double-click 'Build CANA app' again."
  echo ""
  echo "Press any key to close."
  read -n 1 -s
  exit 1
fi

# 2) Install dependencies (includes Electron — the first run downloads ~150MB,
#    so it can take a few minutes the first time).
echo "Installing build tools (first run downloads Electron; this can take a few minutes)..."
echo ""
if ! npm install; then
  echo ""
  echo "Install failed. Check your internet connection and try again."
  echo "Press any key to close."
  read -n 1 -s
  exit 1
fi
echo ""

# 3) Build the web bundle (relative paths), copy it into the app, and package
#    the macOS .app + .dmg via electron-builder.
echo "Building and packaging the app..."
echo ""
if ! npm run pack:mac; then
  echo ""
  echo "Packaging failed. Scroll up to see the error."
  echo "Press any key to close."
  read -n 1 -s
  exit 1
fi

echo ""
echo "======================================"
echo "  Done. Your app is in the 'release' folder."
echo "======================================"
echo ""
echo "Next: open the .dmg in 'release', then drag CANA into Applications."
echo ""

# 4) Reveal the output in Finder.
open release 2>/dev/null

echo "You can close this window."
sleep 2
