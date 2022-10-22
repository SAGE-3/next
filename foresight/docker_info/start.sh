#!/bin/sh


pip install --upgrade pip

pip install -r /foresight/requirements.txt

# echo "room is $1" > /foresight/room.id

python /foresight/docker_info/test.py

# start proxy.py with $1 as room id
