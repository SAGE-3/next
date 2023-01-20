#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import os
import websocket
import threading
import json
import uuid
import time
from utils import _logging_config
import sys

# logger = logging_config.get_console_logger()

from config import config as conf, prod_type

class WebsocketRoomListener:

    def __init__(self, message_queue):
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
        print(message)
        msg = json.loads(message)
        if True:
            self.message_queue.put(msg)
            self.received_msg_log[msg['id']] = (msg['event']['type'], msg['event']['doc']['_updatedAt'])
            print(f"msg: {msg}")
        else:
            print(f"msg ignored: {msg}")

    def on_error(self, ws, error):
        print(f"error in webserver connection {error}")

    # def on_close(self, ws):
    #     logger.debug("Connection to webserver closed")

    def on_open(self, ws):     
        print('on open')
        subscription_id = str(uuid.uuid4())
        msg_sub = {
            'route': f'/api/rooms',
            'id': subscription_id, 'method': 'SUB'
        }
        self.ws.send(json.dumps(msg_sub))


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
            print("Couldn't cleanly terminate the program")
            sys.exit(1)
