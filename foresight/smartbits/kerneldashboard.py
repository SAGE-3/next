# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
import json
# import websocket
# import threading
from pydantic import PrivateAttr
# import time
from config import config as conf, prod_type
import requests
# import redis


class KernelDashboardState(TrackedBaseModel):
    """
    This class represents the state of the kernel dashboard
    """
    kernels: list = []
    defaultKernel: str = ""
    kernelSpecs: list = []
    availableKernels: list = []
    executeInfo: ExecuteInfo


class KernelDashboard(SmartBit):
    state: KernelDashboardState
    _redis_space: str = PrivateAttr(default="JUPYTER:KERNELS")
    _base_url: str = PrivateAttr(default=f"{conf[prod_type]['jupyter_server']}/api")
    _headers: dict = PrivateAttr(default=dict(SmartBit._jupyter_client.headers))

    def __init__(self, **kwargs):
        # print("I am here 1")
        super(KernelDashboard, self).__init__(**kwargs)
        # print("I am here 2")
        r_json = self._jupyter_client.redis_server.json()
        if r_json.get(self._redis_space) is None:
            r_json.set(self._redis_space, '.', {})
        self.get_kernel_specs()

    def get_kernel_specs(self):
        response = requests.get(f"{self._base_url}/kernelspecs", headers=self._headers)
        kernel_specs = response.json()
        self.state.defaultKernel = kernel_specs['default']
        self.state.kernelSpecs = [kernel_specs]
        self.state.kernels = self._jupyter_client.get_kernels()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def add_kernel(self, room_uuid, board_uuid, owner_uuid, is_private=False,
                   kernel_name="python3", auth_users=(), kernel_alias="YO"):
        body = {"name": kernel_name}
        j_url = f'{self._base_url}/kernels'
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
                "auth_users": auth_users
            }
            r_json = self._jupyter_client.redis_server.json()
            r_json.set(self._redis_space, response_data['id'], kernel_info)
            self.get_available_kernels(user_uuid=owner_uuid)

    def delete_kernel(self, kernel_id, user_uuid):
        j_url = f'{self._base_url}/kernels/{kernel_id}'
        response = requests.delete(j_url, headers=self._headers)
        r_json = self._jupyter_client.redis_server.json()
        if response.status_code == 204:
            r_json.delete(self._redis_space, kernel_id)
            self.get_available_kernels(user_uuid=user_uuid)

    def restart_kernel(self, kernel_id, user_uuid):
        j_url = f'{self._base_url}/kernels/{kernel_id}/restart'
        response = requests.post(j_url, headers=self._headers)
        if response.status_code == 200:
            self.get_available_kernels(user_uuid=user_uuid)
        # self.refresh_list()

    # def refresh_list(self):
    #     self.state.kernels = self._jupyter_client.get_kernels()
    #     self.state.executeInfo.executeFunc = ""
    #     self.state.executeInfo.params = {}
    #     self.send_updates()

    def get_available_kernels(self, user_uuid):
        """
        This function will get the kernels from the redis server
        """
        # get kernels from server
        r_json = self._jupyter_client.redis_server.json()
        kernels = r_json.get(self._redis_space, '.')
        available_kernels = []
        # for kernel_id, kernel_info in kernels.items():
        #     if kernel_info['is_private']:
        #         if user_uuid in kernel_info['']

        for kernel in kernels.keys():
            # if kernels[kernel]["is_private"] and kernels[kernel]["owner_uuid"] != user_uuid:
            #     continue
            if not kernels[kernel]['kernel_alias'] or kernels[kernel]['kernel_alias'] == kernels[kernel]['kernel_name']:
                kernels[kernel]['kernel_alias'] = kernel[:8]
            available_kernels.append({"key": kernel, "value": kernels[kernel]})
        if len(available_kernels) > 0:
            self.state.availableKernels = available_kernels
        # self.state.kernels = self._jupyter_client.get_kernels()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        # This is a BROADCAST channel not a private channel to send messages to individual users
        # We would need to design and new feature for private messaging
        self.send_updates()
