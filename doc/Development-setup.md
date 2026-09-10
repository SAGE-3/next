# Development Setup

This guide covers setting up a local SAGE3 development environment. It addresses the Node.js backend servers, the React frontend, and the Python AI (Seer) service.

---

## Prerequisites

- **Node.js v20.x** (LTS) — [nodejs.org](https://nodejs.org/en/download/prebuilt-binaries)
- **Yarn v1.x** — `npm install --global yarn`
- **Docker** with Compose plugin (most recent versions include it)
  - macOS / Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Linux: Docker Engine (`apt install docker.io docker-compose-plugin`)
- **Python 3.10+** — required only if developing the Seer AI service
- A code editor — VSCode is recommended

---

## Platform Notes

### Windows

Use WSL2 (Windows Subsystem for Linux) with Ubuntu 22.04 for the best experience. Run all commands from a WSL terminal.

```powershell
# In PowerShell
wsl --install -d Ubuntu-22.04
```

After rebooting, open Docker Desktop, enable WSL2 integration, and verify:

```bash
docker ps
docker run --rm hello-world
```

Install Node.js inside WSL:

```bash
sudo apt-get install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt-get install -y nodejs
npm install --global yarn
```

Install VSCode in Windows and use the **Remote - WSL** extension to open the project inside the WSL environment.

Install canvas dependencies (required for Node.js `canvas` package):

```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### macOS

```bash
# Install Node.js (download LTS v20.x installer from nodejs.org)
npm install --global yarn
# Install Docker Desktop for Mac (select Apple Silicon or Intel as appropriate)
```

### Linux (Ubuntu)

```bash
sudo apt-get install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt-get install -y nodejs
npm install --global yarn
# Install canvas dependencies
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

---

## Get the Code

Development happens on the `dev` branch. The `main` branch is production-only.

```bash
git clone https://github.com/SAGE-3/next
cd next
git checkout dev
git pull origin dev
```

> On Windows, clone inside WSL (not the Windows filesystem) for best performance.

---

## 1. Start the Backend Services (Docker)

The backend infrastructure runs in Docker containers: Redis, ChromaDB, Fluentd, the YJS server, the Files server, the Kernel server, and Jupyter.

```bash
cd next/deployment

# Pull the latest images (first time or after updates)
./Backend pull

# Start the services
./Backend up
```

The `./Backend` script automatically selects the correct docker-compose file for your architecture (arm64 on Apple Silicon, amd64 otherwise). To stop:

```bash
./Backend down
```

**What this starts:**

| Service | Port | Description |
|---|---|---|
| `redis-server` | 6379 | Redis Stack database |
| `yjs-server` | 3001 | Y.js CRDT server (collaborative editing) |
| `files-server` | 3002 | File upload and static serving |
| `chromadb` | 8100 | Vector database for AI |
| `fluentd-server` | 24224 | Log aggregation |
| `kernelserver` | 8000 | Jupyter kernel management |
| `jupyter` | 8888 | JupyterLab execution environment |
| `livekit-server` | 7880–7882 | Screen-sharing video server, bound to 127.0.0.1. Uses a built-in development secret, nothing to configure |

---

## 2. Configure the Environment

### Install Webstack Dependencies

```bash
cd next/webstack
yarn install
```

This installs ~1.5 GB of Node.js packages.

### Stage Configuration Files

The first time you set up a dev environment, run:

```bash
yarn stage
```

This copies configuration templates and assets into the right locations.

### Generate JWT Keys

```bash
cd next/webstack/keys
./genJWT_keys.sh   # Generates the RSA key pair for signing JWT tokens
./genJWT_token.sh  # Generates a development JWT token
```

Open `next/webstack/keys/token.json`, copy the token string, and paste it as the `TOKEN` value in `next/deployment/.env`:

```bash
# next/deployment/.env
SAGE3_SERVER=localhost
TOKEN=<paste token here>
CHROMA_SERVER_AUTHN_CREDENTIALS=...
CHROMA_CLIENT_AUTH_CREDENTIALS=...
```

---

## 3. Start the Web Servers

SAGE3's webstack consists of three Node.js servers. You need separate terminal windows for each.

### Terminal 1 — Homebase (Main API Server, port 3000)

```bash
cd next/webstack
yarn start
```

This starts the main Homebase server. It takes ~1 minute to compile TypeScript on first run, then watches for changes and restarts automatically.

> Homebase listens on port 3000 in development. The React dev server (port 4200) proxies `/api`, `/auth`, `/twilio`, `/livekit`, `/logs`, and `/plugins` requests to it, and `/sfu` (WebSocket) to the local LiveKit container. In production, all traffic goes through port 443 via Traefik.

### Terminal 2 — React Frontend (port 4200)

```bash
cd next/webstack
yarn webapp
```

Starts the Vite/React development server. Proxies all `/api` requests to Homebase at port 3000. Open [http://localhost:4200](http://localhost:4200) in your browser when it finishes compiling.

The React server hot-reloads automatically when you edit frontend code or application components.

### Terminal 3 (optional) — Homebase-YJS and Homebase-Files

The YJS server and Files server run as Docker containers in the backend compose file (started in step 1). You only need to run them separately from source if you are actively developing those servers:

```bash
cd next/webstack
yarn homebase-yjs    # YJS/WebRTC server
yarn homebase-files  # File upload server
```

---

## 4. Development-Mode App List

In development mode (`production: false` in `sage3-dev.hjson`), **all registered apps** appear in the Applications panel, including experimental ones not yet in the production app list. This makes it easy to test new apps without editing the config.

---

## Code Organization

```
next/
├── webstack/               # Nx monorepo
│   ├── apps/
│   │   ├── homebase/       # Main API + WebSocket server
│   │   ├── homebase-yjs/   # Y.js CRDT + WebRTC server
│   │   ├── homebase-files/ # File upload + static serving
│   │   └── webapp/         # React frontend
│   ├── libs/
│   │   ├── applications/   # All 22 SAGE3 app modules
│   │   ├── frontend/       # Zustand stores, hooks, shared UI
│   │   ├── backend/        # Server-side utilities and collection base classes
│   │   ├── sagebase/       # Redis abstraction (SAGEBase)
│   │   └── shared/         # Types and schemas used by both frontend and backend
│   ├── sage3-dev.hjson     # Development server configuration
│   └── keys/               # JWT keys and token (git-ignored)
├── seer/                   # Python AI agent service
├── pysage3/                # Python client library
└── deployment/             # Docker Compose files and server configuration
```

---

## Creating a New App

SAGE3 provides a scaffolding tool that generates the boilerplate for a new integrated application:

```bash
cd next/webstack
yarn newapp
```

Follow the prompts to enter an app name, developer name, state variable name, type, and default value. The generator creates:

```
libs/applications/src/lib/apps/NewApp/
  NewApp.tsx     # AppComponent + ToolbarComponent
  index.ts       # Zod schema, init values, display name
  styling.css    # App-specific CSS
```

The app is automatically registered in the SAGE3 app registry and will appear in the Applications panel immediately (in dev mode). See [Application Development](Application-Development.md) for full details.

If the app list ever gets out of sync, run:

```bash
yarn regen
```

---

## 5. Seer AI Service (Python)

Seer is the Python FastAPI service that provides AI capabilities. You only need to run this if you are developing AI features.

### Setup

```bash
cd next/seer
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### Configure Environment

Seer reads configuration from a `.env` file in the `seer/` directory. Create one:

```bash
# next/seer/.env
ENVIRONMENT=development
SAGE3_SERVER=https://localhost:4443   # or your dev server URL
TOKEN=<same JWT token from webstack/keys/token.json>

# AI provider keys (add whichever you have)
OPENAI_API_KEY=sk-...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...

# ChromaDB (match values in deployment/.env)
CHROMA_CLIENT_AUTH_CREDENTIALS=...
```

### Run

```bash
cd next/seer
source .venv/bin/activate
./dev.sh
```

This runs Seer with hot-reload via `uvicorn` on port 9999. Homebase proxies AI requests from the frontend to Seer at `/api/agents`.

### Seer Architecture

```
seer/
├── main.py           # FastAPI app, route definitions
├── app/
│   ├── chat.py       # ChatAgent — LLM Q&A
│   ├── code.py       # CodeAgent — code assistance
│   ├── image.py      # ImageAgent — image understanding
│   ├── web.py        # WebAgent — web scraping + summarization
│   ├── pdf.py        # PDFAgent — PDF analysis
│   └── mesonet.py    # MesonetAgent — Hawaii sensor data
├── libs/
│   └── utils.py      # Shared utilities (image handling, PDF processing)
└── requirements.txt
```

Each agent class receives a `logger` and a `PySage3` client instance and implements a `process()` async method. The `PySage3` client (from the `pysage3` package) is used to read board state and create apps back on the canvas as AI output.

---

## Useful Commands

```bash
# Webstack
yarn install          # Install dependencies
yarn stage            # Stage config files (first-time setup)
yarn start            # Start Homebase (port 3000)
yarn webapp           # Start React dev server (port 4200)
yarn homebase-yjs     # Start YJS server separately
yarn homebase-files   # Start Files server separately
yarn newapp           # Scaffold a new integrated app
yarn regen            # Regenerate the app registry

# Docker backend
./Backend up          # Start all backend containers
./Backend down        # Stop all containers
./Backend pull        # Pull latest images
docker ps             # Check running containers
docker logs <name>    # View container logs

# Seer
./dev.sh              # Start Seer with hot-reload (from seer/)
```
