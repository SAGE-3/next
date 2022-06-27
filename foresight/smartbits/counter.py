#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit
from smartbits.smartbit import TrackedBaseModel
from pydantic import PrivateAttr

class CounterState(TrackedBaseModel):
    count: int
    # execute: str

class Counter(SmartBit):
    # the key that is assigned to this in state is
    state: CounterState
    _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Counter, self).__init__(**kwargs)
        self._some_private_info = {1:2}


    # @action
    def reset_to_zero(self):
        print("Zeroing requested by te user")
        __func = self.execute["function"]





