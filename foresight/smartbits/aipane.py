# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------
import time

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from typing import Optional, TypeVar
from pydantic import PrivateAttr

import json
from config import ai_models, funcx as funcx_config
import pandas as pd



PandasDataFrame = TypeVar('pandas.core.frame.DataFrame')

# TODO: movie this to a configuration somewhere and call it something else.
ai_settings = {
    "vision": {
        "supported_apps": ['ImageViewer'],
        "tasks": {
            "Object Detection": ["image_od_model_1", "image_od_model_2"],
            "Classification": ["image_c_model_1", "image_c_model_2"]
        }
    },
    "nlp": {
        "supported_apps": ['PDFViewer', 'Notepad'],
        "tasks": {
            "Summarization": ["text_s_model_1", "text_s_model_2", ],
        }
    }
}


class AIPaneState(TrackedBaseModel):
    executeInfo: ExecuteInfo
    messages: dict
    hostedApps: Optional[dict]
    supported_tasks: dict
    runStatus: bool
    output: str


class AIPane(SmartBit):
    # the key that is assigned to this in state is
    state: AIPaneState
    # Original df to keep track of
    _output_df: PandasDataFrame = PrivateAttr()
    # Original df to keep track of
    # _original_df: PandasDataFrame = PrivateAttr()
    # _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(AIPane, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def new_app_added(self, app_type):
        """
        :return: tasks supported based on the apps hosted.
        The tasks returned are exactly as defined in ai_settings above.
        """
        print("New app added")

        supported_tasks = {}
        if len(self.state.hostedApps.values()) > 1:
            self.state.messages[time.time()] = """need to return error message saying that we 
            can on operate on one datatype at a time"""
        # if this is the second app added, then skip this since it was already done for the first app added.
        else:
            if len(self.state.hostedApps) == 1:
                for type, settings in ai_settings.items():
                    if app_type in settings["supported_apps"]:
                        supported_tasks[type] = settings['tasks']
            # ANDY: we need a state variable we can put the supported_tasks in
        print(f"supported tasks are: {supported_tasks}")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    # def run_function(self):
    #     self.state.runStatus = True
    #     print("Apps are being hosted: ")
    #
    #     print(self.state.hostedApps.values())
    #     self.state.executeInfo.executeFunc = ""
    #     self.send_updates()

    # def test_function(self):
    #     print("++++++++++++++++++++++++++++++")
    #     if len(self.state.hostedApps) > 1:
    #         # 1 can only handle apps of the same type.
    #         print("Apps are being hosted: ")
    #         print(len(self.state.hostedApps.values()))
    #         print(self.state.hostedApps.values())
    #     else:
    #         print("Pane is empty")
    #     self.state.executeInfo.executeFunc = ""
    #     self.send_updates()

    def handle_exec_result(self, msg):
        print("I am handling the execution results")
        print(f" type of msg in aipane{type(msg)}")
        self.state.output = msg
        # self._output_df = pd.read_json(self.state.output)
        # self.state.output = self._output_df.to_dict("split")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def execute_model(self, some_uuid, model_id):
        params = {
            'model_id': model_id,
            'model_url': ai_models["urls"][model_id],
            'data': {'urls': ['http://aishelf.org/wp-content/uploads/2021/05/yolo_2.jpg',
                              'http://farm9.staticflickr.com/8245/8622384284_d5535dfc3d_z.jpg']}
        }
        payload = {
            "app_uuid": "SOMETHING",
            "msg_uuid": some_uuid,
            "callback_fn": self.handle_exec_result,
            "funcx_uuid": funcx_config["ai_func_uuid"],
            "endpoint_uuid": funcx_config["endpoint_uuid"],
            "data": params
        }
        self._ai_client.execute(payload)
