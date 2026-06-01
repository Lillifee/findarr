#!/bin/sh
set -eu

mkdir -p /app/apps/api/data
chown -R node:node /app/apps/api/data

exec runuser -u node -- node apps/api/dist/index.js