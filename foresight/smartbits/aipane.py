# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------
import time

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from pydantic import Field, PrivateAttr
from typing import Optional, TypeVar

PandasDataFrame = TypeVar('pandas.core.frame.DataFrame')


class AIPaneState(TrackedBaseModel):
    executeInfo: ExecuteInfo
    hostedApps: Optional[dict]
    runStatus: bool


class AIPane(SmartBit):
    # the key that is assigned to this in state is
    state: AIPaneState
    # Original df to keep track of
    _original_df: PandasDataFrame = PrivateAttr()
    _some_private_info: dict = PrivateAttr()


    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(AIPane, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}


    def run_function(self):
        self.state.runStatus = True
        print("Apps are being hosted: ")
        print(self.state.hostedApps.values())
        self.state.executeInfo.executeFunc = ""
        self.send_updates()
        self.done_function()


    def done_function(self):
        time.sleep(5)
        self.state.runStatus = False
        self.state.executeInfo.executeFunc = ""
        self.send_updates()

