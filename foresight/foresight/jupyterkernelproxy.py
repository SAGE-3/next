#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import redis
import uuid
import datetime
import requests
import json
from ws4py.client import WebSocketBaseClient
from ws4py.manager import WebSocketManager
from ws4py import format_addresses
from foresight.config import config as conf, prod_type

import logging
logger = logging.getLogger(__name__)

# TODO : CONVERT JupyterKernelProxy INTO singleton (use BORG)
def format_execute_request_msg(exec_uuid, code, msg_type='execute_request'):
    content = {'code': code, 'silent': False}
    hdr = {'msg_id': uuid.UUID(exec_uuid).hex,
           'username': 'tests',
           'data': datetime.datetime.now().isoformat(),
           'msg_type': msg_type,
           'version': '5.0'}
    msg = {'header': hdr,
           'parent_header': hdr,
           'metadata': {},
           'channel': 'shell',
           'content': content}
    return msg


class TestiongJupyterClient(WebSocketBaseClient):
    def __init__(self, address, headers):
        super().__init__(address, headers=headers)

    def handshake_ok(self):
        print("Testing: done opening the connection to the Jupyter Kernel client")

    def received_message(self, msg):
        # check if the message
        msg = json.loads(msg.data.decode("utf-8"))
        print(f"Testing: received msg {msg}")

class JupyterKernelProxy:
    class JupyterClient(WebSocketBaseClient):
        def __init__(self, address, headers, parent_proxy_instnace):
            self.pending_reponses = {}
            self.parent_proxy_instance = parent_proxy_instnace
            super().__init__(address, headers=headers)

        def handshake_ok(self):
            logger.debug("Opening %s" % format_addresses(self))
            self.parent_proxy_instance.conn_manager.add(self)

        def received_message(self, msg):
            # check if the message
            # print(f"processing a message {msg}")
            msg = json.loads(msg.data.decode("utf-8"))
            msg_id_uuid = str(uuid.UUID(msg["parent_header"]["msg_id"].split("_")[0]))
            result = {}

            # print(f"received {msg}")
            if msg["channel"] != "iopub":
                return

            if msg_id_uuid in self.pending_reponses:
                # I am done
                if msg['header']['msg_type'] == 'status' and msg['content']['execution_state'] == 'idle':
                    # ready to send the result back
                    if self.pending_reponses[msg_id_uuid] is None:
                        result = {'request_id': msg_id_uuid, 'execute_result': {}}
                        self.parent_proxy_instance.callback_info[msg_id_uuid](result)

                    del(self.pending_reponses[msg_id_uuid])
                    result = {}

                if msg['msg_type'] in ['execute_result', 'display_data', "error", "stream"]:
                    result = {"request_id": msg["parent_header"]["msg_id"], msg['msg_type']: msg['content']}
                elif msg['msg_type'] in ["execute_reply"]:
                    if msg['content']["status"] == "error":
                        result = {"request_id": msg["parent_header"]["msg_id"], "error": msg['content']['traceback']}
                    else:
                        result = {"request_id": msg["parent_header"]["msg_id"], msg['msg_type']: msg['content']}

            if result:
                logger.debug(f"jupyter kernel result is {result}")
                self.pending_reponses[msg_id_uuid] = result
                self.parent_proxy_instance.callback_info[msg_id_uuid](result)


    def __init__(self):
        self.connections = {}
        self.redis_server = redis.StrictRedis(host=conf[prod_type]["redis_server"], port=6379, db=0)

        self.base_ws = conf[prod_type]['jupyter_ws']
        self.token = self.redis_server.get('config:jupyter:token').decode()
        self.headers = [('Authorization', f"Token {self.token}")]
        self.conn_manager = WebSocketManager()
        self.conn_manager.start()
        self.callback_info = {}
        self.results = {}

    def add_client(self, kernel_id):
        # do we need the test below or are we testing for it aready in the execute and interrupt?
        if kernel_id not in self.connections or self.connections[kernel_id].stream is None:
            socket_url = f"{self.base_ws}/api/kernels/{kernel_id}/channels"
            session_id = uuid.uuid4().hex
            socket_url = f"{socket_url}?session_id={session_id}"

            self.connections[kernel_id] = self.JupyterClient(socket_url,
                                                             headers=self.headers,
                                                             parent_proxy_instnace=self)
            self.connections[kernel_id].connect()

    def execute(self, command_info):
        user_passed_uuid = command_info["uuid"]
        msg = format_execute_request_msg(user_passed_uuid, command_info["code"])
        kernel_id = command_info['kernel']
        callback_fn = command_info["call_fn"]

        if kernel_id not in self.connections or self.connections[kernel_id].stream is None:
            self.add_client(kernel_id)

        try:
            self.connections[kernel_id].pending_reponses[user_passed_uuid] = None
            self.callback_info[user_passed_uuid] = callback_fn
            self.connections[kernel_id].send(json.dumps(msg), binary=False)
        except Exception as e:
            # something happen, do not track this results
            logger.error(f"Error occurred duirng execution of command, {e}")
            del self.results[user_passed_uuid]
            # TODO something happened and code couldn't be run
            #  send error back to the user
            del self.callback_info[user_passed_uuid]


    def interrupt(self, command_info):
        """
        Send an interrupt to the kernel defined in the command info
        """
        kernel_id = command_info['kernel']
        if kernel_id in self.connections:
            j_url = f"{conf[prod_type]['jupyter_server']}/api/kernels/{kernel_id}/interrupt"
            headers_dict = dict(self.headers)
            response = requests.post(j_url, headers=headers_dict)
            if response.status_code != 204:
                logger.error("Couldn't interrupt running job. code was")



    def remove_stale_tokens(self, gateway_kernels):
        kernels_ids = [k["id"] for k in gateway_kernels]
        redis_kernels = set(self.redis_server.json().get('JUPYTER:KERNELS').keys())
        redis_kernels_to_remove = redis_kernels - set(kernels_ids)
        for k in redis_kernels_to_remove:
            self.redis_server.json().delete('JUPYTER:KERNELS', k)

    def get_kernels(self):
        headers_dict = dict(self.headers)
        response = requests.get(conf[prod_type]["jupyter_server"] + "/api/kernels", headers=headers_dict)
        kernels = response.json()
        self.remove_stale_tokens(kernels)
        return kernels


    def get_room_kernel_id(self):
        """
        gets the default kernel associated with a room
        :return:
        """
        headers_dict = dict(self.headers)
        response = requests.get(conf[prod_type]["jupyter_server"] + "/api/kernels", headers=headers_dict)
        try:
            board_kernel = json.loads(response.text)[0]["id"]
            return board_kernel
        except:
            raise Exception("couldn't communicate with the Jupyter Kernel Gateway.")

    def clean_up(self):
        pass
        self.conn_manager.close_all()
        self.conn_manager.stop()
        self.conn_manager.join()

