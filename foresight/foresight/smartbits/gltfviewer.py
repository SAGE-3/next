# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel


class GLTFViewerState(TrackedBaseModel):
    assetid: str
    p: float
    a: float
    d: float
    avatarPosition: list[float]
    avatarOrientation: list[float]


class GLTFViewer(SmartBit):
    # the key that is assigned to this in state is
    state: GLTFViewerState
    # _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(GLTFViewer, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def clean_up(self):
        pass
