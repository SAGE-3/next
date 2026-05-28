# LDAP Integration Test Environment

Runs a full SAGE3 LDAP integration test locally:

1. Starts **OpenLDAP** and **Redis** in Docker
2. Seeds the LDAP directory with test users covering all role mappings
3. Patches `sage3-dev.hjson` to point at the local LDAP (restored on exit)
4. Starts **homebase** (port 3000) and the **webapp dev server** (port 4200)
5. Opens the browser at `http://localhost:4200`

Press **Ctrl+C** to stop everything. The original `sage3-dev.hjson` is restored automatically.

## Prerequisites

- Docker
- `yarn` and project dependencies installed (`cd webstack && yarn install`)

## Usage

```bash
# From the repo root — start the full stack
./deployment/test-ldap/test.sh

# Tear down Docker containers (if needed separately)
./deployment/test-ldap/test.sh stop
```

## Test accounts

| Username | Password  | SAGE3 role |
|----------|-----------|------------|
| alice    | alice123  | admin      |
| bob      | bob123    | user       |
| carol    | carol123  | spectator  |
| dave     | dave123   | spectator (defaultRole — no group) |

## Log files

| File | Content |
|------|---------|
| `webstack/homebase-test.log` | homebase stdout/stderr |
| `webstack/webapp-test.log`   | webpack dev server output |

## Notes

- LDAP listens on `localhost:3890` (container port 389)
- Redis listens on `localhost:6379`
- Users carry `memberOf` set directly in the seed LDIF via `extensibleObject`,
  which avoids needing the memberOf overlay while exercising SAGE3's role mapping
- In production Active Directory, `memberOf` is populated automatically by the server
