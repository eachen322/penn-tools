#!/usr/bin/env bash
# scripts/setupAndRun.sh — run setup.sh, then start the dev server
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Run setup first
bash "$SCRIPT_DIR/setup.sh"

# Start the web app, plus watchers that rebuild packages and tools on change
echo ""
echo -e "\033[0;36m▶ Starting dev server...\033[0m"
cd "$SCRIPT_DIR/.."
pnpm dev
