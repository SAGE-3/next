#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel


class StickieState(TrackedBaseModel):
    text: str
    fontSize: int
    color: str
    executeInfo: ExecuteInfo

class Stickie(SmartBit):
    # the key that is assigned to this in state is
    state: StickieState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Stickie, self).__init__(**kwargs)

    def clean_up(self):
        pass
