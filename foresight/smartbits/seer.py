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

import json

class SeerState(TrackedBaseModel):
    code: str = ""
    output: str = ""
    executeInfo: ExecuteInfo


class Seer(SmartBit):
    # the key that is assigned to this in state is
    state: SeerState
    # _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Seer, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def execute(self, uuid):
        print("Responding to an execute func")
        print("I am in seer's execute. ")

        print(f"uuid is: {uuid}")

        output = json.dumps({'request_id': '0eacbf77298041b0bbe7ae21d68d68b3', 'stream': {'name': 'stdout', 'text': f'{self.state.code}'}})
        self.state.output = output
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def clean_up(self):
        pass
