# Building

In deployment directory:

- docker buildx build -f pysage3/Dockerfile --tag sage3/pysage3 ..

# Getting into a docker

- docker run -it --rm sage3/pysage3 bash

# Add it to compose (if compose already running)

- docker compose -f docker-compose-foresight.yml run pysage3 bash
