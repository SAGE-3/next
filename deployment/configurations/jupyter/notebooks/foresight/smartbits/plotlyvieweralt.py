#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ContainerMixin


class PlotlyViewer(SmartBit, ContainerMixin):
    state_name = "Figure"
    state_type = "atom"

    def __init__(self, data):
        super().__init__(self.state_name, data)
        state_data = self.get_state()
        self.state = state_data["data"]



    @property
    def data(self):
        return self.state["data"]

    @data.setter
    def data(self, value):
        self.state["data"] = value
        self.update_state(self.state)

    @property
    def layout(self):
        return self.state["layout"]

    @layout.setter
    def layout(self, value):
        self.state["layout"] = value
        self.update_state(self.state)
