#!/usr/bin/env bash
# Full LDAP integration test: starts OpenLDAP + Redis in Docker, patches
# sage3-dev.hjson, launches homebase and the webapp dev server, then opens
# the browser. Ctrl+C stops everything and restores the original config.
#
# Usage:
#   ./deployment/test-ldap/test.sh          # start everything
#   ./deployment/test-ldap/test.sh stop     # tear down Docker containers
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WEBSTACK="$REPO_ROOT/webstack"
CONFIG="$WEBSTACK/sage3-dev.hjson"
CONFIG_BAK="$WEBSTACK/sage3-dev.hjson.testbak"

LDAP_CONTAINER="sage3-test-ldap"
ADMIN_DN="cn=admin,dc=example,dc=com"
ADMIN_PW="admin"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
step()  { echo -e "\n${CYAN}══ $* ══${NC}"; }

# ── Stop mode ────────────────────────────────────────────────────────────────
if [ "${1:-}" = "stop" ]; then
  docker compose -f "$SCRIPT_DIR/docker-compose.yml" down -v
  info "Containers stopped and volumes removed."
  exit 0
fi

# ── Prerequisites ─────────────────────────────────────────────────────────────
command -v docker &>/dev/null  || fail "Docker is required."
command -v yarn   &>/dev/null  || fail "yarn is required."
[ -f "$CONFIG" ]              || fail "sage3-dev.hjson not found at $CONFIG"

# ── Cleanup handler ───────────────────────────────────────────────────────────
HOMEBASE_PID=""
WEBAPP_PID=""

cleanup() {
  echo ""
  step "Cleaning up"

  # Kill SAGE3 processes
  [ -n "$WEBAPP_PID" ]   && kill "$WEBAPP_PID"   2>/dev/null && info "webapp stopped."
  [ -n "$HOMEBASE_PID" ] && kill "$HOMEBASE_PID" 2>/dev/null && info "homebase stopped."

  # Restore config
  if [ -f "$CONFIG_BAK" ]; then
    mv "$CONFIG_BAK" "$CONFIG"
    info "sage3-dev.hjson restored."
  fi

  # Stop Docker
  docker compose -f "$SCRIPT_DIR/docker-compose.yml" down -v 2>/dev/null
  info "Docker containers stopped."
}
trap cleanup EXIT INT TERM

# ── Docker: OpenLDAP + Redis ──────────────────────────────────────────────────
step "Starting OpenLDAP and Redis"
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d

# Wait for LDAP
info "Waiting for LDAP..."
for i in $(seq 1 30); do
  if docker exec "$LDAP_CONTAINER" \
      ldapsearch -x -D "$ADMIN_DN" -w "$ADMIN_PW" \
      -b "dc=example,dc=com" "(objectClass=top)" dn &>/dev/null 2>&1; then
    info "LDAP ready."; break
  fi
  [ "$i" -eq 30 ] && fail "LDAP did not become ready after 60s."
  sleep 2
done

# Wait for Redis
info "Waiting for Redis..."
for i in $(seq 1 15); do
  if docker exec sage3-test-redis redis-cli ping &>/dev/null 2>&1; then
    info "Redis ready."; break
  fi
  [ "$i" -eq 15 ] && fail "Redis did not become ready."
  sleep 2
done

# Seed LDAP
step "Seeding LDAP test data"
docker cp "$SCRIPT_DIR/seed.ldif" "$LDAP_CONTAINER:/tmp/seed.ldif"
docker exec "$LDAP_CONTAINER" \
  ldapadd -x -D "$ADMIN_DN" -w "$ADMIN_PW" -f /tmp/seed.ldif 2>/dev/null \
  && info "Test data seeded." \
  || warn "Some entries already exist — OK on re-run."

# ── Patch sage3-dev.hjson ─────────────────────────────────────────────────────
step "Patching sage3-dev.hjson"
cp "$CONFIG" "$CONFIG_BAK"

# Point LDAP URL to the local test container and fix credentials
python3 - "$CONFIG" <<'PYEOF'
import sys, re

path = sys.argv[1]
txt  = open(path).read()

