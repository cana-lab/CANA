#!/bin/bash
#
# Build the iOS app and open it in Xcode — double-click this file.
#
# What it does, in order:
#   1. Checks Node.js and CocoaPods are installed.
#   2. Builds the web app for iOS (into dist-ios/).
#   3. First run only: creates the native iOS project (npx cap add ios).
#      Later runs: just syncs the fresh build into the existing project.
#   4. Opens the project in Xcode.
#
# After Xcode opens, you still press the ▶ Run button there to build and launch
# the app on a simulator or your iPhone — that final native build happens inside
# Xcode and can't be done from this script.
#
# NOTE: The very first run also needs the Apple Foundation Model plugin added to
# the Xcode project once by hand (drag the two files from ios-plugin/ into the
# App group). See ios-plugin/IOS_SETUP.md, step 6. You only do that once.
#

cd "$(dirname "$0")" || exit 1

clear
echo "======================================"
echo "     Building CANA for iOS"
echo "======================================"
echo ""

# 1) Node.js must be present.
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "  1. Go to https://nodejs.org, download the green 'LTS' installer, run it."
  echo "  2. Double-click 'Build iOS and open Xcode' again."
  echo ""
  echo "Press any key to close."
  read -n 1 -s
  exit 1
fi

# 2) Xcode (and its command-line tools) must be present.
if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "Xcode does not appear to be installed (or its command-line tools aren't set up)."
  echo "  1. Install Xcode from the Mac App Store, open it once, let it finish setup."
  echo "  2. In Terminal you may need: sudo xcode-select --switch /Applications/Xcode.app"
  echo "  3. Double-click this file again."
  echo ""
  echo "Press any key to close."
  read -n 1 -s
  exit 1
fi

# 3) CocoaPods is required by Capacitor for the iOS project.
if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods is not installed. Capacitor needs it for the iOS project."
  echo "  Install it with:   sudo gem install cocoapods"
  echo "  (or, with Homebrew: brew install cocoapods)"
  echo "  Then double-click this file again."
  echo ""
  echo "Press any key to close."
  read -n 1 -s
  exit 1
fi

# 4) Install dependencies.
echo "Installing dependencies (first run can take a few minutes)..."
echo ""
if ! npm install; then
  echo ""
  echo "Install failed. Check your internet connection and try again."
  echo "Press any key to close."
  read -n 1 -s
  exit 1
fi

# 5) Build the web app for the iOS target (relative paths, into dist-ios/).
echo ""
echo "Building the web app for iOS..."
if ! npm run build:ios; then
  echo ""
  echo "Web build failed. Scroll up to see the error."
  echo "Press any key to close."
  read -n 1 -s
  exit 1
fi

# 6) First run vs. later run.
if [ ! -d "ios" ]; then
  echo ""
  echo "First-time setup: creating the native iOS project..."
  echo "(This is the long one — CocoaPods downloads dependencies.)"
  if ! npx cap add ios; then
    echo ""
    echo "Creating the iOS project failed. Scroll up to see the error."
    echo "Press any key to close."
    read -n 1 -s
    exit 1
  fi
  echo ""
  echo "--------------------------------------------------------------------"
  echo "ONE-TIME STEP STILL NEEDED, the first time only:"
  echo "  In Xcode, drag BOTH files from the ios-plugin/ folder into the"
  echo "  'App' group (Copy items if needed, target 'App' checked):"
  echo "      FoundationAIPlugin.swift"
  echo "      FoundationAIPlugin.m"
  echo "  This adds the on-device Apple AI bridge. Full details:"
  echo "  ios-plugin/IOS_SETUP.md (step 6)."
  echo "--------------------------------------------------------------------"
else
  echo ""
  echo "Syncing the fresh build into the existing iOS project..."
  if ! npx cap sync ios; then
    echo ""
    echo "Sync failed. Scroll up to see the error."
    echo "Press any key to close."
    read -n 1 -s
    exit 1
  fi
fi

# 7) Open Xcode.
echo ""
echo "Opening the project in Xcode..."
npx cap open ios

echo ""
echo "======================================"
echo "  Done. Xcode is opening."
echo ""
echo "  In Xcode: pick a simulator or your"
echo "  iPhone at the top, then press  ▶ Run."
echo "======================================"
echo ""
echo "You can close this window."
echo "Press any key to close."
read -n 1 -s
