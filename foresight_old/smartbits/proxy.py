#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# TODO: add a new validator function that takes a messager received on a
#  channel and makes sure it's structurally valid, i.e., has the right required fields
#  and no unknwon fields

# TODO: call this Class something else?


import datetime
import namesgenerator
import os
import json
from message_broker.redis_client import RedisThreadedClient
from smartbits.wall import Wall
import time
from rejson import Client, Path
import uuid


class Proxy:
    """
    Proxy is a singleton that handles the interaction between the backend (UI) and the frontend (UI)
    """

    __instance = None
    __wall_name = None
    __wall_info = None
    wall_instance = None

    @staticmethod
    def get_instance():
        """ Static access method. """
        if Proxy.__instance is None:
            Proxy()
        return Proxy.__instance

    def __init__(cls):
        try:
            config = json.load(open('config.json', 'r'))
        except:
            raise Exception("Cannot load config.json file")

        if Proxy.__instance is not None:
            raise Exception("This class is a singleton and instance already exists!")
        else:

            Proxy.__instance = cls
            Proxy.redis_client = RedisThreadedClient()

            # TODO: Change to read these para from configuration file
            Proxy.rejson_client = Client(host=config['redis-server'], port=6379, decode_responses=True)

            # TODO: We need to properly unsubscribe at cleanup
            # Proxy.redis_client.subscribe("update:up", cls.run_update_up)
            # Proxy.redis_client.subscribe("update:up", cls.run_update_up)
            # Proxy.redis_client.subscribe("create:up", cls.run_create_up)
            Proxy.redis_client.subscribe("execute:up", cls.execute)
            # Proxy.redis_client.subscribe("execute:up", cls.run_enqueued_execute_down)

            # self.redis_client.subscribe("create:down", self.update_state)
            # self.redis_client.subscribe("update:down", self.update_state)

    @classmethod
    def unsubscribe(cls):
        Proxy.redis_client.unsubscribe()

    @classmethod
    def instantiate_new_wall(cls):
        # instantiate Proxy() in case none exists
        if Proxy.__wall_name is not None:
            raise Exception("This class is a singleton and an instance of it already exists!")

        # TODO: make sure the wall_name generated below is unique
        # cls.__wall_name = namesgenerator.get_random_name()
        cls.__wall_name = "festive_torvalds"

        cls.wall_instance = Wall(cls.__wall_name, RedisThreadedClient())
        # we also keep a copy of the wall as the first element in the
        # list of smartbit (wall is a smartbit). This also facilitates
        # a bunch of stuff, like executing functions on the wall
        # the same way we execute functions on any other smartbit
        cls.wall_instance.smartbits[cls.wall_instance.smartbit_id] = cls.wall_instance
        data = {'wall_date_time': datetime.datetime.now(),
                "wall_instance": cls.wall_instance}
        cls.__wall_info = data

        Proxy.redis_client.set("wall_name", cls.__wall_name)

        return cls.__wall_name

    @classmethod
    def get_wall_info(cls):
        try:
            return cls.__wall_info
        except:
            raise Exception("Wall does not exist")

    @classmethod
    def save_msg_to_rejson(cls, channel, _uuid, msg):
        now = time.time()
        # # save the time the UUID was received in an update:up
        cls.rejson_client.jsonset(f"msg:{_uuid}",
                                  Path.rootPath(),
                                  {"timestamp": now, "channel": channel})
        # save UUID and the protocol msg
        # TODO: remove the UUId from the json_command_info since we have it as a key
        # del (json_command_info["uuid"])
        # print(f"msg is {msg}")
        cls.rejson_client.jsonset(f"msg_details:{_uuid}", Path.rootPath(), msg)

    @classmethod
    def format_execute_up(cls, _uuid, client_id, smartbit_id, action, action_params):
        protocol = json.load(open("message_broker/protocols/execute_up.json"))
        msg_data = {
            "uuid": _uuid,
            "client_id": client_id,
            "smartbit_id": smartbit_id,
            "action": action,
            "action_params": action_params
        }
        protocol.update(msg_data)
        return protocol

    @classmethod
    def format_execute_down(cls, _uuid, client_id, smartbit_id, action, action_resutls):
        protocol = json.load(open("message_broker/protocols/execute_down.json"))
        msg_data = {
            "uuid": _uuid,
            "smartbit_id": smartbit_id,
            "client_id": client_id,
            "action": action,
            "action_results": action_resutls
        }
        protocol.update(msg_data)
        return protocol


    @classmethod
    def execute(cls, json_command_info):

        print("---> I am in execute up")

        # needed to parse out the unecessary fields added by Redis
        if "data" in json_command_info:
            json_command_info = eval(json_command_info["data"])

        # The new uuid will be stored as generated from the old uuid
        # in Redis, we will have:
        # key:generated_by:new_uuid val:_uuid
        _uuid = json_command_info["uuid"]
        #channel = json_command_info["channel"]
        cls.save_msg_to_rejson("execute:up", _uuid, json_command_info)
        client_id = json_command_info["client_id"]
        smartbit_id = json_command_info["smartbit_id"]
        action = json_command_info["action"]
        wi = cls.wall_instance
        sb = wi.smartbits[smartbit_id]
        __func = getattr(sb, action)

        if __func is None:
            raise Exception(f"unknown function {action} on smartbit_id {smartbit_id}")

        # if the function can be executed immediately, instead of enqueued
        if __func.enqueue == False:
            try:
                    exec_data = __func(**json_command_info["action_params"])
            except:
                raise Exception(f"Error running action {action} on smartbit_id {smartbit_id}")
            # if the execute:up operation generate a new smartbit
            uuid_response = str(uuid.uuid4())
            # the response we received requires re-running execute:up.
            # ex. to create a new smartbit as a result of the execution
            if exec_data["channel"] == "execute:up":
                print("    ---> generated an execute up")

                # we need the returned object to contain exec_data["smartbit_id"] so that we know
                # who to call exec_data["action"] on
                msg = cls.format_execute_up(uuid_response,
                                           client_id,
                                           exec_data["smartbit_id"],
                                           exec_data["action"],
                                           exec_data["action_params"])
                cls.save_msg_to_rejson(exec_data["channel"], uuid_response, msg)
                cls.rejson_client.jsonset(f"execute:up:{_uuid}", Path.rootPath(), uuid_response)
                cls.rejson_client.jsonset(f"execute:up:{uuid_response}", Path.rootPath(), _uuid)
                cls.redis_client.publish(exec_data["channel"], json.dumps(msg))
            elif exec_data["channel"] == "execute:down":
                print("    ---> generated an execute down")
                msg = cls.format_execute_down(uuid_response,
                                             client_id,
                                             smartbit_id,
                                             exec_data["action"],
                                             exec_data["action_results"])
                cls.save_msg_to_rejson(exec_data["channel"], uuid_response, msg)
                cls.rejson_client.jsonset(f"execute:up:{_uuid}", Path.rootPath(), uuid_response)
                cls.rejson_client.jsonset(f"execute:down:{uuid_response}", Path.rootPath(), _uuid)
                cls.redis_client.publish(exec_data["channel"], json.dumps(msg))
            else:
                chan = exec_data["channel"]
                raise Exception(f"Does not recognize channel name: {chan}")
        else:  # function is enqueued
            Proxy.wall_instance.task_scheduler.enqueue(__func,
                                                       json_command_info["action_params"],
                                                       json_command_info["uuid"])

    # @classmethod
    # def run_enqueued_execute_down(cls, json_command_info):
    #     if "data" in json_command_info:
    #         json_command_info = eval(json_command_info["data"])
    #
    #
    #     _uuid = json_command_info["uuid"]
    #     original_uuid = json_command_info["original_uuid"]
    #     client_id =  cls.rejson_client.jsonget(f"msg_details:{original_uuid}", Path('.client_id'))
    #     json_command_info['client_id'] = json_command_info
    #     cls.save_msg_to_rejson("execute:down", uuid, json_command_info)
    #     cls.rejson_client.jsonset(f"execute:up:{original_uuid}", Path.rootPath(), _uuid)
    #     cls.rejson_client.jsonset(f"execute:down:{_uuid}", Path.rootPath(), original_uuid)
    #     cls.redis_client.publish("execute:down", json.dumps(json_command_info))

    @classmethod
    def delete_wall(cls):
        if cls.__wall_name is None or cls.__wall_info is None:
            raise Exception("Failed to delete wall. No wall exists.")

        else:
            cls.__wall_name = None
            cls.__wall_info = None

    @classmethod
    def get_state(cls, client_id):
        wall_instance = cls.get_wall_info()["wall_instance"]
        return wall_instance.get_wall_state(client_id)
