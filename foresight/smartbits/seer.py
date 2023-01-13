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

class SeerState(TrackedBaseModel):
    code: str = ""
    output: str = ""
    executeInfo: ExecuteInfo


class Seer(SmartBit):
    # the key that is assigned to this in state is
    state: SeerState
    _kernel = PrivateAttr()
    _inferred_code = PrivateAttr()
    _jupyter_client = PrivateAttr()
    _token = PrivateAttr()


    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Seer, self).__init__(**kwargs)
        self._jupyter_client = JupyterKernelProxy()
        self._kernel = None
        self._inferred_code  = None
        valid_kernel_list = [k['id'] for k in self._jupyter_client.get_kernels()]
        if valid_kernel_list:
            self._kernel =  valid_kernel_list[0]
        self._token = {'Authorization': 'Bearer ' + os.getenv("TOKEN")}

    def handle_exec_result(self, msg):
        print(f"\n\n\nreceived exec result: {msg}\n\n\n\n")
        self.state.output = json.dumps(msg)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()


    def exec_python(self, uuid, code):
        """
        Non blocking function to execute code. The proxy has the responsibility to execute the code
        and to call a call_back function which know how to handle the results message
        :param uuid:
        :param code:
        :return:
        """
        command_info = {
            "uuid": uuid,
            "call_fn": self.handle_exec_result,
            "code": code,
            "kernel": self._kernel,
            "token": ""
        }

        if self._kernel:
            self._jupyter_client.execute(command_info)

    def execute(self, uuid):
        print("I am in seer's execute.")
        # TODO: handle the posts as async instead
        intent = None
        if self.state.code.startswith("!# "):
            payload = {"query": self.state.code[3:]}
            headers = {'Content-Type': 'application/json'}
            resp = httpx.post('http://127.0.0.1:5000/predict_intent', headers=headers, json=payload)
            if resp.status_code == 200:
                intent = resp.json()["intent"]

            if intent is None or intent == "?":
                # TODO return an error saying that we cannot find the intent.
                msg = {"request_id": uuid,
                       "error": {
                           'ename': "IntentNotFound",  # Exception name, as a string
                           'evalue': "Errot detection instruction intent",  # Exception value, as a string
                           'traceback': [self.state.code[3:]],
                       }
                }
                self.handle_exec_result(msg)

            else:
                if intent == "LOAD":
                    resp = httpx.post('http://127.0.0.1:5000/load_dataset', headers=headers, json=payload)
                    if resp.status_code == 200 and resp.json()["status"] == "success":
                        code = resp.json()["code"]
                    headers = f"storage_params = {self._token}"
                    code = headers + "\n\n" + code
                    print(f"\n\n\ncode is: {code}\n\n\n")
                    self.exec_python(uuid, code)
                elif intent.upper() == "QUERY" or intent.upper() == "VISUAL":
                    resp = httpx.post('http://127.0.0.1:5000/handle_query', headers=headers, json=payload)
                    if resp.status_code == 200 and resp.json()["status"] == "success":
                        code = resp.json()["code"]
                        print(f"\n\n\ncode is: {code}\n\n\n")
                        self.exec_python(uuid, code)
        else:
            self.exec_python(uuid, self.state.code)

    def clean_up(self):
        pass
