#!/bin/sh

# Server names in compose mode
# `redis-server`  -> store the token
# for now in a file

# generate a pseudo-random token
token=$(openssl rand -hex 8)
echo "Token: $token"
# Save it into a file
echo "{ \"token\": \"$token\" }" >/conf/info.json

# Inside docker compose, the redis server is named `redis-server`
export REDIS_URL="redis-server"
export REDIS_PORT=6379
pip3 install redis
python3 /conf/redis-store.py $token

# dependencies (requirements.txt)
pip3 install websockets matplotlib pytest requests namesgenerator httpx pydantic
pip3 install ipython jupyter_client jupyter-console jupyterlab-link-share plotly
pip3 install rectpack graphviz

# 2D extension
jupyter nbextension install /conf/2D-Jupyter --user
jupyter nbextension enable 2D-Jupyter/2D-Jupyter --user

# Start jupyter: production mode equals SSL (docker will export the port)
if [ "$ENVIRONMENT" = production ]; then
  jupyter lab --collaborative --no-browser --ServerApp.token="$token" --ServerApp.port=8888 \
    --ServerApp.ip=0.0.0.0 --ServerApp.allow_origin='*' \
    --ServerApp.keyfile=/conf/keys/private-key.key --ServerApp.certfile=/conf/keys/certificate.crt \
    --notebook-dir="notebooks"
else
  jupyter lab --collaborative --no-browser --ServerApp.token="$token" --ServerApp.port=8888 \
    --ServerApp.ip=0.0.0.0 --ServerApp.allow_origin='*' \
    --notebook-dir="notebooks"
fi
