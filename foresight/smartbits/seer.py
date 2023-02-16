#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from pydantic import PrivateAttr
from jupyterkernelproxy import JupyterKernelProxy
import httpx
import json
import os
import logging

#TODO: Add 127.0.0.1:5000 Seer Server to config file

logger = logging.getLogger(__name__)


class SeerState(TrackedBaseModel):
    prompt: str = "" # prompt to generate the code
    code: str = "" # code to execute
    output: str = "" # reserved for the output of the code
    kernel: str = "" # selected kernel
    kernels: list = [] # list of all available kernels
    executeInfo: ExecuteInfo


class Seer(SmartBit):
    # the key that is assigned to this in state is
    state: SeerState
    # _kernel = PrivateAttr()
    _inferred_code = PrivateAttr()
    _jupyter_client = PrivateAttr()
    _token = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Seer, self).__init__(**kwargs)
        self._jupyter_client = JupyterKernelProxy()
        # self._kernel = self.state.kernel
        self._inferred_code  = None
        # valid_kernel_list = [k['id'] for k in self._jupyter_client.get_kernels()]
        # if valid_kernel_list:
        #     self._kernel =  valid_kernel_list[0]
        self._token = {'Authorization': 'Bearer ' + os.getenv("TOKEN")}
        if self._jupyter_client.redis_server.json().get('JUPYTER:KERNELS') is None:
            self._jupyter_client.redis_server.json().set('JUPYTER:KERNELS', '.', {})

    def handle_exec_result(self, msg):
        print(f"\n\n\nreceived exec result: {msg}\n\n\n\n")
        self.state.output = json.dumps(msg)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_available_kernels(self, user_uuid=None):
        """
        This function will get the kernels from the redis server
        """
        # get all valid kernel ids from jupyter server
        valid_kernel_list = [k['id'] for k in self._jupyter_client.get_kernels()]
        # get all kernels from redis server
        kernels = self._jupyter_client.redis_server.json().get('JUPYTER:KERNELS')
        # remove kernels the list of available kernels that are not in jupyter server
        [kernels.pop(k) for k in kernels if k not in valid_kernel_list]
        available_kernels = []
        for kernel in kernels.keys():
            if user_uuid and kernels[kernel]["is_private"] and kernels[kernel]["owner_uuid"] != user_uuid:
                continue
            if not kernels[kernel]['kernel_alias'] or kernels[kernel]['kernel_alias'] == kernels[kernel]['kernel_name']:
                kernels[kernel]['kernel_alias'] = kernel[:8]
            available_kernels.append({"key": kernel, "value": kernels[kernel]})
        self.state.kernels = available_kernels
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

    def generate(self, _uuid):
        print("I am in seer's execute.")
        # TODO: handle the posts as async instead
        if self.state.prompt:
            payload = {"query": self.state.prompt}
            headers = {'Content-Type': 'application/json'}
            resp = httpx.post('http://127.0.0.1:5002/nlp-to-code', headers=headers, json=payload, timeout=15.0)
            if resp.status_code == 200 and resp.json()["status"] == "success":
                code = resp.json()["code"]
                print(f"GOT CODE FROM SEER SERVER AND IT's {code}")
                self.state.code = code
                self.execute(_uuid)
            else:
                msg = {"request_id": _uuid,
                       "error": {
                           'ename': "SeerPromptError",  # Exception name, as a string
                           'evalue': "Error converting prompt to code.",  # Exception value, as a string
                           'traceback': [self.state.prompt]  # Traceback frames, as a list of strings
                       }
                    }
                self.handle_exec_result(msg)
        else: # UI won't allow you to exec with an empty prompt
            logger.error("Seer Generate func called but state.prompt was empty")
            msg = {"request_id": _uuid,
                     "error": {
                                'ename': "SeerPromptError",  # Exception name, as a string
                                'evalue': "The prompt is empty.",  # Exception value, as a string
                                'traceback': [self.state.prompt]  # Traceback frames, as a list of strings
                            }
                    }
            self.handle_exec_result(msg)

    def interrupt(self):

        command_info = {
            "call_fn": self.handle_exec_result,
            "code": "",
            "kernel": self.state.kernel,
            "token": ""
        }
        if self.state.kernel:
            logger.debug(f"Sending interrupt request to  kernel {command_info['kernel']}")
            self._jupyter_client.interrupt(command_info)

    def clean_up(self):
        pass
