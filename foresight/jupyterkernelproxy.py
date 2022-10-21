import redis
import uuid
import datetime
import requests
import json
from ws4py.client import WebSocketBaseClient
from ws4py.manager import WebSocketManager
from ws4py import format_addresses, configure_logger
from config import config as conf, prod_type
import random
logger = configure_logger()


def format_execute_request_msg(exec_uuid, code):
    content = {'code': code, 'silent': False}
    hdr = {'msg_id': uuid.UUID(exec_uuid).hex,
           'username': 'tests',
           'data': datetime.datetime.now().isoformat(),
           'msg_type': 'execute_request',
           'version': '5.0'}
    msg = {'header': hdr,
           'parent_header': hdr,
           'metadata': {},
           'channel': 'shell',
           'content': content}
    return msg




class JupyterKernelProxy:
    class JupyterClient(WebSocketBaseClient):

        def __init__(self, address, headers, parent_proxy_instnace):
            self.pending_reponses = {}
            self.parent_proxy_instnace = parent_proxy_instnace
            super().__init__(address, headers=headers)
            print(f"In init, working on URL")


        def handshake_ok(self):
            print("Opening %s" % format_addresses(self))
            self.parent_proxy_instnace.conn_manager.add(self)

        def received_message(self, msg):
            # check if the message
            msg = json.loads(msg.data.decode("utf-8"))
            msg_id_uuid = str(uuid.UUID(msg["parent_header"]["msg_id"].split("_")[0]))
            result = {}


            # print(msg["channel"]+ "\t\t" + str(msg))

            if msg["channel"] != "iopub":
                return

            if msg_id_uuid in self.pending_reponses:
                # I am done
                if msg['header']['msg_type'] == 'status' and msg['content']['execution_state'] == 'idle':
                    # ready to send the result back
                    if self.pending_reponses[msg_id_uuid] is None:
                        result = {'request_id': msg_id_uuid, 'execute_result': {}}
                        print(f"returning {result}")
                    else:
                        print(f"returning {self.pending_reponses[msg_id_uuid]}")

                if msg['msg_type'] in ['execute_result', 'display_data', "error", "stream"]:
                    result = {"request_id": msg["parent_header"]["msg_id"], msg['msg_type']: msg['content'],
                              msg['msg_type']: msg['content']}
                elif msg['msg_type'] in ["execute_reply"]:
                    if msg['content']["status"] == "error":
                        result = {"request_id": msg["parent_header"]["msg_id"], "error": msg['content']['traceback']}
                    else:
                        result = {"request_id": msg["parent_header"]["msg_id"], msg['msg_type']: msg['content']}

            if result:
                # print("Returning results --------- ")
                self.pending_reponses[msg_id_uuid] = result
                # print(str(result))


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
        if kernel_id not in self.connections:
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
        if kernel_id not in self.connections:
            self.add_client(kernel_id)
        try:
            self.connections[kernel_id].pending_reponses[user_passed_uuid] = None
            self.connections[kernel_id].send(json.dumps(msg), binary=False)
        except:
            # something happen, do no track this results
            del(self.results[user_passed_uuid])

        callback_fn = command_info["call_fn"]
        self.callback_info[user_passed_uuid] = callback_fn

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

    def cleanup(self):
        self.conn_manager.close_all()
        self.conn_manager.stop()
        self.conn_manager.join()

