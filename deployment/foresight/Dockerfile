FROM python:3.9-bookworm

# Install in that directory
WORKDIR /app

# Debian package
RUN apt-get update --allow-insecure-repositories && apt-get install -y curl exiftool graphviz && rm -rf /var/lib/apt/lists/*

# Project files
COPY foresight .

# Install dependencies
RUN pip install -r requirements.txt .

WORKDIR /app/foresight
