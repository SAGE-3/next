#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# TODO: checking messages that are created at the same time and only executing the first
#  one keeping info in received_msg_log for now. These seems to be related to raised=True


# TODO: CRITICAL, I am a proxy -- ignore my own messages.

# TODO: add a new validator function that takes a message received on a
#  channel and makes sure it's structurally valid, i.e., has all the required fields
#  and no unknown fields


# TODO prevent apps updates on fields that were touched?
import signal
import sys
import os
from typing import Callable
from pydantic import BaseModel
import json
import threading
# import argparse
from board import Board
import uuid
from multiprocessing import Queue
import requests
from smartbitfactory import SmartBitFactory
import httpx
from websocketlistener import WebSocketListener
from utils.sage_communication import SageCommunication
from config import config as conf, prod_type

# from utils import logging_config
# logger = logging_config.get_console_logger()


class Room:
    def __init__(self, room_id):
        self.room_id = room_id
        self.boards = {}


async def subscribe(sock, room_id):
    subscription_id = str(uuid.uuid4())
    # message_id = str(uuid.uuid4())
    print(f"Subscribing to room: {room_id} with subscriptionId: {subscription_id}")
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


class SAGEProxy:
    def __init__(self, room_id, conf, prod_type):
        self.room = Room(room_id)
        self.conf = conf
        self.prod_type = prod_type
        self.__headers = {'Authorization': f"Bearer {os.getenv('TOKEN')}"}
        self.__message_queue = Queue()
        self.__MSG_METHODS = {
            "CREATE": self.__handle_create,
            "UPDATE": self.__handle_update,
            "DELETE": self.__handle_delete,
        }
        self.httpx_client = httpx.Client(timeout=None)
        self.s3_comm = SageCommunication(self.conf, self.prod_type)
        self.callbacks = {}  # for linked apps
        self.received_msg_log = {}
        self.listening_process = WebSocketListener(self.__message_queue, room_id)
        self.worker_process = threading.Thread(target=self.process_messages)
        self.stop_worker = False

        # Grab and load info already on the board
        self.populate_existing()

    def start_threads(self):
        self.listening_process.run()
        self.worker_process.start()

    def populate_existing(self):
        boards_info = self.s3_comm.get_boards(self.room.room_id)
        for board_info in boards_info:
            self.__handle_create("BOARDS", board_info)

        apps_info = self.s3_comm.get_apps(self.room.room_id)
        for app_info in apps_info:
            print(f"Creating {app_info['data']['state']}")
            self.__handle_create("APPS", app_info)

    def handle_linked_app(self, app_id, msg):
        if app_id in self.callbacks:
            # handle callback
            # print("this app is being tracked for updates")
            # print(f"tracked field is {self.callbacks[app_id].src_field}")
            for linked_info in self.callbacks[app_id].values():
                print(f"Linked Info {linked_info}")
                if f"state.{linked_info.src_field}" in msg['event']['updates']:
                    # print("Yes, the tracked fields was updated")
                    # TODO 4: make callback function optional. In which case, jsut update dest with src
                    # TODO 1. We need to dispatch the function on a different thread, not run it
                    #  on the same thread as proxy
                    # TODO 2. Catch to avoid errors here so the thread does not crash
                    try:
                        board_id = linked_info.board_id
                        src_val = msg['event']['updates'][f"state.{linked_info.src_field}"]
                        dest_field = linked_info.dest_field
                        dest_id = linked_info.dest_app
                        dest_app = self.room.boards[board_id].smartbits[dest_id]
                        linked_info.callback(src_val, dest_app, dest_field)
                    except Exception as e:
                        print(f"Error happened during callback for linked app {e}")
                        print(f"app_id: {app_id}")

    def process_messages(self):
        """
        Running this in the main thread to not deal with sharing variables right now.
        potentially work on a multiprocessing version where threads are processed separately
        Messages needs to be numbered to avoid received out of sequences messages.
        """

        while not self.stop_worker:
            try:
                msg = self.__message_queue.get()
            except EOFError as e:
                print(f"Message queue was closed")
                return

            if "updates" in msg['event']:
                if 'raised' in msg['event']['updates'] and msg['event']['updates']["raised"]:
                    pass
                # if 'state.online' in msg['event']['updates'] and msg['event']['updates']['state.online']:
                #     pass
                # if 'state.lastHeartbeat' in msg['event']['updates'] and msg['event']['updates']['state.lastHeartbeat'] != 0:
                #     pass

            # logger.debug(f"Getting ready to process: {msg}")


            collection = msg["event"]['col']
            doc = msg['event']['doc']

            msg_type = msg["event"]["type"]
            if msg_type == "UPDATE":
                app_id = msg["event"]["doc"]["_id"]
                if app_id in self.callbacks:
                    self.handle_linked_app(app_id, msg)

                updates = msg['event']['updates']
                self.__MSG_METHODS[msg_type](collection, doc, updates)
            else:
                self.__MSG_METHODS[msg_type](collection, doc)


    def __handle_create(self, collection, doc):
        # we need state to be at the same level as data

        if collection == "BOARDS":
            print("New board created")
            new_board = Board(doc)
            self.room.boards[new_board.id] = new_board
        elif collection == "APPS":
            print("New app created")
            doc["state"] = doc["data"]["state"]
            del (doc["data"]["state"])
            smartbit = SmartBitFactory.create_smartbit(doc)
            self.room.boards[doc["data"]["boardId"]].smartbits[smartbit.app_id] = smartbit

    def handle_exec_function(self):
        pass

    def __handle_update(self, collection, doc, updates):
        # TODO: prevent updates to fields that were touched
        # TODO: this in a smarter way. For now, just overwrite the complete object

        if collection == "BOARDS":
            print("BOARD UPDATED: UNHANDLED")
            print(f"\t\t updates is {updates}\n")
            board_id = doc["_id"]
            # TODO: proceed to BOARD update with the updates field passed as param
            if "executeInfo" in updates and updates["executeInfo"]["executeFunc"]:
                func_name = updates["executeInfo"]["executeFunc"]
                print(f"executing function {func_name}")
                try:
                    board = self.room.boards[board_id]
                    _func = getattr(board, func_name)
                    _params = updates["executeInfo"]["params"]

                    print(f"About to execute board function --{func_name}-- with params --{_params}--")
                    _func(**_params)
                except Exception as e:
                    print(f"Exception trying to execute board function {func_name}. \n\t{e}")



        elif collection == "APPS":
            # print(f"updating app {}")
            app_id = doc["_id"]
            board_id = doc['data']["boardId"]

            sb = self.room.boards[board_id].smartbits[app_id]

            # Note that set_data_form_update clear touched field
            sb.refresh_data_form_update(doc, updates)

            exec_info = getattr(sb.state, "executeInfo", None)
            if exec_info is not None:
                func_name = getattr(exec_info, "executeFunc")
                if func_name != '':
                    try:
                        _func = getattr(sb, func_name)
                        _params = getattr(exec_info, "params")
                        # TODO: validate the params are valid
                        # print(f"About to execute function --{func_name}-- with params --{_params}--")
                        print(f"About to execute function --{func_name}-- with params --{_params}--")

                        _func(**_params)
                    except Exception as e:
                        print(f"Exception trying to execute sb function {func_name}. \n\t{e}")

    def __handle_delete(self, collection, doc):

        print("deleting app")
        if collection == "APPS":
            try:
                del self.room.boards[doc["data"]["boardId"]].smartbits[doc["_id"]]
                print(f"Successfully deleted app_id {doc['_id']}")
            except:
                print(f"Couldn't delete app_id, value is not valid app_id {doc['_id']}")
        if collection == "BOARDS":
            try:
                del self.room.boards[doc["_id"]]
            except:
                print(f"Couldn't delete app_id, value is not valid app_id {doc['_id']}")

    def clean_up(self):
        self.listening_process.clean_up()

        if not self.__message_queue.empty():
            print("Messages queue was not empty while starting to clean proxy")
        self.__message_queue.close()

        self.stop_worker = True
        self.worker_process.join()

        for board_id in sage_proxy.room.boards.keys():
            for app_info in sage_proxy.room.boards[board_id].smartbits:
                app_info[1].clean_up()

    def register_linked_app(self, board_id, src_app, dest_app, src_field, dest_field, callback):
        if src_app not in self.callbacks:
            self.callbacks[src_app] = {}
        self.callbacks[src_app] = {f"{src_app}:{dest_app}:{src_field}:{dest_field}":
                                       LinkedInfo(board_id=board_id,
                                                  src_app=src_app,
                                                  dest_app=dest_app,
                                                  src_field=src_field,
                                                  dest_field=dest_field,
                                                  callback=callback)}


    def deregister_linked_app(self, board_id, src_app, dest_app, src_field, dest_field):
        del (self.callbacks[src_app][f"{src_app}:{dest_app}:{src_field}:{dest_field}"])


