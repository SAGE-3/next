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
    # kernel: str = "python3"
    # kernels: list = []
    availableKernels: list = []
    availableSessions: list = []
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

    def get_available_kernels(self, room_uuid, board_uuid, user_uuid):
        """
        This function will get the kernels from the redis server
        """
        # print('i am here 3')
        jupyter_kernels = "JUPYTER:KERNELS"
        r_json = self._jupyter_client.redis_server.json()
        kernels = r_json.get(jupyter_kernels)
        available_kernels = []
        for kernel_id, kernel_info in kernels.items():
            if kernel_info["is_private"] and user_uuid != kernel_info["owner_uuid"]:
                continue
            if kernel_info["room"] != room_uuid:
                continue
            if kernel_info["board"] != board_uuid:
                continue
            if not kernel_info['kernel_alias'] or kernel_info['kernel_alias'] == kernel_info['kernel_name']:
                    kernel_info['kernel_alias'] = kernel_id[:8]
            available_kernels.append({"id": kernel_id, "alias": kernel_info["kernel_alias"]})
        self.state.availableKernels = available_kernels
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def get_available_sessions(self, room_uuid, board_uuid, user_uuid):
        """
        This function will get the kernels from the redis server
        """
        jupyter_sessions = "JUPYTER:SESSIONS"
        r_json = self._jupyter_client.redis_server.json()
        sessions = r_json.get(jupyter_sessions)
        available_sessions = []
        for session_id, session_info in sessions.items():
            if session_info["is_private"] and user_uuid != session_info["owner_uuid"]:
                continue
            if session_info["room"] != room_uuid:
                continue
            if session_info["board"] != board_uuid:
                continue
            if not session_info['session_alias'] or session_info['session_alias'] == session_info['session_name']:
                    session_info['session_alias'] = session_id[:8]
            available_sessions.append({"id": session_id, "alias": session_info["session_alias"]})
        self.state.availableSessions = available_sessions
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def execute(self, uuid: str) -> None:
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

        # print(f"Command info is {command_info}")
        # print(f"My proxy is: {self._jupyter_proxy}")
        self._jupyter_client.execute(command_info)
