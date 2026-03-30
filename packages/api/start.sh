#!/bin/sh
set -e

echo "Pushing schema changes..."
npx drizzle-kit push --force

echo "Starting SwarmRecall API..."
node dist/index.js
