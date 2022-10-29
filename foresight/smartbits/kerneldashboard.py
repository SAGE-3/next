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


class KernelDashboardState(TrackedBaseModel):
    """
    This class represents the state of the kernel dashboard
    """
    kernels: list = []
    # sessions: list = []
    defaultKernel: str = ""
    kernelSpecs: list = []
    availableKernels: list = []
    executeInfo: ExecuteInfo


class KernelDashboard(SmartBit):
    state: KernelDashboardState
    _redis_server = PrivateAttr()
    _headers = PrivateAttr()
    _base_url = PrivateAttr()
    _redis_store = PrivateAttr()

    def __init__(self, **kwargs):
        print("I am here 1")
        super(KernelDashboard, self).__init__(**kwargs)
        print("I am here 2")
        self._redis_server = self._jupyter_client.redis_server
        jupyter_token = self._redis_server.get("config:jupyter:token").decode()
        self._headers = {'Authorization': f"Token  {jupyter_token}"}
        self._base_url = f"{conf[prod_type]['jupyter_server']}/api"
        r_json = self._redis_server.json()
        self._redis_store = "JUPYTER:KERNELS"
        if r_json.get(self._redis_store) is None:
            r_json.set(self._redis_store, '.', {})
        self.get_kernel_specs()

    def get_kernel_specs(self):
        j_url = f"{self._base_url}/kernelspecs"
        response = requests.get(j_url, headers=self._headers)
        kernel_specs = response.json()

        self.state.defaultKernel = kernel_specs['default']
        self.state.kernelSpecs = [kernel_specs]
        self.refresh_list()



    def add_kernel(self, room_uuid, board_uuid, owner_uuid, is_private=False,
                   kernel_name="python3", auth_users=(), kernel_alias="YO"):
        j_url = f'{self._base_url}/kernels'
        body = {"name": kernel_name}
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
            # jupyter_kernels = "JUPYTER:KERNELS"
            r_json = self._redis_server.json()
            r_json.set(self._redis_store, response_data['id'], kernel_info)
        self.refresh_list()

    def delete_kernel(self, kernel_id):
        j_url = f'{self._base_url}/kernels/{kernel_id}'
        response = requests.delete(j_url, headers=self._headers)
        r_json = self._redis_server.json()
        if response.status_code == 204:
            r_json.delete(self._redis_store, kernel_id)
            self.refresh_list()

    def restart_kernel(self, kernel_id):
        j_url = f'{self._base_url}/kernels/{kernel_id}/restart'
        response = requests.post(j_url, headers=self._headers)
        json.loads(response.text)
        self.refresh_list()

    def refresh_list(self):
        self.state.kernels = self.get_available_kernels()
        # self.state.sessions = self.get_sessions()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_available_kernels(self, user_uuid=None):
        """
        This function will get the kernels from the redis server
        """

        # get kernels from server

        r_json = self._redis_server.json()
        kernels = r_json.get(self._redis_store)
        available_kernels = []

        for kernel in kernels.keys():
            if user_uuid and kernels[kernel]["is_private"] and kernels[kernel]["owner_uuid"] != user_uuid:
                continue
            if not kernels[kernel]['kernel_alias'] or kernels[kernel]['kernel_alias'] == kernels[kernel]['kernel_name']:
                kernels[kernel]['kernel_alias'] = kernel[:8]
            available_kernels.append({"label": kernels[kernel]['kernel_alias'], "value": kernel})
        if len(available_kernels) > 0:
            self.state.availableKernels = available_kernels
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()
