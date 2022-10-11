# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
import json
import websocket
import threading
from pydantic import PrivateAttr
import time
from config import config as conf, prod_type
import requests
import redis


class KernelDashboardState(TrackedBaseModel):
    """
    This class represents the state of the kernel dashboard
    """
    kernels: list = []
    sessions: list = []
    executeInfo: ExecuteInfo

class KernelDashboard(SmartBit):
    state: KernelDashboardState
    _msg_checker = PrivateAttr()
    _redis_server = PrivateAttr()
    _jupyter_token = PrivateAttr()
    # _msg_checker = threading.Thread(target=self.process_every)

    def __init__(self, **kwargs):
        super(KernelDashboard, self).__init__(**kwargs)
        self._msg_checker = threading.Thread(target=self.process_every)
        self._msg_checker.start()

        # self._redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        # self._jupyter_token = self._redis_server.get("config:jupyter:token").decode()


    def get_kernels(self):
        _redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        _jupyter_token = _redis_server.get("config:jupyter:token").decode()
        headers = {'Authorization': f"Token  {_jupyter_token}"}
        j_url = f"{conf[prod_type]['jupyter_server']}/api/kernels"
        response = requests.get(j_url, headers=headers)
        kernels = json.loads(response.text)
        return kernels

    def get_sessions(self):
        _redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        _jupyter_token = _redis_server.get("config:jupyter:token").decode()
        headers = {'Authorization': f"Token  {_jupyter_token}"}
        j_url = f"{conf[prod_type]['jupyter_server']}/api/sessions"
        response = requests.get(j_url, headers=headers)
        sessions = json.loads(response.text)
        return sessions

    def add_kernel(self, kernel_name="python3", path="/boards"):
        _redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        _jupyter_token = _redis_server.get("config:jupyter:token").decode()
        headers = {'Authorization': f"Token  {_jupyter_token}"}
        body = {"name": kernel_name, "path": path}
        j_url = f"{conf[prod_type]['jupyter_server']}/api/kernels"
        response = requests.post(j_url, headers=headers, json=body)
        json.loads(response.text)
        if response.status_code == 200:
            self.refresh_list()

    def delete_kernel(self, kernel_id):
        _redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        _jupyter_token = _redis_server.get("config:jupyter:token").decode()
        headers = {'Authorization': f"Token  {_jupyter_token}"}
        j_url = f"{conf[prod_type]['jupyter_server']}/api/kernels/{kernel_id}"
        response = requests.delete(j_url, headers=headers)
        # json.loads(response.text)
        self.refresh_list()

    def restart_kernel(self, kernel_id):
        _redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        _jupyter_token = _redis_server.get("config:jupyter:token").decode()
        headers = {'Authorization': f"Token  {_jupyter_token}"}
        j_url = f"{conf[prod_type]['jupyter_server']}/api/kernels/{kernel_id}/restart"
        response = requests.post(j_url, headers=headers)
        json.loads(response.text)
        self.refresh_list()

    def delete_session(self, session_id):
        _redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        _jupyter_token = _redis_server.get("config:jupyter:token").decode()
        headers = {'Authorization': f"Token  {_jupyter_token}"}
        j_url = f"{conf[prod_type]['jupyter_server']}/api/sessions/{session_id}"
        response = requests.delete(j_url, headers=headers)
        json.loads(response.text)
        self.refresh_list()

    def add_session(self, kernel_id):
        _redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
        _jupyter_token = _redis_server.get("config:jupyter:token").decode()
        headers = {'Authorization': f"Token  {_jupyter_token}"}
        j_url = f"{conf[prod_type]['jupyter_server']}/api/sessions"
        data = {"kernel": {"id": kernel_id}}
        response = requests.post(j_url, headers=headers, json=data)
        json.loads(response.text)
        self.refresh_list()

    def refresh_list(self):
        self.state.kernels = self.get_kernels()
        self.state.sessions = self.get_sessions() 
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def process_every(self, seconds=5):
        # TODO: check if kernels changed and only refresh if they did
        while True:
            if self.state.kernels != self.get_kernels() or self.state.sessions != self.get_sessions():
                self.refresh_list()
            if self.state.executeInfo.executeFunc == "refresh_list":
                self.refresh_list()
            time.sleep(seconds)