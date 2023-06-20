#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel


class CounterState(TrackedBaseModel):
    count: int
    executeInfo: ExecuteInfo


class Counter(SmartBit):
    # the key that is assigned to this in state is
    state: CounterState
    # _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Counter, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def reset_to_zero(self):
        print("Zeroing requested by te user")
        self.state.count = 0
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def clean_up(self):
        pass
