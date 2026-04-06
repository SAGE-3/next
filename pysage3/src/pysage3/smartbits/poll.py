# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from typing import List, Optional
from pydantic import Field
from pysage3.smartbits.smartbit import SmartBit, TrackedBaseModel


class PollOption(TrackedBaseModel):
    id: str = Field(description="Unique ID for this option")
    option: str = Field(description="The option text")
    votes: int = Field(description="Number of votes for this option", default=0)


class PollData(TrackedBaseModel):
    question: str = Field(description="The poll question")
    options: List[PollOption] = Field(description="The list of poll options", default_factory=list)


class PollState(TrackedBaseModel):
    poll: Optional[PollData] = Field(description="The poll data, or None if not yet created", default=None)


class Poll(SmartBit):
    state: PollState

    def __init__(self, **kwargs):
        super(Poll, self).__init__(**kwargs)

    def clean_up(self):
        pass
