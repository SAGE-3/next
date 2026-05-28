#!/usr/bin/env bash
# Starts a local OpenLDAP server for testing SAGE3 LDAP authentication.
# Requires: Docker
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER="sage3-test-ldap"
ADMIN_DN="cn=admin,dc=example,dc=com"
ADMIN_PW="admin"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

if [ "${1:-}" = "stop" ]; then
  docker compose -f "$SCRIPT_DIR/docker-compose.yml" down -v
  info "Stopped and volumes removed."
  exit 0
fi

command -v docker &>/dev/null || fail "Docker is required but not found."

# Start container
info "Starting OpenLDAP container..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d

# Wait until ready
info "Waiting for LDAP to be ready..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" \
      ldapsearch -x -D "$ADMIN_DN" -w "$ADMIN_PW" \
      -b "dc=example,dc=com" "(objectClass=top)" dn &>/dev/null 2>&1; then
    info "LDAP is ready."
    break
  fi
  [ "$i" -eq 30 ] && fail "LDAP did not become ready after 60s."
  sleep 2
done

# Seed test data
info "Seeding test users and groups..."
docker cp "$SCRIPT_DIR/seed.ldif" "$CONTAINER:/tmp/seed.ldif"
if docker exec "$CONTAINER" \
    ldapadd -x -D "$ADMIN_DN" -w "$ADMIN_PW" -f /tmp/seed.ldif 2>/dev/null; then
  info "Test data seeded."
else
  warn "Some entries already exist — skipping (safe to ignore on re-run)."
fi

# Verify
info "Verifying entries..."
echo ""
docker exec "$CONTAINER" \
  ldapsearch -x -D "$ADMIN_DN" -w "$ADMIN_PW" \
  -b "ou=users,dc=example,dc=com" "(objectClass=inetOrgPerson)" uid memberOf \
  | grep -E "^uid:|^memberOf:" || true
echo ""

info "OpenLDAP is running on ldap://localhost:3890"
echo ""
echo "────────────────────────────────────────────────────────"
echo "Add this ldapConfig to your sage3-dev.hjson auth section:"
echo "────────────────────────────────────────────────────────"
cat <<'HJSON'

  "strategies": ["guest", "jwt", "ldap"],
  "ldapConfig": {
    "url": "ldap://localhost:3890",
    "bindDN": "cn=admin,dc=example,dc=com",
    "bindCredentials": "admin",
    "searchBase": "ou=users,dc=example,dc=com",
    "searchFilter": "(uid={{username}})",
    "groupMapping": {
      "admin":     "cn=sage3-admins,ou=groups,dc=example,dc=com",
      "user":      "cn=sage3-users,ou=groups,dc=example,dc=com",
      "spectator": "cn=sage3-readonly,ou=groups,dc=example,dc=com"
    },
    "defaultRole": "spectator",
    "tlsOptions": { "rejectUnauthorized": false }
  }

HJSON

echo "────────────────────────────────────────────────────────"
echo "Test accounts:"
echo "  alice / alice123  → admin role"
echo "  bob   / bob123    → user role"
echo "  carol / carol123  → spectator role"
echo "  dave  / dave123   → spectator (defaultRole, no group)"
echo "────────────────────────────────────────────────────────"
echo ""
info "To stop and clean up: $0 stop"
