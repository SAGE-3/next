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
import pandas as pd
import time

class DataTableState(TrackedBaseModel):

    viewData: Optional[dict]
    loaded: bool
    selected: list
    items: list
    headers: list
    menuAction: str
    tableMenuAction: str
    executeInfo: ExecuteInfo
    timestamp: float
    # df: pd.DataFrame


class DataTable(SmartBit):
    # the key that is assigned to this in state is
    state: DataTableState


    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(DataTable, self).__init__(**kwargs)
        self.df = None
        # self._some_private_info = {1: 2}

    # self.state.df = pd.read_json('./data.json')

    # TODO, add a decorator to automatically set executeFunc
    # and params to ""
    def load_data(self, url):

        self.df = pd.read_json("https://www.dropbox.com/s/z7ivd97xvf5yd58/data.json?dl=1")
        self.state.viewData = self.df.to_dict('records')
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def menu_click(self):
        action = f"You've clicked an action to perform"
        self.state.menuAction = action
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()

    def table_menu_click(self, select):
        listToStr = ' '.join([str(item) for item in select])
        action = f"You've clicked an action to perform on columns: {listToStr}"
        self.state.tableMenuAction = action
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()

    def table_sort(self, sort_col):

        df_sorted = self.df.sort_values(by=sort_col)
        self.state.viewData = df_sorted.to_dict('records')
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        print(self.state.viewData)
        self.send_updates()

    def column_sort(self):
        pass

    def pd_json_to_json(self, pd_json):
        pass

    def transpose_table(self):

        df_transposed = self.df.transpose()
        self.state.viewData = df_transposed.to_dict('records')
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        print(self.state.viewData)
        self.send_updates()

    def drop_columns(self, selected_cols):
        df_remaining = self.df.drop(columns=selected_cols)
        self.state.viewData = df_remaining.to_dict('records')
        self.state.selected = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        print(self.state.viewData)
        self.send_updates()

    def restore_table(self):
        self.state.viewData = self.df.to_dict('records')
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()