# LDAP URL → localhost test container
txt = re.sub(r'"url"\s*:\s*"ldap://[^"]*"', '"url": "ldap://localhost:3890"', txt)
# bindDN → test admin
txt = re.sub(r'"bindDN"\s*:\s*"[^"]*"', '"bindDN": "cn=admin,dc=example,dc=com"', txt)
# bindCredentials → test admin password
txt = re.sub(r'"bindCredentials"\s*:\s*"[^"]*"', '"bindCredentials": "admin"', txt)
# searchBase → test tree
txt = re.sub(r'"searchBase"\s*:\s*"[^"]*"', '"searchBase": "ou=users,dc=example,dc=com"', txt)
# searchFilter → uid-based (OpenLDAP)
txt = re.sub(r'"searchFilter"\s*:\s*"[^"]*"', '"searchFilter": "(uid={{username}})"', txt)

open(path, 'w').write(txt)
print("Config patched.")
PYEOF

info "sage3-dev.hjson patched (original saved as .testbak)."

# ── Stub webapp dist (homebase needs favicon.ico at startup) ──────────────────
step "Preparing dist assets"
mkdir -p "$WEBSTACK/dist/apps/webapp/assets"
if [ ! -f "$WEBSTACK/dist/apps/webapp/assets/favicon.ico" ]; then
  cp "$WEBSTACK/apps/webapp/src/assets/favicon.ico" \
     "$WEBSTACK/dist/apps/webapp/assets/favicon.ico"
  info "Copied favicon.ico to dist."
fi

# ── Reset NX daemon (avoids 'free(): invalid pointer' on some systems) ────────
step "Resetting NX daemon"
cd "$WEBSTACK" && yarn nx reset 2>/dev/null || true

# ── Start homebase ────────────────────────────────────────────────────────────
step "Starting homebase (port 3000)"
cd "$WEBSTACK"
yarn homebase >"$WEBSTACK/homebase-test.log" 2>&1 &
HOMEBASE_PID=$!
info "homebase PID=$HOMEBASE_PID — logs: webstack/homebase-test.log"

# Wait for homebase to be ready
info "Waiting for homebase to be ready..."
for i in $(seq 1 45); do
  if curl -s http://localhost:3000/auth/verify >/dev/null 2>&1; then
    info "homebase ready."; break
  fi
  [ "$i" -eq 45 ] && fail "homebase did not start in time. Check webstack/homebase-test.log."
  sleep 2
done

# ── Start webapp dev server ───────────────────────────────────────────────────
step "Starting webapp dev server (port 4200)"
yarn webapp >"$WEBSTACK/webapp-test.log" 2>&1 &
WEBAPP_PID=$!
info "webapp PID=$WEBAPP_PID — logs: webstack/webapp-test.log"

# Wait for webpack dev server
info "Waiting for webapp dev server..."
for i in $(seq 1 60); do
  if curl -s http://localhost:4200 >/dev/null 2>&1; then
    info "webapp ready."; break
  fi
  [ "$i" -eq 60 ] && warn "webapp may still be compiling — check webstack/webapp-test.log."
  sleep 2
done

# ── Open browser ──────────────────────────────────────────────────────────────
BROWSER_URL="http://localhost:4200"
step "Opening browser at $BROWSER_URL"
if command -v xdg-open &>/dev/null; then
  xdg-open "$BROWSER_URL" &
elif command -v open &>/dev/null; then
  open "$BROWSER_URL"
else
  info "Open your browser at: $BROWSER_URL"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN} SAGE3 LDAP integration test running${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Browser : $BROWSER_URL"
echo "  homebase: http://localhost:3000  (log: webstack/homebase-test.log)"
echo "  LDAP    : ldap://localhost:3890"
echo "  Redis   : redis://localhost:6379"
echo ""
echo "  Test accounts:"
echo "    alice / alice123  → admin role"
echo "    bob   / bob123    → user role"
echo "    carol / carol123  → spectator role"
echo "    dave  / dave123   → spectator (no group, defaultRole)"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop everything and restore config.${NC}"
echo ""

# Wait until interrupted
wait $HOMEBASE_PID 2>/dev/null || true
