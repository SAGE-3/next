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
    kernel: str = "python3"
    kernels: list = []
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
        if the kernel is public, or if the user is the owner of the kernel
        it will be added to the list of available kernels
        :param user_uuid:
        :return: list of kernels in the form of kernal_alias:kernel_id
        {
            '746dcafb-f578-4e1c-b515-8a7a185f26c0': {
                'kernel_alias': 'test1',
                'kernel_name': 'python3',
                'room': '570bd4af-db4d-4ed3-919d-ec53832a3259',
                'board': '6c68f094-4dc6-40a2-af8a-3f96612d2031',
                'owner_uuid': '9b93ab8b-20b2-4016-9bfb-ca8b76acc160',
                'is_private': False,
                'auth_users': []
            }
        }
        """
        print('i am here 3')
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._jupyter_client.redis_server.json()
        kernels = r_json.get(jupyter_kernels)
        available_kernels = []

        for kernel in kernels.keys():
            if kernels[kernel]["is_private"] and kernels[kernel]["owner_uuid"] != user_uuid:
                continue
            if not kernels[kernel]['kernel_alias'] or kernels[kernel]['kernel_alias'] == kernels[kernel]['kernel_name']:
                kernels[kernel]['kernel_alias'] = kernel[:8]
            available_kernels.append({"label": kernels[kernel]['kernel_alias'], "value": kernel})
        if len(available_kernels) > 0:
            self.state.availableKernels = available_kernels
            print(f"I am sending back available Kernels {available_kernels}")
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
