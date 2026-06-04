#!/bin/bash
# CANA — safe repo updater
# -----------------------------------------------------------------------------
# Double-click this to sync a freshly-unzipped CANA version into THIS repo
# folder, correctly (adds new files, removes deleted ones, never touches .git,
# node_modules, dist, or your user data — which lives in the browser/app, not
# here). Then it stages the changes so you can review and commit in GitHub
# Desktop or git.
#
# It will ask you to pick the unzipped folder (the one that CONTAINS package.json
# and the src/ folder). It does NOT delete anything outside this repo, and it
# always shows you what changed before you commit.
# -----------------------------------------------------------------------------

set -euo pipefail

# Always operate from the folder this script lives in (the repo root).
cd "$(dirname "$0")"
REPO="$(pwd)"

echo ""
echo "  CANA — safe repo updater"
echo "  Repo: $REPO"
echo ""

# Sanity: make sure we're actually in the repo (has package.json + src).
if [[ ! -f "package.json" || ! -d "src" ]]; then
  echo "  ✗ This doesn't look like the CANA repo folder (no package.json/src here)."
  echo "    Put this script in the repo root and try again."
  echo ""
  read -n 1 -s -r -p "  Press any key to close."
  exit 1
fi

# Ask the user to choose the unzipped new-version folder via a native dialog.
echo "  A folder-picker will open. Choose the UNZIPPED new CANA folder"
echo "  (the one that contains package.json and src/)."
echo ""

SRC=$(osascript <<'APPLESCRIPT'
try
  set f to choose folder with prompt "Choose the unzipped NEW CANA folder (contains package.json + src)"
  POSIX path of f
on error
  return ""
end try
APPLESCRIPT
)

if [[ -z "$SRC" ]]; then
  echo "  ✗ No folder chosen. Nothing changed."
  echo ""
  read -n 1 -s -r -p "  Press any key to close."
  exit 1
fi

# Strip trailing slash for consistency, then validate the source.
SRC="${SRC%/}"
if [[ ! -f "$SRC/package.json" || ! -d "$SRC/src" ]]; then
  echo "  ✗ That folder doesn't contain package.json + src/."
  echo "    Chosen: $SRC"
  echo "    Pick the inner folder that has package.json directly inside it."
  echo ""
  read -n 1 -s -r -p "  Press any key to close."
  exit 1
fi

if [[ "$SRC" == "$REPO" ]]; then
  echo "  ✗ You chose the repo itself. Choose the freshly-unzipped NEW version instead."
  echo ""
  read -n 1 -s -r -p "  Press any key to close."
  exit 1
fi

echo "  Source: $SRC"
echo ""
echo "  This will make the repo match the new version exactly:"
echo "    • new files added"
echo "    • changed files updated"
echo "    • files removed in the new version deleted here"
echo "  Protected (never touched): .git, node_modules, dist, release"
echo "  Your user data is NOT here (it lives in the browser/app), so it is safe."
echo ""
read -r -p "  Proceed? [y/N] " ANSWER
if [[ ! "$ANSWER" =~ ^[Yy]$ ]]; then
  echo "  Cancelled. Nothing changed."
  echo ""
  read -n 1 -s -r -p "  Press any key to close."
  exit 0
fi

echo ""
echo "  Syncing…"

# The safe sync. --delete makes the repo mirror the source, but the excludes
# protect git, dependencies, build output, and the macOS .DS_Store noise.
rsync -a --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='release/' \
  --exclude='.DS_Store' \
  "$SRC"/ "$REPO"/

echo "  ✓ Files synced."
echo ""

# If this is a git repo, stage everything and show a summary so the user can
# review before committing. We do NOT commit or push automatically.
if [[ -d ".git" ]] && command -v git >/dev/null 2>&1; then
  git add -A
  NEWVER=$(node -e "try{console.log(require('./package.json').version)}catch(e){console.log('?')}" 2>/dev/null || echo "?")
  echo "  Changes staged for commit. New version: $NEWVER"
  echo "  ----------------------------------------------------------"
  git -c color.status=always status --short || true
  echo "  ----------------------------------------------------------"
  echo ""
  echo "  Review the list above. To commit + push, run (or use GitHub Desktop):"
  echo ""
  echo "      git commit -m \"v$NEWVER\" && git push"
  echo ""
  echo "  Nothing has been pushed yet — you are in full control."
else
  echo "  (Not a git repo, or git not found — files are synced; commit however you prefer.)"
fi

echo ""
echo "  Done. Remember to rebuild the app afterward (Build CANA app.command)."
echo ""
read -n 1 -s -r -p "  Press any key to close."
echo ""
