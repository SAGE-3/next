# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbitcollection import SmartBitsCollection
from smartbits.smartbit import ExecuteInfo
from utils.layout import Layout
from utils.sage_communication import SageCommunication

# from utils.wall_utils import Sage3Communication

import requests
from config import config as conf, prod_type
from jupyterkernelproxy import JupyterKernelProxy
from task_scheduler import TaskScheduler
from typing import ClassVar


class BoardState:
    """
    This class represents the state of a board
    """

    kernelSpecs: list = []
    availableKernels: list = []
    lastHeartBeat: int
    online: bool
    executeInfo: ExecuteInfo


class Board:
    _redis_space: str = "JUPYTER:KERNELS"
    _base_url: str = f"{conf[prod_type]['jupyter_server']}/api"
    _jupyter_client = None
    _r_json = None
    _headers: dict = None
    _task_scheduler = None
    _s3_comm: ClassVar = SageCommunication(conf, prod_type)

    def __init__(self, doc):
        # TODO: since this happens first and it's a a singleon, should we move it to proxy?
        # self.communication = Sage3Communication.instance(config)
        # TODO call this board_id
        self.id = doc["_id"]
        self.name = doc["data"]["name"]
        self.description = doc["data"]["description"]
        self.color = doc["data"]["color"]
        self.ownerId = doc["data"]["ownerId"]
        self.roomId = doc["data"]["roomId"]
        self.layout = None
        self.whiteboard_lines = None
        self.smartbits = SmartBitsCollection()

        self.state = BoardState()

        if "executeInfo" in doc["data"]:
            self.state.executeInfo = doc["data"]["executeInfo"]
        else:
            self.state.executeInfo = {"executeFunc": "", "params": {}}

        self._task_scheduler = TaskScheduler()
        self._jupyter_client = JupyterKernelProxy()
        self._headers = dict(self._jupyter_client.headers)
        self._r_json = self._jupyter_client.redis_server.json()
        if self._r_json.get(self._redis_space) is None:
            self._r_json.set(self._redis_space, ".", {})
        self.set_online()
        self.get_kernel_specs()
        self._task_scheduler.schedule_task(self.set_online, nb_secs=15)

    def get_kernel_specs(self):
        print("getting kernel specs", self._base_url, self._headers)
        response = requests.get(self._base_url + "/kernelspecs", headers=self._headers)
        kernel_specs = response.json()["kernelspecs"]
        self.state.kernelSpecs = list(kernel_specs.keys())
        print("kernel specs are ", self.state.kernelSpecs)
        self.get_available_kernels()

    def get_available_kernels(self, user_uuid=None):
        """
        This function will get the kernels from the redis server
        """
        # get all valid kernel ids from jupyter server
        valid_kernel_list = [k["id"] for k in self._jupyter_client.get_kernels()]
        # get all kernels from redis server
        kernels = self._jupyter_client.redis_server.json().get(self._redis_space)
        # remove kernels the list of available kernels that are not in jupyter server
        [kernels.pop(k) for k in kernels if k not in valid_kernel_list]
        available_kernels = []
        for kernel in kernels.keys():
            if (
                user_uuid
                and kernels[kernel]["is_private"]
                and kernels[kernel]["owner_uuid"] != user_uuid
            ):
                continue
            if (
                not kernels[kernel]["kernel_alias"]
                or kernels[kernel]["kernel_alias"] == kernels[kernel]["kernel_name"]
            ):
                kernels[kernel]["kernel_alias"] = kernel[:8]
            available_kernels.append({"key": kernel, "value": kernels[kernel]})
        self.state.availableKernels = available_kernels
        self.state.executeInfo["executeFunc"] = ""
        self.state.executeInfo["params"] = {}
        self.send_updates()

    def add_kernel(
        self,
        room_uuid,
        board_uuid,
        owner_uuid,
        is_private=False,
        kernel_name="python3",
        auth_users=(),
        kernel_alias="my_kernel",
    ):
        body = {"name": kernel_name}
        j_url = f"{self._base_url}/kernels"
        response = requests.post(j_url, headers=self._headers, json=body)
        if response.status_code == 201:
            response_data = response.json()
            kernel_info = {
                "kernel_alias": kernel_alias,
                "kernel_name": kernel_name,
                "room": room_uuid,
                "board": board_uuid,
                "owner_uuid": owner_uuid,
                "is_private": is_private,
                "auth_users": auth_users,
            }
            self._r_json.set(self._redis_space, response_data["id"], kernel_info)
            self.get_available_kernels(user_uuid=owner_uuid)

    def delete_kernel(self, kernel_id, user_uuid):
        """Shutdown a kernel"""
        # get all valid kernel ids from jupyter server
        kernel_list = [k["id"] for k in self._jupyter_client.get_kernels()]
        if kernel_id in kernel_list:
            # shutdown kernel from jupyter server and remove from redis server
            j_url = f"{self._base_url}/kernels/{kernel_id}"
            response = requests.delete(j_url, headers=self._headers)
            if response.status_code == 204:
                self.get_available_kernels(user_uuid=user_uuid)
            self._r_json.delete(self._redis_space, kernel_id)
            self.get_available_kernels(user_uuid=user_uuid)
        else:
            # cleanup the kernel from redis server if it is not in jupyter server
            self.get_available_kernels(user_uuid=user_uuid)
            self._r_json.delete(self._redis_space, kernel_id)
            self.get_available_kernels(user_uuid=user_uuid)

    def shudown_all_kernels(self):
        kernel_list = [k["id"] for k in self._jupyter_client.get_kernels()]
        for kernel_id in kernel_list:
            j_url = f"{self._base_url}/kernels/{kernel_id}"
            response = requests.delete(j_url, headers=self._headers)
            if response.status_code == 204:
                print(f"Kernel {kernel_id} shutdown successfully")
                self._r_json.delete(self._redis_space, kernel_id)
                self.get_available_kernels()

    def restart_kernel(self, kernel_id, user_uuid):
        j_url = f"{self._base_url}/kernels/{kernel_id}/restart"
        response = requests.post(j_url, headers=self._headers)
        if response.status_code == 200:
            self.get_available_kernels(user_uuid=user_uuid)

    def send_updates(self):
        """
        This function will send updates to the board
        """
        data = {
            "kernelSpecs": self.state.kernelSpecs,
            "availableKernels": self.state.availableKernels,
            "lastHeartBeat": self.state.lastHeartBeat,
            "online": self.state.online,
            "executeInfo": self.state.executeInfo,
        }
        print("Sending board update", self.id, data)
        self._s3_comm.send_board_update(self.id, data)

    def clean_up(self):
        self.state.lastHeartBeat = 0
        self.state.online = False
        self._jupyter_client.clean_up()
        self._task_scheduler.clean_up()

    def set_online(self):
        self.state.lastHeartBeat = self._s3_comm.get_time()["epoch"]
        self.state.online = True
        self.send_updates()

    def reorganize_layout(
        self,
        viewport_position,
        viewport_size,
        buffer_size=100,
        by="combined",
        mode="graphviz",
    ):
        if by not in ["app_type", "semantic"]:
            print(f"{by} not a valid by option to organize layout. Not executing")
            return
        if mode not in ["tiles", "stacks"]:
            print(f"{mode} not a valid mode to organize layout. Not executing")
            return
        viewport_position = (
            float(viewport_position["x"]),
            float(viewport_position["y"]),
        )
        viewport_size = (float(viewport_size["width"]), float(viewport_size["height"]))

        print("Started executing organize_layout on the baord")
        print(f"viewport position is {viewport_position}")
        print(f"viewport size  is {viewport_size}")

        app_dims = {
            x.app_id: (
                x.data.size.width + buffer_size,
                x.data.size.height + buffer_size,
            )
            for x in self.smartbits.smartbits_collection.values()
        }
        app_to_type = {x: type(self.smartbits[x]).__name__ for x in app_dims.keys()}

        self.layout = Layout(app_dims, viewport_position, viewport_size)
        # self.layout = Layout(app_dims, viewport_position, viewport_size)
        # self.layout.graphviz_layout()
        self.layout.fdp_graphviz_layout(app_to_type)

        updates = []
        # Highjack quick test
        sb_leech = None

        for app_id, coords in self.layout._layout_dict.items():
            sb = self.smartbits[app_id]
            sb.data.position.x = coords[0]
            sb.data.position.y = coords[1]
            sb_leech = sb
            u = sb.get_updates_for_batch()
            updates.append(u)

        # Using the highjack, but board should have its own commmuncation object
        sb_leech._s3_comm.send_app_batch_update({"batch": updates})
        print("Done executing organize_layout on the baord")

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
