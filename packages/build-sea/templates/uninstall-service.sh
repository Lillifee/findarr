#!/usr/bin/env bash
#
# Stops and removes the Findarr Windows service.
#
# IMPORTANT: run this from an ELEVATED (Administrator) terminal.
# This does NOT delete the ./data folder, so your database is preserved.

set -euo pipefail
cd "$(dirname "$0")"

./findarr-service.exe stop || true
./findarr-service.exe uninstall

echo
echo "Findarr service stopped and removed. The ./data folder was left untouched."
