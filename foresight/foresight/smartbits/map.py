# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from typing import List, Optional
from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel


class MapState(TrackedBaseModel):
    location: List[int]
    zoom: float
    bearing: float
    pitch: float
    baseLayer: str
    overlay: bool
    colorScale: str
    assetid: Optional[str]


class Map(SmartBit):
    # the key that is assigned to this in state is
    state: MapState

    # _some_private_info: dict = PrivateAttr()
    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Map, self).__init__(**kwargs)

    def clean_up(self):
        pass
