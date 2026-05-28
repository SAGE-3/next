# LDAP Test Environment

Spins up a local OpenLDAP server pre-seeded with test users and groups to validate SAGE3 LDAP authentication end-to-end.

## Prerequisites

- Docker (no other local dependencies required)

## Usage

```bash
# Start the LDAP server and seed test data
./deployment/test-ldap/test.sh

# Stop and remove the container + volumes
./deployment/test-ldap/test.sh stop
```

The script prints the exact `ldapConfig` block to paste into `sage3-dev.hjson`.

## Test accounts

| Username | Password  | SAGE3 role            |
|----------|-----------|-----------------------|
| alice    | alice123  | admin                 |
| bob      | bob123    | user                  |
| carol    | carol123  | spectator             |
| dave     | dave123   | spectator (defaultRole, no group) |

## Directory structure

| DN | Description |
|----|-------------|
| `dc=example,dc=com` | Root |
| `ou=users,dc=example,dc=com` | User tree |
| `ou=groups,dc=example,dc=com` | Group tree |
| `cn=sage3-admins,ou=groups,...` | Maps to `admin` role |
| `cn=sage3-users,ou=groups,...` | Maps to `user` role |
| `cn=sage3-readonly,ou=groups,...` | Maps to `spectator` role |

## Notes

- LDAP listens on `localhost:3890` (mapped from container port 389)
- Users carry `memberOf` set directly in the LDIF via `extensibleObject` — this avoids needing the memberOf overlay while still exercising SAGE3's role mapping logic
- For a production Active Directory setup, `memberOf` is populated automatically by the server; no special configuration is needed
