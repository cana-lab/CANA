#!/bin/bash
# ============================================================================
#  CANA — Build a SIGNED + NOTARIZED Mac app (double-click me)
# ----------------------------------------------------------------------------
#  This produces a .dmg that opens on ANY Mac with a normal double-click —
#  no "app is damaged", no Terminal needed for the people you share it with.
#
#  FIRST RUN: it will ask for three things once and store them safely in your
#  macOS Keychain. After that, every build is fully automatic.
#
#  You need (one-time):
#   1. Apple ID  (your developer account email)
#   2. App-specific password  (make one at https://account.apple.com → Sign-In
#      & Security → App-Specific Passwords — NOT your normal Apple password)
#   3. Team ID  (10 characters, at https://developer.apple.com/account →
#      Membership details)
#   4. A "Developer ID Application" certificate installed in your login
#      Keychain (Xcode ▸ Settings ▸ Accounts ▸ your team ▸ Manage Certificates
#      ▸ + ▸ Developer ID Application). See SIGNING_AND_NOTARIZING.md.
# ============================================================================
set -e
cd "$(dirname "$0")"

KEYCHAIN_SERVICE="cana-notarize"
echo "──────────────────────────────────────────────"
echo "  CANA — Signed & Notarized Mac build"
echo "──────────────────────────────────────────────"

# --- Load or capture credentials (stored in the macOS Keychain) -------------
get_secret() { security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$1" -w 2>/dev/null || true; }
set_secret() { security add-generic-password -U -s "$KEYCHAIN_SERVICE" -a "$1" -w "$2" >/dev/null 2>&1; }

APPLE_ID="$(get_secret apple_id)"
APPLE_TEAM_ID="$(get_secret team_id)"
APPLE_APP_SPECIFIC_PASSWORD="$(get_secret app_password)"

if [ -z "$APPLE_ID" ] || [ -z "$APPLE_TEAM_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
  echo ""
  echo "  First-time setup — I'll store these in your Keychain so you never"
  echo "  have to type them again. (Input is hidden for the password.)"
  echo ""
  if [ -z "$APPLE_ID" ]; then
    read -r -p "  Apple ID (developer email): " APPLE_ID
    set_secret apple_id "$APPLE_ID"
  fi
  if [ -z "$APPLE_TEAM_ID" ]; then
    read -r -p "  Team ID (10 characters): " APPLE_TEAM_ID
    set_secret team_id "$APPLE_TEAM_ID"
  fi
  if [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
    read -r -s -p "  App-specific password: " APPLE_APP_SPECIFIC_PASSWORD; echo ""
    set_secret app_password "$APPLE_APP_SPECIFIC_PASSWORD"
  fi
  echo "  ✓ Saved to Keychain (service: $KEYCHAIN_SERVICE)."
fi
export APPLE_ID APPLE_TEAM_ID APPLE_APP_SPECIFIC_PASSWORD

# --- Sanity checks ----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "  ✗ Node.js not found. Install it from https://nodejs.org, then re-run."; exit 1
fi
if ! security find-identity -v -p codesigning 2>/dev/null | grep -q "Developer ID Application"; then
  echo ""
  echo "  ✗ No \"Developer ID Application\" certificate found in your Keychain."
  echo "    Create one in Xcode ▸ Settings ▸ Accounts ▸ (your team) ▸"
  echo "    Manage Certificates ▸ +  ▸ Developer ID Application."
  echo "    See SIGNING_AND_NOTARIZING.md for screenshots. Then re-run."
  exit 1
fi

# --- Build, sign, notarize, staple (electron-builder does all of it) --------
echo ""
echo "  Installing dependencies (first run only, may take a minute)…"
ELECTRON_SKIP_BINARY_DOWNLOAD=0 npm install --no-audit --no-fund >/dev/null 2>&1 || npm install

echo "  Building, signing and notarizing… (notarization can take 2–15 min)"
npm run pack:mac

echo ""
echo "──────────────────────────────────────────────"
echo "  ✓ Done. Your signed, notarized .dmg is in:  release/"
open release 2>/dev/null || true
echo "  Upload that .dmg to your GitHub Release. People can download and"
echo "  open it with a normal double-click — no Terminal, no warnings."
echo "──────────────────────────────────────────────"
