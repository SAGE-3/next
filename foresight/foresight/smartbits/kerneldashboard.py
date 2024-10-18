# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel
from pydantic import PrivateAttr
from foresight.config import config as conf, prod_type
import requests
from foresight.jupyterkernelproxy import JupyterKernelProxy
from foresight.task_scheduler import TaskScheduler


class KernelDashboardState(TrackedBaseModel):
    """
    This class represents the state of the kernel dashboard
    """

    kernelSpecs: list = []
    availableKernels: list = []
    lastHeartBeat: int
    online: bool


class KernelDashboard(SmartBit):
    state: KernelDashboardState

    _redis_space: str = PrivateAttr(default="JUPYTER:KERNELS")
    _base_url: str = PrivateAttr(default=f"{conf[prod_type]['jupyter_server']}/api")
    _jupyter_client = PrivateAttr()
    _r_json = PrivateAttr()
    _headers: dict = PrivateAttr()
    _task_scheduler = PrivateAttr()

    def __init__(self, **kwargs):
        super(KernelDashboard, self).__init__(**kwargs)
        self._task_scheduler = TaskScheduler()
        self._jupyter_client = JupyterKernelProxy()
        self._headers = dict(self._jupyter_client.headers)
        self._r_json = self._jupyter_client.redis_server.json()
        if self._r_json.get(self._redis_space) is None:
            self._r_json.set(self._redis_space, ".", {})
        self.get_kernel_specs()
        self.set_online()
        self._task_scheduler.schedule_task(self.set_online, nb_secs=15)

    def get_kernel_specs(self):
        response = requests.get(f"{self._base_url}/kernelspecs", headers=self._headers)
        kernel_specs = response.json()["kernelspecs"]
        self.state.kernelSpecs = list(kernel_specs.keys())
        # self.state.kernelSpecs = [kernel_specs]
        self.get_available_kernels()

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
        self.send_updates()

    def clean_up(self):
        print("Closing the kernel dashboard")
        self.state.lastHeartBeat = 0
        self.state.online = False
        self._jupyter_client.clean_up()
        self._task_scheduler.clean_up()

    def set_online(self):
        self.state.lastHeartBeat = self._s3_comm.get_time()["epoch"]
        self.state.online = True
        self.send_updates()
