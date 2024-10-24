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

import time
import os
from typing import Callable
from pydantic import BaseModel
import json
import logging
from foresight.board import Board
from foresight.room import Room
from foresight.smartbitfactory import SmartBitFactory
from foresight.utils.sage_communication import SageCommunication
from foresight.smartbits.genericsmartbit import GenericSmartBit
from foresight.utils.sage_websocket import SageWebsocket

from foresight.config import config as conf, prod_type


def setup_logger():
    debug_fmt = "%(asctime)s  | %(levelname)s | %(module)s | %(filename)s | %(message)s"
    devel_fmt = "%(asctime)s  | %(levelname)s | %(module)s | %(message)s"
    logging.basicConfig(filename="proxy.log")
    logging.basicConfig()

    formatter = None
    logger = logging.getLogger(__name__)
    if os.getenv("LOG_LEVEL") is not None and os.getenv("LOG_LEVEL") == "debug":
        formatter = logging.Formatter(debug_fmt)
        logger.root.setLevel(logging.DEBUG)
    else:
        formatter = logging.Formatter(devel_fmt)
        logger.root.setLevel(logging.INFO)
    logger.root.handlers[0].setFormatter(formatter)
    return logger


logger = setup_logger()

# TODO: Find another spot for this.


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

    def __init__(self, conf, prod_type):
        self.done_init = False
        self.conf = conf
        self.prod_type = prod_type
        self.__headers = {"Authorization": f"Bearer {os.getenv('TOKEN')}"}
        self.__MSG_METHODS = {
            "CREATE": self.__handle_create,
            "UPDATE": self.__handle_update,
            "DELETE": self.__handle_delete,
        }
        # self.httpx_client = httpx.Client(timeout=None)
        self.callbacks = {}  # for linked apps
        self.received_msg_log = {}

        self.rooms = {}
        self.s3_comm = SageCommunication(self.conf, self.prod_type)
        self.socket = SageWebsocket(on_message_fn=self.process_messages)
        self.socket.subscribe(["/api/apps", "/api/rooms", "/api/boards"])

        # Grab and load info already on the board

        self.populate_existing()
        self.done_init = True

    def populate_existing(self):
        # Populate existing rooms
        rooms_info = self.s3_comm.get_rooms()
        # print(rooms_info)
        for room_info in rooms_info:
            self.__handle_create("ROOMS", room_info)

        # Populate existing boards
        boards_info = self.s3_comm.get_boards()
        # print(boards_info)
        for board_info in boards_info:
            self.__handle_create("BOARDS", board_info)
        # Populate existing apps
        apps_info = self.s3_comm.get_apps()
        # print(apps_info)
        for app_info in apps_info:
            self.__handle_create("APPS", app_info)

    def process_messages(self, ws, msg):
        logger.debug("received and processing a new message")
        message = json.loads(msg)
        # Duplicate messages for the time being to allow python to work
        # event.doc is now an array of docs
        for doc in message["event"]["doc"]:
            msg = message.copy()
            msg["event"]["doc"] = doc
            logger.debug(msg)
            # End of duplicating messages so old code can work
            collection = msg["event"]["col"]
            doc = msg["event"]["doc"]
            msg_type = msg["event"]["type"]
            app_id = doc["_id"]

            # Its a create message
            if msg_type == "CREATE":
                self.__MSG_METHODS[msg_type](collection, doc)
            # Its a delete message
            elif msg_type == "DELETE":
                self.__MSG_METHODS[msg_type](collection, doc)
            # Its an update message
            elif msg_type == "UPDATE":
                # all updates for this message [{id: string, updates: {}}, {id:string, updates: {}}...]
                all_updates = msg["event"]["updates"]
                msg_updates = {}
                # find the updates for this specific app
                for u in all_updates:
                    if u["id"] == app_id:
                        msg_updates = u["updates"]
                        break
                msg["event"]["updates"] = msg_updates

                if (
                    "updates" in msg["event"]
                    and "raised" in msg["event"]["updates"]
                    and msg["event"]["updates"]["raised"]
                ):
                    pass

                if app_id in self.callbacks:
                    self.handle_linked_app(app_id, msg)
                self.__MSG_METHODS[msg_type](collection, doc, msg_updates)

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
            del doc["data"]["state"]
            smartbit = SmartBitFactory.create_smartbit(doc)
            room_id = doc["data"]["roomId"]
            board_id = doc["data"]["boardId"]
            if room_id in self.rooms:
                if board_id in self.rooms[room_id].boards:
                    self.rooms[room_id].boards[board_id].smartbits[
                        smartbit.app_id
                    ] = smartbit

    # Handle Update Messages
    def __handle_update(self, collection, doc, updates):
        # TODO: prevent updates to fields that were touched
        # TODO: this in a smarter way. For now, just overwrite the complete object

        id = doc["_id"]
        if collection == "ROOMS":
            self.rooms[id].handleUpdate(doc)
        elif collection == "BOARDS":
            room_id = doc["data"]["roomId"]
            # TODO: proceed to BOARD update with the updates field passed as param
            # if "executeInfo" in updates and updates["executeInfo"]["executeFunc"]:
            #     func_name = updates["executeInfo"]["executeFunc"]
            #     logger.debug(f"executing function {func_name}")
            #     try:
            #         board = self.rooms[room_id].boards[id]
            #         _func = getattr(board, func_name)
            #         _params = updates["executeInfo"]["params"]

            #         logger.debug(
            #             f"About to execute board function --{func_name}-- with params --{_params}--")
            #         _func(**_params)
            #     except Exception as e:
            #         logger.error(
            #             f"Exception trying to execute board function {func_name}. \n\t{e}")

        elif collection == "APPS":
            board_id = doc["data"]["boardId"]
            room_id = doc["data"]["roomId"]
            sb = self.rooms[room_id].boards[board_id].smartbits[id]
            if type(sb) is GenericSmartBit:

                logger.debug("not handling generic smartbit update")
                logger.debug(f"\t\tmessage was {doc}")
                return
            if sb is not None:
                # Note that set_data_form_update clear touched field
                sb.refresh_data_form_update(doc, updates)

                exec_info = getattr(sb.state, "executeInfo", None)

                if exec_info is not None:
                    func_name = getattr(exec_info, "executeFunc")
                    if func_name != "":
                        try:
                            _func = getattr(sb, func_name)
                            _params = getattr(exec_info, "params")
                            # TODO: validate the params are valid
                            _func(**_params)
                        except Exception as e:
                            logger.error(
                                f"Exception trying to execute function `{func_name}` on sb `{sb}`. \n{e}"
                            )
                else:
                    logger.error("\n\n\nTried to update non existent smartbit\n\n\n")

    # Handle Delete Messages
    def __handle_delete(self, collection, doc):
        _id = doc["_id"]
        logger.debug(f"Delete Event {collection} {_id}")
        if collection == "ROOMS":
            try:
                del self.rooms[_id]
            except:
                logger.debug(f"Couldn't delete room_id: {_id}")
        elif collection == "BOARDS":
            room_id = doc["data"]["roomId"]
            try:
                del self.rooms[room_id].boards[_id]
            except:
                logger.debug(f"Couldn't delete board_id: {id}")
        elif collection == "APPS":
            board_id = doc["data"]["boardId"]
            room_id = doc["data"]["roomId"]
            try:
                # get the smartbit and clean up after itself before deleting

                sb = self.rooms[room_id].boards[board_id].smartbits[_id]
                sb.clean_up()
                del self.rooms[room_id].boards[board_id].smartbits[_id]
            except:
                logger.error(f"Couldn't delete app_id: {_id}")

    def handle_linked_app(self, app_id, msg):
        if app_id in self.callbacks:
            # handle callback

            for linked_info in self.callbacks[app_id].values():
                if f"state.{linked_info.src_field}" in msg["event"]["updates"]:
                    # print("Yes, the tracked fields was updated")
                    # TODO 4: make callback function optional. In which case, jsut update dest with src
                    # TODO 1. We need to dispatch the function on a different thread, not run it
                    #  on the same thread as proxy
                    # TODO 2. Catch to avoid errors here so the thread does not crash
                    try:
                        board_id = linked_info.board_id
                        src_val = msg["event"]["updates"][
                            f"state.{linked_info.src_field}"
                        ]
                        dest_field = linked_info.dest_field
                        dest_id = linked_info.dest_app
                        dest_app = self.room.boards[board_id].smartbits[dest_id]
                        linked_info.callback(src_val, dest_app, dest_field)
                    except Exception as e:
                        logger.error(
                            f"Error happened during callback for linked app {app_id}.\n {e}"
                        )

    def handle_exec_function(self):
        pass

    def clean_up(self):
        # self.listening_process.clean_up()

        # if not self.__message_queue.empty():
        #     logger.warn("Messages queue was not empty while starting to clean proxy")
        # self.__message_queue.close()

        for room_id in sage_proxy.rooms.keys():
            for board_id in sage_proxy.rooms[room_id].boards.keys():
                for app_info in sage_proxy.rooms[room_id].boards[board_id].smartbits:
                    app_info[1].clean_up()

    def register_linked_app(
        self, board_id, src_app, dest_app, src_field, dest_field, callback
    ):
        if src_app not in self.callbacks:
            self.callbacks[src_app] = {}
        self.callbacks[src_app] = {
            f"{src_app}:{dest_app}:{src_field}:{dest_field}": LinkedInfo(
                board_id=board_id,
                src_app=src_app,
                dest_app=dest_app,
                src_field=src_field,
                dest_field=dest_field,
                callback=callback,
            )
        }

    def deregister_linked_app(self, board_id, src_app, dest_app, src_field, dest_field):
        del self.callbacks[src_app][f"{src_app}:{dest_app}:{src_field}:{dest_field}"]


# def get_cmdline_parser():
#     parser = argparse.ArgumentParser(description='Sage3 Python Proxy Server')
#     parser.add_argument('-c', '--config_file', type=str, required=True, help="Configuration file path")
#     parser.add_argument('-r', '--room_id', type=str, required=False, help="Room id")
#     return parser


# def clean_up_terminate(signum, frame):
#     logger.debug("Cleaning up before terminating")
#     sage_proxy.clean_up()


if __name__ == "__main__":

    logger.info(f"Starting proxy")
    # signal.signal(signal.SIGINT, clean_up_terminate)
    # signal.signal(signal.SIGTERM, clean_up_terminate)
    # signal.signal(signal.SIGHUP, clean_up_terminate)
    sage_proxy = SAGEProxy(conf, prod_type)

    while True:
        try:
            time.sleep(10)
        except KeyboardInterrupt:
            sage_proxy.clean_up()
            break
    logger.info("Terminating SageProxy")
