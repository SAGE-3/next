# SAGE3: Deployment

This folder contains the Docker configuration and scripts needed to run a SAGE3 server instance.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop)

## Docker Compose Files

| File | Purpose |
|---|---|
| `docker-compose-arm64.yml` | Full stack for ARM64 (Apple Silicon, ARM servers) |
| `docker-compose-amd64.yml` | Full stack for AMD64 (Intel/AMD servers) |
| `docker-compose-backend-arm64.yml` | Backend services only, ARM64 |
| `docker-compose-backend-amd64.yml` | Backend services only, AMD64 |

## Running

Use the compose file matching your architecture. For example on Apple Silicon:

```bash
docker-compose -f docker-compose-arm64.yml up --remove-orphans
```

## Stopping

```bash
docker-compose -f docker-compose-arm64.yml stop
docker-compose -f docker-compose-arm64.yml rm -f
```

## Building and Pushing Images

Use the `Build-Push` script to build all service images and push to GHCR:

```bash
./Build-Push
```

## Services

| Service | Image | Description |
|---|---|---|
| homebase | `ghcr.io/sage-3/next` | Main Node.js server |
| homebase-yjs | `ghcr.io/sage-3/next_yjs` | Yjs collaboration server |
| homebase-files | `ghcr.io/sage-3/next_files` | File upload/download server |
| seer | `ghcr.io/sage-3/agents` | Python AI/LLM agent service |

## Authentication

SAGE3 supports multiple login strategies configured in `sage3.hjson` (or `sage3-dev.hjson` for development) under the `auth` key. Enable strategies by adding them to the `strategies` array and providing the matching config block.

### Available strategies

| Strategy | Description |
|---|---|
| `guest` | Anonymous login, read-only access to apps |
| `spectator` | Anonymous login, full read-only |
| `jwt` | Token-based login via signed JWT |
| `google` | OAuth via Google |
| `apple` | OAuth via Apple |
| `cilogon` | Federated login via CILogon |
| `keycloak` | OIDC via Keycloak (or any compatible OIDC provider) |
| `ldap` | Username/password login against an LDAP/Active Directory server |

### LDAP / Active Directory

Add `"ldap"` to `strategies` and configure `ldapConfig`:

```hjson
"ldapConfig": {
  // Plain LDAP (port 389) or LDAPS (port 636)
  "url": "ldap://ad.university.edu:389",

  // Service account with read access to the user tree
  "bindDN": "cn=svc-sage3,ou=ServiceAccounts,dc=university,dc=edu",
  "bindCredentials": "secret",

  // Base DN to search for users
  "searchBase": "ou=People,dc=university,dc=edu",

  // Filter to locate the user — {{username}} is replaced at login time
  // OpenLDAP:         "(uid={{username}})"
  // Active Directory: "(sAMAccountName={{username}})"
  "searchFilter": "(sAMAccountName={{username}})",

  // Map LDAP group DNs to SAGE3 roles (priority: admin > user > spectator)
  // Groups are read from the "memberOf" attribute on the user entry.
  "groupMapping": {
    "admin":     "cn=sage3-admins,ou=groups,dc=university,dc=edu",
    "user":      "cn=sage3-users,ou=groups,dc=university,dc=edu",
    "spectator": "cn=sage3-readonly,ou=groups,dc=university,dc=edu"
  },

  // Role assigned when the user matches no group above
  "defaultRole": "spectator",

  // TLS options — set rejectUnauthorized: true in production
  "tlsOptions": { "rejectUnauthorized": false }
}
```

Users log in via the username/password form on the SAGE3 login page. Credentials are sent to `POST /auth/ldap`.

### Guest permissions

Guests (`guest` strategy) can read all content but cannot create or modify apps. They can update their own presence and user profile.

## More

- Full deployment guide: https://sage-3.github.io/docs/Server-Deployment
