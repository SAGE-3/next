FROM node:20-bookworm-slim AS builder

# Install in that directory
WORKDIR /app

# Debian package
RUN apt-get update && apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libheif1 libheif-dev

# Project files
COPY webstack/package.json package.json
COPY webstack/yarn.lock yarn.lock
# Install dependencies
RUN yarn install --frozen-lockfile

# Code
COPY webstack/nx.json nx.json
COPY webstack/workspace.json workspace.json
COPY webstack/babel.config.json babel.config.json
COPY webstack/tsconfig.base.json tsconfig.base.json
COPY webstack/apps apps
COPY webstack/libs libs

# Increase RAM for node to build the app
ENV NODE_OPTIONS=--max-old-space-size=8192
# Build the app
RUN yarn prod && yarn cache clean

# Stage 2: Production Image
FROM node:20-bookworm-slim

WORKDIR /app

# Debian package
RUN apt-get update && apt-get install -y curl exiftool libcairo2 libpango1.0-0 libgif7 libheif1 && rm -rf /var/lib/apt/lists/*

# Copy only necessary files from the build stage
COPY --from=builder /app/node_modules ./node_modules
COPY webstack/package.json ./
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/apps/homebase/main.js"]
