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

class WebSocketListener:

    def __init__(self, message_queue, room_id):
        # websocket.enableTrace(True)
        self._room_id = room_id
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
        print(f"msg: {msg}")
        # check is needed because we get duplicted messages.
        # # TODO: emtpy the queue when it get to a size of X
        if msg['id'] not in self.received_msg_log or \
                msg['event']['type'] != self.received_msg_log[msg['id']][0] or \
                msg['event']['doc']['_updatedAt'] != self.received_msg_log[msg['id']][1]:

            self.message_queue.put(msg)
            self.received_msg_log[msg['id']] = (msg['event']['type'], msg['event']['doc']['_updatedAt'])

    def on_error(self, ws, error):
        print(f"error in webserver connection {error}")

    # def on_close(self, ws):
    #     logger.debug("Connection to webserver closed")

    def on_open(self, ws):
        room_id = self._room_id
        # room_id = "377bf615-4e64-4db8-9e55-9e8e27747df4"
        subscription_id = str(uuid.uuid4())
        msg_sub = {
            'route': f'/api/subscription/rooms/{room_id}',
            'id': subscription_id, 'method': 'SUB'
        }
        self.ws.send(json.dumps(msg_sub))
        print(f"Connecting to room_id {room_id}")

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
