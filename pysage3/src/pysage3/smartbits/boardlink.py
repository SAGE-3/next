# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from pydantic import Field
from pysage3.smartbits.smartbit import SmartBit, TrackedBaseModel


class BoardLinkState(TrackedBaseModel):
    url: str = Field(description="The URL of the linked board", default="")
    cardTitle: str = Field(description="The display title of the board link", default="")


class BoardLink(SmartBit):
    state: BoardLinkState

    def __init__(self, **kwargs):
        super(BoardLink, self).__init__(**kwargs)

    def clean_up(self):
        pass
