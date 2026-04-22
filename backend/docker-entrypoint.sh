#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Applying schema..."
for i in $(seq 1 20); do
  if npx prisma db push --accept-data-loss; then
    break
  fi
  echo "Database unavailable, retry ${i}/20..."
  sleep 2
done

echo "Starting backend..."
node dist/src/main.js
