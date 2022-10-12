# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------
# TODO: checking messages that are created at the same time and only executing the first
#  one keeping info in received_msg_log for now. These seems to be related to raised=True



# TODO: Fix the issue of messages received twic during updates. There is not need for that!

# TODO: CRITICAL, I am a proxy -- ignore my own messages.

# TODO: add a new validator function that takes a message received on a
#  channel and makes sure it's structurally valid, i.e., has the right required fields
#  and no unknwon fields


# TODO prevent apps updates on fields that were touched?
from typing import Callable
from pydantic import BaseModel
import asyncio
import json
import threading
import websockets
import argparse
from board import Board
import uuid
from multiprocessing import Queue
import requests
from smartbitfactory import SmartBitFactory
import httpx
from utils.sage_communication import SageCommunication
from config import config as conf, prod_type

import logging
logging.getLogger().setLevel(logging.INFO)


import builtins

# TODO: (should we) replace this by logging instead.
 # Does logging still show up in the code cell?

# def print(*args, **kwargs):
#     builtins.print("<console-print>", end="")
#     builtins.print(*args, **kwargs, end="")
#     builtins.print("</console-print>")


# import logging
# from jupyterkernelproxy_client import JupyterKernelClient

# from threading import Thread


# urllib3.disable_warnings()



class Room:
    def __init__(self, room_id):
        self.room_id = room_id
        self.boards = {}


async def subscribe(sock, room_id):
    subscription_id = str(uuid.uuid4())
    # message_id = str(uuid.uuid4())
    logging.info(f"Subscribing to room: {room_id} with subscriptionId: {subscription_id}")
    # print('Subscribing to room:', room_id, 'with subscriptionId:', subscription_id)
    msg_sub = {
        'route': f'/api/subscription/rooms/{room_id}',
        'id': subscription_id, 'method': 'SUB'
    }
    await sock.send(json.dumps(msg_sub))

class LinkedInfo(BaseModel):
    board_id: str
    src_app: str
    dest_app: str
    src_field: str
    dest_field: str
    callback: Callable

# TODO: sample callback for linked app. Other example
#  needed. Also new home for such functions is also needed
def update_dest_from_src(src_val, dest_app, dest_field):
    setattr(dest_app.state, dest_field, src_val)
    dest_app.send_updates()

