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

class VegaLiteViewerState(TrackedBaseModel):
    spec: str = ""
    error: bool = False
    # executeInfo: ExecuteInfo


class VegaLiteViewer(SmartBit):
    # the key that is assigned to this in state is
    state: VegaLiteViewerState
    # _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(VegaLiteViewer, self).__init__(**kwargs)
        # self.state.executeInfo.executeFunc = ""
        # self.state.executeInfo.params = {}
        # self.send_updates()
        # self._some_private_info = {1: 2}

    def clean_up(self):
        pass
