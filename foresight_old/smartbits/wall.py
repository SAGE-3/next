#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbitfactory import SmartBitFactory
from smartbits.smartbitcollection import SmartBitsCollection
from task_queue.taskscheduler import TaskScheduler
from smartbits.smartbit import SmartBit

from smartbits.utils.smartbits_utils import _action


import json




class Wall(SmartBit):
    # l = Logger.get_instance(system="sage3.smartbits", host="localhost", port=24224)

    def __init__(self, wall_name, redis_client=None):
        super().__init__(wall_coordinates=None, redis_client=redis_client)

        self.smartbit_id = wall_name
        self.smartbits = SmartBitsCollection()
        self.task_scheduler = TaskScheduler()
        # TODO: implement z-order
        self.smartbits_z_order = []
        # self.smartbits.subscribe(lambda x: print(f"received an event on my collection of SmartBits {x}"))
        # self.redis_client = RedisThreadedClient()


    @_action(enqueue=False)
    def create_new_smartbit(self, smartbit_type, smartbit_params, requires_redis=False):
        """
           Creates a smartbit using the SmartbitFactory and adds it ot the
           smartbits diction of the current wall.

           :param smartbit_type: the class name of the smartbit to create
           :param params: the dictionary of the params that need to be created.
           :return: the id  of the newly added smartbit. Ids start at 1.
           """
        smartbit = SmartBitFactory.create_smartbit(smartbit_type, smartbit_params, requires_redis)


        self.smartbits[smartbit.smartbit_id] = smartbit
        available_attributes = smartbit.get_attributes()
        available_actions = smartbit.get_actions()
        available_attributes["available_actions"] = available_actions

        protocol_msg = {
            "channel": "execute:down",
            "action": "create",
            "action_results": available_attributes
        }
        return protocol_msg


    #@l.log(log_tag="return_smartbit", log_level="info")
    def return_smartbit(self, smartbit_id):
        """
        Describe
        :param smartbit_id:
        :return: smartbit with id `smartbit_id` or None if the id is not in the list
        """
        try:
            return self.smartbits.get_smartbit(smartbit_id)
        except:
            raise Exception(f"{smartbit_id} could not be deleted from wall")

    # @l.log(log_tag="remove_smartbit", log_level="info")
    @_action(enqueue=False)
    def remove_smartbit(self, smartbit_id):
        """
        Remove smartbit from the wall
        :param smartbit_id: the id of the smart bit to remove
        :return: the smartbit that was removed or None otherwise
        """
        try:
            del self.smartbits[smartbit_id]
        except:
            raise Exception("the smartbit_id {} does not exisit".format(smartbit_id))
        return {"channel": "execute:down", "action": "delete", "action_results": {"smartbit_id": smartbit_id}}

    #@l.log(log_tag="get_wall_state", log_level="info")
    @_action(enqueue=False)
    def get_wall_state(self):
        """"
        Returns the state of a wall. this is limited to all the smartbits currently on the wall.
        """
        wall_state = {"smartbits": []}
        for sb_key, sb in list(self.smartbits)[1:]:
            wall_state["smartbits"].append(sb.jsonify())
        return {"channel": "execute:down", "action": "info", "action_results": wall_state}

    def handle_futures(self):
        pass

    # def jsonify(self):
    #     return self.jsonify()
