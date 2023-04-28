#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------
import time

import requests

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
    availableKernels: list = []
    code: str = ""
    executeInfo: ExecuteInfo
    execCount: int = 0
    fontSize: int = 24
    isTyping: bool = False
    kernel: str = ""
    output: str = ""
    prompt: str = ""

class Seer(SmartBit):
    # the key that is assigned to this in state is
    state: SeerState
    _inferred_code = PrivateAttr()
    _jupyter_client = PrivateAttr()
    _token = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Seer, self).__init__(**kwargs)
        self._jupyter_client = JupyterKernelProxy()
        self._inferred_code  = None
        # valid_kernel_list = [k['id'] for k in self._jupyter_client.get_kernels()]
        # if valid_kernel_list:
        #     self._kernel = valid_kernel_list[0]
        self._token = {'Authorization': 'Bearer ' + os.getenv("TOKEN")}
        if self._jupyter_client.redis_server.json().get('JUPYTER:KERNELS') is None:
            self._jupyter_client.redis_server.json().set('JUPYTER:KERNELS', '.', {})

    def handle_exec_result(self, msg):
        print(f"received exec result: {msg}")
        self.state.output = json.dumps(msg)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_available_kernels(self):
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
            if not kernels[kernel]['kernel_alias'] or kernels[kernel]['kernel_alias'] == kernels[kernel]['kernel_name']:
                kernels[kernel]['kernel_alias'] = kernel[:8]
            available_kernels.append({"key": kernel, "value": kernels[kernel]})
        self.state.availableKernels = available_kernels
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def execute(self, _uuid):
        print("I am in execute... still in seer")
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
            ### THIS NEEDS TO HAPPEN HERE
            self.state.executeInfo.executeFunc = ""
            self.state.executeInfo.params = {}
            self.send_updates()
            ### THIS ABOVE NEEDS TO HAPPEN HERE NO AFTER FUNCTION EXECUTES



            print(f"in seer's generate and the prompt: {self.state.prompt}")
            print("\n\nSENDING REQ >>>")
            time.sleep(10)
            print(">>> DONE SENDING\n\n")
            self.state.code = "print('hi')"
            self.execute(_uuid)








            # self.execute(_uuid)
            # self.send_updates()

            #
            # if resp.status_code == 200 and resp.json()["status"] == "success":
            #     json_resp = resp.json()
            #     if "code" in json_resp:
            #         code = json_resp["code"]
            #
            #         print(f"I got some code from the seer server and it's {code}")
            #
            #         self.execute(_uuid)
            #     else:
            #         print("I am handling data not code")
            #         msg = {"request_id": _uuid,
            #                    "display_data": {
            #                        'data': json_resp["data"]
            #                    }
            #                }
            #         self.handle_exec_result(msg)
            # else:
            #     print("Something went wrong")
            #     msg = {"request_id": _uuid,
            #            "error": {
            #                'ename': "SeerPromptError",  # Exception name, as a string
            #                'evalue': "Error converting prompt to code.",  # Exception value, as a string
            #                'traceback': [ "Error code: "+ resp.status_code]  # Traceback frames, as a list of strings
            #            }
            #         }
            #     self.handle_exec_result(msg)


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
