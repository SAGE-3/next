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


import signal
import sys
import os
from typing import Callable
from pydantic import BaseModel
import json
import threading
import uuid
from multiprocessing import Queue
import requests
import httpx
from websocketroomlistener import WebsocketRoomListener
from utils.sage_communication import SageCommunication
from config import config as conf, prod_type
from smartbits.genericsmartbit import GenericSmartBit


class Room:
    def __init__(self, room):
        self.doc = room

class SAGERoomProxy:
    def __init__(self, conf, prod_type):
        self.rooms = {}
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
        self.received_msg_log = {}
        self.listening_process = WebsocketRoomListener(self.__message_queue)
        self.worker_process = threading.Thread(target=self.process_messages)
        self.stop_worker = False

        # Grab and load info already on the board
        self.populate_existing()

    def start_threads(self):
        self.listening_process.run()
        self.worker_process.start()

    def populate_existing(self):
        rooms_info = self.s3_comm.get_rooms()
        for doc in rooms_info:
            self.__handle_create(doc)


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

            print(msg)
            doc = msg['event']['doc']
            msg_type = msg["event"]["type"]

            if msg_type == "CREATE":
              self.__handle_create(doc)
            if msg_type == "UPDATE":
              self.__handle_update(doc)
            if msg_type == "DELETE":
              self.__handle_delete(doc)


    def __handle_create(self, doc):
        # we need state to be at the same level as data
        print("New room created")
        new_Room = Room(doc)
        doc_id = doc["_id"]
        self.rooms[doc_id] = new_Room
        print("//TODO Create new foresight docker conatiner.", doc_id)
  
    def __handle_update(self, doc):
      print("Room updated")
      doc_id = doc["_id"]
      if doc_id in self.rooms:
        self.rooms[doc_id] = doc
      else:
          print('Room does not exist in the python room proxy')

    def __handle_delete(self, doc):
        print("Room deleted")
        doc_id = doc["_id"]
        print('Shut down foresight docker container.', doc_id)
        if doc_id in self.rooms:
          del self.rooms[doc_id]
        else:
          print('Room does not exist in the python room proxy')

    def clean_up(self):
        self.listening_process.clean_up()

        if not self.__message_queue.empty():
            print("Messages queue was not empty while starting to clean proxy")
        self.__message_queue.close()

        self.stop_worker = True
        self.worker_process.join()


def clean_up_terminate(signum, frame):
    print("Cleaning up before terminating")
    sage_proxy.clean_up()



if __name__ == "__main__":
    signal.signal(signal.SIGINT, clean_up_terminate)
    signal.signal(signal.SIGTERM, clean_up_terminate)
    signal.signal(signal.SIGHUP, clean_up_terminate)

    # For development purposes only.
    token = os.getenv("TOKEN")

    print(f"Starting proxy")
    sage_proxy = SAGERoomProxy(conf, prod_type)
    sage_proxy.start_threads()
