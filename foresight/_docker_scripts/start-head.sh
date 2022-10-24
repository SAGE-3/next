#!/bin/sh


# check the room id is provided

export PIP_ROOT_USER_ACTION=ignore
pip install --upgrade pip
pip install ipython
pip install python_on_whales

export DOCKER_HOST="unix:///var/run/docker.sock"

python monitor_room_activity.py
