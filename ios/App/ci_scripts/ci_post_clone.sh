#!/bin/sh
# Xcode Cloud — post-clone setup for CANA iOS.
# -----------------------------------------------------------------------------
# Xcode Cloud clones a bare checkout of the git repo. Two things the local
# build takes for granted are deliberately NOT committed (they are generated)
# and must be produced here before xcodebuild runs:
#
#   1. ios/App/App/public/   — the built web app (vite, BUILD_TARGET=ios)
#      plus the generated ios/App/App/capacitor.config.json
#   2. ios/App/Pods/         — CocoaPods dependencies (pod install)
#
# Apple runs this script with the working directory set to ios/App/ci_scripts;
# CI_PRIMARY_REPOSITORY_PATH points at the repository root.
set -e
set -x

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

# Tooling: the Xcode Cloud image ships Homebrew but neither Node nor CocoaPods.
brew install node cocoapods

# 1) Web layer — build the iOS bundle and copy it into the native project.
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci --no-audit --no-fund
npm run build:ios          # vite → dist-ios/ (syncs MARKETING_VERSION first)
npx cap copy ios           # dist-ios/ → ios/App/App/public + capacitor.config.json

# 2) Native dependencies.
cd ios/App
pod install

# 3) Unique build number per cloud build. Apple requires a strictly
#    increasing CFBundleVersion across TestFlight uploads; CI_BUILD_NUMBER
#    increments with every Xcode Cloud build, so we stamp it into the project
#    (locally, scripts/sync-versions.cjs --bump-build does the same job).
if [ -n "$CI_BUILD_NUMBER" ]; then
  sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = $CI_BUILD_NUMBER;/g" App.xcodeproj/project.pbxproj
  echo "ci_post_clone: CURRENT_PROJECT_VERSION = $CI_BUILD_NUMBER"
fi

echo "ci_post_clone: web layer + pods ready"
