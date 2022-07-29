# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from pydantic import Field
from typing import Optional


class DataTableState(TrackedBaseModel):

    viewData: Optional[dict] = Field(alias = "viewData")
    loaded: bool
    clicked: bool
    checkedItems: list
    executeInfo: ExecuteInfo


class DataTable(SmartBit):
    # the key that is assigned to this in state is
    state: DataTableState


    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(DataTable, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    # TODO, add a decorator to automatically set executeFunc
    # and params to ""
    def load_data(self, url):
        temp_json = {"col_1": [1,2,3], "col_2": [4,5,6]}
        print(url)
        self.state.viewData = temp_json
        print("I am sendig this information")
        self.send_updates()


    def transpose_data(self):
        pass


