# SAGE3: Smart Amplified Group Environment

<a href="https://sage3.sagecommons.org/"><img src="https://user-images.githubusercontent.com/19752298/113063377-ed534280-9150-11eb-87c8-e194c46e508c.png" align="left" hspace="10" vspace="6" height="100px"></a>

[SAGE3](https://sage3.sagecommons.org/) is software to enable data-rich collaboration on high-resolution display walls. Scientists analyzing their data in SAGE3 can collaborate with each other and with AI through large interactive visualization spaces — multi-monitor workstations, tiled display walls, and VR headsets.

---

# Repository Structure

| Directory | Description |
|---|---|
| `webstack/` | TypeScript/React monorepo — Node.js backend + React frontend |
| `deployment/` | Docker Compose files, Dockerfiles, and service configuration |
| `pysage3/` | Python client library for SAGE3 (published as `pysage3` on PyPI) |
| `seer/` | Python AI/LLM agent service (FastAPI, LangChain) |

## **webstack/**

A monorepo containing three server processes and the React frontend:
- **homebase** (port 3000) — main server, REST API, WebSocket, auth (`apps/homebase/`)
- **homebase-yjs** (port 3001) — Yjs CRDT server for collaborative editing (`apps/homebase-yjs/`)
- **homebase-files** (port 3002) — file upload/download/processing (`apps/homebase-files/`)
- **webapp** — React frontend, the browser client (`apps/webapp/`)

Shared code (types, stores, components, app definitions) lives in `libs/`.

Built with [Nrwl Nx](https://nx.dev/) and [Yarn](https://yarnpkg.com/).

## **deployment/**

Docker Compose files and configuration for running SAGE3 in production. During development, only the backend Docker services run here — the Node.js servers run locally from `webstack/`.

## **pysage3/**

Python client library for interacting with SAGE3 programmatically — creating and updating apps on a board, reacting to real-time changes, and executing code in Jupyter kernels. Used by `seer/` and available as a pip package.

## **seer/**

AI agent service that powers SAGE3's intelligence features — answering questions about images, PDFs, code, web pages, and data. Communicates with the frontend via homebase as a proxy.

---

# Developer Quick Start

## Prerequisites

1. [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. [Node.js](https://nodejs.org/en/)
3. [Yarn](https://yarnpkg.com/) — `npm install --global yarn`

## Setup

```bash
cd webstack
yarn          # install dependencies
yarn stage    # create required config files and folders
```

## Running

**Step 1** — Start the Docker backend services (Redis, Yjs server, files server):

```bash
cd deployment
# Apple Silicon (ARM64)
docker-compose -f docker-compose-backend-arm64.yml up --remove-orphans
# Intel/AMD (AMD64)
docker-compose -f docker-compose-backend-amd64.yml up --remove-orphans
```

**Step 2** — Start the Node.js servers locally:

```bash
cd webstack
yarn start         # starts homebase (port 3000) and homebase-files (port 3002)
yarn start webapp  # starts the React frontend (port 4200)
```

Open a browser and navigate to `http://localhost:4200`

Changes to files in `webstack/apps/` or `webstack/libs/` will hot-reload automatically.

---

# Branches

| Branch | Purpose |
|---|---|
| `main` | Stable — runs on production servers |
| `dev` | Integration branch — deployed to EVL and LAVA test servers |
| `dev-*` | Feature branches — branch off `dev`, PR back into `dev` |

Feature branches should describe their purpose in the name (e.g. `dev-pdf-viewer-fix`). Open a pull request against `dev` when ready for review.

---

# Deploying a Production Server

See the [Server Deployment Guide](https://sage-3.github.io/docs/Server-Deployment) and `deployment/README.md`.
