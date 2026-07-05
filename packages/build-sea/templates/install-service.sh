#!/usr/bin/env bash
#
# Installs Findarr as a Windows service using the bundled WinSW wrapper.
#
# IMPORTANT: run this from an ELEVATED (Administrator) terminal.
# The service listens on PORT 8585 and stores data under ./data by default —
# edit findarr-service.xml before installing to change these.

set -euo pipefail
cd "$(dirname "$0")"

./findarr-service.exe install
./findarr-service.exe start

echo
echo "Findarr installed as a service and started."
echo "It will now start automatically on boot. Open http://localhost:8585"
