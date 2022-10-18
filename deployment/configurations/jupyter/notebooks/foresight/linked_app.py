# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# TODO: CRITICAL, I am a proxy -- ignore my own messages.

# TODO: add a new validator function that takes a message received on a
#  channel and makes sure it's structurally valid, i.e., has the right required fields
#  and no unknwon fields

# TODO prevent apps updates on fields that were touched?

import asyncio
import json
import threading
import websockets
from typing import Callable
import uuid
from multiprocessing import Queue

from threading import Thread

from pydantic import BaseModel

# urllib3.disable_warnings()

class Room:
    def __init__(self, room_id):
        self.room_id = room_id
        self.boards = {}


class linkedAppInfo(BaseModel):
    src: str
    dests: list
    src_field: str
    dests_fields: list
    callback: Callable


async def subscribe(sock, room_id):
    subscription_id = str(uuid.uuid4())
    # message_id = str(uuid.uuid4())
    print('Subscribing to room:', room_id, 'with subscriptionId:', subscription_id)
    msg_sub = {
        'route': f'/api/subscription/rooms/{room_id}',
        'id': subscription_id, 'method': 'SUB'
    }
    await sock.send(json.dumps(msg_sub))


class LinkedApp():
    def __init__(self, room_id, config_file = "config/config.json"):
        self.room = Room(room_id)
        # self.__OBJECT_CREATION_METHODS = {"BOARDS": self.create_new_board}
        # NB_TRIALS = 5
        self.__config = json.load(open(config_file))
        self.__headers = {'Authorization': f"Bearer {self.__config['token']}"}
        self.listening_process = threading.Thread(target=self.receive_messages)
        self.listening_process.start()
        self.__message_queue = Queue()
        self.callbacks = {}

    def receive_messages(self):
        async def _run(self):
            async with websockets.connect(self.__config["socket_server"],
                                          extra_headers={"Authorization": f"Bearer {self.__config['token']}"}) as ws:
                await subscribe(ws, self.room.room_id)
                print("completed subscription, waiting for messages")
                async for msg in ws:
                    msg = json.loads(msg)
                    print(f"\n*****The message id is {msg['id']}")
                    print(f"Received: \n {msg}")
                    # if I care about this?
                    if msg['id'] in self.callbacks:
                        self.__message_queue.put(msg)



        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_run(self))




    def register_func(self, src, dests, src_field, dests_fields, callback):
        self.callbacks[src] = linkedAppInfo(src=src,
                                            dests=dests,
                                            src_field=src_field,
                                            dests_fields=dests_fields,
                                            callback=callback)


    def update_on_change(self):
        pass





