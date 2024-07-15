# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel
from typing import Optional


class IFrameState(TrackedBaseModel):
    source: str
    doc: Optional[str]


class IFrame(SmartBit):
    # the key that is assigned to this in state is
    state: IFrameState

    # _some_private_info: dict = PrivateAttr()
    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(IFrame, self).__init__(**kwargs)

    def clean_up(self):
        pass
