#!/usr/bin/env bash
set -euo pipefail

sudo chown -R "$(id -u):$(id -g)" backend/.venv

python -m venv backend/.venv
backend/.venv/bin/pip install --quiet --upgrade pip
backend/.venv/bin/pip install --quiet -r backend/requirements.txt

echo "Ready. Application services run through Docker Compose; use make test-local for local verification."
