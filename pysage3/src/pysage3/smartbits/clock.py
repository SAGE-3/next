# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from pydantic import Field
from pysage3.smartbits.smartbit import SmartBit, TrackedBaseModel


class ClockState(TrackedBaseModel):
    file: str = Field(description="Clock face file", default="")
    city: str = Field(description="City name to display", default="")
    timeZone: str = Field(description="IANA timezone string (e.g. 'America/Chicago')", default="")
    is24Hour: bool = Field(description="Display time in 24-hour format", default=False)
    color: str = Field(description="Clock color", default="green")


class Clock(SmartBit):
    state: ClockState

    def __init__(self, **kwargs):
        super(Clock, self).__init__(**kwargs)

    def clean_up(self):
        pass
