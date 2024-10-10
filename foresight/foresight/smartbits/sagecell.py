# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from pydantic import PrivateAttr

from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel
from foresight.jupyterkernelproxy import JupyterKernelProxy

import logging

import json

logger = logging.getLogger(__name__)


class SageCellState(TrackedBaseModel):
    code: str = ""
    language: str = "python"
    fontSize: int = 16
    kernel: str = ""
    privateMessage: list = []
    availableKernels: list = []
    output: str = ""
    msgId: str = ("",)
    history: list = []
    streaming: bool = False
    session: str = ""


class SageCell(SmartBit):
    state: SageCellState
    _jupyter_client = PrivateAttr()
    _r_json = PrivateAttr()
    _redis_space = PrivateAttr(default="JUPYTER:KERNELS")

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(SageCell, self).__init__(**kwargs)
        self._jupyter_client = JupyterKernelProxy()
        self._r_json = self._jupyter_client.redis_server.json()
        if self._r_json.get(self._redis_space) is None:
            self._r_json.set(self._redis_space, ".", {})

    def handle_exec_result(self, msg):
        self.state.output = json.dumps(msg)
        self.send_updates()

    def generate_error_message(self, user_uuid, error_msg):
        pm = [{"userId": user_uuid, "message": error_msg}]
        self.state.privateMessage = pm
        self.send_updates()

    def get_available_kernels(self, _uuid=None):
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
                not kernels[kernel]["kernel_alias"]
                or kernels[kernel]["kernel_alias"] == kernels[kernel]["kernel_name"]
            ):
                kernels[kernel]["kernel_alias"] = kernel[:8]
            available_kernels.append({"key": kernel, "value": kernels[kernel]})
        self.state.availableKernels = available_kernels
        self.send_updates()

    def execute(self, _uuid):
        """
        Non blocking function to execute code. The proxy has the responsibility to execute the code
        and to call a call_back function which know how to handle the results message
        :param uuid:
        :param code:
        :return:
        """
        command_info = {
            "uuid": _uuid,
            "call_fn": self.handle_exec_result,
            "code": self.state.code,
            "kernel": self.state.kernel,
            "token": "",
        }
        if self.state.kernel:
            self._jupyter_client.execute(command_info)

    def interrupt(self, _uuid=None):
        command_info = {
            "uuid": _uuid,
            "call_fn": self.handle_exec_result,
            "code": "",
            "kernel": self.state.kernel,
            "token": "",
        }
        if self.state.kernel:
            logger.debug(
                f"Sending interrupt request to  kernel {command_info['kernel']}"
            )
            self._jupyter_client.interrupt(command_info)

    def clean_up(self):
        self._jupyter_client.clean_up()
