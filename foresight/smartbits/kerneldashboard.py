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
    sessions: list = []
    availableKernels: list = []
    kernelSpecs: list = []
    executeInfo: ExecuteInfo

class KernelDashboard(SmartBit):
    state: KernelDashboardState
    _headers = PrivateAttr()
    _base_url = PrivateAttr()
    # _redis_server = PrivateAttr()
    _msg_checker = PrivateAttr()

    def __init__(self, **kwargs) -> None:
        # print("I am here 1")
        super(KernelDashboard, self).__init__(**kwargs)
        # print("I am here 2")
        # self._redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        jupyter_token = self._jupyter_client.redis_server.get("config:jupyter:token").decode()
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._jupyter_client.redis_server.json()
        if r_json.get(jupyter_kernels) is None:
            r_json.set(jupyter_kernels, '.', {})
        self._headers = {'Authorization': f"Token  {jupyter_token}"}
        self._base_url = f"{conf[prod_type]['jupyter_server']}/api"
        self.state.kernelSpecs = self.get_kernel_specs()
        self.state.kernels = self.get_kernels()
        self.state.sessions = self.get_sessions()
        self.send_updates()
        # self._msg_checker = threading.Thread(target=self.process_every)
        # self._msg_checker.start()

    def start(self: "KernelDashboard", room_uuid: str, board_uuid: str, user_uuid: str) -> None:
        """Start the kernel dashboard"""
        # self.state.kernelSpecs = self.get_kernel_specs()
        # self.state.kernels = self.get_kernels()
        # self.state.sessions = self.get_sessions()
        self.state.availableKernels = self.get_available_kernels(room_uuid, board_uuid, user_uuid)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_kernel_specs(self: "KernelDashboard") -> list:
        """Get all kernel specs"""
        try:
            j_url = f'{self._base_url}/kernelspecs'
            response = requests.get(j_url, headers=self._headers)
            return [json.loads(response.text)]
        except Exception as e:
            print(e)
            return []

    def get_kernels(self: "KernelDashboard") -> list:
        """Get all kernels

        Returns:
            list: list of kernels
        """
        try: 
            j_url = f'{self._base_url}/kernels'
            response = requests.get(j_url, headers=self._headers)
            return json.loads(response.text)
        except Exception as e:
            print(e)
            return []

    def get_sessions(self: "KernelDashboard") -> list:
        """Get all sessions

        Returns:
            list: list of sessions
        """
        try: 
            j_url = f'{self._base_url}/sessions'
            response = requests.get(j_url, headers=self._headers)
            return json.loads(response.text)
        except Exception as e:
            print(e)
            return []

    def get_available_kernels(self: "KernelDashboard", room_uuid: str, board_uuid: str, user_uuid: str) -> list:
        """
        Get the available kernels for a given room, board and user
        """
        # print('i am here 3')
        jupyter_kernels = "JUPYTER:KERNELS"
        try: 
            r_json = self._jupyter_client.redis_server.json()
            kernels = r_json.get(jupyter_kernels)
            if kernels is None:
                return []
            available_kernels = []
            for kernel in kernels.keys():
                # Only add the kernel if it is public or if the user is the owner
                if kernels[kernel]["is_private"] and kernels[kernel]["owner_uuid"] != user_uuid:
                    continue
                # Only add the kernel if it is in the same room and board
                if kernels[kernel]["room"] != room_uuid or kernels[kernel]["board"] != board_uuid:
                    continue
                if not kernels[kernel]['kernel_alias'] or kernels[kernel]['kernel_alias'] == kernels[kernel]['kernel_name']:
                    kernels[kernel]['kernel_alias'] = kernel[:8]
                available_kernels.append({"label": kernels[kernel]['kernel_alias'], "value": kernel})
            self.state.availableKernels = available_kernels
            self.process()
            return available_kernels
        except Exception as e:
            print(e)
            return []

    def add_kernel(self: "KernelDashboard", room_uuid: str, board_uuid: str, owner_uuid: str, is_private: bool=False,kernel_name: str="python3", auth_users: set=set(), kernel_alias: str="YO") -> None:
        """Add a kernel to the list of kernels"""
        try: 
            j_url = f"{self._base_url}/kernels"
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
                jupyter_kernels = "JUPYTER:KERNELS"
                r_json = self._jupyter_client.redis_server.json()
                r_json.set(jupyter_kernels, response_data['id'], kernel_info)
            self.refresh_list()
        except Exception as e:
            print(e)
            return []

    def delete_kernel(self: "KernelDashboard", kernel_id: str) -> None:
        """Delete a kernel from the list of kernels and from the redis server"""
        j_url = f'{self._base_url}/kernels/{kernel_id}'
        response = requests.delete(j_url, headers=self._headers)
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._jupyter_client.redis_server.json()
        if response.status_code == 204:
            r_json.delete(jupyter_kernels, kernel_id)
        self.refresh_list()

    def stop_kernel(self: "KernelDashboard", kernel_id: str) -> None:
        """Stop a kernel"""
        j_url = f'{self._base_url}/kernels/{kernel_id}'
        response = requests.delete(j_url, headers=self._headers)
        if response.status_code == 204:
            self.refresh_list()

    def start_kernel(self: "KernelDashboard", kernel_id: str) -> None:
        """Start a kernel"""
        j_url = f'{self._base_url}/kernels/{kernel_id}'
        response = requests.post(j_url, headers=self._headers)
        if response.status_code == 201:
            self.refresh_list()

    def restart_kernel(
        self: "KernelDashboard", 
        kernel_id: str) -> None:
        """Restart a kernel

        Args:
            self (KernelDashboard): this
            kernel_id (str): kernel id
        """
        j_url = f'{self._base_url}/kernels/{kernel_id}/restart'
        response = requests.post(j_url, headers=self._headers)
        self.refresh_list()

    def refresh_list(self: "KernelDashboard") -> None:
        """
        Refresh the list of kernels and sessions
        """
        self.state.kernels = self.get_kernels()
        self.state.sessions = self.get_sessions()
        self.process()

    def process(self: "KernelDashboard") -> None:
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def process_every(self, seconds=5):
    # #     # TODO: check if kernels changed and only refresh if they did
        while True:
            if self.state.kernels != self.get_kernels():
                self.refresh_list()
            time.sleep(seconds)