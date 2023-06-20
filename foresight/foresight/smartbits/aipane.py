#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import time
from enum import Enum

from pydantic import PrivateAttr

from foresight.smartbits.smartbit import SmartBit, ExecuteInfo
from foresight.smartbits.smartbit import TrackedBaseModel
from typing import Optional, TypeVar
from foresight.config import ai_models, ai_supported, funcx as funcx_config
from foresight.config import config as conf, prod_type
from foresight.ai.ai_client import AIClient
# from foresight.task_scheduler import TaskScheduler

if prod_type == "development":
    import os
    import dropbox
    import requests

class RunStatus(Enum):
    READY = 0
    RUNNING = 1
    ERROR = 2


def get_sharing_url(private_url):
    """
    Uploads hosted image original file to DropBox and produces a public sharing url
    :return: array of hosted image file sharing urls
    """
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
    return url[: -1] + "1"


# if prod_type == "development":
#     headers = {'Authorization': f"Bearer {os.getenv('TOKEN')}"}


class AIPaneState(TrackedBaseModel):
    executeInfo: ExecuteInfo
    messages: dict
    hostedApps: Optional[dict]
    supportedTasks: Optional[dict]
    runStatus: int
    # lastHeartBeat: int
    supportedTasks: Optional[dict]


class AIPane(SmartBit):
    # the key that is assigned to this in state is
    state: AIPaneState
    _ai_client = PrivateAttr()
    # _task_scheduler = PrivateAttr()
    _pending_executions: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        requires_update = False
        print("AI PANE'S DATA")
        print(kwargs)
        if kwargs['state']['runStatus'] or \
                kwargs['state']['executeInfo']["executeFunc"]:
            requires_update = True

        super(AIPane, self).__init__(**kwargs)
        print("create the ai pane's ai_client")
        self._ai_client = AIClient()
        self._pending_executions = {}
        if requires_update:
            print("Sending update")
            self.state.runStatus = False
            self.state.executeInfo.executeFunc = ""
            self.state.executeInfo.params = {}
            self.send_updates()

    def new_app_added(self, app_type):
        """
        :return: tasks supported based on the apps hosted.
        The tasks returned are exactly as defined in ai_settings above.
        """
        print("An app was added to AIPAne")

        supported_tasks = {}
        if len(set(self.state.hostedApps.values())) > 1:
            self.state.messages[time.time()] = """Only one datatime is supported"""
        # if this is the second app added, then skip this since it was already done for the first app added.
        elif len(set(self.state.hostedApps.values())) == 1:
            for _type, settings in ai_supported.items():
                if app_type in settings["supported_apps"]:
                    supported_tasks[_type] = settings['tasks']
                    self.state.supportedTasks = supported_tasks
        print(f"supported tasks are: {self.state.supportedTasks}")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def handle_image_exec_result(self, app_uuid, msg_uuid, msg):
        """
        Callback function that handles the output produced by AI model. Produces a payload of bounding boxes and labels.
        Sends output to ImageViewer
        """
        print(f"the apps involved are {self._pending_executions[msg_uuid]}")
        if msg["output"] != '':
            for i, hosted_app_id in enumerate(self._pending_executions[msg_uuid]):
                d = {i: x for i, x in enumerate(msg["output"][i])}
                # d = {x["label"]: x["box"] for x in msg["output"][i]}
                payload = {"state.objects": d, "state.annotations": True}
                print(f"updating the boxes on image {hosted_app_id}")
                response = self._s3_comm.send_app_update(hosted_app_id, payload)

                print(f"response is {response.status_code}")
                print("done")
            self.state.runStatus = int(RunStatus.READY.value)
        else:
            self.state.runStatus = int(RunStatus.ERROR.value)
            print("---------------------- No bounding boxes returned ----------------------")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()
        del (self._pending_executions[msg_uuid])

    def execute_model(self, exec_uuid, model_id):
        # Only handling images for now, we are getting the image url directly.
        # TODO: update eventually to handle pdf or data stored in other apps
        app_ids = list(self.state.hostedApps.keys())
        urls = []
        for app_id in app_ids:
            print(f"getting app info for app_id {app_id}")
            app_data = self._s3_comm.get_app(app_id)
            asset_id = app_data["data"]["state"]["assetid"]
            # img_name = self._s3_comm.get_asset(asset_id)["data"]["path"].split("/")[-1]
            # img_url = self._s3_comm.conf[self._s3_comm.prod_type]['web_server'] + "/api/assets/static/" + img_name
            # public_url = format_public_url(self, asset_id)
            # TODO  check that the asset belongs to the room/wall (ISSUE #400)
            public_url = self._s3_comm.format_public_url(asset_id)
            urls.append(public_url)
            print(f"Public URLs for data are: {urls}")

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
        print("---------------------In execute AI of AIPanel--------------------------")
        print(f"payload is {payload}")
        print("------------------------------------------------------------")

        self._ai_client.execute(payload)
        print("just called the ai_client's execute")
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def check_stale_jobs(self):
        """
        Will keep track of pending jobs and return an error message for stale jobs.
        """
        pass

    def clean_up(self):
        pass
        # This is borg so no cleeaning up before testing whether it
        # affects other clients
        # self._ai_client.clean_up()
