# SAGE3 Server Update v1.3 - v1.4

Date: 08/12/2024

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

# Docker

- **Copy the new ‘docker-compose.yml’ file from the new folder into your installation directory.**  
- Download the new docker images:  
  - \`docker compose pull\`  
    - Might take a few minutes to download the new images  
  - If you want to save space, you can download the old images, but initially leave them. (\`docker images\` to get a list of installed images).  
- For reference, SAGE3 is composed of  
  - \`redis-server\`: in-memory database  
  - \`node-server\`: web server  
  - \`fluentd-server\`: logging server  
  - \`fastapi\`: jupyter kernel management  
  - \`jupyter\`: jupyter server  
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
      * "feedback": {     "url": "http://sage3-server-status.cis230038.projects.jetstream-cloud.org:3000/feedback"   }, 
    * Services:
```
 …
 "services”: {
      …
      "chat": {
         "url": "https://arcade.evl.uic.edu/llama",
         "model": "llama3",
         "max_tokens": 2048,
         "apiKey": ""
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

