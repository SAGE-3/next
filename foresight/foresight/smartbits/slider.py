# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel


class SliderState(TrackedBaseModel):
    value: int


class Slider(SmartBit):
    # the key that is assigned to this in state is
    state: SliderState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Slider, self).__init__(**kwargs)

    def set_to_val(self, val):
        self.state.value = val
        self.send_updates()

    def clean_up(self):
        pass
