FROM python:3.8-bullseye

# Install in that directory
WORKDIR /app

# Debian package
RUN apt-get update && apt-get install -y graphviz && rm -rf /var/lib/apt/lists/*

# Project files
COPY foresight .

# Install dependencies
RUN pip install -r requirements.txt

