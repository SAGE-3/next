#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
# JSON lib
import json
# Task queue
from smartbits.celery_tasks import process

class WebviewState(TrackedBaseModel):
    webviewurl: str
    zoom: int
    executeResult: str
    executeInfo: ExecuteInfo

class Webview(SmartBit):
    # the key that is assigned to this in state is
    state: WebviewState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Webview, self).__init__(**kwargs)

    def returnError(self, msg):
        print('Webview> error', msg)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.state.executeResult = ""
        self.send_updates()

    def returnData(self, data):
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        # Send the data as a string
        self.state.executeResult = json.dumps(data)
        self.send_updates()

    def analyze_youtube(self, user):
        url = self.state.webviewurl
        print("analyze_youtube by the user", user, url)
        url = url.replace("?autoplay=0", "")
        print("URL", url)

        # res = process.delay(url)
        res = process(url)
        if res:
            print("ready", res)
            self.returnData(res)

        # response = requests.post(service, json={'url': url})
        # if response.status_code != 200:
        #     print('Error accessing audiolizr', response.status_code, response.text)
        #     self.returnError('Error accessing audiolizr')
        # else:
        #     print('Accessing audiolizr', response.status_code)
        #     json = response.json()
        #     self.returnData(json)

    def clean_up(self):
        pass
