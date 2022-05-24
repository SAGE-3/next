#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit


class Stickies(SmartBit):
    # the key that is assigned to this in state is
    state_name = "value"
    state_type = "atom"

    def __init__(self, data):
        super().__init__(self.state_name, data)
        state_data = self.get_state()
        self.state= {"text": state_data["data"]["text"], "color": state_data["data"]["color"]}


    @property
    def text(self):
        return self.state["text"]

    @text.setter
    def text(self, value):
        if value != self.state["text"]:
            self.state["text"] = value
            self.update_state(self.state)

    @property
    def color(self):
        return self.state["color"]

    @color.setter
    def color(self, value):
        if value != self.state["color"]:
            self.state["color"] = value
            self.update_state(self.state)


