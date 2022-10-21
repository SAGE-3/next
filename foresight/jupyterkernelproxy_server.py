# TODO: Check throught the kernel client that the kernel is actually alive
from flask import Flask, request
from .config import config as conf
import json
import uuid
import datetime
import websockets
import os
import redis
import requests

app = Flask(__name__)
prod_type = os.getenv('ENVIRONMENT')
if not prod_type:
    raise Exception("Cannot find ENVIRONMENT value. Should be either production or development")
base_ws = conf[prod_type]['jupyter_ws']

red = redis.StrictRedis(conf[prod_type]["redis_server"], 6379, charset="utf-8", decode_responses=True)

def format_execute_request_msg(code):

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


async def consumer(message):
    print(f"message is message\n{message}")

def get_board_kernel_id(headers):
    response = requests.get(conf[prod_type]["jupyter_server"] + "/api/kernels", headers=headers)
    try:
        board_kernel = json.loads(response.text)[0]["id"]
        return board_kernel
    except:
        result = {"request_id": str(uuid.uuid4()), "error": {"evalue": "Couldn't connect to Kernel"}}
        print(result)
        red.publish('jupyter_outputs', json.dumps(result))
        return result

def get_jupyter_token():
    return red.get("config:jupyter:token")


@app.route('/exec', methods=['POST'])
async def run_code():
    #global open_sockets
    req = request.get_json()
    print("The request is: ")
    print(req)
    token = req["token"]
    if not token:
        token = get_jupyter_token()
    headers = {'Authorization': f"Token {token}"}

    kernel_id = req["kernel"]
    if not kernel_id:
        kernel_id = get_board_kernel_id(headers)

    socket_url = f"{base_ws}/api/kernels/{kernel_id}/channels"
    session_id = uuid.uuid4().hex
    socket_url += '?session_id=' + session_id
    print(f"The socket URL is {socket_url}")
    print(f"The headers is {headers}")

    try:
        ws = await websockets.connect(socket_url, extra_headers=headers, ping_timeout=None)
    except:
        result = {"request_id": str(uuid.uuid4()), "error": {"evalue": "Couldn't connect to Kernel"}}
        print(result)
        red.publish('jupyter_outputs', json.dumps(result))
        return result

    # msg = format_execute_request_msg(req["code"])
    # msg = format_execute_request_msg("import pandas as pd\npd.DataFrame({'a':[1,2,3]})")
    code = req["code"]
    msg = format_execute_request_msg(code)

    parent_msg_id = msg["parent_header"]["msg_id"]

    _ = await ws.send(json.dumps(msg))

    result = {"request_id": parent_msg_id}

    ready_to_end = False
    while not ws.closed:
        response = await ws.recv()
        print(response)
        response = json.loads(response)
        if parent_msg_id == response["parent_header"]["msg_id"]:
            print("I am here 1")
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
    print("Publishing the results back")
    red.publish('jupyter_outputs', json.dumps(result))
    return result
