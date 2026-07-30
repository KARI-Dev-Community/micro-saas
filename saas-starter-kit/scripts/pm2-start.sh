#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "=== Building workspaces ==="
npm run build

echo "=== Running database migrations ==="
npm run migrate

echo "=== Starting PM2 ==="
pm2 delete saas 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "=== PM2 Status ==="
pm2 status

echo "=== Setup complete ==="
echo "$ROOT_DIR"

echo ""
echo "Useful commands:"
echo "  pm2 logs               - View all logs"
echo "  pm2 restart saas-web   - Restart frontend"
echo "  pm2 restart saas-api   - Restart API"
echo "  pm2 monit              - Monitor processes"
echo "  pm2 stop all           - Stop all processes"