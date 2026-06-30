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

## More

- Full deployment guide: https://sage-3.github.io/docs/Server-Deployment
