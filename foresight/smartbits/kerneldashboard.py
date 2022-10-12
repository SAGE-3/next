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
    executeInfo: ExecuteInfo

class KernelDashboard(SmartBit):
    state: KernelDashboardState
    _headers = PrivateAttr()
    _base_url = PrivateAttr()
    # _msg_checker = PrivateAttr()
    # _jupyter_token = PrivateAttr()
    # _msg_checker = threading.Thread(target=self.process_every)

    def __init__(self, **kwargs):
        print("I am here 1")
        super(KernelDashboard, self).__init__(**kwargs)
        print("I am here 2")

        redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        jupyter_token = redis_server.get("config:jupyter:token").decode()
        self._headers = {'Authorization': f"Token  {jupyter_token}"}
        self._base_url = f"{conf[prod_type]['jupyter_server']}/api"
        # self._msg_checker = threading.Thread(target=self.process_every)
        # self._msg_checker.start()

    def get_headers(self):
        return self._headers

    def get_base_url(self):
        return self._base_url

    def get_kernel_specs(self):
        j_url = f"{self.get_base_url()}/kernelspecs"
        response = requests.get(j_url, headers=self.get_headers())
        kernel_specs = json.loads(response.text)
        self.state.defaultKernel = kernel_specs['default']
        self.state.kernelSpecs = [kernel_specs]
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_kernels(self):
        j_url = f"{self.get_base_url()}/kernels"
        response = requests.get(j_url, headers=self.get_headers())
        kernels = json.loads(response.text)
        return kernels

    # def get_available_kernels(self, user_uuid):
    #     """
    #     This function will get the kernels from the redis server
    #     if the kernel is public, or if the user is the owner of the kernel
    #     it will be added to the list of available kernels
    #     :param user_uuid:
    #     :return: list of kernels in the form of kernal_alias:kernel_id
    #     {
    #         '746dcafb-f578-4e1c-b515-8a7a185f26c0': {
    #             'kernel_alias': 'test1',
    #             'kernel_name': 'python3',
    #             'room': '570bd4af-db4d-4ed3-919d-ec53832a3259',
    #             'board': '6c68f094-4dc6-40a2-af8a-3f96612d2031',
    #             'owner_uuid': '9b93ab8b-20b2-4016-9bfb-ca8b76acc160',
    #             'is_private': False,
    #             'auth_users': []
    #         }
    #     }
    #     """
    #     jupyter_kernels = "JUPYTER:KERNELS"
    #     r_json = self._jupyter_client.redis_server.json()
    #     kernels = r_json.get(jupyter_kernels)
    #     available_kernels = []
    #     for kernel in kernels:
    #         if not kernels[kernel]["is_private"] or kernels[kernel]["owner_uuid"] == user_uuid:
    #             available_kernels.append((kernels[kernel]['kernel_alias'], kernel))
    #     if len(available_kernels) > 0:
    #         self.state.kernels = available_kernels
    #     self.state.executeInfo.executeFunc = ""
    #     self.state.executeInfo.params = {}
    #     self.send_updates()

    # def get_sessions(self):
    #     j_url = self.get_base_url() + '/sessions'
    #     response = requests.get(j_url, headers=self.get_headers())
    #     sessions = json.loads(response.text)
    #     return sessions

    def add_kernel(self, room_uuid, board_uuid, owner_uuid, is_private=False,
                   kernel_name="python3", auth_users=(), kernel_alias="YO"):
        j_url = self.get_base_url() + '/kernels'
        body = {"name": kernel_name}
        response = requests.post(j_url, headers=self.get_headers(), json=body)
        if response.status_code == 201:
            response_data = response.json()
            kernel_info = {
                "kernel_alias": kernel_alias,
                "kernel_name": kernel_name,
                #"kernel_id": response_data['id'],
                "room": room_uuid,
                "board": board_uuid,
                "owner_uuid": owner_uuid,
                "is_private": is_private,
                "auth_users": auth_users
            }
            jupyter_kernels = "JUPYTER:KERNELS"
            r_json = self._jupyter_client.redis_server.json()
            if r_json.get(jupyter_kernels) is None:
                r_json.set(jupyter_kernels, '.', {})
            r_json.set(jupyter_kernels, response_data['id'], kernel_info)
        self.refresh_list()

    def delete_kernel(self, kernel_id):
        j_url = f'{self.get_base_url()}/kernels/{kernel_id}'
        response = requests.delete(j_url, headers=self.get_headers())
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._jupyter_client.redis_server.json()
        if response.status_code == 204:
            r_json.delete(jupyter_kernels, kernel_id)
            self.refresh_list()

    def restart_kernel(self, kernel_id):
        j_url = f'{self.get_base_url()}/kernels/{kernel_id}/restart'
        response = requests.post(j_url, headers=self.get_headers())
        json.loads(response.text)
        self.refresh_list()

    def refresh_list(self):
        self.state.kernels = self.get_kernels()
        # self.state.sessions = self.get_sessions()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    # def process_every(self, seconds=10):
    #     # TODO: check if kernels changed and only refresh if they did
    #     while True:
    #         if self.state.kernels != self.get_kernels():
    #             self.refresh_list()
    #         time.sleep(seconds)