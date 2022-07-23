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
        print(f"I am in execute results and msg is: {msg}")
        self.state.output = msg["execute_result"]
        self.state.output_type = "NOT USED"

        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()



    def execute(self, uuid):
        """
        Non blocking function to execute code. The proxy has the responsibility to execute the code
        and to call a call_back function which know how to handle the results message
        :param uuid:
        :param code:
        :return:
        """
        print("*****-------I am running a test*****-------")
        command_info = {"uuid": uuid,
                        "call_fn": self.handle_exec_result,
                        "code": self.state.code}

        print(f"Command info is {command_info}")
        print(f"My proxy is: {self._jupyter_proxy}")
        self._jupyter_proxy.execute(command_info)
