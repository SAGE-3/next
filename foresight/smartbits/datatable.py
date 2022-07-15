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

    viewData: Optional[dict] = Field(alias = "viewData")
    loaded: bool
<<<<<<< HEAD
#     clicked: bool
selected: list
items: Optional[dict]
headers: list
menuAction: str
tableMenuAction: str
=======
clicked: bool
checkedItems: list
>>>>>>> origin/dev
executeInfo: ExecuteInfo
timestamp: float


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
        temp_json = {
            "Duration":{
                "0":60,
                "1":60,
                "2":60,
                "3":45,
                "4":45,
                "5":60
            },
            "Pulse":{
                "0":110,
                "1":117,
                "2":103,
                "3":109,
                "4":117,
                "5":102
            },
            "Maxpulse":{
                "0":130,
                "1":145,
                "2":135,
                "3":175,
                "4":148,
                "5":127
            },
            "Calories":{
                "0":409,
                "1":479,
                "2":340,
                "3":282,
                "4":406,
                "5":300
            }
        }
        df = pd.DataFrame(temp_json)
        self.state.viewData = df.to_dict('records')
        self.state.timestamp = time.time()
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
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

    def table_sort(self, select):
        temp_json = {
            "Duration":{
                "0":60,
                "1":60,
                "2":60,
                "3":45,
                "4":45,
                "5":60
            },
            "Pulse":{
                "0":110,
                "1":117,
                "2":103,
                "3":109,
                "4":117,
                "5":102
            },
            "Maxpulse":{
                "0":130,
                "1":145,
                "2":135,
                "3":175,
                "4":148,
                "5":127
            },
            "Calories":{
                "0":409,
                "1":479,
                "2":340,
                "3":282,
                "4":406,
                "5":300
            }
        }
        df = pd.DataFrame(temp_json)
        df_sorted = df.sort_values(by=select)
        self.state.viewData = df_sorted.to_dict('records')
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()

    def column_sort(self):
        pass

    def pd_json_to_json(self, pd_json):
        pass

    def transpose_table(self):
        temp_json = {
            "Duration":{
                "0":60,
                "1":60,
                "2":60,
                "3":45,
                "4":45,
                "5":60
            },
            "Pulse":{
                "0":110,
                "1":117,
                "2":103,
                "3":109,
                "4":117,
                "5":102
            },
            "Maxpulse":{
                "0":130,
                "1":145,
                "2":135,
                "3":175,
                "4":148,
                "5":127
            },
            "Calories":{
                "0":409,
                "1":479,
                "2":340,
                "3":282,
                "4":406,
                "5":300
            }
        }
        df = pd.DataFrame(temp_json)
        df_transposed = df.transpose()
        self.state.viewData = df_transposed.to_dict('records')
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        print("I am sending this information")
        self.send_updates()


