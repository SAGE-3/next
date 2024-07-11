#!/bin/sh

# Server names in compose mode
# `redis-server`  -> store the token
# for now in a file

# generate a pseudo-random token
token=$(openssl rand -hex 16)
echo "Token: $token"
# Save it into a file
echo "{ \"token\": \"$token\" }" >/conf/info.json

# Inside docker compose, the redis server is named `redis-server`
export REDIS_URL="redis-server"
export REDIS_PORT=6379
pip3 install redis
python3 /conf/redis-store.py $token

# dependencies (requirements.txt)
# pip3 install websockets matplotlib rejson pytest requests namesgenerator httpx pydantic
# pip3 install ipython jupyter_client jupyter-console jupyterlab-link-share

#pip3 install matplotlib plotly
#pip3 install jupyterlab-lsp pyright python-language-server python-lsp-server[all] jupyter_collaboration
# Getting All the NodeJS-based Language Servers
#jlpm add --dev bash-language-server vscode-css-languageserver-bin dockerfile-language-server-nodejs vscode-html-languageserver-bin javascript-typescript-langserver vscode-json-languageserver-bin yaml-language-server

# Extra modules
pip3 install plotly imageio openai jupyter_collaboration
# SAGE3 module
pip3 install ws4py celery httpx rectpack networkx graphviz pysage3

# foresight
#pip install git+https://github.com/SAGE-3/next.git@dev#subdirectory=foresight
# LSP
#pip install jupyterlab-lsp==5.0.0
#pip install 'python-lsp-server[all]'

# Disable the news feed popup
jupyter labextension disable "@jupyterlab/apputils-extension:announcements"

# 2D extension
# jupyter nbextension install /conf/2D-Jupyter --user
# jupyter nbextension enable 2D-Jupyter/2D-Jupyter --user

# Start jupyter: production mode equals SSL (docker will export the port)
# if [ "$ENVIRONMENT" = production ]; then
#   jupyter lab --collaborative --no-browser --IdentityProvider.token="$token" --ServerApp.port=8888 \
#     --ServerApp.ip=0.0.0.0 --ServerApp.allow_origin='*' \
#     --ServerApp.keyfile=/conf/keys/private-key.key --ServerApp.certfile=/conf/keys/certificate.crt \
#     --notebook-dir="notebooks"
# else
#   jupyter lab --collaborative --no-browser --ServerApp.token="$token" --ServerApp.port=8888 \
#     --ServerApp.ip=0.0.0.0 --ServerApp.allow_origin='*' \
#     --notebook-dir="notebooks"
# fi

BASE_URL="/jupyter/"
# BASE_URL="/"

jupyter lab --collaborative --no-browser --ServerApp.token="$token" --ServerApp.port=8888 \
  --ServerApp.ip=0.0.0.0 --ServerApp.allow_origin='*' \
  --ServerApp.base_url=${BASE_URL} \
  --notebook-dir="notebooks"
