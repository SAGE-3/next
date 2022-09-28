# TODO: Check throught the kernel client that the kernel is actually alive
from flask import Flask, request
from jupyter_client import AsyncKernelClient
import json
import uuid
import datetime
import websockets


# app = Flask(__name__)


def format_execute_request_msg(code):
    msg_type = 'execute_request'
    content = {'code': code, 'silent': False}
    hdr = {'msg_id': uuid.uuid1().hex,
           'username': 'test',
           'data': datetime.datetime.now().isoformat(),
           'msg_type': msg_type,
           'version': '5.0'}
    msg = {'header': hdr,
           'parent_header': hdr,
           'metadata': {},
           'channel': 'shell',  # requests for code execution, object information, prompts, etc
           'content': content}
    return msg


async def consumer(message):

    print(f"message is message\n{message}")



@app.route('/exec', methods=['POST'])
async def run_code():
    #req = request.get_json()
    s3kern = "2d946c19-00ca-4158-ba3d-49b2334d7f26" #req["kernel"].decode("utf-8")
    base_ws = "ws://localhost:8888"
    socket_url = f"{base_ws}/api/kernels/{s3kern}/channels"
    session_id = uuid.uuid4().hex
    socket_url += '?session_id=' + session_id

    #headers = {'Authorization': 'Token ' + req["towen"].decode("utf-8")}
    headers = {'Authorization': 'Token ' + "021a5f3c0f0c286cd06b9337c506e904d8621c0b8c1c6ca3"}
    ws = await websockets.connect(socket_url, extra_headers=headers)

    # msg = format_execute_request_msg(req["code"])
    msg = format_execute_request_msg("import pandas as pd\npd.DataFrame({'a':[1,2,3]})")
    parent_msg_id = msg["parent_header"]["msg_id"]

    _ = await ws.send(json.dumps(msg))
    result = {}
    result["request_id"] = parent_msg_id

    ready_to_end = False
    async for response in ws:
        response = json.loads(response)
        if parent_msg_id == response["parent_header"]["msg_id"]:
            print(response)
            print("I am here 1")
            if response['msg_type'] in ['execute_result', 'display_data', "error", "stream"]:
                print("I am here 2")
                result[response['msg_type']] = response['content']
                ready_to_end = True
            elif response['msg_type'] in ["execute_reply"]:
                if  response['content']["status"] == "error":
                    result["error"] = response['content']['traceback']
                ready_to_end = True
            elif ready_to_end and 'execution_state' in response['content'] and response['content'][
                    'execution_state'] == 'idle':
                print("I am here 3")
                break
    print(result)

