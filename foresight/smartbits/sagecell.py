# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
import json
import websocket
import threading
from pydantic import PrivateAttr
import time
from config import config as conf, prod_type
import requests
import redis

class SageCellState(TrackedBaseModel):
    code: str
    output: str
    kernel: str
    kernels: list
    availableKernels: list
    executeInfo: ExecuteInfo

class SageCell(SmartBit):
    # the key that is assigned to this in state is
    state: SageCellState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(SageCell, self).__init__(**kwargs)

    def handle_exec_result(self, msg):
        self.state.output = json.dumps(msg)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_public_kernels(self):
        """
        This function will get the kernels from the redis server
        if the kernel is public, or if the user is the owner of the kernel
        it will be added to the list of available kernels
        :param user_uuid:
        :return: list of kernels in the form of kernal_alias:kernel_id
        {
            '746dcafb-f578-4e1c-b515-8a7a185f26c0': {
                'kernel_alias': 'test1',
                'kernel_name': 'python3',
                'room': '570bd4af-db4d-4ed3-919d-ec53832a3259',
                'board': '6c68f094-4dc6-40a2-af8a-3f96612d2031',
                'owner_uuid': '9b93ab8b-20b2-4016-9bfb-ca8b76acc160',
                'is_private': False,
                'auth_users': []
            }
        }
        """
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._jupyter_client.redis_server.json()
        kernels = r_json.get(jupyter_kernels)
        available_kernels = []
        print('i am here 3')
        for kernel in kernels:
            if not kernels[kernel]["is_private"]:
            # make a list of key value pairs of kernel_alias:kernel_id
                available_kernels.append(f"{kernels[kernel]['kernel_alias']}:{kernel}")

                # available_kernels.append([kernels[kernel]['kernel_alias'], kernel])

                # available_kernels.append((kernels[kernel]['kernel_alias'], kernel))
        if len(available_kernels) > 0:
        #     # make a list of key value pairs to append to the state
            self.state.availableKernels = available_kernels

            # self.state.availableKernels = available_kernels
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_available_kernels(self, owner_uuid):
        """
        This function will get the kernels from the redis server
        if the kernel is public, or if the user is the owner of the kernel
        it will be added to the list of available kernels
        :param user_uuid:
        :return: list of kernels in the form of kernal_alias:kernel_id
        {
            '746dcafb-f578-4e1c-b515-8a7a185f26c0': {
                'kernel_alias': 'test1',
                'kernel_name': 'python3',
                'room': '570bd4af-db4d-4ed3-919d-ec53832a3259',
                'board': '6c68f094-4dc6-40a2-af8a-3f96612d2031',
                'owner_uuid': '9b93ab8b-20b2-4016-9bfb-ca8b76acc160',
                'is_private': False,
                'auth_users': []
            }
        }
        """
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._jupyter_client.redis_server.json()
        kernels = r_json.get(jupyter_kernels)
        available_kernels = []
        print('i am here 3')
        for kernel in kernels:
            if not kernels[kernel]["is_private"] or kernels[kernel]["owner_uuid"] == owner_uuid:
                available_kernels.append([kernels[kernel]['kernel_alias'], kernel])
        if len(available_kernels) > 0:
            self.state.availableKernels = available_kernels
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def execute(self, uuid):
        """
        Non blocking function to execute code. The proxy has the responsibility to execute the code
        and to call a call_back function which know how to handle the results message
        :param uuid:
        :param code:
        :return:
        """
        command_info = {
            "uuid": uuid,
            "call_fn": self.handle_exec_result,
            "code": self.state.code,
            "kernel": self.state.kernel,
            "token": ""
        }

        # print(f"Command info is {command_info}")
        # print(f"My proxy is: {self._jupyter_proxy}")
        self._jupyter_client.execute(command_info)
