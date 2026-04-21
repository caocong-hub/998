#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/6] Check required env vars for production"
required_vars=(DATABASE_URL AUTH_SECRET NEXT_PUBLIC_APP_URL)
missing=()
for key in "${required_vars[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done
if [[ -z "${AUTH_URL:-}" && "${AUTH_TRUST_HOST:-}" != "true" ]]; then
  missing+=("AUTH_URL or AUTH_TRUST_HOST=true")
fi
if [[ -z "${M2_API_URL:-}" ]]; then
  missing+=("M2_API_URL")
fi

if (( ${#missing[@]} > 0 )); then
  printf 'Missing production env vars:\n'
  printf ' - %s\n' "${missing[@]}"
  echo "Tip: copy .env.production.example and set values before release."
  exit 1
fi

echo "==> [2/6] Lint"
npm run lint

echo "==> [3/6] Build"
npm run build

echo "==> [4/6] Prisma schema validate"
npx --no-install prisma validate

echo "==> [5/6] Verify M2 API health via proxy target"
health_json="$(curl -fsS "$M2_API_URL/health")"
echo "$health_json"
if ! echo "$health_json" | grep -q '"checkpoint_loaded"[[:space:]]*:[[:space:]]*true'; then
  echo "M2 health check failed: checkpoint_loaded is not true"
  exit 1
fi

echo "==> [6/6] Done. Preflight checks passed."
