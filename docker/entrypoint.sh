#!/bin/sh
set -eu

DATA_DIR="${DATA_PATH:-/app/apps/api/data}"

# Ensure the data directory exists and is writable by the runtime user.
# This also repairs ownership of a pre-existing mounted volume.
mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR"

# Drop privileges and start the application as the non-root `node` user.
exec runuser -u node -- node apps/api/dist/index.js
