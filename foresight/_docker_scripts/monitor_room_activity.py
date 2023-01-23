#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

"""
The host_url is expoerted from start-head.sh. Right now, using Unix sock of Docker Deamon.
Will be changed when I get the address of the docker engine API.
Docker `watcher` or `head` (find a proper name) started with:
docker run -t \
    -v /var/run/docker.sock:/var/run/docker.sock \
    python python /foresight/_docker_scripts/websocketlistener.py
"""

import sys
from python_on_whales import DockerClient
from utils.sage_communication import SageCommunication
from config import config as conf, prod_type
import os
import uuid
import time


host_URL = os.environ.get("DOCKER_HOST")

if not host_URL:
    print(" the DOCKER_HOST env variable is not set")
    sys.exit(1)

listener_time_sleep = 5
max_nb_supported_rooms = 10


def get_prefix(_uuid, len=16):
    """
    Get the first len=16 chars of a uuid
    this is needed to add the string as a prefix to the running docker image
    :param uuid: ex. 'b34cf54e-2f9e-4b9a-a458-27f4b6c658a7'
    :return: the first len chars, no including `-`. Example 'b34cf54e2f9e'
    """
    return uuid.UUID(_uuid).hex[:len]


def hadle_docker_compose_action(prefix, action):
    """
    :param prefix: the prefix of the room id to use
    :param action: `up` to start a docker image and `down` to stop it.
    :return:
    """
    if action not in ["UP", "DOWN"]: raise Exception("unrecognized action {action}")

    with open(".env", "w") as env_file:
        # .env is exporter by docker compose so the proxy script will have access
        # ROOM_ID below
        env_file.write(f"ROOM_ID={room_id}")

    docker = DockerClient(host=host_URL, compose_files=["./docker-compose-proxy.yml"],
                          compose_project_name=prefix)
    if action.upper() == "UP":
        docker.compose.up()
    else:
        docker.compose.down()


if __name__ == "__main__":
    # keep track of room that are currently served by proxy
    active_rooms = set()

    sage_comm = SageCommunication(conf, prod_type)

    while True:
        current_rooms = sage_comm.get_rooms()
        current_room_ids = [get_prefix(x["_id"]) for x in current_rooms]

        # handle inactive_room_ids here (down the docker images)
        inactive_room_ids = active_rooms - set(current_room_ids)
        for room_id in inactive_room_ids:
            hadle_docker_compose_action(room_id, "DOWN")
            active_rooms.remove(room_id)
            max_nb_supported_rooms -= 1

        # handle newly added rooms
        new_room_ids = set(current_room_ids) - active_rooms

        for room_id in new_room_ids:
            if len(active_rooms) < max_nb_supported_rooms:
                hadle_docker_compose_action(room_id, "UP")
                active_rooms.add(room_id)
                max_nb_supported_rooms += 1

        # sleep and be nice to the system
        time.sleep(listener_time_sleep)
