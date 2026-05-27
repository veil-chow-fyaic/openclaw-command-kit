#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "repo: $repo_root"
echo "branch: $(git branch --show-current)"
echo "status:"
git status --short --branch

echo
echo "validation:"
npm run lint
npm run test:run
npm run build
