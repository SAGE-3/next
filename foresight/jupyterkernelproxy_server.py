# TODO: Check throught the kernel client that the kernel is actually alive
from flask import Flask, request
from jupyter_client import AsyncKernelClient
import json
import uuid
import datetime
import websockets


app = Flask(__name__)


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
    req = request.get_json()
    print(req)
    s3kern = "c530ce09-c043-4bdf-9caa-0807eb3e189d" #req["kernel"].decode("utf-8")
    base_ws = "ws://localhost:8888"
    socket_url = f"{base_ws}/api/kernels/{s3kern}/channels"
    session_id = uuid.uuid4().hex
    socket_url += '?session_id=' + session_id

    #headers = {'Authorization': 'Token ' + req["token"].decode("utf-8")}
    headers = {'Authorization': 'Token ' + "c4cfe5a5eea6cb6f0e3b14aed88f8768ddf22aa7ad74a680"}
    ws = await websockets.connect(socket_url, extra_headers=headers, ping_timeout=None)

    # msg = format_execute_request_msg(req["code"])
    # msg = format_execute_request_msg("import pandas as pd\npd.DataFrame({'a':[1,2,3]})")
    msg = format_execute_request_msg("a = 19")

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
    return result
