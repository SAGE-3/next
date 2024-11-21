# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from pydantic import Field
from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel


class StickieState(TrackedBaseModel):
    text: str = Field(description="The text to display on the stickie note")
    color: str = Field(
        description="The background color of the stickie note, use yellow if a color is not provided",
        default="yellow",
    )
    fontSize: int = Field(description="The font size to use for the text", default=36)
    lock: bool = Field(description="Is the note locked for editing", default=False)


class Stickie(SmartBit):
    # the key that is assigned to this in state is
    state: StickieState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Stickie, self).__init__(**kwargs)

    def clean_up(self):
        pass
