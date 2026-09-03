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
| livekit-server | `livekit/livekit-server` | Self-hosted SFU for screensharing |

## Screenshare

Screensharing runs on a self-hosted [LiveKit](https://livekit.io) SFU. To enable it, set
one value in `.env`:

```
LIVEKIT_API_SECRET=$(uuidgen)
```

That is the whole configuration. The same secret is given to both the LiveKit container
and the SAGE3 server, and there is nothing to set in `sage3-prod.hjson` — no URL, no key.
Clients always reach the SFU at `/sfu` on the server they loaded the page from, so a
SAGE3 server can only ever use its own SFU.

Leave `LIVEKIT_API_SECRET` empty and there is no screensharing: the server mounts no
routes and the screenshare button does not appear in the UI at all. The LiveKit container
refuses to start without credentials, so comment out the `livekit-server` service too if
you are running without screenshare.

Keep the secret out of version control — `deployment/.env` is currently tracked by git.

Open these ports on the host (forwarded to it if the server is behind NAT):

| Port | Purpose |
|---|---|
| 7882/udp | All WebRTC media. Screenshares will connect but show no video without it. |
| 7881/tcp | Media fallback for clients on networks that block UDP. |

Signaling needs no new port: it goes through traefik over HTTPS at `wss://<server>/sfu`.

The SFU discovers its public address via STUN. If this server has no outbound STUN
access, or the discovered address is wrong, edit
`configurations/livekit/livekit.yaml`: set `use_external_ip: false` and add
`node_ip: <the address clients reach>`.

### Twilio

Servers that have not migrated may keep using Twilio by filling in the `twilio` block of
`sage3-prod.hjson`. When both are configured LiveKit is used; existing Twilio screenshare
windows on boards keep working either way. Twilio support will be removed in a future
release.

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
