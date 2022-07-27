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
    selectedCols: list
    items: list
    headers: list
    menuAction: str
    tableMenuAction: str
    executeInfo: ExecuteInfo
    timestamp: float


class DataTable(SmartBit):
    # the key that is assigned to this in state is
    state: DataTableState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(DataTable, self).__init__(**kwargs)
        # self.df = None
        # self._some_private_info = {1: 2}
        # Original df
        self.df = None
        # Modified df to keep track of
        self.modified_df = None

    # TODO, add a decorator to automatically set executeFunc
    # and params to ""
    def load_data(self, url):
        # self.df = pd.read_json("https://www.dropbox.com/s/z7ivd97xvf5yd58/data.json?dl=1")
        # self.modified_df = pd.read_json("https://www.dropbox.com/s/z7ivd97xvf5yd58/data.json?dl=1")
        # print("--------------")
        # self.state.viewData = self.modified_df.to_dict('records')
        temp_json = {
            "Duration":{
                "0":60,
                "1":60,
                "2":60,
                "3":45,
                "4":45,
                "5":60,
                "6":55,
                "7":45,
                "8":50,
                "9":55,
                "10":55
            },
            "Pulse":{
                "0":110,
                "1":117,
                "2":103,
                "3":109,
                "4":117,
                "5":102,
                "6":105,
                "7":120,
                "8":117,
                "9":98,
                "10":111
            },
            "Maxpulse":{
                "0":130,
                "1":145,
                "2":135,
                "3":175,
                "4":148,
                "5":127,
                "6":155,
                "7":145,
                "8":150,
                "9":155,
                "10":155
            },
            "Calories":{
                "0":409,
                "1":479,
                "2":340,
                "3":282,
                "4":406,
                "5":300,
                "6":355,
                "7":245,
                "8":350,
                "9":455,
                "10":255
            }
        }
        df = pd.DataFrame(temp_json)
        df.insert(0, 'Index', range(0, df.shape[0], 1))
        self.state.viewData = df.to_dict("records")
        self.state.timestamp = time.time()
        self.state.totalPosts = df.shape[0]
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        print("=======================")
        self.send_updates()

    def menu_click(self):
        action = f"You've clicked an action to perform"
        self.state.menuAction = action
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()

    def table_menu_click(self, selected_cols):
        listToStr = ' '.join([str(item) for item in selected_cols])
        action = f"You've clicked an action to perform on columns: {listToStr}"
        self.state.tableMenuAction = action
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()


    def table_sort(self, selected_cols):
        # df_sorted = self.modified_df.sort_values(by=selected_cols)
        # self.state.viewData = df_sorted.to_dict('records')
        temp_json = {
            "Duration":{
                "0":60,
                "1":60,
                "2":60,
                "3":45,
                "4":45,
                "5":60,
                "6":55,
                "7":45,
                "8":50,
                "9":55,
                "10":55
            },
            "Pulse":{
                "0":110,
                "1":117,
                "2":103,
                "3":109,
                "4":117,
                "5":102,
                "6":105,
                "7":120,
                "8":117,
                "9":98,
                "10":111
            },
            "Maxpulse":{
                "0":130,
                "1":145,
                "2":135,
                "3":175,
                "4":148,
                "5":127,
                "6":155,
                "7":145,
                "8":150,
                "9":155,
                "10":155
            },
            "Calories":{
                "0":409,
                "1":479,
                "2":340,
                "3":282,
                "4":406,
                "5":300,
                "6":355,
                "7":245,
                "8":350,
                "9":455,
                "10":255
            }
        }
        df = pd.DataFrame(temp_json)
        df.insert(0, 'Index', range(0, df.shape[0], 1))
        df = df.sort_values(by=selected_cols)
        self.state.viewData = df.to_dict("records")
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()

    def column_sort(self):
        pass

    def transpose_table(self):
        # df_transposed = self.modified_df.transpose()
        # self.state.viewData = df_transposed.to_dict('records')
        temp_json = {
            "Duration":{
                "0":60,
                "1":60,
                "2":60,
                "3":45,
                "4":45,
                "5":60,
                "6":55,
                "7":45,
                "8":50,
                "9":55,
                "10":55
            },
            "Pulse":{
                "0":110,
                "1":117,
                "2":103,
                "3":109,
                "4":117,
                "5":102,
                "6":105,
                "7":120,
                "8":117,
                "9":98,
                "10":111
            },
            "Maxpulse":{
                "0":130,
                "1":145,
                "2":135,
                "3":175,
                "4":148,
                "5":127,
                "6":155,
                "7":145,
                "8":150,
                "9":155,
                "10":155
            },
            "Calories":{
                "0":409,
                "1":479,
                "2":340,
                "3":282,
                "4":406,
                "5":300,
                "6":355,
                "7":245,
                "8":350,
                "9":455,
                "10":255
            }
        }
        df = pd.DataFrame(temp_json)
        df.insert(0, 'Index', range(0, df.shape[0], 1))
        df = df.transpose()
        self.state.viewData = df.to_dict("records")
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()

    def drop_columns(self, selected_cols):
        # df_remaining = self.modified_df.drop(columns=selected_cols)
        # self.state.viewData = df_remaining.to_dict('records')
        temp_json = {
            "Duration":{
                "0":60,
                "1":60,
                "2":60,
                "3":45,
                "4":45,
                "5":60,
                "6":55,
                "7":45,
                "8":50,
                "9":55,
                "10":55
            },
            "Pulse":{
                "0":110,
                "1":117,
                "2":103,
                "3":109,
                "4":117,
                "5":102,
                "6":105,
                "7":120,
                "8":117,
                "9":98,
                "10":111
            },
            "Maxpulse":{
                "0":130,
                "1":145,
                "2":135,
                "3":175,
                "4":148,
                "5":127,
                "6":155,
                "7":145,
                "8":150,
                "9":155,
                "10":155
            },
            "Calories":{
                "0":409,
                "1":479,
                "2":340,
                "3":282,
                "4":406,
                "5":300,
                "6":355,
                "7":245,
                "8":350,
                "9":455,
                "10":255
            }
        }
        df = pd.DataFrame(temp_json)
        df.insert(0, 'Index', range(0, df.shape[0], 1))
        df.drop(columns=selected_cols)
        self.state.viewData = df.to_dict("records")
        self.state.selected = []
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()

    def restore_table(self):
        # self.state.viewData = self.df.to_dict('records')
        temp_json = {
            "Duration":{
                "0":60,
                "1":60,
                "2":60,
                "3":45,
                "4":45,
                "5":60,
                "6":55,
                "7":45,
                "8":50,
                "9":55,
                "10":55
            },
            "Pulse":{
                "0":110,
                "1":117,
                "2":103,
                "3":109,
                "4":117,
                "5":102,
                "6":105,
                "7":120,
                "8":117,
                "9":98,
                "10":111
            },
            "Maxpulse":{
                "0":130,
                "1":145,
                "2":135,
                "3":175,
                "4":148,
                "5":127,
                "6":155,
                "7":145,
                "8":150,
                "9":155,
                "10":155
            },
            "Calories":{
                "0":409,
                "1":479,
                "2":340,
                "3":282,
                "4":406,
                "5":300,
                "6":355,
                "7":245,
                "8":350,
                "9":455,
                "10":255
            }
        }
        df = pd.DataFrame(temp_json)
        df.insert(0, 'Index', range(0, df.shape[0], 1))
        self.state.selectedCols = []
        self.state.viewData = df.to_dict("records")
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()


