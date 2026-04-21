#!/bin/sh

# check the room id is provided
# ROOM_ID is exported by the compose up script as part of the .env file

if [ -z "$ROOM_ID" ]; then
    echo "Must include the room id to run a proxy container" 1>&2
    exit 1
fi

export PIP_ROOT_USER_ACTION=ignore
pip install --upgrade pip
pip install -r /pysage3/requirements.txt
echo ${ROOM_ID} > /pysage3/room.id
python -m pysage3.proxy
