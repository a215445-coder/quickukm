#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d node_modules ]; then
  echo "Run 'npm install' in the project root first."
  exit 1
fi

npm run build -- --base=./
python3 ios/inline-dist.py

echo "Synced the latest web build into ios/QuickUKM/www/index.html"
