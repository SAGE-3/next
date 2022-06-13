

#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# TODO: CRITICAL, I am a proxy -- ignore my own messages.

# TODO: add a new validator function that takes a message received on a
#  channel and makes sure it's structurally valid, i.e., has the right required fields
#  and no unknwon fields

# TODO: call this class something else?
import asyncio
import json
import time
import multiprocessing
import websockets
import argparse
# import urllib3
from board import Board
import uuid
import threading
from multiprocessing import Queue

from threading import Thread

# urllib3.disable_warnings()


class BoardProxy():

    OBJECT_CREATION_METHODS = {"BOARDS": Board}

    def __init__(self, config_file, room_id):
        NB_TRIALS = 5
        self.boards = {}
        self.__config = json.load(open(config_file))
        self.__room_id = room_id
        self.__headers = {'Authorization': f"Bearer {self.__config['token']}"}
        self.__message_queue = Queue()


    async def subscribe(self, sock, room_id):
        subscription_id = str(uuid.uuid4())
        message_id = str(uuid.uuid4())
        print('Subscribing to board:', room_id, 'with subscriptionId:', subscription_id)
        msg_sub = {
            'route': '/api/apps/subscribe/:roomId', 'id': message_id,
                   'body': {'subId': subscription_id, 'roomId': room_id}
                   }
        await sock.send(json.dumps(msg_sub))
        msg_sub = {
            'route': '/api/boards/subscribe/:roomId', 'id': message_id,
                   'body': {'subId': subscription_id, 'roomId': room_id}
                   }
        await sock.send(json.dumps(msg_sub))

        # # send the message
        # msg_sub = {'route': '/api/apps/subscribe/:roomId', 'id': message_id,
        #            'body': {'subId': subscription_id, 'roomId': room_id}}
        # await sock.send(json.dumps(msg_sub))

    def receive_messages(self):
        asyncio.set_event_loop(asyncio.new_event_loop())
        async def _run(self):
            async with websockets.connect(self.__config["socket_server"], extra_headers={"Authorization": f"Bearer {self.__config['token']}"}) as ws:
                await self.subscribe(ws, self.__room_id)
                async for msg in ws:
                    msg = json.loads(msg)
                    print(f"I receive the follwing messages and I'm adding it to the queue\n {msg}")
                    self.__message_queue.put("1")
        asyncio.get_event_loop().run_until_complete(_run(self))


    def process_messages(self):
        while True:
            item = self.__message_queue.get()
            print(f'Working on {item}')
            print(f'Finished {item}')

    def clean_up(self):
        print("cleaning up the queue")
        if self.__message_queue.qsize() > 0:
            print("Queue was not empty")
        self.__message_queue.close()


# if msg["event"]["type"] == "CREATE":
#     if  msg["event"]["key"].split(":")[2] == "BOARDS":
#         new_board = Board(msg["event"]["doc"]["data"])
#         self.boards[new_board.id] = new_board
#     else:
#         pass

def get_cmdline_parser():
    parser = argparse.ArgumentParser(description='Sage3 Python Proxy Server')
    parser.add_argument('-c', '--config_file', type=str, required=True, help="Configuration file path")
    parser.add_argument('-r', '--room_id', type=str, required=False, help="Room id")
    return parser


if __name__ == "__main__":
    parser = get_cmdline_parser()
    args = parser.parse_args()
    board_proxy = BoardProxy(args.config_file, args.room_id)
    listening_process = multiprocessing.Process(target=board_proxy.receive_messages)
    worker_process = multiprocessing.Process(target=board_proxy.process_messages)
    try:
        # start the process responsible for listening to messages and adding them to the queue
        listening_process.start()
        # start the process responsible for handling message added to the queue.
        worker_process.start()
        while True: time.sleep(100)
    except (KeyboardInterrupt, SystemExit):
        print('\n! Received keyboard interrupt, quitting threads.\n')
        board_proxy.clean_up()
        listening_process.st
        # worker_process.join()
        print("I am here")
