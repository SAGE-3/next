#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from pydantic import PrivateAttr

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from jupyterkernelproxy import JupyterKernelProxy

import logging

import json

logger = logging.getLogger(__name__)

class SageCellState(TrackedBaseModel):
    code: str = ""
    output: str = ""
    kernel: str = ""
    availableKernels: list = []
    privateMessage: list = []
    executeInfo: ExecuteInfo

class SageCell(SmartBit):
    # the key that is assigned to this in state is
    state: SageCellState
    _jupyter_client = PrivateAttr()
    _r_json = PrivateAttr()
    _redis_space = PrivateAttr(default='JUPYTER:KERNELS')
    _msg_count = PrivateAttr(default=0)
    _request_id = PrivateAttr(default='')

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(SageCell, self).__init__(**kwargs)
        self._jupyter_client = JupyterKernelProxy()
        self._r_json = self._jupyter_client.redis_server.json()
        if self._r_json.get(self._redis_space) is None:
            self._r_json.set(self._redis_space, '.', {})

    def handle_exec_result(self, msg):
        """
        This function will handle the results from the jupyter server

        We need to add a msg_count to the message so that the front end can
        determine if the message is the last message in the sequence

        :param msg:
        :return:
        """
        if msg['request_id'] != self._request_id:
            self._msg_count = 0
            self._request_id = msg['request_id']
        self._msg_count += 1
        msg['msg_count'] = self._msg_count
        self.state.output = json.dumps(msg)
        # print(f"handle_exec_result: {self.state.output}")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def generate_error_message(self, user_uuid, error_msg):
        # 'You do not have access to this kernel'
        pm = [{'userId': user_uuid, 'message': error_msg}]
        self.state.privateMessage = pm
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_available_kernels(self, _uuid=None):
        """
        This function will get the kernels from the redis server
        """
        # get all valid kernel ids from jupyter server
        valid_kernel_list = [k['id'] for k in self._jupyter_client.get_kernels()]
        # get all kernels from redis server
        kernels = self._jupyter_client.redis_server.json().get(self._redis_space)
        # remove kernels the list of available kernels that are not in jupyter server
        [kernels.pop(k) for k in kernels if k not in valid_kernel_list]
        available_kernels = []
        for kernel in kernels.keys():
            if not kernels[kernel]['kernel_alias'] or kernels[kernel]['kernel_alias'] == kernels[kernel]['kernel_name']:
                kernels[kernel]['kernel_alias'] = kernel[:8]
            available_kernels.append({"key": kernel, "value": kernels[kernel]})
        self.state.availableKernels = available_kernels
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
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
            "token": ""
        }
        if self.state.kernel:
            self._jupyter_client.execute(command_info)
        else:
            self.state.executeInfo.executeFunc = ""
            self.state.executeInfo.params = {}
            self.send_updates()

    def interrupt(self, _uuid=None):

        command_info = {
            "uuid": _uuid,
            "call_fn": self.handle_exec_result,
            "code": "",
            "kernel": self.state.kernel,
            "token": ""
        }
        if self.state.kernel:
            logger.debug(f"Sending interrupt request to  kernel {command_info['kernel']}")
            self._jupyter_client.interrupt(command_info)
        else:
            # TODO: MLR fix to solve issue #339
            # self.generate_error_message(SOME_USER_ID, "You need to select a kernel")
            self.state.executeInfo.executeFunc = ""
            self.state.executeInfo.params = {}
            self.send_updates()

    def clean_up(self):
        self._jupyter_client.clean_up()
