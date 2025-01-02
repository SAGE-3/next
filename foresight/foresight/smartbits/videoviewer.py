# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel


class VideoViewerState(TrackedBaseModel):
    assetid: str
    currentTime: float
    paused: bool
    loop: bool


class VideoViewer(SmartBit):
    # the key that is assigned to this in state is
    state: VideoViewerState

    # _some_private_info: dict = PrivateAttr()
    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(VideoViewer, self).__init__(**kwargs)

    def clean_up(self):
        pass
