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
    _headers = PrivateAttr()
    _base_url = PrivateAttr()
    _redis_server = PrivateAttr()
    _redis_store = 'JUPYTER:KERNELS'

    def __init__(self, **kwargs):
        print("I am here 1")
        super(KernelDashboard, self).__init__(**kwargs)
        print("I am here 2")
        self._redis_server = self._jupyter_client.redis_server
        jupyter_token = self._redis_server.get("config:jupyter:token").decode()
        self._headers = {'Authorization': f"Token  {jupyter_token}"}
        self._base_url = f"{conf[prod_type]['jupyter_server']}/api"
        r_json = self._redis_server.json()
        if r_json.get(self._redis_store) is None:
            r_json.set(self._redis_store, '.', {})
        self.get_kernel_specs()

    def get_kernel_specs(self):
        j_url = f"{self._base_url}/kernelspecs"
        response = requests.get(j_url, headers=self._headers)
        kernel_specs = json.loads(response.text)
        self.state.defaultKernel = kernel_specs['default']
        self.state.kernelSpecs = [kernel_specs]
        self.refresh_list()


    def get_kernels(self):
        j_url = f"{self._base_url}/kernels"
        response = requests.get(j_url, headers=self._headers)
        kernels = json.loads(response.text)
        return kernels


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
        jupyter_kernels = "JUPYTER:KERNELS"
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
        self.state.kernels = self.get_kernels()
        # self.state.sessions = self.get_sessions()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_available_kernels(self, user_uuid):
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
        # print('i am here 3')
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._redis_server.json()
        kernels = r_json.get(jupyter_kernels)
        available_kernels = []

        for kernel in kernels.keys():
            if kernels[kernel]["is_private"] and kernels[kernel]["owner_uuid"] != user_uuid:
                continue
            if not kernels[kernel]['kernel_alias'] or kernels[kernel]['kernel_alias'] == kernels[kernel]['kernel_name']:
                kernels[kernel]['kernel_alias'] = kernel[:8]
            available_kernels.append({"label": kernels[kernel]['kernel_alias'], "value": kernel})
        if len(available_kernels) > 0:
            self.state.availableKernels = available_kernels
            print(f"I am sending back available Kernels {available_kernels}")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    # def process_every(self, seconds=10):
    #     # TODO: check if kernels changed and only refresh if they did
    #     while True:
    #         if self.state.kernels != self.get_kernels():
    #             self.refresh_list()
    #         time.sleep(seconds)