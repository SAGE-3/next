# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# TODO: checking messages that are created at the same time and only executing the first
#  one keeping info in received_msg_log for now. These seems to be related to raised=True

# TODO: add a new validator function that takes a message received on a
#  channel and makes sure it's structurally valid, i.e., has all the required fields
#  and no unknown fields

# TODO prevent apps updates on fields that were touched?
import os
# import signal
import uuid
import json
from board import Board
from room import Room
from smartbitfactory import SmartBitFactory
from utils.sage_communication import SageCommunication
from smartbits.genericsmartbit import GenericSmartBit
from utils.sage_websocket import SageWebsocket
from json_templates.templates import create_app_template

# signal.signal(signal.SIGINT, lambda x: print("interrupting"))
# signal.signal(signal.SIGTERM, lambda x: print("interrupting"))
# signal.signal(signal.SIGHUP, lambda x: print("interrupting"))
#

class PySage3:

    def __init__(self, conf, prod_type):
        print("Configuring ps3 client ... ")

        self.done_init = False
        self.conf = conf
        self.prod_type = prod_type
        self.__headers = {'Authorization': f"Bearer {os.getenv('TOKEN')}"}
        self.__MSG_METHODS = {
            "CREATE": self.__handle_create,
            "UPDATE": self.__handle_update,
            "DELETE": self.__handle_delete,
        }

        self.rooms = {}
        self.s3_comm = SageCommunication(self.conf, self.prod_type)
        self.socket = SageWebsocket(on_message_fn=self.process_messages)
        self.socket.subscribe(['/api/apps', '/api/rooms', '/api/boards'])

        # Grab and load info already on the board

        self.populate_existing()
        self.done_init = True
        print("Completed configuring Sage3 Client")


    def create_app(self, room_id, baord_id, app_type, state):
        try:
            create_app_template["state"].update(state)
            create_app_template["type"] = app_type

            create_app_template["roomId"] = room_id
            create_app_template["boardId"] = baord_id
            if app_type not in SmartBitFactory.class_names:
                raise Exception("Smartbit not supported in interactive mode")

            # just try to create to see if it's going to raise an error
            _ = SmartBitFactory.create_smartbit({
                "_id":str(uuid.uuid4()),
                "data": create_app_template,
                "state": create_app_template["state"]
            })

            self.s3_comm.create_app(create_app_template)
        except Exception as e:
            print(f"Err or during creation of app {e}")


    def populate_existing(self):
        rooms_info = self.s3_comm.get_rooms()
        for room_info in rooms_info:
            self.__handle_create("ROOMS", room_info)
        # Populate existing boards
        boards_info = self.s3_comm.get_boards()
        for board_info in boards_info:
            self.__handle_create("BOARDS", board_info)
        # Populate existing apps
        apps_info = self.s3_comm.get_apps()
        for app_info in apps_info:
            self.__handle_create("APPS", app_info)

    def process_messages(self, ws, msg):
        msg = json.loads(msg)
        if "updates" in msg['event'] and 'raised' in msg['event']['updates'] and msg['event']['updates']["raised"]:
            pass

        collection = msg["event"]['col']
        doc = msg['event']['doc']

        msg_type = msg["event"]["type"]
        if msg_type == "UPDATE":
            app_id = msg["event"]["doc"]["_id"]

            updates = msg['event']['updates']
            self.__MSG_METHODS[msg_type](collection, doc, updates)
        else:
            self.__MSG_METHODS[msg_type](collection, doc)

    # Handle Create Messages
    def __handle_create(self, collection, doc):
        # we need state to be at the same level as data
        if collection == "ROOMS":
            new_room = Room(doc)
            self.rooms[new_room.id] = new_room
        elif collection == "BOARDS":
            new_board = Board(doc)
            if new_board.roomId in self.rooms:
                self.rooms[new_board.roomId].boards[new_board.id] = new_board
        elif collection == "APPS":
            doc["state"] = doc["data"]["state"]
            del (doc["data"]["state"])
            smartbit = SmartBitFactory.create_smartbit(doc)
            room_id = doc["data"]["roomId"]
            board_id = doc["data"]["boardId"]
            if room_id in self.rooms:
                if board_id in self.rooms[room_id].boards:
                    self.rooms[room_id].boards[board_id].smartbits[smartbit.app_id] = smartbit

    # Handle Update Messages
    def __handle_update(self, collection, doc, updates):
        # TODO: prevent updates to fields that were touched
        # TODO: this in a smarter way. For now, just overwrite the complete object


        id = doc["_id"]
        if collection == "ROOMS":
            self.rooms[id].handleUpdate(doc)
        elif collection == "BOARDS":
            room_id = doc['data']['roomId']
            # TODO: proceed to BOARD update with the updates field passed as param
        elif collection == "APPS":
            board_id = doc['data']["boardId"]
            room_id = doc['data']['roomId']
            sb = self.rooms[room_id].boards[board_id].smartbits[id]

            if sb is not None and type(sb) is not GenericSmartBit:
                # Note that set_data_form_update clear touched field
                sb.refresh_data_form_update(doc, updates)


    # Handle Delete Messages
    def __handle_delete(self, collection, doc):
        print("Delete not yet  supported through API")

    def apps(self, room_id=None, board_id=None, type=None):

        if room_id is None or  board_id is None:
            print("listing apps requires  room and board ids")
            return
        if type is not None:
            return {x[0]: x[1] for x in self.rooms[room_id].boards[board_id].smartbits if x[1].data.type == type}
        else:
            return {x[0]: x[1] for x in self.rooms[room_id].boards[board_id].smartbits}

    def clean_up(self):

        print("cleaning up client resources")
        for room_id in self.rooms.keys():
            for board_id in self.rooms[room_id].boards.keys():
                for app_info in self.rooms[room_id].boards[board_id].smartbits:
                    app_info[1].clean_up()


