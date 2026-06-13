#!/bin/sh
set -eu

DATA_DIR="${DATA_PATH:-/app/apps/api/data}"

mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR"

# Start application as node
exec runuser -u node -- node apps/api/dist/index.js