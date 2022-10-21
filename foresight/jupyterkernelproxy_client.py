# TODO: should this have it's own SageComm info or should it use the proxy instead?
# TODO: should this have it's own SageComm info or should it use the proxy instead?
import time
import threading
import requests
from config import config as conf, prod_type
import json
import uuid
from utils.borg import Borg
import datetime
import redis
import asyncio

import websockets









class JupyterReponseChecker():
    def __inti__(self, kernel_id):
        self.kernel_id = kernel_id
    def submit_query(msg):




class JupyterKernelClient(Borg):
    """
    Jupyter kernel is responsible for
    """


    def __init__(self,startup_timeout=60):
        Borg.__init__(self)
        if not hasattr(self, "redis_serve"):
            self.activekernels = {}

            # TODO: change port so it's read from configuration
            self.redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)
            self.token = self.redis_server.get('config:jupyter:token').decode()
            self.headers = headers = {'Authorization': f"Token {self.token}"}
            self.base_ws = conf[prod_type]['jupyter_ws']

            self.pubsub = self.redis_server.pubsub()
            self.pubsub.subscribe('jupyter_outputs')
            # start an independent listening process.
            self.stop_thread = False  # keep on checking until this changes to false
            # self.msg_checker = threading.Thread(target=self.process_response)
            # self.msg_checker.start()
            self.callback_info = {}
            self.available_kernels = {}

    def get_board_kernel_id(self):
        """
        gets the default board associated with the kernel client
        :return:
        """
        response = requests.get(conf[prod_type]["jupyter_server"] + "/api/kernels", headers=self.headers)
        try:
            board_kernel = json.loads(response.text)[0]["id"]
            return board_kernel
        except:
            result = {"request_id": str(uuid.uuid4()), "error": {"evalue": "Couldn't connect to Kernel"}}
            print(result)
            self.redis_server.publish('jupyter_outputs', json.dumps(result))
            return result

    def format_execute_request_msg(self, code):
        msg_type = 'execute_request'
        content = {'code': code, 'silent': False}
        hdr = {'msg_id': uuid.uuid1().hex,
               'username': 'tests',
               'data': datetime.datetime.now().isoformat(),
               'msg_type': msg_type,
               'version': '5.0'}
        msg = {'header': hdr,
               'parent_header': hdr,
               'metadata': {},
               'channel': 'shell',  # requests for code execution, object information, prompts, etc
               'content': content}
        return msg

async def socket_activity(address, callback):
    reader, _ = await asyncio.open_connection(address)
    while True:
        message = await reader.read()



    #
    # def set_available_kernels(self):
    #     pass
    #     # jupyter_token = self.redis_server.get("config:jupyter:token")
    #     # headers = {'Authorization': f"Token  {jupyter_token.decode()}"}
    #     # j_url = f"{conf[prod_type]['jupyter_server']}/api/kernels"
    #     # response = requests.get(j_url, headers=headers)
    #     # kernels = json.loads(response.text)
    #     # self.available_kernels = {x["id"]: x["id"] for x in kernels}
    #
    def execute(self, command_info):
        """
        execute a command
        :param command_info:
        a dict with 5 keys, 1- uuid, 2-call_fn, a callback function, 3 code to run, 4: kernel id, 5: token
        :return:
        """
        user_passed_uuid = command_info["uuid"]
        callback_fn = command_info["call_fn"]

        # payload = json.dumps({
        #     "kernel": command_info["kernel"],
        #     "token": command_info["token"],
        #     "code": command_info["code"]
        # })
        # headers = {
        #     'Content-Type': 'application/json'
        # }

        try:
            if command_info['kernel'] not in self.activekernels:


            socket_url = f"{self.base_ws}/api/kernels/{command_info['kernel']}/channels"
            session_id = uuid.uuid4().hex
            socket_url = f"{socket_url}?session_id={session_id}"
            ws = await websockets.connect(socket_url, extra_headers=self.headers, ping_timeout=None)
            msg = format_execute_request_msg(command_info["code"])
            parent_msg_id = msg["parent_header"]["msg_id"]
            self.callback_info[msg['request_id']] = (parent_msg_id, callback_fn)
            _ = await ws.send(json.dumps(msg))
            result = {"request_id": parent_msg_id}
        except:
            raise Exception(f"couldn't run code on {self.url}")
        return msg
    #
    #
    #
    #
    def process_response(self):
        while not self.stop_thread:
            ready_to_end = False
            while not ws.closed:
                response = await ws.recv()
                print(response)
                response = json.loads(response)
                if parent_msg_id == response["parent_header"]["msg_id"]:
                    if response['msg_type'] in ['execute_result', 'display_data', "error", "stream"]:
                        result[response['msg_type']] = response['content']
                        ready_to_end = True
                    elif response['msg_type'] in ["execute_reply"]:
                        if response['content']["status"] == "error":
                            result["error"] = response['content']['traceback']
                        await ws.close()
                    elif ready_to_end and 'execution_state' in response['content'] and response['content'][
                        'execution_state'] == 'idle':
                        await ws.close()
            print(result)
            red.publish('jupyter_outputs', json.dumps(result))
            return result
            time.sleep(1)  # be nice to the system :)
