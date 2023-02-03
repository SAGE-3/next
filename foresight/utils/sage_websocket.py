# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

import os
import websocket
import threading
import json
import uuid
import time
import sys
from multiprocessing import Queue

import logging
logger = logging.getLogger(__name__)


from config import config as conf, prod_type


class SageWebsocket:

    def __init__(self):
        self.connected = False
        self.ws = websocket.WebSocketApp(conf[prod_type]["ws_server"]+"/api",
                                         header={
                                             "Authorization": "Bearer " + os.getenv('TOKEN')},
                                         on_message=lambda ws, msg: self.on_message(
                                             ws, msg),
                                         on_error=lambda ws, msg: self.on_error(
                                             ws, msg),
                                         # on_close=lambda ws: self.on_close(ws),
                                         on_open=lambda ws: self.on_open(ws)
                                         )
        self.wst = None
        self.received_msg_log = {}
        self.queue_list = {}

    def on_open(self, ws):
        self.connected = True

    def on_message(self, ws, message):
        msg = json.loads(message)
        # Get ID
        sub_id = msg['id']
        if self.queue_list[sub_id]:
            # Put into proper queue
            self.queue_list[sub_id].put(msg)
            # Add to message log
            self.received_msg_log[msg['id']] = (
                msg['event']['type'], msg['event']['doc']['_updatedAt'])

    def on_error(self, ws, error):
        logger.error(f"error in webserver websocket connection {error}")

    # Check if the ws has connected
    # attempts (number of times to attempt) 1 attempt per second default 10
    def check_connection(self, attempts=10):
        if self.connected == True:
            return True
        count = 0
        while self.connected == False:
            logger.info('Websocket still not connected')
            count = count + 1
            if count > attempts:
                logger.error('Could not establish a connection to the server after {attempts} attempts')
                return False
            time.sleep(1)
        return True

    # Subscribe to a route
    def setup_sub_queue(self, route):
        if not self.check_connection():
            return
        # Generate id for subscription
        subscription_id = str(uuid.uuid4())
        # Setup queue
        new_queue = Queue()
        # Save queue to list
        self.queue_list[subscription_id] = new_queue
        # WS Message
        msg_sub = {
            'route': route,
            'id': subscription_id, 'method': 'SUB'
        }
        self.ws.send(json.dumps(msg_sub))
        return new_queue

    def run(self):
        self.wst = threading.Thread(target=self.ws.run_forever)
        self.wst.daemon = True
        self.wst.start()

    def clean_up(self):
        self.ws.close()
        # try to jon thread
        nb_tries = 3
        for _ in range(nb_tries):
            if self.wst.is_alive():
                time.sleep(0.2)
            else:
                self.wst.join()
                break
        else:
            logger.error("Couldn't cleanly terminate the websocket")
            sys.exit(1)
