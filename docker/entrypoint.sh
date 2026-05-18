#!/bin/sh
set -eu

mkdir -p /app/server/data
chown -R node:node /app/server/data

exec runuser -u node -- node server/dist/index.js