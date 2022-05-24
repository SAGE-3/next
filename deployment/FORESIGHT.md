# Building

In deployment directory:

- docker buildx build -f foresight/Dockerfile --tag sage3/foresight ..

# Getting into a docker

- docker run -it --rm sage3/foresight bash

# Add it to compose (if compose already running)

- docker compose -f docker-compose-foresight.yml run foresight bash
