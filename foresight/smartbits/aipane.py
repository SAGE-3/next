# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------
import time

from pydantic import PrivateAttr

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from typing import Optional, TypeVar
from config import ai_models, funcx as funcx_config
from config import config as conf, prod_type
if prod_type == "development":
    import os
    import dropbox
    import requests


def get_sharing_url(private_url):
    file_name = private_url.split("/")[-1]
    print(f"file_name is {file_name}")
    headers = {'Authorization': f"Bearer {os.getenv('TOKEN')}"}
    data = requests.get(private_url, headers=headers).content
    if not os.getenv("DROPBOX_TOKEN"):
        raise Exception("Cannot find DROPBOX TOKEN")
    dbx = dropbox.Dropbox(os.getenv("DROPBOX_TOKEN"))
    _ = dbx.files_upload(data, f"/sage3_image_folder/{file_name}", mode=dropbox.files.WriteMode("overwrite"))
    sharing_links = dbx.sharing_get_shared_links(f"/sage3_image_folder/{file_name}")
    if sharing_links and not sharing_links.links:
        url = dbx.sharing_create_shared_link_with_settings(f"/sage3_image_folder/{file_name}").url
    else:
        url = sharing_links.links[0].url
    return url[: -1]+"1"



# if prod_type == "development":
#     headers = {'Authorization': f"Bearer {os.getenv('TOKEN')}"}

# TODO: movie this to a configuration somewhere and call it something else.
ai_settings = {
    "vision": {
        "supported_apps": ['ImageViewer'],
        "tasks": {
            "Object Detection": ["facebook/detr-resnet-50", "lai_lab/fertilized_egg_detect"],
            "Classification": ["image_c_model_1", "image_c_model_2"]
        }
    },
    "nlp": {
        "supported_apps": ['PDFViewer', 'Notepad'],
        "tasks": {
            "Summarization": ["facebook/bart-large-cnn", "sshleifer/distilbart-cnn-12-6"],
        }
    }
}


class AIPaneState(TrackedBaseModel):
    executeInfo: ExecuteInfo
    messages: dict
    hostedApps: Optional[dict]
    supportedTasks: Optional[dict]
    runStatus: bool
    # output: Optional[dict]

    supportedTasks: Optional[dict]


class AIPane(SmartBit):
    # the key that is assigned to this in state is
    state: AIPaneState

    _pending_executions: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(AIPane, self).__init__(**kwargs)
        self._pending_executions = {}

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
            self.state.supportedTasks = supported_tasks
        print(f"supported tasks are: {self.state.supportedTasks}")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def handle_image_exec_result(self, app_uuid, msg_uuid, msg):
        print("I am handling the execution results")
        print(f" type of msg in aipane{msg}")
        print(f"the apps involved are {self._pending_executions[msg_uuid]}")

        for i, hosted_app_id in enumerate(self._pending_executions[msg_uuid]):
            d = {x["label"]: x["box"] for x in msg["output"][i]}
            payload = {"state.boxes": d, "state.annotations": True}
            print(f"updating the boxes on image {hosted_app_id}")
            response = self._s3_comm.send_app_update(hosted_app_id, payload)

            print(f"response is {response.status_code}")
            print("done")
        # self.state.output = json.dumps(msg)
        self.state.runStatus = False
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()
        del(self._pending_executions[msg_uuid])

    def execute_model(self, exec_uuid, model_id):
        # Only handling images for now, we getting the image url directly.
        # TODO: update eventually to handle pdf or data stored in other apps
        app_ids = list(self.state.hostedApps.keys())
        urls = []
        for app_id in app_ids:
            app_data = self._s3_comm.get_app(app_id)
            asset_id = app_data["data"]["state"]["assetid"]
            img_name = self._s3_comm.get_asset(asset_id)["data"]["path"].split("/")[-1]
            img_url = self._s3_comm.conf[self._s3_comm.prod_type]['web_server'] + "/api/assets/static/" + img_name
            urls.append(img_url)


        # need to upload images to public server so they are visible to Compaas.
        # TODO: make this an async call
        if prod_type == "development":
            public_urls = []
            for url in urls:
                public_urls.append(get_sharing_url(url))
            urls = public_urls

        params = {
            'model_id': model_id,
            'model_url': ai_models["urls"][model_id],
            'data': {
                'urls': urls,
                "app_ids": app_ids
            }
        }

        self._pending_executions[exec_uuid] = app_ids

        payload = {
            "app_uuid": self.app_id,
            "msg_uuid": exec_uuid,
            "callback_fn": self.handle_image_exec_result,
            "funcx_uuid": funcx_config["ai_func_uuid"],
            "endpoint_uuid": funcx_config["endpoint_uuid"],
            "data": params
        }
        print("---------------------In execute AI--------------------------")
        print(f"uuid: {exec_uuid}")
        print(f"model_id: {model_id}")
        print(f"params: {params}")
        print("------------------------------------------------------------")

        self._ai_client.execute(payload)
        print("just called the ai_client's execute")

    def clean_up(self):
        pass