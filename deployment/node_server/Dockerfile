# Build Stage 1
# This build created a staging docker image
#
FROM node:18-bullseye as build

# Install in that directory
WORKDIR /app

# Debian package
RUN apt-get update && apt-get install -y exiftool libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libheif1 libheif-dev && rm -rf /var/lib/apt/lists/*

# Project files
COPY webstack/package.json package.json
COPY webstack/yarn.lock yarn.lock
# Install in production mode
RUN yarn install --ignore-optional --frozen-lockfile --network-timeout 1000000

# Code
COPY webstack/nx.json nx.json
COPY webstack/workspace.json workspace.json
COPY webstack/babel.config.json babel.config.json
COPY webstack/tsconfig.base.json	tsconfig.base.json
COPY webstack/apps apps
COPY webstack/libs libs
# Build the app
RUN yarn prod


# Build Stage 2
# This build takes the production build from staging build
#
FROM node:18-bullseye
# Debian package
RUN apt-get update && apt-get install -y exiftool build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && rm -rf /var/lib/apt/lists/*

# Install in that directory
WORKDIR /app

COPY webstack/package.json package.json
COPY webstack/yarn.lock yarn.lock
# nodejs module to reduce size
RUN npm install modclean patch-package -g
# Install deps in production mode and cleanup
RUN yarn install --frozen-lockfile --network-timeout 1000000 --prod && modclean -P -r --patterns="default:*" --ignore="pdfjs-dist/**"

COPY --from=build /app/dist ./dist

CMD ["node", "dist/apps/homebase/main.js"]
