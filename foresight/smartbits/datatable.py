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
import math

PandasDataFrame = TypeVar('pandas.core.frame.DataFrame')

class DataTableState(TrackedBaseModel):
    executeInfo: ExecuteInfo

    viewData: Optional[dict]

    totalRows: int
    rowsPerPage: int
    currentPage: int
    pageNumbers: list

    selectedCols: list
    selectedCol: str

    timestamp: float



class DataTable(SmartBit):
    # the key that is assigned to this in state is
    state: DataTableState
    # Original df to keep track of
    _df: PandasDataFrame = PrivateAttr()
    # Modified df to keep track of
    _modified_df: PandasDataFrame = PrivateAttr()
    _current_rows: PandasDataFrame = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(DataTable, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def paginate(self):
        i = 1
        pageNumbers = []
        self.state.totalRows = self._modified_df.shape[0]
        while i <= math.ceil(self.state.totalRows / self.state.rowsPerPage):
            pageNumbers.append(i);
            i += 1
        self.state.pageNumbers = pageNumbers
        index_of_last_row = self.state.currentPage * self.state.rowsPerPage
        index_of_first_row = index_of_last_row - self.state.rowsPerPage
        self._current_rows = self._modified_df.iloc[index_of_first_row:index_of_last_row]
        print("_current_rows")
        print(self._current_rows)
        self.state.viewData = self._current_rows.to_dict("split")
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("paginate")
        print("I am sending this information")
        print("=======================")
        self.send_updates()

    def handle_left_arrow(self):
        if self.state.currentPage != 1:
            self.state.currentPage -= 1
            self.paginate()
        else:
            print("No page before 1")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("handle_left_arrow")
        print("I am sending this information")
        print("=======================")
        self.send_updates()

    def handle_right_arrow(self):
        if self.state.currentPage != len(self.state.pageNumbers):
            self.state.currentPage += 1
            self.paginate()
        else:
            print(f"No page after {len(self.state.pageNumbers)}")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("handle_right_arrow")
        print("I am sending this information")
        print("=======================")
        self.send_updates()


# TODO, add a decorator to automatically set executeFunc
    # and params to ""
    def load_data(self):
        self._df = pd.read_json("https://www.dropbox.com/s/cg22j2nj6h8ork8/data.json?dl=1")
        self._modified_df = pd.read_json("https://www.dropbox.com/s/cg22j2nj6h8ork8/data.json?dl=1")
        self.paginate()
        print("--------------")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("load_data")
        print("I am sending this information")
        print("=======================")
        self.send_updates()

    def table_sort(self, selected_cols):
        self._modified_df.sort_values(by=selected_cols, inplace=True)
        self.state.viewData = self._modified_df.to_dict("split")
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("table_sort")
        print(f"selected_columns: {selected_cols}")
        print("I am sending this information")
        self.send_updates()

    def drop_columns(self, selected_cols):
        self._modified_df.drop(columns=selected_cols, inplace=True)
        self.state.viewData = self._modified_df.to_dict('split')
        self.state.selectedCols = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("drop_columns")
        print("I am sending this information")
        self.send_updates()

    def transpose_table(self):
        self._modified_df.transpose()
        self.state.viewData = self._modified_df.to_dict('split')
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("transpose_table")
        print("I am sending this information")
        self.send_updates()

    def restore_table(self):
        self._modified_df = self._df
        self.state.viewData = self._modified_df.to_dict('split')
        self.state.selectedCols = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("restore_table")
        print("I am sending this information")
        self.send_updates()

    def column_sort(self, col):
        self._modified_df.sort_values(by=col, inplace=True)
        self.state.selectedCol = ""
        self.state.viewData = self._modified_df.to_dict("split")
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("column_sort")
        print(f"column: {col}")
        print("I am sending this information")
        self.send_updates()

    def drop_column(self, col):
        self._modified_df.drop(columns=col, inplace=True)
        self.state.selectedCol = ""
        self.state.viewData = self._modified_df.to_dict('split')
        self.state.selectedCols = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("drop_column")
        print(f"column: {col}")
        print("I am sending this information")
        self.send_updates()


