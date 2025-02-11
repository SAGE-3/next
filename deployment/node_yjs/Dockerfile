FROM node:20-bookworm-slim

# Install in that directory
WORKDIR /app

# Debian package
RUN apt-get update && apt-get install -y curl build-essential && rm -rf /var/lib/apt/lists/*

# Project files
COPY webstack/package.json package.json
COPY webstack/yarn.lock yarn.lock

# Code
COPY webstack/nx.json nx.json
COPY webstack/workspace.json workspace.json
COPY webstack/babel.config.json babel.config.json
COPY webstack/tsconfig.base.json	tsconfig.base.json
COPY webstack/apps apps
COPY webstack/libs libs

# Increase RAM for node to build the app
ENV NODE_OPTIONS=--max-old-space-size=8192
# Build the app
RUN yarn install && yarn prod-yjs && yarn cache clean

CMD ["node", "dist/apps/homebase-yjs/main.js"]
