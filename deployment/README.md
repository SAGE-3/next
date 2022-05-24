# SAGE3: Deployment

This folder contains the necessary files to start up a SAGE3 Server Instance and run the backend end dev docker images.

# Docker

Docker is a platform that uses OS-level virtualization to deliver software and applications within standalone packages called containers. This allows SAGE3 servers to be installed on any computer without developers worrying about various OS idiosyncrasies. Users wanting to set up their own SAGE3 server would only have to install Docker and run the SAGE3 containers. Docker runs on Windows, MacOS, CentOS, Ubuntu, and many Unix variants. Being able to target all these OSs enables SAGE3 to be installed on more systems, and frees developers from worrying about the differences among the various OSs.

# Install Docker Desktop

[Docker Desktop](https://www.docker.com/products/docker-desktop)

# Run Development Backend

Require the whole `git clone` files.

## Starting

```bash
docker-compose -f docker-compose-light.yml  up --remove-orphans
```

## Stopping

```bash
# Stop running the containers
docker-compose -f docker-compose-light.yml stop
# Remove stopped containers
docker-compose -f docker-compose-light.yml rm -f
```

# Setup SAGE3 Production Server Instance

Requires a limited configuration file set (deployment folder)

## Regular server

Using the main `docker-compose.yml` file

```bash
docker-compose -f docker-compose.yml  up --remove-orphans
```

## Advanced server: with Foresight

Using the main `docker-compose-foresight.yml` file: it adds the python backend (foresight engine with the SAGE3 proxy) using the docker hub image `sage3/foresight`.

```bash
docker-compose -f docker-compose-foresight.yml  up --remove-orphans
```
