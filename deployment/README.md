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

Login strategies are enabled in `webstack/sage3-dev.hjson` (or `sage3-prod.hjson`) under `auth.strategies`. Each strategy has a matching `*Config` block right below it in that same file, with inline documentation for every field.

| Strategy | Notes |
|---|---|
| `guest` | No credentials; read-only access. |
| `google`, `apple`, `cilogon`, `keycloak` | OAuth/OIDC redirect flows; each needs its own client registration. |
| `jwt` | For programmatic/service clients — see `jwtConfig`. |
| `spectator` | Read-only shared login, no per-user identity. |
| `ldap` | LDAP/Active Directory username+password, with group→role mapping. See below. |

### LDAP / Active Directory

Add `"ldap"` to `auth.strategies` and fill in `ldapConfig` (URL, service-account bind credentials, search base/filter, and a `groupMapping` from LDAP group DNs to SAGE3 roles). Users log in with the username/password form on the login page, which submits to `POST /auth/ldap`.

`groupMapping` is checked in priority order (`admin` > `user` > `spectator`); a user matching no group gets `defaultRole`. The mapping is re-evaluated on every login, so removing someone from an LDAP group takes effect the next time they sign in — not just at first login.

To try this against a real (disposable) LDAP server without touching your own directory, see [`test-ldap/README.md`](./test-ldap/README.md) — it seeds a local OpenLDAP container with four test accounts covering all three role mappings.

## More

- Full deployment guide: https://sage-3.github.io/docs/Server-Deployment
