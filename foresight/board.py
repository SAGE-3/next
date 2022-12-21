#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbitcollection import SmartBitsCollection
from utils.generic_utils import import_cls
from utils.wall_utils import Sage3Communication


class Board():
    # cls_root = "smartbits"

    def __init__(self, doc):
        # TODO: since this happens first and it's a a singleon, should we move it to proxy?
        # self.communication = Sage3Communication.instance(config)
        # TODO call this board_id
        self.id = doc["_id"]
        self.name = doc["data"]["name"]
        self.description = doc["data"]["description"]
        self.color = doc["data"]["color"]
        self.ownerId = doc["data"]["ownerId"]

        self.smartbits = SmartBitsCollection()


        # if data:
        #     for app_uuid, app_data in data["state"]["apps"].items():
        #         self.create_smartbit(app_uuid, app_data)


    # def __get_launch_payload(self, smartbit_cls_name, x, y, width=100, height=100, optional_data={}):
    #     # intentionally not providing a default to x and y. Easy to get lazy with things that overlap
    #     # TODO: create a function that provides a convenient (or radom for now) x and y positions
    #     # Launch payload for stickies is: {'stickiesState': {'text': text, 'color': '#ffff97'}}
    #     payload = {
    #         'type': 'create',
    #         'appName': smartbit_cls_name,
    #         'id': '',
    #         'position': {'x': x, 'y': y},
    #         'optionalData': optional_data,
    #     }
    #     print(f"PAYLOAD IS\n\n {payload}")
    #
    #     return payload
    #
    # def launch_app(self, smartbit_cls_name, x, y, width=100, height=100, optional_data={}):
    #     # this launches an application on the wall
    #     # The smartbit data structure gets created when message from wall is received
    #     payload = self.__get_launch_payload(
    #         smartbit_cls_name,  x, y, width, height, optional_data)
    #     self.communication.send_payload(payload)
    #
    # def close_app(self, app_uuid):
    #     payload = {'id': app_uuid, 'type': 'close'}
    #     self.communication.send_payload(payload)
    #
    # def create_smartbit(self, app_uuid, app_data):
    #     smartbit = self.smartbit_factory.create_smartbit(app_data)
    #     self.smartbits[app_uuid] = smartbit
    #
    # def remove_smartbit(self, smartbit_id):
    #     try:
    #         del self.smartbits[smartbit_id]
    #     except Exception as e:
    #         raise Exception(
    #             f"{e}\nIn wall: Trying to remove a smartbit {smartbit_id} that does not exist ")

    # @_action(enqueue=False)
    # def create_new_smartbit(self, smartbit_type, smartbit_params, requires_redis=False):
    #     """
    #        Creates a smartbit using the SmartbitFactory and adds it ot the
    #        smartbits diction of the current wall.
    #
    #        :param smartbit_type: the class name of the smartbit to create
    #        :param params: the dictionary of the params that need to be created.
    #        :return: the id  of the newly added smartbit. Ids start at 1.
    #        """
    #     smartbit = SmartBitFactory.create_smartbit(smartbit_type, smartbit_params, requires_redis)
    #
    #
    #     self.smartbits[smartbit.smartbit_id] = smartbit
    #     available_attributes = smartbit.get_attributes()
    #     available_actions = smartbit.get_actions()
    #     available_attributes["available_actions"] = available_actions
    #
    #     protocol_msg = {
    #         "channel": "execute:down",
    #         "action": "create",
    #         "action_results": available_attributes
    #     }
    #     return protocol_msg
    #
    #
    # #@l.log(log_tag="return_smartbit", log_level="info")
    # def return_smartbit(self, smartbit_id):
    #     """
    #     Describe
    #     :param smartbit_id:
    #     :return: smartbit with id `smartbit_id` or None if the id is not in the list
    #     """
    #     try:
    #         return self.smartbits.get_smartbit(smartbit_id)
    #     except:
    #         raise Exception(f"{smartbit_id} could not be deleted from wall")
    #
    # # @l.log(log_tag="remove_smartbit", log_level="info")
    # @_action(enqueue=False)
    # def remove_smartbit(self, smartbit_id):
    #     """
    #     Remove smartbit from the wall
    #     :param smartbit_id: the id of the smart bit to remove
    #     :return: the smartbit that was removed or None otherwise
    #     """
    #     try:
    #         del self.smartbits[smartbit_id]
    #     except:
    #         raise Exception("the smartbit_id {} does not exisit".format(smartbit_id))
    #     return {"channel": "execute:down", "action": "delete", "action_results": {"smartbit_id": smartbit_id}}
    #
    # #@l.log(log_tag="get_wall_state", log_level="info")
    # @_action(enqueue=False)
    # def get_wall_state(self):
    #     """"
    #     Returns the state of a wall. this is limited to all the smartbits currently on the wall.
    #     """
    #     wall_state = {"smartbits": []}
    #     for sb_key, sb in list(self.smartbits)[1:]:
    #         wall_state["smartbits"].append(sb.jsonify())
    #     return {"channel": "execute:down", "action": "info", "action_results": wall_state}
    #
    # def handle_futures(self):
    #     pass

    # def jsonify(self):
    #     return self.jsonify()
