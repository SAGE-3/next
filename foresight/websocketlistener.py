import os
import websocket
import threading
import json
import uuid
import time
from utils import logging_config
import sys

logger = logging_config.get_console_logger()

from config import config as conf, prod_type

class WebSocketListener:

    def __init__(self, message_queue):
        # websocket.enableTrace(True)
        self.ws = websocket.WebSocketApp(conf[prod_type]["ws_server"]+"/api",
                                         header={"Authorization": "Bearer " + os.getenv('TOKEN')},
                                         on_message=lambda ws, msg: self.on_message(ws, msg),
                                         on_error=lambda ws, msg: self.on_error(ws, msg),
                                         # on_close=lambda ws: self.on_close(ws),
                                         on_open=lambda ws: self.on_open(ws))
        self.wst = None
        self.received_msg_log = {}
        self.message_queue = message_queue

    def on_message(self, ws, message):

        msg = json.loads(message)
        logger.debug(f"msg: {msg}")
        # check is needed because we get duplicted messages.
        # # TODO: emtpy the queue when it get to a size of X
        if msg['id'] not in self.received_msg_log or \
                msg['event']['doc']['_updatedAt'] != self.received_msg_log[msg['id']]:
            self.message_queue.put(msg)
            self.received_msg_log[msg['id']] = msg['event']['doc']['_updatedAt']

    def on_error(self, ws, error):
        logger.error(f"error in webserver connection {error}")

    # def on_close(self, ws):
    #     logger.debug("Connection to webserver closed")

    def on_open(self, ws):
        room_id = "b34cf54e-2f9e-4b9a-a458-27f4b6c658a7"
        subscription_id = str(uuid.uuid4())
        msg_sub = {
            'route': f'/api/subscription/rooms/{room_id}',
            'id': subscription_id, 'method': 'SUB'
        }
        self.ws.send(json.dumps(msg_sub))
        logger.debug(f"Connecting to room_id {room_id}")

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
            logger.error("Couldn't cleanly terminate the program")
            sys.exit(1)
