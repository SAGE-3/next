# SAGE3 Server Update

Date: 08/16/2026 (updating to server v1.6)

## Updating from a 1.1 or 1.2 server installation

In a SAGE 3-1.x folder, you should have:

- GO: start shell script (starts docker compose)  
- STOP: stop shell script  (stops docker compose)  
- README.md: text file  
- Docker-compose.yml: the docker compose description file that contains all the SAGE3 services  
- Configurations: folder containing data files for each service

Before any file updates, run the ‘STOP’ script to stop the server deployment.

Download a new server installation file from the Github repository:

* Newest package (permanent links): [SAGE3-amd64.tgz](https://github.com/SAGE-3/next/releases/download/server-latest/SAGE3-amd64.tgz) / [SAGE3-arm64.tgz](https://github.com/SAGE-3/next/releases/download/server-latest/SAGE3-arm64.tgz)
* All versions: [https://github.com/SAGE-3/next/releases](https://github.com/SAGE-3/next/releases)

Installation documentation: [https://sage-3.github.io/docs/Server-Deployment](https://sage-3.github.io/docs/Server-Deployment)

# Updating to v1.6

Version 1.6 changes more than the docker images. After extracting the new package (`SAGE3-1.6-amd64.tgz` or `SAGE3-1.6-arm64.tgz` — note the new file names), go through these steps in addition to the usual procedure below:

1. **Copy the new `docker-compose.yml`** (required). Port exposure changed: only Traefik publishes a port (443) now — redis, chromadb, seer, jupyter, kernelserver, and fluentd no longer bind host ports and communicate over the internal Docker network only. If you had host-side tooling hitting `localhost:6379`, `localhost:9999`, etc., use `docker compose exec` instead (e.g. `docker compose exec seer curl localhost:9999/status`).

2. **Copy the new `configurations/traefik/traefik.yml`** (required). Traefik is now configured with `exposedByDefault: false`, so only the labeled SAGE3 services are routed. If this same Traefik instance routes other containers on your host, they now need a `traefik.enable=true` label.

3. **Migrate the AI configuration in `sage3-prod.hjson`** (required for AI features). The old `openai` / `llama` / `azure` service blocks are gone, replaced by a single capability-based `models` registry (providers → models → capabilities, plus shared `embed` / `rerank` / `pdf2md` services and a `default_provider`). The server starts without it, but all AI features stay disabled until you migrate. Start from the new file's example block and see the [AI Configuration](Server-Deployment.md#ai-configuration) section of the deployment guide. Notes:
   - Any OpenAI-compatible endpoint works (Azure, OpenAI, LiteLLM, vLLM, Ollama, ...).
   - The `pdf2md` (olmOCR) URL must include the `/v1` path.
   - If you change embedding models, delete `configurations/chroma/data` so the vector store is rebuilt — PDFs re-index on next use.

4. **New optional login strategies**: Keycloak (or any OpenID Connect provider) via `keycloakConfig`, and LDAP / Active Directory via `ldapConfig`. Both are documented in the new `sage3-prod.hjson` and in the [Authentication](Server-Deployment.md#authentication) section of the deployment guide.

5. **Check your `.env`** against the new `.env.template`: it now includes `CHROMA_SERVER_AUTHN_CREDENTIALS` / `CHROMA_CLIENT_AUTH_CREDENTIALS` (change the defaults) and the replica counts.

# Docker

- **Copy the new ‘docker-compose.yml’ file from the new folder into your installation directory.**  
- Download the new docker images:  
  - \`docker compose pull\`  
    - Might take a few minutes to download the new images  
  - If you want to save space, you can download the old images, but initially leave them. (\`docker images\` to get a list of installed images).  
- For reference, SAGE3 is composed of  
  - \`traefik\`: reverse proxy (the only published port, 443)  
  - \`redis-server\`: in-memory database  
  - \`node-server\`: web server  
  - \`yjs-server\` and \`files-server\`: collaboration and file services  
  - \`fluentd-server\`: logging server  
  - \`kernelserver\`: jupyter kernel management  
  - \`jupyter\`: jupyter server  
  - \`chromadb\`: vector database for AI services  
  - \`seer\`: Python backend for AI services  
- Check your \`.env\` file, but it should not require an update:  
  - SAGE3\_SERVER= \[full name of your server\]  
  - ENVIRONMENT=production  
  - TOKEN=  \[JWT token generated according to the documentation\]  
    - Might need a renewal after a year

# Configuration

Each service has a folder inside the ‘configuration’ directory.

## \`fluentd\`

* Following the documentation, the file \`conf/fluent.conf\` is a copy of \`conf/fluent-prod.conf\`  
* **Copy the new \`conf/fluent.conf\` (reduced logging).**

## \`jupyter\`

* Jupyter is started by the script \`start.sh\` in \`conf\` sub-folder  
* **Copy the new \`conf/start.sh\` script**

## \`node\`

* The configuration of SAGE3 web server is in \`node/sage3-prod.hjson\`  
* **Copy the new \`node/sage3-prod.hjson\` file**  
  * Edit the file and update the fields  
    * serverName: string describing your server  
    * SSL certificate: make sure your HTTPS certificate is up to date  
      * "certificateFile": "XXX-server.crt",  
      * "certificateKeyFile": "XXX-server.key"  
      * Stored in the \`keys\` sub folder  
    * Services:  
      * Twilio: screen sharing key (copy from old configuration)  
      * Openai: API key, optional  
    * Authentication  
      * Auth services, copy the values from old configuration  
      * Google, CILogin, …  
    * Namespace  
      * Copy the key from old configuration
    * Feedback URL
      * `"feedback": { "url": "http://sage3-server-status.cis230038.projects.jetstream-cloud.org:3000/feedback" },`
    * Services:
```
 …
 "services": {
      …
      // AI models: capability-based registry (v1.6+),
      // see "Updating to v1.6" above and the deployment guide
      "models": {
         "providers": { … },
         "embed": { … },
         "rerank": { … },
         "pdf2md": { … },
         "settings": { "default_provider": "…" }
      },
      …
   }
  …
  "features": {
      "plugins": true,
      "apps": ["Chat", "CodeEditor", "MapGL", "Notepad", "SageCell", "Stickie", "Screenshare", "Webview", "Poll", "TLDraw", "Calculator", "Hawaii Mesonet", "JupyterLab"],
  },
  …
```

* Your assets (images, PDF, movies, …) are in the \`assets\` sub folder.  
  * Files to save if you want to backup your server.  
* Your plugins are in the \`plugins\` sub folder.  
  * Files to save if you want to backup your server.

## \`redis\`

Configuration and data of SAGE3 database:

* **The configuration is in \`conf/redis.conf\` file (should be identical to previous version)**  
* The database data (rooms, boards, users, …) is in \`data/dump.rdb\` file  
  * File to save if you want to backup your server.

## \`foresight\`

N/A

## \`python\`

N/A

