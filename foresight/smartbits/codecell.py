# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
#from pydantic import PrivateAttr


class CodeCellState(TrackedBaseModel):
    code: str
    output: str
    output_type: str # "ex. text/plain, stdout, html, etc"
    executeInfo: ExecuteInfo
    #history: dict


class CodeCell(SmartBit):
    # the key that is assigned to this in state is
    state: CodeCellState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(CodeCell, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def handle_exec_result(self, msg):
        print(" \n\n\n************I am in Code Cell's  function that handles the result of the execution, i.e. updating the client")
        print(f"return message is {msg}************\n\n\n")
        if "text" in msg['content']:
            self.state.output  = msg["content"]["text"]
            self.state.output_type  = msg["content"]["name"]
        elif "data" in msg['content']:
            self.state.output  = list(msg['content']['data'].values())[0]
            self.state.output_type  = list(msg['content']['data'].keys())[0]

        elif "traceback" in msg['content']:
            self.state.output  = str(msg['content'])
            self.state.output_type  = "text/error"



        self.send_updates()


    def execute(self, uuid):
        """
        Non blocking function to execute code. The proxy has the responsibility to execute the code
        and to call a call_back function which know how to handle the results message
        :param uuid:
        :param code:
        :return:
        """
        command_info = {"uuid": uuid,
                        "call_fn": self.handle_exec_result,
                        "code": self.state.code}
        self._jupyter_proxy.execute(command_info)
        # the proxy has the responsibilitys