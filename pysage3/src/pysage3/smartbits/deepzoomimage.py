# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from typing import List
from pydantic import Field
from pysage3.smartbits.smartbit import SmartBit, TrackedBaseModel


class DeepZoomImageState(TrackedBaseModel):
    assetid: str = Field(description="The ID of the deep zoom image asset", default="")
    zoomLevel: float = Field(description="Current zoom level", default=1)
    zoomCenter: List[float] = Field(description="Center of the viewport as [x, y] in [0,1] range", default_factory=lambda: [0.5, 0.5])


class DeepZoomImage(SmartBit):
    state: DeepZoomImageState

    def __init__(self, **kwargs):
        super(DeepZoomImage, self).__init__(**kwargs)

    def clean_up(self):
        pass
