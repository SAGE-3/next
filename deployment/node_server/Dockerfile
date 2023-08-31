FROM node:18-bullseye

# Install in that directory
WORKDIR /app

# Debian package
RUN apt-get update && apt-get install -y exiftool build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libheif1 libheif-dev && rm -rf /var/lib/apt/lists/*

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

# Build the app
RUN yarn install
RUN yarn prod
RUN yarn cache clean

CMD ["node", "dist/apps/homebase/main.js"]
