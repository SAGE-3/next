
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

# TODO: call this class something else?
import asyncio
import json
import time
import multiprocessing
import threading
import websockets
import argparse
# import urllib3
from board import Board
import uuid
from multiprocessing import Queue
import requests
from smartbitfactory import SmartBitFactory

from threading import Thread


# urllib3.disable_warnings()

class Room:
    def __init__(self, room_id):
        self.room_id = room_id
        self.boards = {}


async def subscribe(sock, room_id):
    subscription_id = str(uuid.uuid4())
    # message_id = str(uuid.uuid4())
    print('Subscribing to room:', room_id, 'with subscriptionId:', subscription_id)
    msg_sub = {
        'route': f'/api/subscription/rooms/{room_id}',
        'id': subscription_id, 'method': 'SUB'
    }
    await sock.send(json.dumps(msg_sub))



class BoardProxy():

    def __init__(self, config_file, room_id):
        self.room = Room(room_id)
        # self.__OBJECT_CREATION_METHODS = {"BOARDS": self.create_new_board}
        # NB_TRIALS = 5
        self.__config = json.load(open(config_file))
        self.__headers = {'Authorization': f"Bearer {self.__config['token']}"}
        self.__message_queue = Queue()
        self.__OBJECT_CREATION_METHODS = {
            "CREATE": self.__handle_create,
            "UPDATE": self.__handle_update,
            "DELETE": self.__handle_delete,
        }

    def authenticat_new_user(self):
        headers = {'Authorization': f"Bearer {self.__config['token']}"}
        r = requests.post( self.__config['server'] + '/auth/jwt', headers=headers)
        response = r.json()

    def receive_messages(self):
        asyncio.set_event_loop(asyncio.new_event_loop())
        # self.authenticat_new_user()
        async def _run(self):
            async with websockets.connect(self.__config["socket_server"],
                                          extra_headers={"Authorization": f"Bearer {self.__config['token']}"}) as ws:
                await subscribe(ws, self.room.room_id)
                print("completed subscription, checking if boards and apps already there")
                async for msg in ws:
                    msg = json.loads(msg)
                    print(f"I receive the follwing messages and I'm adding it to the queue\n {msg}")
                    self.__message_queue.put(msg)

        asyncio.get_event_loop().run_until_complete(_run(self))

    def process_messages(self):
        """
        Running this in the main thread to not deal with sharing variables right.
        potentially work on a multiprocessing version where threads are processed separately
        Messages needs to be numbered to avoid received out of sequences messages.
        """
        while True:
            msg = self.__message_queue.get()
            msg_type = msg["event"]["type"]
            self.__OBJECT_CREATION_METHODS[msg_type](msg)

    def clean_up(self):
        print("cleaning up the queue")
        if self.__message_queue.qsize() > 0:
            print("Queue was not empty")
        self.__message_queue.close()

    def __handle_exec(self, msg):
        pass

    def __handle_create(self, msg):
        data = msg["event"]["doc"]["data"]
        collection = msg["event"]['col']
        if collection == "BOARDS":
            print("BOARD CREATED")
            new_board = Board(data)
            self.room.boards[new_board.id] = new_board
        elif collection == "APPS":
            print("APP CREATED")
            smartbit = SmartBitFactory.create_smartbit(data)
            self.room.boards[data["boardId"]].smartbits[smartbit.id] = smartbit

    def __handle_update(self, msg):
        print("HANDLE UPDATE")
        pass

    def __handle_delete(self, msg):
        print("HANDLE DELETE")
        pass



def get_cmdline_parser():
    parser = argparse.ArgumentParser(description='Sage3 Python Proxy Server')
    parser.add_argument('-c', '--config_file', type=str, required=True, help="Configuration file path")
    parser.add_argument('-r', '--room_id', type=str, required=False, help="Room id")
    return parser



board_proxy = BoardProxy("config.json", "8723076c-d28f-4b11-8931-e15be5613c34")
listening_process = threading.Thread(target=board_proxy.receive_messages)
worker_process = threading.Thread(target=board_proxy.process_messages)
listening_process.start()
worker_process.start()

# TODO start threads cleanly in a way that can be easily stopped.
# if __name__ == "__main__":
#     # The below is needed in running in iPython -- need to dig into this more
#     # multiprocessing.set_start_method("fork")
#     # parser = get_cmdline_parser()
#     # args = parser.parse_args()
#     board_proxy = BoardProxy("config.json", "05828804-d87f-4498-857e-02f288effd3d")
#
#     # room = Room("08d37fb0-b0a7-475e-a007-6d9dd35538ad")
#     # board_proxy = BoardProxy(args.config_file, args.room_id)
#     # listening_process = multiprocessing.Process(target=board_proxy.receive_messages)
#     # worker_process = multiprocessing.Process(target=board_proxy.process_messages)
#
#     listening_process = threading.Thread(target=board_proxy.receive_messages)
#     worker_process = threading.Thread(target=board_proxy.process_messages)
#
#     try:
#         # start the process responsible for listening to messages and adding them to the queue
#         listening_process.start()
#         # start the process responsible for handling message added to the queue.
#         worker_process.start()
#
#         # while True:
#         #     time.sleep(100)
#     except (KeyboardInterrupt, SystemExit):
#         print('\n! Received keyboard interrupt, quitting threads.\n')
#         board_proxy.clean_up()
#         listening_process.st
#         # worker_process.join()
#         print("I am here")
