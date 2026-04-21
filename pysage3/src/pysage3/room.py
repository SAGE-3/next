# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# from smartbitcollection import SmartBitsCollection
# from utils.layout import Layout


class Room():

    def __init__(self, doc):
        # TODO: since this happens first and it's a a singleon, should we move it to proxy?
        # self.communication = Sage3Communication.instance(config)
        # TODO call this board_id
        self.id = doc["_id"]
        data = doc["data"]
        self.name = data["name"]
        self.description = data["description"]
        self.color = data["color"]
        self.ownerId = data["ownerId"]
        self.isPrivate = data["isPrivate"]
        self.isListed = data["isListed"]
        self.boards = {}

    def handleUpdate(self, doc):
        # Todo: why not just (test)
        #  self.__dict__.update(doc["data"])

        data = doc["data"]
        self.name = data["name"]
        self.description = data["description"]
        self.color = data["color"]
        self.ownerId = data["ownerId"]
        self.isPrivate = data["isPrivate"]
        self.isListed = data["isListed"]
