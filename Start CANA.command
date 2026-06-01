#!/bin/bash
#
# Start CANA — double-click this file to launch the app.
# It installs dependencies the first time, starts the local server,
# and opens CANA in your browser. No Terminal typing required.
#

# Move into the folder this script lives in (the CANA project root),
# so it works no matter where it is double-clicked from.
cd "$(dirname "$0")" || exit 1

clear
echo "======================================"
echo "            Starting CANA"
echo "======================================"
echo ""

# 1) Make sure Node.js is installed.
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed yet."
  echo ""
  echo "   1. Go to https://nodejs.org"
  echo "   2. Download the green 'LTS' installer and run it"
  echo "   3. Double-click 'Start CANA' again"
  echo ""
  echo "Press any key to close this window."
  read -n 1 -s
  exit 1
fi

# 2) Install dependencies — only the first time (when node_modules is absent).
if [ ! -d node_modules ]; then
  echo "First-time setup: installing dependencies."
  echo "This happens only once and takes 1-2 minutes..."
  echo ""
  if ! npm install; then
    echo ""
    echo "Setup failed. Please check your internet connection and try again."
    echo "Press any key to close this window."
    read -n 1 -s
    exit 1
  fi
  echo ""
fi

# 3) Use a fresh log file; a background watcher opens the browser
#    as soon as the server prints its address.
LOG="/tmp/cana-dev.log"
: > "$LOG"

(
  for i in $(seq 1 40); do
    URL=$(grep -m1 -oE 'http://localhost:[0-9]+/cana/' "$LOG" 2>/dev/null)
    if [ -n "$URL" ]; then
      open "$URL"
      break
    fi
    sleep 0.5
  done
) &

# 4) Stop the server cleanly if this window is closed or Ctrl+C is pressed.
trap 'echo ""; echo "Stopping CANA..."; kill 0 2>/dev/null; exit 0' INT TERM HUP

echo "CANA is starting — your browser will open automatically."
echo ""
echo "   - Leave this window open while you use CANA."
echo "   - To stop CANA: close this window, or press Ctrl+C,"
echo "     or double-click 'Stop CANA'."
echo ""
echo "--------------------------------------"
echo ""

# 5) Run the dev server in the FOREGROUND (so closing this window stops it),
#    copying its output to the log the watcher above reads.
npm run dev 2>&1 | tee "$LOG"
