# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from pydantic import Field, PrivateAttr
from typing import Optional, TypeVar

PandasDataFrame = TypeVar('pandas.core.frame.DataFrame')


class AIPaneState(TrackedBaseModel):
    executeInfo: ExecuteInfo
    hostedApps: Optional[dict]


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


    def test_function(self):
        print("++++++++++++++++++++++++++++++")
        if len(self.state.hostedApps) > 0:
            print("Apps are being hosted: ")
            print(len(self.state.hostedApps.values()))
            print(self.state.hostedApps.values())
        else:
            print("Pane is empty")
        self.state.executeInfo.executeFunc = ""
        self.send_updates()

