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
        # msg: {
        #     'id': 'f90ca6b5-1025-4875-92b3-6cc69387ed5c',
        #     'event': {
        #         'type': 'UPDATE',
        #         'doc': {
        #             '_id': '82beeb64-3910-4cac-beb9-e676ac9a363d',
        #             '_createdAt': 1673670963591,
        #             '_createdBy': 'e5a9a3da-e141-4412-8a51-51567c6ee810',
        #             '_updatedAt': 1674030074889,
        #             '_updatedBy': 'c922f4c5-b2b4-4942-9391-f5f949cb2dd4',
        #             'data': {
        #                 'title': 'Kernel Dashboard',
        #                 'roomId': '257024f7-fa24-4eab-8443-e4ab4b81ff75',
        #                 'boardId': 'b00c2139-50fb-4e1b-8694-746c5680c652',
        #                 'position': {'x': 1501157, 'y': 1499601, 'z': 0 },
        #                 'size': {'width': 2100, 'height': 787, 'depth': 0},
        #                 'rotation': {'x': 0, 'y': 0, 'z': 0},
        #                 'type': 'KernelDashboard',
        #                 'state': {
        #                     'kernelSpecs': ['python3', 'julia-1.8', 'ir'],
        #                     'availableKernels': [],
        #                     'executeInfo': {
        #                         'executeFunc': '', 'params': {}
        #                         },
        #                     'online': True,
        #                     'lastHeartBeat': 1674030074879
        #                     },
        #                 'raised': False
        #                 }
        #             },
        #         'updates': {
        #             'state.lastHeartBeat': 1674030074879,
        #             'state.online': True
        #             },
        #         'col': 'APPS'
        #         }
        #      }
        if 'updates' in msg['event'] and 'state.online' in msg['event']['updates'] and msg['event']['updates']['state.online'] == True:
            # print("online")
            pass
        else:
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