# def get_cmdline_parser():
#     parser = argparse.ArgumentParser(description='Sage3 Python Proxy Server')
#     parser.add_argument('-c', '--config_file', type=str, required=True, help="Configuration file path")
#     parser.add_argument('-r', '--room_id', type=str, required=False, help="Room id")
#     return parser


def clean_up_terminate(signum, frame):
    print("Cleaning up before terminating")
    sage_proxy.clean_up()



if __name__ == "__main__":
    signal.signal(signal.SIGINT, clean_up_terminate)
    signal.signal(signal.SIGTERM, clean_up_terminate)
    signal.signal(signal.SIGHUP, clean_up_terminate)

    # For development purposes only.
    token = os.getenv("TOKEN")
    if prod_type == "production" or prod_type == "backend":
        room_name = os.environ.get("ROOM_NAME")
        room_id = os.environ.get("ROOM_ID")
        # if name specified, try to find room or create it
        if room_name:
            jsondata = requests.get(conf[prod_type]['web_server'] + '/api/rooms',
                                    headers={'Authorization': 'Bearer ' + token}).json()
            rooms = jsondata['data']
            for r in rooms:
                room = r['data']
                if room['name'] == room_name:
                    room_id = r['_id']
                    break
            if not room_id:
                payload = {
                    'name': room_name,
                    'description': 'Room for ' + room_name,
                    'color': 'red', 'ownerId': '-', 'isPrivate': False, 'privatePin': '', 'isListed': True,
                }
                req = requests.post(conf[prod_type]['web_server'] + '/api/rooms',
                                    headers={'Authorization': 'Bearer ' + token}, json=payload)
                res = req.json()
                if res['success']:
                    room_id = res['data'][0]['_id']
                else:
                    print("ROOM_NAME option, failed to create room")
                    sys.exit(1)
        elif not room_id:
            print("ROOM_ID not defined")
            sys.exit(1)
    else:
        room_id = \
            requests.get('http://localhost:3333/api/rooms', headers={'Authorization': 'Bearer ' + token}).json()[
                'data'][0][
                '_id']
        if not os.getenv("DROPBOX_TOKEN"):
            print("Dropbox upload token not defined, AI won't be supported in development mode")

    print(f"Starting proxy with room {room_id}:")
    sage_proxy = SAGEProxy(room_id, conf, prod_type)
    sage_proxy.start_threads()
