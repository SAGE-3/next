#!/bin/sh

# Server names in compose mode
# `redis-server`  -> store the token
# for now in a file

# generate a pseudo-random token
token=$(openssl rand -hex 8)
echo "Token: $token"
# Save it into a file
echo "{ \"token\": \"$token\" }" >/conf/info.json

export REDIS_URL="redis-server"
export REDIS_PORT=6379
pip3 install redis
python3 /conf/redis-store.py $token

# dependencies (requirements.txt)
pip3 install websockets matplotlib rejson pytest requests namesgenerator httpx pydantic
# extras
# pip3 install python-magic rq dill opencv-python Pillow

# for jypyter console and client
# pip3 install ipython jupyter_client==6.1.12 jupyter-console jupyterlab-link-share
pip3 install ipython jupyter_client jupyter-console jupyterlab-link-share

# 2D extension
jupyter nbextension install /conf/2D-Jupyter --user
jupyter nbextension enable 2D-Jupyter/2D-Jupyter --user
# jupyter labextension install --user /conf/2D-Jupyter
# jupyter labextension enable 2D-Jupyter/2D-Jupyter

# Start jupyter
#jupyter lab --no-browser --ServerApp.token="$token" --ServerApp.port=8888 --ServerApp.ip=0.0.0.0 --notebook-dir="notebooks"
#jupyter notebook --no-browser --NotebookApp.token="$token" --ServerApp.port=8888 --ServerApp.ip=0.0.0.0 --notebook-dir="notebooks"
jupyter lab --collaborative --no-browser --NotebookApp.token="$token" --ServerApp.port=8888 --ServerApp.ip=0.0.0.0 --notebook-dir="notebooks"
