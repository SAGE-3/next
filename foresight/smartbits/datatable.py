# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from pydantic import Field, PrivateAttr
from typing import Optional, TypeVar
import pandas as pd
import time

PandasDataFrame = TypeVar('pandas.core.frame.DataFrame')

class DataTableState(TrackedBaseModel):

    viewData: Optional[dict]
    selectedCols: list

    executeInfo: ExecuteInfo
    timestamp: float


class DataTable(SmartBit):
    # the key that is assigned to this in state is
    state: DataTableState
    # Original df to keep track of
    _df: PandasDataFrame = PrivateAttr()
    # Modified df to keep track of
    _modified_df: PandasDataFrame = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(DataTable, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    # TODO, add a decorator to automatically set executeFunc
    # and params to ""
    def load_data(self):
        self._df = pd.read_json("https://www.dropbox.com/s/cg22j2nj6h8ork8/data.json?dl=1")
        self._modified_df = pd.read_json("https://www.dropbox.com/s/cg22j2nj6h8ork8/data.json?dl=1")
        print("--------------")
        self._df.insert(0, 'Index', range(0, self._df.shape[0], 1))
        self._modified_df.insert(0, 'Index', range(0, self._df.shape[0], 1))
        self.state.viewData = self._modified_df.to_dict("split")
        self.state.timestamp = time.time()
        # self.state.totalPosts = self._modified_df.shape[0]
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("load_data")
        print("I am sending this information")
        print("=======================")
        self.send_updates()

    def menu_click(self):
        action = f"You've clicked an action to perform"
        self.state.menuAction = action
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("menu_click")
        print("I am sending this information")
        self.send_updates()

    def table_menu_click(self, selected_cols):
        listToStr = ' '.join([str(item) for item in selected_cols])
        action = f"You've clicked an action to perform on columns: {listToStr}"
        self.state.tableMenuAction = action
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("table_menu_click")
        print("I am sending this information")
        self.send_updates()


    def table_sort(self, selected_cols):
        self._modified_df.sort_values(by=selected_cols, inplace=True)
        self.state.viewData = self._modified_df.to_dict("records")
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("table_sort")
        print(f"selected_columns: {selected_cols}")
        print("I am sending this information")
        self.send_updates()

    def column_sort(self):
        pass

    def transpose_table(self):
        self._modified_df.transpose()
        self.state.viewData = self._modified_df.to_dict('records')
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("transpose_table")
        print("I am sending this information")
        self.send_updates()

    def drop_columns(self, selected_cols):
        self._modified_df.drop(columns=selected_cols, inplace=True)
        self.state.viewData = self._modified_df.to_dict('records')
        self.state.selectedCols = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("drop_columns")
        print("I am sending this information")
        self.send_updates()

    def restore_table(self):
        self._modified_df = self._df
        self.state.viewData = self._modified_df.to_dict('records')
        self.state.selectedCols = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("restore_table")
        print("I am sending this information")
        self.send_updates()


