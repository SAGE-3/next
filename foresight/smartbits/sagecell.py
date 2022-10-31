# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
import json


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

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(SageCell, self).__init__(**kwargs)

    def handle_exec_result(self, msg):
        self.state.output = json.dumps(msg)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def generate_error_message(self, user_uuid):
        error_message = 'You do not have access to this kernel'
        pm = []
        pm.append({'userId': user_uuid, 'message': error_message})
        self.state.privateMessage = pm
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_available_kernels(self, user_uuid):
        """
        This function will get the kernels from the redis server
        """
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._jupyter_client.redis_server.json()
        if r_json.get(jupyter_kernels) is None:
            r_json.set(jupyter_kernels, '.', {})
        kernels = r_json.get(jupyter_kernels)
        available_kernels = []
        for kernel_id, kernel in kernels.items():
            # if kernel.is_private and kernel.owner_uuid != user_uuid:
            #     continue
            if not kernel['kernel_alias'] or kernel['kernel_alias'] == kernel['kernel_name']:
                kernel['kernel_alias'] = kernel_id[:8]
            available_kernels.append({"key": kernel_id, "value": kernel})
        if len(available_kernels) > 0:
            self.state.availableKernels = available_kernels
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
        command_info = {
            "uuid": uuid,
            "call_fn": self.handle_exec_result,
            "code": self.state.code,
            "kernel": self.state.kernel,
            "token": ""
        }

        self._jupyter_client.execute(command_info)
