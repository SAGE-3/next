#!/bin/sh


# check the room id is provided
# ROOM_ID is exported by the compose up script as part of the .env file

if [ -z "$ROOM_ID" ]; then
    echo "Must include the room id to run a proxy cotainer" 1>&2
    exit 1
fi


export PIP_ROOT_USER_ACTION=ignore
pip install --upgrade pip
pip install -r /foresight/requirements.txt
echo ${ROOM_ID} > /foresight/room.id
python /foresight/_docker_scripts/test.py

# start proxy.py $1 
