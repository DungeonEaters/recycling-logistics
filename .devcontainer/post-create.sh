#!/usr/bin/env bash
set -euo pipefail

sudo chown -R "$(id -u):$(id -g)" web/node_modules mobile/node_modules backend/.venv

python -m venv backend/.venv
backend/.venv/bin/pip install --quiet --upgrade pip
backend/.venv/bin/pip install --quiet -r backend/requirements.txt

(cd web && npm ci --no-audit --no-fund)
(cd mobile && npm ci --no-audit --no-fund)

echo "Ready. Run: make dev-api | make dev-web | make dev-mobile | make test-local"
