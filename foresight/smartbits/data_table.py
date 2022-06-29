# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from pydantic import Field


class DataTableState(TrackedBaseModel):
    view_data: dict = Field(alias = "viewData")
    executeInfo: ExecuteInfo


class DataTable(SmartBit):
    # the key that is assigned to this in state is
    state: DataTableState


    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(DataTable, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def load_table(self, url):
        temp_json = {"col_1": [1,2,3], "col_1": [4,5,6]}
        print(url)
        self.state.view_data = temp_json
        print("I am sendig this information")
        self.send_updates()