class SAGEProxy():
    def __init__(self, room_id, conf, prod_type):
        self.room = Room(room_id)
        self.conf = conf
        self.prod_type = prod_type
        self.__headers = {'Authorization': f"Bearer {self.conf['token']}"}
        self.__message_queue = Queue()
        self.__OBJECT_CREATION_METHODS = {
            "CREATE": self.__handle_create,
            "UPDATE": self.__handle_update,
            "DELETE": self.__handle_delete,
        }
        self.httpx_client = httpx.Client()
        self.s3_comm = SageCommunication(self.conf, self.prod_type)
        self.callbacks = {}
        self.received_msg_log = {}

    def authenticat_new_user(self):
        r = self.httpx_client.post(self.conf[self.prod_type]['web_server'] + '/auth/jwt', headers=self.__headers)
        response = r.json()

    def populate_exisitng(self):
        boards_info = self.s3_comm.get_boards(self.room.room_id)
        for board_info in boards_info:
            self.__handle_create("BOARDS", board_info)

        apps_info = self.s3_comm.get_apps(self.room.room_id)
        for app_info in apps_info:
            logging.info(f"Creating {app_info}")
            # print(f"Creating {app_info}")
            self.__handle_create("APPS", app_info)


    async def receive_messages(self):
        async with websockets.connect(self.conf[self.prod_type]["ws_server"]+"/api",
                                      extra_headers={"Authorization": f"Bearer {self.conf['token']}"}) as ws:
            await subscribe(ws, self.room.room_id)
            # print("completed subscription, checking if boards and apps already there")
            self.populate_exisitng()
            async for msg in ws:
                msg = json.loads(msg)

                if msg['id'] not in self.received_msg_log or \
                        msg['event']['doc']['_updatedAt'] !=  self.received_msg_log[msg['id']]:
                    self.__message_queue.put(msg)
                    self.received_msg_log[msg['id']] = msg['event']['doc']['_updatedAt']
                    # print(f"in receive_messages adding: {msg}")
                else:
                    # print(f"in receive_messages ignoring message sent at {self.received_msg_log[msg['id']]}")
                    pass

    def process_messages(self):
        """
        Running this in the main thread to not deal with sharing variables right.
        potentially work on a multiprocessing version where threads are processed separately
        Messages needs to be numbered to avoid received out of sequences messages.
        """
        while True:
            msg = self.__message_queue.get()
            # I am watching this message for change?

            #print(f"Getting ready to process: {msg}")
            logging.info(f"Getting ready to process: {msg}")
            msg_type = msg["event"]["type"]
            updated_fields = []
            print(f"msg received is {msg}")

            if msg['event']['type'] == "UPDATE":
                print("Is update")
                updated_fields = list(msg['event']['updates'].keys())
                # print(f"App updated and updated fields are: {updated_fields}")
                logging.info(f"App updated and updated fields are: {updated_fields}")
                app_id = msg["event"]["doc"]["_id"]
                if app_id in self.callbacks:
                    print("Is callback")

                    # handle callback
                    # print("this app is being tracked for updates")
                    # print(f"tracked field is {self.callbacks[app_id].src_field}")
                    for linked_info in self.callbacks[app_id]:
                        if f"state.{linked_info.src_field}" in updated_fields:
                            # print("Yes, the tracked fields was updated")
                            # TODO 4: make callback function optional. In which case, jsut update dest with src
                            # TODO 1. We need to dispatch the function on a different thread, not run it
                            #  on the same thread as proxy
                            # TODO 2. Catch to avoid errors here so the thread does not crash
                            # TODO 3. Refactor the below into a function
                            board_id = linked_info.board_id
                            src_val = msg['event']['updates'][f"state.{linked_info.src_field}"]
                            dest_field = linked_info.dest_field
                            dest_id = linked_info.dest_app
                            dest_app = self.room.boards[board_id].smartbits[dest_id]
                            linked_info.callback(src_val, dest_app, dest_field)

            if "updates" in msg['event'] and 'raised' in msg['event']['updates'] and msg['event']['updates']["raised"]:
                # print("The received update is discribed a raised app... ignoring it")
                pass
            else:
                collection = msg["event"]['col']
                doc = msg['event']['doc']
                self.__OBJECT_CREATION_METHODS[msg_type](collection, doc)


    def __handle_exec(self, msg):
        pass

    def __handle_create(self, collection, doc):
        # we need state to be at the same level as data
        if collection == "BOARDS":
            # print("BOARD CREATED")
            new_board = Board(doc)
            self.room.boards[new_board.id] = new_board
        elif collection == "APPS":
            # print("APP CREATED")
            doc["state"] = doc["data"]["state"]
            del(doc["data"]["state"])
            smartbit = SmartBitFactory.create_smartbit(doc)
            self.room.boards[doc["data"]["boardId"]].smartbits[smartbit.app_id] = smartbit

    def __handle_update(self, collection, doc):
        # TODO: prevent updates to fields that were touched
        # TODO: this in a smarter way. For now, just overwrite the comlete object
        if collection == "BOARDS":
            # print("BOARD UPDATED: UNHANDLED")
            pass
        elif collection == "APPS":
            # print(f"APP UPDATED")
            app_id = doc["_id"]
            board_id = doc['data']["boardId"]

            sb = self.room.boards[board_id].smartbits[app_id]

            # Note that set_data_form_update clear touched field
            sb.refresh_data_form_update(doc)

            exec_info = getattr(sb.state, "executeInfo", None)

            if exec_info is not None:
                print("\n\nI AM IN EXECUTE INFO\n\n")
                func_name =  getattr(exec_info, "executeFunc")
                if func_name != '':
                    _func = getattr(sb, func_name)
                    _params = getattr(exec_info, "params")
                    # TODO: validate the params are valid
                    # print(f"About to execute function --{func_name}-- with params --{_params}--")
                    logging.info(f"About to execute function --{func_name}-- with params --{_params}--")

                    _func(**_params)


    def __handle_delete(self, collection, doc):
        print("HANDLE DELETE: UNHANDLED")
        pass

    def clean_up(self):
        # print("cleaning up the queue")
        if self.__message_queue.qsize() > 0:
            print("Queue was not empty")
            pass
        self.__message_queue.close()

    def register_linked_app(self, board_id, src_app, dest_app, src_field, dest_field, callback):

        if src_app not in  self.callbacks:
            self.callbacks[src_app] = {}

        self.callbacks[src_app] = { f"{src_app}:{dest_app}:{src_field}:{dest_field}":
                                        LinkedInfo(board_id=board_id,
                                                  src_app=src_app,
                                                  dest_app=dest_app,
                                                  src_field=src_field,
                                                  dest_field=dest_field,
                                                  callback=callback)}

    def deregister_linked_app(self, board_id, src_app, dest_app, src_field, dest_field):
        del(self.callbacks[src_app][f"{src_app}:{dest_app}:{src_field}:{dest_field}"])




def get_cmdline_parser():
    parser = argparse.ArgumentParser(description='Sage3 Python Proxy Server')
    parser.add_argument('-c', '--config_file', type=str, required=True, help="Configuration file path")
    parser.add_argument('-r', '--room_id', type=str, required=False, help="Room id")
    return parser


# For development purposes only.
token = conf['token']
room_id = requests.get('http://localhost:3333/api/rooms', headers = {'Authorization':'Bearer ' + token}).json()['data'][0]['_id']
sage_proxy = SAGEProxy(room_id, conf, prod_type)

# sage_proxy = SAGEProxy("config/funcx.json", "c9699852-c872-4c1d-a11e-ec4eaf108533")
# b34cf54e-2f9e-4b9a-a458-27f4b6c658a7

listening_process = threading.Thread(target=asyncio.run, args=(sage_proxy.receive_messages(),))
listening_process.start()
worker_process = threading.Thread(target=sage_proxy.process_messages)
worker_process.start()


# asyncio.gather(sage_proxy.produce(), sage_proxy.consume())
# TODO start threads cleanly in a way that can be easily stopped.
# if __name__ == "__main__":
#     # The below is needed in running in iPython -- need to dig into this more
#     # multiprocessing.set_start_method("fork")
#     # parser = get_cmdline_parser()
#     # args = parser.parse_args()
#     sage_proxy = SAGEProxy("funcx.json", "05828804-d87f-4498-857e-02f288effd3d")
#
#     # room = Room("08d37fb0-b0a7-475e-a007-6d9dd35538ad")
#     # sage_proxy = SAGEProxy(args.config_file, args.room_id)
#     # listening_process = multiprocessing.Process(target=sage_proxy.receive_messages)
#     # worker_process = multiprocessing.Process(target=sage_proxy.process_messages)
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
#         sage_proxy.clean_up()
#         listening_process.st
#         # worker_process.join()
#         print("I am here")
