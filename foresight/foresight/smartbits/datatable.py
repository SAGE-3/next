#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from foresight.smartbits.smartbit import SmartBit, ExecuteInfo
from foresight.smartbits.smartbit import TrackedBaseModel
from pydantic import Field, PrivateAttr
from typing import Optional, TypeVar
from urllib.request import urlopen
from urllib.parse import urlparse
from os.path import splitext
import pandas as pd
import numpy as np
# import pyarrow as pa
import pyarrow.csv as csv
import time
import math
# import magic

PandasDataFrame = TypeVar('pandas.core.frame.DataFrame')


class DataTableState(TrackedBaseModel):
    executeInfo: ExecuteInfo

    viewData: Optional[dict]

    totalRows: int
    rowsPerPage: int
    currentPage: int
    pageNumbers: list
    indexOfFirstRow: int
    indexOfLastRow: int

    selectedCols: list
    selectedCol: str

    selectedRows: list
    selectedRow: str

    timestamp: float


class DataTable(SmartBit):
    # the key that is assigned to this in state is
    state: DataTableState
    # Original df to keep track of
    _original_df: PandasDataFrame = PrivateAttr()
    # Modified df to keep track of
    _modified_df: PandasDataFrame = PrivateAttr()
    _current_rows: PandasDataFrame = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(DataTable, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def paginate(self):
        p_start = time.time()
        i = 1
        pageNumbers = []
        self.state.totalRows = self._modified_df.shape[0]
        while i <= math.ceil(self.state.totalRows / self.state.rowsPerPage):
            pageNumbers.append(i);
            i += 1
        self.state.pageNumbers = pageNumbers
        self.state.indexOfLastRow = self.state.currentPage * self.state.rowsPerPage
        self.state.indexOfFirstRow = self.state.indexOfLastRow - self.state.rowsPerPage
        self._current_rows = self._modified_df.iloc[self.state.indexOfFirstRow:self.state.indexOfLastRow]
        print("_current_rows")
        print(self._current_rows)
        self.state.viewData = self._current_rows.to_dict("split")
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("paginate")
        print("I am sending this information")
        print("=======================")
        p_end = time.time()
        print(f"time to paginate: {p_end - p_start}")
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

    def get_ext(self, url):
        parsed = urlparse(url)
        root, ext = splitext(parsed.path)
        return ext[1:]

    # TODO, add a decorator to automatically set executeFunc
    # and params to ""
    def load_data(self, url):
        start = time.time()
        extension = self.get_ext(url)
        response = urlopen(url)
        # Leave magic in for retrieving file extensions of uploaded datasets, not API datasets
        # print(magic.from_file(response))
        # print(magic.from_file(response, mime=True))
        valid_exts = ['csv', 'tsv', 'json', 'xlxs']
        if extension in valid_exts:
            if extension == 'csv':
                arrow_tbl = csv.read_csv(response)
                self._modified_df = arrow_tbl.to_pandas()
                # self._modified_df = pd.read_csv(response)
            elif extension == 'tsv':
                self._modified_df = pd.read_table(response)
            elif extension == 'json':
                self._modified_df = pd.read_json(response)
            elif extension == 'xlxs':
                self._modified_df = pd.read_excel(response)
        else:
            raise Exception("unsupported format")

        # self._modified_df = pd.read_json(response)
        # self._modified_df = pd.read_json(url)
        if pd.Index(np.arange(0, len(self._modified_df))).equals(self._modified_df.index):
            pass
        else:
            self._modified_df.reset_index()
        self._original_df = self._modified_df
        end = time.time()
        print(f"time to load_data into dataframe: {end - start}")
        self.paginate()
        self.state.selectedCols = []
        print("--------------")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("load_data")
        print("I am sending this information")
        print("=======================")
        self.send_updates()

    def table_sort(self, selected_cols):
        self._modified_df.sort_values(by=selected_cols, inplace=True)
        self.state.currentPage = 1
        self.paginate()
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("table_sort")
        print(f"selected_columns: {selected_cols}")
        print("I am sending this information")
        self.send_updates()

    def drop_columns(self, selected_cols):
        self._modified_df.drop(columns=selected_cols, axis=1, inplace=True)
        self.paginate()
        self.state.selectedCols = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("drop_columns")
        print("I am sending this information")
        self.send_updates()

    def drop_rows(self, selected_rows):
        selected_rows = list(map(int, selected_rows))
        self._modified_df.drop(selected_rows, axis=0, inplace=True)
        self.paginate()
        self.state.selectedRows = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("drop_rows")
        print("I am sending this information")
        self.send_updates()

    def transpose_table(self):
        self._modified_df.transpose()
        self.paginate()
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("transpose_table")
        print("I am sending this information")
        self.send_updates()

    def restore_table(self):
        self._modified_df = self._original_df
        self.paginate()
        self.state.selectedCols = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("restore_table")
        print("I am sending this information")
        self.send_updates()

    def column_sort(self, selected_col):
        self._modified_df.sort_values(by=selected_col, inplace=True)
        self.state.currentPage = 1
        self.state.selectedCol = ""
        self.paginate()
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("column_sort")
        print(f"column: {selected_col}")
        print("I am sending this information")
        self.send_updates()

    def drop_column(self, selected_col):
        self._modified_df.drop(columns=selected_col, axis=1, inplace=True)
        self.paginate()
        self.state.selectedCol = ""
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print("drop_column")
        print(f"column: {selected_col}")
        print("I am sending this information")
        self.send_updates()

    def filter_rows(self, filter_input, col):
        if filter_input == "":
            self.restore_table()
        else:
            self._modified_df = self._modified_df[self._modified_df[col].str.lower().str.contains(filter_input.lower())]
        # if col.isnumeric():
        #     self._modified_df = self._modified_df.loc[self._modified_df[col] == int(filter_input)]
        # else:
        #     self._modified_df = self._modified_df.loc[self._modified_df[col] == filter_input]
        # self._modified_df = self._modified_df.filter(like=filter_input, axis=0)
        self.paginate()
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("---------------------------------------------------------")
        print(f"filter_rows on {col}")
        print("I am sending this information")
        self.send_updates()

    def clean_up(self):
        pass