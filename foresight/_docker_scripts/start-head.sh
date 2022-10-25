#!/bin/sh

# TODO: change download URL based on underlying architecture

# download
wget "https://download.docker.com/linux/ubuntu/dists/focal/pool/stable/arm64/docker-ce-cli_20.10.19~3-0~ubuntu-focal_arm64.deb"
wget "https://download.docker.com/linux/ubuntu/dists/focal/pool/stable/arm64/docker-compose-plugin_2.12.0~ubuntu-focal_arm64.deb"

dpkg -i docker-ce-cli_20.10.19~3-0~ubuntu-focal_arm64.deb
dpkg -i docker-compose-plugin_2.12.0~ubuntu-focal_arm64.deb

export DOCKER_HOST="unix:///var/run/docker.sock"

export PIP_ROOT_USER_ACTION=ignore
pip install --upgrade pip
pip install ipython
pip install python_on_whales

python monitor_room_activity.py
