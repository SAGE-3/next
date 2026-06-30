# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from pydantic import Field
from pysage3.smartbits.smartbit import SmartBit, TrackedBaseModel


class TimerState(TrackedBaseModel):
    originalTotal: float = Field(description="Original timer duration in seconds", default=300)
    total: float = Field(description="Remaining time in seconds", default=300)
    clientStartTime: float = Field(description="Client timestamp when timer was started (ms)", default=0)
    isRunning: bool = Field(description="Whether the timer is currently running", default=False)


class Timer(SmartBit):
    state: TimerState

    def __init__(self, **kwargs):
        super(Timer, self).__init__(**kwargs)

    def clean_up(self):
        pass
