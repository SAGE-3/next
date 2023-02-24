# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# TODO: checking messages that are created at the same time and only executing the first
#  one keeping info in received_msg_log for now. These seems to be related to raised=True

# TODO: add a new validator function that takes a message received on a
#  channel and makes sure it's structurally valid, i.e., has all the required fields
#  and no unknown fields

# TODO prevent apps updates on fields that were touched?
from queue import Empty
import signal
import sys
import os
from typing import Callable
from pydantic import BaseModel
import json
import threading
import logging
from board import Board
from room import Room
from smartbitfactory import SmartBitFactory
from utils.sage_communication import SageCommunication
from config import config as conf, prod_type
from smartbits.genericsmartbit import GenericSmartBit
from utils.sage_websocket import SageWebsocket

def setup_logger():
    debug_fmt = '%(asctime)s  | %(levelname)s | %(module)s | %(filename)s | %(message)s'
    devel_fmt = '%(asctime)s  | %(levelname)s | %(module)s | %(message)s'
    logging.basicConfig(filename='proxy.log')
    logging.basicConfig()

    formatter = None
    logger = logging.getLogger(__name__)
    if os.getenv("LOG_LEVEL") is not None and os.getenv("LOG_LEVEL") == "debug":
        formatter = logging.Formatter(debug_fmt)
        logger.root.setLevel(logging.DEBUG)
    else:
        formatter = logging.Formatter(devel_fmt)
        logger.root.setLevel(logging.INFO)
    logger.root.handlers[0].setFormatter(formatter)
    return logger

logger = setup_logger()



if __name__ == "__main__":

    def got_msg(ws, message):
        print(f"got message {message}")

    logger.info(f"Starting test")
    socket = SageWebsocket(on_message_fn=got_msg)
    socket.subscribe(['/api/apps', '/api/rooms', '/api/boards'])

    print("dead")
