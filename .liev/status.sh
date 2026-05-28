#!/usr/bin/env bash
set -u

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$repo_root" ]; then
  echo "ERROR: not inside a git repo."
  exit 1
fi

cd "$repo_root"
now="$(date '+%Y-%m-%d %H:%M:%S %Z')"

echo "=== liev-status @ $now ==="
echo
echo "=== Git ==="
echo "Branch: $(git branch --show-current)"
git status --short | sed -n '1,80p'
echo
echo "Recent commits:"
git log --oneline -5
echo
echo "=== Plan Progress ==="
if [ -f ".liev/plan.md" ]; then
  total="$(grep -cE '^[[:space:]]*-[[:space:]]*\[[ xX]\]' ".liev/plan.md" 2>/dev/null || true)"
  done_count="$(grep -cE '^[[:space:]]*-[[:space:]]*\[[xX]\]' ".liev/plan.md" 2>/dev/null || true)"
  echo "Checkboxes: ${done_count:-0} / ${total:-0}"
  echo "Next unchecked:"
  grep -nE '^[[:space:]]*-[[:space:]]*\[ \]' ".liev/plan.md" | sed -n '1,8p' || true
else
  echo "WARNING: .liev/plan.md missing."
fi
echo
echo "=== Validation Progress ==="
if [ -f ".liev/validation.md" ]; then
  total="$(grep -cE '^[[:space:]]*-[[:space:]]*\[[ xX]\]' ".liev/validation.md" 2>/dev/null || true)"
  done_count="$(grep -cE '^[[:space:]]*-[[:space:]]*\[[xX]\]' ".liev/validation.md" 2>/dev/null || true)"
  echo "Checkboxes: ${done_count:-0} / ${total:-0}"
  echo "Unchecked validation:"
  grep -nE '^[[:space:]]*-[[:space:]]*\[ \]' ".liev/validation.md" | sed -n '1,12p' || true
else
  echo "WARNING: .liev/validation.md missing."
fi
echo
echo "=== Required Validation Command ==="
echo "npm run lint && npm run test:run && npm run build"
echo
echo "=== Open PRs ==="
if command -v gh >/dev/null 2>&1; then
  gh pr list -R "veil-chow-fyaic/openclaw-command-kit" --state open \
    --json number,title,headRefName,baseRefName,mergeStateStatus \
    --jq '.[] | "#\(.number) \(.title) — \(.headRefName) -> \(.baseRefName) — \(.mergeStateStatus)"' 2>/dev/null || true
else
  echo "gh unavailable"
fi
echo
echo "=== Progress Tail ==="
if [ -f ".liev/progress.md" ]; then
  tail -20 ".liev/progress.md"
else
  echo "WARNING: .liev/progress.md missing."
fi
