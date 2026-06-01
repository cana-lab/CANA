#!/bin/bash
#
# Stop CANA — double-click to shut down the local CANA server.
# (You can also simply close the "Start CANA" Terminal window.)
#
# Note: this stops whatever is using the Vite dev ports (5173-5176).
# If you run other Vite projects at the same time, prefer just closing
# the "Start CANA" window instead.
#

clear
echo "Stopping CANA..."
echo ""

FOUND=0
for port in 5173 5174 5175 5176; do
  PIDS=$(lsof -ti tcp:"$port" 2>/dev/null)
  if [ -n "$PIDS" ]; then
    kill $PIDS 2>/dev/null
    FOUND=1
  fi
done

sleep 1

if [ "$FOUND" -eq 1 ]; then
  echo "CANA has been stopped."
else
  echo "CANA does not appear to be running."
fi

echo ""
echo "You can close this window."
sleep 2
